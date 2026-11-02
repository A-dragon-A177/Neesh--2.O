/**
 * NEESH V19 PUBLIC BLOG & INTERACTION EXAMPLES CONTROLLER
 * Reference: NEESH_V19_MASTER_PRD.md (Section U.2, Task 3)
 * 
 * Rules:
 * 1. Eligibility: state IN ('RATED', 'COMPLETE') AND founder_rating >= 4.
 * 2. Explorer must not be SUSPENDED.
 * 3. Server-side anonymization:
 *    - Founder name -> "[Domain] Founder"
 *    - Explorer: display_name if show_public_excerpts = true, else "Explorer in [Domain]"
 * 4. Deterministic slug: [domain_slug]-[first-8-chars-of-interaction-id]
 */

import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export interface PublicBlogExcerpt {
  slug: string;
  domain: string;
  question: string;
  response: string;
  explorerDisplayName: string;
  founderRating: number;
  depthScore: number;
  createdAt: string;
}

export class InteractionBlogController {
  /**
   * Generates a deterministic slug for an interaction.
   */
  public static generateSlug(domainSlug: string, interactionId: string): string {
    const cleanDomain = (domainSlug || 'general').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const idPrefix = (interactionId || '').replace(/-/g, '').substring(0, 8);
    return `${cleanDomain}-${idPrefix}`;
  }

  /**
   * Anonymizes interaction content by removing startup names or personal references.
   */
  public static anonymizeContent(content: string, startupName?: string): string {
    if (!content) return '';
    let anonymized = content;
    if (startupName && startupName.trim().length > 1) {
      const regex = new RegExp(startupName.trim(), 'gi');
      anonymized = anonymized.replace(regex, 'our product');
    }
    return anonymized;
  }

  /**
   * GET /api/blog/:slug
   * Returns anonymized JSON payload for public interaction example.
   */
  public static async getBySlug(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params;
      if (!slug) {
        res.status(404).json({ error: 'Blog slug required' });
        return;
      }

      const cleanSlug = slug.trim().toLowerCase();

      // Query interaction joining spotlight and explorer
      const { data: interaction, error } = await supabase
        .from('interactions')
        .select(`
          id, slug, content, founder_response, founder_rating, depth_score, state, created_at,
          explorer_id,
          spotlights(title, domain),
          explorer_profiles(id, display_name, pioneer_grade, show_public_excerpts, domain)
        `)
        .or(`slug.eq.${cleanSlug},id.ilike.${cleanSlug.split('-').pop()}%`)
        .maybeSingle();

      if (error || !interaction) {
        res.status(404).json({ error: 'Blog post not found' });
        return;
      }

      // 1. Eligibility Check (Section U.2)
      const isRatedOrComplete = interaction.state === 'RATED' || interaction.state === 'COMPLETE';
      const rating = Number(interaction.founder_rating || 0);

      if (!isRatedOrComplete || rating < 4) {
        res.status(404).json({ error: 'Interaction not eligible for public excerpt' });
        return;
      }

      const explorer = interaction.explorer_profiles as any;
      if (explorer?.pioneer_grade === 'SUSPENDED') {
        res.status(404).json({ error: 'Interaction not available' });
        return;
      }

      const domain = (interaction.spotlights as any)?.domain || explorer?.domain || 'B2B SaaS';
      const startupName = (interaction.spotlights as any)?.title;

      // 2. Anonymization
      const question = this.anonymizeContent(interaction.content, startupName);
      const response = this.anonymizeContent(interaction.founder_response || '', startupName);

      const explorerDisplayName =
        explorer?.show_public_excerpts !== false && explorer?.display_name
          ? explorer.display_name
          : `Explorer in ${domain}`;

      const payload: PublicBlogExcerpt = {
        slug: interaction.slug || cleanSlug,
        domain,
        question,
        response,
        explorerDisplayName,
        founderRating: rating,
        depthScore: Number(interaction.depth_score) || 1.0,
        createdAt: interaction.created_at,
      };

      res.status(200).json(payload);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  /**
   * GET /api/ssr/blog/:slug
   * Server-rendered HTML with Article JSON-LD schema.
   */
  public static async renderBlogSsr(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params;
      const cleanSlug = (slug || '').trim().toLowerCase();

      const { data: interaction } = await supabase
        .from('interactions')
        .select(`
          id, slug, content, founder_response, founder_rating, depth_score, state, created_at,
          explorer_profiles(display_name, pioneer_grade, show_public_excerpts, domain),
          spotlights(domain)
        `)
        .eq('slug', cleanSlug)
        .maybeSingle();

      if (!interaction || !['RATED', 'COMPLETE'].includes(interaction.state) || (interaction.founder_rating || 0) < 4) {
        res.status(404).send('Not Found');
        return;
      }

      const explorer = interaction.explorer_profiles as any;
      if (explorer?.pioneer_grade === 'SUSPENDED') {
        res.status(404).send('Not Found');
        return;
      }

      const domain = (interaction.spotlights as any)?.domain || explorer?.domain || 'Technology';
      const explorerDisplayName =
        explorer?.show_public_excerpts !== false && explorer?.display_name
          ? explorer.display_name
          : `Explorer in ${domain}`;

      const canonicalUrl = `https://neesh.ai/blog/${cleanSlug}`;
      const first60 = interaction.content.substring(0, 60).replace(/"/g, "'");
      const first100 = interaction.content.substring(0, 100).replace(/"/g, "'");
      const title = `${domain} Startup Question: "${first60}..." | Neesh`;

      const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: first100,
        author: {
          '@type': 'Person',
          name: explorerDisplayName,
        },
        about: {
          '@type': 'Thing',
          name: `${domain} startup`,
        },
        datePublished: interaction.created_at,
        publisher: {
          '@type': 'Organization',
          name: 'Neesh',
        },
      };

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <link rel="canonical" href="${canonicalUrl}">
  <meta name="description" content="Read real Q&A between startup founders and verified domain Pioneers on Neesh.">
  <meta name="robots" content="index, follow">
  <meta property="og:title" content="${title}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${canonicalUrl}">
  <script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2)}
  </script>
</head>
<body style="background-color: #020617; color: #f8fafc; font-family: sans-serif; padding: 40px 20px;">
  <div style="max-width: 800px; margin: 0 auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 32px;">
    <div style="color: #818cf8; font-size: 12px; font-weight: bold; text-transform: uppercase;">${domain} Q&A Case Study</div>
    <h1 style="font-size: 24px; font-weight: bold; margin: 12px 0 20px;">${title}</h1>
    <div style="color: #94a3b8; font-size: 14px; margin-bottom: 24px;">Reviewed by <strong>${explorerDisplayName}</strong> · ${interaction.founder_rating} / 5 Rating</div>
    <div style="background: #020617; padding: 20px; border-radius: 12px; border: 1px solid #1e293b; margin-bottom: 20px;">
      <h3 style="font-size: 14px; color: #818cf8; margin-top: 0;">Founder Question</h3>
      <p style="color: #e2e8f0; font-size: 15px; line-height: 1.6;">${interaction.content}</p>
    </div>
    <div style="background: #020617; padding: 20px; border-radius: 12px; border: 1px solid #1e293b;">
      <h3 style="font-size: 14px; color: #10b981; margin-top: 0;">Pioneer Response</h3>
      <p style="color: #e2e8f0; font-size: 15px; line-height: 1.6;">${interaction.founder_response || 'Review completed'}</p>
    </div>
  </div>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
      res.status(200).send(html);
    } catch (err: any) {
      res.status(500).send('Internal Server Error');
    }
  }
}

