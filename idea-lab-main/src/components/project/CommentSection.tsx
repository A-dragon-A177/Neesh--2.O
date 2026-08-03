import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import apiClient from "@/lib/api";

interface Comment {
    id: string;
    name: string;
    text: string;
    timestamp: string;
}

interface CommentSectionProps {
    projectId: string;
    onRequireSignIn?: () => void;
    user?: any;
}

const CommentSection = ({ projectId, onRequireSignIn, user }: CommentSectionProps) => {
    const [comments, setComments] = useState<Comment[]>([]);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [text, setText] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Fetch comments from backend REST API
    const fetchComments = async () => {
        try {
            const data = await apiClient.get<Comment[]>(`/api/public/projects/${projectId}/comments`, { skipAuth: true });
            if (data && Array.isArray(data)) {
                setComments(data);
            }
        } catch (err) {
            console.error("Error fetching comments:", err);
        }
    };

    useEffect(() => {
        if (user) {
            const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "";
            const userEmail = user.email || "";
            if (displayName) setName(prev => prev || displayName);
            if (userEmail) setEmail(prev => prev || userEmail);
        }
    }, [user]);

    useEffect(() => {
        fetchComments();
        // Periodically refresh comments every 15s
        const timer = setInterval(fetchComments, 15000);
        return () => clearInterval(timer);
    }, [projectId]);

    const handleInputFocus = () => {
        if (!user && onRequireSignIn) {
            onRequireSignIn();
        }
    };

    const handleSubmit = async () => {
        if (!user && onRequireSignIn) {
            onRequireSignIn();
            return;
        }
        if (!name.trim() || !text.trim() || submitting) return;
        setSubmitting(true);

        try {
            const resolvedEmail = email.trim() ||
                `${name.trim().toLowerCase().replace(/\s+/g, '.')}.${Date.now()}@comment.anonymous`;

            await apiClient.post(`/api/public/projects/${projectId}/feedback`, {
                name: name.trim(),
                email: resolvedEmail,
                feedbackText: text.trim(),
            }, { skipAuth: true });

            setText("");
            fetchComments();
        } catch (err) {
            console.error("Exception posting comment:", err);
        } finally {
            setSubmitting(false);
        }
    };

    const formatTime = (iso: string) => {
        const d = new Date(iso);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 1) return "Just now";
        if (diffMin < 60) return `${diffMin}m ago`;
        const diffHr = Math.floor(diffMin / 60);
        if (diffHr < 24) return `${diffHr}h ago`;
        const diffDay = Math.floor(diffHr / 24);
        if (diffDay < 7) return `${diffDay}d ago`;
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    };

    return (
        <div className="w-full px-6 py-8">
            <div className="max-w-5xl mx-auto">
                <div className="relative bg-card border border-border/50 rounded-3xl p-6 md:p-8 shadow-sm">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <MessageCircle className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-foreground">Comments</h3>
                            <p className="text-sm text-muted-foreground">
                                {comments.length} {comments.length === 1 ? "comment" : "comments"}
                            </p>
                        </div>
                    </div>

                    {/* Comment Form */}
                    <div className="space-y-3 mb-8 p-4 bg-muted/30 rounded-2xl border border-border/30">
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                onFocus={handleInputFocus}
                                placeholder="Your name *"
                                className="bg-background h-10"
                            />
                            <Input
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onFocus={handleInputFocus}
                                placeholder="Email (optional)"
                                type="email"
                                className="bg-background h-10"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Input
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                onFocus={handleInputFocus}
                                placeholder="Write a comment..."
                                className="flex-1 bg-background"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSubmit();
                                    }
                                }}
                            />
                            <Button
                                onClick={handleSubmit}
                                disabled={!name.trim() || !text.trim() || submitting}
                                size="icon"
                                className="rounded-xl shrink-0"
                            >
                                {submitting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Comments List */}
                    {comments.length === 0 ? (
                        <div className="text-center py-8">
                            <MessageCircle className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                            <p className="text-muted-foreground text-sm">No comments yet. Be the first to share your thoughts!</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {comments.map((comment) => (
                                <div
                                    key={comment.id}
                                    className="group flex gap-3 p-4 rounded-xl hover:bg-muted/30 transition-colors"
                                >
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-sm font-semibold text-foreground shrink-0">
                                        {comment.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-baseline gap-2 mb-1">
                                            <span className="font-medium text-foreground text-sm">{comment.name}</span>
                                            <span className="text-xs text-muted-foreground">{formatTime(comment.timestamp)}</span>
                                        </div>
                                        <p className="text-sm text-foreground/80 leading-relaxed">{comment.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CommentSection;
