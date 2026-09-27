/* ============================================================
   MERIDIAN Private Brokerage — App Controller (Multi-Page Zillow Architecture)
   ============================================================ */

'use strict';

// ── State ──────────────────────────────────────────────────
const state = {
  savedIds: new Set(),
  currentProperty: null,
  currentGalleryIdx: 0,
  pageType: 'all', // 'buy' | 'rent' | 'all'
  filteredProperties: [],
  filters: {
    neighborhoods: [],
    maxPrice: 12000000,
    minBeds: 0,
    minBaths: 0,
    types: [],
    amenities: [],
    searchQuery: '',
  },
  sortBy: 'price-desc',
  viewMode: 'grid',
};

// ── DOM helpers ────────────────────────────────────────────
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

// ── Defensive Init ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  try { determinePageType(); } catch(e) { console.error('pageType', e); }
  try { loadSavedFromStorage(); } catch(e) { console.error('loadSaved', e); }
  try { parseUrlParams(); } catch(e) { console.error('parseUrlParams', e); }
  try { renderPropertyGrid(); } catch(e) { console.error('renderGrid', e); }
  try { initNavbar(); } catch(e) { console.error('initNavbar', e); }
  try { initPageSearch(); } catch(e) { console.error('initPageSearch', e); }
  try { initFilters(); } catch(e) { console.error('initFilters', e); }
  try { initModal(); } catch(e) { console.error('initModal', e); }
  try { initViewToggles(); } catch(e) { console.error('initViewToggles', e); }
  try { updateSavedCount(); } catch(e) { console.error('updateSavedCount', e); }
});

// ── Determine Page & Base Dataset ──────────────────────────
function determinePageType() {
  if (document.body.classList.contains('page-rent')) {
    state.pageType = 'rent';
    state.filteredProperties = PROPERTIES.filter(p => p.status === 'For Rent');
  } else if (document.body.classList.contains('page-buy')) {
    state.pageType = 'buy';
    state.filteredProperties = PROPERTIES.filter(p => p.status === 'For Sale');
  } else {
    state.pageType = 'all';
    state.filteredProperties = [...PROPERTIES];
  }
}

// ── URL Params Parsing (e.g. ?filter=silverleaf or ?q=camelback) ──
function parseUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const filterNb = params.get('filter') || params.get('nb');
  const q = params.get('q');
  const isExclusive = params.get('exclusive');
  const isSavedView = params.get('view') === 'saved';

  if (filterNb) {
    state.filters.neighborhoods = [filterNb];
    $$('.neighborhood-filter').forEach(cb => {
      cb.checked = cb.value === filterNb;
    });
  }

  if (q) {
    state.filters.searchQuery = q.toLowerCase();
    const qInput = $('#page-search-query');
    if (qInput) qInput.value = q;
  }

  if (isExclusive) {
    state.filteredProperties = state.filteredProperties.filter(p =>
      p.price >= 7000000 || (p.tags && p.tags.some(t => t.toLowerCase().includes('exclusive') || t.toLowerCase().includes('gated')))
    );
  }

  if (isSavedView) {
    if (state.savedIds.size > 0) {
      state.filteredProperties = PROPERTIES.filter(p => state.savedIds.has(p.id));
      showToast('💛 Displaying your saved estates', 'info');
    } else {
      showToast('You have no saved estates yet. Click the heart icon on any card to save.', 'info');
    }
  }

  applyFiltersAndSort();
}

// ── Instant Page Search Input ──────────────────────────────
function initPageSearch() {
  const searchInput = $('#page-search-query');
  if (!searchInput) return;

  searchInput.addEventListener('input', () => {
    state.filters.searchQuery = searchInput.value.trim().toLowerCase();
    applyFiltersAndSort();
  });
}

// ── Navbar ─────────────────────────────────────────────────
function initNavbar() {
  const navbar = $('#main-navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 10);
    }, { passive: true });
  }

  // Mobile hamburger
  $('#hamburger-btn')?.addEventListener('click', () => {
    document.getElementById('listings')?.scrollIntoView({ behavior: 'smooth' });
  });

  // Mobile filter drawer
  const mobileBar = $('#mobile-filter-bar');
  if (mobileBar) {
    const checkMobile = () => {
      mobileBar.style.display = window.innerWidth <= 900 ? 'block' : 'none';
    };
    checkMobile();
    window.addEventListener('resize', checkMobile, { passive: true });
  }

  $('#filter-toggle-btn')?.addEventListener('click', () => {
    const sidebar = $('#filter-sidebar');
    const overlay = $('#filter-overlay');
    if (sidebar) {
      sidebar.classList.toggle('drawer-open');
      sidebar.style.display = 'block';
    }
    if (overlay) overlay.classList.toggle('open');
  });

  $('#filter-overlay')?.addEventListener('click', () => {
    const sidebar = $('#filter-sidebar');
    const overlay = $('#filter-overlay');
    if (sidebar) {
      sidebar.classList.remove('drawer-open');
      sidebar.style.display = '';
    }
    if (overlay) overlay.classList.remove('open');
  });

  // Saved btn on listings page
  $('#saved-btn')?.addEventListener('click', () => {
    if (state.savedIds.size === 0) {
      showToast('You have not saved any properties yet. Click the heart on any home to save it!', 'info');
      return;
    }
    state.filteredProperties = PROPERTIES.filter(p => state.savedIds.has(p.id));
    renderPropertyGrid();
    showToast(`💛 Showing ${state.filteredProperties.length} saved home(s)`, 'success');
  });

  // Top Bar MLS Quick Search
  const nbPropInput = $('#nb-prop-id');
  if (nbPropInput) {
    nbPropInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const val = nbPropInput.value.trim().toLowerCase();
        if (!val) return;
        const matched = PROPERTIES.find(p =>
          p.id.toString() === val ||
          (p.mlsNumber && p.mlsNumber.toLowerCase().includes(val))
        );
        if (matched) {
          openModal(matched.id);
        } else {
          showToast('No property found with ID / MLS: ' + val, 'error');
        }
      }
    });
  }
}

// ── Filters & Sorting ──────────────────────────────────────
function initFilters() {
  // Neighborhood checkboxes
  $$('.neighborhood-filter').forEach(cb => {
    cb.addEventListener('change', () => {
      state.filters.neighborhoods = $$('.neighborhood-filter')
        .filter(c => c.checked)
        .map(c => c.value);
      applyFiltersAndSort();
    });
  });

  // Price slider
  const slider = $('#price-slider');
  if (slider) {
    slider.addEventListener('input', () => {
      const val = parseInt(slider.value);
      state.filters.maxPrice = val;
      updatePriceDisplay(val);
      updateSliderFill(slider);
      applyFiltersAndSort();
    });
    updateSliderFill(slider);
  }

  // Beds buttons
  $$('#listings [data-beds]').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('#listings [data-beds]').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      state.filters.minBeds = parseInt(btn.dataset.beds);
      applyFiltersAndSort();
    });
  });

  // Baths buttons
  $$('#bath-selector [data-baths]').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('#bath-selector [data-baths]').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      state.filters.minBaths = parseInt(btn.dataset.baths);
      applyFiltersAndSort();
    });
  });

  // Type filters
  $$('.type-filter').forEach(cb => {
    cb.addEventListener('change', () => {
      state.filters.types = $$('.type-filter').filter(c => c.checked).map(c => c.value);
      applyFiltersAndSort();
      cb.closest('.type-chip')?.classList.toggle('active', cb.checked);
    });
  });

  // Amenity filters
  $$('.amenity-filter').forEach(cb => {
    cb.addEventListener('change', () => {
      state.filters.amenities = $$('.amenity-filter').filter(c => c.checked).map(c => c.value);
      applyFiltersAndSort();
      cb.closest('.amenity-item')?.classList.toggle('active', cb.checked);
    });
  });

  // Sort
  $('#sort-select')?.addEventListener('change', e => {
    state.sortBy = e.target.value;
    applyFiltersAndSort();
  });

  // Reset filters
  $('#reset-filters-btn')?.addEventListener('click', resetFilters);
}

function updatePriceDisplay(val) {
  const display = $('#price-range-display');
  if (!display) return;
  if (state.pageType === 'rent') {
    if (val >= 12000000) {
      display.textContent = 'Any Budget';
    } else {
      const rentEquiv = Math.round(val / 600);
      display.textContent = `Up to $${rentEquiv.toLocaleString()}/mo`;
    }
    return;
  }
  if (val >= 12000000) {
    display.textContent = 'Any Price';
  } else if (val >= 1000000) {
    display.textContent = 'Up to $' + (val / 1000000).toFixed(1).replace('.0', '') + 'M';
  } else {
    display.textContent = 'Up to $' + val.toLocaleString();
  }
}

function updateSliderFill(slider) {
  if (!slider) return;
  const min = parseFloat(slider.min);
  const max = parseFloat(slider.max);
  const val = parseFloat(slider.value);
  const pct = ((val - min) / (max - min)) * 100;
  slider.style.setProperty('--progress', pct + '%');
}

function resetFilters() {
  state.filters = { neighborhoods: [], maxPrice: 12000000, minBeds: 0, minBaths: 0, types: [], amenities: [], searchQuery: '' };

  $$('.neighborhood-filter').forEach(cb => cb.checked = false);
  $$('.type-filter').forEach(cb => { cb.checked = false; cb.closest('.type-chip')?.classList.remove('active'); });
  $$('.amenity-filter').forEach(cb => { cb.checked = false; cb.closest('.amenity-item')?.classList.remove('active'); });
  $$('[data-beds]').forEach(btn => { btn.classList.remove('active'); btn.setAttribute('aria-pressed', 'false'); });
  $$('[data-baths]').forEach(btn => { btn.classList.remove('active'); btn.setAttribute('aria-pressed', 'false'); });
  
  const bed0 = $('[data-beds="0"]');
  if (bed0) { bed0.classList.add('active'); bed0.setAttribute('aria-pressed', 'true'); }
  const bath0 = $('[data-baths="0"]');
  if (bath0) { bath0.classList.add('active'); bath0.setAttribute('aria-pressed', 'true'); }

  const slider = $('#price-slider');
  if (slider) {
    slider.value = 12000000;
    updatePriceDisplay(12000000);
    updateSliderFill(slider);
  }

  const queryInput = $('#page-search-query');
  if (queryInput) queryInput.value = '';

  const sortSel = $('#sort-select');
  if (sortSel) sortSel.value = 'price-desc';
  state.sortBy = 'price-desc';

  determinePageType();
  applyFiltersAndSort();
  showToast('Filters reset', 'info');
}

function applyFiltersAndSort() {
  const f = state.filters;
  let baseList = state.pageType === 'rent'
    ? PROPERTIES.filter(p => p.status === 'For Rent')
    : (state.pageType === 'buy' ? PROPERTIES.filter(p => p.status === 'For Sale') : [...PROPERTIES]);

  const filtered = baseList.filter(p => {
    if (f.neighborhoods.length > 0 && !f.neighborhoods.includes(p.neighborhoodKey)) return false;
    if (state.pageType !== 'rent' && p.price > f.maxPrice) return false;
    if (f.minBeds > 0 && p.beds < f.minBeds) return false;
    if (f.minBaths > 0 && p.baths < f.minBaths) return false;
    if (f.types.length > 0 && !f.types.includes(p.type)) return false;
    for (const amenity of f.amenities) {
      if (amenity === 'views') continue;
      if (!p[amenity]) return false;
    }
    if (f.searchQuery) {
      const q = f.searchQuery;
      const match = p.title.toLowerCase().includes(q) ||
                    p.fullAddress.toLowerCase().includes(q) ||
                    p.zip.includes(q) ||
                    p.neighborhood.toLowerCase().includes(q) ||
                    (p.mlsNumber && p.mlsNumber.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  // Sort
  state.filteredProperties = [...filtered].sort((a, b) => {
    switch (state.sortBy) {
      case 'price-asc':   return a.price - b.price;
      case 'price-desc':  return b.price - a.price;
      case 'sqft-desc':   return b.sqft - a.sqft;
      case 'newest':      return b.yearBuilt - a.yearBuilt;
      default:            return b.price - a.price;
    }
  });

  renderPropertyGrid();
}

// ── View Toggles ───────────────────────────────────────────
function initViewToggles() {
  $('#grid-view-btn')?.addEventListener('click', () => {
    state.viewMode = 'grid';
    $('#grid-view-btn')?.classList.add('active');
    $('#list-view-btn')?.classList.remove('active');
    $('#property-grid')?.classList.remove('list-view');
  });
  $('#list-view-btn')?.addEventListener('click', () => {
    state.viewMode = 'list';
    $('#list-view-btn')?.classList.add('active');
    $('#grid-view-btn')?.classList.remove('active');
    $('#property-grid')?.classList.add('list-view');
  });
}

// ── Render Property Grid ───────────────────────────────────
function renderPropertyGrid() {
  const grid = $('#property-grid');
  if (!grid) return;

  const sorted = state.filteredProperties;
  const resultsCount = $('#results-count');
  if (resultsCount) resultsCount.textContent = sorted.length;

  if (sorted.length === 0) {
    grid.innerHTML = `
      <div class="no-results">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <h3>No properties match your current filters</h3>
        <p>Try resetting filters or searching a different neighborhood.</p>
        <button class="btn btn-outline mt-4" onclick="document.getElementById('reset-filters-btn')?.click()">Reset Filters</button>
      </div>`;
    return;
  }

  grid.innerHTML = sorted.map((p, i) => buildPropertyCard(p, i)).join('');

  // Wishlist buttons click
  $$('.zillow-wishlist-btn', grid).forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const pid = parseInt(btn.dataset.propertyId);
      toggleSaved(pid, btn);
    });
  });
}

function buildPropertyCard(p, idx) {
  const isSaved = state.savedIds.has(p.id);
  const delay = (idx % 6) * 0.04;
  const isRental = p.status === 'For Rent';
  const displayPrice = isRental && p.rentPrice
    ? `$${p.rentPrice.toLocaleString()}/mo`
    : `$${p.price.toLocaleString()}`;
  const subText = isRental
    ? 'Executive Luxury Lease'
    : `Est. $${calcMonthly(p.price * 0.8, 6.75, 30).toLocaleString()}/mo`;

  return `
    <article class="property-card zillow-card" data-property-id="${p.id}" role="listitem" tabindex="0"
      style="animation-delay:${delay}s" aria-label="${p.title} — ${displayPrice}">
      
      <!-- Photo Container -->
      <div class="card-image-wrap" onclick="openModal(${p.id})">
        <img src="${p.images[0]}" alt="${p.title}" loading="lazy" />
        <div class="zillow-badges">
          <span class="zillow-badge-status ${isRental ? 'badge-rent' : ''}">${p.status.toUpperCase()}</span>
          ${p.golf ? '<span class="zillow-badge-sub">GOLF</span>' : ''}
          ${p.views ? '<span class="zillow-badge-sub">MOUNTAIN VIEWS</span>' : ''}
        </div>
        <button type="button" class="zillow-wishlist-btn ${isSaved ? 'saved' : ''}" data-property-id="${p.id}" aria-label="${isSaved ? 'Remove from saved' : 'Save home'}" aria-pressed="${isSaved}">
          <svg viewBox="0 0 24 24" fill="${isSaved ? '#EF4444' : 'none'}" stroke="${isSaved ? '#EF4444' : '#1F2937'}" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
        </button>
        <div class="zillow-photo-caption">
          <span>MLS #${p.mlsNumber || ('658421' + p.id)}</span>
          <span>ARMLS Verified</span>
        </div>
      </div>

      <!-- Zillow Content Hierarchy -->
      <div class="zillow-card-body" onclick="openModal(${p.id})">
        <div class="zillow-price-row">
          <span class="zillow-price">${displayPrice}</span>
          <span class="zillow-est-mo">${subText}</span>
        </div>

        <div class="zillow-specs-row">
          <span class="spec-num">${p.beds}</span> <span class="spec-lbl">bds</span>
          <span class="zillow-pipe">|</span>
          <span class="spec-num">${p.baths}</span> <span class="spec-lbl">ba</span>
          <span class="zillow-pipe">|</span>
          <span class="spec-num">${p.sqft.toLocaleString()}</span> <span class="spec-lbl">sqft</span>
          <span class="zillow-pipe">|</span>
          <span class="zillow-tag-active">${p.type}</span>
        </div>

        <div class="zillow-address-line">${p.fullAddress}</div>
        <div class="zillow-community-line">${p.neighborhood} &middot; Scottsdale, AZ</div>
        <div class="zillow-broker-attribution">Listing provided by: MERIDIAN PRIVATE BROKERAGE</div>

        <div class="zillow-card-actions" onclick="event.stopPropagation()">
          <a href="tel:${p.agent.phone}" class="zillow-btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.77a16 16 0 006.29 6.29l1.13-1.34a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
            Contact Agent
          </a>
          <button type="button" class="zillow-btn-secondary" onclick="openModal(${p.id})">
            View Details
          </button>
        </div>
      </div>
    </article>`;
}

// ── Saved / Wishlist ───────────────────────────────────────
function toggleSaved(pid, btn) {
  if (state.savedIds.has(pid)) {
    state.savedIds.delete(pid);
    btn.classList.remove('saved');
    btn.setAttribute('aria-pressed', 'false');
    btn.querySelector('svg')?.setAttribute('fill', 'none');
    btn.querySelector('svg')?.setAttribute('stroke', '#1F2937');
    showToast('Removed from saved homes', 'info');
  } else {
    state.savedIds.add(pid);
    btn.classList.add('saved');
    btn.setAttribute('aria-pressed', 'true');
    btn.querySelector('svg')?.setAttribute('fill', '#EF4444');
    btn.querySelector('svg')?.setAttribute('stroke', '#EF4444');
    showToast('💛 Home saved!', 'success');
  }
  updateSavedCount();
  saveToBrowser();
}

function updateSavedCount() {
  const el = $('#saved-count');
  if (el) el.textContent = state.savedIds.size;
}

function saveToBrowser() {
  try {
    localStorage.setItem('meridian_saved', JSON.stringify([...state.savedIds]));
  } catch(e) {}
}

function loadSavedFromStorage() {
  try {
    const stored = JSON.parse(localStorage.getItem('meridian_saved') || '[]');
    stored.forEach(id => state.savedIds.add(parseInt(id)));
  } catch(e) {}
}

// ── Property Detail Modal ──────────────────────────────────
function initModal() {
  const overlay = $('#property-modal-overlay');
  const closeBtn = $('#modal-close-btn');

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (overlay) {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal();
    });
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay && !overlay.classList.contains('hidden')) {
      closeModal();
    }
    if (overlay && !overlay.classList.contains('hidden')) {
      if (e.key === 'ArrowLeft') prevPhoto();
      if (e.key === 'ArrowRight') nextPhoto();
    }
  });

  $('#gallery-prev')?.addEventListener('click', prevPhoto);
  $('#gallery-next')?.addEventListener('click', nextPhoto);

  // Schedule showing form
  $('#modal-schedule-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const name = $('#ms-name')?.value.trim();
    const phone = $('#ms-phone')?.value.trim();
    const date = $('#ms-date')?.value || 'Tomorrow at 2:00 PM';
    if (!name || !phone) {
      showToast('Please enter your name and phone number.', 'error');
      return;
    }
    if (window.MeridianAuth && typeof window.MeridianAuth.recordScheduledTour === 'function') {
      window.MeridianAuth.recordScheduledTour({
        propertyTitle: state.currentProperty?.title || 'Scottsdale Luxury Estate',
        address: state.currentProperty?.fullAddress || state.currentProperty?.address || 'Scottsdale, AZ',
        price: state.currentProperty?.priceFormatted || '$5,000,000+',
        date: date,
        agent: state.currentProperty?.agent?.name || 'Alexandra Hartwell',
        name: name,
        phone: phone
      });
    } else {
      showToast(`✅ Private tour confirmed for ${state.currentProperty?.title || 'property'}! An agent will call you shortly.`, 'success');
    }
    $('#modal-schedule-form')?.reset();
  });

  // Email Agent
  $('#modal-agent-email')?.addEventListener('click', () => {
    if (!state.currentProperty) return;
    const p = state.currentProperty;
    window.location.href = `mailto:${p.agent.email}?subject=Inquiry: ${encodeURIComponent(p.title)}&body=Hello ${p.agent.name},%0A%0AI am interested in ${encodeURIComponent(p.fullAddress)}.%0A%0APlease contact me at your earliest convenience.`;
  });

  // Secondary close button
  $('#modal-close-bottom-btn')?.addEventListener('click', closeModal);
}

function openModal(pid) {
  const p = PROPERTIES.find(prop => prop.id === pid);
  if (!p) return;
  state.currentProperty = p;
  state.currentGalleryIdx = 0;

  populateModal(p);

  const overlay = $('#property-modal-overlay');
  if (overlay) {
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    setTimeout(() => { $('#modal-close-btn')?.focus(); }, 80);
  }
}
window.openModal = openModal;

function closeModal() {
  const overlay = $('#property-modal-overlay');
  if (overlay) overlay.classList.add('hidden');
  document.body.style.overflow = '';
  state.currentProperty = null;
  const mapIframe = $('#modal-map-iframe');
  if (mapIframe) mapIframe.src = '';
}
window.closeModal = closeModal;

function populateModal(p) {
  // Gallery
  updateGalleryImage(0);
  const thumbsEl = $('#gallery-thumbs');
  if (thumbsEl) {
    thumbsEl.innerHTML = p.images.map((img, i) => `
      <div class="gallery-thumb ${i === 0 ? 'active' : ''}" data-idx="${i}">
        <img src="${img}" alt="Property photo ${i + 1}" loading="lazy" />
      </div>`).join('');
    $$('.gallery-thumb', thumbsEl).forEach(th => {
      th.addEventListener('click', () => {
        const idx = parseInt(th.dataset.idx);
        state.currentGalleryIdx = idx;
        updateGalleryImage(idx);
      });
    });
  }

  // Basic info
  const isRental = p.status === 'For Rent';
  const displayPrice = isRental && p.rentPrice
    ? `$${p.rentPrice.toLocaleString()}/mo`
    : `$${p.price.toLocaleString()}`;

  const setElText = (id, val) => { const el = $(id); if (el) el.textContent = val; };
  setElText('#modal-property-title', p.title);

  const addrLink = $('#modal-address-link');
  if (addrLink) {
    addrLink.textContent = p.fullAddress;
    addrLink.href = p.googleMapsUrl;
  }

  setElText('#modal-psf', isRental ? `$${p.rentPrice.toLocaleString()}/month` : `$${p.pricePerSqft.toLocaleString()}/sqft`);

  // Specs
  setElText('#m-beds', p.beds);
  setElText('#m-baths', p.baths);
  setElText('#m-sqft', p.sqft.toLocaleString());
  setElText('#m-lot', p.lotAcres ? p.lotAcres + ' ac' : 'N/A');
  setElText('#m-garage', p.garage + '-Car');
  setElText('#m-year', p.yearBuilt);
  setElText('#m-views', p.views || 'Desert & Mountain');
  setElText('#m-type', p.type);

  // Description
  setElText('#modal-description', p.description);

  // Features
  const featEl = $('#modal-features');
  if (featEl) {
    featEl.innerHTML = p.features.map(f => `
      <div class="feature-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        ${f}
      </div>`).join('');
  }

  // Google Maps 3D & Satellite
  const mapIframe = $('#modal-map-iframe');
  const btnSat = $('#btn-map-satellite');
  const btnRoad = $('#btn-map-road');
  const link3D = $('#btn-map-google-3d');

  const satUrl = p.mapSatelliteUrl || `https://maps.google.com/maps?q=${p.lat},${p.lng}&t=k&z=18&ie=UTF8&iwloc=&output=embed`;
  const roadUrl = p.mapRoadUrl || `https://maps.google.com/maps?q=${p.lat},${p.lng}&t=m&z=16&ie=UTF8&iwloc=&output=embed`;
  const google3d = p.google3dUrl || `https://www.google.com/maps/@${p.lat},${p.lng},120a,35y,39.34t/data=!3m1!1e3`;

  if (mapIframe) mapIframe.src = satUrl;
  if (btnSat) btnSat.classList.add('active');
  if (btnRoad) btnRoad.classList.remove('active');
  if (link3D) link3D.href = google3d;

  if (btnSat && !btnSat.dataset.hasListener) {
    btnSat.dataset.hasListener = 'true';
    btnSat.addEventListener('click', () => {
      if (state.currentProperty && mapIframe) {
        mapIframe.src = state.currentProperty.mapSatelliteUrl || satUrl;
        btnSat.classList.add('active');
        btnRoad?.classList.remove('active');
      }
    });
  }
  if (btnRoad && !btnRoad.dataset.hasListener) {
    btnRoad.dataset.hasListener = 'true';
    btnRoad.addEventListener('click', () => {
      if (state.currentProperty && mapIframe) {
        mapIframe.src = state.currentProperty.mapRoadUrl || roadUrl;
        btnRoad.classList.add('active');
        btnSat?.classList.remove('active');
      }
    });
  }

  // Right panel
  setElText('#modal-price', displayPrice);
  setElText('#modal-status', p.status);
  setElText('#modal-neighborhood', p.neighborhood);

  // Agent
  const avatar = $('#modal-agent-avatar');
  if (avatar) {
    avatar.src = p.agent.avatar;
    avatar.alt = p.agent.name;
  }
  setElText('#modal-agent-name', p.agent.name);
  setElText('#modal-agent-title', p.agent.title);
  setElText('#modal-agent-license', 'License #' + p.agent.license);

  const callBtn = $('#modal-agent-call');
  if (callBtn) callBtn.href = 'tel:' + p.agent.phone;

  // Financial summary
  const downAmt = p.price * 0.20;
  const loanAmt = p.price - downAmt;
  const monthly = calcMonthly(loanAmt, 6.75, 30);

  setElText('#fin-price', displayPrice);
  setElText('#fin-psf', isRental ? displayPrice : `$${p.pricePerSqft.toLocaleString()}/sqft`);
  setElText('#fin-monthly', isRental ? displayPrice : `$${monthly.toLocaleString()}/mo`);
}

function updateGalleryImage(idx) {
  const p = state.currentProperty;
  if (!p || !p.images || !p.images[idx]) return;
  const img = $('#gallery-main-img');
  if (!img) return;

  img.style.opacity = '0.3';
  img.src = p.images[idx];
  img.alt = `${p.title} — Photo ${idx + 1} of ${p.images.length}`;
  img.onload = () => { img.style.opacity = '1'; };
  setTimeout(() => { img.style.opacity = '1'; }, 150);

  $$('.gallery-thumb').forEach((th, i) => th.classList.toggle('active', i === idx));
}

function prevPhoto() {
  const p = state.currentProperty;
  if (!p || !p.images) return;
  state.currentGalleryIdx = (state.currentGalleryIdx - 1 + p.images.length) % p.images.length;
  updateGalleryImage(state.currentGalleryIdx);
}

function nextPhoto() {
  const p = state.currentProperty;
  if (!p || !p.images) return;
  state.currentGalleryIdx = (state.currentGalleryIdx + 1) % p.images.length;
  updateGalleryImage(state.currentGalleryIdx);
}

// ── Calculator Helper ──────────────────────────────────────
function calcMonthly(principal, annualRate, years) {
  const r = (annualRate / 100) / 12;
  const n = years * 12;
  if (r === 0) return Math.round(principal / n);
  return Math.round(principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1));
}

// ── Toast Notification System ──────────────────────────────
function showToast(message, type = 'info') {
  let container = $('#toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}
