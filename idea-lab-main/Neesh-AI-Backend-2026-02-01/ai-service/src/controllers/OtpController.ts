import { Request, Response } from 'express';
import { otpService, OtpPurpose } from '../services/OtpService';
import { supabase } from '../config/supabase';

export class OtpController {
    /**
     * Send OTP for SIGNUP or FORGOT_PASSWORD
     */
    async sendOtp(req: Request, res: Response) {
        try {
            const { email, purpose } = req.body;

            if (!email || typeof email !== 'string' || !email.trim()) {
                return res.status(400).json({ success: false, message: 'Email is required.' });
            }

            const cleanEmail = email.trim().toLowerCase();
            const cleanPurpose = (purpose || 'SIGNUP').toUpperCase() as OtpPurpose;

            if (cleanPurpose !== 'SIGNUP' && cleanPurpose !== 'FORGOT_PASSWORD') {
                return res.status(400).json({ success: false, message: 'Invalid purpose. Use SIGNUP or FORGOT_PASSWORD.' });
            }

            const result = await otpService.generateAndSend(cleanEmail, cleanPurpose);
            if (result.success) {
                return res.json(result);
            } else {
                return res.status(400).json(result);
            }
        } catch (error: any) {
            console.error('[OtpController] sendOtp error:', error);
            return res.status(500).json({ success: false, message: 'Internal server error while sending OTP.' });
        }
    }

    /**
     * Verify OTP
     */
    async verifyOtp(req: Request, res: Response) {
        try {
            const { email, otp, purpose } = req.body;

            if (!email || !otp) {
                return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
            }

            const cleanEmail = email.trim().toLowerCase();
            const cleanPurpose = (purpose || 'SIGNUP').toUpperCase() as OtpPurpose;

            const result = otpService.verify(cleanEmail, String(otp), cleanPurpose);
            if (result.success) {
                return res.json(result);
            } else {
                return res.status(400).json(result);
            }
        } catch (error: any) {
            console.error('[OtpController] verifyOtp error:', error);
            return res.status(500).json({ success: false, message: 'Internal server error while verifying OTP.' });
        }
    }

    /**
     * Reset password via OTP
     */
    async resetPassword(req: Request, res: Response) {
        try {
            const { email, otp, newPassword } = req.body;

            if (!email || !otp || !newPassword) {
                return res.status(400).json({ success: false, message: 'Email, OTP, and new password are required.' });
            }

            if (typeof newPassword !== 'string' || newPassword.length < 8) {
                return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
            }

            const cleanEmail = email.trim().toLowerCase();

            // Verify OTP without consuming first
            const isValid = otpService.verifyWithoutConsuming(cleanEmail, String(otp), 'FORGOT_PASSWORD');
            if (!isValid) {
                return res.status(400).json({ success: false, message: 'Invalid or expired OTP. Please request a new one.' });
            }

            // Find user in Supabase Auth
            const { data: usersData, error: listErr } = await supabase.auth.admin.listUsers();
            if (listErr) {
                console.error('[OtpController] listUsers error:', listErr);
                return res.status(500).json({ success: false, message: 'Failed to access user registry.' });
            }

            const user = (usersData?.users || []).find(u => u.email?.toLowerCase() === cleanEmail);
            if (!user) {
                return res.status(404).json({ success: false, message: 'No account found with this email address.' });
            }

            // Update user password via admin API
            const { error: updateErr } = await supabase.auth.admin.updateUserById(user.id, {
                password: newPassword
            });

            if (updateErr) {
                console.error('[OtpController] updateUserById error:', updateErr);
                return res.status(500).json({ success: false, message: updateErr.message || 'Failed to update password.' });
            }

            // Consume OTP after successful password update
            otpService.consume(cleanEmail, 'FORGOT_PASSWORD');
            console.log(`[OtpController] Successfully reset password for ${cleanEmail}`);

            return res.json({ success: true, message: 'Password updated successfully.' });
        } catch (error: any) {
            console.error('[OtpController] resetPassword error:', error);
            return res.status(500).json({ success: false, message: 'Internal server error while resetting password.' });
        }
    }

    /**
     * Direct User Registration via Supabase Admin API
     * Creates auto-confirmed user (email_confirm: true), completely bypassing
     * Supabase client-side email confirmation rate-limiting (429 email rate limit exceeded).
     */
    async directSignup(req: Request, res: Response) {
        try {
            const { email, password, fullName } = req.body;

            if (!email || typeof email !== 'string' || !email.trim()) {
                return res.status(400).json({ success: false, message: 'Email is required.' });
            }
            if (!password || typeof password !== 'string' || password.length < 6) {
                return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
            }

            const cleanEmail = email.trim().toLowerCase();

            // Create user directly in Supabase Auth with email auto-confirmed
            const { data, error } = await supabase.auth.admin.createUser({
                email: cleanEmail,
                password,
                email_confirm: true,
                user_metadata: {
                    full_name: fullName || ''
                }
            });

            if (error) {
                console.warn('[OtpController] directSignup Supabase error:', error.message);
                if (error.message.toLowerCase().includes('already registered') || error.message.toLowerCase().includes('already been registered')) {
                    // Check if existing user exists in user registry
                    const { data: usersData } = await supabase.auth.admin.listUsers();
                    const existingUser = (usersData?.users || []).find(u => u.email?.toLowerCase() === cleanEmail);
                    if (existingUser) {
                        // Confirm email and synchronize password so user can sign in immediately
                        const { data: updated, error: updateErr } = await supabase.auth.admin.updateUserById(existingUser.id, {
                            email_confirm: true,
                            password: password
                        });
                        if (!updateErr) {
                            console.log(`[OtpController] Successfully auto-confirmed existing user: ${cleanEmail}`);
                            return res.json({
                                success: true,
                                message: 'Account verified and ready! Signing you in...',
                                user: updated?.user
                            });
                        }
                    }
                    return res.status(400).json({ success: false, message: 'This email is already registered. Please sign in instead.' });
                }
                return res.status(400).json({ success: false, message: error.message });
            }

            return res.json({
                success: true,
                message: 'Account created successfully! You can now sign in.',
                user: data?.user
            });
        } catch (error: any) {
            console.error('[OtpController] directSignup error:', error);
            return res.status(500).json({ success: false, message: 'Internal server error during account creation.' });
        }
    }

    /**
     * Confirms an unconfirmed user and updates password so they can log in immediately
     * Resolves Supabase "Email not confirmed" error caused by shared email rate limits
     */
    async confirmUser(req: Request, res: Response) {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                return res.status(400).json({ success: false, message: 'Email and password are required.' });
            }

            const cleanEmail = email.trim().toLowerCase();

            // Find user in Supabase Auth
            const { data: usersData, error: listErr } = await supabase.auth.admin.listUsers();
            if (listErr) {
                console.error('[OtpController] confirmUser listUsers error:', listErr);
                return res.status(500).json({ success: false, message: 'Failed to access user registry.' });
            }

            const user = (usersData?.users || []).find(u => u.email?.toLowerCase() === cleanEmail);
            if (!user) {
                return res.status(404).json({ success: false, message: 'No account found with this email.' });
            }

            // Confirm email and set password
            const { data: updated, error: updateErr } = await supabase.auth.admin.updateUserById(user.id, {
                email_confirm: true,
                password: password
            });

            if (updateErr) {
                console.error('[OtpController] confirmUser updateUserById error:', updateErr);
                return res.status(500).json({ success: false, message: updateErr.message });
            }

            console.log(`[OtpController] Auto-confirmed account for ${cleanEmail}`);
            return res.json({
                success: true,
                message: 'Account confirmed successfully!',
                user: updated?.user
            });
        } catch (error: any) {
            console.error('[OtpController] confirmUser error:', error);
            return res.status(500).json({ success: false, message: 'Internal server error confirming account.' });
        }
    }
}
