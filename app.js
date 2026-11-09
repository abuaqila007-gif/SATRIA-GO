const cfg = window.SATRIA_GO_CONFIG;
const servicesFallback = [
  "Reposisi Tulang dan Sendi","Massage","Bekam / Cupping","Akupunktur",
  "Akupresure","Sport Injury","Recovery dan Relaksasi","Panggilan ke Rumah"
];
let catalog = [];
let selectedServiceName = "Reposisi Tulang dan Sendi";
let selectedMethod = "clinic";
let selectedServiceId = 1;
let providers = [];
let selectedProviderId = null;
const requestedProviderId = new URLSearchParams(window.location.search).get("terapis");
let selectedPackageId = null;
let gpsPosition = null;
let patientCity = "";
let selectedComplaint = "";
let patientDetails = {name:"", whatsapp:""};

const $ = s => document.querySelector(s);
const serviceGrid = $("#serviceGrid");
const serviceSelect = $("#serviceSelect");
const msg = $("#catalogMessage");

function providerProfileSlug(provider) {
  const name = String(provider?.nama || "terapis-satria")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${name || "terapis-satria"}-${encodeURIComponent(String(provider?.anggota_id ?? ""))}`;
}
function slugLabel(name) {
  const map = {"Reposisi Tulang dan Sendi":["Reposisi","Tulang & sendi"],"Massage":["Massage","Pijat terapi"],"Bekam / Cupping":["Bekam","Cupping therapy"],"Akupunktur":["Akupunktur","Terapi jarum"],"Akupresure":["Akupresure","Titik tekan"],"Sport Injury":["Sport Injury","Keluhan olahraga"],"Recovery dan Relaksasi":["Recovery","Relaksasi"],"Panggilan ke Rumah":["Home service","Terapis ke rumah"],"Bio Elektrik":["Bio Elektrik","Layanan mitra"]};
  return map[name] || [name,"Layanan SATRIA"];
}
function renderServices(items) {
  catalog = items;
  serviceGrid.innerHTML = "";
  serviceSelect.innerHTML = '<option value="">Pilih layanan</option>';
  items.forEach((s,i) => {
    const name = s.nama || s.name;
    const [label,desc] = slugLabel(name);
    const b = document.createElement("button");
    b.className = "service-card" + (name === selectedServiceName ? " selected" : "");
    b.type = "button";
    b.innerHTML = `<span>${["✣","◉","◌","⌁","◎","↗","♡","⌂"][i%8]}</span><b></b><small></small>`;
    b.querySelector("b").textContent = label;
    b.querySelector("small").textContent = desc;
    b.addEventListener("click", () => selectService(name,s.id,b));
    serviceGrid.appendChild(b);
    // Selalu masukkan layanan ke dropdown. ID fallback memakai ID database
    // yang sudah diverifikasi pada tabel satria_go_services (1 sampai 8).
    if (s.id !== undefined && s.id !== null) {
      const opt = document.createElement("option");
      opt.value = String(s.id);
      opt.textContent = name;
      serviceSelect.appendChild(opt);
    }
  });
  const serviceCount = $("#serviceCount");
  if (serviceCount) serviceCount.textContent = `${items.length} layanan`;
  const selected = items.find(x => String(x.id) === String(selectedServiceId));
  if (selected) {
    selectedServiceName = selected.nama || selected.name;
    serviceSelect.value = String(selected.id);
  }
}
function selectService(name,id,button) {
  selectedServiceName = name; selectedServiceId = id || null;
  document.querySelectorAll(".service-card").forEach(x=>x.classList.remove("selected"));
  button?.classList.add("selected");
  if (id !== undefined && id !== null) serviceSelect.value = String(id);
  const p = providers.find(x => String(x.anggota_id) === String(selectedProviderId));
  if (p) {
    const chosen = (p.services || []).find(x => String(x.service_id) === String(id));
    tariffHint.textContent = chosen ? `Tarif mitra: ${formatRupiah(chosen.tarif)}` : "Layanan ini belum diaktifkan oleh mitra.";
  }
}

const providerSelect = $("#providerSelect");
const providerGrid = $("#providerGrid");
const providerMessage = $("#providerMessage");
const tariffHint = $("#tariffHint");
const packageSelect = $("#packageSelect");
const packageDetail = $("#packageDetail");

function formatRupiah(value) {
  if (value === null || value === undefined || value === "") return "Tarif hubungi mitra";
  const n = Number(value);
  return Number.isFinite(n) ? "Rp " + n.toLocaleString("id-ID") : String(value);
}
function distanceKm(aLat,aLon,bLat,bLon) {
  const rad = v => v * Math.PI / 180;
  const dLat = rad(bLat-aLat), dLon = rad(bLon-aLon);
  const x = Math.sin(dLat/2)**2 + Math.cos(rad(aLat))*Math.cos(rad(bLat))*Math.sin(dLon/2)**2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}
function providerLocation(p) {
  const loc = (p.lokasi || [])[0];
  return [loc?.alamat, loc?.kota || p.kota || p.klinik].filter(Boolean).join(" • ") || "Lokasi praktik belum dipublikasikan";
}

// Jadwal praktik otomatis untuk seluruh anggota: setiap hari, 09.00–21.00 WIB.
function jakartaPracticeIsOpen(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(date);
  const hour = Number(parts.find(x => x.type === "hour")?.value || 0);
  const minute = Number(parts.find(x => x.type === "minute")?.value || 0);
  const minutes = hour * 60 + minute;
  return minutes >= 9 * 60 && minutes < 21 * 60;
}
function practiceStatusText() {
  return jakartaPracticeIsOpen() ? "● Buka praktik" : "● Tutup praktik";
}
function providerMapUrl(p, loc = null) {
  // Nur Rujiasih: buka titik koordinat yang sudah dikonfirmasi, bukan hasil pencarian nama toko/klinik.
  if (String(p?.nama || '').trim().toLocaleLowerCase('id-ID') === 'nur rujiasih') {
    return 'https://www.google.com/maps?q=-7.742449,110.423694';
  }
  // Arahkan ke nama klinik/tempat terapi, lalu sertakan alamat dan kota.
  // Koordinat hanya menjadi cadangan jika nama/alamat tidak tersedia.
  const place = [loc?.nama_tempat, p?.klinik, loc?.alamat, loc?.kota || p?.kota]
    .map(x => String(x || '').trim()).filter((x, i, a) => x && a.indexOf(x) === i);
  if (place.length) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.join(', '))}`;
  }
  const suppliedMap = String(p?.lokasi_url || p?.google_maps_url || '').trim();
  if (/^https?:\/\//i.test(suppliedMap)) return suppliedMap;
  const lat = loc?.latitude, lon = loc?.longitude;
  if (lat != null && lon != null && lat !== '' && lon !== '') {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lon}`)}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p?.kota || 'Indonesia')}`;
}
function renderProviderServices(p) {
  const available = (p?.services || []).map(ps => {
    const service = catalog.find(s => String(s.id) === String(ps.service_id));
    return service ? {...service, tarif:ps.tarif, durasi_menit:ps.durasi_menit} : null;
  }).filter(Boolean);

  // Layanan tidak dipilih oleh pelanggan. service_id tersembunyi hanya dipakai
  // sebagai referensi internal booking; keluhan menjadi input utama pelanggan.
  const defaultService = available[0] || catalog[0] || {id:1, nama:"Penanganan keluhan"};
  serviceSelect.innerHTML = `<option value="${defaultService.id}">${defaultService.nama}</option>`;
  serviceSelect.value = String(defaultService.id);
  selectedServiceId = defaultService.id;
  selectedServiceName = defaultService.nama || defaultService.name || "Penanganan keluhan";

  const formatRange = (min,max) => {
    if (min == null && max == null) return "Tarif dikonfirmasi oleh terapis";
    if (min != null && max != null) return `${formatRupiah(min)}–${formatRupiah(max)}`;
    return formatRupiah(min ?? max);
  };
  const duration = p?.durasi_min_menit != null && p?.durasi_max_menit != null
    ? `${p.durasi_min_menit}–${p.durasi_max_menit} menit`
    : "Durasi dikonfirmasi oleh terapis";
  const hasHomeVisit = p?.menerima_panggilan === true;
  const availability = hasHomeVisit
    ? "Home visit tersedia"
    : "Hanya datang ke tempat praktik";
  const homeVisitFeeInfo = hasHomeVisit
    ? " Biaya tambahan Home Visit dikonfirmasi langsung melalui WhatsApp kepada terapis; nominal menyesuaikan kebijakan terapis dan lokasi kunjungan."
    : "";

  if (available.length) {
    const servicePrices = available.map(s => formatRupiah(s.tarif)).join(", ");
    tariffHint.textContent = `Tarif layanan: ${servicePrices}. Durasi: ${duration}. ${availability}.${homeVisitFeeInfo}`;
  } else {
    tariffHint.textContent = `Tarif: ${formatRange(p?.tarif_min,p?.tarif_max)}. Durasi: ${duration}. ${availability}.${homeVisitFeeInfo}`;
  }
  renderPackages(p);
}
function renderPackages(p) {
  const packages = p?.packages || [];
  packageSelect.innerHTML = '<option value="">Pilih paket terapi</option>';
  selectedPackageId = null;
  packageDetail.textContent = packages.length
    ? "Pilih paket untuk melihat rincian tindakan."
    : "Paket khusus belum tersedia untuk terapis ini.";
  packages.forEach(pkg => {
    const option = document.createElement("option");
    option.value = String(pkg.id);
    option.textContent = `${pkg.nama_paket} • ${formatRupiah(pkg.tarif)}`;
    packageSelect.appendChild(option);
  });
  if (packages.length) {
    packageSelect.value = String(packages[0].id);
    showPackage(packages[0].id);
  }
}
function showPackage(id) {
  const p = providers.find(x => String(x.anggota_id) === String(selectedProviderId));
  const pkg = (p?.packages || []).find(x => String(x.id) === String(id));
  selectedPackageId = pkg ? pkg.id : null;
  if (!pkg) {
    packageDetail.textContent = "Pilih paket terapi.";
    tariffHint.textContent = "Pilih paket untuk melihat harga dan durasi.";
    return;
  }
  packageDetail.innerHTML = "";
  const title = document.createElement("b");
  title.textContent = pkg.nama_paket;
  const price = document.createElement("span");
  price.className = "package-price";
  price.textContent = formatRupiah(pkg.tarif);
  const duration = document.createElement("div");
  duration.className = "package-duration";
  const description = String(pkg.deskripsi || "");
  const durationMatch = description.match(/durasi:\s*([^.;]+)/i);
  const visitsMatch = description.match(/(\d+)\s*kali kunjungan/i);
  const durationLabel = durationMatch?.[1] || (visitsMatch
    ? `${visitsMatch[1]} kali kunjungan • ${pkg.durasi_menit} menit/kunjungan`
    : `${pkg.durasi_menit} menit`);
  duration.textContent = `Durasi: ${durationLabel}`;
  const actions = Array.isArray(pkg.tindakan) ? pkg.tindakan.filter(Boolean) : [];
  // Fallback: jika API belum mengirim item tindakan, tampilkan deskripsi paket.
  const descriptionActions = String(pkg.deskripsi || "")
    .split(/\\r?\\n|[,;•]/)
    .map(item => item.trim())
    .filter(Boolean);
  const visibleActions = actions.length ? actions : descriptionActions;
  packageDetail.append(title, price, duration);
  if (visibleActions.length) {
    const heading = document.createElement("div");
    heading.textContent = "Rincian tindakan:";
    const list = document.createElement("ul");
    visibleActions.forEach(action => {
      const li = document.createElement("li");
      li.textContent = action;
      list.appendChild(li);
    });
    packageDetail.append(heading, list);
  } else {
    const note = document.createElement("div");
    note.textContent = "Rincian tindakan belum diterima dari katalog. Periksa data item paket di Supabase.";
    packageDetail.append(note);
  }
  tariffHint.textContent = `Paket dipilih: ${pkg.nama_paket} • ${formatRupiah(pkg.tarif)} • ${durationLabel}.`;
}

function chooseProvider(id) {
  const p = providers.find(x => String(x.anggota_id) === String(id));
  selectedProviderId = p ? p.anggota_id : null;
  providerSelect.value = p ? String(p.anggota_id) : "";
  document.querySelectorAll(".provider-card").forEach(card => {
    card.classList.toggle("selected", card.dataset.providerId === String(selectedProviderId));
  });
  renderProviderServices(p);
}
function acceptsMethod(p, method) {
  const visit = String(p?.menerima_kunjungan || "").toLowerCase();
  if (method === "home") {
    // Kolom menerima_panggilan adalah penentu khusus home visit.
    // Profil dengan nilai "both" tetap tidak boleh tampil bila menerima_panggilan=false.
    return p?.menerima_panggilan === true;
  }
  // Default: pelanggan datang ke tempat praktik. Profil "both" juga diterima.
  return ["clinic", "both", "keduanya", "datang", "praktik"].includes(visit)
    || p?.menerima_kunjungan === true;
}
let satriaMap = null;
let mapMarkers = [];
function mapPhotoUrl(p) {
  const supplied = String(p?.foto_url || '').trim();
  if (/^https?:\/\//i.test(supplied)) return supplied;
  const name = String(p?.nama || '').toLowerCase();
  if (name.includes('susanto') || name.includes('q_taka') || name.includes('qtaka')) return 'foto-susanto-qtaka.jpg';
  if (name.includes('amin pujanto')) return 'foto-amin-pujanto.jpg';
  return 'logo-satria.png';
}
function mapWhatsApp(p) {
  const raw = p?.whatsapp || p?.nomor_whatsapp || p?.no_whatsapp || p?.phone || p?.telepon || '';
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return '';
  return 'https://wa.me/' + (digits.startsWith('0') ? '62' + digits.slice(1) : digits);
}
function renderMemberMap(items = providers) {
  const all = (items || []).filter(p => p && p.status_verifikasi === 'verified');
  const search = ($('#mapSearch')?.value || '').trim().toLowerCase();
  const serviceFilter = $('#mapServiceFilter')?.value || '';
  const matched = all.filter(p => {
    const hay = [p.nama,p.kota,p.klinik,providerLocation(p)].join(' ').toLowerCase();
    const serviceOk = !serviceFilter || (p.services || []).some(s => String(s.service_id) === serviceFilter);
    return hay.includes(search) && serviceOk;
  });
  const located = matched.map(p => ({
    provider: p,
    location: (p.lokasi || []).find(l => Number.isFinite(Number(l.latitude)) && Number.isFinite(Number(l.longitude)) && l.latitude !== null && l.longitude !== null && l.latitude !== '' && l.longitude !== '')
  })).filter(x => x.location);
  const count = $('#mapMemberCount');
  if (count) count.textContent = `${located.length} anggota di peta · ${matched.length} ditemukan`;

  // Hindari kartu anggota duplikat di bawah peta. Profil lengkap hanya
  // ditampilkan sekali pada providerGrid; peta tetap memiliki pin interaktif.
  const list = $('#mapMemberList');
  if (list) {
    list.innerHTML = '';
    list.hidden = true;
    list.setAttribute('aria-hidden', 'true');
  }
  if (!window.L || !$('#satriaMap')) return;
  if (!satriaMap) {
    satriaMap = L.map('satriaMap').setView([-7.8,110.4],7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(satriaMap);
  }
  mapMarkers.forEach(m => m.remove()); mapMarkers = [];
  located.forEach(({provider:p,location:loc}) => {
    const photoUrl = mapPhotoUrl(p);
    const icon = L.divIcon({
      className: 'satria-photo-marker-wrap',
      html: `<span class="satria-photo-marker"><img src="${escapeMapText(photoUrl)}" alt=""></span>`,
      iconSize: [58,58], iconAnchor: [29,29], popupAnchor: [0,-27]
    });
    const marker = L.marker([Number(loc.latitude),Number(loc.longitude)],{icon}).addTo(satriaMap);
    const status = practiceStatusText().replace('● ','');
    const wa = mapWhatsApp(p);
    const mapsUrl = providerMapUrl(p, loc);
    const packages = Array.isArray(p.packages) ? p.packages : [];
    const packageLines = packages.slice(0, 3).map(pkg =>
      `<li><span>${escapeMapText(pkg.nama_paket || 'Paket terapi')}</span><b>${escapeMapText(formatMapPrice(pkg.tarif))}</b></li>`
    ).join('');
    const serviceNames = [...new Set([
      ...(Array.isArray(p.services) ? p.services.map(s => catalog.find(c => String(c.id) === String(s.service_id))?.nama).filter(Boolean) : []),
      ...(p.layanan ? String(p.layanan).split(/[,;•]/).map(x => x.trim()).filter(Boolean) : [])
    ])].slice(0, 5);
    const servicesHtml = serviceNames.length
      ? `<p class="satria-map-services"><b>Layanan:</b> ${escapeMapText(serviceNames.join(' • '))}</p>`
      : '';
    const prices = packages.map(x => Number(x.tarif)).filter(Number.isFinite);
    if (p.tarif_min != null && Number.isFinite(Number(p.tarif_min))) prices.push(Number(p.tarif_min));
    const startingPrice = prices.length ? Math.min(...prices) : null;
    const priceHtml = startingPrice !== null
      ? `<p class="satria-map-starting">Mulai <b>${escapeMapText(formatMapPrice(startingPrice))}</b></p>`
      : '<p class="satria-map-starting">Tarif dikonfirmasi dengan terapis</p>';
    const packagesHtml = packageLines ? `<div class="satria-map-packages"><b>Paket terapi</b><ul>${packageLines}</ul></div>` : '';
    const canContact = p?.menerima_panggilan === true;
    const popup = `<div class="satria-map-popup"><div class="satria-map-popup-head"><img src="${escapeMapText(photoUrl)}" alt=""><div><b>${escapeMapText(p.nama)}</b><small>${escapeMapText(p.klinik || 'Anggota SATRIA')}</small></div></div><p>${escapeMapText(providerLocation(p) || p.kota)}</p><small>${status}</small>${servicesHtml}${priceHtml}${packagesHtml}<div class="satria-map-popup-actions">${canContact && wa ? `<a class="map-wa" href="${escapeMapText(wa)}" target="_blank" rel="noopener">WhatsApp</a>` : ''}<a class="map-directions" href="${mapsUrl}" target="_blank" rel="noopener">Petunjuk arah</a></div></div>`;
    marker.bindPopup(popup, {
      maxWidth: Math.min(196, Math.max(176, window.innerWidth - 112)),
      minWidth: Math.min(176, Math.max(160, window.innerWidth - 140)),
      maxHeight: Math.round(window.innerHeight * 0.32),
      offset: [12, -12], autoPan: true, keepInView: true, autoPanPadding: [24, 24],
      closeButton: true
    }); mapMarkers.push(marker);
  });
  // Fokus awal di Jawa Tengah agar peta tidak mengecil terlalu jauh karena anggota lintas provinsi.
  // Semua pin tetap tersedia; pengguna dapat zoom out untuk melihat wilayah lain.
  if (located.length === 1) {
    satriaMap.setView([Number(located[0].location.latitude),Number(located[0].location.longitude)],14);
  } else if (located.length > 1) {
    satriaMap.setView([-7.15,110.40],8);
  }
}

function formatMapPrice(value) {
  const n = Number(value);
  return Number.isFinite(n) ? 'Rp ' + n.toLocaleString('id-ID') : 'Hubungi terapis';
}
function escapeMapText(v) { return String(v || "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

function isWomenOnlyProvider(p) {
  const marker = String(p?.bio_layanan || "");
  const name = String(p?.nama || "").trim().toLocaleLowerCase("id-ID");
  return /khusus\\s+(pasien\\s+)?wanita/i.test(marker)
    || name === "nur rujiasih"
    || [20, 5, 38].includes(Number(p?.anggota_id));
}
function renderProviders(items) {
  if (items) providers = [...items];
  const normCity = v => String(v || "").toLocaleLowerCase("id-ID").replace(/[^a-z0-9]+/g," ").trim();
  const targetCity = normCity(patientCity);
  // Pasien melihat semua terapis dalam kota/kabupaten yang dipilih.
  // Tidak memakai GPS pasien dan tidak mengurutkan berdasarkan jarak.
  // Katalog profil menampilkan semua anggota aktif yang sudah verified.
  // Hak menerima pesanan diperiksa terpisah agar profil verified yang belum
  // membuka pemesanan tetap terlihat tanpa dapat dipilih untuk booking.
  const visibleProviders = providers.filter(p => {
    if (p?.status_verifikasi !== "verified") return false;
    if (!targetCity) return true;
    const providerCity = normCity(p.kota || (p.lokasi || []).find(l => l.kota)?.kota || "");
    return providerCity === targetCity || providerCity.includes(targetCity) || targetCity.includes(providerCity);
  }).sort((a,b) => String(a.nama||"").localeCompare(String(b.nama||""),"id"));
  providerGrid.innerHTML = "";
  providerSelect.innerHTML = '<option value="">Pilih terapis</option>';
  $("#providerCount").textContent = `${visibleProviders.length} mitra`;
  if (!visibleProviders.length) {
    providerMessage.textContent = patientCity
      ? `Belum ada profil anggota terverifikasi di ${patientCity}.`
      : "Belum ada profil anggota terverifikasi. Isi kota/kabupaten domisili terlebih dahulu.";
    const empty = document.createElement("div");
    empty.className = "provider-empty";
    empty.textContent = "Profil anggota SATRIA yang sudah diverifikasi akan tampil di sini.";
    providerGrid.appendChild(empty);
    selectedProviderId = null;
    return;
  }
  providerMessage.textContent = patientCity
    ? `Menampilkan profil anggota SATRIA terverifikasi di wilayah ${patientCity}. Tombol pesan hanya aktif untuk mitra yang membuka pemesanan.`
    : "Pilih kota/kabupaten domisili untuk menampilkan profil anggota terverifikasi di wilayah tersebut.";
  visibleProviders.forEach(p => {
    const canBook = p?.menerima_pesanan === true && acceptsMethod(p, selectedMethod);
    const kota = p.kota || (p.lokasi || []).find(l => l.kota)?.kota || "Kota belum dicantumkan";
    if (canBook) {
      const opt = document.createElement("option");
      opt.value = String(p.anggota_id);
      opt.textContent = `${p.nama || "Terapis SATRIA"}${isWomenOnlyProvider(p) ? " — KHUSUS PASIEN WANITA" : ""} — ${kota}`;
      providerSelect.appendChild(opt);
    }

    const card = document.createElement("article");
    card.className = "provider-card";
    card.dataset.providerId = String(p.anggota_id);
    const identity = document.createElement("div");
    identity.className = "provider-identity";
    if (p.foto_url) {
      const photo = document.createElement("img");
      photo.className = "provider-avatar";
      photo.src = p.foto_url;
      photo.alt = `Foto ${p.nama || "terapis SATRIA"}`;
      photo.loading = "lazy";
      photo.referrerPolicy = "no-referrer";
      photo.onerror = () => photo.remove();
      identity.appendChild(photo);
    }
    const titleBlock = document.createElement("div");
    const name = document.createElement("b");
    name.textContent = p.nama || "Terapis SATRIA";
    const clinic = document.createElement("span");
    clinic.className = "provider-clinic";
    clinic.textContent = String(p.klinik || '').trim() || "Anggota SATRIA";
    titleBlock.append(name,clinic);
    const verified = document.createElement("small");
    verified.className = "provider-verified-badge";
    verified.textContent = "✓ TERVERIFIKASI SATRIA";
    titleBlock.appendChild(verified);
    if (isWomenOnlyProvider(p)) {
      const womenOnly = document.createElement("small");
      womenOnly.className = "women-only-badge";
      womenOnly.textContent = "KHUSUS PASIEN WANITA";
      titleBlock.appendChild(womenOnly);
    }
    identity.appendChild(titleBlock);
    const location = document.createElement("span");
    location.className = "provider-address";
    location.textContent = providerLocation(p);
    const state = document.createElement("small");
    state.className = `practice-state ${jakartaPracticeIsOpen() ? "is-open" : "is-closed"}`;
    const nurHomeVisitOnly = String(p?.nama || '').trim().toLocaleLowerCase('id-ID') === 'nur rujiasih';
    state.textContent = nurHomeVisitOnly ? '● Home Visit saja' : practiceStatusText();
    const modes = document.createElement("small");
    modes.textContent = nurHomeVisitOnly
      ? "HOME VISIT TERSEDIA • Tidak menerima pasien di tempat praktik"
      : (p.menerima_panggilan
        ? "Praktik & home visit tersedia"
        : "Datang ke tempat praktik • tanpa home visit");
    const homeVisitInfo = p.menerima_panggilan === true
      ? document.createElement("small")
      : null;
    if (homeVisitInfo) {
      homeVisitInfo.className = "home-visit-fee-note";
      homeVisitInfo.textContent = "Biaya tambahan Home Visit ditanyakan langsung melalui WhatsApp kepada terapis.";
    }
    const count = document.createElement("small");
    count.textContent = p.tarif_min != null && p.tarif_max != null
      ? `Tarif ${formatRupiah(p.tarif_min)}–${formatRupiah(p.tarif_max)} • ${p.durasi_min_menit ?? "?"}–${p.durasi_max_menit ?? "?"} menit`
      : `${(p.services || []).length} layanan aktif`;
    const actions = document.createElement("div");
    actions.className = "provider-card-actions";
    const publicLocation = (p.lokasi || []).length > 0;
    if (publicLocation) {
      const mapLink = document.createElement("a");
      mapLink.className = "provider-map-link";
      mapLink.href = providerMapUrl(p, p.lokasi[0]);
      mapLink.target = "_blank"; mapLink.rel = "noopener";
      mapLink.textContent = "Lihat peta";
      actions.appendChild(mapLink);
    }
    const profileLink = document.createElement("a");
    profileLink.className = "provider-map-link";
    profileLink.href = `/terapis/${providerProfileSlug(p)}`;
    profileLink.textContent = "Profil lengkap";
    profileLink.setAttribute("aria-label", `Lihat profil ${p.nama || "terapis SATRIA"}`);
    actions.appendChild(profileLink);

    const book = document.createElement("button");
    book.type = "button"; book.className = "provider-book-button";
    book.textContent = canBook ? "Pilih / Pesan" : "Belum menerima pesanan";
    book.disabled = !canBook;
    if (!canBook) book.title = "Profil terverifikasi, tetapi pemesanan belum diaktifkan.";
    book.addEventListener("click", () => {
      if (!canBook) return;
      chooseProvider(p.anggota_id);
      $("#bookingModal").hidden = false;
    });
    actions.appendChild(book);
    if (homeVisitInfo) card.append(identity,location,state,modes,homeVisitInfo,count,actions);
    else card.append(identity,location,state,modes,count,actions);
    providerGrid.appendChild(card);
  });
  const bookableProviders = visibleProviders.filter(p => p?.menerima_pesanan === true && acceptsMethod(p, selectedMethod));
  const selected = bookableProviders.find(p => String(p.anggota_id) === String(selectedProviderId)) || bookableProviders[0];
  if (selected) {
    chooseProvider(selected.anggota_id);
  } else {
    selectedProviderId = null;
    providerSelect.value = "";
    tariffHint.textContent = "Pilih mitra yang sudah mengaktifkan pemesanan untuk membuat pesanan. Profil anggota terverifikasi tetap dapat dilihat.";
    packageSelect.innerHTML = '<option value="">Pemesanan belum tersedia</option>';
    packageDetail.textContent = "Profil ini belum membuka pemesanan.";
  }
}



// Perbarui label buka/tutup otomatis setiap menit berdasarkan jam WIB.
function refreshPracticeStatusLabels() {
  const isOpen = jakartaPracticeIsOpen();
  document.querySelectorAll(".practice-state").forEach(el => {
    el.textContent = practiceStatusText();
    el.classList.toggle("is-open", isOpen);
    el.classList.toggle("is-closed", !isOpen);
  });
}
setInterval(refreshPracticeStatusLabels, 60 * 1000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) refreshPracticeStatusLabels();
});
window.addEventListener("focus", refreshPracticeStatusLabels);

let catalogLoading = false;
let lastCatalogLoadedAt = 0;
async function loadCatalog() {
  if (catalogLoading) return;
  catalogLoading = true;
  try {
    const r = await fetch(`${cfg.functionsBaseUrl}/public-catalog`, {headers:{"apikey":cfg.publishableKey}, cache:"no-store"});
    if (!r.ok) throw new Error("Katalog belum tersedia dari server.");
    const data = await r.json();
    if (!Array.isArray(data.services) || !data.services.length) throw new Error("Katalog layanan kosong.");
    renderServices(data.services);
    renderProviders(data.providers || []);
    const serviceFilter = $("#mapServiceFilter");
    if (serviceFilter && serviceFilter.options.length === 1) data.services.forEach(s => {
      const opt=document.createElement("option"); opt.value=String(s.id); opt.textContent=s.nama || s.name; serviceFilter.appendChild(opt);
    });
    renderMemberMap(data.providers || []);
    lastCatalogLoadedAt = Date.now();
    msg.textContent = data.providers?.length ? `${data.providers.length} mitra terverifikasi tersedia. Daftar diperbarui otomatis.` : (data.catalog_error || "Belum ada mitra terverifikasi yang menerima pesanan.");
  } catch(e) {
    renderServices(servicesFallback.map((nama,i)=>({nama,id:i+1})));
    renderProviders([]);
    msg.textContent = "Katalog lokal ditampilkan. Koneksi katalog mitra belum tersedia.";
  } finally {
    catalogLoading = false;
  }
}
document.querySelectorAll(".service-card").forEach(b=>b.addEventListener("click",()=>selectService(b.dataset.serviceName,null,b)));
document.querySelectorAll(".method-card").forEach(b=>b.addEventListener("click",()=>{
  document.querySelectorAll(".method-card").forEach(x=>x.classList.remove("active"));
  b.classList.add("active");
  selectedMethod = b.dataset.method === "home" ? "home" : "clinic";
  const methodInput = document.querySelector('#bookingForm [name="method"]');
  if (methodInput) methodInput.value = selectedMethod;
  // Terapis difilter ulang sesuai cara kunjungan yang dipilih.
  renderProviders();
}));
document.querySelectorAll(".complaint-card").forEach(card => {
  card.addEventListener("click", () => {
    selectedComplaint = card.dataset.complaint;
    const complaintBox = document.querySelector('#bookingForm [name="complaint"]');
    if (complaintBox) complaintBox.value = `Kategori keluhan: ${selectedComplaint}`;
    document.querySelectorAll(".complaint-card").forEach(x => x.classList.remove("selected"));
    card.classList.add("selected");
    const note = document.querySelector(".complaint-foot");
    if (note) note.textContent = `Keluhan dipilih: ${selectedComplaint}. Pilih terapis yang sesuai pada daftar berikut.`;
    document.querySelector("#providers").scrollIntoView({behavior:"smooth",block:"start"});
  });
});
$("#patientSearchForm").addEventListener("submit", e => {
  e.preventDefault();
  patientDetails = {name:$("#patientName").value.trim(), whatsapp:$("#patientWhatsapp").value.trim()};
  patientCity = $("#patientCity").value.trim();
  $("#locationText").textContent = patientCity;
  const nameField = document.querySelector('#bookingForm [name="name"]');
  const waField = document.querySelector('#bookingForm [name="whatsapp"]');
  const addressField = document.querySelector('#bookingForm [name="address"]');
  const complaintField = document.querySelector('#bookingForm [name="complaint"]');
  if (nameField) nameField.value = patientDetails.name;
  if (waField) waField.value = patientDetails.whatsapp;
  if (addressField) addressField.value = patientCity;
  if (complaintField && selectedComplaint) complaintField.value = `Kategori keluhan: ${selectedComplaint}`;
  renderProviders();
  if (requestedProviderId) {
    const targetCard = [...document.querySelectorAll(".provider-card")]
      .find(card => card.dataset.providerId === String(requestedProviderId));
    if (targetCard) {
      chooseProvider(requestedProviderId);
      targetCard.scrollIntoView({behavior:"smooth",block:"center"});
    } else {
      document.querySelector("#complaints").scrollIntoView({behavior:"smooth",block:"start"});
    }
  } else {
    document.querySelector("#complaints").scrollIntoView({behavior:"smooth",block:"start"});
  }
});
$("#startBooking").addEventListener("click",()=>{
  
  if (selectedServiceId) serviceSelect.value = String(selectedServiceId);
  $("#bookingModal").hidden=false;
});
serviceSelect.addEventListener("change", () => {
  const chosen = catalog.find(s => String(s.id) === serviceSelect.value);
  if (chosen) {
    selectedServiceId = chosen.id;
    selectedServiceName = chosen.nama || chosen.name;
    document.querySelectorAll(".service-card").forEach(card => {
      const label = card.querySelector("b")?.textContent || "";
      card.classList.toggle("selected", label === slugLabel(selectedServiceName)[0]);
    });
    const p = providers.find(x => String(x.anggota_id) === String(selectedProviderId));
    const ps = (p?.services || []).find(x => String(x.service_id) === String(chosen.id));
    tariffHint.textContent = ps ? `Tarif mitra: ${formatRupiah(ps.tarif)}` : "Tarif belum tersedia.";
  } else {
    selectedServiceId = null;
    tariffHint.textContent = "Pilih layanan.";
  }
});
providerSelect.addEventListener("change", () => chooseProvider(providerSelect.value));
packageSelect.addEventListener("change", () => showPackage(packageSelect.value));
$("#closeModal").addEventListener("click",()=>$("#bookingModal").hidden=true);
$("#bookingModal").addEventListener("click",e=>{if(e.target.id==="bookingModal")e.currentTarget.hidden=true});
$("#bookingForm").addEventListener("submit",async e=>{
  e.preventDefault();
  // Buka tab kosong langsung dari aksi klik agar tidak diblokir browser Android.
  const waWindow = window.open("about:blank", "_blank");
  const f = new FormData(e.currentTarget);
  const payload = {
    pelanggan_nama:f.get("name"), pelanggan_whatsapp:f.get("whatsapp"),
    pelanggan_jenis_kelamin:f.get("patient_gender"),
    service_id:Number(f.get("service_id")), anggota_id:Number(f.get("anggota_id")), package_id:Number(f.get("package_id")), method:f.get("method"),
    tanggal_pesanan:f.get("date"), jam_pesanan:f.get("time"),
    alamat_pelanggan:f.get("address"), keluhan:f.get("complaint")
  };
  const status=$("#formMessage");
  if(!payload.anggota_id){status.textContent="Pilih terapis SATRIA terlebih dahulu.";return;}
  if(!payload.package_id){status.textContent="Pilih paket terapi terlebih dahulu.";return;}
  const selectedProvider = providers.find(p => String(p.anggota_id) === String(payload.anggota_id));
  if (!selectedProvider || !acceptsMethod(selectedProvider, payload.method)) {
    status.textContent = "Terapis tersebut tidak melayani metode kunjungan yang dipilih. Silakan pilih terapis lain.";
    return;
  }
  if(!payload.service_id){payload.service_id = Number(catalog[0]?.id || 1);}
  if(payload.method==="home" && !payload.alamat_pelanggan.trim()){status.textContent="Alamat wajib diisi untuk panggilan ke rumah.";return;}
  status.textContent="Mengirim permintaan…";
  try{
    const r=await fetch(`${cfg.functionsBaseUrl}/create-booking`,{
      method:"POST",headers:{"Content-Type":"application/json","apikey":cfg.publishableKey},body:JSON.stringify(payload)
    });
    const data=await r.json();
    if(!r.ok) throw new Error(data.error||"Permintaan belum dapat diproses.");
    status.textContent=`Pesanan tersimpan. Kode pesanan: ${data.kode_pesanan}.`;
    if (data.whatsapp_url) {
      if (waWindow && !waWindow.closed) {
        waWindow.location.href = data.whatsapp_url;
      } else {
        const link = document.createElement("a");
        link.href = data.whatsapp_url;
        link.target = "_blank";
        link.rel = "noopener";
        link.textContent = "Ketuk di sini untuk mengirim pesanan ke WhatsApp terapis";
        link.style.display = "inline-block";
        link.style.marginTop = "10px";
        link.style.fontWeight = "800";
        link.style.color = "#b20d25";
        status.append(document.createElement("br"), link);
      }
    } else {
      if (waWindow && !waWindow.closed) waWindow.close();
      status.textContent += " Nomor WhatsApp terapis belum tersedia; hubungi admin SATRIA.";
    }
    e.currentTarget.reset();
  }catch(err){
    if (waWindow && !waWindow.closed) waWindow.close();
    status.textContent=`Belum terkirim: ${err.message}. Periksa koneksi dan Edge Function create-booking.`;
  }
});
$("#mapSearch")?.addEventListener("input",()=>renderMemberMap());
$("#mapServiceFilter")?.addEventListener("change",()=>renderMemberMap());

$("#mapSearch")?.addEventListener("input",()=>renderMemberMap());
$("#mapServiceFilter")?.addEventListener("change",()=>renderMemberMap());

$("#reviewForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  const f=new FormData(e.currentTarget), status=$("#reviewMessage");
  status.textContent="Mengirim ulasan…";
  try {
    const r=await fetch(`${cfg.functionsBaseUrl}/submit-review`,{
      method:"POST",headers:{"Content-Type":"application/json","apikey":cfg.publishableKey},
      body:JSON.stringify({kode_pesanan:f.get("kode_pesanan"),whatsapp:f.get("whatsapp"),rating:Number(f.get("rating")),ulasan:f.get("ulasan")})
    });
    const data=await r.json();
    if(!r.ok) throw new Error(data.error||"Ulasan gagal dikirim.");
    status.textContent=data.message||"Ulasan berhasil dikirim."; e.currentTarget.reset(); loadCatalog();
  } catch(err) { status.textContent=err.message; }
});

loadCatalog();
// Refresh katalog saat tab kembali aktif dan setiap 30 detik.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && Date.now() - lastCatalogLoadedAt > 5000) loadCatalog();
});
window.addEventListener("focus", () => {
  if (Date.now() - lastCatalogLoadedAt > 5000) loadCatalog();
});
window.setInterval(() => {
  if (document.visibilityState === "visible") loadCatalog();
}, 30000);
