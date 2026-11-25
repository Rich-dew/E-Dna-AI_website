import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { auth } from './firebase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/**
 * Supabase client configured for Firebase Third-Party Auth via the `accessToken` callback.
 * Every Postgres and Storage request passes the live Firebase ID token so Supabase RLS
 * evaluates `owner_uid = auth.jwt()->>'sub'`.
 * Never uses the Supabase `service_role` key in client code.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      accessToken: async () => {
        try {
          return (await auth?.currentUser?.getIdToken()) ?? null;
        } catch {
          return null;
        }
      },
    })
  : null;

export const EDNA_STORAGE_BUCKET = 'edna-uploads';

export async function uploadEdnaFileToSupabase(
  ownerUid: string,
  projectId: string,
  sanitizedFileName: string,
  content: Blob | File,
): Promise<{ path: string; persisted: boolean; note?: string }> {
  const objectPath = `${ownerUid}/${projectId}/${Date.now()}_${sanitizedFileName}`;
  if (!supabase) {
    return {
      path: objectPath,
      persisted: false,
      note: 'Stored in local session workspace (Supabase env vars not configured).',
    };
  }

  const { error } = await supabase.storage.from(EDNA_STORAGE_BUCKET).upload(objectPath, content, {
    upsert: false,
    contentType: 'text/plain',
  });

  if (error) {
    throw new Error(`Supabase Storage upload failed: ${error.message}`);
  }
  return { path: objectPath, persisted: true };
}
