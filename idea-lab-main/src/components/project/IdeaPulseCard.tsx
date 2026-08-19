import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { ExternalLink, Bot, Share2, Activity, Plus } from "lucide-react";

type ValidationStage = "early" | "gathering" | "detecting" | "refining" | "validated";

interface IdeaPulseCardProps {
  title: string;
  summary?: string;
  status: string;
  validationStage: ValidationStage;
  lastInteractionAt?: Date;
  onShare?: () => void;
  onViewBlog?: () => void;
  onTestChatbot?: () => void;
  onLinkProject?: () => void;
}

const stageConfig: Record<ValidationStage, { label: string; color: string; bgColor: string }> = {
  early: { label: "Early Stage", color: "text-muted-foreground", bgColor: "bg-secondary" },
  gathering: { label: "Gathering Feedback", color: "text-primary", bgColor: "bg-primary/10" },
  detecting: { label: "Detecting Gaps", color: "text-warning-foreground", bgColor: "bg-warning" },
  refining: { label: "Refining Idea", color: "text-primary", bgColor: "bg-primary/10" },
  validated: { label: "Validated", color: "text-success-foreground", bgColor: "bg-success" },
};

const IdeaPulseCard = ({
  title,
  summary,
  status,
  validationStage,
  lastInteractionAt,
  onShare,
  onViewBlog,
  onTestChatbot,
  onLinkProject,
}: IdeaPulseCardProps) => {
  const stage = stageConfig[validationStage];
  const timeAgo = lastInteractionAt
    ? formatDistanceToNow(lastInteractionAt, { addSuffix: true })
    : "No interactions yet";

  return (
    <div className="border border-border bg-card">
      <div className="p-4 sm:p-6 border-b border-border">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
              <h1 className="text-2xl sm:text-4xl font-semibold text-foreground break-words">{title}</h1>
              <span className={`text-xs font-medium px-2 py-1 ${stage.bgColor} ${stage.color} shrink-0`}>
                {stage.label}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
              <span className="capitalize">{status}</span>
              <span className="w-1 h-1 bg-border rounded-full hidden sm:inline-block" />
              <span className="flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 shrink-0" />
                Last activity {timeAgo}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-border/50 w-full sm:w-auto">
            <Button variant="ghost" size="sm" onClick={onShare} className="flex-1 sm:flex-initial h-8 px-2.5 text-xs sm:text-sm">
              <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 shrink-0" />
              Share
            </Button>
            <Button variant="outline" size="sm" onClick={onViewBlog} className="flex-1 sm:flex-initial h-8 px-2.5 text-xs sm:text-sm">
              <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 shrink-0" />
              View Blog
            </Button>
            <Button size="sm" onClick={onTestChatbot} className="flex-1 sm:flex-initial h-8 px-2.5 text-xs sm:text-sm">
              <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 shrink-0" />
              Test Chatbot
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={onLinkProject} title="Link a project">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {summary && (
        <div className="p-4 sm:p-6">
          <p className="text-muted-foreground leading-relaxed max-w-3xl text-xs sm:text-sm">{summary}</p>
        </div>
      )}
    </div>
  );
};

export default IdeaPulseCard;
