import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { randomUUID } from 'crypto';
import { ValidationEngine } from '../services/ValidationEngine';
import { buildCustomFieldsFromAnswers, mergeCustomFieldsWithAnswers } from './BlogController';

interface CreateProjectRequest {
    title: string;
    oneLineSummary: string;
    introduction?: string;
    description?: string;
}

interface UpdateProjectRequest extends CreateProjectRequest {
    status?: string;
}

export class ProjectController {

    private transformPublicProject(project: any, user?: any, blog?: any) {
        return {
            id: project.id,
            title: project.title,
            slug: project.slug,
            oneLineSummary: project.one_line_summary,
            one_line_summary: project.one_line_summary,
            introduction: project.introduction,
            description: project.description,
            status: project.status,
            industry: project.industry || null,
            startupStage: project.startup_stage || null,
            startup_stage: project.startup_stage || null,
            validationAnswers: project.validation_answers || null,
            validation_answers: project.validation_answers || null,
            validationReport: project.validation_report || null,
            validation_report: project.validation_report || null,
            onboardingCompleted: project.onboarding_completed || false,
            onboarding_completed: project.onboarding_completed || false,
            chatbotName: project.chatbot_name || null,
            chatbot_name: project.chatbot_name || null,
            welcomeMessage: project.welcome_message || null,
            welcome_message: project.welcome_message || null,
            primaryColor: project.primary_color || null,
            primary_color: project.primary_color || null,
            botAvatarUrl: project.bot_avatar_url || null,
            bot_avatar_url: project.bot_avatar_url || null,
            elevatorPitchUrl: project.elevator_pitch_url || null,
            elevator_pitch_url: project.elevator_pitch_url || null,
            elevatorPitchThumbnail: project.elevator_pitch_thumbnail || null,
            elevator_pitch_thumbnail: project.elevator_pitch_thumbnail || null,
            elevatorPitchDuration: project.elevator_pitch_duration ? Number(project.elevator_pitch_duration) : null,
            elevator_pitch_duration: project.elevator_pitch_duration ? Number(project.elevator_pitch_duration) : null,
            earlyAccessPrice: project.early_access_price ? Number(project.early_access_price) : null,
            early_access_price: project.early_access_price ? Number(project.early_access_price) : null,
            timerDeadline: project.timer_deadline || null,
            timer_deadline: project.timer_deadline || null,
            audienceViewCount: project.audience_view_count || 0,
            coverImageUrl: blog?.cover_image_url || null,
            ownerId: project.owner_id,
            owner_id: project.owner_id,
            authorName: user?.name || 'Founder',
            authorProfileImageUrl: user?.profile_image_url || null,
            createdAt: project.created_at,
            created_at: project.created_at,
            updatedAt: project.updated_at,
            updated_at: project.updated_at
        };
    }

    async getProjects(req: Request, res: Response) {
        try {
            console.log('[ProjectController] Getting projects for user:', req.user?.id);

            const { data: projects, error } = await supabase
                .from('projects')
                .select('*')
                .eq('owner_id', req.user?.id)
                .eq('deleted', false)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('[ProjectController] Database error:', error);
                return res.status(500).json({ error: 'Failed to fetch projects' });
            }

            console.log('[ProjectController] Retrieved projects:', projects?.length || 0);

            // Transform to frontend format with full field preservation
            const transformedProjects = (projects || []).map(project => this.transformPublicProject(project));

            res.json(transformedProjects);
        } catch (error) {
            console.error('[ProjectController] Error getting projects:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async createProject(req: Request, res: Response) {
        try {
            const body = req.body;
            const title = body.title;
            const oneLineSummary = body.oneLineSummary || body.one_line_summary;
            const introduction = body.introduction;
            const description = body.description;
            const industry = body.industry;
            const startupStage = body.startupStage || body.startup_stage;
            const validationAnswers = body.validationAnswers || body.validation_answers;
            const validationReport = body.validationReport || body.validation_report;

            console.log('[ProjectController] Creating project:', { title, oneLineSummary, industry, startupStage });

            if (!title || !oneLineSummary) {
                return res.status(400).json({ error: 'Title and summary are required' });
            }

            const projectData: any = {
                id: randomUUID(), // Generate UUID in backend
                owner_id: req.user?.id,
                title,
                one_line_summary: oneLineSummary,
                introduction: introduction || null,
                description: description || null,
                industry: industry || null,
                startup_stage: startupStage || null,
                validation_answers: validationAnswers ? (typeof validationAnswers === 'string' ? validationAnswers : JSON.stringify(validationAnswers)) : null,
                validation_report: validationReport ? (typeof validationReport === 'string' ? validationReport : JSON.stringify(validationReport)) : null,
                status: 'draft',
                slug: `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
                deleted: false,
                timer_deadline: new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { data: project, error } = await supabase
                .from('projects')
                .insert(projectData)
                .select()
                .single();

            if (error) {
                console.error('[ProjectController] Database error:', error);
                return res.status(500).json({ error: 'Failed to create project' });
            }

            console.log('[ProjectController] Created project:', project.id);
            res.status(201).json(this.transformPublicProject(project));
        } catch (error) {
            console.error('[ProjectController] Error creating project:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async getProject(req: Request, res: Response) {
        try {
            const { id } = req.params;
            console.log('[ProjectController] Getting project:', id);

            const { data: project, error } = await supabase
                .from('projects')
                .select('*')
                .eq('id', id)
                .eq('owner_id', req.user?.id)
                .eq('deleted', false)
                .single();

            if (error || !project) {
                console.error('[ProjectController] Database error or not found:', error);
                return res.status(404).json({ error: 'Project not found' });
            }

            res.json(this.transformPublicProject(project));
        } catch (error) {
            console.error('[ProjectController] Error getting project:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async updateProject(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const body = req.body;

            console.log('[ProjectController] Updating project:', id);

            const updateData: any = {
                updated_at: new Date().toISOString()
            };

            if (body.title !== undefined) updateData.title = body.title;
            if (body.oneLineSummary !== undefined || body.one_line_summary !== undefined) {
                updateData.one_line_summary = body.oneLineSummary || body.one_line_summary;
            }
            if (body.introduction !== undefined) updateData.introduction = body.introduction;
            if (body.description !== undefined) updateData.description = body.description;
            if (body.status !== undefined) updateData.status = body.status;
            if (body.industry !== undefined) updateData.industry = body.industry;
            if (body.startupStage !== undefined || body.startup_stage !== undefined) {
                updateData.startup_stage = body.startupStage || body.startup_stage;
            }
            if (body.validationAnswers !== undefined || body.validation_answers !== undefined) {
                const va = body.validationAnswers || body.validation_answers;
                updateData.validation_answers = typeof va === 'string' ? va : JSON.stringify(va);
            }
            if (body.validationReport !== undefined || body.validation_report !== undefined) {
                const vr = body.validationReport || body.validation_report;
                updateData.validation_report = typeof vr === 'string' ? vr : JSON.stringify(vr);
            }
            if (body.onboardingCompleted !== undefined || body.onboarding_completed !== undefined) {
                updateData.onboarding_completed = body.onboardingCompleted ?? body.onboarding_completed;
            }

            // Only generate a validation report if onboarding is actually completed and answers exist
            if (updateData.onboarding_completed === true && !updateData.validation_report) {
                const answersToUse = updateData.validation_answers;
                if (answersToUse) {
                    updateData.validation_report = ValidationEngine.generateReport(answersToUse);
                }
            }
            if (body.chatbotName !== undefined || body.chatbot_name !== undefined) {
                updateData.chatbot_name = body.chatbotName || body.chatbot_name;
            }
            if (body.welcomeMessage !== undefined || body.welcome_message !== undefined) {
                updateData.welcome_message = body.welcomeMessage || body.welcome_message;
            }
            if (body.primaryColor !== undefined || body.primary_color !== undefined) {
                updateData.primary_color = body.primaryColor || body.primary_color;
            }
            if (body.elevatorPitchUrl !== undefined || body.elevator_pitch_url !== undefined) {
                updateData.elevator_pitch_url = body.elevatorPitchUrl || body.elevator_pitch_url;
            }
            if (body.timerDeadline !== undefined || body.timer_deadline !== undefined) {
                updateData.timer_deadline = body.timerDeadline || body.timer_deadline;
            }

            const { data: project, error } = await supabase
                .from('projects')
                .update(updateData)
                .eq('id', id)
                .eq('owner_id', req.user?.id)
                .select()
                .single();

            if (error || !project) {
                console.error('[ProjectController] Database error:', error);
                return res.status(404).json({ error: 'Project not found or update failed' });
            }

            console.log('[ProjectController] Updated project:', project.id);

            // Auto-sync or create blog if validation answers were provided
            if (updateData.validation_answers) {
                try {
                    const parsedAnswers = typeof updateData.validation_answers === 'string'
                        ? JSON.parse(updateData.validation_answers)
                        : updateData.validation_answers;

                    const generatedFields = buildCustomFieldsFromAnswers(parsedAnswers, project);
                    if (generatedFields.length > 0) {
                        const { data: existingBlog } = await supabase
                            .from('blogs')
                            .select('id, heading, introduction, custom_fields')
                            .eq('project_id', project.id)
                            .maybeSingle();

                        let existingFields: any[] = [];
                        if (existingBlog?.custom_fields) {
                            try {
                                existingFields = typeof existingBlog.custom_fields === 'string'
                                    ? JSON.parse(existingBlog.custom_fields)
                                    : existingBlog.custom_fields;
                            } catch (e) {
                                existingFields = [];
                            }
                        }

                        const mergedFields = mergeCustomFieldsWithAnswers(existingFields, parsedAnswers, project);

                        if (!existingBlog) {
                            await supabase.from('blogs').insert({
                                id: randomUUID(),
                                project_id: project.id,
                                heading: project.title,
                                introduction: project.one_line_summary || project.introduction || '',
                                content: '',
                                custom_fields: JSON.stringify(mergedFields),
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString(),
                            });
                        } else {
                            await supabase.from('blogs').update({
                                heading: (existingBlog as any).heading || project.title,
                                introduction: (existingBlog as any).introduction || project.one_line_summary || project.introduction || '',
                                custom_fields: JSON.stringify(mergedFields),
                                updated_at: new Date().toISOString(),
                            }).eq('id', existingBlog.id);
                        }
                    }
                } catch (syncErr) {
                    console.error('[ProjectController] Error auto-syncing blog from validation answers:', syncErr);
                }
            }

            res.json(this.transformPublicProject(project));
        } catch (error) {
            console.error('[ProjectController] Error updating project:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async deleteProject(req: Request, res: Response) {
        try {
            const { id } = req.params;
            console.log('[ProjectController] Deleting project:', id);

            // Delete blog first to avoid FK constraint violation
            await supabase.from('blogs').delete().eq('project_id', id);

            const { error } = await supabase
                .from('projects')
                .update({ deleted: true, updated_at: new Date().toISOString() })
                .eq('id', id)
                .eq('owner_id', req.user?.id);

            if (error) {
                console.error('[ProjectController] Database error:', error);
                return res.status(404).json({ error: 'Project not found' });
            }

            console.log('[ProjectController] Deleted project:', id);
            res.status(204).send();
        } catch (error) {
            console.error('[ProjectController] Error deleting project:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Public project endpoints (no auth required)
     */
    async getPublicProjectById(req: Request, res: Response) {
        try {
            const { projectId } = req.params;

            const { data: project, error } = await supabase
                .from('projects')
                .select('*')
                .eq('id', projectId)
                .single();

            if (error || !project) {
                return res.status(404).json({ error: 'Project not found' });
            }

            const { data: user } = project.owner_id
                ? await supabase.from('users').select('*').eq('id', project.owner_id).single()
                : { data: null };

            const { data: blog } = await supabase
                .from('blogs')
                .select('*')
                .eq('project_id', project.id)
                .single();

            return res.json(this.transformPublicProject(project, user, blog));
        } catch (error) {
            console.error('[ProjectController] getPublicProjectById error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    async getPublicProject(req: Request, res: Response) {
        try {
            const { slug } = req.params;

            // Check if slug is a direct UUID
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

            let project = null;
            if (isUuid) {
                const { data } = await supabase.from('projects').select('*').eq('id', slug).single();
                project = data;
            }

            if (!project) {
                // Try slug match
                const { data } = await supabase.from('projects').select('*').eq('slug', slug).single();
                project = data;
            }

            if (!project) {
                // Try extracting UUID from end of slug (e.g. title-1234-uuid)
                const uuidMatch = slug.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
                if (uuidMatch) {
                    const { data } = await supabase.from('projects').select('*').eq('id', uuidMatch[1]).single();
                    project = data;
                }
            }

            if (!project) {
                return res.status(404).json({ error: 'Project not found' });
            }

            const { data: user } = project.owner_id
                ? await supabase.from('users').select('*').eq('id', project.owner_id).single()
                : { data: null };

            const { data: blog } = await supabase
                .from('blogs')
                .select('*')
                .eq('project_id', project.id)
                .single();

            return res.json(this.transformPublicProject(project, user, blog));
        } catch (error) {
            console.error('[ProjectController] getPublicProject error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    async getEarlyAccessPrice(req: Request, res: Response) {
        try {
            const { projectId } = req.params;
            const { data: project } = await supabase.from('projects').select('early_access_price, title').eq('id', projectId).single();
            if (!project) return res.status(404).json({ error: 'Project not found' });
            return res.json({
                earlyAccessPrice: project.early_access_price ? Number(project.early_access_price) : null,
                projectTitle: project.title
            });
        } catch (error) {
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    async getPublicComments(req: Request, res: Response) {
        try {
            const { projectId } = req.params;
            const { data: members, error } = await supabase
                .from('audience_members')
                .select('id, name, email, feedback_text, feedback_submitted_at, last_interaction_at, feedback_source')
                .eq('project_id', projectId)
                .not('feedback_text', 'is', null)
                .order('last_interaction_at', { ascending: false });

            if (error) {
                console.error('[ProjectController] Error fetching comments from audience_members:', error);
                return res.json([]);
            }

            const comments = (members || [])
                .filter(m => m.feedback_text && m.feedback_text.trim().length > 0)
                .map(m => ({
                    id: m.id,
                    name: m.name || 'Anonymous',
                    text: m.feedback_text,
                    timestamp: m.feedback_submitted_at || m.last_interaction_at || new Date().toISOString(),
                    email: m.email || '',
                    feedbackSource: m.feedback_source || 'Comment',
                }));

            return res.json(comments);
        } catch (error) {
            console.error('[ProjectController] getPublicComments error:', error);
            return res.json([]);
        }
    }

    async unlockProject(req: Request, res: Response) {
        try {
            const { id } = req.params;
            console.log('[ProjectController] Unlocking project:', id);

            const { data: project, error } = await supabase
                .from('projects')
                .select('*')
                .eq('id', id)
                .eq('owner_id', req.user?.id)
                .eq('deleted', false)
                .single();

            if (error || !project) {
                return res.status(404).json({ error: 'Project not found' });
            }

            if (project.status?.toUpperCase() === 'CLOSED') {
                return res.status(403).json({
                    error: 'Forbidden',
                    message: 'This project is permanently CLOSED and cannot be reopened.'
                });
            }

            // Grant a new 20-hour cycle upon unlock and restore status to DRAFT
            const newDeadline = new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString();
            const { data: updatedProject, error: updateError } = await supabase
                .from('projects')
                .update({
                    status: 'DRAFT',
                    timer_deadline: newDeadline,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select('*')
                .single();

            if (updateError || !updatedProject) {
                console.error('[ProjectController] Error unlocking project in DB:', updateError);
                return res.status(500).json({ error: 'Failed to unlock project' });
            }

            console.log('[ProjectController] Successfully unlocked project:', id);
            return res.json(this.transformPublicProject(updatedProject));
        } catch (error) {
            console.error('[ProjectController] unlockProject error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    async getTimerStatus(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { data: project, error } = await supabase
                .from('projects')
                .select('*')
                .eq('id', id)
                .eq('owner_id', req.user?.id)
                .eq('deleted', false)
                .single();

            if (error || !project) {
                return res.status(404).json({ error: 'Project not found' });
            }

            const now = new Date();
            let deadline = project.timer_deadline
                ? new Date(project.timer_deadline)
                : new Date(new Date(project.created_at || now).getTime() + 20 * 60 * 60 * 1000);

            // Fetch audience member validation counts
            const { data: members } = await supabase
                .from('audience_members')
                .select('id, name, email, feedback_text, last_interaction_at')
                .eq('project_id', id);

            let gold = 0;
            let silver = 0;
            let bronze = 0;
            (members || []).forEach((m: any) => {
                const hasEmail = Boolean(m.email && m.email.includes('@'));
                const hasFeedback = Boolean(m.feedback_text && m.feedback_text.trim().length > 10);
                if (hasEmail && hasFeedback) gold++;
                else if (hasEmail) silver++;
                else bronze++;
            });

            const meetsRequirements = gold >= 5 && silver >= 10 && bronze >= 15;
            const isExpired = now.getTime() > deadline.getTime();
            let currentStatus = project.status || 'DRAFT';

            // Auto-promote to Stage 3 if requirements met under Stage 2
            if (meetsRequirements && (currentStatus.toUpperCase() === 'DRAFT' || currentStatus.toUpperCase() === 'PUBLISHED')) {
                currentStatus = 'STAGE3_ACTIVE';
                const stage3Deadline = project.stage3_deadline || new Date(now.getTime() + 200 * 60 * 60 * 1000).toISOString();
                await supabase.from('projects').update({
                    status: 'STAGE3_ACTIVE',
                    stage3_deadline: stage3Deadline
                }).eq('id', id);
            }

            // Auto-lock project if timer expired and validation requirements not met
            if (isExpired && !meetsRequirements && currentStatus.toUpperCase() !== 'LOCKED' && currentStatus.toUpperCase() !== 'STAGE3_ACTIVE' && currentStatus.toUpperCase() !== 'CLOSED') {
                currentStatus = 'LOCKED';
                await supabase.from('projects').update({ status: 'LOCKED' }).eq('id', id);
            }

            const isStage3Active = currentStatus.toUpperCase() === 'STAGE3_ACTIVE';
            const isClosed = currentStatus.toUpperCase() === 'CLOSED';
            const secondsRemaining = Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / 1000));
            let stage3SecondsRemaining = 0;
            if (project.stage3_deadline) {
                stage3SecondsRemaining = Math.max(0, Math.floor((new Date(project.stage3_deadline).getTime() - now.getTime()) / 1000));
            }

            return res.json({
                projectId: project.id,
                status: currentStatus,
                createdAt: project.created_at,
                timerDeadline: deadline.toISOString(),
                secondsRemaining,
                isExpired,
                isLocked: currentStatus.toUpperCase() === 'LOCKED',
                meetsRequirements,
                goldCount: gold,
                goldRequired: 5,
                silverCount: silver,
                silverRequired: 10,
                bronzeCount: bronze,
                bronzeRequired: 15,
                stage3SecondsRemaining,
                isStage3Active,
                isClosed
            });
        } catch (error) {
            console.error('[ProjectController] getTimerStatus error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
}