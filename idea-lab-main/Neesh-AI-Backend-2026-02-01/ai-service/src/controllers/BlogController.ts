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

    // 2. What We're Building
    const solution = getStringVal('our_solution', 'solution', 'what_building', 'solutionDescription');
    if (solution) {
        fields.push({ id: randomUUID(), type: 'spotlight_section', sectionTitle: "What We're Building", value: solution, order: order++ });
    }

    // 3. Value Advantage & Economics (CVP)
    const cvpAlt = getStringVal('cvp_input_a');
    const cvpMetric = getStringVal('cvp_input_b');
    const cvpAltCost = getStringVal('cvp_input_c');
    const cvpOurCost = getStringVal('cvp_input_d');
    const cvpValidation = getStringVal('cvp_input_e');
    if (cvpAlt || cvpAltCost || cvpOurCost || cvpMetric) {
        const lines: string[] = [];
        if (cvpAlt) lines.push(`• Alternative Solution: ${cvpAlt}`);
        if (cvpMetric) lines.push(`• Core Value Driver: ${cvpMetric}`);
        if (cvpAltCost && cvpOurCost) lines.push(`• Cost Comparison: $${cvpAltCost} (Alternative) vs $${cvpOurCost} (Our Solution)`);
        else if (cvpAltCost) lines.push(`• Alternative Cost: $${cvpAltCost}`);
        else if (cvpOurCost) lines.push(`• Solution Cost: $${cvpOurCost}`);
        if (cvpValidation) lines.push(`• Validation Status: ${cvpValidation}`);
        if (lines.length > 0) {
            fields.push({ id: randomUUID(), type: 'spotlight_section', sectionTitle: 'Value Advantage & Economics', value: lines.join('\n'), order: order++ });
        }
    }

    // 4. Who It's For
    const target = getStringVal('target_customer', 'target_audience', 'idealCustomer', 'who_its_for');
    if (target) {
        fields.push({ id: randomUUID(), type: 'spotlight_section', sectionTitle: "Who It's For", value: target, order: order++ });
    }

    // 5. Market Opportunity & Dynamics
    const marketHabit = getStringVal('market_input_a');
    const marketSpend = getStringVal('market_input_b');
    const marketPrice = getStringVal('market_input_c1');
    const marketConcentration = getStringVal('market_input_c2');
    const marketGeo = getStringVal('market_input_d');
    if (marketHabit || marketSpend || marketPrice || marketGeo || marketConcentration) {
        const lines: string[] = [];
        if (marketHabit) lines.push(`• Customer Urgency: ${marketHabit}`);
        if (marketSpend) lines.push(`• Willingness to Pay: ${marketSpend}`);
        if (marketPrice) lines.push(`• Target Pricing: $${marketPrice}/yr`);
        if (marketGeo || marketConcentration) {
            const geoPart = [marketGeo, marketConcentration ? `(${marketConcentration})` : ''].filter(Boolean).join(' ');
            lines.push(`• Market Profile: ${geoPart}`);
        }
        if (lines.length > 0) {
            fields.push({ id: randomUUID(), type: 'spotlight_section', sectionTitle: 'Market Opportunity & Dynamics', value: lines.join('\n'), order: order++ });
        }
    }

    // 6. The Hook
    const hook = getStringVal('the_hook', 'hook', 'keyInsight', 'surprisingInsight');
    if (hook) {
        fields.push({ id: randomUUID(), type: 'spotlight_section', sectionTitle: 'The Hook', value: hook, order: order++ });
    }

    // 7. Customer Acquisition & Trust
    const acqAccess = getStringVal('acq_input_a');
    const acqChannel = getStringVal('acq_input_b');
    const acqRep = getStringVal('acq_input_c');
    if (acqAccess || acqChannel || acqRep) {
        const lines: string[] = [];
        if (acqAccess) lines.push(`• Customer Access: ${acqAccess}`);
        if (acqChannel) lines.push(`• Growth Engine: ${acqChannel}`);
        if (acqRep) lines.push(`• Industry Authority: ${acqRep}`);
        if (lines.length > 0) {
            fields.push({ id: randomUUID(), type: 'spotlight_section', sectionTitle: 'Customer Acquisition & Trust', value: lines.join('\n'), order: order++ });
        }
    }

    // 8. Defensibility & Moat
    const defMoat = getStringVal('def_input_a');
    const defTech = getStringVal('def_input_b');
    const defStrategy = getStringVal('def_input_c');
    if (defMoat || defTech || defStrategy) {
        const lines: string[] = [];
        if (defMoat) lines.push(`• Core Advantage: ${defMoat}`);
        if (defTech) lines.push(`• Technical Barrier: ${defTech}`);
        if (defStrategy) lines.push(`• Defense Strategy: ${defStrategy}`);
        if (lines.length > 0) {
            fields.push({ id: randomUUID(), type: 'spotlight_section', sectionTitle: 'Defensibility & Moat', value: lines.join('\n'), order: order++ });
        }
    }

    // 9. The Founder's Story
    const founder = getStringVal('founder_story', 'founderStory', 'motivation', 'the_founders_story');
    if (founder) {
        fields.push({ id: randomUUID(), type: 'spotlight_section', sectionTitle: "The Founder's Story", value: founder, order: order++ });
    }

    // 10. Execution & Build Readiness
    const buildStability = getStringVal('build_input_a');
    const buildStage = getStringVal('build_input_b');
    if (buildStability || buildStage) {
        const lines: string[] = [];
        if (buildStability) lines.push(`• Team Execution Capacity: ${buildStability}`);
        if (buildStage) lines.push(`• Current Milestone: ${buildStage}`);
        if (lines.length > 0) {
            fields.push({ id: randomUUID(), type: 'spotlight_section', sectionTitle: 'Execution & Build Readiness', value: lines.join('\n'), order: order++ });
        }
    }

    // 11. Our Vision
    const vision = getStringVal('vision', 'longTermVision', 'our_vision');
    if (vision) {
        fields.push({ id: randomUUID(), type: 'spotlight_section', sectionTitle: 'Our Vision', value: vision, order: order++ });
    }

    // 12. Get Involved
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

export function mergeCustomFieldsWithAnswers(existingFields: any[], answers: Record<string, any>, project?: any): any[] {
    const generated = buildCustomFieldsFromAnswers(answers, project);
    const existing = Array.isArray(existingFields) ? [...existingFields] : [];

    const cleanedExisting = existing.filter(f => {
        if (!f) return false;
        const title = (f.sectionTitle || f.title || '').trim().toLowerCase();
        const val = (f.value || f.content || '').trim();
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
