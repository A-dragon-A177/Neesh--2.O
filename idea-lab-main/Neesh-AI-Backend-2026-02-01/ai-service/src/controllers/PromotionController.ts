import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { supabase } from '../config/supabase';

const MAX_TAGS = 5;

interface PromotionRequest {
    projectId: string;
    tags?: string[];
}

export class PromotionController {

    /**
     * Convert database promotion + blog + project + tags
     * into the shape expected by the frontend.
     */
    private toDTO(promotion: any, blog: any, project: any, tags: string[]) {
        return {
            id: promotion.id,
            blogId: promotion.blog_id,
            projectId: project.id,
            blogTitle: blog?.heading || project.title || '',
            coverImageUrl: blog?.cover_image_url || '',
            tags,
            status: promotion.status,
            createdAt: promotion.created_at
        };
    }

    /**
     * POST /api/promotions
     */
    async createPromotion(req: Request, res: Response) {
        try {
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    error: 'Unauthorized'
                });
            }

            const { projectId, tags }: PromotionRequest = req.body;

            if (!projectId) {
                return res.status(400).json({
                    error: 'projectId is required'
                });
            }

            // Verify that this project belongs to the authenticated user.
            const { data: project, error: projectError } = await supabase
                .from('projects')
                .select('*')
                .eq('id', projectId)
                .eq('owner_id', userId)
                .single();

            if (projectError || !project) {
                console.error('[PromotionController] Project lookup failed:', projectError);

                return res.status(404).json({
                    error: 'Project not found'
                });
            }

            // Find the blog belonging to this project.
            let { data: blog, error: blogError } = await supabase
                .from('blogs')
                .select('*')
                .eq('project_id', projectId)
                .maybeSingle();

            if (blogError) {
                console.error('[PromotionController] Blog lookup failed:', blogError);

                return res.status(500).json({
                    error: 'Failed to load blog'
                });
            }

            // The old Java implementation auto-created a blog if one
            // did not exist. Preserve that behavior.
            if (!blog) {
                const now = new Date().toISOString();

                const { data: newBlog, error: createBlogError } = await supabase
                    .from('blogs')
                    .insert({
                        id: randomUUID(),
                        project_id: projectId,
                        heading: project.title || '',
                        cover_image_url: '',
                        introduction: project.introduction || '',
                        content: project.description || '',
                        custom_fields: JSON.stringify([]),
                        created_at: now,
                        updated_at: now
                    })
                    .select('*')
                    .single();

                if (createBlogError || !newBlog) {
                    console.error(
                        '[PromotionController] Blog creation failed:',
                        createBlogError
                    );

                    return res.status(500).json({
                        error: 'Failed to create blog for promotion'
                    });
                }

                blog = newBlog;
            }

            // Normalize tags exactly like the existing promotion implementation.
            let normalizedTags = Array.isArray(tags)
                ? tags
                    .filter((tag): tag is string => typeof tag === 'string')
                    .map(tag => tag.toLowerCase().trim())
                    .filter(Boolean)
                    .filter((tag, index, array) => array.indexOf(tag) === index)
                : [];

            // If the frontend doesn't provide tags, use project industry
            // when available, otherwise default to "startup".
            if (normalizedTags.length === 0) {
                const industry =
                    typeof project.industry === 'string'
                        ? project.industry.trim()
                        : '';

                normalizedTags = [
                    industry ? industry.toLowerCase() : 'startup'
                ];
            }

            if (normalizedTags.length > MAX_TAGS) {
                return res.status(400).json({
                    error: `Maximum ${MAX_TAGS} tags allowed per promotion.`
                });
            }

            // Check whether this blog already has a promotion.
            const { data: existingPromotion, error: existingError } = await supabase
                .from('blog_promotions')
                .select('*')
                .eq('blog_id', blog.id)
                .maybeSingle();

            if (existingError) {
                console.error(
                    '[PromotionController] Existing promotion lookup failed:',
                    existingError
                );

                return res.status(500).json({
                    error: 'Failed to check existing promotion'
                });
            }

            let promotion: any;

            if (existingPromotion) {
                // Reuse existing promotion and activate it.
                const { data: updatedPromotion, error: updateError } = await supabase
                    .from('blog_promotions')
                    .update({
                        status: 'ACTIVE',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existingPromotion.id)
                    .eq('user_id', userId)
                    .select('*')
                    .single();

                if (updateError || !updatedPromotion) {
                    console.error(
                        '[PromotionController] Promotion update failed:',
                        updateError
                    );

                    return res.status(500).json({
                        error: 'Failed to update promotion'
                    });
                }

                promotion = updatedPromotion;

                // Replace existing tags.
                const { error: deleteTagsError } = await supabase
                    .from('promotion_tags')
                    .delete()
                    .eq('promotion_id', promotion.id);

                if (deleteTagsError) {
                    console.error(
                        '[PromotionController] Tag deletion failed:',
                        deleteTagsError
                    );

                    return res.status(500).json({
                        error: 'Failed to update promotion tags'
                    });
                }

            } else {
                const now = new Date().toISOString();

                const { data: newPromotion, error: createPromotionError } = await supabase
                    .from('blog_promotions')
                    .insert({
                        id: randomUUID(),
                        blog_id: blog.id,
                        user_id: userId,
                        status: 'ACTIVE',
                        created_at: now,
                        updated_at: now
                    })
                    .select('*')
                    .single();

                if (createPromotionError || !newPromotion) {
                    console.error(
                        '[PromotionController] Promotion creation failed:',
                        createPromotionError
                    );

                    return res.status(500).json({
                        error: 'Failed to create promotion'
                    });
                }

                promotion = newPromotion;
            }

            // Insert normalized tags.
            const tagRows = normalizedTags.map(tag => ({
                promotion_id: promotion.id,
                tag
            }));

            const { error: tagError } = await supabase
                .from('promotion_tags')
                .insert(tagRows);

            if (tagError) {
                console.error(
                    '[PromotionController] Tag insertion failed:',
                    tagError
                );

                return res.status(500).json({
                    error: 'Promotion created but tags could not be saved'
                });
            }

            console.log(
                '[PromotionController] Promotion created/updated:',
                promotion.id
            );

            return res.status(201).json(
                this.toDTO(
                    promotion,
                    blog,
                    project,
                    normalizedTags
                )
            );

        } catch (error: any) {
            console.error(
                '[PromotionController] createPromotion error:',
                error
            );

            return res.status(500).json({
                error: 'Internal server error'
            });
        }
    }

    /**
     * GET /api/promotions
     */
    async getPromotions(req: Request, res: Response) {
        try {
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    error: 'Unauthorized'
                });
            }

            const { data: promotions, error } = await supabase
                .from('blog_promotions')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error(
                    '[PromotionController] Failed to fetch promotions:',
                    error
                );

                return res.status(500).json({
                    error: 'Failed to fetch promotions'
                });
            }

            const result = [];

            for (const promotion of promotions || []) {

                const { data: blog } = await supabase
                    .from('blogs')
                    .select('*')
                    .eq('id', promotion.blog_id)
                    .maybeSingle();

                const { data: project } = await supabase
                    .from('projects')
                    .select('*')
                    .eq('id', blog?.project_id)
                    .maybeSingle();

                const { data: tagRows } = await supabase
                    .from('promotion_tags')
                    .select('tag')
                    .eq('promotion_id', promotion.id);

                if (project) {
                    result.push(
                        this.toDTO(
                            promotion,
                            blog,
                            project,
                            (tagRows || []).map(row => row.tag)
                        )
                    );
                }
            }

            return res.json(result);

        } catch (error) {
            console.error(
                '[PromotionController] getPromotions error:',
                error
            );

            return res.status(500).json({
                error: 'Internal server error'
            });
        }
    }

    /**
     * DELETE /api/promotions/:promotionId
     */
    async removePromotion(req: Request, res: Response) {
        try {
            const userId = req.user?.id;
            const { promotionId } = req.params;

            if (!userId) {
                return res.status(401).json({
                    error: 'Unauthorized'
                });
            }

            const { data: promotion, error: findError } = await supabase
                .from('blog_promotions')
                .select('*')
                .eq('id', promotionId)
                .eq('user_id', userId)
                .single();

            if (findError || !promotion) {
                return res.status(404).json({
                    error: 'Promotion not found'
                });
            }

            // Match the existing Java implementation:
            // remove by changing status rather than deleting the record.
            const { error: updateError } = await supabase
                .from('blog_promotions')
                .update({
                    status: 'REMOVED',
                    updated_at: new Date().toISOString()
                })
                .eq('id', promotionId)
                .eq('user_id', userId);

            if (updateError) {
                console.error(
                    '[PromotionController] Promotion removal failed:',
                    updateError
                );

                return res.status(500).json({
                    error: 'Failed to remove promotion'
                });
            }

            return res.json({
                success: true
            });

        } catch (error) {
            console.error(
                '[PromotionController] removePromotion error:',
                error
            );

            return res.status(500).json({
                error: 'Internal server error'
            });
        }
    }
}
