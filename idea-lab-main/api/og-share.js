// Vercel Edge Function — Dynamic OG Preview Image Generator for Social Share
export const config = {
  runtime: "edge",
};

function escapeXml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export default async function handler(request) {
  const url = new URL(request.url);
  const title = escapeXml(url.searchParams.get("title") || "Startup Idea Validation");
  const score = parseInt(url.searchParams.get("score") || "88", 10);
  const gap = escapeXml(url.searchParams.get("gap") || "Pricing Model & Technical Specifications Clarity");
  const industry = escapeXml(url.searchParams.get("industry") || "SaaS & AI");

  // Determine score color & label
  let scoreColor = "#09daed";
  let scoreLabel = "Strong Validation";
  if (score < 50) {
    scoreColor = "#ef4444";
    scoreLabel = "Needs Refinement";
  } else if (score < 75) {
    scoreColor = "#f59e0b";
    scoreLabel = "Moderate Validation";
  }

  // Calculate SVG circular gauge stroke dash offset (circumference = 2 * PI * r = 2 * PI * 54 = 339.29)
  const strokeDashoffset = 339.29 - (339.29 * score) / 100;

  const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="50%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#091322" />
    </linearGradient>
    <linearGradient id="cyanGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#09daed" />
      <stop offset="100%" stop-color="#38bdf8" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="15" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bgGrad)" />

  <!-- Background Decorative Grid -->
  <g opacity="0.05" stroke="#09daed" stroke-width="1">
    <line x1="0" y1="100" x2="1200" y2="100" />
    <line x1="0" y1="200" x2="1200" y2="200" />
    <line x1="0" y1="300" x2="1200" y2="300" />
    <line x1="0" y1="400" x2="1200" y2="400" />
    <line x1="0" y1="500" x2="1200" y2="500" />
    <line x1="200" y1="0" x2="200" y2="630" />
    <line x1="400" y1="0" x2="400" y2="630" />
    <line x1="600" y1="0" x2="600" y2="630" />
    <line x1="800" y1="0" x2="800" y2="630" />
    <line x1="1000" y1="0" x2="1000" y2="630" />
  </g>

  <!-- Brand Badge Top Right -->
  <g transform="translate(900, 60)">
    <rect x="0" y="0" width="240" height="48" rx="24" fill="rgba(9, 218, 237, 0.1)" stroke="#09daed" stroke-width="1.5" />
    <circle cx="28" cy="24" r="6" fill="#09daed" />
    <text x="44" y="30" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="16" letter-spacing="1">NEESH AI</text>
  </g>

  <!-- Main Card Container -->
  <g transform="translate(80, 70)">
    <!-- Industry Badge -->
    <rect x="0" y="0" width="160" height="34" rx="17" fill="rgba(56, 189, 248, 0.15)" />
    <text x="18" y="22" fill="#38bdf8" font-family="system-ui, sans-serif" font-weight="700" font-size="14" text-transform="uppercase">${industry}</text>

    <!-- Title -->
    <text x="0" y="90" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="44" width="700">${title}</text>

    <!-- Subtitle / Tagline -->
    <text x="0" y="130" fill="#94a3b8" font-family="system-ui, sans-serif" font-weight="500" font-size="20">AI Validation Progress &amp; Customer Confusion Signals Report</text>
  </g>

  <!-- Gauge Score Box -->
  <g transform="translate(80, 240)">
    <rect x="0" y="0" width="480" height="310" rx="24" fill="rgba(30, 41, 59, 0.7)" stroke="rgba(255,255,255,0.1)" stroke-width="1.5" />

    <!-- Circular Gauge Graphic -->
    <g transform="translate(100, 155)">
      <!-- Background track -->
      <circle cx="0" cy="0" r="75" fill="none" stroke="#334155" stroke-width="14" />
      <!-- Gauge progress -->
      <circle cx="0" cy="0" r="75" fill="none" stroke="${scoreColor}" stroke-width="14" stroke-linecap="round" stroke-dasharray="471.24" stroke-dashoffset="${471.24 - (471.24 * score) / 100}" transform="rotate(-90)" />
      <!-- Score Number -->
      <text x="0" y="16" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="800" font-size="48" text-anchor="middle">${score}</text>
      <text x="0" y="40" fill="#94a3b8" font-family="system-ui, sans-serif" font-weight="600" font-size="14" text-anchor="middle">OUT OF 100</text>
    </g>

    <g transform="translate(220, 110)">
      <text x="0" y="0" fill="#94a3b8" font-family="system-ui, sans-serif" font-weight="700" font-size="14" letter-spacing="1" text-transform="uppercase">IDEA HEALTH SCORE</text>
      <text x="0" y="35" fill="${scoreColor}" font-family="system-ui, sans-serif" font-weight="800" font-size="28">${scoreLabel}</text>
      <text x="0" y="70" fill="#cbd5e1" font-family="system-ui, sans-serif" font-weight="500" font-size="15" width="220">Based on real visitor chat logs &amp; objection analysis.</text>
    </g>
  </g>

  <!-- Detected Gap Card -->
  <g transform="translate(590, 240)">
    <rect x="0" y="0" width="530" height="310" rx="24" fill="rgba(30, 41, 59, 0.7)" stroke="rgba(255,255,255,0.1)" stroke-width="1.5" />

    <g transform="translate(40, 45)">
      <rect x="0" y="0" width="160" height="30" rx="6" fill="rgba(239, 68, 68, 0.15)" stroke="rgba(239, 68, 68, 0.3)" />
      <text x="12" y="20" fill="#f87171" font-family="system-ui, sans-serif" font-weight="700" font-size="13" text-transform="uppercase">KEY GAPS DETECTED</text>

      <text x="0" y="75" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="700" font-size="22">Primary Customer Confusion Point:</text>
      <text x="0" y="115" fill="#cbd5e1" font-family="system-ui, sans-serif" font-weight="500" font-size="18" width="450">"${gap}"</text>

      <!-- Bottom CTA Banner -->
      <g transform="translate(0, 180)">
        <rect x="0" y="0" width="450" height="48" rx="12" fill="url(#cyanGrad)" />
        <text x="225" y="30" fill="#0f172a" font-family="system-ui, sans-serif" font-weight="800" font-size="16" text-anchor="middle">View Spotlight Page &amp; Chatbot &rarr;</text>
      </g>
    </g>
  </g>
</svg>`;

  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
