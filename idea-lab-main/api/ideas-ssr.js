// Vercel Edge Function — Server-Side Pre-Rendering for /ideas and /ideas/:category
export const config = {
  runtime: "edge",
};

// ── Category Mapping & Auto-Tagging ──────────────────────────────────
const CATEGORIES = [
  { slug: "ai-tools", name: "AI Tools", keywords: ["ai", "machine learning", "llm", "gpt", "bot", "neural", "agent"] },
  { slug: "saas", name: "SaaS", keywords: ["saas", "software", "b2b", "cloud", "platform", "crm", "analytics"] },
  { slug: "fintech", name: "Fintech", keywords: ["fintech", "finance", "bank", "crypto", "pay", "money", "invest"] },
  { slug: "creator-economy", name: "Creator Economy", keywords: ["creator", "media", "video", "content", "stream", "social"] },
  { slug: "health-wellness", name: "Health & Wellness", keywords: ["health", "wellness", "medical", "fit", "bio", "mental"] },
  { slug: "developer-tools", name: "Developer Tools", keywords: ["dev", "developer", "code", "api", "git", "database", "infrastructure"] },
  { slug: "niche-apps", name: "Niche Apps", keywords: ["niche", "app", "consumer", "mobile", "productivity", "other"] }
];

function getCategoryFromProject(project) {
  const rawIndustry = (project.industry || "").toLowerCase();
  const text = `${project.title || ""} ${project.oneLineSummary || ""} ${project.introduction || ""} ${rawIndustry}`.toLowerCase();

  for (const cat of CATEGORIES) {
    if (rawIndustry && cat.name.toLowerCase() === rawIndustry) return cat;
    for (const kw of cat.keywords) {
      if (text.includes(kw)) return cat;
    }
  }
  return CATEGORIES[CATEGORIES.length - 1]; // Default fallback
}

function truncate(str, maxLen) {
  if (!str) return "";
  const clean = str.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  if (clean.length <= maxLen) return clean;
  return clean.slice(0, maxLen).trim() + "...";
}

function slugify(text) {
  return (text || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function generateSnippet(project) {
  const raw = project.oneLineSummary || project.introduction || project.description || "";
  const clean = truncate(raw, 300);
  if (clean && clean.length >= 100) return clean;

  const cat = getCategoryFromProject(project);
  return `${project.title || "This startup idea"} is an early-stage concept in the ${cat.name} category. Potential users can explore product capabilities, view pitch video reels, and interact with a context-trained AI chatbot to evaluate positioning and submit direct audience feedback.`;
}

// ── Fetch Pitches from Backend API ──────────────────────────────────
const FALLBACK_PITCHES = [
  {
    projectId: "c7e3f37b-90fe-4d68-a2a7-bca5d2800f27",
    title: "AI Niche Validator",
    slug: "ai-niche-validator",
    industry: "AI Tools",
    startupStage: "MVP",
    oneLineSummary: "Validate raw SaaS concepts by auto-generating Spotlight pages, 30s pitch reels, and context-trained AI chatbots that surface customer confusion gaps.",
    introduction: "AI Niche Validator helps founders test startup concepts before writing source code.",
  },
  {
    projectId: "8f2a1b9c-3d4e-5f6a-7b8c-9d0e1f2a3b4c",
    title: "Autonomous Drone Delivery",
    slug: "autonomous-drone-delivery",
    industry: "Developer Tools",
    startupStage: "Idea",
    oneLineSummary: "Last-mile autonomous logistics for local pharmacy and medical dispatch using lightweight quadcopters and automated landing pads.",
    introduction: "Autonomous Drone Delivery reduces delivery times for urgent medical supplies.",
  },
  {
    projectId: "9a8b7c6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d",
    title: "Fintech Micro-Invest",
    slug: "fintech-micro-invest",
    industry: "Fintech",
    startupStage: "Beta",
    oneLineSummary: "Automated spare-change investment engine that routes round-ups into diversified tech indexes and high-yield treasury vaults.",
    introduction: "Fintech Micro-Invest empowers everyday retail investors to build wealth passively.",
  }
];

async function fetchPublishedPitches(backendUrl) {
  try {
    const res = await fetch(`${backendUrl}/api/public/pitches?limit=100&offset=0`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return FALLBACK_PITCHES;
    const data = await res.json();
    const list = Array.isArray(data) ? data : data.content || [];
    return list.length > 0 ? list : FALLBACK_PITCHES;
  } catch (err) {
    console.warn("[Ideas SSR] Error fetching pitches from backend, using fallbacks:", err);
    return FALLBACK_PITCHES;
  }
}

// ── Edge Handler ────────────────────────────────────────────────────
export default async function handler(request) {
  const url = new URL(request.url);
  const siteUrl = (process.env.SITE_URL || url.origin).replace(/\/+$/, "");
  const backendUrl = (process.env.VITE_BACKEND_URL || "https://neesh-backend-1036329841804.asia-south1.run.app").replace(/\/+$/, "");

  const categoryParam = url.searchParams.get("category") || "";
  const pageParam = parseInt(url.searchParams.get("page") || "1", 10);
  const itemsPerPage = 20;

  // 1. Fetch published pitches
  const pitches = await fetchPublishedPitches(backendUrl);

  // 2. Categorize all pitches
  const categorizedPitches = pitches.map((p) => ({
    ...p,
    categoryObj: getCategoryFromProject(p),
  }));

  // Count per category
  const categoryCounts = {};
  CATEGORIES.forEach((cat) => {
    categoryCounts[cat.slug] = categorizedPitches.filter((p) => p.categoryObj.slug === cat.slug).length;
  });

  // Determine current view mode
  const currentCategory = CATEGORIES.find((c) => c.slug === categoryParam);
  const isCategoryView = !!currentCategory;

  let filteredPitches = categorizedPitches;
  if (isCategoryView) {
    filteredPitches = categorizedPitches.filter((p) => p.categoryObj.slug === currentCategory.slug);
  }

  const totalCount = filteredPitches.length;
  const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;
  const currentPage = Math.max(1, Math.min(pageParam, totalPages));
  const pageItems = filteredPitches.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // 3. Indexing & Canonical Rules
  // Threshold Rule: Category pages ONLY get indexed if category count >= 15
  const isIndexed = !isCategoryView || totalCount >= 15;
  const robotsMeta = isIndexed
    ? `<meta name="robots" content="index, follow" />`
    : `<meta name="robots" content="noindex, follow" /><meta name="googlebot" content="noindex, follow" />`;

  const title = isCategoryView
    ? `${currentCategory.name} Startup Ideas & Projects | Neesh AI Directory`
    : `Startup Ideas Directory & Validated Pitch Reels | Neesh AI`;

  const description = isCategoryView
    ? `Explore ${totalCount} published ${currentCategory.name} startup concepts on Neesh AI. View elevator pitch reels, test positioning, and chat with AI founders.`
    : `Browse all published startup ideas on Neesh AI. Filter by industry, view elevator pitch reels, interact with AI chatbots, and validate startup concepts.`;

  const canonicalUrl = isCategoryView
    ? `${siteUrl}/ideas/${currentCategory.slug}`
    : `${siteUrl}/ideas`;

  // 4. Render HTML Cards
  const cardsHtml = pageItems.length > 0
    ? pageItems.map((item) => {
        const itemSlug = item.slug ? slugify(item.slug) : slugify(item.title);
        const itemPath = itemSlug ? `/p/${itemSlug}-${item.projectId}` : `/p/${item.projectId}`;
        const itemTitle = escapeHtml(item.title || "Untitled Startup Idea");
        const snippet = escapeHtml(generateSnippet(item));
        const catName = escapeHtml(item.categoryObj.name);

        return `
          <article style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:1.5rem;box-shadow:0 1px 3px rgba(0,0,0,0.05);display:flex;flex-direction:column;justify-content:space-between;">
            <div>
              <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem;">
                <span style="background:#e0f2fe;color:#0369a1;font-size:0.75rem;font-weight:700;padding:0.2rem 0.6rem;border-radius:9999px;text-transform:uppercase;">${catName}</span>
                ${item.startupStage ? `<span style="background:#f1f5f9;color:#64748b;font-size:0.75rem;font-weight:600;padding:0.2rem 0.6rem;border-radius:9999px;">${escapeHtml(item.startupStage)}</span>` : ""}
              </div>
              <h2 style="font-size:1.25rem;font-weight:700;color:#0f172a;margin-bottom:0.5rem;line-height:1.3;">
                <a href="${itemPath}" style="color:#0f172a;text-decoration:none;hover:text-[#09daed];">${itemTitle}</a>
              </h2>
              <p style="color:#475569;font-size:0.95rem;line-height:1.6;margin-bottom:1.25rem;">
                ${snippet}
              </p>
            </div>
            <div>
              <a href="${itemPath}" style="display:inline-block;background:#0f172a;color:#ffffff;font-size:0.85rem;font-weight:600;padding:0.5rem 1rem;border-radius:6px;text-decoration:none;">View Pitch &amp; Chatbot &rarr;</a>
            </div>
          </article>
        `;
      }).join("\n")
    : `
      <div style="grid-column:1/-1;text-align:center;padding:3rem;background:#f8fafc;border-radius:12px;border:1px dashed #cbd5e1;">
        <h3 style="font-size:1.2rem;color:#475569;margin-bottom:0.5rem;">No published ideas found in this category yet.</h3>
        <p style="color:#64748b;font-size:0.95rem;"><a href="/signup" style="color:#09daed;font-weight:bold;text-decoration:none;">Be the first founder to publish a pitch in ${isCategoryView ? escapeHtml(currentCategory.name) : "this directory"} &rarr;</a></p>
      </div>
    `;

  // 5. Category Navigation Links
  const categoryPillsHtml = CATEGORIES.map((cat) => {
    const isActive = isCategoryView && currentCategory.slug === cat.slug;
    const href = `/ideas/${cat.slug}`;
    const count = categoryCounts[cat.slug] || 0;
    const bg = isActive ? "#09daed" : "#f1f5f9";
    const color = isActive ? "#0f172a" : "#475569";
    return `<a href="${href}" style="background:${bg};color:${color};font-weight:600;font-size:0.85rem;padding:0.4rem 0.85rem;border-radius:9999px;text-decoration:none;display:inline-flex;align-items:center;gap:0.35rem;">${escapeHtml(cat.name)} <span style="opacity:0.75;font-size:0.75rem;">(${count})</span></a>`;
  }).join("\n");

  // 6. Build Full SSR HTML Output
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="icon" type="image/png" href="/favicon.png" />
  <title>${escapeHtml(title)}</title>
  <meta name="title" content="${escapeHtml(title)}" />
  <meta name="description" content="${escapeHtml(description)}" />
  ${robotsMeta}
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${siteUrl}/og-default.png" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${siteUrl}/og-default.png" />
</head>
<body style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;background:#f8fafc;color:#0f172a;">
  <div id="root">
    <!-- Server-rendered static HTML for crawlers -->
    <header style="background:#0f172a;color:#fff;padding:1rem 1.5rem;">
      <nav aria-label="Main navigation" style="max-width:1100px;margin:0 auto;display:flex;gap:1.5rem;align-items:center;">
        <a href="/" style="color:#09daed;font-weight:bold;text-decoration:none;font-size:1.1rem;">Neesh AI</a>
        <a href="/ideas" style="color:#ffffff;font-weight:600;text-decoration:none;font-size:0.95rem;">Ideas Directory</a>
        <a href="/space" style="color:#94a3b8;text-decoration:none;font-size:0.95rem;">Pitches Space</a>
        <a href="/features" style="color:#94a3b8;text-decoration:none;font-size:0.95rem;">Features</a>
        <a href="/pricing" style="color:#94a3b8;text-decoration:none;font-size:0.95rem;">Pricing</a>
      </nav>
    </header>

    <main style="max-width:1100px;margin:2.5rem auto;padding:0 1.5rem;">
      <div style="margin-bottom:2rem;">
        <nav aria-label="Breadcrumbs" style="font-size:0.85rem;color:#64748b;margin-bottom:1rem;">
          <a href="/" style="color:#09daed;text-decoration:none;">Home</a> &gt;
          <a href="/ideas" style="color:#09daed;text-decoration:none;">Ideas</a>
          ${isCategoryView ? ` &gt; <span>${escapeHtml(currentCategory.name)}</span>` : ""}
        </nav>

        <h1 style="font-size:2.25rem;font-weight:800;color:#0f172a;line-height:1.2;margin-bottom:0.75rem;">
          ${isCategoryView ? escapeHtml(currentCategory.name) + " Startup Ideas" : "Startup Ideas Directory"}
        </h1>
        <p style="color:#475569;font-size:1.1rem;max-width:750px;line-height:1.6;margin-bottom:1.5rem;">
          ${isCategoryView ? `Browse published ${escapeHtml(currentCategory.name)} concepts. Interact with trained AI chatbots and view 30-60 second elevator pitch reels.` : "Discover validated startup concepts across AI, SaaS, Fintech, Creator Economy, and Developer Tools. Interact with custom AI chatbots and view short-form elevator pitch reels."}
        </p>

        <!-- Category Filters -->
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;align-items:center;padding:1rem 0;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">
          <span style="font-size:0.85rem;font-weight:700;color:#64748b;margin-right:0.5rem;">Categories:</span>
          <a href="/ideas" style="background:${!isCategoryView ? "#09daed" : "#f1f5f9"};color:${!isCategoryView ? "#0f172a" : "#475569"};font-weight:600;font-size:0.85rem;padding:0.4rem 0.85rem;border-radius:9999px;text-decoration:none;">All Ideas (${pitches.length})</a>
          ${categoryPillsHtml}
        </div>
      </div>

      <!-- Ideas Grid -->
      <section style="display:grid;grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));gap:1.5rem;">
        ${cardsHtml}
      </section>

      <!-- Pagination -->
      ${totalPages > 1 ? `
      <nav aria-label="Pagination" style="display:flex;justify-content:center;gap:0.5rem;margin-top:3rem;">
        ${currentPage > 1 ? `<a href="?page=${currentPage - 1}" style="padding:0.5rem 1rem;background:#ffffff;border:1px solid #cbd5e1;border-radius:6px;color:#0f172a;text-decoration:none;font-weight:600;">&laquo; Previous</a>` : ""}
        <span style="padding:0.5rem 1rem;color:#64748b;font-weight:600;">Page ${currentPage} of ${totalPages}</span>
        ${currentPage < totalPages ? `<a href="?page=${currentPage + 1}" style="padding:0.5rem 1rem;background:#ffffff;border:1px solid #cbd5e1;border-radius:6px;color:#0f172a;text-decoration:none;font-weight:600;">Next &raquo;</a>` : ""}
      </nav>
      ` : ""}
    </main>

    <footer style="background:#ffffff;border-top:1px solid #e2e8f0;padding:2.5rem 1.5rem;margin-top:4rem;text-align:center;color:#64748b;font-size:0.9rem;">
      <p>Published on <a href="${escapeHtml(siteUrl)}" style="color:#09daed;font-weight:bold;text-decoration:none;">Neesh AI</a> — The AI-powered startup idea validation platform.</p>
      <p style="margin-top:0.5rem;"><a href="/space" style="color:#6366f1;text-decoration:none;">Browse Pitches Space &rarr;</a> | <a href="/features" style="color:#6366f1;text-decoration:none;">Explore Core Features &rarr;</a></p>
    </footer>
  </div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
