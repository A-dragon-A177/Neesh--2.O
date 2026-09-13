import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Check,
  Save,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

export interface TagItem {
  id: string;
  label: string;
  priority: number;
  color?: string;
}

interface SpotlightTagConfigProps {
  interestTags: TagItem[];
  setInterestTags: (tags: TagItem[]) => void;
  onSaveTags?: (tags: TagItem[]) => Promise<void> | void;
  isSaving?: boolean;
}

export default function SpotlightTagConfig({
  interestTags = [],
  setInterestTags,
  onSaveTags,
  isSaving = false,
}: SpotlightTagConfigProps) {
  const [newTagInput, setNewTagInput] = useState("");
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const handleAddTag = async () => {
    const trimmed = newTagInput.trim();
    if (!trimmed) {
      toast.error("Please enter a tag name");
      return;
    }

    const currentTags = Array.isArray(interestTags) ? interestTags : [];
    const exists = currentTags.some(
      (t) => (t.label || "").trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      toast.error(`"${trimmed}" tag already exists`);
      return;
    }

    const newTag: TagItem = {
      id: "tag-" + Date.now(),
      label: trimmed,
      priority: currentTags.length + 1,
    };

    const updated = [...currentTags, newTag];
    setInterestTags(updated);
    setNewTagInput("");

    if (onSaveTags) {
      try {
        await onSaveTags(updated);
      } catch (e) {
        console.error("Failed to auto-save added tag:", e);
      }
    } else {
      toast.success(`Tag "${trimmed}" added!`);
    }
  };

  const handleSaveEdit = async (idx: number) => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      setEditingTagId(null);
      return;
    }

    const currentTags = Array.isArray(interestTags) ? [...interestTags] : [];
    currentTags[idx] = { ...currentTags[idx], label: trimmed };
    setInterestTags(currentTags);
    setEditingTagId(null);

    if (onSaveTags) {
      try {
        await onSaveTags(currentTags);
      } catch (e) {
        console.error("Failed to auto-save edited tag:", e);
      }
    } else {
      toast.success("Tag updated!");
    }
  };

  const handleMoveTag = async (idx: number, direction: "up" | "down") => {
    const currentTags = Array.isArray(interestTags) ? [...interestTags] : [];
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= currentTags.length) return;

    const temp = currentTags[idx];
    currentTags[idx] = currentTags[targetIdx];
    currentTags[targetIdx] = temp;
    const reordered = currentTags.map((t, i) => ({ ...t, priority: i + 1 }));
    setInterestTags(reordered);

    if (onSaveTags) {
      try {
        await onSaveTags(reordered);
      } catch (e) {
        console.error("Failed to auto-save reordered tags:", e);
      }
    }
  };

  const handleDeleteTag = async (idx: number) => {
    const currentTags = Array.isArray(interestTags) ? [...interestTags] : [];
    const filtered = currentTags.filter((_, i) => i !== idx);
    const reordered = filtered.map((t, i) => ({ ...t, priority: i + 1 }));
    setInterestTags(reordered);

    if (onSaveTags) {
      try {
        await onSaveTags(reordered);
      } catch (e) {
        console.error("Failed to auto-save deleted tag:", e);
      }
    } else {
      toast.success("Tag removed");
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border/30 p-6 shadow-card space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-lg text-foreground">
              Audience Interest Tags
            </h3>
            <p className="text-sm text-muted-foreground">
              Define priority options visitors choose when expressing interest
            </p>
          </div>
        </div>
        {onSaveTags && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onSaveTags(interestTags)}
            disabled={isSaving}
            className="gap-2 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 self-start sm:self-auto font-medium"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Tags</span>
          </Button>
        )}
      </div>

      {/* Priority Legend */}
      <div className="bg-muted/30 border border-border/40 rounded-xl p-4 text-xs space-y-2">
        <div className="font-semibold text-foreground text-sm mb-1">
          🏆 Signal Priority &amp; Validation Thresholds
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-[10px]">
              #1
            </span>
            <span>
              <strong className="text-amber-500 font-medium">Gold Tier:</strong> Intent + feedback + 3+ questions
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-slate-400 text-slate-950 font-bold flex items-center justify-center text-[10px]">
              #2
            </span>
            <span>
              <strong className="text-slate-400 font-medium">Silver Tier:</strong> Intent + feedback or questions
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-amber-800 text-white font-bold flex items-center justify-center text-[10px]">
              #3+
            </span>
            <span>
              <strong className="text-amber-800 font-medium">Bronze Tier:</strong> Basic interest signal
            </span>
          </div>
        </div>
      </div>

      {/* Add New Tag */}
      <div className="flex gap-2">
        <Input
          placeholder="Add custom interest tag (e.g. Early Access, Partner, Investor)..."
          value={newTagInput}
          onChange={(e) => setNewTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddTag();
            }
          }}
          className="h-10 text-sm bg-background"
        />
        <Button
          type="button"
          onClick={handleAddTag}
          disabled={!newTagInput.trim() || isSaving}
          className="h-10 px-4 gap-1.5 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
        >
          <Plus className="w-4 h-4" /> Add Tag
        </Button>
      </div>

      {/* Tag List */}
      <div className="space-y-2">
        {interestTags.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-4">
            No interest tags configured. Click Add Tag to create one.
          </p>
        ) : (
          <div className="space-y-2">
            {interestTags.map((tag, idx) => {
              const priority = idx + 1;
              const isGold = priority === 1;
              const isSilver = priority === 2;
              const isEditingThis = editingTagId === `tag-${tag.id || idx}`;

              return (
                <div
                  key={tag.id || idx}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                    isGold
                      ? "bg-amber-500/10 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                      : isSilver
                      ? "bg-slate-500/10 border-slate-400/40"
                      : "bg-muted/40 border-border/50"
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0 mr-2">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        isGold
                          ? "bg-amber-500 text-slate-950"
                          : isSilver
                          ? "bg-slate-400 text-slate-950"
                          : "bg-amber-800 text-white"
                      }`}
                    >
                      #{priority}
                    </span>
                    {isEditingThis ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="h-8 text-sm bg-background font-medium"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleSaveEdit(idx);
                            }
                          }}
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleSaveEdit(idx)}
                          className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="font-semibold text-foreground text-sm truncate">
                          {tag.label}
                        </span>
                        <span className="text-[11px] text-muted-foreground shrink-0 hidden sm:inline">
                          ({isGold ? "Highest Priority → Gold: Intent + Feedback + 3+ Questions" : isSilver ? "Mid Priority → Silver: Intent + Feedback or Questions" : "Lower Priority → Bronze: Basic Interest"})
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {!isEditingThis && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingTagId(`tag-${tag.id || idx}`);
                          setEditingName(tag.label);
                        }}
                        className="h-8 w-8 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                        title="Edit tag label"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={idx === 0}
                      onClick={() => handleMoveTag(idx, "up")}
                      className="h-8 w-8 rounded-lg"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={idx === interestTags.length - 1}
                      onClick={() => handleMoveTag(idx, "down")}
                      className="h-8 w-8 rounded-lg"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteTag(idx)}
                      className="h-8 w-8 rounded-lg text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
