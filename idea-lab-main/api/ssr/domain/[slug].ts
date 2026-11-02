export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const slug = pathParts[pathParts.length - 1] || 'b2b-saas';

  const domainName = slug.replace(/-/g, ' ').toUpperCase();
  const canonicalUrl = `https://neesh.ai/domain/${slug}`;
  const description = `Startup founders are getting domain-specific feedback from verified professionals in ${domainName} right now.`;
  const ogTitle = `${domainName} Startup Validation | Neesh`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${domainName} Startup Validation on Neesh — Active Founders</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="${canonicalUrl}">
  <meta name="robots" content="index, follow">
  <meta property="og:title" content="${ogTitle}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Neesh">
</head>
<body style="background-color: #020617; color: #f8fafc; font-family: sans-serif; margin: 0; padding: 40px 20px;">
  <div style="max-width: 800px; margin: 0 auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 32px;">
    <h1 style="font-size: 32px; font-weight: 800; margin: 8px 0 16px;">${domainName} Startup Validation</h1>
    <p style="color: #94a3b8; font-size: 16px; line-height: 1.6;">${description}</p>
    <div style="display: flex; gap: 12px; margin-top: 24px;">
      <a href="/signup" style="background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">Post your Spark</a>
    </div>
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

