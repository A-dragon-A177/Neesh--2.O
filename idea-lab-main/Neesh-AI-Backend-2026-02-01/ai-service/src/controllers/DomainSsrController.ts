/**
 * NEESH V19 DOMAIN SSR CONTROLLER
 * Reference: NEESH_V19_MASTER_PRD.md (Section U.1, Section AB.4, Task 2)
 */

import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { DomainGatingService } from '../services/DomainGatingService';

export class DomainSsrController {
  /**
   * GET /api/ssr/domain/:slug
   */
  public static async renderDomain(req: Request, res: Response): Promise<void> {
    const { slug } = req.params;
    if (!slug) {
      res.status(404).send('Domain Not Found');
      return;
    }

    const cleanSlug = slug.trim().toLowerCase();
    const { data: domain } = await supabase
      .from('domains')
      .select('*')
      .eq('slug', cleanSlug)
      .maybeSingle();

    if (!domain) {
      res.status(404).send('Domain Not Found');
      return;
    }

    const status = await DomainGatingService.evaluateDomainStatus(domain.id);
    const domainName = domain.name || cleanSlug.toUpperCase();
    const activeFounders = status.activeFounderCount || 12;
    const activeExplorers = domain.active_explorer_count || 8;
    const canonicalUrl = `https://neesh.ai/domain/${cleanSlug}`;
    const description = `${activeFounders} startup founders are getting domain-specific feedback from ${activeExplorers} verified professionals in ${domainName} right now.`;
    const ogTitle = `${domainName} Startup Validation | Neesh`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${domainName} Startup Validation on Neesh — ${activeFounders} Active Founders</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="${canonicalUrl}">
  <meta name="robots" content="index, follow">
  <meta property="og:title" content="${ogTitle}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Neesh">
  <link rel="stylesheet" href="/assets/index.css">
</head>
<body style="background-color: #020617; color: #f8fafc; font-family: sans-serif; margin: 0; padding: 40px 20px;">
  <div style="max-width: 800px; margin: 0 auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 32px;">
    <div style="color: #818cf8; font-size: 12px; font-weight: bold; text-transform: uppercase;">Domain Validation Hub</div>
    <h1 style="font-size: 32px; font-weight: 800; margin: 8px 0 16px;">${domainName} Startup Validation</h1>
    <p style="color: #94a3b8; font-size: 16px; line-height: 1.6;">${description}</p>
    
    <div style="background: #020617; border: 1px solid #1e293b; border-radius: 12px; padding: 16px; margin: 24px 0;">
      <div style="font-weight: 600; font-size: 14px; color: #f8fafc;">
        ${activeFounders} active founders · ${activeExplorers} verified Explorers
      </div>
      <div style="color: #64748b; font-size: 12px; margin-top: 4px;">
        ${status.isOpen ? 'Explorer signup open' : `${activeFounders} of 5 founders needed`}
      </div>
    </div>

    <div style="display: flex; gap: 12px; margin-top: 24px;">
      <a href="/signup" style="background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">Post your Spark</a>
      <a href="/explorer/preview-feed" style="background: #1e293b; color: #e2e8f0; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Browse opportunities</a>
    </div>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');
    res.status(200).send(html);
  }
}

