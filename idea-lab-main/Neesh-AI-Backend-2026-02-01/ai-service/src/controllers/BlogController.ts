import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { randomUUID } from 'crypto';

export function buildCustomFieldsFromAnswers(answers: Record<string, any>, project?: any): any[] {
    const fields: any[] = [];
    let order = 1;

    const sectionMappings: Array<{
        keys: string[];
        title: string;
        type?: string;
    }> = [
        { keys: ['problem_story', 'problem', 'the_problem', 'problemDescription'], title: 'The Problem' },
        { keys: ['our_solution', 'solution', 'what_building', 'solutionDescription'], title: "What We're Building" },
        { keys: ['target_customer', 'target_audience', 'idealCustomer', 'who_its_for'], title: "Who It's For" },
        { keys: ['the_hook', 'hook', 'keyInsight', 'surprisingInsight'], title: 'The Hook' },
        { keys: ['founder_story', 'founderStory', 'motivation', 'the_founders_story'], title: "The Founder's Story" },
        { keys: ['vision', 'longTermVision', 'our_vision'], title: 'Our Vision' },
        { keys: ['call_to_action', 'cta', 'get_involved', 'nextSteps'], title: 'Get Involved' },
    ];

    if (answers && typeof answers === 'object') {
        for (const mapping of sectionMappings) {
            let value = '';
            for (const key of mapping.keys) {
                if (answers[key] && typeof answers[key] === 'string' && answers[key].trim()) {
                    value = answers[key].trim();
                    break;
                }
            }
            if (value) {
                fields.push({
                    id: randomUUID(),
                    type: mapping.type || 'spotlight_section',
                    sectionTitle: mapping.title,
                    value: value,
                    order: order++
                });
            }
        }
    }

    // Fallback to project description if no sections matched
    if (fields.length === 0 && project?.description && project.description.trim()) {
        fields.push({
            id: randomUUID(),
            type: 'spotlight_section',
            sectionTitle: "What We're Building",
            value: project.description.trim(),
            order: order++
        });
    }

    return fields;
}

export class BlogController {

    private transformBlog(blog: any) {
        let customFields: any[] = [];
        if (blog.custom_fields) {
            try {
                customFields = typeof blog.custom_fields === 'string' ? JSON.parse(blog.custom_fields) : blog.custom_fields;
            } catch (e) {
                customFields = [];
            }
        }

        let interestTags: any[] = [];
        if (blog.interest_tags) {
            try {
                interestTags = typeof blog.interest_tags === 'string' ? JSON.parse(blog.interest_tags) : blog.interest_tags;
            } catch (e) {
                interestTags = [];
            }
        }

        return {
            heading: blog.heading || '',
            coverImageUrl: blog.cover_image_url || '',
            introduction: blog.introduction || '',
            content: blog.content || '',
            customFields: Array.isArray(customFields) ? customFields : [],
            interestTags: Array.isArray(interestTags) ? interestTags : [],
            chatbotName: blog.chatbot_name || null,
            welcomeMessage: blog.welcome_message || null,
            primaryColor: blog.primary_color || null,
            botAvatarUrl: blog.bot_avatar_url || null,
        };
    }

    async getBlog(req: Request, res: Response) {
        try {
            const { projectId } = req.params;

            const { data: project, error: projError } = await supabase
                .from('projects')
                .select('*')
                .eq('id', projectId)
                .eq('owner_id', req.user?.id)
                .single();

            if (projError || !project) {
                return res.status(404).json({ error: 'Project not found' });
            }

            const { data: blog, error } = await supabase
                .from('blogs')
                .select('*')
                .eq('project_id', projectId)
                .maybeSingle();

            let finalBlog = blog;

            // Auto-populate from validation answers if blog doesn't exist or has empty custom_fields
            let currentFields: any[] = [];
            if (blog?.custom_fields) {
                try {
                    currentFields = typeof blog.custom_fields === 'string' ? JSON.parse(blog.custom_fields) : blog.custom_fields;
                } catch (e) {
                    currentFields = [];
                }
            }

            if (!blog || !Array.isArray(currentFields) || currentFields.length === 0) {
                let parsedAnswers: Record<string, any> = {};
                if (project.validation_answers) {
                    try {
                        parsedAnswers = typeof project.validation_answers === 'string'
                            ? JSON.parse(project.validation_answers)
                            : project.validation_answers;
                    } catch (e) {
                        parsedAnswers = {};
                    }
                }

                const generatedFields = buildCustomFieldsFromAnswers(parsedAnswers, project);
                const blogData = {
                    project_id: projectId,
                    heading: blog?.heading || project.title || '',
                    cover_image_url: blog?.cover_image_url || '',
                    introduction: blog?.introduction || project.one_line_summary || project.introduction || '',
                    content: blog?.content || '',
                    custom_fields: JSON.stringify(generatedFields),
                    updated_at: new Date().toISOString(),
                };

                if (blog) {
                    const { data: updated } = await supabase
                        .from('blogs')
                        .update(blogData)
                        .eq('project_id', projectId)
                        .select()
                        .single();
                    finalBlog = updated || blog;
                } else {
                    const { data: created } = await supabase
                        .from('blogs')
                        .insert({ ...blogData, id: randomUUID(), created_at: new Date().toISOString() })
                        .select()
                        .single();
                    finalBlog = created || blogData;
                }
            }

            res.json(this.transformBlog(finalBlog));
        } catch (error) {
            console.error('[BlogController] getBlog error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async upsertBlog(req: Request, res: Response) {
        try {
            const { projectId } = req.params;
            const { heading, coverImageUrl, introduction, content, customFields, interestTags, interest_tags } = req.body;

            const { data: project, error: projError } = await supabase
                .from('projects')
                .select('id')
                .eq('id', projectId)
                .eq('owner_id', req.user?.id)
                .single();

            if (projError || !project) {
                return res.status(404).json({ error: 'Project not found' });
            }

            const rawInterestTags = interestTags || interest_tags;
            const blogData: any = {
                project_id: projectId,
                heading: heading || '',
                cover_image_url: coverImageUrl || '',
                introduction: introduction || '',
                content: content || '',
                custom_fields: JSON.stringify(customFields || []),
                updated_at: new Date().toISOString(),
            };

            if (rawInterestTags !== undefined) {
                blogData.interest_tags = typeof rawInterestTags === 'string' ? rawInterestTags : JSON.stringify(rawInterestTags);
            }

            const { data: existing } = await supabase
                .from('blogs')
                .select('id')
                .eq('project_id', projectId)
                .maybeSingle();

            let blog;
            if (existing) {
                const { data, error } = await supabase
                    .from('blogs')
                    .update(blogData)
                    .eq('project_id', projectId)
                    .select()
                    .single();
                if (error) throw error;
                blog = data;
            } else {
                const { data, error } = await supabase
                    .from('blogs')
                    .insert({ ...blogData, id: randomUUID(), created_at: new Date().toISOString() })
                    .select()
                    .single();
                if (error) throw error;
                blog = data;
            }

            res.json(this.transformBlog(blog));
        } catch (error) {
            console.error('[BlogController] upsertBlog error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async getPublicBlog(req: Request, res: Response) {
        try {
            const idOrSlug = req.params.projectId || req.params.slug;
            if (!idOrSlug) {
                return res.status(400).json({ error: 'Missing projectId or slug' });
            }

            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
            let projectId = idOrSlug;

            if (!isUuid) {
                const { data: project } = await supabase.from('projects').select('id').eq('slug', idOrSlug).single();
                if (project) {
                    projectId = project.id;
                } else {
                    const uuidMatch = idOrSlug.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
                    if (uuidMatch) {
                        projectId = uuidMatch[1];
                    }
                }
            }

            const { data: blog } = await supabase
                .from('blogs')
                .select('*')
                .eq('project_id', projectId)
                .maybeSingle();

            const { data: project } = await supabase
                .from('projects')
                .select('*')
                .eq('id', projectId)
                .maybeSingle();

            let finalBlog = blog;

            let currentFields: any[] = [];
            if (blog?.custom_fields) {
                try {
                    currentFields = typeof blog.custom_fields === 'string' ? JSON.parse(blog.custom_fields) : blog.custom_fields;
                } catch (e) {
                    currentFields = [];
                }
            }

            if ((!blog || !Array.isArray(currentFields) || currentFields.length === 0) && project) {
                let parsedAnswers: Record<string, any> = {};
                if (project.validation_answers) {
                    try {
                        parsedAnswers = typeof project.validation_answers === 'string'
                            ? JSON.parse(project.validation_answers)
                            : project.validation_answers;
                    } catch (e) {
                        parsedAnswers = {};
                    }
                }

                const generatedFields = buildCustomFieldsFromAnswers(parsedAnswers, project);
                const blogData = {
                    project_id: projectId,
                    heading: blog?.heading || project.title || '',
                    cover_image_url: blog?.cover_image_url || '',
                    introduction: blog?.introduction || project.one_line_summary || project.introduction || '',
                    content: blog?.content || '',
                    custom_fields: JSON.stringify(generatedFields),
                    updated_at: new Date().toISOString(),
                };

                if (blog) {
                    const { data: updated } = await supabase
                        .from('blogs')
                        .update(blogData)
                        .eq('project_id', projectId)
                        .select()
                        .single();
                    finalBlog = updated || blog;
                } else {
                    const { data: created } = await supabase
                        .from('blogs')
                        .insert({ ...blogData, id: randomUUID(), created_at: new Date().toISOString() })
                        .select()
                        .single();
                    finalBlog = created || blogData;
                }
            }

            if (!finalBlog && !project) {
                return res.json({
                    heading: '', coverImageUrl: '', introduction: '',
                    content: '', customFields: []
                });
            }

            return res.json(this.transformBlog(finalBlog));
        } catch (error) {
            console.error('[BlogController] getPublicBlog error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
}
