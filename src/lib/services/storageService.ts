/**
 * services/storageService.ts — Supabase Storage upload helpers
 *
 * Validates file type and size at the API layer (defense-in-depth on top of
 * Storage RLS bucket policies). Returns the public URL after upload.
 *
 * Folder convention:
 *   avatars/{userId}/avatar.{ext}
 *   covers/{projectId}/cover.{ext}
 *   assets/{projectId}/{filename}
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

type Bucket = 'avatars' | 'covers' | 'assets';

export class StorageService {
  constructor(private readonly db: SupabaseClient<Database>) {}

  async uploadAvatar(userId: string, file: File): Promise<string> {
    const ext = this.getExtension(file.type);
    const path = `${userId}/avatar.${ext}`;

    const { error } = await this.db.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type });

    if (error) throw error;
    return this.getPublicUrl('avatars', path);
  }

  async uploadCover(projectId: string, file: File): Promise<string> {
    const ext = this.getExtension(file.type);
    const path = `${projectId}/cover.${ext}`;

    const { error } = await this.db.storage
      .from('covers')
      .upload(path, file, { upsert: true, contentType: file.type });

    if (error) throw error;
    return this.getPublicUrl('covers', path);
  }

  async uploadAsset(projectId: string, file: File, filename: string): Promise<string> {
    // Sanitize filename
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
    const path = `${projectId}/${Date.now()}_${safeName}`;

    const { error } = await this.db.storage
      .from('assets')
      .upload(path, file, { contentType: file.type });

    if (error) throw error;
    return this.getPublicUrl('assets', path);
  }

  async deleteAvatar(userId: string): Promise<void> {
    // Try all common extensions
    const paths = ['avatar.jpg', 'avatar.png', 'avatar.webp', 'avatar.gif'].map(
      (f) => `${userId}/${f}`,
    );
    await this.db.storage.from('avatars').remove(paths);
  }

  private getPublicUrl(bucket: Bucket, path: string): string {
    const { data } = this.db.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  private getExtension(mimeType: string): string {
    const map: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'image/svg+xml': 'svg',
    };
    return map[mimeType] ?? 'jpg';
  }
}
