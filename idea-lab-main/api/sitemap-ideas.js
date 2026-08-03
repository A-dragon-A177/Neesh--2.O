// Vercel Edge Function — sitemap-ideas.xml for dynamic published pitch pages
//
// Automatically fetches all published pitches from the backend database.
// When an idea is unpublished or deleted from the database, it is automatically
// excluded from this XML sitemap on revalidation.

export const config = {
  runtime: "edge",
};

function slugify(text) {
  if (!text) return "";
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function fetchPublishedPitches(backendUrl) {
  const publishedPitches = [];
  let offset = 0;
  const limit = 100;
  const maxPages = 50;

  for (let page = 0; page < maxPages; page++) {
    try {
      const res = await fetch(
        `${backendUrl}/api/public/pitches?limit=${limit}&offset=${offset}`,
        {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(5000),
        }
      );

      if (!res.ok) break;

      const pitches = await res.json();
      if (!Array.isArray(pitches) || pitches.length === 0) break;

      publishedPitches.push(...pitches);
      offset += pitches.length;

      if (pitches.length < limit) break;
    } catch (err) {
      console.warn("[sitemap-ideas] Backend fetch warning:", err);
      break;
    }
  }

  return publishedPitches;
}

export default async function handler(request) {
  const url = new URL(request.url);
  const siteUrl = (process.env.SITE_URL || url.origin).replace(/\/+$/, "");

  const backendUrl = (
    process.env.VITE_BACKEND_URL ||
    process.env.BACKEND_URL ||
    "http://localhost:8082"
  ).replace(/\/+$/, "");

  const pitches = await fetchPublishedPitches(backendUrl);
  const today = new Date().toISOString().split("T")[0];

  const urls = pitches
    .map((pitch) => {
      const slug = pitch.slug ? slugify(pitch.slug) : "";
      const slugPath = slug ? `${slug}-${pitch.projectId}` : pitch.projectId;
      return `  <url>
    <loc>${siteUrl}/p/${slugPath}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
    <lastmod>${today}</lastmod>
  </url>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
