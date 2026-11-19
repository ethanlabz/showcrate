/**
 * services/authService.ts — Auth business logic
 *
 * Handles: signup (with reserved username check), password update,
 * account deletion (soft-archive + schedule purge).
 *
 * Uses the admin client for user creation (service role needed to
 * set raw_user_meta_data), and the server client for user-initiated
 * password changes.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { UserRepository } from '@/lib/repositories/UserRepository';
import { ProjectRepository } from '@/lib/repositories/ProjectRepository';
import { sendWelcomeEmail } from './emailService';
import { config } from '@/lib/config/unified-config';
import type { SignupInput } from '@/lib/validators/auth.schema';

export class AuthService {
  private userRepo: UserRepository;
  private projectRepo: ProjectRepository;

  constructor(
    private readonly db: SupabaseClient<Database>,
    private readonly adminDb: SupabaseClient<Database>,
  ) {
    this.userRepo = new UserRepository(db);
    this.projectRepo = new ProjectRepository(db);
  }

  async signup(input: SignupInput): Promise<{ userId: string }> {
    // 1. Check username availability (case-insensitive)
    const isAvailable = await this.userRepo.isUsernameAvailable(input.username);
    if (!isAvailable) {
      throw Object.assign(new Error('Username is already taken'), { code: 'USERNAME_TAKEN' });
    }

    const isEmailTakenError = (msg: string) => {
      const lower = msg.toLowerCase();
      return (
        lower.includes('already registered') ||
        lower.includes('already exists') ||
        lower.includes('user already exists') ||
        lower.includes('email_exists') ||
        (lower.includes('email') && lower.includes('exists')) ||
        (lower.includes('email') && lower.includes('taken')) ||
        (lower.includes('unique') && lower.includes('email'))
      );
    };

    let userId: string | null = null;
    let confirmUrl: string | undefined = undefined;

    // 2. Try admin generateLink (allows custom email via Resend)
    try {
      const { data: linkData, error } = await this.adminDb.auth.admin.generateLink({
        type: 'signup',
        email: input.email,
        password: input.password,
        options: {
          redirectTo: `${config.site.url}/auth/login?confirmed=1`,
          data: {
            username: input.username,
            display_name: input.displayName ?? input.username,
          },
        },
      });

      if (error) {
        if (isEmailTakenError(error.message || '')) {
          throw Object.assign(new Error('An account with this email already exists'), {
            code: 'EMAIL_TAKEN',
          });
        }
        console.warn('[AuthService] generateLink failed, falling back to standard signUp:', error.message);
        throw error;
      }

      if (linkData?.user) {
        userId = linkData.user.id;
        confirmUrl = linkData.properties?.action_link;
      }
    } catch (err: any) {
      if (err.code === 'EMAIL_TAKEN') throw err;

      // Fallback: standard Supabase client signUp (uses anon key)
      const { data: signUpData, error: signUpError } = await this.db.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          emailRedirectTo: `${config.site.url}/auth/login?confirmed=1`,
          data: {
            username: input.username,
            display_name: input.displayName ?? input.username,
          },
        },
      });

      if (signUpError) {
        if (isEmailTakenError(signUpError.message || '')) {
          throw Object.assign(new Error('An account with this email already exists'), {
            code: 'EMAIL_TAKEN',
          });
        }
        throw signUpError;
      }

      if (!signUpData?.user) throw new Error('User creation failed');
      userId = signUpData.user.id;
    }

    if (!userId) throw new Error('User creation failed');

    // 3. Send welcome & confirmation email via Resend (awaited so serverless container doesn't freeze before sending)
    try {
      await sendWelcomeEmail(input.email, input.username, confirmUrl);
    } catch (e) {
      console.error('[AuthService] Failed to send welcome email:', e);
    }

    return { userId };
  }

  async deleteAccount(userId: string): Promise<void> {
    // 1. Soft-delete all projects owned by this user
    const { data: projects } = await this.db
      .from('projects')
      .select('id')
      .eq('owner_id', userId)
      .is('deleted_at', null);

    if (projects && projects.length > 0) {
      const deletedAt = new Date().toISOString();
      await this.db
        .from('projects')
        .update({ deleted_at: deletedAt })
        .eq('owner_id', userId);
    }

    // 2. Delete the Supabase Auth user (cascades to public.users via FK)
    const { error } = await this.adminDb.auth.admin.deleteUser(userId);
    if (error) throw error;
  }
}
