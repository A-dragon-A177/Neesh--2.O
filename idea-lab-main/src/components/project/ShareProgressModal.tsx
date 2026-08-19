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
            Pre-formatted Social Post
          </label>
          <Textarea
            readOnly
            value={sharePostText}
            rows={5}
            className="font-mono text-xs bg-muted/50 border-border/50 text-foreground resize-none leading-relaxed"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          {/* Copy Text - Full Width */}
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

          {/* Social Platform Buttons - 2x2 Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Share on X (Twitter) */}
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(sharePostText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full"
            >
              <Button className="w-full gap-2 bg-[#000000] hover:bg-[#1a1a1a] text-white font-bold text-sm">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                Share on X
              </Button>
            </a>

            {/* LinkedIn */}
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full"
            >
              <Button className="w-full gap-2 bg-[#0A66C2] hover:bg-[#0a66c2]/90 text-white font-bold text-sm">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                LinkedIn
              </Button>
            </a>

            {/* Reddit */}
            <a
              href={`https://www.reddit.com/submit?url=${encodeURIComponent(publicUrl)}&title=${encodeURIComponent(projectTitle || 'Check out this startup idea')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full"
            >
              <Button className="w-full gap-2 bg-[#FF4500] hover:bg-[#ff4500]/90 text-white font-bold text-sm">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>
                Reddit
              </Button>
            </a>

            {/* WhatsApp */}
            <a
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(sharePostText + '\n\n' + publicUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full"
            >
              <Button className="w-full gap-2 bg-[#25D366] hover:bg-[#25d366]/90 text-white font-bold text-sm">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                WhatsApp
              </Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
