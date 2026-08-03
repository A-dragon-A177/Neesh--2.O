// Vercel Edge Function — Full Server-Side Rendered (SSR) HTML for static routes
//
// Serves unique <title>, <meta description>, canonical <link>, OG tags,
// and inlined semantic HTML for non-/p/ static routes (features, pricing, space, etc.)
// so crawlers get route-specific metadata and content on initial fetch.

export const config = {
  runtime: "edge",
};

const ROUTE_META = {
  features: {
    title: "Core Features | Neesh AI Startup Validation Engine",
    description: "Discover Neesh AI features: Auto-generated Spotlights, Elevator Pitch Reels, custom AI chatbots, audience signals, and startup development reports.",
    canonical: "https://neeshglobal.com/features",
    h1: "Everything to construct & launch your startup",
    body: `
      <section>
        <h2>Six Integrated Features for Startup Validation</h2>
        <ul>
          <li><strong>Auto-Generated Spotlights:</strong> Convert startup details into high-converting publishable Spotlight pages.</li>
          <li><strong>Elevator Pitch Reels:</strong> Record 30-60s video pitches. Visitors doom-scroll the feed, ask chatbot questions, and connect.</li>
          <li><strong>Trainable Custom Chatbot:</strong> Train an AI assistant on documents and vision to answer questions and capture leads 24/7.</li>
          <li><strong>Detailed Idea Reports:</strong> Analyze core parameters, moats, and execution paths with deep startup reports.</li>
          <li><strong>Audiences & Connections:</strong> Tap directly into real startup enthusiasts and collect custom feedback and interest.</li>
          <li><strong>Startup Development Hub:</strong> Track spotlight engagement, chatbot conversations, pitch views, and partner invitations.</li>
        </ul>
      </section>
    `,
  },
  pricing: {
    title: "Simple Transparent Pricing | Neesh AI",
    description: "Explore Neesh AI pricing plans for founders and creators. Validate ideas, host custom chatbots, and generate startup spotlight reports.",
    canonical: "https://neeshglobal.com/pricing",
    h1: "Simple, transparent pricing for startup creators",
    body: `
      <section>
        <h2>Choose the Plan That Fits Your Validation Goals</h2>
        <p>Start validating your startup idea today with AI-powered spotlight pages, elevator pitch reels, and trainable chatbots.</p>
        <ul>
          <li><strong>Free Beta Plan:</strong> Create elevator pitch reels, publish spotlight pages, and collect initial audience feedback.</li>
          <li><strong>Pro Founder Plan:</strong> Unlimited custom chatbot training, advanced analytics, priority pitch feed positioning, and lead export.</li>
        </ul>
      </section>
    `,
  },
  space: {
    title: "Explore Startup Ideas & Pitch Reels | Neesh AI Space",
    description: "Browse 30-60 second elevator pitch reels from founders. Interact with trained AI chatbots and validate startup concepts in real time.",
    canonical: "https://neeshglobal.com/space",
    h1: "Pitches Space — Doom-Scroll Startup Ideas",
    body: `
      <section>
        <h2>Watch 30-60 Second Video Pitches from Builders</h2>
        <p>Explore raw startup concepts in the Pitches Arena. Ask questions directly to custom AI chatbots and connect with founders before they write code.</p>
      </section>
    `,
  },
  ideas: {
    title: "Startup Ideas Directory | Neesh AI",
    description: "Discover validated startup concepts and niche projects. Filter by industry, explore pitch videos, and interact with AI founders.",
    canonical: "https://neeshglobal.com/ideas",
    h1: "Startup Ideas & Niche Projects Directory",
    body: `
      <section>
        <h2>Browse Niche Startup Projects</h2>
        <p>Find innovative startup concepts across AI, SaaS, Fintech, E-commerce, and Biotech. Connect with founders and validate new ideas.</p>
      </section>
    `,
  },
  pitches: {
    title: "Elevator Pitch Feed | Neesh AI",
    description: "Watch short video pitches uploaded by startup creators. Discover new ideas, ask AI chatbot questions, and support early founders.",
    canonical: "https://neeshglobal.com/pitches",
    h1: "Startup Pitch Reels Feed",
    body: `
      <section>
        <h2>Short-Form Video Pitches for Modern Startups</h2>
        <p>Scroll through elevator pitch video reels, evaluate market signals, and chat with AI assistants trained on founder vision.</p>
      </section>
    `,
  },
  "spotlight-info": {
    title: "Auto-Generated Startup Spotlights | Neesh AI",
    description: "Learn how Neesh AI transforms raw startup ideas into publishable Spotlight pages with trained AI chatbots and real-time audience feedback.",
    canonical: "https://neeshglobal.com/spotlight-info",
    h1: "Turn Startup Details into Publishable Spotlights",
    body: `
      <section>
        <h2>Publish High-Converting Startup Spotlight Pages</h2>
        <p>Neesh AI converts your input into structured landing pages complete with elevator pitch video integration, custom chatbots, and lead capture.</p>
      </section>
    `,
  },
  simulation: {
    title: "Interactive Startup Simulation & Validation | Neesh AI",
    description: "Simulate audience reactions, test positioning parameters, and stress-test your startup concept with AI-powered feedback loops.",
    canonical: "https://neeshglobal.com/simulation",
    h1: "Interactive Startup Simulation & Stress Testing",
    body: `
      <section>
        <h2>Test Positioning and User POV Parameters</h2>
        <p>Run simulated audience tests to identify messaging gaps, objection handlers, and market demand before investing capital.</p>
      </section>
    `,
  },
  login: {
    title: "Sign In to Your Dashboard | Neesh AI",
    description: "Access your Neesh AI account to manage startup spotlights, elevator pitch reels, custom chatbots, and audience validation signals.",
    canonical: "https://neeshglobal.com/login",
    h1: "Sign In to Neesh AI",
    body: `
      <section>
        <p>Access your founder dashboard, track spotlight analytics, and manage elevator pitch video feeds.</p>
        <p><a href="/signup">Don't have an account? Sign up for free &rarr;</a></p>
      </section>
    `,
  },
  signup: {
    title: "Create Your Free Account | Neesh AI",
    description: "Join Neesh AI for free. Start building your elevator pitch video, generating spotlight reports, and validating startup ideas with real users.",
    canonical: "https://neeshglobal.com/signup",
    h1: "Create Your Free Neesh AI Account",
    body: `
      <section>
        <p>Start validating your startup idea in minutes. Free during beta, no credit card required.</p>
        <p><a href="/login">Already have an account? Sign in &rarr;</a></p>
      </section>
    `,
  },
};

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

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

export default async function handler(request) {
  const url = new URL(request.url);
  const searchParams = url.searchParams;
  let routeName = searchParams.get("route");

  if (!routeName) {
    const cleanPath = url.pathname.replace(/^\/+|\/+$/g, "");
    routeName = cleanPath.split("/")[0] || "features";
  }

  const meta = ROUTE_META[routeName] || ROUTE_META["features"];
  const buildAssets = await discoverBuildAssets(url.origin);

  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const canonical = escapeHtml(meta.canonical);
  const siteName = "Neesh AI";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="icon" type="image/png" href="/favicon.png" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon.png" />
  <link rel="apple-touch-icon" href="/favicon.png" />

  <!-- Unique Primary Meta Tags -->
  <title>${title}</title>
  <meta name="title" content="${title}" />
  <meta name="description" content="${description}" />
  <meta name="author" content="${siteName}" />

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${url.origin}/og-default.png" />
  <meta property="og:site_name" content="${siteName}" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@NeeshAI" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${url.origin}/og-default.png" />

  <link rel="canonical" href="${canonical}" />

  <!-- External SDKs -->
  <script src="https://sdk.cashfree.com/js/v3/cashfree.js" async></script>

  <!-- SPA Bundle Tags -->
  ${buildAssets.js.map((src) => `<script type="module" crossorigin src="${src}"></script>`).join("\n  ")}
  ${buildAssets.preloads.map((href) => `<link rel="modulepreload" crossorigin href="${href}">`).join("\n  ")}
  ${buildAssets.css.map((href) => `<link rel="stylesheet" crossorigin href="${href}">`).join("\n  ")}
</head>
<body>
  <div id="root">
    <header style="background:#0f172a;color:#fff;padding:1rem 1.5rem;">
      <nav aria-label="Main navigation" style="max-width:1000px;margin:0 auto;display:flex;gap:1.5rem;align-items:center;">
        <a href="/" style="color:#09daed;font-weight:bold;text-decoration:none;">Neesh AI</a>
        <a href="/features" style="color:#94a3b8;text-decoration:none;">Features</a>
        <a href="/pricing" style="color:#94a3b8;text-decoration:none;">Pricing</a>
        <a href="/space" style="color:#94a3b8;text-decoration:none;">Pitches Space</a>
        <a href="/spotlight-info" style="color:#94a3b8;text-decoration:none;">Spotlight</a>
        <a href="/login" style="color:#94a3b8;text-decoration:none;">Login</a>
        <a href="/signup" style="color:#94a3b8;text-decoration:none;">Sign Up</a>
      </nav>
    </header>

    <main style="max-width:900px;margin:2rem auto;padding:0 1.5rem;">
      <h1 style="font-size:2.25rem;font-weight:800;color:#0f172a;margin-bottom:1rem;">${escapeHtml(meta.h1)}</h1>
      <p style="font-size:1.1rem;color:#475569;margin-bottom:2rem;">${description}</p>
      ${meta.body}
    </main>

    <footer style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:2rem 1.5rem;margin-top:4rem;text-align:center;color:#64748b;font-size:0.9rem;">
      <p>&copy; 2026 Neesh AI. All rights reserved.</p>
    </footer>
  </div>
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
