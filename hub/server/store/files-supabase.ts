// Supabase file storage adapter for the private bucket "job-files". The admin client is injected (the TanStack route
// passes supabaseAdmin in), so this file never imports a path that only exists in the deploy repo. Server only: the
// admin client bypasses storage rules. Errors throw a fixed message; paths and names are never put in an error or a log.
import type { FileStorage } from "../lib/files.js";

type StorageError = { message?: string; status?: number; statusCode?: string | number } | null;
type Res<T> = PromiseLike<{ data: T | null; error: StorageError }>;

/** The few storage calls used here, typed loosely so any generated Supabase client fits. */
export interface SupabaseAdminLike {
  storage: {
    from(bucket: string): {
      createSignedUploadUrl(path: string): Res<{ signedUrl: string; token: string; path: string }>;
      createSignedUrl(path: string, expiresIn: number, options?: { download?: string | boolean }): Res<{ signedUrl: string }>;
      remove(paths: string[]): Res<unknown>;
      info(path: string): Res<{ size?: number | null }>;
      exists(path: string): PromiseLike<{ data: boolean; error: StorageError }>;
    };
  };
}

const BUCKET = "job-files";

export function createSupabaseFiles(admin: SupabaseAdminLike): FileStorage {
  const bucket = () => admin.storage.from(BUCKET);
  const fail = (): never => {
    throw new Error("File storage error");
  };

  return {
    async createSignedUploadUrl(path, _expiresIn) {
      // The platform fixes the upload link life (2 hours); expiresIn is the contract value the handler reports.
      const { data, error } = await bucket().createSignedUploadUrl(path);
      if (error || !data?.signedUrl) return fail();
      // The browser PUTs the file body to this URL with its own Content-Type; no extra headers are needed.
      return { url: data.signedUrl, headers: {} };
    },

    async createSignedDownloadUrl(path, expiresIn, downloadName) {
      const { data, error } = await bucket().createSignedUrl(
        path,
        expiresIn,
        downloadName ? { download: downloadName } : undefined,
      );
      if (error || !data?.signedUrl) return fail();
      return data.signedUrl;
    },

    async remove(path) {
      const { error } = await bucket().remove([path]);
      if (error) fail();
    },

    async head(path) {
      const { data, error } = await bucket().info(path);
      if (!error && data) return { size: Number(data.size ?? 0) };
      // info reports a missing object as an error: tell "missing" from a real failure with exists().
      const probe = await bucket().exists(path);
      if (!probe.error && probe.data === false) return null;
      return fail();
    },
  };
}
