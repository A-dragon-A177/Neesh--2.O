import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Loader2, ArrowLeft, ShieldCheck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

interface SprintState {
  id: string;
  state: string;
  guarantee_eligible: boolean;
  amount_paise: string;
  days_purchased: number;
  claim_window_opens_at: string;
  claim_window_closes_at: string;
  pioneer_count: number;
}

const GuaranteeClaimPage = () => {
  const { sprintId } = useParams<{ sprintId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [sprint, setSprint] = useState<SprintState | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sprintId) return;
    setLoading(true);
    apiClient
      .get<SprintState>(`/api/sprints/${sprintId}`)
      .then(setSprint)
      .catch(() => setError("Sprint session not found."))
      .finally(() => setLoading(false));
  }, [sprintId]);

  const handleClaim = async () => {
    if (!sprintId || claiming) return;
    setClaiming(true);
    try {
      await apiClient.post(`/api/sprints/${sprintId}/guarantee-claim`, {});
      setClaimed(true);
      toast({ title: "Guarantee claimed", description: "Your refund has been credited to your wallet." });
    } catch (err: any) {
      const msg = err?.message ?? "Claim failed. Please try again.";
      if (msg.includes("409") || msg.toLowerCase().includes("already")) {
        toast({ title: "Already claimed", description: "This guarantee has already been processed.", variant: "destructive" });
      } else {
        toast({ title: "Claim failed", description: msg, variant: "destructive" });
      }
    } finally {
      setClaiming(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Please log in to claim your guarantee.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !sprint) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <AlertCircle className="w-10 h-10 text-destructive" />
        <p className="text-muted-foreground">{error ?? "Sprint not found."}</p>
        <Button variant="outline" onClick={() => navigate("/dashboard/founder")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Dashboard
        </Button>
      </div>
    );
  }

  const amountRs = (Number(sprint.amount_paise) / 100).toFixed(2);
  const windowOpen = sprint.claim_window_opens_at ? new Date(sprint.claim_window_opens_at) : null;
  const windowClose = sprint.claim_window_closes_at ? new Date(sprint.claim_window_closes_at) : null;
  const now = new Date();
  const withinWindow = windowOpen && windowClose && now >= windowOpen && now <= windowClose;
  const canClaim = sprint.state === "GUARANTEE_CLAIMABLE" && sprint.guarantee_eligible && withinWindow;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/founder")} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" /> Dashboard
        </Button>

        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-green-500" />
            <div>
              <h1 className="text-2xl font-semibold">Sprint Guarantee</h1>
              <p className="text-muted-foreground text-sm">
                {sprint.days_purchased}-day Sprint — ₹{amountRs}
              </p>
            </div>
          </div>

          <div className="rounded-lg border p-5 space-y-3 bg-muted/20">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sprint state</span>
              <span className="font-medium">{sprint.state}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Pioneers engaged</span>
              <span className="font-medium">{sprint.pioneer_count} / 3</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Guarantee eligible</span>
              <span className={sprint.guarantee_eligible ? "text-green-600 font-medium" : "text-muted-foreground"}>
                {sprint.guarantee_eligible ? "Yes" : "No"}
              </span>
            </div>
            {windowClose && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Claim window closes</span>
                <span className="font-medium">{windowClose.toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {claimed ? (
            <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-5 text-center space-y-2">
              <ShieldCheck className="w-8 h-8 text-green-500 mx-auto" />
              <p className="font-medium text-green-700 dark:text-green-300">Guarantee claimed successfully</p>
              <p className="text-sm text-muted-foreground">₹{amountRs} has been credited to your wallet.</p>
              <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/wallet")}>View Wallet</Button>
            </div>
          ) : canClaim ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Your Sprint ended with fewer than 3 Pioneer engagements. You are eligible to claim a full refund of ₹{amountRs}.
              </p>
              <Button onClick={handleClaim} disabled={claiming} className="w-full">
                {claiming && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {claiming ? "Processing..." : `Claim ₹${amountRs} Guarantee Refund`}
              </Button>
            </div>
          ) : (
            <div className="rounded-lg bg-muted p-5 text-center">
              <p className="text-muted-foreground text-sm">
                {!sprint.guarantee_eligible
                  ? "This Sprint is not eligible for the guarantee (requires ≥ 7-day Sprint)."
                  : sprint.state !== "GUARANTEE_CLAIMABLE"
                  ? `This Sprint is in state "${sprint.state}" and cannot be claimed right now.`
                  : !withinWindow
                  ? "The claim window is not currently open."
                  : "Guarantee not available."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GuaranteeClaimPage;
