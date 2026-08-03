import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Search, CheckCircle2, ShieldCheck, Download, Copy, Sparkles, Loader2, Star, Zap } from "lucide-react";
import type { ValidatedBuyer } from "@/hooks/useValidatedBuyers";
import { toast } from "sonner";

interface PilotCohortModalProps {
  isOpen: boolean;
  onClose: () => void;
  buyers: ValidatedBuyer[];
  onSavePilotCohort: (memberIds: string[], enroll: boolean) => Promise<any>;
}

export default function PilotCohortModal({
  isOpen,
  onClose,
  buyers,
  onSavePilotCohort,
}: PilotCohortModalProps) {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<"ALL" | "GOLD" | "SILVER" | "BRONZE">("ALL");
  const [selectedIds, setSelectedIds] = useState<string[]>(() => 
    buyers.filter(b => b.inPilotCohort).map(b => b.id)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync selectedIds when buyers change or modal opens
  const filteredBuyers = useMemo(() => {
    return buyers.filter((b) => {
      const matchesSearch =
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        b.email.toLowerCase().includes(search.toLowerCase()) ||
        (b.interestTagLabel && b.interestTagLabel.toLowerCase().includes(search.toLowerCase()));

      const matchesTier = tierFilter === "ALL" || b.validationTier === tierFilter;
      return matchesSearch && matchesTier;
    });
  }, [buyers, search, tierFilter]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllGold = () => {
    const goldIds = buyers.filter((b) => b.validationTier === "GOLD").map((b) => b.id);
    setSelectedIds((prev) => Array.from(new Set([...prev, ...goldIds])));
    toast.success(`Selected ${goldIds.length} Gold tier buyers`);
  };

  const handleSelectAllFiltered = () => {
    const ids = filteredBuyers.map((b) => b.id);
    setSelectedIds((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      // Find IDs that should be enrolled
      const currentEnrolled = buyers.filter((b) => b.inPilotCohort).map((b) => b.id);
      const toEnroll = selectedIds.filter((id) => !currentEnrolled.includes(id));
      const toUnenroll = currentEnrolled.filter((id) => !selectedIds.includes(id));

      if (toEnroll.length > 0) {
        await onSavePilotCohort(toEnroll, true);
      }
      if (toUnenroll.length > 0) {
        await onSavePilotCohort(toUnenroll, false);
      }

      toast.success(`Updated Stage 3 Pilot Cohort (${selectedIds.length} members)`);
      onClose();
    } catch {
      toast.error("Failed to update pilot cohort members");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyEmails = () => {
    const emails = buyers
      .filter((b) => selectedIds.includes(b.id))
      .map((b) => b.email)
      .join(", ");
    if (!emails) {
      toast.error("No buyers selected");
      return;
    }
    navigator.clipboard.writeText(emails);
    toast.success("Copied email addresses to clipboard!");
  };

  const handleExportCSV = () => {
    const selectedBuyers = buyers.filter((b) => selectedIds.includes(b.id));
    if (selectedBuyers.length === 0) {
      toast.error("No buyers selected to export");
      return;
    }

    const headers = "Name,Email,Occupation,Tier,Interest Tag,Engagement Score\n";
    const rows = selectedBuyers
      .map(
        (b) =>
          `"${b.name}","${b.email}","${b.occupation || ""}","${b.validationTier}","${
            b.interestTagLabel || ""
          }",${b.engagementScore || 0}`
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pilot_cohort_members_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded Pilot Batch CSV!");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-6 rounded-3xl bg-white/95 backdrop-blur-xl border border-gray-100 shadow-2xl">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            Onboard Stage 3 Pilot Batch
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500">
            Select high-intent validated buyers from Stage 2 feedback to recruit into your Stage 3 Pilot MVP cohort for prototype testing and real-time feedback.
          </DialogDescription>
        </DialogHeader>

        {/* Toolbar Controls */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by name, email, or interest tag..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 rounded-xl bg-slate-50 border-slate-200 text-xs focus-visible:ring-indigo-500"
              />
            </div>
            <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {(["ALL", "GOLD", "SILVER", "BRONZE"] as const).map((tier) => (
                <button
                  key={tier}
                  onClick={() => setTierFilter(tier)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    tierFilter === tier
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-100 text-gray-600 hover:bg-slate-200"
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs border-b border-gray-100 pb-2">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAllGold}
                className="h-7 text-[11px] rounded-lg border-amber-200 text-amber-800 bg-amber-50/50 hover:bg-amber-100 gap-1 font-semibold"
              >
                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                Select All Gold
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAllFiltered}
                className="h-7 text-[11px] text-gray-600 hover:bg-slate-100 rounded-lg"
              >
                Select Filtered
              </Button>
              {selectedIds.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeselectAll}
                  className="h-7 text-[11px] text-gray-500 hover:text-gray-800 rounded-lg"
                >
                  Clear Selection
                </Button>
              )}
            </div>
            <span className="font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">
              {selectedIds.length} Buyers Selected
            </span>
          </div>
        </div>

        {/* Buyers Selection List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 my-2 max-h-[360px]">
          {filteredBuyers.length === 0 ? (
            <div className="text-center py-10 space-y-2 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Users className="w-8 h-8 text-gray-300 mx-auto" />
              <p className="text-xs text-gray-500 font-medium">No buyers matched your filter criteria.</p>
            </div>
          ) : (
            filteredBuyers.map((buyer) => {
              const isSelected = selectedIds.includes(buyer.id);
              const isGold = buyer.validationTier === "GOLD";
              const isSilver = buyer.validationTier === "SILVER";

              return (
                <div
                  key={buyer.id}
                  onClick={() => toggleSelect(buyer.id)}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-indigo-50/60 border-indigo-200 shadow-sm"
                      : "bg-white border-gray-100 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelect(buyer.id)}
                      className="rounded-md border-indigo-300 data-[state=checked]:bg-indigo-600"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="text-xs font-bold text-gray-900">{buyer.name}</h5>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                            isGold
                              ? "bg-amber-100 text-amber-800 border-amber-200"
                              : isSilver
                              ? "bg-slate-100 text-slate-700 border-slate-200"
                              : "bg-orange-50 text-orange-700 border-orange-200"
                          }`}
                        >
                          {buyer.validationTier}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500">{buyer.email}</p>
                      {buyer.interestTagLabel && (
                        <span className="inline-block mt-1 text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                          Tag: {buyer.interestTagLabel}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[11px] font-bold text-gray-700">
                      Score: {buyer.engagementScore || 0}
                    </div>
                    {buyer.occupation && (
                      <span className="text-[10px] text-gray-400">{buyer.occupation}</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <DialogFooter className="flex-col sm:flex-row items-center justify-between gap-2 border-t border-gray-100 pt-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyEmails}
              className="rounded-xl text-xs gap-1.5 border-gray-200"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy Emails
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="rounded-xl text-xs gap-1.5 border-gray-200"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </Button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting}
              className="rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 gap-1.5"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Enroll Selected ({selectedIds.length})
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
