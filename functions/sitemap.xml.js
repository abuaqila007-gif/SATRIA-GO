
import {
  SITE,
  getPublicCatalog,
  verifiedProviders,
  profileSlug
} from "./_lib/catalog.js";

function xmlEscape(value) {
  return String(value).replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;"
  }[ch]));
}

function sitemapResponse(urls) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url><loc>${xmlEscape(url)}</loc></url>`).join("\n")}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=600",
      "x-content-type-options": "nosniff"
    }
  });
}

export async function onRequest() {
  const homeUrl = `${SITE}/`;

  try {
    const data = await getPublicCatalog();
    const providers = verifiedProviders(data);

    const urls = [
      homeUrl,
      ...providers.map(provider =>
        `${SITE}/terapis/${encodeURIComponent(profileSlug(provider))}`
      )
    ];

    return sitemapResponse([...new Set(urls)]);

  } catch (error) {
    console.error("Sitemap catalog error:", error);

    // Fallback: tetap berikan sitemap XML valid
    // meskipun katalog Supabase sementara gagal.
    return sitemapResponse([homeUrl]);
  }
}
