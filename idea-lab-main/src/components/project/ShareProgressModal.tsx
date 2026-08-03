import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Share2, X, Copy, Sparkles } from "lucide-react";
import { NeeshLogo } from "@/components/NeeshLogo";
import { toast } from "sonner";

interface ShareProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectTitle: string;
  sharePostText: string;
  ogImageUrl: string;
  coverImageUrl?: string;
  publicUrl: string;
}

export default function ShareProgressModal({
  isOpen,
  onClose,
  projectTitle,
  sharePostText,
  ogImageUrl,
  coverImageUrl,
  publicUrl,
}: ShareProgressModalProps) {
  const [imageError, setImageError] = useState(false);

  if (!isOpen) return null;

  const displayImageSrc = coverImageUrl || ogImageUrl;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-xl rounded-2xl border border-border/60 shadow-2xl p-6 relative animate-slide-up max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-[#09daed] font-bold text-xs uppercase tracking-widest mb-1">
          <Share2 className="w-4 h-4" />
          Social Sharing &amp; Public Signals
        </div>

        <h3 className="text-xl font-bold text-foreground mb-4">
          Share Progress for {projectTitle || "Startup Idea"}
        </h3>

        {/* Dynamic OG Image Preview */}
        <div className="mb-5 rounded-xl border border-border/40 overflow-hidden bg-slate-950 p-2 shadow-inner">
          <span className="text-[10px] uppercase font-bold text-muted-foreground px-2 py-1 block">
            Live Dynamic Social Preview (OG Image)
          </span>
          
          {!imageError && displayImageSrc ? (
            <img
              src={displayImageSrc}
              alt="Dynamic OG Preview"
              onError={() => setImageError(true)}
              className="w-full h-48 rounded-lg border border-border/30 object-cover mt-1"
            />
          ) : (
            <div className="w-full h-48 rounded-lg border border-border/30 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 flex flex-col justify-between relative overflow-hidden mt-1 shadow-md">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#09daed]/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between z-10">
                <NeeshLogo size="sm" />
                <span className="bg-primary/20 text-primary border border-primary/30 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Score: 88/100
                </span>
              </div>
              <div className="z-10 my-auto">
                <h4 className="text-lg font-bold text-white line-clamp-1">{projectTitle || "Startup Idea"}</h4>
                <p className="text-xs text-slate-300 mt-1 line-clamp-2">Validated startup concept &amp; pitch reel powered by Neesh AI</p>
              </div>
              <div className="flex items-center justify-between z-10 text-[11px] text-slate-400 border-t border-white/10 pt-2">
                <span>neeshglobal.com</span>
                <span className="text-[#09daed] font-medium">#buildinpublic</span>
              </div>
            </div>
          )}
        </div>

        {/* Pre-formatted Post Text Area */}
        <div className="mb-5">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">
            Pre-formatted Social Post (X / LinkedIn)
          </label>
          <Textarea
            readOnly
            value={sharePostText}
            rows={5}
            className="font-mono text-xs bg-muted/50 border-border/50 text-foreground resize-none leading-relaxed"
          />
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 xs:grid-cols-3 gap-3">
          <Button
            variant="outline"
            className="w-full gap-2 border-[#09daed]/50 text-[#09daed] hover:bg-[#09daed]/10 font-bold"
            onClick={() => {
              navigator.clipboard.writeText(sharePostText);
              toast.success("Post text copied to clipboard!");
            }}
          >
            <Copy className="w-4 h-4" />
            Copy Text
          </Button>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(sharePostText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full"
          >
            <Button className="w-full gap-2 bg-[#1DA1F2] hover:bg-[#1da1f2]/90 text-white font-bold">
              Share on X
            </Button>
          </a>
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full"
          >
            <Button className="w-full gap-2 bg-[#0A66C2] hover:bg-[#0a66c2]/90 text-white font-bold">
              LinkedIn
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}
