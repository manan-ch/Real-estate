/**
 * MERIDIAN Private Brokerage — Authentication & Client Session Engine
 * Handles user signup, login, session persistence in localStorage,
 * wishlist synchronization, and scheduled showing bookings.
 */

(function() {
  'use strict';

  const STORAGE_KEY_USER = 'meridian_user';
  const STORAGE_KEY_SAVED = 'meridian_saved';
  const STORAGE_KEY_TOURS = 'meridian_tours';

  // ── Default Mock Users for 1-Click Demos ─────────────────
  const DEMO_ACCOUNTS = {
    buyer: {
      id: 'usr_vip_buyer_01',
      name: 'Alexandra Vance',
      email: 'alexandra.vance@luxuryinvest.com',
      role: 'VIP Buyer',
      avatar: 'AV',
      phone: '+1 (480) 555-0192',
      savedHomes: ['prop-1', 'prop-2', 'prop-5'],
      scheduledTours: [
        {
          id: 'tour-101',
          propertyTitle: 'Silverleaf Grand Estate',
          address: '18701 N Silverleaf Dr, Scottsdale, AZ 85255',
          price: '$9,450,000',
          date: 'Tomorrow at 2:00 PM',
          agent: 'Alexandra Hartwell',
          status: 'Confirmed'
        }
      ]
    },
    seller: {
      id: 'usr_vip_seller_02',
      name: 'Harrison Sterling',
      email: 'h.sterling@paradiseestates.com',
      role: 'Estate Owner',
      avatar: 'HS',
      phone: '+1 (480) 555-0144',
      savedHomes: ['prop-2', 'prop-4'],
      scheduledTours: []
    }
  };

  // ── Core Auth Functions ──────────────────────────────────
  function getCurrentUser() {
    try {
      const user = localStorage.getItem(STORAGE_KEY_USER);
      return user ? JSON.parse(user) : null;
    } catch (e) {
      console.error('Error reading user session', e);
      return null;
    }
  }

  function setCurrentUser(user) {
    if (user) {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
      // Sync saved homes if present
      if (Array.isArray(user.savedHomes)) {
        localStorage.setItem(STORAGE_KEY_SAVED, JSON.stringify(user.savedHomes));
      }
    } else {
      localStorage.removeItem(STORAGE_KEY_USER);
    }
    renderAuthNav();
    updateSavedCount();
  }

  function logoutUser() {
    const user = getCurrentUser();
    const name = user ? user.name : 'Client';
    setCurrentUser(null);
    showToast(`Goodbye, ${name}. You have signed out.`);
  }

  function getInitials(name) {
    if (!name) return 'M';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function showToast(msg) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:99999999;display:flex;flex-direction:column;gap:10px;pointer-events:none;';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.style.cssText = 'background:#0F172A;color:#FFFFFF;padding:12px 20px;border-radius:10px;font-size:0.88rem;font-weight:600;box-shadow:0 10px 25px rgba(0,0,0,0.25);border-left:4px solid #006AFF;display:flex;align-items:center;gap:10px;animation:slideInToast .25s ease forwards;pointer-events:auto;';
    toast.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#006AFF" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
      <span>${msg}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all .3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  function updateSavedCount() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_SAVED) || '[]');
      const countEls = document.querySelectorAll('#saved-count, .saved-count');
      countEls.forEach(el => el.textContent = saved.length);
    } catch (e) {}
  }

  // ── Render Navbar Authentication State ───────────────────
  function renderAuthNav() {
    const user = getCurrentUser();
    const signinBtns = document.querySelectorAll('.nav-signin-btn, .user-profile-wrapper');

    signinBtns.forEach(container => {
      const parent = container.parentElement;
      if (!parent) return;

      if (user) {
        // Logged In: Render user profile dropdown
        const wrapper = document.createElement('div');
        wrapper.className = 'user-profile-wrapper';
        wrapper.id = 'user-profile-wrapper';
        wrapper.innerHTML = `
          <button class="user-nav-btn" id="user-menu-btn" type="button" aria-expanded="false" aria-label="Open user profile menu">
            <span class="user-avatar-circle">${getInitials(user.name)}</span>
            <span style="max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${user.name.split(' ')[0]}</span>
            <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>
          </button>
          <div class="user-nav-menu" id="user-dropdown-menu">
            <div class="user-menu-header">
              <div class="user-menu-name">${user.name}</div>
              <div class="user-menu-email">${user.email}</div>
              <span class="user-menu-role">${user.role || 'VIP Client'}</span>
            </div>
            <ul class="user-menu-list">
              <li class="user-menu-item">
                <a href="buy.html?view=saved">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
                  <span>Saved Homes (${(JSON.parse(localStorage.getItem(STORAGE_KEY_SAVED) || '[]')).length})</span>
                </a>
              </li>
              <li class="user-menu-item">
                <button type="button" onclick="window.MeridianAuth.openToursModal()">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  <span>My Scheduled Tours</span>
                </button>
              </li>
              <li class="user-menu-item">
                <a href="mortgage.html#calculator">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                  <span>Mortgage Estimator</span>
                </a>
              </li>
              <li class="user-menu-item">
                <a href="sell.html#cma-estimator">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  <span>My Home Valuation (CMA)</span>
                </a>
              </li>
              <li class="user-menu-divider"></li>
              <li class="user-menu-item signout-btn">
                <button type="button" onclick="window.MeridianAuth.logout()">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                  <span>Sign Out</span>
                </button>
              </li>
            </ul>
          </div>
        `;

        // Toggle user dropdown
        const btn = wrapper.querySelector('#user-menu-btn');
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          wrapper.classList.toggle('open');
          btn.setAttribute('aria-expanded', wrapper.classList.contains('open'));
        });

        container.replaceWith(wrapper);
      } else {
        // Logged Out: Render standard Sign In button
        const btn = document.createElement('a');
        btn.href = '#signin-modal';
        btn.className = 'nav-signin-btn';
        btn.textContent = 'Sign in';
        btn.onclick = (e) => {
          e.preventDefault();
          openAuthModal();
        };
        container.replaceWith(btn);
      }
    });
  }

  // ── Build & Inject Modals into DOM ───────────────────────
  function ensureAuthModals() {
    if (document.getElementById('auth-modal-overlay')) return;

    // 1. Auth Modal
    const authOverlay = document.createElement('div');
    authOverlay.className = 'auth-modal-overlay';
    authOverlay.id = 'auth-modal-overlay';
    authOverlay.innerHTML = `
      <div class="auth-modal-card" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
        <button class="auth-modal-close" id="auth-close-btn" type="button" aria-label="Close modal">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>

        <div class="auth-header">
          <div class="auth-brand-logo">
            <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 3.5L3.5 14.2C2.6 14.9 2 16 2 17.2V30.5C2 32.4 3.6 34 5.5 34H30.5C32.4 34 34 32.4 34 30.5V17.2C34 16 33.4 14.9 32.5 14.2L18 3.5Z" fill="#006AFF"/>
              <path d="M10 26V15.5L18 21.5L26 15.5V26" stroke="#FFFFFF" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>MERIDIAN</span>
          </div>
          <h3 id="auth-modal-title">Welcome to MERIDIAN</h3>
          <p>Access exclusive off-market listings, save custom searches, and manage private showings.</p>
        </div>

        <div class="auth-tabs">
          <button class="auth-tab-btn active" id="tab-btn-signin" type="button" onclick="window.MeridianAuth.switchTab('signin')">Sign In</button>
          <button class="auth-tab-btn" id="tab-btn-signup" type="button" onclick="window.MeridianAuth.switchTab('signup')">New Account</button>
        </div>

        <div class="auth-body">
          <div id="auth-alert" class="auth-message"></div>

          <!-- 1-Click VIP Demo Shortcuts -->
          <div class="auth-social-group">
            <button class="auth-social-btn btn-vip-demo" type="button" onclick="window.MeridianAuth.loginDemo('buyer')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              <span>1-Click Demo: VIP Luxury Buyer</span>
            </button>
            <button class="auth-social-btn" type="button" onclick="window.MeridianAuth.loginDemo('seller')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
              <span>1-Click Demo: Estate Seller</span>
            </button>
          </div>

          <div class="auth-divider">Or continue with email</div>

          <!-- Form: Sign In -->
          <form id="auth-form-signin" onsubmit="window.MeridianAuth.handleSignIn(event)">
            <div class="auth-form-group">
              <label for="signin-email">Email Address</label>
              <input type="email" id="signin-email" class="auth-input" placeholder="e.g. client@domain.com" required value="alexandra.vance@luxuryinvest.com" />
            </div>
            <div class="auth-form-group">
              <label for="signin-password">Password</label>
              <input type="password" id="signin-password" class="auth-input" placeholder="Enter your password" required value="••••••••" />
            </div>
            <div class="auth-form-row">
              <label>
                <input type="checkbox" id="signin-remember" checked />
                <span>Remember me</span>
              </label>
              <a href="#" class="auth-forgot-link" onclick="alert('Demo Mode: You can use any password or click the 1-Click Demo buttons above.'); return false;">Forgot password?</a>
            </div>
            <button type="submit" class="auth-submit-btn">Sign In to MERIDIAN</button>
          </form>

          <!-- Form: Sign Up (Hidden by default) -->
          <form id="auth-form-signup" style="display:none;" onsubmit="window.MeridianAuth.handleSignUp(event)">
            <div class="auth-form-group">
              <label for="signup-name">Full Name</label>
              <input type="text" id="signup-name" class="auth-input" placeholder="e.g. Sterling Montgomery" required />
            </div>
            <div class="auth-form-group">
              <label for="signup-email">Email Address</label>
              <input type="email" id="signup-email" class="auth-input" placeholder="e.g. sterling@investments.com" required />
            </div>
            <div class="auth-form-group">
              <label for="signup-role">I Am Interested In</label>
              <select id="signup-role" class="auth-input" style="cursor:pointer;">
                <option value="Luxury Buyer">Purchasing a Luxury Residence (Buyer)</option>
                <option value="Estate Owner">Listing & Selling an Estate (Seller)</option>
                <option value="Executive Renter">Luxury Long-Term Rental</option>
                <option value="Investor / Advisor">Commercial / Private Wealth Investor</option>
              </select>
            </div>
            <div class="auth-form-group">
              <label for="signup-password">Create Password</label>
              <input type="password" id="signup-password" class="auth-input" placeholder="At least 6 characters" minlength="6" required />
            </div>
            <button type="submit" class="auth-submit-btn">Create Free Client Account</button>
          </form>

        </div>
      </div>
    `;
    document.body.appendChild(authOverlay);

    // 2. Tours Modal
    const toursOverlay = document.createElement('div');
    toursOverlay.className = 'tours-modal-overlay';
    toursOverlay.id = 'tours-modal-overlay';
    toursOverlay.innerHTML = `
      <div class="tours-modal-card" role="dialog" aria-modal="true" aria-labelledby="tours-modal-title">
        <div class="tours-modal-header">
          <h3 id="tours-modal-title">My Scheduled Private Showings</h3>
          <button class="auth-modal-close" type="button" onclick="window.MeridianAuth.closeToursModal()" style="position:static;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div class="tours-modal-body" id="tours-modal-content">
          <!-- Populated dynamically -->
        </div>
      </div>
    `;
    document.body.appendChild(toursOverlay);

    // Attach Backdrop / Escape events
    authOverlay.addEventListener('click', (e) => {
      if (e.target === authOverlay) closeAuthModal();
    });
    toursOverlay.addEventListener('click', (e) => {
      if (e.target === toursOverlay) closeToursModal();
    });
    document.getElementById('auth-close-btn')?.addEventListener('click', closeAuthModal);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeAuthModal();
        closeToursModal();
        document.querySelectorAll('.user-profile-wrapper.open').forEach(el => el.classList.remove('open'));
      }
    });

    // Close user dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.user-profile-wrapper')) {
        document.querySelectorAll('.user-profile-wrapper.open').forEach(el => el.classList.remove('open'));
      }
    });
  }

  // ── Modal Interaction Logic ──────────────────────────────
  function openAuthModal(tab = 'signin') {
    ensureAuthModals();
    const overlay = document.getElementById('auth-modal-overlay');
    if (overlay) {
      switchTab(tab);
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeAuthModal() {
    const overlay = document.getElementById('auth-modal-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
      const alert = document.getElementById('auth-alert');
      if (alert) alert.style.display = 'none';
    }
  }

  function switchTab(tab) {
    const signinForm = document.getElementById('auth-form-signin');
    const signupForm = document.getElementById('auth-form-signup');
    const btnSignin = document.getElementById('tab-btn-signin');
    const btnSignup = document.getElementById('tab-btn-signup');
    const alert = document.getElementById('auth-alert');
    if (alert) alert.style.display = 'none';

    if (tab === 'signup') {
      if (signinForm) signinForm.style.display = 'none';
      if (signupForm) signupForm.style.display = 'block';
      if (btnSignin) btnSignin.classList.remove('active');
      if (btnSignup) btnSignup.classList.add('active');
    } else {
      if (signinForm) signinForm.style.display = 'block';
      if (signupForm) signupForm.style.display = 'none';
      if (btnSignin) btnSignin.classList.add('active');
      if (btnSignup) btnSignup.classList.remove('active');
    }
  }

  function handleSignIn(e) {
    e.preventDefault();
    const email = document.getElementById('signin-email')?.value.trim();
    if (!email) return;

    // Check if demo user
    let user = getCurrentUser();
    if (!user || user.email.toLowerCase() !== email.toLowerCase()) {
      user = {
        id: 'usr_' + Date.now(),
        name: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        email: email,
        role: 'Verified Client',
        avatar: getInitials(email.split('@')[0]),
        savedHomes: JSON.parse(localStorage.getItem(STORAGE_KEY_SAVED) || '[]'),
        scheduledTours: JSON.parse(localStorage.getItem(STORAGE_KEY_TOURS) || '[]')
      };
    }

    setCurrentUser(user);
    closeAuthModal();
    showToast(`Welcome back, ${user.name}!`);
  }

  function handleSignUp(e) {
    e.preventDefault();
    const name = document.getElementById('signup-name')?.value.trim();
    const email = document.getElementById('signup-email')?.value.trim();
    const role = document.getElementById('signup-role')?.value;

    if (!name || !email) return;

    const user = {
      id: 'usr_' + Date.now(),
      name: name,
      email: email,
      role: role || 'VIP Buyer',
      avatar: getInitials(name),
      savedHomes: JSON.parse(localStorage.getItem(STORAGE_KEY_SAVED) || '[]'),
      scheduledTours: []
    };

    setCurrentUser(user);
    closeAuthModal();
    showToast(`Account created successfully! Welcome, ${name}.`);
  }

  function loginDemo(type = 'buyer') {
    const demo = DEMO_ACCOUNTS[type] || DEMO_ACCOUNTS.buyer;
    setCurrentUser(demo);
    closeAuthModal();
    showToast(`Logged in as ${demo.name} (${demo.role})`);
  }

  // ── Tours Modal Logic ────────────────────────────────────
  function openToursModal() {
    ensureAuthModals();
    const overlay = document.getElementById('tours-modal-overlay');
    const content = document.getElementById('tours-modal-content');
    const user = getCurrentUser();

    if (!user) {
      openAuthModal('signin');
      return;
    }

    const tours = user.scheduledTours && user.scheduledTours.length > 0
      ? user.scheduledTours
      : (JSON.parse(localStorage.getItem(STORAGE_KEY_TOURS) || '[]'));

    if (tours.length === 0) {
      content.innerHTML = `
        <div style="text-align:center;padding:40px 20px;">
          <div style="width:56px;height:56px;border-radius:50%;background:#EFF6FF;color:#006AFF;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          </div>
          <h4 style="font-size:1.15rem;font-weight:700;color:#0F172A;margin-bottom:6px;">No Upcoming Showings Yet</h4>
          <p style="font-size:.875rem;color:#64748B;max-width:380px;margin:0 auto 20px;">Browse our luxury portfolio and click "Schedule Showing" on any estate to arrange a discrete private tour.</p>
          <a href="buy.html" class="auth-submit-btn" style="display:inline-block;max-width:240px;text-decoration:none;padding:10px 20px;" onclick="window.MeridianAuth.closeToursModal()">Browse Available Estates</a>
        </div>
      `;
    } else {
      content.innerHTML = tours.map((t, idx) => `
        <div class="tour-item-card">
          <div>
            <div class="tour-item-title">${t.propertyTitle || 'Scottsdale Luxury Residence'}</div>
            <div class="tour-item-meta">
              <span>📍 ${t.address || 'Scottsdale, AZ'}</span>
              <span>📅 ${t.date || 'Upcoming'}</span>
              <span>👤 Advisor: ${t.agent || 'Alexandra Hartwell'}</span>
            </div>
          </div>
          <div style="text-align:right;">
            <span class="tour-badge-confirmed">${t.status || 'Confirmed'}</span>
            <button type="button" style="display:block;margin-top:8px;background:none;border:none;color:#DC2626;font-size:.75rem;cursor:pointer;text-decoration:underline;" onclick="window.MeridianAuth.cancelTour(${idx})">Cancel</button>
          </div>
        </div>
      `).join('');
    }

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeToursModal() {
    const overlay = document.getElementById('tours-modal-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  function cancelTour(idx) {
    const user = getCurrentUser();
    if (!user || !user.scheduledTours) return;
    user.scheduledTours.splice(idx, 1);
    setCurrentUser(user);
    openToursModal();
    showToast('Tour showing cancelled.');
  }

  function recordScheduledTour(tourData) {
    let user = getCurrentUser();
    if (!user) {
      // Create guest session
      user = {
        id: 'usr_guest_' + Date.now(),
        name: tourData.name || 'Guest Client',
        email: tourData.email || 'guest@meridian.com',
        role: 'Verified Buyer',
        avatar: getInitials(tourData.name || 'Guest'),
        savedHomes: JSON.parse(localStorage.getItem(STORAGE_KEY_SAVED) || '[]'),
        scheduledTours: []
      };
    }
    if (!user.scheduledTours) user.scheduledTours = [];
    user.scheduledTours.unshift({
      id: 'tour-' + Date.now(),
      propertyTitle: tourData.propertyTitle || 'Luxury Estate',
      address: tourData.address || 'Scottsdale, AZ',
      price: tourData.price || '$5,000,000+',
      date: tourData.date || 'Upcoming Request',
      agent: tourData.agent || 'Alexandra Hartwell',
      status: 'Confirmed & Escorted'
    });

    setCurrentUser(user);
    showToast(`VIP Showing scheduled for ${tourData.propertyTitle || 'estate'}! Added to your account.`);
  }

  // ── Public API ───────────────────────────────────────────
  window.MeridianAuth = {
    getUser: getCurrentUser,
    isLoggedIn: () => !!getCurrentUser(),
    login: handleSignIn,
    logout: logoutUser,
    loginDemo: loginDemo,
    openAuthModal: openAuthModal,
    closeAuthModal: closeAuthModal,
    switchTab: switchTab,
    handleSignIn: handleSignIn,
    handleSignUp: handleSignUp,
    openToursModal: openToursModal,
    closeToursModal: closeToursModal,
    cancelTour: cancelTour,
    recordScheduledTour: recordScheduledTour,
    showToast: showToast
  };

  // ── Auto-Initialize on Load ──────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    ensureAuthModals();
    renderAuthNav();
    updateSavedCount();
  });

})();
