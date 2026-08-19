import { useToast } from "@/hooks/use-toast";
import { ToastProvider, ToastViewport } from "@/components/ui/toast";
import { X } from "lucide-react";
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

        return (
          <ToastPrimitives.Root
            key={id}
            open={open}
            onOpenChange={onOpenChange}
            className="relative bg-white border-2 border-[#09daed] shadow-[0_8px_25px_rgba(9,218,237,0.2)] rounded-xl px-4 py-3 flex items-start justify-between gap-3 max-w-[90vw] sm:max-w-md w-fit overflow-hidden font-sans my-1.5 pointer-events-auto text-left"
          >
            {/* Bottom Accent Bar matching content width */}
            <div className="absolute bottom-0 inset-x-3 h-[2.5px] bg-[#09daed] rounded-full" />

            {/* Middle: Title & Description (No Logo) */}
            <div className="flex-1 min-w-0 pr-5">
              <h4 className="font-bold text-sm text-slate-900 leading-snug tracking-tight">
                {displayTitle}
              </h4>
              {displayDesc && (
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  {displayDesc}
                </p>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={() => dismiss(id)}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-100 shrink-0 self-start -mr-1 -mt-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </ToastPrimitives.Root>
        );
      })}
      <ToastViewport className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center pointer-events-none" />
    </ToastProvider>
  );
}


