import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Database,
  Upload,
  Trash2,
  Plus,
  Image as ImageIcon,
  Video,
  ChevronUp,
  ChevronDown,
  Type,
} from "lucide-react";
import SpotlightTagConfig, { TagItem } from "./SpotlightTagConfig";

export interface SectionItem {
  id: string;
  title: string;
  content: string;
  type: string;
  sectionTitle?: string;
  imageUrl?: string;
  videoUrl?: string;
  feedbackTitle?: string;
  feedbackDescription?: string;
  feedbackFields?: Array<{
    id: string;
    type: string;
    label: string;
    placeholder?: string;
    required: boolean;
    options?: string[];
    scaleMin?: number;
    scaleMax?: number;
    scaleMinLabel?: string;
    scaleMaxLabel?: string;
  }>;
}

interface SpotlightEditorTabProps {
  projectTitle: string;
  onTitleChange: (newTitle: string) => void;
  coverImage: string | null;
  uploadingCover: boolean;
  onCoverImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveCoverImage: () => void;
  sections: SectionItem[];
  setSections: React.Dispatch<React.SetStateAction<SectionItem[]>>;
  onSectionImageUpload: (sectionId: string, file: File) => void;
  onSectionVideoUpload: (sectionId: string, file: File) => void;
  interestTags: TagItem[];
  setInterestTags: (tags: TagItem[]) => void;
}

export default function SpotlightEditorTab({
  projectTitle,
  onTitleChange,
  coverImage,
  uploadingCover,
  onCoverImageUpload,
  onRemoveCoverImage,
  sections,
  setSections,
  onSectionImageUpload,
  onSectionVideoUpload,
  interestTags,
  setInterestTags,
}: SpotlightEditorTabProps) {
  const addSection = (type: "text" | "image" | "video") => {
    const titleMap = {
      text: `Section ${sections.length + 1}`,
      image: `Image ${sections.filter((s) => s.type === "image").length + 1}`,
      video: `Video ${sections.filter((s) => s.type === "video").length + 1}`,
    };
    const newSection: SectionItem = {
      id: String(Date.now()),
      title: titleMap[type],
      content: "",
      type,
    };
    setSections([...sections, newSection]);
  };

  const moveSection = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === sections.length - 1)
    ) {
      return;
    }
    const newSections = [...sections];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newSections[index], newSections[targetIndex]] = [
      newSections[targetIndex],
      newSections[index],
    ];
    setSections(newSections);
  };

  const deleteSection = (sectionId: string) => {
    setSections(sections.filter((s) => s.id !== sectionId));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Project Header Card */}
      <div className="bg-card rounded-2xl border border-border/30 p-6 shadow-card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Database className="w-6 h-6 text-primary" />
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Spotlight Page Editor
              </span>
              <h1 className="font-display font-bold text-2xl text-foreground">
                Edit Page Content
              </h1>
            </div>
          </div>
        </div>

        {/* Project Title Input */}
        <div className="space-y-2 mb-6">
          <label className="text-sm font-medium text-foreground">Project Title</label>
          <Input
            value={projectTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Enter your project title..."
            className="text-lg font-semibold bg-background"
          />
        </div>

        {/* Cover Image Upload */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Cover Image</label>
          {coverImage ? (
            <div className="relative rounded-xl overflow-hidden border border-border/50 bg-slate-950/30 flex items-center justify-center group min-h-[160px] max-h-[600px] p-1">
              <img
                src={coverImage}
                alt="Cover"
                className="w-full h-auto max-h-[580px] object-contain rounded-lg"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <label className="cursor-pointer">
                  <Button variant="secondary" size="sm" className="gap-2 pointer-events-none">
                    <Upload className="w-4 h-4" /> Change Image
                  </Button>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onCoverImageUpload}
                    className="hidden"
                  />
                </label>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onRemoveCoverImage}
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Remove
                </Button>
              </div>
            </div>
          ) : (
            <label className="border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer block border-border bg-muted/30 hover:bg-muted/50 hover:border-primary/50">
              <input
                type="file"
                accept="image/*"
                onChange={onCoverImageUpload}
                disabled={uploadingCover}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-xl bg-card shadow-card flex items-center justify-center mx-auto mb-3">
                <ImageIcon className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="font-semibold text-foreground text-sm mb-1">
                {uploadingCover ? "Uploading..." : "Upload Cover Image"}
              </p>
              <p className="text-xs text-muted-foreground">
                PNG, JPG or WEBP (Recommended 1200x630)
              </p>
            </label>
          )}
        </div>
      </div>

      {/* Sections List */}
      <div className="space-y-4">
        {sections.map((section, index) => (
          <div
            key={section.id}
            className="bg-card rounded-2xl border border-border/30 p-6 shadow-card relative group"
          >
            {/* Section Controls */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-primary">
                {section.title}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={index === 0}
                  onClick={() => moveSection(index, "up")}
                  className="h-8 w-8 rounded-lg"
                >
                  <ChevronUp className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={index === sections.length - 1}
                  onClick={() => moveSection(index, "down")}
                  className="h-8 w-8 rounded-lg"
                >
                  <ChevronDown className="w-4 h-4" />
                </Button>
                {section.id !== "1" && section.id !== "2" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteSection(section.id)}
                    className="h-8 w-8 rounded-lg text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Section Content Rendering */}
            {section.type === "feedback" ? (
              <div className="space-y-4">
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-3">
                  <p className="text-sm text-primary font-medium">
                    📋 Feedback Form (Preview - editable via Feedback Builder)
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{section.feedbackTitle || section.title}</h3>
                  {section.feedbackDescription && (
                    <p className="text-sm text-muted-foreground mt-1">{section.feedbackDescription}</p>
                  )}
                </div>
                <div className="space-y-3 pt-2">
                  {(section.feedbackFields || []).map((field: any, fIdx: number) => (
                    <div key={field.id || fIdx} className="p-3 bg-muted/40 rounded-lg border border-border/50 text-xs">
                      <span className="font-semibold text-foreground">{field.label}</span>
                      <span className="text-muted-foreground ml-2">({field.type})</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : section.type === "image" ? (
              <div className="space-y-3">
                {section.imageUrl || (section.content && (section.content.startsWith("http") || section.content.startsWith("data:") || section.content.startsWith("blob:"))) ? (
                  <div className="relative rounded-xl overflow-hidden border border-border/50 bg-slate-950/30 flex items-center justify-center group/img min-h-[160px] max-h-[600px] p-1">
                    <img
                      src={section.imageUrl || section.content}
                      alt={section.title}
                      className="w-full h-auto max-h-[580px] object-contain rounded-lg"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                      <label className="cursor-pointer">
                        <Button variant="secondary" size="sm" className="gap-2 pointer-events-none">
                          <Upload className="w-4 h-4" /> Replace Image
                        </Button>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) onSectionImageUpload(section.id, file);
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer block border-border bg-muted/30 hover:bg-muted/50 hover:border-primary/50">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onSectionImageUpload(section.id, file);
                      }}
                      className="hidden"
                    />
                    <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="font-semibold text-foreground text-sm">Upload Image</p>
                  </label>
                )}
              </div>
            ) : section.type === "video" ? (
              <div className="space-y-3">
                {section.videoUrl || (section.content && (section.content.startsWith("http") || section.content.startsWith("data:") || section.content.startsWith("blob:"))) ? (
                  <div className="relative rounded-xl overflow-hidden border border-border/50 bg-black flex items-center justify-center min-h-[200px] max-h-[620px] p-1">
                    <video
                      src={section.videoUrl || section.content}
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full h-auto max-h-[600px] object-contain rounded-lg mx-auto"
                    />
                  </div>
                ) : (
                  <label className="border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer block border-border bg-muted/30 hover:bg-muted/50 hover:border-primary/50">
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onSectionVideoUpload(section.id, file);
                      }}
                      className="hidden"
                    />
                    <Video className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="font-semibold text-foreground text-sm">Upload Video</p>
                  </label>
                )}
              </div>
            ) : (
              <Textarea
                value={section.content}
                onChange={(e) => {
                  const val = e.target.value;
                  setSections((prev) =>
                    prev.map((s) => (s.id === section.id ? { ...s, content: val } : s))
                  );
                }}
                placeholder={`Enter content for ${section.title}...`}
                rows={6}
                className="bg-background text-sm"
              />
            )}
          </div>
        ))}
      </div>

      {/* Add Section Button Dropdown */}
      <div className="flex justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="rounded-xl gap-2 shadow-sm">
              <Plus className="w-4 h-4" /> Add Section
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center">
            <DropdownMenuItem onClick={() => addSection("text")}>
              <Type className="w-4 h-4 mr-2" /> Text Section
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addSection("image")}>
              <ImageIcon className="w-4 h-4 mr-2" /> Image Section
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addSection("video")}>
              <Video className="w-4 h-4 mr-2" /> Video Section
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tag Priority Config */}
      <SpotlightTagConfig
        interestTags={interestTags}
        setInterestTags={setInterestTags}
      />
    </div>
  );
}
