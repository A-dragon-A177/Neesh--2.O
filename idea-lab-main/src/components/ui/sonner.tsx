import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { X } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      toastOptions={{
        unstyled: true,
        className: "flex justify-center w-full pointer-events-auto",
      }}
      {...props}
    />
  );
};

const createNeeshToast = (
  message: string,
  type: "success" | "error" | "info" | "warning",
  opts?: any
) => {
  let title = typeof message === "string" ? message : "Notification";
  let description = opts?.description;

  // Clean title & generate default description if missing
  if (!description && typeof message === "string") {
    const lower = message.toLowerCase();
    if (lower.includes("deleted")) {
      title = "Project Deleted";
      description = "Your project has been deleted successfully.";
    } else if (lower.includes("created")) {
      title = "Project Created";
      description = "Your project has been created successfully.";
    } else if (lower.includes("updated") || lower.includes("saved")) {
      title = "Changes Saved";
      description = "Your changes have been saved successfully.";
    }
  }

  return toast.custom((t) => (
    <div className="relative bg-white border-2 border-[#09daed] shadow-[0_8px_25px_rgba(9,218,237,0.2)] rounded-xl px-4 py-3 flex items-start justify-between gap-3 max-w-[90vw] sm:max-w-md w-fit overflow-hidden font-sans my-1.5 pointer-events-auto text-left">
      {/* Bottom Accent Bar matching content width */}
      <div className="absolute bottom-0 inset-x-3 h-[2.5px] bg-[#09daed] rounded-full" />

      {/* Content: Title & Description (No Logo) */}
      <div className="flex-1 min-w-0 pr-5">
        <h4 className="font-bold text-sm text-slate-900 leading-snug tracking-tight">
          {title}
        </h4>
        {description && (
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* Close Button */}
      <button
        onClick={() => toast.dismiss(t)}
        className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-100 shrink-0 self-start -mr-1 -mt-0.5"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  ), opts);
};

// Monkey-patch sonner's exported toast methods directly so EVERY import of `toast` from "sonner" uses our custom template!
(toast as any).success = (msg: any, opts?: any) => createNeeshToast(msg, "success", opts);
(toast as any).error = (msg: any, opts?: any) => createNeeshToast(msg, "error", opts);
(toast as any).info = (msg: any, opts?: any) => createNeeshToast(msg, "info", opts);
(toast as any).warning = (msg: any, opts?: any) => createNeeshToast(msg, "warning", opts);
(toast as any).message = (msg: any, opts?: any) => createNeeshToast(msg, "info", opts);

export { Toaster, toast };





