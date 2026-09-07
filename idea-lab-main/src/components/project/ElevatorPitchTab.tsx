import { useState, useRef, useCallback } from "react";
import { Video, Upload, Play, Trash2, Save, AlertTriangle, CheckCircle2, Clock, Loader2, Clapperboard, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { usePromotions } from "@/hooks/usePromotions";
import { optimizeVideoIfNeeded } from "@/lib/videoUtils";
import { uploadDirectToSupabase } from "@/lib/storageDirect";
import type { Project, UpdateProjectInput } from "@/hooks/useProjects";

interface ElevatorPitchTabProps {
  project: Project;
  projectId: string;
  onUpdate: (id: string, input: UpdateProjectInput) => Promise<Project | null>;
}

const MAX_FILE_SIZE_MB = 50;
const SUGGESTED_DURATION = 60; // seconds — advisory only, NOT a hard limit

const ElevatorPitchTab = ({ project, projectId, onUpdate }: ElevatorPitchTabProps) => {
  const { promotions, submitPromotion, removePromotion } = usePromotions();
  const [isPromoting, setIsPromoting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(project.elevator_pitch_url || null);
  const [duration, setDuration] = useState<number | null>(project.elevator_pitch_duration ?? null);
  const [isDirty, setIsDirty] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    // Validate file type
    if (!file.type.startsWith("video/")) {
      toast.error("Please upload a video file (.mp4, .webm, .mov)");
      return;
    }

    // Validate file size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_FILE_SIZE_MB) {
      toast.error(`File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB. Your file is ${sizeMB.toFixed(1)}MB.`);
      return;
    }

    // Show local preview immediately and mark as dirty so Save button appears
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    setPendingFile(file);
    setIsDirty(true);

    // Read video duration in background without playing audio
    const tempVideo = document.createElement("video");
    tempVideo.preload = "metadata";
    tempVideo.muted = true;
    tempVideo.src = localUrl;
    tempVideo.onloadedmetadata = () => {
      const dur = Math.round(tempVideo.duration);
      setDuration(dur);
      console.log(`[ElevatorPitch] Video duration detected: ${dur}s`);
    };

    toast.info("Video selected! Click \"Save Pitch\" to upload and publish.");
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleSave = async () => {
    setSaving(true);
    setUploading(true);
    setUploadProgress(5);
    try {
      let finalUrl = previewUrl;

      // If we have a pending local file, upload directly & instantly to blog-media bucket
      if (pendingFile) {
        const originalSizeMB = (pendingFile.size / (1024 * 1024)).toFixed(1);
        console.log(`[ElevatorPitch] Uploading ${originalSizeMB}MB video...`);
        setUploadProgress(10);

        const ext = pendingFile.name.split(".").pop()?.toLowerCase() || "mp4";
        const blogPath = `pitches/${projectId}/pitch-${Date.now()}.${ext}`;

        const publicUrl = await uploadDirectToSupabase("blog-media", blogPath, pendingFile, (pct) => {
          // Smooth 10% -> 85% progress mapping during high-speed streaming upload
          setUploadProgress(10 + Math.round(pct * 0.75));
        });

        finalUrl = publicUrl;
        console.log("[ElevatorPitch] Upload completed successfully, URL:", finalUrl);
        setUploadProgress(85);
        setPreviewUrl(finalUrl);
        setPendingFile(null);
      }

      setUploadProgress(90);

      // Save the URL and duration to the project via backend API
      const updatePayload: UpdateProjectInput = {
        elevator_pitch_url: finalUrl,
        elevator_pitch_duration: duration ?? null,
      };
      console.log("[ElevatorPitch] Saving to backend:", updatePayload);

      await onUpdate(projectId, updatePayload);

      setUploadProgress(100);
      setIsDirty(false);

      toast.success("Elevator pitch saved successfully!");
      console.log("[ElevatorPitch] Save complete! Duration:", duration, "URL:", finalUrl);
    } catch (err: any) {
      console.error("[ElevatorPitch] Save failed:", err);
      toast.error(`Failed to save: ${err?.message || "Unknown error"}`);
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const activePromotion = promotions.find(p => p.projectId === projectId && p.status === 'ACTIVE');
  const isPromoted = Boolean(activePromotion);

  const handlePushToEngine = async () => {
    setIsPromoting(true);
    try {
      await submitPromotion(projectId);
      toast.success("Pitch pushed to Cross Promotional Engine! It is now live in the Pitch Space.");
    } catch (err: any) {
      console.error("[ElevatorPitch] Push to engine failed:", err);
      toast.error(err?.message || "Failed to push to Cross Promotional Engine");
    } finally {
      setIsPromoting(false);
    }
  };

  const handleRemoveFromEngine = async () => {
    if (!activePromotion) return;
    setIsPromoting(true);
    try {
      const ok = await removePromotion(activePromotion.id);
      if (ok) {
        toast.success("Pitch removed from Cross Promotional Engine.");
      } else {
        toast.error("Failed to remove pitch from Cross Promotional Engine.");
      }
    } catch (err: any) {
      console.error("[ElevatorPitch] Remove from engine failed:", err);
      toast.error(err?.message || "Failed to remove pitch from engine");
    } finally {
      setIsPromoting(false);
    }
  };

  const handleRemove = async () => {
    setSaving(true);
    try {
      await onUpdate(projectId, {
        elevator_pitch_url: "",
        elevator_pitch_thumbnail: "",
        elevator_pitch_duration: 0,
      });
      setPreviewUrl(null);
      setDuration(null);
      setIsDirty(false);
      setPendingFile(null);
      toast.success("Elevator pitch removed.");
    } catch {
      toast.error("Failed to remove pitch.");
    } finally {
      setSaving(false);
    }
  };

  const durationLabel = duration != null && duration > 0
    ? duration < 60
      ? `${duration}s`
      : `${Math.floor(duration / 60)}m ${duration % 60}s`
    : null;

  const durationWarning = duration != null && duration > SUGGESTED_DURATION;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Clapperboard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground font-display">Elevator Pitch</h2>
            <p className="text-sm text-muted-foreground">Upload a short video that introduces your idea</p>
          </div>
        </div>
      </div>

      {/* Duration tip banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
        <Info className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-cyan-300 mb-0.5 font-display">Tips for a great elevator pitch</p>
          <p className="text-muted-foreground">Keep it <strong className="text-foreground">30–60 seconds</strong> for maximum impact. Maximum file size: <strong className="text-foreground">50MB</strong>. If your video is larger, please compress it using a tool like <a href="https://www.freeconvert.com/video-compressor" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">FreeConvert</a>.</p>
        </div>
      </div>

      {/* Video Preview / Upload Area */}
      {previewUrl ? (
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden bg-black border border-border/30 shadow-2xl">
            {/* Cinematic border glow */}
            <div className="absolute inset-0 rounded-2xl ring-2 ring-cyan-500/40 pointer-events-none z-10" />

            <video
              ref={videoRef}
              src={previewUrl}
              controls
              className="w-full max-h-[480px] object-contain bg-black"
            />

            {/* Duration badge */}
            {durationLabel && (
              <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5">
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm border ${durationWarning ? "bg-amber-500/20 border-amber-500/40 text-amber-300" : "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"}`}>
                  <Clock className="w-3 h-3" />
                  {durationLabel}
                  {durationWarning && " (longer than suggested)"}
                </div>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-end gap-2.5 w-full sm:w-auto">
            {isDirty && (
              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full sm:w-auto gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white border-0 shadow-lg shadow-cyan-500/20 h-11 font-display"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? "Saving..." : "Save Pitch"}
              </Button>
            )}
            <label htmlFor="pitch-video-replace" className="cursor-pointer w-full sm:w-auto">
              <div className="w-full justify-center px-4 py-2.5 bg-secondary text-secondary-foreground text-sm font-medium rounded-xl hover:bg-secondary/80 transition-colors flex items-center gap-2 border border-border shadow-sm h-11 font-display">
                <Upload className="w-4 h-4" />
                Upload New Pitch
              </div>
              <input
                id="pitch-video-replace"
                type="file"
                accept="video/*"
                className="hidden"
                onChange={e => {
                  if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                  // Reset the input value so re-selecting the same file triggers onChange
                  e.target.value = "";
                }}
              />
            </label>
            <button
              onClick={handleRemove}
              className="w-full sm:w-auto justify-center px-4 py-2.5 bg-destructive/10 text-destructive text-sm font-medium rounded-xl hover:bg-destructive/20 transition-colors flex items-center gap-2 border border-destructive/20 shadow-sm h-11 font-display"
            >
              <Trash2 className="w-4 h-4" />
              Delete Pitch
            </button>
          </div>
        </div>
      ) : (
        <label
          htmlFor="pitch-video-upload"
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`block cursor-pointer rounded-2xl border-2 border-dashed p-8 sm:p-16 text-center transition-all duration-300 ${isDragging
            ? "border-cyan-500 bg-cyan-500/10 scale-[1.01]"
            : "border-border hover:border-cyan-500/50 hover:bg-cyan-500/5 bg-muted/20"
            } ${uploading ? "pointer-events-none opacity-60" : ""}`}
        >
          <input
            id="pitch-video-upload"
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,video/mov,video/quicktime"
            className="hidden"
            onChange={e => {
              if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
              // Reset the input value so re-selecting the same file triggers onChange
              e.target.value = "";
            }}
          />
          <div className="flex flex-col items-center gap-4 font-sans">
            {uploading ? (
              <>
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-cyan-500/10 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-cyan-400 animate-spin" />
                </div>
                <p className="text-base sm:text-lg font-semibold text-foreground font-display">Uploading your pitch...</p>
                <div className="w-40 sm:w-48 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-blue-600/20 to-cyan-500/20 flex items-center justify-center border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
                  <Video className="w-8 h-8 sm:w-10 sm:h-10 text-cyan-400" />
                </div>
                <div>
                  <p className="text-base sm:text-lg font-semibold text-foreground mb-1 font-display">
                    <span className="hidden sm:inline">Drop your pitch video here or </span>
                    <span className="text-cyan-400 font-medium">Browse to upload</span>
                  </p>
                  <p className="hidden sm:block text-sm text-muted-foreground mt-1">
                    Accepts MP4, WebM, MOV up to 50MB
                  </p>
                </div>
                <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-4 text-[11px] sm:text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Play className="w-3 h-3 text-cyan-400" /> MP4, WebM, MOV</span>
                  <span className="hidden sm:inline">•</span>
                  <span>Max 50MB</span>
                  <span className="hidden sm:inline">•</span>
                  <span className="hidden sm:inline">30–60s recommended</span>
                </div>
              </>
            )}
          </div>
        </label>
      )}

      {/* Upload progress indicator during save */}
      {saving && uploadProgress > 0 && uploadProgress < 100 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {uploadProgress < 80 ? "Uploading video..." : "Saving to project..."}
            </span>
            <span className="text-cyan-400 font-medium">{uploadProgress}%</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 rounded-full transition-all duration-500"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pitch Status */}
        <div className="bg-card border border-border/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            {previewUrl && !isDirty ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : previewUrl && isDirty ? (
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            ) : (
              <Video className="w-4 h-4 text-muted-foreground" />
            )}
            <span className="text-sm font-medium text-foreground font-display">Pitch Status</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {previewUrl && !isDirty
              ? "✅ Pitch is live and saved"
              : previewUrl && isDirty
              ? "⚠️ Unsaved changes — click Save Pitch"
              : "No pitch uploaded yet"}
          </p>
        </div>

        {/* Cross Promotional Engine Status */}
        {previewUrl ? (
          <div className={`border rounded-xl p-4 transition-all duration-300 flex flex-col justify-between gap-3 ${
            isPromoted
              ? "bg-gradient-to-br from-emerald-500/10 via-cyan-500/10 to-blue-500/10 border-cyan-500/40 shadow-sm"
              : "bg-muted/30 border-border/50"
          }`}>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Clapperboard className={`w-4 h-4 ${isPromoted ? "text-cyan-400" : "text-muted-foreground"}`} />
                  <span className="text-sm font-semibold text-foreground font-display">Cross Promotional Engine</span>
                </div>
                {isPromoted ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3" /> Live in Pitch Space
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground border border-border">
                    Private Only
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isPromoted
                  ? "Your pitch is actively syndicated across Pitch Space reels and 'More Like This' discovery feeds."
                  : "Your pitch is currently private to your project. Push it to the Cross Promotional Engine to appear in Pitch Space and similar feeds."}
              </p>
            </div>

            <div className="flex justify-end pt-1">
              {isPromoted ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRemoveFromEngine}
                  disabled={isPromoting}
                  className="text-xs h-8 gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
                >
                  {isPromoting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Remove from Engine
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handlePushToEngine}
                  disabled={isPromoting || isDirty}
                  className="text-xs h-8 gap-1.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white border-0 shadow-md shadow-cyan-500/20"
                >
                  {isPromoting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clapperboard className="w-3.5 h-3.5" />}
                  Push to Cross Promotional Engine
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-amber-500 font-display">Cross Promotional Engine Inactive</span>
            </div>
            <p className="text-xs text-amber-500/80">
              Upload an Elevator Pitch video to enable the Cross Promotional Engine and Pitch Space reels feed.
            </p>
          </div>
        )}
      </div>

      {/* Duration warning */}
      {durationWarning && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-300 mb-0.5 font-display">Video is longer than 60 seconds</p>
            <p className="text-muted-foreground">Pitches under 60 seconds perform much better in the Reels feed. Consider trimming your video for a bigger impact. <strong className="text-foreground">Your video will still be saved and displayed.</strong></p>
          </div>
        </div>
      )}

      {/* Save button (bottom for convenience) */}
      {previewUrl && isDirty && (
        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSave}
            disabled={saving}
            size="lg"
            className="gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white border-0 shadow-lg shadow-cyan-500/20 font-display"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving..." : "Save Pitch"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ElevatorPitchTab;
