/**
 * CollaboratorRepository.ts — Database access for project_collaborators
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, ProjectCollaboratorRow } from '@/types/database';

export class CollaboratorRepository {
  constructor(private readonly db: SupabaseClient<Database>) {}

  async findByProject(projectId: string): Promise<ProjectCollaboratorRow[]> {
    const { data, error } = await this.db
      .from('project_collaborators')
      .select('*')
      .eq('project_id', projectId)
      .order('invited_at');

    if (error) throw error;
    return data ?? [];
  }

  async countAcceptedByProject(projectId: string): Promise<number> {
    const { count, error } = await this.db
      .from('project_collaborators')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .not('accepted_at', 'is', null);

    if (error) throw error;
    return count ?? 0;
  }

  async findByProjectAndUser(
    projectId: string,
    userId: string,
  ): Promise<ProjectCollaboratorRow | null> {
    const { data, error } = await this.db
      .from('project_collaborators')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async invite(projectId: string, userId: string, displayRole?: string): Promise<ProjectCollaboratorRow> {
    const { data, error } = await this.db
      .from('project_collaborators')
      .insert({ project_id: projectId, user_id: userId, display_role: displayRole ?? null, visible: true })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async accept(collaboratorId: string): Promise<void> {
    const { error } = await this.db
      .from('project_collaborators')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', collaboratorId);

    if (error) throw error;
  }

  async remove(collaboratorId: string): Promise<void> {
    const { error } = await this.db
      .from('project_collaborators')
      .delete()
      .eq('id', collaboratorId);

    if (error) throw error;
  }
}
