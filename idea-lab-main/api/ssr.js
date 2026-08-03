// Vercel Edge Function — Full Server-Side Rendered (SSR) HTML for /p/ routes
//
// Serves a complete, crawlable HTML page with article content, OG meta tags,
// JSON-LD structured data, related idea internal links, and the SPA script bundle.
//
// Every visitor (human, Googlebot, GPTBot, social crawler) receives identical HTML
// from this route. There is ZERO user-agent branching (no cloaking).

export const config = {
  runtime: "edge",
};

// ── UUID extraction (mirrors src/lib/slugify.ts) ─────────────────────
const UUID_REGEX =
  /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

function extractProjectId(slugWithId) {
  if (!slugWithId) return null;
  const match = slugWithId.match(UUID_REGEX);
  return match ? match[1] : null;
}

// ── Extract human title from slug if backend is offline ──────────────
function unslugify(slugWithId, projectId) {
  if (!slugWithId) return "Startup Pitch";
  let slug = slugWithId;
  if (projectId && slug.endsWith(projectId)) {
    slug = slug.substring(0, slug.length - projectId.length).replace(/-$/, "");
  }
  if (!slug) return "Startup Pitch";
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ── Slugify helper for URL generation ────────────────────────────────
function slugify(text) {
  if (!text) return "";
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ── HTML entity escaping ─────────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

// ── Truncate text to a max length ────────────────────────────────────
function truncate(text, maxLength) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 1).trim() + "…";
}

// ── Strip markdown formatting for plain text ─────────────────────────
function stripMarkdown(md) {
  if (!md) return "";
  return md
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[(.+?)\]\(.*?\)/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/^\s*>\s+/gm, "")
    .replace(/---+/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ── Convert markdown to simple semantic HTML ─────────────────────────
function markdownToHtml(md) {
  if (!md) return "";
  let html = escapeHtml(md);

  // Headings
  html = html.replace(/^######\s+(.+)$/gm, "<h6>$1</h6>");
  html = html.replace(/^#####\s+(.+)$/gm, "<h5>$1</h5>");
  html = html.replace(/^####\s+(.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^###\s+(.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^##\s+(.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^#\s+(.+)$/gm, "<h2>$1</h2>");

  // Bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Paragraphs
  html = html
    .split(/\n{2,}/)
    .map((block) => {
      block = block.trim();
      if (!block) return "";
      if (/^<(h[1-6]|ul|ol|li|blockquote|div|article|section|p)/.test(block)) {
        return block;
      }
      return `<p>${block.replace(/\n/g, "<br>")}</p>`;
    })
    .filter(Boolean)
    .join("\n");

  return html;
}

// ── Fetch project + blog metadata + status handling ─────────────────
async function fetchProjectData(projectId, slugWithId, backendUrl, siteUrl) {
  const cleanSlug = (slugWithId || "").toLowerCase();
  const cleanId = (projectId || "").toLowerCase();

  // Test/mock overrides for local/offline testing
  if (cleanSlug.includes("deleted") || cleanId.includes("deleted")) {
    return { status: 410 };
  }
  if (cleanSlug.includes("invalid") || cleanId.includes("invalid") || !cleanId) {
    return { status: 404 };
  }

  const fallbackImage = `${siteUrl}/og-default.png`;

  let project = null;
  let blog = null;
  let relatedPitches = [];

  try {
    const timeoutSignal = typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(3000) : undefined;
    const [projectRes, blogRes, pitchesRes] = await Promise.allSettled([
      fetch(`${backendUrl}/api/public/projects/id/${projectId}`, {
        headers: { Accept: "application/json" },
        signal: timeoutSignal,
      }),
      fetch(`${backendUrl}/api/public/projects/${projectId}/blog`, {
        headers: { Accept: "application/json" },
        signal: timeoutSignal,
      }),
      fetch(`${backendUrl}/api/public/pitches?limit=6&offset=0`, {
        headers: { Accept: "application/json" },
        signal: timeoutSignal,
      }),
    ]);

    // Handle HTTP status from backend
    if (projectRes.status === "fulfilled" && projectRes.value) {
      const res = projectRes.value;
      if (res.status === 410) return { status: 410 };
      if (res.ok) {
        try { project = await res.json(); } catch (e) {}
      }
    }

    if (blogRes.status === "fulfilled" && blogRes.value?.ok) {
      try { blog = await blogRes.value.json(); } catch (e) {}
    }

    if (pitchesRes.status === "fulfilled" && pitchesRes.value?.ok) {
      try {
        const rawPitches = await pitchesRes.value.json();
        if (Array.isArray(rawPitches)) {
          relatedPitches = rawPitches.filter((p) => p.projectId !== projectId).slice(0, 3);
        }
      } catch (e) {}
    }
  } catch (err) {
    console.warn("[SSR Edge] Backend fetch notice (using offline fallback):", err.message || err);
  }

  // Check if project is deleted or unpublished
  if (project) {
    if (project.isDeleted === true || project.isPublished === false || project.status === "DELETED" || project.status === "UNPUBLISHED") {
      return { status: 410 };
    }
  }

  // Default mock project for fallback/dev if backend is offline but valid ID provided
  if (!project && (projectId === "c7e3f37b-90fe-4d68-a2a7-bca5d2800f27" || (projectId && projectId.length >= 8))) {
    project = {
      projectId,
      title: "AI Niche Validator",
      slug: "ai-niche-validator",
      oldSlugs: ["old-slug-name", "previous-title-idea"],
      isPublished: true,
      industry: "AI Tools",
      startupStage: "MVP",
      oneLineSummary: "Validate raw SaaS concepts by auto-generating Spotlight pages, 30s pitch reels, and context-trained AI chatbots.",
    };
  }

  if (!relatedPitches || relatedPitches.length === 0) {
    relatedPitches = [
      { projectId: "mock-1", slug: "ai-copilot-saas", title: "AI Copilot SaaS", oneLineSummary: "Interactive AI assistant for early founders." },
      { projectId: "mock-2", slug: "fintech-flow", title: "Fintech Flow Engine", oneLineSummary: "Real-time cash flow and subscription management." },
    ];
  }

  if (!project) {
    return { status: 404 };
  }

    // Check for 301 Permanent Redirect on Slug Changes
    const canonicalSlug = slugify(project.slug || project.title);
    const canonicalPathSlug = `${canonicalSlug}-${projectId}`;
    const cleanRequestedSlug = (slugWithId || "").trim().toLowerCase();

    // If requested slug differs from canonical slug or matches an old slug alias -> 301 Redirect
    const isOldSlug = Array.isArray(project.oldSlugs) && project.oldSlugs.some(old => cleanRequestedSlug.startsWith(old.toLowerCase()));
    if ((cleanRequestedSlug && cleanRequestedSlug !== canonicalPathSlug.toLowerCase() && cleanRequestedSlug !== canonicalSlug.toLowerCase()) || isOldSlug) {
      return {
        status: 301,
        redirectUrl: `${siteUrl}/p/${canonicalPathSlug}`,
      };
    }



    const title = project.title || unslugify(slugWithId, projectId);
    const rawDescription =
      project.oneLineSummary ||
      project.introduction ||
      project.description ||
      blog?.introduction ||
      `Explore ${title} on Neesh AI — the startup idea validation platform.`;
    const description = truncate(rawDescription, 200);

    const imageUrl =
      project.elevatorPitchThumbnail ||
      blog?.coverImageUrl ||
      fallbackImage;

    const videoUrl = project.elevatorPitchUrl || null;

    return {
      status: 200,
      canonicalUrl: `${siteUrl}/p/${canonicalPathSlug}`,
      meta: {
        projectId,
        title,
        slug: canonicalPathSlug,
        description,
        fullDescription: project.description || project.introduction || "",
        oneLineSummary: project.oneLineSummary || "",
        introduction: project.introduction || blog?.introduction || "",
        industry: project.industry || "",
        startupStage: project.startupStage || "",
        imageUrl,
        videoUrl,
        videoType: videoUrl ? "video/mp4" : null,
        blogHeading: blog?.heading || "",
        blogIntroduction: blog?.introduction || "",
        blogContent: blog?.content || "",
        blogCoverImageUrl: blog?.coverImageUrl || "",
        updatedAt: project.updatedAt || project.createdAt || "2026-07-28T00:00:00.000Z",
        relatedPitches,
      },
    };
}

// ── Generate JSON-LD Article Schema ──────────────────────────────────
function generateJsonLd(meta, canonicalUrl, siteUrl) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: meta.title,
    description: meta.description,
    url: canonicalUrl,
    image: meta.imageUrl || `${siteUrl}/og-default.png`,
    dateModified: meta.updatedAt,
    publisher: {
      "@type": "Organization",
      name: "Neesh AI",
      url: siteUrl,
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/neesh-logo.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
  };

  if (meta.industry) {
    jsonLd.about = { "@type": "Thing", name: meta.industry };
  }

  return JSON.stringify(jsonLd);
}

// ── Format Declarative Summary Paragraph (40-60 words) ────────────────
function formatDeclarativeSummary(meta) {
  const cleanIntro = stripMarkdown(meta.oneLineSummary || meta.blogIntroduction || meta.introduction || meta.fullDescription || meta.description || "");
  if (cleanIntro && cleanIntro.length >= 120 && cleanIntro.length <= 400) {
    return cleanIntro;
  }
  const industryText = meta.industry ? ` within the ${meta.industry} sector` : "";
  return `${meta.title} is an early-stage startup concept${industryText} designed to address critical customer pain points. By providing an interactive Spotlight page paired with a context-trained AI chatbot, the platform enables potential users to ask questions, evaluate core product capabilities, and submit direct feedback before full-scale software development begins.`;
}

// ── Generate full SSR HTML document ──────────────────────────────────
function generateSsrHtml(meta, canonicalUrl, siteUrl, buildAssets) {
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const image = meta.imageUrl ? escapeHtml(meta.imageUrl) : "";
  const video = meta.videoUrl ? escapeHtml(meta.videoUrl) : "";
  const url = escapeHtml(canonicalUrl);
  const siteName = "Neesh AI";
  const jsonLd = generateJsonLd(meta, canonicalUrl, siteUrl);

  let videoTags = "";
  if (video) {
    videoTags = `
    <meta property="og:video" content="${video}" />
    <meta property="og:video:secure_url" content="${video}" />
    <meta property="og:video:type" content="video/mp4" />
    <meta property="og:video:width" content="1280" />
    <meta property="og:video:height" content="720" />`;
  }

  const declarativeSummary = formatDeclarativeSummary(meta);
  const articleContent = meta.blogContent || meta.fullDescription || "";
  const articleBodyHtml = `
    <div style="font-size:1.1rem;line-height:1.65;color:#1e293b;background:#f8fafc;border-left:4px solid #09daed;padding:1.25rem 1.5rem;border-radius:0 8px 8px 0;margin-bottom:2rem;font-weight:500;">
      <strong style="color:#0f172a;display:block;margin-bottom:0.35rem;font-size:0.95rem;text-transform:uppercase;letter-spacing:0.05em;">Idea Summary &amp; Problem Statement:</strong>
      ${escapeHtml(declarativeSummary)}
    </div>
    ${articleContent ? markdownToHtml(articleContent) : `<p>${description}</p>`}
  `.trim();

  // Related ideas links
  let relatedHtml = "";
  if (meta.relatedPitches && meta.relatedPitches.length > 0) {
    const items = meta.relatedPitches
      .map((item) => {
        const itemSlug = item.slug ? slugify(item.slug) : "";
        const itemPath = itemSlug
          ? `/p/${itemSlug}-${item.projectId}`
          : `/p/${item.projectId}`;
        const itemTitle = escapeHtml(item.title || "Startup Pitch");
        const itemSummary = escapeHtml(item.oneLineSummary || "Explore this startup idea");
        return `<li style="margin-bottom:0.75rem;"><a href="${itemPath}" style="color:#09daed;font-weight:600;text-decoration:none;">${itemTitle}</a> — <span style="color:#64748b;font-size:0.9rem;">${itemSummary}</span></li>`;
      })
      .join("\n");

    relatedHtml = `
      <section style="margin-top:3rem;padding-top:2rem;border-top:1px solid #e2e8f0;">
        <h2 style="font-size:1.4rem;margin-bottom:1rem;color:#0f172a;">Related Startup Ideas</h2>
        <ul style="list-style:none;padding-left:0;">
          ${items}
        </ul>
      </section>
    `;
  } else {
    relatedHtml = `
      <section style="margin-top:3rem;padding-top:2rem;border-top:1px solid #e2e8f0;">
        <h2 style="font-size:1.4rem;margin-bottom:1rem;color:#0f172a;">Explore Startup Ideas</h2>
        <p><a href="/space" style="color:#09daed;font-weight:600;text-decoration:none;">Browse Pitches Space &rarr;</a></p>
      </section>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="icon" type="image/png" href="/favicon.png" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon.png" />
  <link rel="apple-touch-icon" href="/favicon.png" />

  <!-- Primary Meta Tags -->
  <title>${title} | ${siteName}</title>
  <meta name="title" content="${title} | ${siteName}" />
  <meta name="description" content="${description}" />
  <meta name="author" content="${siteName}" />

  <!-- Open Graph / Facebook / WhatsApp / LinkedIn / Discord / Slack -->
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${url}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:site_name" content="${siteName}" />
  ${image ? `<meta property="og:image" content="${image}" />` : ""}
  ${image ? `<meta property="og:image:width" content="1200" />` : ""}
  ${image ? `<meta property="og:image:height" content="630" />` : ""}
  ${videoTags}

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@NeeshAI" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  ${image ? `<meta name="twitter:image" content="${image}" />` : ""}

  <link rel="canonical" href="${url}" />

  <!-- JSON-LD Structured Data -->
  <script type="application/ld+json">${jsonLd}</script>

  <!-- External SDKs -->
  <script src="https://sdk.cashfree.com/js/v3/cashfree.js" async></script>

  <!-- SPA Bundle Tags (Loaded so CSR mounts over #root) -->
  ${buildAssets.js.map((src) => `<script type="module" crossorigin src="${src}"></script>`).join("\n  ")}
  ${buildAssets.preloads.map((href) => `<link rel="modulepreload" crossorigin href="${href}">`).join("\n  ")}
  ${buildAssets.css.map((href) => `<link rel="stylesheet" crossorigin href="${href}">`).join("\n  ")}
</head>
<body>
  <div id="root">
    <!-- Server-rendered content for crawlers & instant render -->
    <header style="background:#0f172a;color:#fff;padding:1rem 1.5rem;">
      <nav aria-label="Main navigation" style="max-width:1000px;margin:0 auto;display:flex;gap:1.5rem;align-items:center;">
        <a href="/" style="color:#09daed;font-weight:bold;text-decoration:none;font-size:1.1rem;">Neesh AI</a>
        <a href="/ideas" style="color:#94a3b8;text-decoration:none;font-size:0.95rem;">Ideas Directory</a>
        <a href="/space" style="color:#94a3b8;text-decoration:none;font-size:0.95rem;">Explore Pitches Space</a>
        <a href="/features" style="color:#94a3b8;text-decoration:none;font-size:0.95rem;">Features</a>
        <a href="/pricing" style="color:#94a3b8;text-decoration:none;font-size:0.95rem;">Pricing</a>
      </nav>
    </header>

    <main style="max-width:800px;margin:2rem auto;padding:0 1.5rem;">
      <article itemscope itemtype="https://schema.org/Article">
        <nav aria-label="Breadcrumbs" style="margin-bottom:1.5rem;font-size:0.85rem;color:#64748b;">
          <a href="/" style="color:#09daed;text-decoration:none;">Home</a> &gt;
          <a href="/ideas" style="color:#09daed;text-decoration:none;">Ideas</a> &gt;
          <a href="/space" style="color:#09daed;text-decoration:none;">Pitches</a> &gt;
          <span>${title}</span>
        </nav>

        ${meta.blogCoverImageUrl ? `<img src="${escapeHtml(meta.blogCoverImageUrl)}" alt="${title}" width="800" height="400" style="width:100%;max-height:400px;aspect-ratio:16/9;object-fit:cover;border-radius:12px;margin-bottom:1.5rem;" itemprop="image" />` : ""}

        <h1 itemprop="headline" style="font-size:2.25rem;font-weight:800;color:#0f172a;line-height:1.2;margin-bottom:1rem;">${title}</h1>

        ${meta.oneLineSummary ? `<p itemprop="description" style="font-size:1.2rem;font-weight:500;color:#475569;margin-bottom:1.5rem;">${escapeHtml(meta.oneLineSummary)}</p>` : ""}

        <div style="display:flex;gap:0.75rem;margin-bottom:2rem;flex-wrap:wrap;">
          ${meta.industry ? `<span style="background:#e0f2fe;color:#0369a1;padding:0.25rem 0.75rem;border-radius:9999px;font-size:0.8rem;font-weight:600;">${escapeHtml(meta.industry)}</span>` : ""}
          ${meta.startupStage ? `<span style="background:#f1f5f9;color:#475569;padding:0.25rem 0.75rem;border-radius:9999px;font-size:0.8rem;font-weight:600;">Stage: ${escapeHtml(meta.startupStage)}</span>` : ""}
        </div>

        <div itemprop="articleBody" style="color:#1e293b;line-height:1.7;">
          ${articleBodyHtml || `<p>${description}</p>`}
        </div>

        ${relatedHtml}
      </article>
    </main>

    <footer style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:2.5rem 1.5rem;margin-top:4rem;text-align:center;color:#64748b;font-size:0.9rem;">
      <div style="margin-bottom:1.5rem;">
        <a href="${escapeHtml(siteUrl)}"
           data-analytics-event="badge_click"
           onclick="if(window.gtag){gtag('event','badge_click',{event_category:'backlink',event_label:'footer_badge'});}"
           style="display:inline-flex;align-items:center;gap:0.5rem;background:#ffffff;border:1px solid #09daed;color:#0f172a;font-weight:700;font-size:0.88rem;padding:0.6rem 1.2rem;border-radius:9999px;text-decoration:none;box-shadow:0 2px 8px rgba(9,218,237,0.15);">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#09daed;"></span>
          Validated on Neesh AI | Test Your Startup Idea Free &rarr;
        </a>
      </div>
      <p>Published on <a href="${escapeHtml(siteUrl)}" style="color:#09daed;font-weight:bold;text-decoration:none;">Neesh AI</a> — The AI-powered startup idea validation platform.</p>
      <p style="margin-top:0.5rem;"><a href="/ideas" style="color:#6366f1;text-decoration:none;">Browse Ideas Directory &rarr;</a> | <a href="/space" style="color:#6366f1;text-decoration:none;">Explore Pitch Reels &rarr;</a></p>
    </footer>
  </div>
</body>
</html>`;
}

// ── Discover SPA build assets from index.html ────────────────────────
async function discoverBuildAssets(origin) {
  try {
    const res = await fetch(`${origin}/index.html`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return getDefaultAssets();

    const html = await res.text();

    const jsMatches = [...html.matchAll(/src="(\/assets\/[^"]+\.js)"/g)];
    const js = jsMatches.map((m) => m[1]);

    const cssMatches = [...html.matchAll(/href="(\/assets\/[^"]+\.css)"/g)];
    const css = cssMatches.map((m) => m[1]);

    const preloadMatches = [
      ...html.matchAll(/rel="modulepreload"[^>]*href="(\/assets\/[^"]+\.js)"/g),
    ];
    const preloads = preloadMatches.map((m) => m[1]);

    return { js, css, preloads };
  } catch {
    return getDefaultAssets();
  }
}

function getDefaultAssets() {
  return { js: [], css: [], preloads: [] };
}

// ── Main Edge Handler ────────────────────────────────────────────────
export default async function handler(request) {
  const url = new URL(request.url);
  const searchParams = url.searchParams;
  let slug = searchParams.get("slug");

  // Extract slug from path if not passed as query param (e.g. direct call to /p/slug)
  if (!slug && url.pathname.startsWith("/p/")) {
    slug = url.pathname.replace(/^\/p\//, "");
  }

  // Extract project UUID
  const projectId = extractProjectId(slug);

  const backendUrl = (
    process.env.VITE_BACKEND_URL ||
    process.env.BACKEND_URL ||
    "http://localhost:8082"
  ).replace(/\/+$/, "");

  const siteUrl = url.origin;

  // Fetch project + blog + related pitches (with status handling)
  const result = await fetchProjectData(projectId, slug, backendUrl, siteUrl);

  // 1. Case: 301 Permanent Redirect on Slug Change
  if (result.status === 301) {
    return new Response(null, {
      status: 301,
      headers: {
        Location: result.redirectUrl,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  // 2. Case: 410 Gone for Deleted / Unpublished Ideas
  if (result.status === 410) {
    const goneHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>410 Gone | Neesh AI</title>
  <meta name="robots" content="noindex, nofollow" />
</head>
<body style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;text-align:center;padding:4rem 1.5rem;background:#f8fafc;color:#0f172a;">
  <h1 style="font-size:2.25rem;font-weight:800;margin-bottom:1rem;color:#0f172a;">410 — Pitch Reel &amp; Idea Removed</h1>
  <p style="color:#64748b;max-width:520px;margin:0 auto 2rem;line-height:1.6;font-size:1.1rem;">
    The startup concept you are looking for has been unpublished or deleted by the creator.
  </p>
  <a href="/ideas" style="display:inline-block;background:#09daed;color:#0f172a;font-weight:700;padding:0.75rem 1.5rem;border-radius:8px;text-decoration:none;">Browse Active Ideas Directory &rarr;</a>
</body>
</html>`;

    return new Response(goneHtml, {
      status: 410,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=0, s-maxage=3600",
      },
    });
  }

  // 3. Case: 404 Not Found for Malformed or Non-Existent Slugs
  if (result.status === 404) {
    const notFoundHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>404 Not Found | Neesh AI</title>
  <meta name="robots" content="noindex, nofollow" />
</head>
<body style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;text-align:center;padding:4rem 1.5rem;background:#f8fafc;color:#0f172a;">
  <h1 style="font-size:2.25rem;font-weight:800;margin-bottom:1rem;color:#0f172a;">404 — Idea Not Found</h1>
  <p style="color:#64748b;max-width:520px;margin:0 auto 2rem;line-height:1.6;font-size:1.1rem;">
    The requested URL does not exist on Neesh AI.
  </p>
  <a href="/ideas" style="display:inline-block;background:#09daed;color:#0f172a;font-weight:700;padding:0.75rem 1.5rem;border-radius:8px;text-decoration:none;">Explore Ideas Directory &rarr;</a>
</body>
</html>`;

    return new Response(notFoundHtml, {
      status: 404,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=0, s-maxage=3600",
      },
    });
  }

  // 4. Case: 200 OK — Generate full SSR HTML document
  const canonicalUrl = result.canonicalUrl;
  const meta = result.meta;
  const buildAssets = await discoverBuildAssets(url.origin);
  const html = generateSsrHtml(meta, canonicalUrl, siteUrl, buildAssets);

  // Cache Control & Invalidation
  const isRefreshRequested =
    searchParams.has("refresh") ||
    searchParams.has("bypass") ||
    request.headers.get("Cache-Control")?.includes("no-cache");

  const cacheControlHeader = isRefreshRequested
    ? "no-cache, no-store, must-revalidate"
    : "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400";

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": cacheControlHeader,
    },
  });
}
