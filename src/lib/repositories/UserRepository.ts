/**
 * UserRepository.ts — Database access for users table
 * All Supabase queries for users go through this class.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, UserRow, UserInsert } from '@/types/database';
import type { UpdateProfileInput } from '@/lib/validators/user.schema';

export class UserRepository {
  constructor(private readonly db: SupabaseClient<Database>) {}

  async findById(id: string): Promise<UserRow | null> {
    const { data, error } = await this.db
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // not found
      throw error;
    }
    return data;
  }

  async findByUsername(username: string): Promise<UserRow | null> {
    const { data, error } = await this.db
      .from('users')
      .select('*')
      .ilike('username', username)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async isUsernameAvailable(username: string): Promise<boolean> {
    const { count, error } = await this.db
      .from('users')
      .select('id', { count: 'exact', head: true })
      .ilike('username', username);

    if (error) throw error;
    return (count ?? 0) === 0;
  }

  async updateProfile(id: string, data: UpdateProfileInput): Promise<UserRow> {
    const update: Partial<UserRow> = {};
    if (data.displayName !== undefined) update.display_name = data.displayName;
    if (data.bio !== undefined) update.bio = data.bio;
    if (data.avatarUrl !== undefined) update.avatar_url = data.avatarUrl;

    const { data: row, error } = await this.db
      .from('users')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return row;
  }

  /** Admin only: change a user's platform role */
  async updateRole(id: string, role: UserRow['platform_role']): Promise<void> {
    const { error } = await this.db
      .from('users')
      .update({ platform_role: role })
      .eq('id', id);

    if (error) throw error;
  }

  /** Admin only: list all users with pagination */
  async listAll(page: number, limit: number): Promise<{ users: UserRow[]; total: number }> {
    const offset = (page - 1) * limit;
    const { data, count, error } = await this.db
      .from('users')
      .select('*', { count: 'exact' })
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { users: data ?? [], total: count ?? 0 };
  }
}
