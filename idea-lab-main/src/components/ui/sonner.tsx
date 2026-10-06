import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import "sonner/dist/styles.css";
import { X } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      offset="24px"
      visibleToasts={1}
      style={{
        width: "calc(100% - 32px)",
        maxWidth: "440px",
      }}
      toastOptions={{
        unstyled: true,
        className: "flex justify-center items-center w-full pointer-events-auto",
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
    <div className="relative bg-white dark:bg-slate-900 border-2 border-[#09daed] shadow-[0_12px_36px_rgba(9,218,237,0.25)] rounded-2xl px-5 py-3.5 flex items-center justify-between gap-3 w-full max-w-[420px] overflow-hidden font-sans my-1 pointer-events-auto text-left mx-auto">
      {/* Bottom Accent Bar matching content width */}
      <div className="absolute bottom-0 inset-x-3 h-[2.5px] bg-[#09daed] rounded-full" />

      {/* Content: Title & Description */}
      <div className="flex-1 min-w-0 pr-2">
        <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-snug tracking-tight">
          {title}
        </h4>
        {description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* Close Button */}
      <button
        type="button"
        onClick={() => toast.dismiss(t)}
        aria-label="Dismiss notification"
        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 self-center -mr-1 cursor-pointer"
      >
        <X className="w-4 h-4" />
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





