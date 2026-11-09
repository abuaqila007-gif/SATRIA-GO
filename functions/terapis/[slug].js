import {
  SITE, getPublicCatalog, verifiedProviders, profileSlug, escapeHtml,
  absoluteImage, serviceNames, cityName, isWomenOnly, whatsappUrl
} from "../_lib/catalog.js";

function pageNotFound() {
  return new Response(`<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="robots" content="noindex,follow"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Profil tidak ditemukan — SATRIA GO</title></head><body style="font-family:system-ui;padding:32px"><h1>Profil terapis tidak ditemukan</h1><p>Profil mungkin belum dipublikasikan atau alamatnya sudah berubah.</p><a href="${SITE}/">Kembali ke SATRIA GO</a></body></html>`, {
    status: 404, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
  });
}

export async function onRequest({ params }) {
  try {
    const data = await getPublicCatalog();
    const providers = verifiedProviders(data);
    const requestedSlug = String(params.slug || "");
    const provider = providers.find(p => profileSlug(p) === requestedSlug);
    if (!provider) return pageNotFound();

    const name = String(provider.nama || "Terapis SATRIA").trim();
    const city = cityName(provider);
    const clinic = String(provider.klinik || "Anggota SATRIA").trim();
    const services = serviceNames(provider, data);
    const serviceText = services.length ? services.join(", ") : "Layanan terapi SATRIA";
    const photo = absoluteImage(provider.foto_url);
    const canonical = `${SITE}/terapis/${encodeURIComponent(profileSlug(provider))}`;
    const description = `${name} adalah anggota terverifikasi SATRIA${city ? ` di ${city}` : ""}. Informasi layanan: ${serviceText}. Lihat profil dan lanjutkan reservasi melalui SATRIA GO.`;
    const homeVisit = provider.menerima_panggilan === true;
    const isNurHomeVisitOnly = name.toLocaleLowerCase("id-ID") === "nur rujiasih";
    const homeVisitText = homeVisit
      ? (isNurHomeVisitOnly
          ? "Home Visit tersedia. Terapis ini melayani kunjungan ke rumah dan tidak menerima pasien di tempat praktik."
          : "HOME VISIT TERSEDIA. Biaya tambahan Home Visit dikonfirmasi langsung melalui WhatsApp kepada terapis; nominal mengikuti kebijakan terapis dan lokasi kunjungan.")
      : "Kunjungan ke rumah belum tersedia; silakan periksa pilihan layanan praktik.";
    const womenNote = isWomenOnly(provider)
      ? '<p class="note women">Khusus pasien wanita</p>'
      : "";
    const wa = homeVisit ? whatsappUrl(provider) : "";
    const contact = wa
      ? `<a class="button secondary" href="${escapeHtml(wa)}" target="_blank" rel="noopener noreferrer">Hubungi terapis via WhatsApp</a>`
      : "";
    const serviceItems = services.length
      ? services.map(s => `<li>${escapeHtml(s)}</li>`).join("")
      : "<li>Silakan hubungi SATRIA untuk informasi layanan.</li>";
    const cityLine = city ? `<p class="muted">${escapeHtml(city)}</p>` : "";
    const schema = {
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      "name": `Profil ${name} — SATRIA GO`,
      "url": canonical,
      "mainEntity": {
        "@type": "Person",
        "name": name,
        "image": photo,
        "worksFor": { "@type": "Organization", "name": "SATRIA — Seduluran Terapis Recovery Indonesia", "url": SITE },
        ...(city ? { "address": { "@type": "PostalAddress", "addressLocality": city, "addressCountry": "ID" } } : {})
      }
    };
    const safeSchema = JSON.stringify(schema).replace(/</g, "\\u003c");

    const html = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${escapeHtml(canonical)}">
<meta property="og:type" content="profile"><meta property="og:site_name" content="SATRIA GO">
<meta property="og:title" content="${escapeHtml(name)} — Terapis SATRIA${city ? ` | ${escapeHtml(city)}` : ""}">
<meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${escapeHtml(canonical)}">
<meta property="og:image" content="${escapeHtml(photo)}"><meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(name)} — Terapis SATRIA"><meta name="twitter:description" content="${escapeHtml(description)}"><meta name="twitter:image" content="${escapeHtml(photo)}">
<title>${escapeHtml(name)} — Profil Terapis SATRIA${city ? ` | ${escapeHtml(city)}` : ""}</title>
<script type="application/ld+json">${safeSchema}</script>
<style>
:root{color-scheme:light;--red:#c90016;--ink:#19191d;--muted:#666b75}
*{box-sizing:border-box}body{margin:0;background:#f4f5f7;color:var(--ink);font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
header{background:#171216;color:white;padding:14px 18px;border-bottom:3px solid var(--red)}
header a{color:white;text-decoration:none;font-weight:900;letter-spacing:.06em}
main{max-width:760px;margin:28px auto;padding:0 16px}
.card{background:#fff;border:1px solid #e3e4e8;border-radius:22px;overflow:hidden;box-shadow:0 10px 30px #1111}
.hero{background:linear-gradient(140deg,#26080d,#101014);padding:28px 22px;text-align:center;color:#fff}
.hero img{width:156px;height:156px;object-fit:contain;border-radius:24px;background:#fff1}
h1{font-size:clamp(25px,6vw,36px);line-height:1.15;margin:20px 0 8px}
.muted{color:var(--muted);margin:5px 0}.hero .muted{color:#f1dfe1}
.pill{display:inline-block;background:#e6f6ec;color:#187744;border-radius:999px;padding:6px 11px;font-size:12px;font-weight:800;margin-top:12px}
.note{padding:12px 14px;border-radius:12px;background:#fff4d9;color:#765000;font-weight:700}
.note.women{background:#fce8ef;color:#8b2149}
.content{padding:22px}.content h2{font-size:18px;margin:18px 0 9px}
ul{padding-left:21px;line-height:1.8}.mutedline{color:var(--muted);line-height:1.65}
.actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px}
.button{display:inline-flex;justify-content:center;align-items:center;min-height:48px;padding:12px 16px;border-radius:12px;background:var(--red);color:white;text-decoration:none;font-weight:800;flex:1;text-align:center}
.button.secondary{background:#fff;color:var(--ink);border:1px solid #d7d9df}
footer{text-align:center;color:var(--muted);font-size:13px;padding:22px}
</style></head>
<body><header><a href="${SITE}/">SATRIA GO <span style="font-weight:500">| THERAPY & RECOVERY NETWORK</span></a></header>
<main><article class="card">
<section class="hero"><img src="${escapeHtml(photo)}" alt="Foto ${escapeHtml(name)}" loading="eager">
<div class="pill">✓ ANGGOTA TERVERIFIKASI SATRIA</div>
${womenNote}
<h1>${escapeHtml(name)}</h1><p class="muted">${escapeHtml(clinic)}</p>${cityLine}
</section>
<section class="content">
<h2>Profil Terapis SATRIA</h2>
<p class="mutedline">${escapeHtml(description)}</p>
<h2>Layanan</h2><ul>${serviceItems}</ul>
<h2>Layanan kunjungan</h2><p class="mutedline">${escapeHtml(homeVisitText)}</p>
<p class="mutedline">Informasi tarif, ketersediaan jadwal, dan kesesuaian layanan dikonfirmasi langsung sebelum pemesanan.</p>
<div class="actions"><a class="button" href="${SITE}/?terapis=${encodeURIComponent(String(provider.anggota_id))}#patientSearch">Lanjutkan ke reservasi SATRIA GO</a>${contact}</div>
</section></article><footer>Profil publik anggota terverifikasi • SATRIA GO<br><a href="${SITE}/">Kembali ke katalog terapis</a></footer></main>
</body></html>`;
    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=180, s-maxage=300",
        "x-content-type-options": "nosniff"
      }
    });
  } catch (error) {
    return new Response("Profil terapis sementara tidak dapat dimuat. Silakan coba kembali.", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" }
    });
  }
}
