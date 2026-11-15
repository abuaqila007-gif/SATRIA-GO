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

function sitemapUnavailable() {
  return new Response("Sitemap sementara tidak dapat dibuat karena katalog publik SATRIA GO tidak tersedia. Silakan coba kembali.", {
    status: 503,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "retry-after": "300",
      "x-content-type-options": "nosniff"
    }
  });
}

export async function onRequest() {
  try {
    const data = await getPublicCatalog();
    const providers = verifiedProviders(data);

    const urls = [
      `${SITE}/`,
      ...providers.map(provider =>
        `${SITE}/terapis/${encodeURIComponent(profileSlug(provider))}`
      )
    ];

    return sitemapResponse([...new Set(urls)]);

  } catch (error) {
    console.error("Sitemap catalog error; using last-known public profile URLs:", error);
    // Tetap sajikan XML valid saat Supabase sedang tidak tersedia.
    // Daftar ini adalah URL profil publik terakhir yang sudah diterbitkan.
    const fallbackSlugs = [
      "ady-kurniawan-2",
      "aldino-17",
      "amin-pujanto-36",
      "andi-1",
      "anna-38",
      "dede-royan-arief-andreawan-29",
      "fatimah-21",
      "jafar-8",
      "mahendra-tri-setya-14",
      "mugiyono-6",
      "nur-rujiasih-40",
      "pak-andi-34",
      "sartinah-5",
      "suryanto-39",
      "susanto-q-taka-35",
      "tabibah-ina-noor-18",
      "zifora-20"
    ];
    return sitemapResponse([
      `${SITE}/`,
      ...fallbackSlugs.map(slug => `${SITE}/terapis/${encodeURIComponent(slug)}`)
    ]);
  }
}
