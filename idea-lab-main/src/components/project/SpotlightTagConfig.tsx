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
} from "lucide-react";

export interface TagItem {
  id: string;
  label: string;
  priority: number;
  color?: string;
}

interface SpotlightTagConfigProps {
  interestTags: TagItem[];
  setInterestTags: (tags: TagItem[]) => void;
}

export default function SpotlightTagConfig({
  interestTags,
  setInterestTags,
}: SpotlightTagConfigProps) {
  const [newTagInput, setNewTagInput] = useState("");
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const handleAddTag = () => {
    if (!newTagInput.trim()) return;
    const newTag: TagItem = {
      id: String(Date.now()),
      label: newTagInput.trim(),
      priority: interestTags.length + 1,
    };
    setInterestTags([...interestTags, newTag]);
    setNewTagInput("");
  };

  return (
    <div className="bg-card rounded-2xl border border-border/30 p-6 shadow-card space-y-6">
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-lg">Audience Interest Tags</h3>
            <p className="text-sm text-muted-foreground">
              Define priority options visitors choose when expressing interest
            </p>
          </div>
        </div>
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
              <strong className="text-amber-500 font-medium">Gold Tier:</strong> Target signal
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-slate-400 text-slate-950 font-bold flex items-center justify-center text-[10px]">
              #2
            </span>
            <span>
              <strong className="text-slate-400 font-medium">Silver Tier:</strong> Mid priority
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-amber-800 text-white font-bold flex items-center justify-center text-[10px]">
              #3+
            </span>
            <span>
              <strong className="text-amber-800 font-medium">Bronze Tier:</strong> Lower priority
            </span>
          </div>
        </div>
      </div>

      {/* Add New Tag */}
      <div className="flex gap-2">
        <Input
          placeholder="Add custom interest tag (e.g. Early Access, Partner)..."
          value={newTagInput}
          onChange={(e) => setNewTagInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
          className="h-10 text-sm bg-background"
        />
        <Button onClick={handleAddTag} className="h-10 px-4 gap-1.5 shrink-0">
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
                              if (editingName.trim()) {
                                const updated = [...interestTags];
                                updated[idx] = { ...updated[idx], label: editingName.trim() };
                                setInterestTags(updated);
                              }
                              setEditingTagId(null);
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          onClick={() => {
                            if (editingName.trim()) {
                              const updated = [...interestTags];
                              updated[idx] = { ...updated[idx], label: editingName.trim() };
                              setInterestTags(updated);
                            }
                            setEditingTagId(null);
                          }}
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
                          ({isGold ? "Highest Priority → Gold Validation Eligible" : isSilver ? "Mid Priority → Silver Validation Eligible" : "Lower Priority → Bronze Validation Eligible"})
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {!isEditingThis && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingTagId(`tag-${tag.id || idx}`);
                          setEditingName(tag.label);
                        }}
                        className="h-8 w-8 rounded-lg text-slate-500 hover:text-slate-900"
                        title="Edit tag label"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={idx === 0}
                      onClick={() => {
                        if (idx === 0) return;
                        const updated = [...interestTags];
                        const temp = updated[idx];
                        updated[idx] = updated[idx - 1];
                        updated[idx - 1] = temp;
                        const reordered = updated.map((t, i) => ({ ...t, priority: i + 1 }));
                        setInterestTags(reordered);
                      }}
                      className="h-8 w-8 rounded-lg"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={idx === interestTags.length - 1}
                      onClick={() => {
                        if (idx === interestTags.length - 1) return;
                        const updated = [...interestTags];
                        const temp = updated[idx];
                        updated[idx] = updated[idx + 1];
                        updated[idx + 1] = temp;
                        const reordered = updated.map((t, i) => ({ ...t, priority: i + 1 }));
                        setInterestTags(reordered);
                      }}
                      className="h-8 w-8 rounded-lg"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const filtered = interestTags.filter((_, i) => i !== idx);
                        const reordered = filtered.map((t, i) => ({ ...t, priority: i + 1 }));
                        setInterestTags(reordered);
                      }}
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
