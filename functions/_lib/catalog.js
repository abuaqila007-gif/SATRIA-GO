const API_URL = "https://qvaemfrxeljzznqebgfz.supabase.co/functions/v1/public-catalog";
const PUBLISHABLE_KEY = "sb_publishable_d-ZkXXcQeMeXYNl1dKBz4w_oaXMTHVM";
export const SITE = "https://satria-go.pages.dev";

export async function getPublicCatalog() {
  const response = await fetch(API_URL, {
    headers: { apikey: PUBLISHABLE_KEY },
    cf: { cacheTtl: 180, cacheEverything: true }
  });
  if (!response.ok) throw new Error(`Katalog publik gagal dimuat (${response.status})`);
  const data = await response.json();
  if (!Array.isArray(data.providers)) throw new Error("Respons katalog tidak memuat daftar terapis.");
  return data;
}

export function slugify(value) {
  return String(value || "terapis-satria")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "terapis-satria";
}

export function profileSlug(provider) {
  return `${slugify(provider?.nama)}-${String(provider?.anggota_id ?? "")}`;
}

export function verifiedProviders(data) {
  return (data.providers || []).filter(p =>
    p && p.status_verifikasi === "verified" && p.anggota_id != null && String(p.nama || "").trim()
  );
}

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}

export function absoluteImage(value) {
  const raw = String(value || "").trim();
  if (!raw) return `${SITE}/og-preview-v2.jpg`;
  try {
    const url = new URL(raw, SITE);
    return url.protocol === "https:" ? url.href : `${SITE}/og-preview-v2.jpg`;
  } catch {
    return `${SITE}/og-preview-v2.jpg`;
  }
}

export function serviceNames(provider, data) {
  const names = [];
  const serviceRows = Array.isArray(provider.services) ? provider.services : [];
  for (const row of serviceRows) {
    const match = (data.services || []).find(s => String(s.id) === String(row.service_id));
    const name = match?.nama || match?.name;
    if (name && !names.includes(name)) names.push(name);
  }
  if (provider.layanan) {
    for (const item of String(provider.layanan).split(/[,;•]/).map(x => x.trim()).filter(Boolean)) {
      if (!names.includes(item)) names.push(item);
    }
  }
  return names;
}

export function cityName(provider) {
  const firstLocation = (provider.lokasi || []).find(loc => loc && loc.kota);
  return String(provider.kota || firstLocation?.kota || "").trim();
}

export function isWomenOnly(provider) {
  const marker = String(provider?.bio_layanan || "");
  const name = String(provider?.nama || "").trim().toLocaleLowerCase("id-ID");
  return /khusus\s+(pasien\s+)?wanita/i.test(marker)
    || name === "nur rujiasih"
    || [20, 5, 38].includes(Number(provider?.anggota_id));
}

export function whatsappUrl(provider) {
  const raw = provider?.whatsapp || provider?.nomor_whatsapp || provider?.no_whatsapp || provider?.phone || provider?.telepon || "";
  const digits = String(raw).replace(/\D/g, "");
  if (!digits) return "";
  return `https://wa.me/${digits.startsWith("0") ? "62" + digits.slice(1) : digits}`;
}
