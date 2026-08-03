// Vercel Edge Function — sitemap-core.xml for static & qualified category routes
export const config = {
  runtime: "edge",
};

const STATIC_ROUTES = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/features", changefreq: "weekly", priority: "0.8" },
  { path: "/pricing", changefreq: "weekly", priority: "0.8" },
  { path: "/spotlight-info", changefreq: "monthly", priority: "0.6" },
  { path: "/space", changefreq: "daily", priority: "0.9" },
  { path: "/ideas", changefreq: "daily", priority: "0.9" },
  { path: "/pitches", changefreq: "daily", priority: "0.8" },
  { path: "/login", changefreq: "monthly", priority: "0.4" },
  { path: "/signup", changefreq: "monthly", priority: "0.5" },
];

const CATEGORIES = [
  { slug: "ai-tools", keywords: ["ai", "machine learning", "llm", "gpt", "bot", "neural", "agent"] },
  { slug: "saas", keywords: ["saas", "software", "b2b", "cloud", "platform", "crm", "analytics"] },
  { slug: "fintech", keywords: ["fintech", "finance", "bank", "crypto", "pay", "money", "invest"] },
  { slug: "creator-economy", keywords: ["creator", "media", "video", "content", "stream", "social"] },
  { slug: "health-wellness", keywords: ["health", "wellness", "medical", "fit", "bio", "mental"] },
  { slug: "developer-tools", keywords: ["dev", "developer", "code", "api", "git", "database", "infrastructure"] },
  { slug: "niche-apps", keywords: ["niche", "app", "consumer", "mobile", "productivity", "other"] },
];

function getCategorySlug(project) {
  const rawIndustry = (project.industry || "").toLowerCase();
  const text = `${project.title || ""} ${project.oneLineSummary || ""} ${rawIndustry}`.toLowerCase();

  for (const cat of CATEGORIES) {
    if (rawIndustry.includes(cat.slug)) return cat.slug;
    for (const kw of cat.keywords) {
      if (text.includes(kw)) return cat.slug;
    }
  }
  return "niche-apps";
}

export default async function handler(request) {
  const url = new URL(request.url);
  const siteUrl = (process.env.SITE_URL || url.origin).replace(/\/+$/, "");
  const backendUrl = (process.env.VITE_BACKEND_URL || "https://neesh-backend-1036329841804.asia-south1.run.app").replace(/\/+$/, "");
  const today = new Date().toISOString().split("T")[0];

  // 1. Fetch published pitches to evaluate category thresholds
  let categoryCounts = {};
  try {
    const res = await fetch(`${backendUrl}/api/public/pitches?limit=100&offset=0`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) {
      const data = await res.json();
      const pitches = Array.isArray(data) ? data : data.content || [];
      pitches.forEach((p) => {
        const catSlug = getCategorySlug(p);
        categoryCounts[catSlug] = (categoryCounts[catSlug] || 0) + 1;
      });
    }
  } catch (err) {
    console.warn("[Sitemap Core] Error fetching pitches for category threshold check:", err);
  }

  // 2. Build routes list
  const routes = [...STATIC_ROUTES];

  // 3. Include category sub-pages ONLY if count >= 15
  CATEGORIES.forEach((cat) => {
    const count = categoryCounts[cat.slug] || 0;
    if (count >= 15) {
      routes.push({
        path: `/ideas/${cat.slug}`,
        changefreq: "daily",
        priority: "0.8",
      });
    }
  });

  const urls = routes
    .map(
      (route) => `  <url>
    <loc>${siteUrl}${route.path}</loc>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
    <lastmod>${today}</lastmod>
  </url>`
    )
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
