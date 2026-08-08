import { useState, useCallback } from "react";
import { toast } from "sonner";
import apiClient from "@/lib/api";

// ===== Types =====

export interface AudienceMemberSummary {
    id: string;
    name: string;
    email: string;
    occupation: string | null;
    personaType: string | null;
    confidenceScore: number | null;
    engagementScore: number | null;
    feedbackSummary: string | null;
    firstInteractionAt: string | null;
    lastInteractionAt: string | null;
}

export interface AudienceQuestionDTO {
    id: string;
    questionText: string;
    chatbotAnswer: string | null;
    customAdminAnswer: string | null;
    status: "answered" | "unanswered";
    askedAt: string | null;
    answeredAt: string | null;
    respondedAt: string | null;
}

export interface AudienceMemberDetail {
    id: string;
    name: string;
    email: string;
    occupation: string | null;
    personaType: string | null;
    confidenceScore: number | null;
    engagementScore: number | null;
    feedbackText: string | null;
    feedbackSource: string | null;
    feedbackSubmittedAt: string | null;
    firstInteractionAt: string | null;
    lastInteractionAt: string | null;
    questions: AudienceQuestionDTO[];
}

interface AudienceMemberListResponse {
    members: AudienceMemberSummary[];
    count: number;
}

interface AnswerQuestionResponse {
    questionId: string;
    status: string;
    respondedAt: string;
}

// ===== Hook =====

export const useResponsePage = (projectId: string | undefined) => {
    const [members, setMembers] = useState<AudienceMemberSummary[]>([]);
    const [selectedMember, setSelectedMember] = useState<AudienceMemberDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);
    const [answeringId, setAnsweringId] = useState<string | null>(null);

    /**
     * Fetch all audience members for the project.
     */
    const fetchMembers = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        try {
            const data = await apiClient.get<AudienceMemberListResponse>(
                `/api/projects/${projectId}/audience`
            );
            setMembers(data.members);
        } catch (err) {
            console.error("[ResponsePage] Error fetching audience members:", err);
            // Don't show error toast — may not have audience data yet
            setMembers([]);
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    /**
     * Fetch detailed profile for a specific audience member.
     */
    const fetchMemberDetail = useCallback(async (memberId: string) => {
        setDetailLoading(true);
        setDetailLoadingId(memberId);
        try {
            const data = await apiClient.get<AudienceMemberDetail>(
                `/api/audience/${memberId}`
            );
            setSelectedMember(data);
        } catch (err) {
            console.error("[ResponsePage] Error fetching member detail:", err);
            toast.error("Failed to load audience profile");
        } finally {
            setDetailLoading(false);
            setDetailLoadingId(null);
        }
    }, []);

    /**
     * Answer a question (Reply & Notify flow).
     */
    const answerQuestion = useCallback(async (questionId: string, answer: string) => {
        setAnsweringId(questionId);
        try {
            const res = await apiClient.put<AnswerQuestionResponse>(
                `/api/audience/questions/${questionId}/answer`,
                { answer }
            );

            // Update local state
            setSelectedMember((prev) => {
                if (!prev) return null;
                const updatedQuestions = prev.questions.map((q) =>
                    q.id === questionId
                        ? {
                            ...q,
                            customAdminAnswer: answer,
                            status: "answered",
                            respondedAt: res.respondedAt,
                            answeredAt: q.answeredAt || res.respondedAt,
                        }
                        : q
                );
                return { ...prev, questions: updatedQuestions };
            });

            // Refresh member list in background
            fetchMembers();
            toast.success("Answer sent to audience member!");
            return true;
        } catch (err) {
            console.error("[ResponsePage] Error answering question:", err);
            toast.error("Failed to send answer");
            return false;
        } finally {
            setAnsweringId(null);
        }
    }, [fetchMembers]);

    /**
     * Close the detail modal.
     */
    const closeDetail = useCallback(() => {
        setSelectedMember(null);
    }, []);

    return {
        members,
        selectedMember,
        loading,
        detailLoading,
        detailLoadingId,
        answeringId,
        fetchMembers,
        fetchMemberDetail,
        answerQuestion,
        closeDetail,
    };
};
