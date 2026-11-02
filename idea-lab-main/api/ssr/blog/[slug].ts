export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const slug = pathParts[pathParts.length - 1] || 'sample';

  const canonicalUrl = `https://neesh.ai/blog/${slug}`;
  const title = `Startup Q&A Case Study | Neesh`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <link rel="canonical" href="${canonicalUrl}">
  <meta name="description" content="Read real Q&A between startup founders and verified domain Pioneers on Neesh.">
  <meta name="robots" content="index, follow">
  <meta property="og:title" content="${title}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${canonicalUrl}">
</head>
<body style="background-color: #020617; color: #f8fafc; font-family: sans-serif; padding: 40px 20px;">
  <div style="max-width: 800px; margin: 0 auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 32px;">
    <h1 style="font-size: 24px; font-weight: bold; margin: 12px 0 20px;">${title}</h1>
    <p style="color: #94a3b8;">Detailed Q&A case study on Neesh.</p>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}

