import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import newLogo from "@/assets/new-logo.png";
import { X, Info, AlertTriangle } from "lucide-react";

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
    <div className="relative bg-white border-[2.5px] border-[#09daed] shadow-[0_14px_40px_rgba(9,218,237,0.22)] rounded-2xl px-5 sm:px-6 py-4 sm:py-5 flex items-center justify-between gap-4 sm:gap-5 min-w-[280px] max-w-[90vw] sm:max-w-[660px] w-auto overflow-hidden font-sans my-2 pointer-events-auto text-left min-h-[76px] sm:min-h-[88px] h-auto">
      {/* Bottom Accent Pill */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-[3.5px] bg-[#09daed] rounded-full" />

      {/* Top Right Close Button */}
      <button
        onClick={() => toast.dismiss(t)}
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
          {title}
        </h4>
        {description && (
          <p className="text-[13px] text-slate-500 mt-1 leading-normal whitespace-normal break-words">
            {description}
          </p>
        )}
      </div>
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





