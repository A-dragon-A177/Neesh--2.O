import { useToast } from "@/hooks/use-toast";
import { ToastProvider, ToastViewport } from "@/components/ui/toast";
import newLogo from "@/assets/new-logo.png";
import { X, Info, AlertTriangle } from "lucide-react";
import * as ToastPrimitives from "@radix-ui/react-toast";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, variant, open, onOpenChange }) {
        let displayTitle = title ? String(title) : "Notification";
        let displayDesc = description ? String(description) : undefined;

        if (!displayDesc && typeof displayTitle === "string") {
          const lower = displayTitle.toLowerCase();
          if (lower.includes("deleted")) {
            displayTitle = "Project Deleted";
            displayDesc = "Your project has been deleted successfully.";
          } else if (lower.includes("created")) {
            displayTitle = "Project Created";
            displayDesc = "Your project has been created successfully.";
          } else if (lower.includes("updated") || lower.includes("saved")) {
            displayTitle = "Changes Saved";
            displayDesc = "Your changes have been saved successfully.";
          }
        }

        const isError = variant === "destructive";

        return (
          <ToastPrimitives.Root
            key={id}
            open={open}
            onOpenChange={onOpenChange}
            className="relative bg-white border-[2.5px] border-[#09daed] shadow-[0_14px_40px_rgba(9,218,237,0.22)] rounded-2xl px-5 sm:px-6 py-4 sm:py-5 flex items-center justify-between gap-4 sm:gap-5 min-w-[280px] max-w-[90vw] sm:max-w-[660px] w-auto overflow-hidden font-sans my-2 pointer-events-auto text-left min-h-[76px] sm:min-h-[88px] h-auto"
          >
            {/* Bottom Accent Pill */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-[3.5px] bg-[#09daed] rounded-full" />

            {/* Top Right Close Button */}
            <button
              onClick={() => dismiss(id)}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100 z-10"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Left: Neesh AI Logo + Divider */}
            <div className="flex items-center gap-4 shrink-0">
              <img src={newLogo} alt="NEESH AI" className="h-10 w-auto object-contain" />
              <div className="w-[1px] h-10 bg-slate-200/80" />
            </div>

            {/* Middle: Title & Description */}
            <div className="flex-1 min-w-0 pr-7 sm:pr-8">
              <h4 className="font-bold text-[16px] sm:text-[18px] text-slate-900 leading-snug tracking-tight whitespace-normal break-words">
                {displayTitle}
              </h4>
              {displayDesc && (
                <p className="text-[13px] text-slate-500 mt-1 leading-normal whitespace-normal break-words">
                  {displayDesc}
                </p>
              )}
            </div>
          </ToastPrimitives.Root>
        );
      })}
      <ToastViewport className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center pointer-events-none" />
    </ToastProvider>
  );
}


