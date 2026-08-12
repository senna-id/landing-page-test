// ==========================================
// CONFIGURATION & GLOBAL STATE
// ==========================================
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyD1UcAQu2TFLu7N4Do-39FbeK7gzOcyQHfb3oGcZoeLCQxIsk9noQLDT0JoJXmcH6x/exec?sheet=opple';
let rawProductsData = [];
let isGlobalSearchMode = false;
let cart = JSON.parse(localStorage.getItem('senna_cart')) || [];

// ==========================================
// DYNAMIC PAGE DETECTION (OPSI 1)
// ==========================================
function getDefaultSeriesFromURL() {
  const path = window.location.pathname.toLowerCase();

  if (path.includes('highbay')) {
    return ['HB-P2', 'HB-E3', 'HB-PERFORMER'];
  } else if (path.includes('tl-led') || path.includes('waterproof')) {
    return ['TL-E2', 'WP-E2'];
  } else if (path.includes('spotlight')) {
    return ['SP-P2', 'SP-E2'];
  } else if (path.includes('panel')) {
    return ['PL-P2', 'PL-E2'];
  }
  
  // Default jika di halaman downlight-opple.html / detail-downlight-opple.html
  return ['DL-P2', 'DL-E3', 'DL-US'];
}

// ==========================================
// COMPONENT LOADER (HEADER, FOOTER, CART)
// ==========================================
async function loadComponent(elementId, fileUrl) {
  try {
    const response = await fetch(fileUrl);
    if (response.ok) {
      document.getElementById(elementId).innerHTML = await response.text();
      if (elementId === 'cart-container') renderCartUI();
    }
  } catch (error) {
    console.error(`Gagal memuat ${fileUrl}:`, error);
  }
}

// ==========================================
// DYNAMIC TABLE RENDERER
// ==========================================
function renderDynamicTable(products, headId, bodyId, isSearchTable = false) {
  const tableHead = document.getElementById(headId);
  const tableBody = document.getElementById(bodyId);
  if (!tableHead || !tableBody) return;

  tableHead.innerHTML = '';
  tableBody.innerHTML = '';

  if (!products || products.length === 0) {
    tableBody.innerHTML = '<tr><td class="text-center text-muted py-4">Belum ada data produk yang cocok.</td></tr>';
    return;
  }

  const ignoredKeys = ['series', 'status'];
  const allKeys = Object.keys(products[0]).filter(key => !ignoredKeys.includes(key.trim().toLowerCase()));
  const activeKeys = allKeys.filter(key => 
    products.some(item => item[key] !== undefined && item[key] !== null && String(item[key]).trim() !== '' && String(item[key]).trim() !== '-')
  );

  let headHtml = '<tr>';
  activeKeys.forEach((key, index) => {
    headHtml += index === 0 ? `<th>${key}</th>` : `<th class="text-center">${key}</th>`;
  });

  if (isSearchTable) {
    headHtml += `<th class="text-center" style="width: 130px;">Seri / Jenis</th>`;
  }

  headHtml += `<th class="text-center" style="width: 150px;">Minta Penawaran</th></tr>`;
  tableHead.innerHTML = headHtml;

  let bodyHtml = '';
  products.forEach(item => {
    const statusKey = Object.keys(item).find(k => k.trim().toLowerCase() === 'status');
    const statusValue = statusKey ? String(item[statusKey] || '').trim().toLowerCase() : '';
    const isDiscontinued = statusValue === 'discontinued';
    const rowClass = isDiscontinued ? 'class="table-secondary opacity-75"' : '';

    const itemCode = item[activeKeys[0]] ? String(item[activeKeys[0]]).trim() : 'Produk Opple';
    const seriesKey = Object.keys(item).find(k => k.trim().toLowerCase() === 'series');
    const itemSeries = seriesKey ? String(item[seriesKey] || '').trim() : 'Produk';

    bodyHtml += `<tr ${rowClass}>`;
    activeKeys.forEach((key, index) => {
      let val = item[key] !== undefined && item[key] !== null ? String(item[key]).trim() : '-';

      if (key.toLowerCase().includes('cct') || val.match(/^\d{4}K$/i)) {
        const numVal = val.replace(/\D/g, '');
        if (numVal) val = `<span class="cct-badge-${numVal}">${val}</span>`;
      }

      if (index === 0) {
        val = isDiscontinued ? `<strong>${val}</strong> <span class="badge bg-danger ms-2">Discontinued</span>` : `<strong>${val}</strong>`;
        bodyHtml += `<td>${val}</td>`;
      } else {
        bodyHtml += `<td class="text-center">${val}</td>`;
      }
    });

    if (isSearchTable) {
      bodyHtml += `<td class="text-center"><span class="badge bg-light text-dark border">${itemSeries}</span></td>`;
    }

    if (isDiscontinued) {
      bodyHtml += `<td class="text-center"><span class="badge bg-secondary">Stok Habis</span></td>`;
    } else {
      bodyHtml += `<td class="text-center">
        <button class="btn btn-sm btn-outline-warning text-dark fw-bold" onclick="addToCart('${itemCode.replace(/'/g, "\\'")}', '${itemSeries.replace(/'/g, "\\'")}')">
          <i class="bi bi-cart-plus-fill fs-6"></i>
        </button>
      </td>`;
    }
    bodyHtml += '</tr>';
  });

  tableBody.innerHTML = bodyHtml;
}

// ==========================================
// GOOGLE SHEETS DATA FETCHING
// ==========================================
async function loadProductsFromSheet() {
  const CACHE_KEY = 'opple_products_cache';
  const CACHE_TIME_KEY = 'opple_products_cache_time';
  const CACHE_DURATION = 10 * 60 * 1000;

  try {
    let data = null;
    const cachedData = localStorage.getItem(CACHE_KEY);
    const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
    const now = new Date().getTime();

    if (cachedData && cachedTime && (now - cachedTime < CACHE_DURATION)) {
      data = JSON.parse(cachedData);
    } else {
      const response = await fetch(GOOGLE_SCRIPT_URL);
      data = await response.json();
      if (!data.error && Array.isArray(data)) {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        localStorage.setItem(CACHE_TIME_KEY, now.toString());
      }
    }

    if (Array.isArray(data)) {
      rawProductsData = data;
      populateWattFilter(data);

      const getSeriesValue = (item) => {
        const k = Object.keys(item).find(x => x.trim().toLowerCase() === 'series');
        return k ? String(item[k] || '').trim().toUpperCase() : '';
      };

      const getStatusValue = (item) => {
        const k = Object.keys(item).find(x => x.trim().toLowerCase() === 'status');
        return k ? String(item[k] || '').trim().toLowerCase() : '';
      };

      const filterBySeries = (code) => data.filter(i => getSeriesValue(i) === code && getStatusValue(i) !== 'hidden' && getStatusValue(i) !== 'nonaktif')
        .sort((a, b) => (getStatusValue(a) === 'discontinued') - (getStatusValue(b) === 'discontinued'));

      // Downlight Rendering
      renderDynamicTable(filterBySeries('DL-P2'), 'table-head-p2', 'table-body-p2');
      renderDynamicTable(filterBySeries('DL-E3'), 'table-head-ecomax', 'table-body-ecomax');
      renderDynamicTable(filterBySeries('DL-US'), 'table-head-us', 'table-body-us');
    }
  } catch (error) {
    console.error('Gagal memuat data produk:', error);
  }
}

// ==========================================
// SEARCH & FILTER LOGIC
// ==========================================
function populateWattFilter(data) {
  const wattSelect = document.getElementById('wattFilter');
  if (!wattSelect) return;
  const watts = new Set();
  data.forEach(item => {
    const k = Object.keys(item).find(x => x.trim().toLowerCase().includes('power') || x.trim().toLowerCase().includes('watt') || x.trim().toLowerCase().includes('daya'));
    if (k && item[k] && String(item[k]).trim() !== '-') watts.add(String(item[k]).trim());
  });
  const sortedWatts = Array.from(watts).sort((a, b) => parseFloat(a) - parseFloat(b));
  wattSelect.innerHTML = '<option value="">Semua Watt</option>';
  sortedWatts.forEach(w => { wattSelect.innerHTML += `<option value="${w}">${w}</option>`; });
}

function toggleSearchScope() {
  isGlobalSearchMode = !isGlobalSearchMode;
  const btnToggle = document.getElementById('btn-toggle-scope');
  const infoText = document.getElementById('search-scope-info');
  if (btnToggle) {
    btnToggle.className = isGlobalSearchMode ? "btn btn-sm btn-primary" : "btn btn-sm btn-outline-primary";
    btnToggle.innerHTML = isGlobalSearchMode ? '<i class="bi bi-funnel me-1"></i>Batasi Hanya Kategori Ini' : '<i class="bi bi-globe me-1"></i>Cari di Semua Produk OPPLE';
  }
  if (infoText) {
    infoText.innerHTML = isGlobalSearchMode ? '<i class="bi bi-globe me-1"></i>Menampilkan hasil pencarian dari <strong>Semua Produk OPPLE</strong>.' : '<i class="bi bi-info-circle me-1"></i>Menampilkan hasil pencarian kategori <strong>Produk Ini</strong>.';
  }
  filterProducts();
}

function filterProducts() {
  const searchKeyword = document.getElementById('searchInput').value.trim().toLowerCase();
  const selectedCct = document.getElementById('cctFilter').value;
  const selectedWatt = document.getElementById('wattFilter').value.toLowerCase();
  const searchTabLi = document.getElementById('search-tab-li');
  const searchCountBadge = document.getElementById('search-count');
  const searchBtn = document.getElementById('search-tab');

  if (!searchKeyword && !selectedCct && !selectedWatt) {
    if (searchTabLi) searchTabLi.classList.add('d-none');
    const defaultTab = document.getElementById('p2-tab');
    if (defaultTab) bootstrap.Tab.getOrCreateInstance(defaultTab).show();
    return;
  }

  // Deteksi Otomatis Seri Halaman
  const defaultPageSeries = window.PAGE_DEFAULT_SERIES || getDefaultSeriesFromURL();

  const filtered = rawProductsData.filter(item => {
    const statusKey = Object.keys(item).find(k => k.trim().toLowerCase() === 'status');
    if (statusKey && ['hidden', 'nonaktif'].includes(String(item[statusKey] || '').trim().toLowerCase())) return false;

    const seriesKey = Object.keys(item).find(k => k.trim().toLowerCase() === 'series');
    const seriesVal = seriesKey ? String(item[seriesKey] || '').trim().toUpperCase() : '';

    if (!isGlobalSearchMode && !defaultPageSeries.includes(seriesVal)) return false;

    const matchesSearch = !searchKeyword || Object.values(item).some(val => val !== null && val !== undefined && String(val).toLowerCase().includes(searchKeyword));
    
    const cctKey = Object.keys(item).find(k => k.trim().toLowerCase().includes('cct') || k.trim().toLowerCase().includes('warna'));
    const matchesCct = !selectedCct || (cctKey && item[cctKey] && String(item[cctKey]).includes(selectedCct));

    const wattKey = Object.keys(item).find(k => k.trim().toLowerCase().includes('power') || k.trim().toLowerCase().includes('watt') || k.trim().toLowerCase().includes('daya'));
    const matchesWatt = !selectedWatt || (wattKey && item[wattKey] && String(item[wattKey]).toLowerCase() === selectedWatt);

    return matchesSearch && matchesCct && matchesWatt;
  });

  if (searchTabLi) searchTabLi.classList.remove('d-none');
  if (searchCountBadge) searchCountBadge.textContent = filtered.length;
  renderDynamicTable(filtered, 'table-head-search', 'table-body-search', true);
  if (searchBtn) bootstrap.Tab.getOrCreateInstance(searchBtn).show();
}

function resetFilters() {
  document.getElementById('searchInput').value = '';
  document.getElementById('cctFilter').value = '';
  document.getElementById('wattFilter').value = '';
  filterProducts();
}

// ==========================================
// CART & WHATSAPP LOGIC
// ==========================================
function saveCart() {
  localStorage.setItem('senna_cart', JSON.stringify(cart));
  renderCartUI();
}

function addToCart(code, series) {
  const existing = cart.find(i => i.code === code);
  if (existing) existing.qty += 1;
  else cart.push({ code, series, qty: 1 });
  saveCart();

  const cartEl = document.getElementById('cartOffcanvas');
  if (cartEl) bootstrap.Offcanvas.getOrCreateInstance(cartEl).show();
}

function updateQty(code, delta) {
  const item = cart.find(i => i.code === code);
  if (item) {
    item.qty += delta;
    if (item.qty <= 0) cart = cart.filter(i => i.code !== code);
  }
  saveCart();
}

function renderCartUI() {
  const container = document.getElementById('cart-items-container');
  const badge = document.getElementById('cart-badge');
  const floatingBtn = document.getElementById('cart-floating-btn');

  if (!container || !badge || !floatingBtn) return;

  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  badge.textContent = totalItems;
  floatingBtn.style.display = totalItems > 0 ? 'block' : 'none';

  if (cart.length === 0) {
    container.innerHTML = '<p class="text-center text-muted py-4">Keranjang penawaran masih kosong.</p>';
    return;
  }

  let html = '<ul class="list-group list-group-flush">';
  cart.forEach(item => {
    html += `
      <li class="list-group-item d-flex justify-content-between align-items-center px-0 py-3">
        <div>
          <strong class="d-block text-dark">${item.code}</strong>
          <small class="text-muted">Seri: ${item.series}</small>
        </div>
        <div class="d-flex align-items-center gap-2">
          <button class="btn btn-sm btn-outline-secondary px-2" onclick="updateQty('${item.code.replace(/'/g, "\\'")}', -1)">-</button>
          <span class="fw-bold px-1">${item.qty}</span>
          <button class="btn btn-sm btn-outline-secondary px-2" onclick="updateQty('${item.code.replace(/'/g, "\\'")}', 1)">+</button>
        </div>
      </li>`;
  });
  html += '</ul>';
  container.innerHTML = html;
}

function sendCartToWhatsApp() {
  if (!cart || cart.length === 0) {
    alert('Keranjang penawaran Anda masih kosong.');
    return;
  }
  
  let lines = [];
  lines.push("Halo SENNA, saya ingin meminta penawaran harga untuk produk berikut:");
  lines.push("");
  
  cart.forEach((item, i) => {
    lines.push(`${i + 1}. *${item.code}* (${item.series}) - Qty: ${item.qty} pcs`);
  });
  
  lines.push("");
  lines.push("Mohon diinformasikan ketersediaan stok dan penawaran harganya. Terima kasih!");
  
  const fullText = lines.join("\n");
  const waUrl = `https://api.whatsapp.com/send?phone=6282130720890&text=${encodeURIComponent(fullText)}`;
  
  window.open(waUrl, '_blank');
}

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  loadComponent('header-container', 'header.html');
  loadComponent('footer-container', 'footer.html');
  loadComponent('cart-container', 'cart-offcanvas.html');
  loadProductsFromSheet();

  // Tab Image Switcher Handler
  const tabButtons = document.querySelectorAll('#downlightTab button[data-bs-toggle="tab"]');
  const mainProductImg = document.getElementById('mainProductImg');
  tabButtons.forEach(button => {
    button.addEventListener('shown.bs.tab', function (event) {
      const newImgSrc = event.target.getAttribute('data-img');
      if (newImgSrc && mainProductImg) {
        mainProductImg.style.opacity = '0.3';
        setTimeout(() => {
          mainProductImg.src = newImgSrc;
          mainProductImg.style.opacity = '1';
        }, 150);
      }
    });
  });
});