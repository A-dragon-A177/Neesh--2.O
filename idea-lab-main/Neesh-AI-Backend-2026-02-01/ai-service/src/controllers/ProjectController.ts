import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { randomUUID } from 'crypto';

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
                .order('created_at', { ascending: false });

            if (error) {
                console.error('[ProjectController] Database error:', error);
                return res.status(500).json({ error: 'Failed to fetch projects' });
            }

            console.log('[ProjectController] Retrieved projects:', projects?.length || 0);

            // Transform to frontend format
            const transformedProjects = (projects || []).map(project => ({
                id: project.id,
                title: project.title,
                slug: project.slug,
                oneLineSummary: project.one_line_summary,
                introduction: project.introduction,
                description: project.description,
                status: project.status,
                createdAt: project.created_at,
                updatedAt: project.updated_at
            }));

            res.json(transformedProjects);
        } catch (error) {
            console.error('[ProjectController] Error getting projects:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async createProject(req: Request, res: Response) {
        try {
            const { title, oneLineSummary, introduction, description }: CreateProjectRequest = req.body;

            console.log('[ProjectController] Creating project:', { title, oneLineSummary });

            if (!title || !oneLineSummary) {
                return res.status(400).json({ error: 'Title and summary are required' });
            }

            const projectData = {
                id: randomUUID(), // Generate UUID in backend
                owner_id: req.user?.id,
                title,
                one_line_summary: oneLineSummary,
                introduction: introduction || null,
                description: description || null,
                status: 'draft',
                slug: `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
                deleted: false,
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

            const transformedProject = {
                id: project.id,
                title: project.title,
                slug: project.slug,
                oneLineSummary: project.one_line_summary,
                introduction: project.introduction,
                description: project.description,
                status: project.status,
                createdAt: project.created_at,
                updatedAt: project.updated_at
            };

            res.status(201).json(transformedProject);
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
                .single();

            if (error || !project) {
                console.error('[ProjectController] Database error or not found:', error);
                return res.status(404).json({ error: 'Project not found' });
            }

            const transformedProject = {
                id: project.id,
                title: project.title,
                slug: project.slug,
                oneLineSummary: project.one_line_summary,
                introduction: project.introduction,
                description: project.description,
                status: project.status,
                createdAt: project.created_at,
                updatedAt: project.updated_at
            };

            res.json(transformedProject);
        } catch (error) {
            console.error('[ProjectController] Error getting project:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async updateProject(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { title, oneLineSummary, introduction, description, status }: UpdateProjectRequest = req.body;

            console.log('[ProjectController] Updating project:', id);

            const updateData: any = {
                updated_at: new Date().toISOString()
            };

            if (title !== undefined) updateData.title = title;
            if (oneLineSummary !== undefined) updateData.one_line_summary = oneLineSummary;
            if (introduction !== undefined) updateData.introduction = introduction;
            if (description !== undefined) updateData.description = description;
            if (status !== undefined) updateData.status = status;

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

            const transformedProject = {
                id: project.id,
                title: project.title,
                slug: project.slug,
                oneLineSummary: project.one_line_summary,
                introduction: project.introduction,
                description: project.description,
                status: project.status,
                createdAt: project.created_at,
                updatedAt: project.updated_at
            };

            res.json(transformedProject);
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
                .delete()
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
            const { data: comments, error } = await supabase
                .from('audience_feedback')
                .select('*')
                .eq('project_id', projectId)
                .order('created_at', { ascending: false });

            if (error) return res.json([]);
            return res.json(comments || []);
        } catch (error) {
            return res.json([]);
        }
    }
}