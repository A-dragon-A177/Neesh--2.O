import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

const FREE_PROJECT_LIMIT = 5;
const PRO_PROJECT_LIMIT = 999;

export class UserController {

    async getSubscription(req: Request, res: Response) {
        try {
            const userId = req.user?.id;

            const { data: user } = await supabase
                .from('users')
                .select('subscription_plan, subscription_expires_at, custom_logo_url, custom_branding_text')
                .eq('id', userId)
                .single();

            const plan = user?.subscription_plan?.toUpperCase() === 'PRO' ? 'PRO' : 'FREE';

            const { count: projectCount } = await supabase
                .from('projects')
                .select('*', { count: 'exact', head: true })
                .eq('owner_id', userId)
                .eq('deleted', false);

            const maxProjects = plan === 'PRO' ? PRO_PROJECT_LIMIT : FREE_PROJECT_LIMIT;
            const count = projectCount || 0;

            res.json({
                plan,
                projectCount: count,
                maxProjects,
                canCreateProject: count < maxProjects,
                customLogoUrl: user?.custom_logo_url || '',
                customBrandingText: user?.custom_branding_text || '',
                subscriptionExpiresAt: user?.subscription_expires_at || null,
            });
        } catch (error) {
            console.error('[UserController] getSubscription error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async upgradeToPro(req: Request, res: Response) {
        try {
            const userId = req.user?.id;

            const { error } = await supabase
                .from('users')
                .update({
                    subscription_plan: 'PRO',
                    updated_at: new Date().toISOString(),
                })
                .eq('id', userId);

            if (error) throw error;

            res.json({ success: true, plan: 'PRO' });
        } catch (error) {
            console.error('[UserController] upgradeToPro error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async updateBranding(req: Request, res: Response) {
        try {
            const userId = req.user?.id;
            const { customLogoUrl, customBrandingText } = req.body;

            await supabase
                .from('users')
                .update({
                    custom_logo_url: customLogoUrl || null,
                    custom_branding_text: customBrandingText || null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', userId);

            res.json({ success: true });
        } catch (error) {
            console.error('[UserController] updateBranding error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async getCurrentUser(req: Request, res: Response) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { data: user, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (error) {
                console.error('[UserController] getCurrentUser error:', error);
            }

            if (!user) {
                const email = req.user?.email || `${userId}@user.local`;
                const name = email.split('@')[0] || 'Founder';
                const newUser = {
                    id: userId,
                    email,
                    name,
                    status: 'ACTIVE',
                    subscription_plan: 'FREE',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };

                const { data: created, error: insertError } = await supabase
                    .from('users')
                    .upsert(newUser)
                    .select('*')
                    .single();

                if (insertError) {
                    console.error('[UserController] Auto-create user error:', insertError);
                }

                const u = created || newUser;
                return res.json({
                    id: u.id,
                    email: u.email,
                    name: u.name,
                    status: u.status || 'ACTIVE',
                    occupation: u.occupation || null,
                    profileImageUrl: u.profile_image_url || null,
                    bio: u.bio || null,
                    phone: u.phone || null,
                    location: u.location || null,
                    subscriptionPlan: u.subscription_plan || 'FREE',
                    createdAt: u.created_at,
                    updatedAt: u.updated_at,
                });
            }

            return res.json({
                id: user.id,
                email: user.email,
                name: user.name,
                status: user.status || 'ACTIVE',
                occupation: user.occupation || null,
                profileImageUrl: user.profile_image_url || null,
                bio: user.bio || null,
                phone: user.phone || null,
                location: user.location || null,
                subscriptionPlan: user.subscription_plan || 'FREE',
                customLogoUrl: user.custom_logo_url || null,
                customBrandingText: user.custom_branding_text || null,
                createdAt: user.created_at,
                updatedAt: user.updated_at,
            });
        } catch (error) {
            console.error('[UserController] getCurrentUser error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async updateProfile(req: Request, res: Response) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { name, occupation, profileImageUrl, bio, phone, location } = req.body;

            const updateData: Record<string, any> = {
                updated_at: new Date().toISOString(),
            };
            if (name !== undefined) updateData.name = name;
            if (occupation !== undefined) updateData.occupation = occupation;
            if (profileImageUrl !== undefined) updateData.profile_image_url = profileImageUrl;
            if (bio !== undefined) updateData.bio = bio;
            if (phone !== undefined) updateData.phone = phone;
            if (location !== undefined) updateData.location = location;

            const { data: updatedUser, error } = await supabase
                .from('users')
                .upsert({
                    id: userId,
                    email: req.user?.email || `${userId}@user.local`,
                    status: 'ACTIVE',
                    ...updateData,
                })
                .select('*')
                .single();

            if (error) {
                console.warn('[UserController] Upsert error, trying update:', error);
                const { data: directUpdated, error: directError } = await supabase
                    .from('users')
                    .update(updateData)
                    .eq('id', userId)
                    .select('*')
                    .single();

                if (directError) {
                    console.error('[UserController] updateProfile error:', directError);
                    throw directError;
                }

                return res.json({
                    id: directUpdated.id,
                    email: directUpdated.email,
                    name: directUpdated.name,
                    status: directUpdated.status || 'ACTIVE',
                    occupation: directUpdated.occupation || null,
                    profileImageUrl: directUpdated.profile_image_url || null,
                    bio: directUpdated.bio || null,
                    phone: directUpdated.phone || null,
                    location: directUpdated.location || null,
                    subscriptionPlan: directUpdated.subscription_plan || 'FREE',
                    createdAt: directUpdated.created_at,
                    updatedAt: directUpdated.updated_at,
                });
            }

            return res.json({
                id: updatedUser.id,
                email: updatedUser.email,
                name: updatedUser.name,
                status: updatedUser.status || 'ACTIVE',
                occupation: updatedUser.occupation || null,
                profileImageUrl: updatedUser.profile_image_url || null,
                bio: updatedUser.bio || null,
                phone: updatedUser.phone || null,
                location: updatedUser.location || null,
                subscriptionPlan: updatedUser.subscription_plan || 'FREE',
                createdAt: updatedUser.created_at,
                updatedAt: updatedUser.updated_at,
            });
        } catch (error) {
            console.error('[UserController] updateProfile error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

