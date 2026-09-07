import crypto from 'crypto';

export type OtpPurpose = 'SIGNUP' | 'FORGOT_PASSWORD';

interface OtpEntry {
    otp: string;
    createdAt: number;
    purpose: OtpPurpose;
    attempts: number;
}

export interface OtpResult {
    success: boolean;
    message: string;
}

class OtpService {
    private otpStore: Map<string, OtpEntry> = new Map();
    private OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
    private MAX_RESEND_ATTEMPTS = 5;
    private RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute between resends

    private buildKey(email: string, purpose: OtpPurpose): string {
        return `${email.toLowerCase().trim()}:${purpose}`;
    }

    private maskEmail(email: string): string {
        const at = email.indexOf('@');
        if (at <= 2) return email;
        return email.substring(0, 2) + '***' + email.substring(at);
    }

    private generateOtp(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    public async generateAndSend(email: string, purpose: OtpPurpose): Promise<OtpResult> {
        const key = this.buildKey(email, purpose);
        const existing = this.otpStore.get(key);

        if (existing) {
            const elapsed = Date.now() - existing.createdAt;
            if (elapsed < this.RESEND_COOLDOWN_MS) {
                const waitSeconds = Math.ceil((this.RESEND_COOLDOWN_MS - elapsed) / 1000);
                return { success: false, message: `Please wait ${waitSeconds} seconds before requesting a new OTP.` };
            }
            if (existing.attempts >= this.MAX_RESEND_ATTEMPTS) {
                return { success: false, message: 'Too many OTP requests. Please try again later.' };
            }
        }

        const otp = this.generateOtp();
        const attempts = existing ? existing.attempts + 1 : 1;

        this.otpStore.set(key, {
            otp,
            createdAt: Date.now(),
            purpose,
            attempts
        });

        console.log(`[OtpService] ========================================`);
        console.log(`[OtpService] Generated OTP for ${email} (${purpose}): [ ${otp} ]`);
        console.log(`[OtpService] ========================================`);

        // Send email via Resend if RESEND_API_KEY is configured
        const resendApiKey = process.env.RESEND_API_KEY;
        const resendFrom = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

        if (resendApiKey) {
            try {
                const subject = purpose === 'SIGNUP' ? 'Neesh AI - Verify Your Email' : 'Neesh AI - Password Reset OTP';
                const htmlBody = `
                    <div style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #ffffff;">
                        <div style="text-align: center; margin-bottom: 32px;">
                            <h1 style="color: #1a1a2e; font-size: 24px; font-weight: 700; margin: 0;">Neesh AI</h1>
                        </div>
                        <div style="background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); border-radius: 16px; padding: 32px; text-align: center; margin-bottom: 24px;">
                            <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 0 0 16px;">Your verification code is</p>
                            <div style="background: rgba(255,255,255,0.2); border-radius: 12px; padding: 16px; display: inline-block; letter-spacing: 12px; font-size: 32px; font-weight: 700; color: #ffffff;">
                                ${otp}
                            </div>
                        </div>
                        <p style="color: #666; font-size: 14px; line-height: 1.6; text-align: center;">
                            This code expires in <strong>10 minutes</strong>. Do not share it with anyone.
                        </p>
                    </div>
                `;

                const res = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${resendApiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        from: `Neesh AI <${resendFrom}>`,
                        to: [email],
                        subject,
                        html: htmlBody
                    })
                });

                if (!res.ok) {
                    const errText = await res.text();
                    console.warn(`[OtpService] Resend email rejected: ${errText}`);
                } else {
                    console.log(`[OtpService] OTP email successfully sent to ${email}`);
                }
            } catch (err: any) {
                console.error(`[OtpService] Error sending email via Resend:`, err?.message || err);
            }
        }

        return { success: true, message: `OTP sent to ${this.maskEmail(email)}` };
    }

    public verify(email: string, otp: string, purpose: OtpPurpose): OtpResult {
        const key = this.buildKey(email, purpose);
        const entry = this.otpStore.get(key);

        if (!entry) {
            return { success: false, message: 'No OTP found. Please request a new one.' };
        }

        if (Date.now() - entry.createdAt > this.OTP_EXPIRY_MS) {
            this.otpStore.delete(key);
            return { success: false, message: 'OTP has expired. Please request a new one.' };
        }

        if (entry.purpose !== purpose) {
            return { success: false, message: 'Invalid OTP for this operation.' };
        }

        if (entry.otp !== otp.trim()) {
            return { success: false, message: 'Incorrect OTP. Please try again.' };
        }

        this.otpStore.delete(key);
        console.log(`[OtpService] OTP verified successfully for ${email} (${purpose})`);
        return { success: true, message: 'OTP verified successfully.' };
    }

    public verifyWithoutConsuming(email: string, otp: string, purpose: OtpPurpose): boolean {
        const key = this.buildKey(email, purpose);
        const entry = this.otpStore.get(key);

        if (!entry) return false;
        if (Date.now() - entry.createdAt > this.OTP_EXPIRY_MS) return false;
        if (entry.purpose !== purpose) return false;
        return entry.otp === otp.trim();
    }

    public consume(email: string, purpose: OtpPurpose): void {
        this.otpStore.delete(this.buildKey(email, purpose));
    }
}

export const otpService = new OtpService();
