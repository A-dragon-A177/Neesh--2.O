import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Database,
  Upload,
  FolderOpen,
  FileText,
  Pencil,
  Trash2,
  Calendar,
  Clock,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { useDocuments } from "@/hooks/useDocuments";

interface KnowledgeTabProps {
  projectId: string;
}

export default function KnowledgeTab({ projectId }: KnowledgeTabProps) {
  const {
    documents,
    uploading,
    uploadDocument,
    deleteDocument: removeDocument,
    renameDocument,
    refreshKnowledge,
  } = useDocuments(projectId);

  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Simulated live progress timer when uploading is active
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (uploading) {
      setUploadProgress(15);
      timer = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 92) return 92;
          return prev + Math.floor(Math.random() * 10) + 4;
        });
      }, 300);
    } else {
      if (uploadProgress > 0) {
        setUploadProgress(100);
        const timeout = setTimeout(() => {
          setUploadingFile(null);
          setUploadProgress(0);
        }, 800);
        return () => clearTimeout(timeout);
      }
    }
    return () => clearInterval(timer);
  }, [uploading]);

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadingFile(file);
      await uploadDocument(file);
    }
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!uploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (uploading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      setUploadingFile(file);
      await uploadDocument(file);
    }
  };

  const handleRefreshKnowledge = async () => {
    setIsRefreshing(true);
    try {
      await refreshKnowledge();
    } catch (err) {
      console.error("Error refreshing knowledge:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const startEditingDoc = (doc: (typeof documents)[0]) => {
    setEditingDocId(doc.id);
    setEditingName(doc.original_filename);
  };

  const saveDocName = async () => {
    if (editingDocId && editingName.trim()) {
      await renameDocument(editingDocId, editingName.trim());
    }
    setEditingDocId(null);
    setEditingName("");
  };

  const deleteDoc = async (docId: string) => {
    await removeDocument(docId);
  };

  const isUploadingActive = uploading || (uploadingFile !== null && uploadProgress < 100);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Upload Section */}
      <div className="bg-card rounded-2xl border border-border/30 p-4 sm:p-8 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Database className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display font-semibold text-lg sm:text-xl truncate">Train your ChatBot</h2>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                Upload documents to train your chatbot knowledge base
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl gap-2 w-full sm:w-auto shrink-0 justify-center h-9 sm:h-8 text-xs sm:text-sm"
            onClick={handleRefreshKnowledge}
            disabled={isRefreshing || isUploadingActive}
          >
            <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Updating..." : "Refresh Knowledge"}
          </Button>
        </div>

        <input
          type="file"
          id="doc-upload"
          accept=".pdf,.txt,.doc,.docx"
          onChange={handleDocumentUpload}
          disabled={isUploadingActive}
          className="hidden"
        />

        {isUploadingActive ? (
          <div className="border-2 border-primary/40 bg-gradient-to-br from-primary/5 via-accent/5 to-primary/10 rounded-2xl p-6 sm:p-10 text-center shadow-lg transition-all animate-pulse-subtle">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <div className="w-12 h-12 rounded-xl bg-card shadow-md flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary animate-bounce" />
              </div>
            </div>

            <div className="max-w-md mx-auto space-y-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/15 text-primary mb-2">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  Uploading & Processing Knowledge Base
                </span>
                <h3 className="font-semibold text-slate-900 dark:text-white text-base sm:text-lg truncate">
                  {uploadingFile?.name || "Ingesting Document..."}
                </h3>
                {uploadingFile && (
                  <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                    {(uploadingFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                )}
              </div>

              {/* Live Progress Bar */}
              <div className="space-y-1.5">
                <div className="w-full bg-muted rounded-full h-3 overflow-hidden border border-border/40 p-0.5">
                  <div
                    className="bg-gradient-to-r from-primary via-indigo-500 to-accent h-full transition-all duration-300 rounded-full"
                    style={{ width: `${Math.min(uploadProgress, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground px-1">
                  <span>
                    {uploadProgress < 40
                      ? "Uploading file to storage..."
                      : uploadProgress < 85
                      ? "Extracting document text..."
                      : uploadProgress < 100
                      ? "Training Chatbot AI Engine..."
                      : "Knowledge Base Updated!"}
                  </span>
                  <span className="font-bold text-primary">{Math.min(uploadProgress, 100)}%</span>
                </div>
              </div>

              {/* Status Chips */}
              <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] font-semibold">
                <div className={`flex items-center justify-center gap-1 p-2 rounded-xl border transition-all ${
                  uploadProgress >= 30
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                    : "bg-card/60 border-border/40 text-muted-foreground"
                }`}>
                  {uploadProgress >= 30 ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />}
                  <span>Uploading</span>
                </div>
                <div className={`flex items-center justify-center gap-1 p-2 rounded-xl border transition-all ${
                  uploadProgress >= 80
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                    : uploadProgress >= 30
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-card/60 border-border/40 text-muted-foreground"
                }`}>
                  {uploadProgress >= 80 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  ) : uploadProgress >= 30 ? (
                    <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>Extracting</span>
                </div>
                <div className={`flex items-center justify-center gap-1 p-2 rounded-xl border transition-all ${
                  uploadProgress >= 100
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                    : uploadProgress >= 80
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"
                    : "bg-card/60 border-border/40 text-muted-foreground"
                }`}>
                  {uploadProgress >= 100 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  ) : uploadProgress >= 80 ? (
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin shrink-0" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>AI Training</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <label
            htmlFor="doc-upload"
            className={`border-2 border-dashed rounded-2xl p-6 sm:p-12 text-center transition-colors cursor-pointer block ${
              isDragging
                ? "border-primary bg-primary/10"
                : "border-border bg-muted/30 hover:bg-muted/50 hover:border-primary/50"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-card shadow-card flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <Upload className={`w-7 h-7 sm:w-10 sm:h-10 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <p className="font-semibold text-foreground text-base sm:text-lg mb-1 sm:mb-2">Upload Documents</p>
            <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-4">
              Drag & drop files or <span className="text-primary font-medium cursor-pointer">browse</span>
            </p>
            <p className="text-[11px] sm:text-xs text-muted-foreground">
              Supports PDF, TXT, DOC, DOCX (Max 10MB per file)
            </p>
          </label>
        )}
      </div>

      {/* Document Library */}
      <div className="bg-card rounded-2xl border border-border/30 p-4 sm:p-6 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
              <FolderOpen className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-base sm:text-lg text-slate-900 dark:text-white">Train your ChatBot Files</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">{documents.length} files available</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Uploading Placeholder Card */}
          {isUploadingActive && (
            <div className="bg-primary/5 rounded-2xl p-5 border-2 border-dashed border-primary/40 animate-pulse flex flex-col justify-between">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/20 text-primary">
                  Processing
                </span>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate" title={uploadingFile?.name}>
                  {uploadingFile?.name || "New Document..."}
                </h4>
                <p className="text-xs text-primary font-semibold mt-1">Training AI Chatbot...</p>
              </div>
            </div>
          )}
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="group relative bg-muted/30 rounded-2xl p-5 border border-border/50 hover:border-primary/50 hover:bg-muted/50 transition-all duration-300 hover:shadow-lg"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    onClick={() => startEditingDoc(doc)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => deleteDoc(doc.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {editingDocId === doc.id ? (
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={saveDocName}
                    onKeyDown={(e) => e.key === "Enter" && saveDocName()}
                    autoFocus
                    className="h-8 text-sm font-medium"
                  />
                ) : (
                  <h4 className="font-semibold text-foreground truncate pr-2" title={doc.original_filename}>
                    {doc.original_filename}
                  </h4>
                )}

                <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span
                      className="font-medium text-primary bg-primary/10 px-2 py-0.5 rounded text-[10px] uppercase truncate max-w-[130px] inline-block"
                      title={doc.mime_type || "FILE"}
                    >
                      {doc.mime_type?.includes("wordprocessingml")
                        ? "DOCX"
                        : doc.mime_type?.split("/")[1] || "FILE"}
                    </span>
                    <span className="flex-shrink-0">v{doc.version || 1}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                    <Clock className="w-3 h-3 ml-1" />
                    <span>{new Date(doc.created_at).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
