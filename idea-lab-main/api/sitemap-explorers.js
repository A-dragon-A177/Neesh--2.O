// Vercel Edge Function — Pioneer Profiles XML Sitemap
//
// Generates a sitemap.xml that lists every active, LinkedIn-verified
// Pioneer profile (/explorer/:username), so search engines can discover
// and index individual Pioneer pages.

export const config = {
  runtime: "edge",
};

// ── Fetch all active Pioneer profiles from the backend ───────────────
async function fetchAllProfiles(backendUrl) {
  const allProfiles = [];
  let offset = 0;
  const limit = 200; // Max per page (backend caps at 500)
  const maxPages = 25; // Safety limit: 5000 profiles max

  for (let page = 0; page < maxPages; page++) {
    try {
      const res = await fetch(
        `${backendUrl}/api/public/explorer-profiles?limit=${limit}&offset=${offset}`,
        {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(8000),
        }
      );

      if (!res.ok) break;

      const profiles = await res.json();
      if (!Array.isArray(profiles) || profiles.length === 0) break;

      allProfiles.push(...profiles);
      offset += profiles.length;

      if (profiles.length < limit) break;
    } catch (err) {
      console.error("[Sitemap-Explorers] Error fetching profiles:", err);
      break;
    }
  }

  return allProfiles;
}

// ── Generate sitemap XML ─────────────────────────────────────────────
function generateSitemapXml(siteUrl, profiles) {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD fallback

  let urls = "";

  for (const profile of profiles) {
    const lastmod = profile.updated_at
      ? profile.updated_at.split("T")[0]
      : today;

    urls += `
  <url>
    <loc>${siteUrl}/@${encodeURIComponent(profile.username)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
    <lastmod>${lastmod}</lastmod>
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

  const profiles = await fetchAllProfiles(backendUrl);

  const xml = generateSitemapXml(siteUrl, profiles);

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
