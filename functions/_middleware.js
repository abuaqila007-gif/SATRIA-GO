import {
  getPublicCatalog,
  verifiedProviders,
  profileSlug,
  escapeHtml,
  cityName,
  serviceNames
} from "./_lib/catalog.js";

// Middleware Pages Functions: continue to the static homepage, then add
// crawlable profile links only to the homepage response.
export async function onRequest(context) {
  const page = await context.next();
  const pathname = new URL(context.request.url).pathname;

  if (pathname !== "/" || !page.ok || !(page.headers.get("content-type") || "").includes("text/html")) {
    return page;
  }

  try {
    const data = await getPublicCatalog();
    const providers = verifiedProviders(data);
    if (!providers.length) return page;

    const links = providers.map(provider => {
      const name = escapeHtml(String(provider.nama || "Terapis SATRIA").trim());
      const city = escapeHtml(cityName(provider));
      const services = serviceNames(provider, data).slice(0, 3);
      const detail = [city, services.join(", ")].filter(Boolean).join(" · ");
      const href = "/terapis/" + encodeURIComponent(profileSlug(provider));
      return `<li><a href="${href}"><strong>${name}</strong>${detail ? `<span>${escapeHtml(detail)}</span>` : ""}</a></li>`;
    }).join("\n");

    const directory = `
<section class="satria-seo-directory" aria-labelledby="satria-seo-directory-title">
  <h2 id="satria-seo-directory-title">Profil Terapis SATRIA Terverifikasi</h2>
  <p>Jelajahi profil anggota SATRIA GO berdasarkan nama, wilayah, dan layanan yang tersedia.</p>
  <ul>${links}</ul>
</section>
<style>
.satria-seo-directory{max-width:1100px;margin:28px auto;padding:22px 18px;border:1px solid #e5e7eb;border-radius:18px;background:#fff}
.satria-seo-directory h2{margin:0 0 8px;font-size:clamp(19px,3vw,25px);color:#19191d}
.satria-seo-directory p{margin:0 0 14px;color:#666b75;line-height:1.6}
.satria-seo-directory ul{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px 18px;list-style:none;padding:0;margin:0}
.satria-seo-directory li a{display:block;padding:10px 12px;border:1px solid #eceef1;border-radius:11px;color:#a10e24;text-decoration:none}
.satria-seo-directory li a:hover{text-decoration:underline;background:#fff8f8}
.satria-seo-directory li span{display:block;margin-top:3px;color:#666b75;font-size:12px;line-height:1.45}
</style>`;

    let html = await page.text();
    // The homepage contains a static, crawlable directory as a fallback.
    // Avoid duplicating it; keep the dynamic injection for future pages without one.
    if (html.includes('id="satria-seo-directory"')) return page;
    if (html.includes("</main>")) {
      html = html.replace("</main>", directory + "\n</main>");
    } else if (html.includes("</body>")) {
      html = html.replace("</body>", directory + "\n</body>");
    } else {
      return page;
    }

    const headers = new Headers(page.headers);
    headers.delete("content-length");
    headers.delete("etag");
    headers.set("cache-control", "public, max-age=60, s-maxage=180");
    headers.set("x-content-type-options", "nosniff");

    return new Response(html, {
      status: page.status,
      statusText: page.statusText,
      headers
    });
  } catch (error) {
    console.error("Homepage SEO directory error:", error);
    return page;
  }
}
