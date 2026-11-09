import { SITE, getPublicCatalog, verifiedProviders, profileSlug } from "./_lib/catalog.js";

function xmlEscape(value) {
  return String(value).replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;"
  }[ch]));
}

export async function onRequest() {
  try {
    const data = await getPublicCatalog();
    const providers = verifiedProviders(data);
    const urls = [
      `<url><loc>${SITE}/</loc></url>`,
      ...providers.map(provider =>
        `<url><loc>${xmlEscape(`${SITE}/terapis/${encodeURIComponent(profileSlug(provider))}`)}</loc></url>`
      )
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(url => `  ${url}`).join("\n")}\n</urlset>`;
    return new Response(xml, {
      headers: {
        "content-type": "application/xml; charset=utf-8",
        "cache-control": "public, max-age=300, s-maxage=600",
        "x-content-type-options": "nosniff"
      }
    });
  } catch (error) {
    return new Response("Sitemap sementara tidak dapat dibuat dari katalog publik.", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" }
    });
  }
}
