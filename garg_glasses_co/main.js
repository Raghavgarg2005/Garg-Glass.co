/* FILE: main.js
   Garg Glasses Co. - Common JS for ALL pages
   ✅ FIXES:
   1) Cart qty duplicate bug fixed (single source of truth + no double handlers)
   2) Navbar consistent across pages (auth link + active page highlight)
   3) Login + Signup added (demo auth using localStorage)
   4) After login/signup -> redirect to index, navbar shows user icon + Logout
*/

(function () {
  "use strict";

  /* ---------------------------
     Helpers
  --------------------------- */
  function $(sel, root = document) { return root.querySelector(sel); }
  function $all(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

  function formatINR(value) {
    try {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0
      }).format(value);
    } catch {
      return "₹" + value;
    }
  }

  /* ---------------------------
     Storage Keys
  --------------------------- */
  const CART_KEY = "gargCart";
  const USERS_KEY = "gargUsers";
  const SESSION_KEY = "gargSession";

  /* ---------------------------
     Cart (single source of truth)
  --------------------------- */
  function readCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }

  function getCartCount(cart) {
    return cart.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  }

  function getSubtotal(cart) {
    return cart.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.qty) || 0), 0);
  }

  // Add item to cart:
  // { id, title, qty, imgSrc, price }
  function addToCart(item) {
    const { id, title, imgSrc, price } = item;
    let cart = readCart();
    const idx = cart.findIndex(i => String(i.id) === String(id));
    if (idx !== -1) cart[idx].qty = (Number(cart[idx].qty) || 0) + 1;
    else cart.push({ id, title, qty: 1, imgSrc, price: Number(price) || 0 });
    saveCart(cart);
    return cart;
  }

  function removeFromCart(id) {
    let cart = readCart().filter(i => String(i.id) !== String(id));
    saveCart(cart);
    return cart;
  }

  function changeQty(id, delta) {
    let cart = readCart();
    const idx = cart.findIndex(i => String(i.id) === String(id));
    if (idx === -1) return cart;

    cart[idx].qty = (Number(cart[idx].qty) || 0) + delta;
    if (cart[idx].qty <= 0) cart.splice(idx, 1);
    saveCart(cart);
    return cart;
  }

  /* ---------------------------
     Header: Active link + Cart Badge + Auth UI
  --------------------------- */
  function setActiveNav() {
    const path = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    $all("header nav a[data-nav]").forEach(a => {
      const href = (a.getAttribute("data-nav") || a.getAttribute("href") || "").toLowerCase();
      if (href === path) a.classList.add("active-link");
      else a.classList.remove("active-link");
    });
  }

  function updateBadge() {
    const cartBadge = $("#cartBadge");
    if (!cartBadge) return;
    const count = getCartCount(readCart());
    cartBadge.textContent = String(count);
    cartBadge.style.display = count > 0 ? "inline-flex" : "none";
  }

  function readUsers() {
    try {
      const raw = localStorage.getItem(USERS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function readSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function saveSession(session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  function getDisplayNameFromEmail(email) {
    if (!email) return "User";
    const left = String(email).split("@")[0] || "User";
    return left.charAt(0).toUpperCase() + left.slice(1);
  }

  function renderAuthLink() {
    const link = $("#navAuthLink");
    if (!link) return;

    const session = readSession();

    if (!session || !session.email) {
      link.textContent = "Login";
      link.setAttribute("href", "login.html");
      link.removeAttribute("data-logged");
      return;
    }

    // show user icon + name + logout
    const name = session.name || getDisplayNameFromEmail(session.email);
    link.setAttribute("href", "#");
    link.setAttribute("data-logged", "1");
    link.innerHTML = `<span class="material-icons" aria-hidden="true" style="font-size:18px;vertical-align:-3px;">account_circle</span> ${name} • Logout`;
    link.addEventListener("click", (e) => {
      e.preventDefault();
      clearSession();
      renderAuthLink();
      // optional: refresh current page
      location.href = "index.html";
    }, { once: true });
  }

  /* ---------------------------
     Cart Sidebar (Index only)
  --------------------------- */
  const cartSidebar = $("#cartSidebar");
  const cartOverlay = $("#cartOverlay");
  const cartToggleBtn = $("#cartToggleBtn");
  const cartCloseBtn = $("#cartCloseBtn");
  const continueBtn = $("#continueBtn");
  const checkoutBtn = $("#checkoutBtn");
  const cartItemsContainer = $("#cartItems");
  const cartTotalEl = $("#cartTotal");

  function showCart() {
    if (!cartSidebar) return;
    cartSidebar.classList.add("visible");
    if (cartOverlay) cartOverlay.classList.add("visible");
    cartSidebar.setAttribute("aria-hidden", "false");
    if (cartOverlay) cartOverlay.setAttribute("aria-hidden", "false");
  }

  function hideCart() {
    if (!cartSidebar) return;
    cartSidebar.classList.remove("visible");
    if (cartOverlay) cartOverlay.classList.remove("visible");
    cartSidebar.setAttribute("aria-hidden", "true");
    if (cartOverlay) cartOverlay.setAttribute("aria-hidden", "true");
  }

  function renderCartSidebar() {
    // Only if this page has the sidebar elements
    if (!cartItemsContainer || !cartTotalEl) {
      updateBadge();
      return;
    }

    const cart = readCart();

    if (cart.length === 0) {
      cartItemsContainer.innerHTML =
        '<p class="cart-empty-message">Your cart is empty. Add a bestseller to get started.</p>';
      cartTotalEl.textContent = formatINR(0);
      updateBadge();
      return;
    }

    cartItemsContainer.innerHTML = "";
    cart.forEach(item => {
      const div = document.createElement("div");
      div.className = "cart-item";
      div.innerHTML = `
          <img src="${item.imgSrc}" alt="${item.title}" />
          <div class="cart-item-info">
            <p class="cart-item-title">${item.title}</p>
            <p class="cart-item-qty">Price: ${formatINR(item.price)} • Qty: ${item.qty}</p>

            <div class="qty-controls" aria-label="Quantity controls for ${item.title}">
              <button class="qty-btn" type="button" data-action="dec" data-id="${item.id}" aria-label="Decrease quantity">-</button>
              <button class="qty-btn" type="button" data-action="inc" data-id="${item.id}" aria-label="Increase quantity">+</button>
            </div>

            <button class="remove-cart-item-btn" type="button" data-id="${item.id}" aria-label="Remove ${item.title} from cart">Remove</button>
          </div>
        `;
      cartItemsContainer.appendChild(div);
    });

    // Wire up controls
    $all(".remove-cart-item-btn", cartItemsContainer).forEach(btn => {
      btn.addEventListener("click", () => {
        removeFromCart(btn.getAttribute("data-id"));
        renderCartSidebar();
      });
    });

    $all(".qty-btn", cartItemsContainer).forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const action = btn.getAttribute("data-action");
        changeQty(id, action === "inc" ? 1 : -1);
        renderCartSidebar();
      });
    });

    cartTotalEl.textContent = formatINR(getSubtotal(cart));
    updateBadge();
  }

  function wireIndexCartControls() {
    if (!cartSidebar) return;
    if (cartToggleBtn) cartToggleBtn.addEventListener("click", () => {
      cartSidebar.classList.contains("visible") ? hideCart() : showCart();
    });
    if (cartCloseBtn) cartCloseBtn.addEventListener("click", hideCart);
    if (cartOverlay) cartOverlay.addEventListener("click", hideCart);
    if (continueBtn) continueBtn.addEventListener("click", hideCart);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && cartSidebar.classList.contains("visible")) hideCart();
    });
    if (checkoutBtn) checkoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = "checkout.html";
    });
  }

  /* ---------------------------
     Add to Cart buttons (all pages)
     - products page uses .add-to-cart-btn
     - product detail pages use #addBtn or #addToCartBtn
  --------------------------- */
  function getProductFromCard(card) {
    const id = card?.dataset?.id || "unknown";
    const price = Number(card?.dataset?.price || 0);
    const title = $("h3", card)?.textContent?.trim() || "Item";
    const img = $("img", card);
    const imgSrc = img ? img.getAttribute("src") || img.src || "" : "";
    return { id, title, imgSrc, price };
  }

  function wireAddToCartButtons() {
    // Products listing cards
    $all(".add-to-cart-btn").forEach(button => {
      // prevent double-binding if page had inline scripts before
      if (button.dataset.bound === "1") return;
      button.dataset.bound = "1";

      button.addEventListener("click", (e) => {
        const card = e.currentTarget.closest(".product");
        const product = card ? getProductFromCard(card) : {
          id: button.dataset.id || "unknown",
          title: button.dataset.title || "Item",
          imgSrc: button.dataset.img || "",
          price: Number(button.dataset.price || 0)
        };

        addToCart(product);
        updateBadge();

        if (cartSidebar) {
          renderCartSidebar();
          showCart();
        } else {
          alert(`${product.title} added to cart.`);
        }
      });
    });

    // Product detail pages (multiple templates)
    const detailBtn = $("#addBtn") || $("#addToCartBtn");
    if (detailBtn && detailBtn.dataset.bound !== "1") {
      detailBtn.dataset.bound = "1";
      detailBtn.addEventListener("click", () => {
        // Try to read from product detail page
        const title = ($(".title")?.textContent || $("h2")?.textContent || document.title || "Item").trim();
        const priceText = ($(".price")?.textContent || "").replace(/[^\d]/g, "");
        const price = Number(priceText || detailBtn.dataset.price || 0);

        // stable id based on filename if missing
        const id = detailBtn.dataset.id || (location.pathname.split("/").pop() || "").replace(".html","") || title.toLowerCase().replace(/\s+/g,"-");
        const img = $("main img") || $("img");
        const imgSrc = img ? (img.getAttribute("src") || img.src || "") : "";

        const product = { id, title, imgSrc, price };
        addToCart(product);
        updateBadge();
        alert(`${title} added to cart.`);
      });
    }
  }

  /* ---------------------------
     View buttons
  --------------------------- */
  function wireViewButtons() {
    $all(".view-btn").forEach(btn => {
      if (btn.dataset.bound === "1") return;
      btn.dataset.bound = "1";
      btn.addEventListener("click", () => {
        const link = btn.getAttribute("data-link");
        if (link) window.location.href = link;
      });
    });
  }

  /* ---------------------------
     Login page (login.html)
  --------------------------- */
  function wireLogin() {
    const form = $("#loginForm");
    if (!form) return;

    const feedback = $("#formFeedback");

    function show(msg, ok) {
      if (!feedback) return;
      feedback.textContent = msg;
      feedback.style.display = "block";
      feedback.style.color = ok ? "#16a34a" : "#e11d48";
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (feedback) feedback.style.display = "none";

      const email = (form.email?.value || "").trim().toLowerCase();
      const password = (form.password?.value || "").trim();

      if (!email) return show("Please enter your email.", false);
      if (!password) return show("Please enter your password.", false);

      const users = readUsers();
      const found = users.find(u => String(u.email).toLowerCase() === email);

      if (!found) return show("No account found. Please Sign up first.", false);
      if (found.password !== password) return show("Incorrect password.", false);

      saveSession({ email: found.email, name: found.name || getDisplayNameFromEmail(found.email) });
      renderAuthLink();
      show("Login successful! Redirecting…", true);

      setTimeout(() => { window.location.href = "index.html"; }, 600);
    });
  }

  /* ---------------------------
     Signup page (signup.html)
  --------------------------- */
  function wireSignup() {
    const form = $("#signupForm");
    if (!form) return;

    const feedback = $("#formFeedback");

    function show(msg, ok) {
      if (!feedback) return;
      feedback.textContent = msg;
      feedback.style.display = "block";
      feedback.style.color = ok ? "#16a34a" : "#e11d48";
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (feedback) feedback.style.display = "none";

      const name = (form.name?.value || "").trim();
      const email = (form.email?.value || "").trim().toLowerCase();
      const password = (form.password?.value || "").trim();

      if (!name) return show("Please enter your name.", false);
      if (!email) return show("Please enter your email.", false);
      if (!password || password.length < 4) return show("Password must be at least 4 characters.", false);

      const users = readUsers();
      const exists = users.some(u => String(u.email).toLowerCase() === email);
      if (exists) return show("Account already exists. Please Login.", false);

      users.push({ name, email, password });
      saveUsers(users);
      saveSession({ email, name: name || getDisplayNameFromEmail(email) });
      renderAuthLink();
      show("Account created! Redirecting…", true);

      setTimeout(() => { window.location.href = "index.html"; }, 600);
    });
  }

  /* ---------------------------
     Cart page (cart.html) - render + controls
  --------------------------- */
  function wireCartPage() {
    const container = $("#cartItems");
    const emptyMessage = $("#emptyMessage");
    const totalEl = $("#cartTotal");
    const totalQtySpan = $("#totalQty");
    const checkout = $("#checkoutBtn");

    if (!container || !totalEl || !totalQtySpan || !checkout) return; // not cart page

    function render() {
      const cart = readCart();
      container.innerHTML = "";

      if (!cart.length) {
        if (emptyMessage) emptyMessage.style.display = "block";
        totalEl.style.display = "none";
        checkout.style.display = "none";
        totalQtySpan.textContent = "0";
        updateBadge();
        return;
      }

      if (emptyMessage) emptyMessage.style.display = "none";
      totalEl.style.display = "block";
      checkout.style.display = "block";

      let totalQty = 0;

      cart.forEach(item => {
        totalQty += Number(item.qty) || 0;

        const itemEl = document.createElement("div");
        itemEl.className = "cart-item";
        itemEl.innerHTML = `
          <img src="${item.imgSrc}" alt="${item.title}" />
          <div class="cart-item-info">
            <p class="cart-item-title">${item.title}</p>

            <p class="cart-item-price" style="margin:0 0 10px; color:#475569; font-weight:600;">
              Price: ${formatINR(Number(item.price) || 0)} • Qty: ${item.qty}
            </p>

            <div class="cart-item-qty-controls" role="group" aria-label="Quantity controls for ${item.title}">
              <button class="cart-button decrease-btn" type="button" aria-label="Decrease quantity of ${item.title}" data-id="${item.id}">-</button>
              <span class="cart-qty" aria-live="polite" aria-atomic="true">${item.qty}</span>
              <button class="cart-button increase-btn" type="button" aria-label="Increase quantity of ${item.title}" data-id="${item.id}">+</button>
              <button class="cart-remove-btn" type="button" aria-label="Remove ${item.title} from cart" data-id="${item.id}">&times;</button>
            </div>
          </div>
        `;
        container.appendChild(itemEl);
      });

      totalQtySpan.textContent = String(totalQty);
      const subtotal = getSubtotal(cart);
      totalEl.textContent = formatINR(subtotal);
      updateBadge();
    }

    // Delegation
    container.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const id = btn.getAttribute("data-id");
      if (!id) return;

      if (btn.classList.contains("decrease-btn")) changeQty(id, -1);
      if (btn.classList.contains("increase-btn")) changeQty(id, 1);
      if (btn.classList.contains("cart-remove-btn")) removeFromCart(id);

      render();
    });

    checkout.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = "checkout.html";
    });

    render();
  }

  /* ---------------------------
     Init
  --------------------------- */
  function init() {
    setActiveNav();
    renderAuthLink();
    updateBadge();

    wireViewButtons();
    wireAddToCartButtons();

    wireIndexCartControls();
    renderCartSidebar();

    wireLogin();
    wireSignup();
    wireCartPage();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
