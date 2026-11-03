import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Loader2, ArrowLeft, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import apiClient from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

interface SpotlightData {
  id: string;
  title: string;
  startup_name: string;
  one_sentence_pitch: string;
  domain: string;
  domain_slug: string;
  state: string;
  interactionCount: number;
  activeSprint: {
    id: string;
    pioneerCount: number;
    targetPioneers: number;
    endsAt: string;
  } | null;
}

const SpotlightPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<SpotlightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiClient
      .get<SpotlightData>(`/api/sparks/${id}`)
      .then(setData)
      .catch(() => setError("Spotlight not found."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">{error ?? "Spotlight not found."}</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Go back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>

        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">{data.startup_name}</h1>
              <Badge variant="secondary" className="mt-1">{data.domain}</Badge>
            </div>
            <Badge variant={data.state === "SPRINT_ACTIVE" ? "default" : "outline"}>
              {data.state === "SPRINT_ACTIVE" ? "Sprint Active" : data.state}
            </Badge>
          </div>

          <p className="text-muted-foreground text-base leading-relaxed">
            {data.one_sentence_pitch}
          </p>

          {data.activeSprint && (
            <div className="rounded-lg border p-4 bg-muted/30 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span>Sprint in Progress</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {data.activeSprint.pioneerCount} / {data.activeSprint.targetPioneers} Pioneers engaged
              </div>
              <div className="text-xs text-muted-foreground">
                Ends {new Date(data.activeSprint.endsAt).toLocaleDateString()}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            {user && (
              <Button
                onClick={() => navigate(`/sprint/${id}/checkout`)}
                disabled={!!data.activeSprint}
              >
                {data.activeSprint ? "Sprint Active" : "Start Sprint"}
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate(`/spark/${id}`)}>
              View Spark Details
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpotlightPage;
