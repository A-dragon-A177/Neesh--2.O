import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Loader2, ArrowLeft, Star, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import apiClient from "@/lib/api";

const GRADE_COLORS: Record<string, string> = {
  SCOUT: "bg-gray-100 text-gray-700",
  SEED: "bg-green-100 text-green-700",
  RISING: "bg-blue-100 text-blue-700",
  PRO: "bg-purple-100 text-purple-700",
  MASTER: "bg-yellow-100 text-yellow-800",
  ELITE: "bg-orange-100 text-orange-700",
};

interface ExplorerProfile {
  id: string;
  username: string;
  display_name: string;
  pioneer_grade: string;
  bio: string | null;
  linkedin_domain_tenure_years: number;
  domain: { name: string; slug: string } | null;
  interaction_count: number;
  is_founding_explorer: boolean;
}

const ExplorerProfilePage = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ExplorerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Strip leading @ if present (from /@:username route)
  const cleanUsername = username?.replace(/^@/, "") ?? "";

  useEffect(() => {
    if (!cleanUsername) return;
    setLoading(true);
    apiClient
      .get<ExplorerProfile>(`/api/explorer/profile/${cleanUsername}`)
      .then(setProfile)
      .catch(() => setError("Explorer profile not found."))
      .finally(() => setLoading(false));
  }, [cleanUsername]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">{error ?? "Profile not found."}</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Go back
        </Button>
      </div>
    );
  }

  const gradeClass = GRADE_COLORS[profile.pioneer_grade] ?? GRADE_COLORS.SCOUT;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>

        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-xl font-bold text-muted-foreground select-none">
              {profile.display_name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-semibold">{profile.display_name}</h1>
                {profile.is_founding_explorer && (
                  <Badge className="bg-amber-100 text-amber-700 text-xs">Founding Pioneer</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
              {profile.domain && (
                <Badge variant="outline" className="mt-1 text-xs">{profile.domain.name}</Badge>
              )}
            </div>
            <span className={`px-2 py-1 rounded text-xs font-medium ${gradeClass}`}>
              {profile.pioneer_grade}
            </span>
          </div>

          {profile.bio && (
            <p className="text-sm text-muted-foreground leading-relaxed">{profile.bio}</p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Star className="w-4 h-4" />
                <span className="text-xs">Interactions</span>
              </div>
              <p className="text-2xl font-bold">{profile.interaction_count}</p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Award className="w-4 h-4" />
                <span className="text-xs">Domain Experience</span>
              </div>
              <p className="text-2xl font-bold">{profile.linkedin_domain_tenure_years}y</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExplorerProfilePage;
