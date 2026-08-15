const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
if (!SUPABASE_URL) {
  throw new Error("[StorageDirect] VITE_SUPABASE_URL is not configured. Cannot initialize storage.");
}
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

function getAuthToken(): string {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) {
        const stored = localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.access_token) return parsed.access_token;
        }
      }
    }
  } catch {}
  return SUPABASE_ANON_KEY;
}

/**
 * Uploads a file directly to Supabase Storage REST API using native XMLHttpRequest.
 * - Completely immune to React/Supabase AbortController cancellations
 * - Silky smooth real-time progress tracking
 * - Direct HTTP/2 streaming
 */
export async function uploadDirectToSupabase(
  bucketName: string,
  objectPath: string,
  file: File | Blob,
  onProgress?: (progressPercentage: number) => void
): Promise<string> {
  const token = getAuthToken();
  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${bucketName}/${objectPath}`;

  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", uploadUrl, true);

    xhr.setRequestHeader("apikey", SUPABASE_ANON_KEY);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("x-upsert", "true");
    xhr.setRequestHeader("Content-Type", file.type || "video/mp4");

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && e.total > 0) {
          const pct = Math.round((e.loaded / e.total) * 100);
          onProgress(Math.min(99, Math.max(5, pct)));
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucketName}/${objectPath}`;
        if (onProgress) onProgress(100);
        console.log(`[StorageDirect] Upload successful to ${bucketName}:`, publicUrl);
        resolve(publicUrl);
      } else {
        console.warn(`[StorageDirect] Upload to ${bucketName} failed (${xhr.status}):`, xhr.responseText);
        reject(new Error(`Storage error ${xhr.status}: ${xhr.responseText || xhr.statusText}`));
      }
    };

    xhr.onerror = () => {
      console.error("[StorageDirect] Network error during upload");
      reject(new Error("Network error during file upload"));
    };

    xhr.send(file);
  });
}
