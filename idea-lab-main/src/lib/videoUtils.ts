/**
 * Video upload helper for pitch videos.
 * Preserves 100% of original video resolution, normal 1x playback speed, and crystal clear audio.
 */

export async function optimizeVideoIfNeeded(
  file: File,
  onProgress?: (pct: number) => void
): Promise<File> {
  // Return the original pristine video file to guarantee 100% original playback speed and audio quality.
  if (onProgress) onProgress(100);
  return file;
}
