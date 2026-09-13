import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { randomUUID } from 'crypto';

export function buildCustomFieldsFromAnswers(answers: Record<string, any>, project?: any): any[] {
    const fields: any[] = [];
    let order = 1;

    const getStringVal = (...keys: string[]): string => {
        if (!answers || typeof answers !== 'object') return '';
        for (const k of keys) {
            const v = answers[k];
            if (typeof v === 'string' && v.trim()) return v.trim();
        }
        return '';
    };

    // 1. The Problem
    const problem = getStringVal('problem_story', 'problem', 'the_problem', 'problemDescription');
    if (problem) {
        fields.push({ id: randomUUID(), type: 'spotlight_section', sectionTitle: 'The Problem', value: problem, order: order++ });
    }

    // 2. What We're Building (Typed Answer)
    const solution = getStringVal('our_solution', 'solution', 'what_building', 'solutionDescription');
    if (solution) {
        fields.push({ id: randomUUID(), type: 'spotlight_section', sectionTitle: "What We're Building", value: solution, order: order++ });
    }

    // 3. Who It's For (Typed Answer)
    const target = getStringVal('target_customer', 'target_audience', 'idealCustomer', 'who_its_for');
    if (target) {
        fields.push({ id: randomUUID(), type: 'spotlight_section', sectionTitle: "Who It's For", value: target, order: order++ });
    }

    // 4. The Hook (Typed Answer)
    const hook = getStringVal('the_hook', 'hook', 'keyInsight', 'surprisingInsight');
    if (hook) {
        fields.push({ id: randomUUID(), type: 'spotlight_section', sectionTitle: 'The Hook', value: hook, order: order++ });
    }

    // 5. The Founder's Story (Typed Answer)
    const founder = getStringVal('founder_story', 'founderStory', 'motivation', 'the_founders_story');
    if (founder) {
        fields.push({ id: randomUUID(), type: 'spotlight_section', sectionTitle: "The Founder's Story", value: founder, order: order++ });
    }

    // 6. Our Vision (Typed Answer)
    const vision = getStringVal('vision', 'longTermVision', 'our_vision');
    if (vision) {
        fields.push({ id: randomUUID(), type: 'spotlight_section', sectionTitle: 'Our Vision', value: vision, order: order++ });
    }

    // 7. Get Involved (Typed Answer)
    const cta = getStringVal('call_to_action', 'cta', 'get_involved', 'nextSteps');
    if (cta) {
        fields.push({ id: randomUUID(), type: 'spotlight_section', sectionTitle: 'Get Involved', value: cta, order: order++ });
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

export function isExcludedDataSection(titleOrVal?: string | null): boolean {
    if (!titleOrVal) return false;
    const t = titleOrVal.toLowerCase();
    return (
        t.includes("value advantage") ||
        t.includes("cvp") ||
        t.includes("cost comparison") ||
        t.includes("market opportunity") ||
        t.includes("market sizing") ||
        t.includes("market dynamics") ||
        t.includes("customer urgency") ||
        t.includes("target pricing") ||
        t.includes("customer acquisition") ||
        t.includes("acquisition data") ||
        t.includes("growth engine") ||
        t.includes("defensibility & moat") ||
        t.includes("defensibility") ||
        t.includes("moat data") ||
        t.includes("core advantage") ||
        t.includes("technical barrier") ||
        t.includes("defense strategy") ||
        t.includes("execution & build") ||
        t.includes("build readiness") ||
        t.includes("buildability") ||
        t.includes("team execution") ||
        t.includes("current milestone")
    );
}

export function mergeCustomFieldsWithAnswers(existingFields: any[], answers: Record<string, any>, project?: any): any[] {
    const generated = buildCustomFieldsFromAnswers(answers, project);
    const existing = Array.isArray(existingFields) ? [...existingFields] : [];

    const cleanedExisting = existing.filter(f => {
        if (!f) return false;
        const title = (f.sectionTitle || f.title || '').trim().toLowerCase();
        const val = (f.value || f.content || '').trim();
        if (isExcludedDataSection(title) || isExcludedDataSection(val)) return false;
        if (title === 'content' && !val) return false;
        if (!title && !val) return false;
        return true;
    });

    const norm = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const merged = [...cleanedExisting];
    let maxOrder = merged.reduce((max, f) => Math.max(max, typeof f.order === 'number' ? f.order : 0), 0);

    for (const gen of generated) {
        const genNorm = norm(gen.sectionTitle);
        const existingIdx = merged.findIndex(f => norm(f.sectionTitle || f.title) === genNorm);
        if (existingIdx >= 0) {
            const exVal = (merged[existingIdx].value || merged[existingIdx].content || '').trim();
            if (!exVal && gen.value) {
                merged[existingIdx] = {
                    ...merged[existingIdx],
                    value: gen.value
                };
            }
        } else {
            maxOrder++;
            merged.push({
                ...gen,
                order: maxOrder
            });
        }
    }

    return merged;
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

            // Auto-populate / merge from validation answers
            let currentFields: any[] = [];
            if (blog?.custom_fields) {
                try {
                    currentFields = typeof blog.custom_fields === 'string' ? JSON.parse(blog.custom_fields) : blog.custom_fields;
                } catch (e) {
                    currentFields = [];
                }
            }

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

            const mergedFields = mergeCustomFieldsWithAnswers(currentFields, parsedAnswers, project);
            const needsUpdate = !blog || JSON.stringify(currentFields) !== JSON.stringify(mergedFields);

            if (needsUpdate) {
                const blogData = {
                    project_id: projectId,
                    heading: blog?.heading || project.title || '',
                    cover_image_url: blog?.cover_image_url || '',
                    introduction: blog?.introduction || project.one_line_summary || project.introduction || '',
                    content: blog?.content || '',
                    custom_fields: JSON.stringify(mergedFields),
                    updated_at: new Date().toISOString(),
                };

                if (blog) {
                    const { data: updated } = await supabase
                        .from('blogs')
                        .update(blogData)
                        .eq('project_id', projectId)
                        .select()
                        .single();
                    finalBlog = updated || { ...blog, ...blogData };
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

            if (project) {
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

                const mergedFields = mergeCustomFieldsWithAnswers(currentFields, parsedAnswers, project);
                const needsUpdate = !blog || JSON.stringify(currentFields) !== JSON.stringify(mergedFields);

                if (needsUpdate) {
                    const blogData = {
                        project_id: projectId,
                        heading: blog?.heading || project.title || '',
                        cover_image_url: blog?.cover_image_url || '',
                        introduction: blog?.introduction || project.one_line_summary || project.introduction || '',
                        content: blog?.content || '',
                        custom_fields: JSON.stringify(mergedFields),
                        updated_at: new Date().toISOString(),
                    };

                    if (blog) {
                        const { data: updated } = await supabase
                            .from('blogs')
                            .update(blogData)
                            .eq('project_id', projectId)
                            .select()
                            .single();
                        finalBlog = updated || { ...blog, ...blogData };
                    } else {
                        const { data: created } = await supabase
                            .from('blogs')
                            .insert({ ...blogData, id: randomUUID(), created_at: new Date().toISOString() })
                            .select()
                            .single();
                        finalBlog = created || blogData;
                    }
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
