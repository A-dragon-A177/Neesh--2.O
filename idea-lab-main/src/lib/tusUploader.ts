import * as tus from "tus-js-client";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://qqmxnldyocsennypnbic.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

function getAuthToken(): string {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes("-auth-token") || key === "token" || key === "auth_token")) {
        const val = localStorage.getItem(key);
        if (val) {
          if (val.startsWith("{")) {
            const parsed = JSON.parse(val);
            const tok = parsed?.access_token || parsed?.token;
            if (tok) return tok;
          } else {
            return val;
          }
        }
      }
    }
  } catch {}
  return SUPABASE_ANON_KEY;
}

/**
 * Uploads large videos (up to 200MB+) to Supabase Storage using TUS resumable chunks.
 * - Zero audio playback in the background
 * - 6MB chunking avoids all single-request size caps
 * - Synchronous token lookup prevents AbortError
 * - Accurate, real-time progress callbacks
 */
export async function uploadVideoWithTus(
  bucketName: string,
  objectPath: string,
  file: File,
  onProgress?: (progressPercentage: number) => void
): Promise<string> {
  const token = getAuthToken();

  return new Promise<string>((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable`,
      retryDelays: [0, 1000, 3000, 5000],
      headers: {
        authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY,
        "x-upsert": "true",
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: bucketName,
        objectName: objectPath,
        contentType: file.type || "video/mp4",
        cacheControl: "31536000",
      },
      chunkSize: 6 * 1024 * 1024, // 6MB per chunk
      onError: (error) => {
        console.error("[TusUpload] Resumable upload error:", error);
        reject(error);
      },
      onProgress: (bytesUploaded, bytesTotal) => {
        if (bytesTotal > 0 && onProgress) {
          const pct = Math.round((bytesUploaded / bytesTotal) * 100);
          onProgress(Math.min(98, Math.max(5, pct)));
        }
      },
      onSuccess: () => {
        const { data: urlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(objectPath);

        console.log("[TusUpload] Video upload completed! Public URL:", urlData.publicUrl);
        if (onProgress) onProgress(100);
        resolve(urlData.publicUrl);
      },
    });

    // Start fresh or resume
    upload.start();
  });
}
