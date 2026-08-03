import { useState, useMemo } from "react";
import ResponseTab from "@/components/project/ResponseTab";
import NotificationTab from "@/components/project/NotificationTab";
import {
  MessageSquare,
  Bell,
  Inbox,
  Sparkles,
  Loader2,
  Mail,
  Send,
  Users as UsersIcon,
  X,
  CheckCircle2,
  Crown,
  Gem,
  Medal,
  Briefcase,
  Calendar,
  Check,
  CheckSquare,
  Square
} from "lucide-react";
import { useValidatedBuyers } from "@/hooks/useValidatedBuyers";
import ValidatedBuyersList from "@/components/project/ValidatedBuyersList";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface AudienceInboxTabProps {
  projectId: string;
  earlyAccessPrice?: number | null;
}

const tierConfig = {
  GOLD: {
    label: "Gold",
    icon: Crown,
    bgColor: "bg-amber-50/50 dark:bg-amber-950/10",
    borderColor: "border-amber-200 dark:border-amber-800/40",
    textColor: "text-amber-700 dark:text-amber-300",
    iconColor: "text-amber-500",
  },
  SILVER: {
    label: "Silver",
    icon: Gem,
    bgColor: "bg-slate-50/50 dark:bg-slate-900/20",
    borderColor: "border-slate-200 dark:border-slate-800/40",
    textColor: "text-slate-700 dark:text-slate-300",
    iconColor: "text-slate-400",
  },
  BRONZE: {
    label: "Bronze",
    icon: Medal,
    bgColor: "bg-orange-50/50 dark:bg-orange-950/10",
    borderColor: "border-orange-200 dark:border-orange-850/40",
    textColor: "text-orange-700 dark:text-orange-300",
    iconColor: "text-orange-400",
  },
};

const AudienceInboxTab = ({ projectId, earlyAccessPrice }: AudienceInboxTabProps) => {
  const [view, setView] = useState<"buyers" | "pilot" | "responses" | "notifications">("buyers");
  const { data: buyersData, loading: buyersLoading } = useValidatedBuyers(projectId);

  // Compute Pilot Cohort members
  const pilotCohortMembers = useMemo(() => {
    return (buyersData?.buyers || []).filter((b) => b.inPilotCohort);
  }, [buyersData]);

  // Checkbox Selection State for Pilot Cohort
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [composeModalOpen, setComposeModalOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [composeMode, setComposeMode] = useState<"selected" | "all">("selected");

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === pilotCohortMembers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pilotCohortMembers.map((m) => m.id));
    }
  };

  // Compose Email Handlers
  const handleOpenCompose = (mode: "selected" | "all") => {
    if (mode === "selected" && selectedIds.length === 0) {
      toast.error("No users selected", { description: "Please select at least one pilot cohort member." });
      return;
    }
    setComposeMode(mode);
    // Auto populate a basic subject
    setEmailSubject("Neesh AI Pilot Cohort: MVP Launch Update!");
    setEmailBody("Hi,\n\nI wanted to share an update on our new MVP platform launch...\n\nBest regards,\nFounder");
    setComposeModalOpen(true);
  };

  const activeRecipients = useMemo(() => {
    if (composeMode === "all") {
      return pilotCohortMembers;
    }
    return pilotCohortMembers.filter((m) => selectedIds.includes(m.id));
  }, [composeMode, pilotCohortMembers, selectedIds]);

  const handleSendEmail = () => {
    if (activeRecipients.length === 0) {
      toast.error("No recipients found");
      return;
    }

    const primaryTo = activeRecipients[0]?.email || "";
    const bccEmails = activeRecipients.slice(1).map((r) => r.email).join(",");
    const mailtoUrl = bccEmails 
      ? `mailto:${encodeURIComponent(primaryTo)}?bcc=${encodeURIComponent(bccEmails)}&subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`
      : `mailto:${encodeURIComponent(primaryTo)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    
    // Open system mail client
    window.open(mailtoUrl, "_blank");
    toast.success("Mail client triggered", {
      description: `Sent message draft to ${activeRecipients.length} cohort members via your default mail client.`
    });
    setComposeModalOpen(false);
    setSelectedIds([]);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/20">
      {/* Header with Toggle */}
      <div className="flex-shrink-0 border-b border-border/30 bg-card/50 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center border border-cyan-500/20">
            <Inbox className="w-5 h-5 text-cyan-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Audience Inbox</h2>
            <p className="text-xs text-muted-foreground">All feedback, questions, validated buyers & notifications in one place</p>
          </div>
        </div>

        {/* Toggle Pills */}
        <div className="flex overflow-x-auto whitespace-nowrap no-scrollbar gap-1 bg-muted/40 p-1 rounded-xl w-full md:w-fit">
          <style dangerouslySetInnerHTML={{__html: `
            .no-scrollbar::-webkit-scrollbar {
              display: none;
            }
            .no-scrollbar {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
          `}} />
          <button
            id="inbox-tab-buyers"
            onClick={() => setView("buyers")}
            className={`flex items-center shrink-0 gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              view === "buyers"
                ? "bg-white dark:bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="w-4 h-4 text-cyan-500" />
            Validated Buyers
            {buyersData && buyersData.totalValidated > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-cyan-500 text-white rounded-full">
                {buyersData.totalValidated}
              </span>
            )}
          </button>

          <button
            id="inbox-tab-pilot"
            onClick={() => setView("pilot")}
            className={`flex items-center shrink-0 gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              view === "pilot"
                ? "bg-white dark:bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <UsersIcon className="w-4 h-4 text-indigo-500" />
            Stage 3 Pilot Cohort
            {pilotCohortMembers.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-indigo-500 text-white rounded-full">
                {pilotCohortMembers.length}
              </span>
            )}
          </button>

          <button
            id="inbox-tab-responses"
            onClick={() => setView("responses")}
            className={`flex items-center shrink-0 gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              view === "responses"
                ? "bg-white dark:bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Feedback & Responses
          </button>

          <button
            id="inbox-tab-notifications"
            onClick={() => setView("notifications")}
            className={`flex items-center shrink-0 gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              view === "notifications"
                ? "bg-white dark:bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Bell className="w-4 h-4" />
            Notifications
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {view === "buyers" ? (
          buyersLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
              <span className="ml-2 text-sm text-gray-500">Loading buyers...</span>
            </div>
          ) : (
            <div className="max-w-4xl space-y-4">
              <div>
                <h3 className="font-bold text-gray-900 text-sm mb-1">Validated Buyers (Gold/Silver/Bronze)</h3>
                <p className="text-xs text-gray-500 mb-4">
                  These audience members have expressed explicit purchase intent (Bronze), high engagement (Silver), or both (Gold) during simulator runs.
                </p>
              </div>
              <ValidatedBuyersList
                buyers={buyersData?.buyers || []}
                earlyAccessPrice={earlyAccessPrice}
              />
            </div>
          )
        ) : view === "pilot" ? (
          <div className="max-w-4xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-bold text-gray-900 text-sm mb-1">Stage 3 Pilot MVP Cohort</h3>
                <p className="text-xs text-gray-500">
                  Manage high-intent users recruited from Stage 2 validation feedback to test your prototype MVP.
                </p>
              </div>
              {pilotCohortMembers.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenCompose("all")}
                    className="rounded-xl text-xs gap-1.5 h-9"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Email All ({pilotCohortMembers.length})
                  </Button>
                  <Button
                    size="sm"
                    disabled={selectedIds.length === 0}
                    onClick={() => handleOpenCompose("selected")}
                    className="rounded-xl text-xs gap-1.5 h-9 bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Email Selected ({selectedIds.length})
                  </Button>
                </div>
              )}
            </div>

            {pilotCohortMembers.length === 0 ? (
              <div className="text-center py-12 px-4 border border-dashed border-gray-200 rounded-2xl bg-slate-50/20">
                <UsersIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-500">No pilot cohort members enrolled yet</p>
                <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                  Go to Stage 2 feedback list and click "Onboard Stage 3 Pilot Batch" to enroll validated buyers.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Select All Action Bar */}
                <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                  <button
                    onClick={handleToggleSelectAll}
                    className="text-slate-500 hover:text-indigo-600 transition-colors"
                  >
                    {selectedIds.length === pilotCohortMembers.length ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                  <span className="text-xs font-semibold text-slate-700">
                    {selectedIds.length === pilotCohortMembers.length
                      ? "Deselect All Members"
                      : `Select All Members (${selectedIds.length} selected)`}
                  </span>
                </div>

                {pilotCohortMembers.map((member) => {
                  const tier = tierConfig[member.validationTier];
                  const TierIcon = tier?.icon || Sparkles;
                  const isSelected = selectedIds.includes(member.id);

                  return (
                    <div
                      key={member.id}
                      className={`w-full border rounded-2xl p-4 transition-all duration-200 flex items-center gap-4 bg-white hover:border-slate-300 hover:shadow-sm`}
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => handleToggleSelect(member.id)}
                        className="text-slate-400 hover:text-indigo-600 shrink-0 transition-colors"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-indigo-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>

                      {/* Tier Icon */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${tier?.borderColor || "border-slate-100"} ${tier?.bgColor || "bg-slate-50"}`}>
                        <TierIcon className={`w-5 h-5 ${tier?.iconColor || "text-slate-400"}`} />
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                          <h4 className="font-bold text-slate-900 text-sm truncate">{member.name}</h4>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border ${tier?.bgColor} ${tier?.textColor} ${tier?.borderColor}`}>
                            {tier?.label || "User"}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5" />
                            {member.email}
                          </span>
                          {member.occupation && (
                            <span className="flex items-center gap-1">
                              <Briefcase className="w-3.5 h-3.5" />
                              {member.occupation}
                            </span>
                          )}
                          {member.pilotEnrolledAt && (
                            <span className="flex items-center gap-1 text-[10px] text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-md">
                              <Calendar className="w-3 h-3" />
                              Enrolled {new Date(member.pilotEnrolledAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right tag */}
                      {member.interestTagLabel && (
                        <div className="hidden sm:block text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100">
                          {member.interestTagLabel}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : view === "responses" ? (
          <ResponseTab projectId={projectId} />
        ) : (
          <NotificationTab projectId={projectId} />
        )}
      </div>

      {/* ──── Compose Message Modal ──── */}
      {composeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Compose Cohort Message</h3>
              </div>
              <button
                onClick={() => setComposeModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Recipients ({activeRecipients.length})</label>
                <div className="max-h-20 overflow-y-auto p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs font-medium text-slate-600 space-y-0.5">
                  {activeRecipients.map((r) => (
                    <div key={r.id}>{r.name} &lt;{r.email}&gt;</div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Enter email subject..."
                  className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-150 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Message Body</label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Type your cohort message..."
                  rows={6}
                  className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-150 text-sm focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => setComposeModalOpen(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendEmail}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Open in Mail App
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AudienceInboxTab;
