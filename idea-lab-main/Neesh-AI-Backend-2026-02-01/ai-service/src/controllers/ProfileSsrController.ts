/**
 * NEESH V19 PIONEER PROFILE SSR CONTROLLER
 * Reference: NEESH_V19_MASTER_PRD.md (Section AB.4, Section AV.2)
 * 
 * Rules:
 * 1. Active Explorer -> HTTP 200 with full server-rendered HTML and meta tags.
 * 2. Suspended / deleted / unverified / non-existent -> HTTP 404 (prevents account enumeration).
 * 3. No PII: Never expose email, LinkedIn auth token, or internal user IDs.
 */

import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export class ProfileSsrController {
  /**
   * GET /explorer/:username and GET /api/ssr/explorer/:username
   */
  public static async renderProfile(req: Request, res: Response): Promise<void> {
    const { username } = req.params;

    if (!username) {
      res.status(404).send('Not Found');
      return;
    }

    const cleanUsername = username.trim().toLowerCase();

    // Query explorer profile with domain
    const { data: profile, error } = await supabase
      .from('explorer_profiles')
      .select('id, username, display_name, pioneer_grade, pioneer_points, verified_interaction_count, avg_founder_rating, bio, linkedin_verified, show_employer_name, domain_id, domains(name, slug)')
      .eq('username', cleanUsername)
      .maybeSingle();

    if (error || !profile) {
      res.status(404).send('Profile Not Found');
      return;
    }

    // Suspended, unverified, or non-active accounts return HTTP 404 (Section AB.4)
    if (
      profile.pioneer_grade === 'SUSPENDED' ||
      profile.pioneer_grade === 'DELETED' ||
      !profile.linkedin_verified
    ) {
      res.status(404).send('Profile Not Found');
      return;
    }

    const domainName = (profile.domains as any)?.name || 'Innovation';
    const displayName = profile.display_name || cleanUsername;
    const grade = profile.pioneer_grade || 'SEED';
    const interactionsCount = profile.verified_interaction_count || 0;
    const canonicalUrl = `https://neesh.ai/explorer/${cleanUsername}`;
    const description = `${displayName} has completed ${interactionsCount} verified startup interactions in ${domainName}. Pioneer Grade: ${grade}.`;

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: displayName,
      url: canonicalUrl,
      jobTitle: `${grade} Explorer`,
      knowsAbout: domainName,
    };

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(displayName)} — ${escapeHtml(grade)} Explorer in ${escapeHtml(domainName)} | Neesh</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${canonicalUrl}" />

  <!-- OpenGraph -->
  <meta property="og:title" content="${escapeHtml(displayName)} — Pioneer Profile | Neesh" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:type" content="profile" />
  <meta property="og:site_name" content="Neesh" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${escapeHtml(displayName)} — Pioneer Profile | Neesh" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />

  <!-- JSON-LD -->
  <script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2)}
  </script>
</head>
<body class="neesh-pioneer-profile">
  <div id="ssr-root">
    <header>
      <h1>${escapeHtml(displayName)}</h1>
      <p class="badge">${escapeHtml(grade)} Pioneer in ${escapeHtml(domainName)}</p>
    </header>
    <main>
      <section class="stats">
        <div><strong>${interactionsCount}</strong> verified interactions</div>
        <div><strong>${profile.avg_founder_rating || '0.00'}</strong> average rating</div>
        <div><strong>${profile.pioneer_points || 0}</strong> Pioneer Points</div>
      </section>
      ${profile.bio ? `<section class="bio"><p>${escapeHtml(profile.bio)}</p></section>` : ''}
    </main>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
    res.status(200).send(html);
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
