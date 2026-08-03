import { useState } from "react";
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
} from "lucide-react";
import { useDocuments } from "@/hooks/useDocuments";

interface KnowledgeTabProps {
  projectId: string;
}

export default function KnowledgeTab({ projectId }: KnowledgeTabProps) {
  const {
    documents,
    uploadDocument,
    deleteDocument: removeDocument,
    renameDocument,
    refreshKnowledge,
  } = useDocuments(projectId);

  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadDocument(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Upload Section */}
      <div className="bg-card rounded-2xl border border-border/30 p-8 shadow-card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Database className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-xl">Train your ChatBot</h2>
              <p className="text-sm text-muted-foreground">
                Upload documents to train your chatbot
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl gap-2"
            onClick={handleRefreshKnowledge}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Updating..." : "Refresh Knowledge"}
          </Button>
        </div>

        <input
          type="file"
          id="doc-upload"
          accept=".pdf,.txt,.doc,.docx"
          onChange={handleDocumentUpload}
          className="hidden"
        />
        <label
          htmlFor="doc-upload"
          className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors cursor-pointer block ${
            isDragging
              ? "border-primary bg-primary/10"
              : "border-border bg-muted/30 hover:bg-muted/50 hover:border-primary/50"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="w-20 h-20 rounded-2xl bg-card shadow-card flex items-center justify-center mx-auto mb-6">
            <Upload className={`w-10 h-10 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
          </div>
          <p className="font-semibold text-foreground text-lg mb-2">Upload Documents</p>
          <p className="text-muted-foreground mb-4">
            Drag & drop files or <span className="text-primary font-medium cursor-pointer">browse</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Supports PDF, TXT, DOC, DOCX (Max 10MB per file)
          </p>
        </label>
      </div>

      {/* Document Library */}
      <div className="bg-card rounded-2xl border border-border/30 p-6 shadow-card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-lg">Train your ChatBot Files</h3>
              <p className="text-sm text-muted-foreground">{documents.length} files available</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
