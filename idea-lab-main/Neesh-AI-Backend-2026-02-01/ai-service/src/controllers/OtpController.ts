import { Request, Response } from 'express';
import { otpService, OtpPurpose } from '../services/OtpService';
import { supabase } from '../config/supabase';

// RFC 5322 compliant basic email regex
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export class OtpController {
    /**
     * Send OTP for SIGNUP or FORGOT_PASSWORD
     */
    async sendOtp(req: Request, res: Response) {
        try {
            const { email, purpose } = req.body;

            if (!email || typeof email !== 'string' || !email.trim()) {
                return res.status(400).json({ success: false, message: 'Valid email is required.' });
            }

            const cleanEmail = email.trim().toLowerCase();
            if (!EMAIL_REGEX.test(cleanEmail) || cleanEmail.length > 255) {
                return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
            }

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

            if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
                return res.status(400).json({ success: false, message: 'Password must be between 8 and 128 characters.' });
            }

            const cleanEmail = email.trim().toLowerCase();
            if (!EMAIL_REGEX.test(cleanEmail)) {
                return res.status(400).json({ success: false, message: 'Invalid email address.' });
            }

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
     * 
     * Security Hardening (P0 Fix):
     * - Strict input validation on email (RFC 5322), password (8-128 chars), and role.
     * - Rate-limited to max 5 attempts/hour/IP via signupRateLimiter.
     * - CRITICAL: Never overwrites an existing user's password or account state.
     * - Role is strictly locked to FOUNDER or EXPLORER. Cannot register as ADMIN.
     */
    async directSignup(req: Request, res: Response) {
        try {
            const { email, password, fullName, role } = req.body;

            // 1. Strict Input Validation
            if (!email || typeof email !== 'string' || !email.trim()) {
                return res.status(400).json({ success: false, message: 'Email is required.' });
            }
            const cleanEmail = email.trim().toLowerCase();
            if (!EMAIL_REGEX.test(cleanEmail) || cleanEmail.length > 255) {
                return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
            }

            if (!password || typeof password !== 'string' || password.length < 8) {
                return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
            }
            if (password.length > 128) {
                return res.status(400).json({ success: false, message: 'Password must not exceed 128 characters.' });
            }

            const cleanFullName = typeof fullName === 'string' ? fullName.trim().slice(0, 100) : '';

            // Assign V19 canonical role (strictly FOUNDER or EXPLORER; public signup cannot create ADMIN)
            let assignedRole = 'FOUNDER';
            if (typeof role === 'string' && role.toUpperCase().trim() === 'EXPLORER') {
                assignedRole = 'EXPLORER';
            }

            // 2. Create user directly in Supabase Auth
            const { data, error } = await supabase.auth.admin.createUser({
                email: cleanEmail,
                password,
                email_confirm: true,
                user_metadata: {
                    full_name: cleanFullName,
                    role: assignedRole
                }
            });

            if (error) {
                console.warn('[OtpController] directSignup error:', error.message);
                const isDuplicate = error.message.toLowerCase().includes('already registered') || 
                                    error.message.toLowerCase().includes('already been registered') ||
                                    error.message.toLowerCase().includes('email exists');
                
                if (isDuplicate) {
                    // SAFE REJECTION: Do NOT touch or overwrite existing user's account or password
                    return res.status(409).json({ 
                        success: false, 
                        message: 'This email is already registered. Please sign in instead.' 
                    });
                }
                return res.status(400).json({ success: false, message: error.message });
            }

            return res.status(201).json({
                success: true,
                message: 'Account created successfully! You can now sign in.',
                user: {
                    id: data?.user?.id,
                    email: data?.user?.email,
                    role: assignedRole
                }
            });
        } catch (error: any) {
            console.error('[OtpController] directSignup unexpected error:', error);
            return res.status(500).json({ success: false, message: 'Internal server error during account creation.' });
        }
    }

    /**
     * Admin-only user confirmation.
     * Unauthenticated public confirmation endpoint is removed (P0 Fix).
     * If called without valid admin JWT, returns 401 Unauthorized.
     */
    async confirmUser(req: Request, res: Response) {
        // Enforce admin-only authentication
        if (!req.user || req.user.role !== 'ADMIN') {
            return res.status(401).json({ 
                error: 'Unauthorized', 
                message: 'Admin authorization required to confirm accounts.' 
            });
        }

        try {
            const { email } = req.body;
            if (!email) {
                return res.status(400).json({ success: false, message: 'Email is required.' });
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

            // Confirm email WITHOUT changing password
            const { data: updated, error: updateErr } = await supabase.auth.admin.updateUserById(user.id, {
                email_confirm: true
            });

            if (updateErr) {
                console.error('[OtpController] confirmUser updateUserById error:', updateErr);
                return res.status(500).json({ success: false, message: updateErr.message });
            }

            console.log(`[OtpController] Admin confirmed account for ${cleanEmail} by admin ${req.user.id}`);
            return res.json({
                success: true,
                message: 'Account confirmed successfully by administrator.',
                user: {
                    id: updated?.user?.id,
                    email: updated?.user?.email
                }
            });
        } catch (error: any) {
            console.error('[OtpController] confirmUser error:', error);
            return res.status(500).json({ success: false, message: 'Internal server error confirming account.' });
        }
    }
}
