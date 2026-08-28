import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { randomUUID } from 'crypto';

interface PitchFeedItem {
    projectId: string;
    title: string;
    oneLineSummary: string | null;
    slug: string;
    elevatorPitchUrl: string;
    elevatorPitchThumbnail: string | null;
    elevatorPitchDuration: number | null;
    coverImageUrl: string | null;
    authorName: string;
    authorProfileImageUrl: string | null;
}

// Deterministic seeded shuffle (Mulberry32 PRNG)
function seededShuffle<T>(array: T[], seed: number): T[] {
    const result = [...array];
    let s = seed >>> 0;
    const random = () => {
        let t = (s += 0x6D2B79F5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

export class PromotionController {

    /**
     * Public Reels / Pitch feed
     */
    async getPitchFeed(req: Request, res: Response) {
        try {
            const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100);
            const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
            const seed = req.query.seed ? parseInt(req.query.seed as string) : null;
            const excludeStr = req.query.exclude as string | undefined;

            const excludeSet = new Set<string>();
            if (excludeStr) {
                excludeStr.split(',').forEach(id => {
                    const trimmed = id.trim();
                    if (trimmed) excludeSet.add(trimmed);
                });
            }

            // 1. Fetch all active promotions
            const { data: promotions, error: promoErr } = await supabase
                .from('blog_promotions')
                .select('*')
                .eq('status', 'ACTIVE')
                .order('created_at', { ascending: false });

            if (promoErr) {
                console.error('[PromotionController] Error fetching promotions:', promoErr);
                return res.status(500).json({ error: 'Failed to fetch pitch feed' });
            }

            // 2. Fetch blogs, projects, and users to build feed
            const { data: blogs } = await supabase.from('blogs').select('*');
            const { data: projects } = await supabase.from('projects').select('*');
            const { data: users } = await supabase.from('users').select('*');

            const blogMap = new Map((blogs || []).map(b => [b.id, b]));
            const projectMap = new Map((projects || []).map(p => [p.id, p]));
            const userMap = new Map((users || []).map(u => [u.id, u]));

            const seenProjectIds = new Set<string>();
            let feedItems: PitchFeedItem[] = [];

            // Add items from active promotions first
            for (const promo of (promotions || [])) {
                const blog = blogMap.get(promo.blog_id);
                if (!blog) continue;

                const project = projectMap.get(blog.project_id);
                if (!project || seenProjectIds.has(project.id) || excludeSet.has(project.id)) continue;

                seenProjectIds.add(project.id);
                const user = userMap.get(promo.user_id) || (project.owner_id ? userMap.get(project.owner_id) : undefined);

                feedItems.push({
                    projectId: project.id,
                    title: blog.heading || project.title || 'Untitled Pitch',
                    oneLineSummary: project.one_line_summary || project.introduction || null,
                    slug: project.slug || project.id,
                    elevatorPitchUrl: project.elevator_pitch_url || '',
                    elevatorPitchThumbnail: project.elevator_pitch_thumbnail || null,
                    elevatorPitchDuration: project.elevator_pitch_duration ? Number(project.elevator_pitch_duration) : null,
                    coverImageUrl: blog.cover_image_url || null,
                    authorName: user?.name || 'Founder',
                    authorProfileImageUrl: user?.profile_image_url || null,
                });
            }

            // Fallback: If promotions list is small, also include any other projects that have elevator pitches
            for (const project of (projects || [])) {
                if (project.elevator_pitch_url && !seenProjectIds.has(project.id) && !excludeSet.has(project.id)) {
                    seenProjectIds.add(project.id);
                    const user = userMap.get(project.owner_id);
                    const blog = (blogs || []).find(b => b.project_id === project.id);

                    feedItems.push({
                        projectId: project.id,
                        title: blog?.heading || project.title || 'Untitled Pitch',
                        oneLineSummary: project.one_line_summary || project.introduction || null,
                        slug: project.slug || project.id,
                        elevatorPitchUrl: project.elevator_pitch_url,
                        elevatorPitchThumbnail: project.elevator_pitch_thumbnail || null,
                        elevatorPitchDuration: project.elevator_pitch_duration ? Number(project.elevator_pitch_duration) : null,
                        coverImageUrl: blog?.cover_image_url || null,
                        authorName: user?.name || 'Founder',
                        authorProfileImageUrl: user?.profile_image_url || null,
                    });
                }
            }

            // Seeded deterministic shuffle
            if (seed !== null && !isNaN(seed)) {
                feedItems = seededShuffle(feedItems, seed);
            }

            const paged = feedItems.slice(offset, offset + limit);
            return res.json(paged);
        } catch (error) {
            console.error('[PromotionController] getPitchFeed error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Similar blogs for "More Like This"
     */
    async getSimilarBlogs(req: Request, res: Response) {
        try {
            const { projectId } = req.params;
            const limit = parseInt(req.query.limit as string) || 6;

            const { data: blogs } = await supabase.from('blogs').select('*');
            const { data: projects } = await supabase.from('projects').select('*');
            const { data: users } = await supabase.from('users').select('*');
            const userMap = new Map((users || []).map(u => [u.id, u]));

            const blogMap = new Map((blogs || []).map(b => [b.project_id, b]));

            const similar = (projects || [])
                .filter(p => p.id !== projectId)
                .slice(0, limit)
                .map(p => {
                    const b = blogMap.get(p.id);
                    const u = userMap.get(p.owner_id);
                    return {
                        projectId: p.id,
                        heading: b?.heading || p.title,
                        oneLineSummary: p.one_line_summary || p.introduction || null,
                        coverImageUrl: b?.cover_image_url || null,
                        slug: p.slug || p.id,
                        authorName: u?.name || 'Founder',
                        matchingTags: []
                    };
                });

            return res.json(similar);
        } catch (error) {
            console.error('[PromotionController] getSimilarBlogs error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Interest count (e.g. fire/reactions on pitch)
     */
    async getInterestCount(req: Request, res: Response) {
        try {
            const { id } = req.params;
            // Count audience feedback entries for this project
            const { count, error } = await supabase
                .from('audience_feedback')
                .select('*', { count: 'exact', head: true })
                .eq('project_id', id);

            return res.json({ count: count || 0 });
        } catch (error) {
            return res.json({ count: 0 });
        }
    }

    /**
     * Record pitch view telemetry
     */
    async recordPitchView(req: Request, res: Response) {
        return res.json({ success: true });
    }

    /**
     * Blog branding info
     */
    async getBlogBranding(req: Request, res: Response) {
        try {
            const { projectId } = req.params;
            const { data: project } = await supabase.from('projects').select('owner_id').eq('id', projectId).single();
            if (project?.owner_id) {
                const { data: user } = await supabase.from('users').select('*').eq('id', project.owner_id).single();
                const plan = user?.subscription_plan || 'FREE';
                const isFree = plan.toUpperCase() === 'FREE';
                return res.json({
                    plan,
                    customLogoUrl: isFree ? null : user?.custom_logo_url,
                    customBrandingText: isFree ? null : user?.custom_branding_text,
                    showBranding: isFree,
                    botName: null,
                    botAvatarUrl: null
                });
            }
            return res.json({
                plan: 'FREE',
                customLogoUrl: null,
                customBrandingText: null,
                showBranding: true,
                botName: null,
                botAvatarUrl: null
            });
        } catch (error) {
            return res.json({ plan: 'FREE', showBranding: true, botName: null, botAvatarUrl: null });
        }
    }

    /**
     * Authenticated promotion endpoints
     */
    async getUserPromotions(req: Request, res: Response) {
        try {
            const userId = req.user?.id;
            if (!userId) return res.status(401).json({ error: 'Unauthorized' });

            const { data: promotions, error } = await supabase
                .from('blog_promotions')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) {
                return res.status(500).json({ error: 'Failed to fetch user promotions' });
            }

            const { data: blogs } = await supabase.from('blogs').select('*');
            const { data: tags } = await supabase.from('promotion_tags').select('*');

            const blogMap = new Map((blogs || []).map(b => [b.id, b]));

            const result = (promotions || []).map(promo => {
                const blog = blogMap.get(promo.blog_id);
                const promoTags = (tags || []).filter(t => t.promotion_id === promo.id).map(t => t.tag);
                return {
                    id: promo.id,
                    blogId: promo.blog_id,
                    projectId: blog?.project_id || null,
                    heading: blog?.heading || 'Untitled',
                    coverImageUrl: blog?.cover_image_url || null,
                    tags: promoTags,
                    status: promo.status,
                    createdAt: promo.created_at
                };
            });

            return res.json(result);
        } catch (error) {
            console.error('[PromotionController] getUserPromotions error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    async submitPromotion(req: Request, res: Response) {
        try {
            const userId = req.user?.id;
            if (!userId) return res.status(401).json({ error: 'Unauthorized' });

            const { projectId, tags } = req.body;
            if (!projectId) return res.status(400).json({ error: 'projectId is required' });

            // Find or create blog
            let { data: blog } = await supabase.from('blogs').select('*').eq('project_id', projectId).single();
            if (!blog) {
                const { data: project } = await supabase.from('projects').select('*').eq('id', projectId).single();
                if (!project) return res.status(404).json({ error: 'Project not found' });

                const { data: newBlog, error: createBlogErr } = await supabase.from('blogs').insert({
                    id: randomUUID(),
                    project_id: projectId,
                    heading: project.title,
                    introduction: project.introduction,
                    content: project.description
                }).select().single();

                if (createBlogErr) return res.status(500).json({ error: 'Failed to create blog' });
                blog = newBlog;
            }

            // Check existing promotion
            const { data: existing } = await supabase.from('blog_promotions').select('*').eq('blog_id', blog.id).single();
            let promotionId = existing?.id;

            if (existing) {
                await supabase.from('blog_promotions').update({
                    status: 'ACTIVE',
                    updated_at: new Date().toISOString()
                }).eq('id', existing.id);
            } else {
                promotionId = randomUUID();
                await supabase.from('blog_promotions').insert({
                    id: promotionId,
                    blog_id: blog.id,
                    user_id: userId,
                    status: 'ACTIVE'
                });
            }

            // Update tags
            if (tags && Array.isArray(tags)) {
                await supabase.from('promotion_tags').delete().eq('promotion_id', promotionId);
                const tagInserts = tags.map(t => ({
                    id: randomUUID(),
                    promotion_id: promotionId,
                    tag: String(t).trim().toLowerCase()
                })).filter(t => t.tag);

                if (tagInserts.length > 0) {
                    await supabase.from('promotion_tags').insert(tagInserts);
                }
            }

            return res.json({
                id: promotionId,
                blogId: blog.id,
                projectId,
                heading: blog.heading || 'Untitled',
                status: 'ACTIVE',
                tags: tags || []
            });
        } catch (error) {
            console.error('[PromotionController] submitPromotion error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    async removePromotion(req: Request, res: Response) {
        try {
            const userId = req.user?.id;
            const { id } = req.params;
            if (!userId) return res.status(401).json({ error: 'Unauthorized' });

            await supabase.from('blog_promotions').update({
                status: 'REMOVED',
                updated_at: new Date().toISOString()
            }).eq('id', id).eq('user_id', userId);

            return res.json({ success: true });
        } catch (error) {
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
}
