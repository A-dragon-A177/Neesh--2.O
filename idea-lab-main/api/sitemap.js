// Vercel Edge Function — Dynamic XML Sitemap
//
// Generates a sitemap.xml that includes:
// 1. Static pages (homepage, features, pricing, etc.)
// 2. All published project pitch pages (/p/:slug-:uuid)
//
// This helps search engines discover and index all public content.

export const config = {
  runtime: "edge",
};

// ── Static pages with their change frequency and priority ────────────
const STATIC_PAGES = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/features", changefreq: "monthly", priority: "0.8" },
  { path: "/pricing", changefreq: "monthly", priority: "0.7" },
  { path: "/spotlight-info", changefreq: "monthly", priority: "0.6" },
  { path: "/space", changefreq: "daily", priority: "0.9" },
  { path: "/pitches", changefreq: "daily", priority: "0.8" },
  { path: "/login", changefreq: "yearly", priority: "0.3" },
  { path: "/signup", changefreq: "yearly", priority: "0.4" },
];

// ── Slugify helper (mirrors src/lib/slugify.ts) ──────────────────────
function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ── Fetch all published pitches from the backend ─────────────────────
async function fetchAllPitches(backendUrl) {
  const allPitches = [];
  let offset = 0;
  const limit = 100; // Fetch in batches
  const maxPages = 50; // Safety limit: 5000 projects max

  for (let page = 0; page < maxPages; page++) {
    try {
      const res = await fetch(
        `${backendUrl}/api/public/pitches?limit=${limit}&offset=${offset}`,
        {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(8000),
        }
      );

      if (!res.ok) break;

      const pitches = await res.json();
      if (!Array.isArray(pitches) || pitches.length === 0) break;

      allPitches.push(...pitches);
      offset += pitches.length;

      // If we got fewer than the limit, we've reached the end
      if (pitches.length < limit) break;
    } catch (err) {
      console.error("[Sitemap] Error fetching pitches:", err);
      break;
    }
  }

  return allPitches;
}

// ── Generate sitemap XML ─────────────────────────────────────────────
function generateSitemapXml(siteUrl, pitches) {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  let urls = "";

  // Static pages
  for (const page of STATIC_PAGES) {
    urls += `
  <url>
    <loc>${siteUrl}${page.path}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
    <lastmod>${today}</lastmod>
  </url>`;
  }

  // Dynamic pitch pages
  for (const pitch of pitches) {
    const slug = pitch.slug ? slugify(pitch.slug) : "";
    const slugPath = slug ? `${slug}-${pitch.projectId}` : pitch.projectId;

    urls += `
  <url>
    <loc>${siteUrl}/p/${slugPath}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
    <lastmod>${today}</lastmod>
  </url>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

// ── Main handler ─────────────────────────────────────────────────────
export default async function handler(request) {
  const url = new URL(request.url);
  const siteUrl = url.origin;

  const backendUrl = (
    process.env.VITE_BACKEND_URL ||
    process.env.BACKEND_URL ||
    "http://localhost:8082"
  ).replace(/\/+$/, "");

  // Fetch all published pitches
  const pitches = await fetchAllPitches(backendUrl);

  // Generate XML
  const xml = generateSitemapXml(siteUrl, pitches);

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // Cache for 1 hour, revalidate in background
      "Cache-Control":
        "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
