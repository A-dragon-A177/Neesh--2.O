import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { randomUUID } from 'crypto';

function computeValidationTier(m: any): 'GOLD' | 'SILVER' | 'BRONZE' {
    const priority = m.interest_tag_priority ? Number(m.interest_tag_priority) : null;
    const engagement = m.engagement_score ? Number(m.engagement_score) : 0;
    const hasFeedback = Boolean(m.feedback_text && m.feedback_text.trim().length > 0);
    const hasExplicitIntent = Boolean(m.interested_at || m.has_explicit_intent);
    const hasOccupation = Boolean(m.occupation && m.occupation.trim().length > 0);
    const qCount = m.question_count ? Number(m.question_count) : 0;

    const isHighPriority = priority !== null && priority <= 2; // Priority 1 (Pilot Users) or 2 (Investment)
    const isMediumPriority = priority !== null && priority <= 3; // Priority 3 (Crowdfunding)

    // ===== 1. GOLD TIER (Hardest — No score-only shortcut) =====
    // Path A: High-priority tag (1 or 2) + explicit intent + written feedback + 3+ chatbot questions
    if (isHighPriority && hasExplicitIntent && hasFeedback && qCount >= 3) {
        return 'GOLD';
    }
    // Path B: Any priority + explicit intent + written feedback + 3+ chatbot questions + occupation
    if (hasExplicitIntent && hasFeedback && qCount >= 3 && hasOccupation) {
        return 'GOLD';
    }

    // ===== 2. SILVER TIER (Requires explicit intent in all paths) =====
    // Path A: High priority (1 or 2) + explicit intent + (written feedback OR 2+ chatbot questions)
    if (isHighPriority && hasExplicitIntent && (hasFeedback || qCount >= 2)) {
        return 'SILVER';
    }
    // Path B: Medium priority (1, 2, or 3) + explicit intent + written feedback + 1+ chatbot questions
    if (isMediumPriority && hasExplicitIntent && hasFeedback && qCount >= 1) {
        return 'SILVER';
    }
    // Path C: Engagement score >= 65 (requires 4+ distinct signals)
    if (engagement >= 65) {
        return 'SILVER';
    }

    // ===== 3. BRONZE TIER (Easy catch-all) =====
    return 'BRONZE';
}

export class AudienceController {

    async getAudience(req: Request, res: Response) {
        try {
            const { projectId } = req.params;

            const { data: members, error } = await supabase
                .from('audience_members')
                .select('*')
                .eq('project_id', projectId)
                .order('last_interaction_at', { ascending: false });

            if (error) throw error;

            const result = (members || []).map(m => ({
                id: m.id,
                name: m.name,
                email: m.email,
                occupation: m.occupation || null,
                personaType: m.persona_type || null,
                confidenceScore: m.confidence_score || null,
                engagementScore: m.engagement_score || null,
                feedbackSummary: m.feedback_text ? m.feedback_text.substring(0, 100) : null,
                firstInteractionAt: m.first_interaction_at,
                lastInteractionAt: m.last_interaction_at,
                questionCount: 0,
            }));

            res.json({ members: result, count: result.length });
        } catch (error) {
            console.error('[AudienceController] getAudience error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async submitPublicFeedback(req: Request, res: Response) {
        try {
            const { projectId } = req.params;
            const { name, email, occupation, feedbackText } = req.body;
            const rawText = (feedbackText || req.body.text || req.body.comment || req.body.feedback || '').trim();
            const rawSource = req.body.feedbackSource || req.body.source || 'Comment';

            console.log('[AudienceController] submitPublicFeedback:', {
                projectId,
                name,
                email: email ? email.substring(0, 5) + '...' : 'none',
                feedbackSource: rawSource,
            });

            const resolvedEmail = email || `anon-${Date.now()}@unknown.com`;
            const resolvedName = name || 'Anonymous';
            const now = new Date().toISOString();

            const { data: existing, error: findError } = await supabase
                .from('audience_members')
                .select('*')
                .eq('project_id', projectId)
                .eq('email', resolvedEmail)
                .maybeSingle();

            if (findError) {
                console.error('[AudienceController] Error finding existing member:', findError);
            }

            if (existing) {
                let updatedFeedbackText = rawText || null;
                if (rawSource === 'Form') {
                    // When submitting form feedback, replace with latest user answers
                    updatedFeedbackText = rawText || existing.feedback_text || null;
                } else if (existing.feedback_text && rawText) {
                    if (!existing.feedback_text.includes(rawText)) {
                        updatedFeedbackText = `${existing.feedback_text}\n${rawText}`;
                    } else {
                        updatedFeedbackText = existing.feedback_text;
                    }
                } else if (existing.feedback_text) {
                    updatedFeedbackText = existing.feedback_text;
                }

                const currentScore = existing.engagement_score ? Number(existing.engagement_score) : 20;
                const newScore = Math.min(currentScore + 20, 100);

                const { error: updateError } = await supabase
                    .from('audience_members')
                    .update({
                        name: resolvedName !== 'Anonymous' ? resolvedName : (existing.name || resolvedName),
                        occupation: occupation || existing.occupation || null,
                        feedback_text: updatedFeedbackText,
                        feedback_source: rawSource,
                        feedback_submitted_at: now,
                        last_interaction_at: now,
                        engagement_score: newScore,
                    })
                    .eq('id', existing.id);
                if (updateError) {
                    console.error('[AudienceController] Error updating member:', updateError);
                }
            } else {
                const { error: insertError } = await supabase
                    .from('audience_members')
                    .insert({
                        id: randomUUID(),
                        project_id: projectId,
                        name: resolvedName,
                        email: resolvedEmail,
                        occupation: occupation || null,
                        feedback_text: rawText || null,
                        feedback_source: rawSource,
                        feedback_submitted_at: now,
                        first_interaction_at: now,
                        last_interaction_at: now,
                        engagement_score: 30,
                        confidence_score: 0.6,
                    });
                if (insertError) {
                    console.error('[AudienceController] Error inserting member:', insertError);
                } else {
                    console.log('[AudienceController] New audience member created for project', projectId);
                }
            }

            res.json({ success: true, alreadySubmitted: Boolean(existing?.feedback_submitted_at || existing?.feedback_text) });
        } catch (error) {
            console.error('[AudienceController] submitPublicFeedback error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * POST /api/public/projects/:projectId/interest
     * Record audience interest selection from Spotlight "Interested" / "Neesh It" button.
     */
    async recordInterest(req: Request, res: Response) {
        try {
            const { projectId } = req.params;
            const { name, email, tagId, tagLabel, tagPriority, otherText } = req.body;

            console.log('[AudienceController] recordInterest:', { projectId, email, tagLabel, tagPriority });

            if (!email || !email.trim()) {
                return res.status(400).json({ error: 'Email is required' });
            }

            const resolvedEmail = email.trim().toLowerCase();
            const resolvedName = name?.trim() || resolvedEmail.split('@')[0] || 'Supporter';
            const now = new Date().toISOString();

            // Find existing member for this project & email
            const { data: existing, error: findErr } = await supabase
                .from('audience_members')
                .select('*')
                .eq('project_id', projectId)
                .eq('email', resolvedEmail)
                .maybeSingle();

            if (findErr) {
                console.error('[AudienceController] Error checking existing member:', findErr);
            }

            const alreadySubmitted = Boolean(existing?.interested_at);
            let memberId = existing?.id;
            const isPilot = (tagPriority === 1) || (tagLabel && String(tagLabel).toLowerCase().includes('pilot'));

            const updatePayload: any = {
                name: resolvedName,
                has_explicit_intent: true,
                explicit_intent_at: existing?.explicit_intent_at || now,
                interest_tag_id: tagId || 'other',
                interest_tag_label: tagLabel || 'Other',
                interest_tag_priority: tagPriority !== undefined ? Number(tagPriority) : 99,
                interest_other_text: otherText ? String(otherText).trim() : null,
                interested_at: now,
                last_interaction_at: now,
                engagement_score: Math.max(existing?.engagement_score || 0, tagPriority === 1 ? 75 : 50),
                confidence_score: Math.max(existing?.confidence_score || 0, 0.7),
                ...(isPilot ? { in_pilot_cohort: true, pilot_enrolled_at: existing?.pilot_enrolled_at || now } : {})
            };

            if (existing) {
                const { error: updateErr } = await supabase
                    .from('audience_members')
                    .update(updatePayload)
                    .eq('id', existing.id);

                if (updateErr) {
                    console.error('[AudienceController] Error updating interest:', updateErr);
                    return res.status(500).json({ error: 'Failed to update interest' });
                }
            } else {
                memberId = randomUUID();
                const insertPayload = {
                    id: memberId,
                    project_id: projectId,
                    email: resolvedEmail,
                    first_interaction_at: now,
                    ...updatePayload
                };

                const { error: insertErr } = await supabase
                    .from('audience_members')
                    .insert(insertPayload);

                if (insertErr) {
                    console.error('[AudienceController] Error inserting interest:', insertErr);
                    return res.status(500).json({ error: 'Failed to record interest' });
                }
            }

            const tier = computeValidationTier({
                ...existing,
                ...updatePayload
            });

            console.log(`[AudienceController] Interest recorded successfully: project=${projectId}, email=${resolvedEmail}, tier=${tier}, alreadySubmitted=${alreadySubmitted}`);

            return res.json({
                memberId,
                validationTier: tier,
                message: alreadySubmitted ? 'Interest updated successfully!' : 'Interest recorded successfully!',
                alreadySubmitted
            });

        } catch (error) {
            console.error('[AudienceController] recordInterest error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * GET /api/public/projects/:projectId/interest-count
     */
    async getInterestCount(req: Request, res: Response) {
        try {
            const { projectId } = req.params;

            const { count, error } = await supabase
                .from('audience_members')
                .select('*', { count: 'exact', head: true })
                .eq('project_id', projectId)
                .not('interested_at', 'is', null);

            if (error) {
                console.error('[AudienceController] Error getting interest count:', error);
                return res.json({ count: 0 });
            }

            return res.json({ count: count || 0 });
        } catch (error) {
            console.error('[AudienceController] getInterestCount error:', error);
            return res.json({ count: 0 });
        }
    }

    /**
     * GET /api/public/projects/:projectId/check-interest?email=...
     */
    async checkUserInterest(req: Request, res: Response) {
        try {
            const { projectId } = req.params;
            const email = (req.query.email as string)?.trim()?.toLowerCase();

            if (!email) {
                return res.json({
                    alreadySubmitted: false,
                    interested: false,
                    tagLabel: null,
                    interestTagLabel: null,
                    hasSubmittedFeedback: false,
                    hasFeedback: false
                });
            }

            const { data: member, error } = await supabase
                .from('audience_members')
                .select('*')
                .eq('project_id', projectId)
                .eq('email', email)
                .maybeSingle();

            if (error) {
                console.error('[AudienceController] Error checking user interest:', error);
                return res.json({
                    alreadySubmitted: false,
                    interested: false,
                    tagLabel: null,
                    interestTagLabel: null,
                    hasSubmittedFeedback: false,
                    hasFeedback: false
                });
            }

            if (!member) {
                return res.json({
                    alreadySubmitted: false,
                    interested: false,
                    tagLabel: null,
                    interestTagLabel: null,
                    hasSubmittedFeedback: false,
                    hasFeedback: false
                });
            }

            const hasInterest = Boolean(member.interested_at || member.interest_tag_label || member.has_explicit_intent);
            const hasFb = Boolean(member.feedback_text || member.feedback_submitted_at);

            return res.json({
                alreadySubmitted: hasInterest,
                interested: hasInterest,
                tagId: member.interest_tag_id || null,
                interestTagId: member.interest_tag_id || null,
                tagLabel: member.interest_tag_label || null,
                interestTagLabel: member.interest_tag_label || null,
                tagPriority: member.interest_tag_priority ?? null,
                otherText: member.interest_other_text || null,
                interestOtherText: member.interest_other_text || null,
                hasSubmittedFeedback: hasFb,
                hasFeedback: hasFb,
                feedbackText: member.feedback_text || null,
                feedbackSubmittedAt: member.feedback_submitted_at || null,
                occupation: member.occupation || null,
                name: member.name || null,
                inPilotCohort: Boolean(member.in_pilot_cohort)
            });
        } catch (error) {
            console.error('[AudienceController] checkUserInterest error:', error);
            return res.json({
                alreadySubmitted: false,
                interested: false,
                tagLabel: null,
                interestTagLabel: null,
                hasSubmittedFeedback: false,
                hasFeedback: false
            });
        }
    }

    /**
     * GET /api/projects/:projectId/validated-buyers
     */
    async getValidatedBuyers(req: Request, res: Response) {
        try {
            const { projectId } = req.params;

            const { data: members, error } = await supabase
                .from('audience_members')
                .select('*')
                .eq('project_id', projectId)
                .order('last_interaction_at', { ascending: false });

            if (error) {
                console.error('[AudienceController] Error fetching validated buyers:', error);
                return res.status(500).json({ error: 'Failed to fetch buyers' });
            }

            // Fetch question counts per member for tier computation
            const { data: questionRows } = await supabase
                .from('audience_questions')
                .select('member_id')
                .eq('project_id', projectId);
            
            const questionCountMap: Record<string, number> = {};
            (questionRows || []).forEach((q: any) => {
                if (q.member_id) {
                    questionCountMap[q.member_id] = (questionCountMap[q.member_id] || 0) + 1;
                }
            });

            const buyers = (members || [])
                .filter(m => Boolean(m.interested_at || m.has_explicit_intent || m.feedback_text))
                .map(m => {
                    // Inject question_count for tier computation
                    const enrichedMember = { ...m, question_count: questionCountMap[m.id] || 0 };
                    const tier = computeValidationTier(enrichedMember);
                    return {
                        id: m.id,
                        name: m.name || 'Anonymous Supporter',
                        email: m.email,
                        occupation: m.occupation || null,
                        validationTier: tier,
                        engagementScore: m.engagement_score || 30,
                        hasExplicitIntent: Boolean(m.has_explicit_intent || m.interested_at),
                        interestTagLabel: m.interest_tag_label || null,
                        interestTagPriority: m.interest_tag_priority || null,
                        interestOtherText: m.interest_other_text || null,
                        lastInteractionAt: m.last_interaction_at || m.interested_at || null,
                        inPilotCohort: Boolean(m.in_pilot_cohort),
                        pilotEnrolledAt: m.pilot_enrolled_at || null,
                    };
                });

            const goldCount = buyers.filter(b => b.validationTier === 'GOLD').length;
            const silverCount = buyers.filter(b => b.validationTier === 'SILVER').length;
            const bronzeCount = buyers.filter(b => b.validationTier === 'BRONZE').length;

            return res.json({
                buyers,
                goldCount,
                silverCount,
                bronzeCount,
                totalValidated: buyers.length,
                total: buyers.length,
                summary: { gold: goldCount, silver: silverCount, bronze: bronzeCount }
            });
        } catch (error) {
            console.error('[AudienceController] getValidatedBuyers error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * GET /api/audience/:memberId
     * Get detailed audience member profile with questions and feedback
     */
    async getMemberDetail(req: Request, res: Response) {
        try {
            const { memberId } = req.params;

            const { data: member, error: memberErr } = await supabase
                .from('audience_members')
                .select('*')
                .eq('id', memberId)
                .single();

            if (memberErr || !member) {
                return res.status(404).json({ error: 'Audience member not found' });
            }

            // Fetch questions asked by this member
            const { data: questions } = await supabase
                .from('audience_questions')
                .select('*')
                .eq('audience_member_id', memberId)
                .order('asked_at', { ascending: false });

            const formattedQuestions = (questions || []).map(q => ({
                id: q.id,
                questionText: q.question_text,
                chatbotAnswer: q.chatbot_answer,
                customAdminAnswer: q.custom_admin_answer,
                status: q.status || (q.custom_admin_answer ? 'answered' : 'unanswered'),
                askedAt: q.asked_at,
                answeredAt: q.answered_at,
                respondedAt: q.responded_at
            }));

            return res.json({
                id: member.id,
                name: member.name,
                email: member.email,
                occupation: member.occupation || null,
                personaType: member.persona_type || null,
                confidenceScore: member.confidence_score || null,
                engagementScore: member.engagement_score || null,
                feedbackText: member.feedback_text || null,
                feedbackSource: member.feedback_source || null,
                feedbackSubmittedAt: member.feedback_submitted_at || null,
                firstInteractionAt: member.first_interaction_at,
                lastInteractionAt: member.last_interaction_at,
                questions: formattedQuestions
            });
        } catch (error) {
            console.error('[AudienceController] getMemberDetail error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * PUT /api/audience/questions/:questionId/answer
     * Answer a question (Reply & Notify flow)
     */
    async answerQuestion(req: Request, res: Response) {
        try {
            const { questionId } = req.params;
            const { answer } = req.body;

            if (!answer || typeof answer !== 'string' || !answer.trim()) {
                return res.status(400).json({ error: 'Answer cannot be empty' });
            }

            const now = new Date().toISOString();

            const { data: question, error: qErr } = await supabase
                .from('audience_questions')
                .update({
                    custom_admin_answer: answer.trim(),
                    status: 'answered',
                    responded_at: now,
                    answered_at: now
                })
                .eq('id', questionId)
                .select()
                .single();

            if (qErr || !question) {
                return res.status(404).json({ error: 'Question not found' });
            }

            return res.json({
                questionId,
                status: 'answered',
                respondedAt: now
            });
        } catch (error) {
            console.error('[AudienceController] answerQuestion error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * GET /api/projects/:projectId/spotlight-analytics
     */
    async getSpotlightAnalytics(req: Request, res: Response) {
        try {
            const { projectId } = req.params;

            const { data: members } = await supabase
                .from('audience_members')
                .select('id, interested_at, feedback_text')
                .eq('project_id', projectId);

            const interestClicks = (members || []).filter(m => Boolean(m.interested_at)).length;
            const feedbackSubmissions = (members || []).filter(m => Boolean(m.feedback_text && m.feedback_text.trim())).length;

            const memberIds = (members || []).map(m => m.id);
            let chatbotInteractions = 0;
            if (memberIds.length > 0) {
                const { count } = await supabase
                    .from('audience_questions')
                    .select('*', { count: 'exact', head: true })
                    .in('audience_member_id', memberIds);
                chatbotInteractions = count || 0;
            }

            const spotlightOpens = (members || []).length;
            const pitchViews = Math.max(spotlightOpens, interestClicks + feedbackSubmissions);

            return res.json({
                pitchViews,
                spotlightOpens,
                chatbotInteractions,
                interestClicks,
                feedbackSubmissions,
                totalViews: spotlightOpens,
                uniqueViews: spotlightOpens,
                interestedClicks: interestClicks,
                conversionRate: spotlightOpens > 0 ? Math.round((interestClicks / spotlightOpens) * 100) : 0,
                history: []
            });
        } catch (error) {
            console.error('[AudienceController] getSpotlightAnalytics error:', error);
            return res.json({
                pitchViews: 0,
                spotlightOpens: 0,
                chatbotInteractions: 0,
                interestClicks: 0,
                feedbackSubmissions: 0,
                totalViews: 0,
                uniqueViews: 0,
                interestedClicks: 0,
                conversionRate: 0,
                history: []
            });
        }
    }
}

