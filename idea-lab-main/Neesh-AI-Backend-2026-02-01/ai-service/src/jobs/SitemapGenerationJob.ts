/**
 * NEESH V19 SITEMAP GENERATION JOB
 * Reference: NEESH_V19_MASTER_PRD.md (Section AF, Section AV, Task 4)
 * 
 * Schedule: 0 23 * * * (UTC = 05:00 IST)
 * Output: idea-lab-main/public/sitemap.xml
 * 
 * Includes:
 *  - Static pages: /, /for-founders, /for-explorers, /pricing
 *  - Active Pioneer profiles (pioneer_grade != 'SUSPENDED')
 *  - Domain pages (/domain/:slug)
 *  - Eligible public case studies (/blog/:slug)
 * Excludes: /dashboard/*, /onboarding/*, /sprint/*, /admin/*
 */

import fs from 'fs';
import path from 'path';
import { supabase } from '../config/supabase';

export interface SitemapUrlEntry {
  loc: string;
  lastmod?: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: string;
}

export function buildSitemapXml(urls: SitemapUrlEntry[]): string {
  const cappedUrls = urls.slice(0, 50000);
  const urlNodes = cappedUrls
    .map((u) => {
      let node = `  <url>\n    <loc>${u.loc}</loc>\n`;
      if (u.lastmod) {
        node += `    <lastmod>${u.lastmod}</lastmod>\n`;
      }
      node += `    <changefreq>${u.changefreq}</changefreq>\n`;
      node += `    <priority>${u.priority}</priority>\n  </url>`;
      return node;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlNodes}
</urlset>`;
}

export async function runSitemapGenerationJob(): Promise<{
  totalUrls: number;
  writtenPath: string;
}> {
  console.log('[SitemapGenerationJob] Generating sitemap.xml...');

  const urls: SitemapUrlEntry[] = [
    { loc: 'https://neesh.ai/', changefreq: 'daily', priority: '1.0' },
    { loc: 'https://neesh.ai/for-founders', changefreq: 'daily', priority: '0.9' },
    { loc: 'https://neesh.ai/for-explorers', changefreq: 'daily', priority: '0.9' },
    { loc: 'https://neesh.ai/pricing', changefreq: 'weekly', priority: '0.8' },
  ];

  try {
    // 1. Pioneer profiles: WHERE pioneer_grade != 'SUSPENDED'
    const { data: pioneers } = await supabase
      .from('explorer_profiles')
      .select('username, updated_at, pioneer_grade')
      .neq('pioneer_grade', 'SUSPENDED')
      .not('username', 'is', null);

    if (pioneers && pioneers.length > 0) {
      for (const p of pioneers) {
        if (!p.username) continue;
        urls.push({
          loc: `https://neesh.ai/explorer/${encodeURIComponent(p.username)}`,
          lastmod: p.updated_at ? new Date(p.updated_at).toISOString().split('T')[0] : undefined,
          changefreq: 'weekly',
          priority: '0.8',
        });
      }
    }

    // 2. Domains
    const { data: domains } = await supabase.from('domains').select('slug');
    if (domains && domains.length > 0) {
      for (const d of domains) {
        if (!d.slug) continue;
        urls.push({
          loc: `https://neesh.ai/domain/${encodeURIComponent(d.slug)}`,
          changefreq: 'daily',
          priority: '0.7',
        });
      }
    }

    // 3. Eligible Blog Case Studies
    const { data: blogs } = await supabase
      .from('interactions')
      .select('slug, updated_at, created_at, state, founder_rating')
      .in('state', ['RATED', 'COMPLETE'])
      .gte('founder_rating', 4)
      .not('slug', 'is', null);

    if (blogs && blogs.length > 0) {
      for (const b of blogs) {
        if (!b.slug) continue;
        urls.push({
          loc: `https://neesh.ai/blog/${encodeURIComponent(b.slug)}`,
          lastmod: (b.updated_at || b.created_at || '').split('T')[0] || undefined,
          changefreq: 'monthly',
          priority: '0.6',
        });
      }
    }

    const xml = buildSitemapXml(urls);

    // Resolve public/sitemap.xml path
    const candidatePaths = [
      path.resolve(process.cwd(), 'idea-lab-main/public/sitemap.xml'),
      path.resolve(process.cwd(), '../public/sitemap.xml'),
      path.resolve(__dirname, '../../../../public/sitemap.xml'),
    ];

    let targetPath = candidatePaths[0];
    for (const p of candidatePaths) {
      if (fs.existsSync(path.dirname(p))) {
        targetPath = p;
        break;
      }
    }

    fs.writeFileSync(targetPath, xml, 'utf8');
    console.log(`[SitemapGenerationJob] Successfully wrote ${urls.length} URLs to ${targetPath}`);

    return { totalUrls: urls.length, writtenPath: targetPath };
  } catch (err) {
    console.error('[SitemapGenerationJob] Error generating sitemap:', err);
    return { totalUrls: urls.length, writtenPath: '' };
  }
}

