import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";

const CFG = window.DELI_CONFIG || {};
const sb = CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY ? createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY) : null;
const $app = document.getElementById("app");

/* ---------- helpers ---------- */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const K = (n) => "K" + Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
const store = {
  get(k, d) { try { const v = localStorage.getItem("deli_" + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem("deli_" + k, JSON.stringify(v)); } catch {} },
};
const intl = (p) => {
  const d = String(p || "").replace(/\D/g, "");
  if (d.startsWith("260")) return d;
  if (d.startsWith("0")) return "260" + d.slice(1);
  return d.length === 9 ? "260" + d : d;
};
const toast = (m) => { const t = document.getElementById("toast"); t.textContent = m; t.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 3200); };
const initials = (n) => String(n || "?").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
const SVC = { delivery: "Delivery", errand: "Errand", ride: "Ride" };
const STATUS_TXT = { placed: "Order placed", accepted: "Rider assigned", picked_up: "Picked up", on_the_way: "On the way", delivered: "Delivered", cancelled: "Cancelled" };
const PAY_NAME = { mtn: "MTN MoMo", airtel: "Airtel Money", zamtel: "Zamtel Kwacha", cash: "Cash" };

/* ---------- operator (white-label) ---------- */
let OP = { id: null, slug: "urunji-deli", name: "Urunji Deli", tagline: "Delivery, errands and rides", logo_url: null, primary: "#1B6B35", accent: "#F28C28", phone: CFG.SUPPORT_PHONE || "", paused: false, unknown: false };
const hexOk = (h) => /^#[0-9a-fA-F]{6}$/.test(String(h || ""));
const mixHex = (h, t, k) => { const a = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)), b = [1, 3, 5].map((i) => parseInt(t.slice(i, i + 2), 16)); return "#" + a.map((v, i) => Math.round(v + (b[i] - v) * k).toString(16).padStart(2, "0")).join(""); };
function applyBrand() {
  const r = document.documentElement.style;
  if (OP.primary !== "#1B6B35") { r.setProperty("--green", OP.primary); r.setProperty("--green-d", mixHex(OP.primary, "#000000", 0.22)); r.setProperty("--green-t", mixHex(OP.primary, "#ffffff", 0.9)); }
  if (OP.accent !== "#F28C28") { r.setProperty("--orange", OP.accent); r.setProperty("--orange-t", mixHex(OP.accent, "#ffffff", 0.84)); }
  document.title = OP.name + ": delivery, errands and rides";
  const tc = document.querySelector("meta[name=theme-color]"); if (tc) tc.setAttribute("content", OP.primary);
  try {
    const ic2 = (n) => new URL("" + n, location.href).href;
    const logo = /^https:\/\//.test(OP.logo_url || "") ? OP.logo_url : null;
    const man = { name: OP.name, short_name: OP.name.slice(0, 12), description: OP.tagline, start_url: location.origin + "/", scope: location.origin + "/", display: "standalone", orientation: "portrait", background_color: OP.primary, theme_color: OP.primary,
      icons: logo ? [{ src: logo, sizes: "any", type: "image/png" }] : [{ src: ic2("icon-192.png"), sizes: "192x192", type: "image/png" }, { src: ic2("icon-512.png"), sizes: "512x512", type: "image/png" }] };
    const link = document.querySelector("link[rel=manifest]"); if (link) link.href = URL.createObjectURL(new Blob([JSON.stringify(man)], { type: "application/manifest+json" }));
  } catch {}
}
const brandImg = () => { const l = /^https:\/\//.test(OP.logo_url || "") ? OP.logo_url : null; return l || OP.slug === "urunji-deli" ? `<img src="${esc(l || "logo.png")}" alt="${esc(OP.name)}">` : `<span class="ini">${esc(initials(OP.name))}</span>`; };

const I = {
  bike: '<path d="M5 18a3 3 0 100-6 3 3 0 000 6zm14 0a3 3 0 100-6 3 3 0 000 6zM9 15l3-6h4m-6 0h-3m6 0l2.5 6"/>',
  bag: '<path d="M6 8h12l1 12H5L6 8zm3 0a3 3 0 016 0"/>',
  car: '<path d="M5 15l1.5-5h11L19 15m-14 0v4h2v-2h10v2h2v-4m-14 0h14"/><circle cx="8" cy="15" r=".6"/><circle cx="16" cy="15" r=".6"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  phone: '<path d="M6 3h3l2 5-2.5 1.5a11 11 0 006 6L16 13l5 2v3a3 3 0 01-3 3A15 15 0 013 6a3 3 0 013-3z"/>',
  chat: '<path d="M4 5h16v11H9l-5 4V5z"/>',
  home: '<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4v-9z"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 115 0c0 1.8-2.5 2-2.5 4M12 17h.01"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z"/>',
  pin: '<path d="M12 21s7-6 7-11a7 7 0 10-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  gift: '<path d="M4 9h16v4H4zM5 13h14v7H5zM12 9v11M12 9c-3 0-4-4-1-4 2 0 1 4 1 4zm0 0c3 0 4-4 1-4-2 0-1 4-1 4z"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M8.5 12l2.5 2.5L15.5 10"/>',
  shop: '<path d="M4 9l1.2-5h13.6L20 9H4zM5 9v11h14V9M9.5 20v-5h5v5"/>',
  cake: '<path d="M4 20h16v-6H4zM6 14v-3h12v3M12 11V7M12 7c-1-1-1-2 0-3 1 1 1 2 0 3z"/>',
  food: '<path d="M4 11h16a8 8 0 01-16 0zM8 7c0-1 1-1 1-2M12 7c0-1 1-1 1-2M16 7c0-1 1-1 1-2"/>',
  cart: '<path d="M3 4h2l2.5 11h10L20 8H6.5M9 20h.01M17 20h.01"/>',
};
const CAT = {
  grocery: { name: "Groceries", icon: "bag", bg: "var(--green-t)", fg: "#1B6B35" },
  bakery: { name: "Cakes & bakery", icon: "cake", bg: "var(--orange-t)", fg: "#C8700F" },
  food: { name: "Food & takeaways", icon: "food", bg: "var(--blue-t)", fg: "#0B1F3A" },
  other: { name: "Other shops", icon: "shop", bg: "#EEE9F7", fg: "#5B2A86" },
};
const MST = { pending: "New order", accepted: "Preparing", ready: "Ready for rider", declined: "Declined" };
const itemsText = (items) => (items || []).map((i) => i.qty + " x " + i.name).join(", ");
const ic = (n, c = "currentColor", s = 24) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c === "#1B6B35" ? OP.primary : c === "#F28C28" ? OP.accent : c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n] || ""}</svg>`;

/* ---------- state ---------- */
let fees = { delivery: 15, errand: 20, ride: 25, service: 3 };
const blankDraft = () => ({ pickup: "", dropoff: "", item_type: "Parcel", item_size: "Small", details: "", budget: "", pay_method: "mtn" });
let draft = Object.assign(blankDraft(), store.get("draft", {}));
let account = store.get("account", { name: "", phone: "" });
let timer = null;
let lastSig = "";
let dispatch = { session: null, tab: "orders", orders: [], riders: [], customers: [], passes: [], merchants: [], owed: [], settings: {}, ops: [], op: store.get("dop", null), isSuper: undefined, overview: [], loading: false };
let R = { token: store.get("rtoken", null), data: null, mode: "login" };
let M = { token: store.get("mtoken", null), data: null, mode: "login", tab: "orders" };
let shopsData = null, shopFilter = "all";
const menuCache = {};
let cart = Object.assign({ mid: null, name: "", lines: {}, dropoff: "", details: "", pay: "mtn" }, store.get("cart", {}));
const saveCart = () => store.set("cart", cart);
const cartCount = () => Object.values(cart.lines).reduce((a, l) => a + l.qty, 0);
const cartTotal = () => Object.values(cart.lines).reduce((a, l) => a + l.qty * l.price, 0);
const safeImg = (u) => (/^https:\/\//.test(String(u || "")) ? u : "");

const todayLusaka = () => new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Lusaka" });
let cust = { key: "", blocked: false, limit: 150 };
const pkey = (p) => String(p || "").replace(/\D/g, "").slice(-9);
async function checkCust() {
  const k = pkey(account.phone);
  if (k.length < 9) { if (cust.key !== "") { cust = { key: "", blocked: false, limit: 150 }; if (location.hash === "#/pay") render(true); } return; }
  try {
    const r = await rpc("deli_customer_check", { p_phone: account.phone, p_op: OP.id });
    const n = { key: k, blocked: !!r.blocked, limit: r.cash_limit === null || r.cash_limit === undefined ? null : Number(r.cash_limit) };
    if (JSON.stringify(n) !== JSON.stringify(cust)) { cust = n; if (location.hash === "#/pay") render(true); }
  } catch {}
}
const saveDraft = () => store.set("draft", draft);
const myOrders = () => store.get("orders", []);
const addOrder = (code, service) => store.set("orders", [{ code, service, at: Date.now() }, ...myOrders().filter((o) => o.code !== code)].slice(0, 30));
let armedKey = null, armedAt = 0;
const twice = (key, msg) => { if (armedKey === key && Date.now() - armedAt < 6000) { armedKey = null; return true; } armedKey = key; armedAt = Date.now(); toast(msg || "Tap the button again to confirm"); return false; };
const rpc = async (fn, args) => {
  if (!sb) throw new Error("The app is not connected yet. Please try again later.");
  const { data, error } = await sb.rpc(fn, args || {});
  if (error) throw new Error(error.message || "Something went wrong");
  return data;
};

/* ---------- shared pieces ---------- */
const tabs = (on) => `<nav class="tabs">
  <a href="#/home" class="${on === "home" ? "on" : ""}">${ic("home")}Home</a>
  <a href="#/shops" class="${on === "shops" ? "on" : ""}">${ic("shop")}Shops</a>
  <a href="#/orders" class="${on === "orders" ? "on" : ""}">${ic("list")}Orders</a>
  <a href="#/help" class="${on === "help" ? "on" : ""}">${ic("help")}Help</a>
  <a href="#/account" class="${on === "account" ? "on" : ""}">${ic("user")}Account</a>
</nav>`;
const topbar = (title, to = "#/home") => `<div class="topbar"><a class="back" href="${to}" aria-label="Back">${ic("back", "#0B1F3A")}</a><div class="h1">${esc(title)}</div></div>`;
const powered = `<div class="powered-dark">Powered by Urunji Innovations</div>`;
const money = (svc) => (fees[svc] || 0) + (fees.service || 0);

/* ---------- views ---------- */
function vWelcome() {
  return `<div class="screen welcome"><div class="c1"></div><div class="c2"></div><div class="in">
    <div class="logo-tile">${brandImg()}</div>
    <div><div style="font-size:34px;font-weight:800;letter-spacing:-.8px;line-height:1.1">Anything.<br>Anywhere in town.</div>
    <div style="font-size:16px;margin-top:10px;opacity:.92">Deliveries, errands and rides, done fast by riders you can trust.</div></div>
    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="feat"><div class="ic">${ic("bag", "#fff")}</div>Send or receive parcels, food and documents</div>
      <div class="feat"><div class="ic">${ic("check", "#fff")}</div>Trusted riders run your errands for you</div>
      <div class="feat"><div class="ic">${ic("car", "#fff")}</div>Need a lift? Book a safe ride</div>
    </div>
    <div class="spacer"></div>
    <button class="btn btn-orange" data-act="start">Get started</button>
    <div class="powered">Powered by Urunji Innovations</div>
  </div></div>`;
}

const shopTile = (s) => {
  const c = CAT[s.category] || CAT.other; const img = safeImg(s.image_url);
  return `<a class="shopcard ${s.is_open ? "" : "closed"}" href="#/shop/${s.id}"><div class="stile" style="background:${c.bg};color:${c.fg}">${img ? `<img src="${esc(img)}" alt="">` : ic(c.icon, c.fg, 36)}${s.featured ? '<span class="star-tag">Featured</span>' : ""}</div>
    <div class="sname">${esc(s.name)}</div><div class="smeta">${esc(c.name)}</div><span class="badge ${s.is_open ? "" : "g"}" style="align-self:flex-start">${s.is_open ? "Open now" : "Closed"}</span></a>`;
};
const shopsBanner = () => `<a class="shopbanner" href="#/shops"><div class="ic">${ic("shop", "#fff", 28)}</div><div class="grow"><div style="font-weight:800;font-size:17px">Order from local shops</div><div style="font-size:13px;opacity:.92">Groceries, cakes, shawarma and more, delivered.</div></div><span class="seeall-w">Browse</span></a>`
  + (shopsData && shopsData.length ? `<div class="row-between"><div class="sec" style="margin:0">Shops on ${esc(OP.name)}</div><a class="seeall" href="#/shops">See all</a></div><div class="shopscroll">${shopsData.slice(0, 10).map(shopTile).join("")}</div>` : "");

function vShops() {
  const cats = [["all", "All"], ["grocery", "Groceries"], ["bakery", "Cakes & bakery"], ["food", "Food & takeaways"], ["other", "Other"]];
  const shown = (shopsData || []).filter((x) => shopFilter === "all" || x.category === shopFilter);
  return `<div class="screen"><div class="pad" style="padding-bottom:12px">${topbar("Shops")}
    <div class="chips nowrap">${cats.map(([k, n]) => `<button class="chip ${shopFilter === k ? "on" : ""}" data-act="shopcat" data-v="${k}">${n}</button>`).join("")}</div>
    ${shopsData === null ? `<div class="center-msg"><div class="spin"></div><div>Loading shops…</div></div>` : shown.length ? `<div class="shopgrid">${shown.map(shopTile).join("")}</div>` : `<div class="center-msg"><div class="t1">No shops here yet</div><div class="small">New shops are joining. Check back soon.</div></div>`}
    <div class="card"><div class="t1">Own a shop?</div><div class="small">Grocery, cakes, shawarma, takeaways. Sell on ${esc(OP.name)} and we deliver for you.</div><a class="btn btn-ghost" href="#/merchant">Shop sign-in or sign-up</a></div>
    ${powered}</div>${tabs("shops")}</div>`;
}

function vShop(id) {
  const m = menuCache[id];
  if (m === undefined) return `<div class="screen"><div class="center-msg"><div class="spin"></div><div>Loading…</div></div></div>`;
  if (m === null) return `<div class="screen"><div class="pad">${topbar("Shop", "#/shops")}<div class="center-msg"><div class="t1">This shop is not available</div><a class="btn btn-green" href="#/shops" style="max-width:220px">All shops</a></div></div></div>`;
  const sh = m.shop, c = CAT[sh.category] || CAT.other, img = safeImg(sh.image_url);
  const mine = cart.mid === id ? cart.lines : {};
  const row = (i) => { const q = mine[i.id] ? mine[i.id].qty : 0;
    return `<div class="item"><div class="grow"><div class="t1">${esc(i.name)}</div>${i.description ? `<div class="t2">${esc(i.description)}</div>` : ""}<div class="price">${K(i.price)}</div></div>
      ${!sh.is_open ? "" : q ? `<div class="stepper"><button data-act="cartsub" data-id="${i.id}" data-mid="${id}" aria-label="Less">−</button><b>${q}</b><button data-act="cartadd" data-id="${i.id}" data-mid="${id}" aria-label="More">+</button></div>` : `<button class="btn btn-green btn-sm" data-act="cartadd" data-id="${i.id}" data-mid="${id}">Add</button>`}</div>`; };
  const n = cart.mid === id ? cartCount() : 0;
  return `<div class="screen"><div class="pad" style="padding-bottom:90px">${topbar(sh.name, "#/shops")}
    <div class="shophead"><div class="stile big" style="background:${c.bg};color:${c.fg}">${img ? `<img src="${esc(img)}" alt="">` : ic(c.icon, c.fg, 44)}</div>
      <div class="grow"><div class="t1">${esc(c.name)} · <span style="color:${sh.is_open ? "var(--green)" : "#B3261E"}">${sh.is_open ? "Open now" : "Closed"}</span></div>${sh.address ? `<div class="t2">${esc(sh.address)}</div>` : ""}${sh.description ? `<div class="t2">${esc(sh.description)}</div>` : ""}</div></div>
    ${!sh.is_open ? `<div class="note orange"><div><b>This shop is closed right now.</b> Please come back later.</div></div>` : ""}
    ${m.items.length ? m.items.map(row).join("") : `<div class="center-msg"><div class="small">No items on the menu yet.</div></div>`}
    ${n ? `<a class="cartbar" href="#/basket"><span>${ic("cart", "#fff", 22)} ${n} item${n > 1 ? "s" : ""}</span><b>View basket · ${K(cartTotal())}</b></a>` : ""}
  </div></div>`;
}

function vBasket() {
  const lines = Object.entries(cart.lines);
  if (!cart.mid || !lines.length) return `<div class="screen"><div class="pad">${topbar("Basket", "#/shops")}<div class="center-msg"><div class="t1">Your basket is empty</div><a class="btn btn-green" href="#/shops" style="max-width:220px">Browse shops</a></div></div></div>`;
  const fee = fees.delivery || 0, sf = fees.service || 0, total = cartTotal() + fee + sf;
  return `<div class="screen"><div class="pad">${topbar("Your basket", "#/shop/" + cart.mid)}
    ${cust.blocked ? `<div class="note orange"><div><b>Sorry, we cannot take orders from this number right now.</b> Please call us on ${esc(OP.phone)}.</div></div>` : ""}
    <div class="t1">${esc(cart.name)}</div>
    <div class="card">${lines.map(([id, l]) => `<div class="item slim"><div class="grow"><div class="t1">${esc(l.name)}</div><div class="t2">${K(l.price)} each</div></div><div class="stepper"><button data-act="cartsub" data-id="${id}" data-mid="${cart.mid}" aria-label="Less">−</button><b>${l.qty}</b><button data-act="cartadd" data-id="${id}" data-mid="${cart.mid}" aria-label="More">+</button></div></div>`).join("")}
      <div class="hr"></div><div class="rowline"><span>Items</span><b>${K(cartTotal())}</b></div><div class="rowline"><span>Delivery</span><b>${K(fee)}</b></div>${sf > 0 ? `<div class="rowline"><span>Service fee</span><b>${K(sf)}</b></div>` : ""}<div class="hr"></div><div class="total"><span>Total</span><span>${K(total)}</span></div></div>
    <div class="sec">Where should we deliver?</div>
    <input class="input" data-bind-cart="dropoff" value="${esc(cart.dropoff)}" placeholder="Your place or landmark">
    <textarea class="input" rows="2" data-bind-cart="details" placeholder="Note for the rider (optional)">${esc(cart.details)}</textarea>
    <div class="sec">Your details</div>
    <input class="input" data-bind-acc="name" placeholder="Your name" value="${esc(account.name)}" autocomplete="name">
    <input class="input" data-bind-acc="phone" inputmode="tel" placeholder="Phone number e.g. 0977123456" value="${esc(account.phone)}" autocomplete="tel">
    <div class="sec">Pay with mobile money</div>
    ${["mtn", "airtel", "zamtel"].map((k) => `<label class="pm ${cart.pay === k ? "on" : ""}"><span class="ic">${k === "mtn" ? "M" : k === "airtel" ? "A" : "Z"}</span><span class="nm">${PAY_NAME[k]}</span><input type="radio" name="spm" data-act="shoppm" data-v="${k}" ${cart.pay === k ? "checked" : ""}></label>`).join("")}
    <div class="small">After you order, we show you the number to send the money to. The shop starts preparing once your payment is confirmed.</div>
    <div class="spacer"></div>
    <button class="btn btn-green" data-act="placeshop" id="placeShopBtn">Place order · ${K(total)}</button>
  </div></div>`;
}

function vHome() {
  const act = myOrders();
  return `<div class="screen">
    <div class="hhead"><div class="brand"><div class="tile">${brandImg()}</div><b>${esc(OP.name)}</b></div>
      <div><div style="font-size:26px;font-weight:800;letter-spacing:-.5px">${account.name ? "Hello, " + esc(account.name.split(" ")[0]) : "Hello there"}</div>
      <div style="opacity:.9;font-size:15px;margin-top:2px">What do you need today?</div></div></div>
    <div class="pad" style="padding-top:20px">
      <div class="tiles">
        <a class="tile-btn" href="#/delivery"><div class="ic" style="background:var(--green-t)">${ic("bag", "#1B6B35", 28)}</div>Delivery</a>
        <a class="tile-btn" href="#/errand"><div class="ic" style="background:var(--orange-t)">${ic("bike", "#C8700F", 28)}</div>Errand</a>
        <a class="tile-btn" href="#/ride"><div class="ic" style="background:var(--blue-t)">${ic("car", "#0B1F3A", 28)}</div>Ride</a>
      </div>
      ${shopsBanner()}
      <div class="promo"><div class="ic">${ic("gift", "#0B1F3A", 26)}</div>
        <div><div style="font-weight:800;font-size:16px">Launch offer</div>
        <div style="font-size:13px;opacity:.9;line-height:1.35">Ask us on WhatsApp for your first-order deal.</div></div></div>
      <div class="note green">${ic("shield", "#1B6B35")}<div><b>Trusted riders.</b> Errands and rides are done only by riders we have checked.</div></div>
      ${act.length ? `<div class="sec">Your latest order</div><a class="card" href="#/track/${esc(act[0].code)}"><div class="orow"><div class="oic">${ic("bike", "#1B6B35")}</div><div class="grow"><div class="t1">${esc(SVC[act[0].service] || "Order")} · ${esc(act[0].code)}</div><div class="t2">Tap to track</div></div><span class="badge">Track</span></div></a>` : ""}
      ${powered}
    </div>${tabs("home")}</div>`;
}

function vBook(svc) {
  const d = draft;
  const title = { delivery: "Send a delivery", errand: "Run an errand", ride: "Book a ride" }[svc];
  const pl = { delivery: ["Pick-up place", "Drop-off place"], errand: ["Where we start (your location)", "Where we deliver"], ride: ["Pick me up from", "Drop me at"] }[svc];
  let extra = "";
  if (svc === "delivery") {
    extra = `<div class="sec">What are we carrying?</div>
      <div class="chips">${["Parcel", "Food", "Documents", "Other"].map((t) => `<button class="chip ${d.item_type === t ? "on" : ""}" data-act="item" data-v="${t}">${t}</button>`).join("")}</div>
      <div class="sec">Size</div>
      <div class="sizes">${[["Small", "fits a bag"], ["Medium", "a box"], ["Large", "needs space"]].map(([s, n]) => `<button class="size ${d.item_size === s ? "on" : ""}" data-act="size" data-v="${s}"><b>${s}</b><span>${n}</span></button>`).join("")}</div>
      <div class="sec">Note for the rider (optional)</div>
      <textarea class="input" rows="2" data-bind="details" placeholder="e.g. Call me when you arrive">${esc(d.details)}</textarea>`;
  } else if (svc === "errand") {
    extra = `<div class="sec">What should we get or do?</div>
      <textarea class="input" rows="3" data-bind="details" placeholder="e.g. Buy 2 loaves of bread and airtime at Shoprite">${esc(d.details)}</textarea>
      <div class="sec">Money for the items (optional)</div>
      <input class="input" inputmode="numeric" data-bind="budget" placeholder="e.g. 150" value="${esc(d.budget)}">
      <div class="note orange">${ic("shield", "#C8700F")}<div>Your errand goes to one of our <b>3 trusted riders</b>. The cost of the items is separate from our fee.</div></div>`;
  } else {
    extra = `<div class="sec">Note for the driver (optional)</div>
      <textarea class="input" rows="2" data-bind="details" placeholder="e.g. 2 people, small bag">${esc(d.details)}</textarea>
      <div class="note blue">${ic("shield", "#0B1F3A")}<div>Rides are done only by our <b>trusted riders</b>.</div></div>`;
  }
  return `<div class="screen"><div class="pad">
    ${topbar(title)}
    <div class="card"><div class="route"><div class="dots"><div class="dot"></div><div class="line"></div><div class="sq"></div></div>
      <div class="fields"><div class="field"><label>${pl[0]}</label><input class="bare" data-bind="pickup" value="${esc(d.pickup)}" placeholder="Type a place or landmark"></div>
      <div class="field last"><label>${pl[1]}</label><input class="bare" data-bind="dropoff" value="${esc(d.dropoff)}" placeholder="Type a place or landmark"></div></div></div></div>
    ${extra}
    <div class="spacer"></div>
    <div class="card"><div class="rowline"><span>${SVC[svc]} fee</span><b>${K(fees[svc])}</b></div>${fees.service > 0 ? `<div class="rowline"><span>Service fee</span><b>${K(fees.service)}</b></div>` : ""}<div class="hr"></div><div class="total"><span>Total</span><span>${K(money(svc))}</span></div></div>
    <button class="btn btn-green" data-act="topay" data-svc="${svc}">Continue to pay</button>
  </div></div>`;
}

function vPay() {
  const svc = draft.service || "delivery";
  const acc = account;
  const m = ["mtn", "airtel", "zamtel", "cash"];
  const risk = money(svc) + (Number(String(draft.budget || "").replace(/[^0-9.]/g, "")) || 0);
  const cashOff = cust.limit !== null && (cust.limit === 0 || risk >= cust.limit);
  if (cashOff && draft.pay_method === "cash") draft.pay_method = "mtn";
  return `<div class="screen"><div class="pad">
    ${topbar("Pay", "#/" + svc)}
    ${cust.blocked ? `<div class="note orange"><div><b>Sorry, we cannot take orders from this number right now.</b> Please call us on ${esc(OP.phone)}.</div></div>` : ""}
    <div class="card"><div class="rowline"><span>${SVC[svc]}</span><b>${K(fees[svc])}</b></div>${fees.service > 0 ? `<div class="rowline"><span>Service fee</span><b>${K(fees.service)}</b></div>` : ""}<div class="hr"></div><div class="total"><span>Total</span><span>${K(money(svc))}</span></div></div>
    <div class="sec">Your details</div>
    <input class="input" data-bind-acc="name" placeholder="Your name" value="${esc(acc.name)}" autocomplete="name">
    <input class="input" data-bind-acc="phone" inputmode="tel" placeholder="Phone number e.g. 0977123456" value="${esc(acc.phone)}" autocomplete="tel">
    <div class="sec">How will you pay?</div>
    ${m.map((k) => `<label class="pm ${draft.pay_method === k ? "on" : ""}" ${k === "cash" && cashOff ? 'style="opacity:.4"' : ""}><span class="ic">${k === "cash" ? "K" : k === "mtn" ? "M" : k === "airtel" ? "A" : "Z"}</span><span class="nm">${PAY_NAME[k]}</span><input type="radio" name="pm" data-act="pm" data-v="${k}" ${draft.pay_method === k ? "checked" : ""} ${k === "cash" && cashOff ? "disabled" : ""}></label>`).join("")}
    ${cashOff ? `<div class="note blue"><div>Cash is not available for this order. Please pay with mobile money. ${cust.limit ? "Cash is only for orders under " + K(cust.limit) + "." : ""}</div></div>` : ""}
    <div class="small">${draft.pay_method === "cash" ? "Pay the rider in cash when your order is done." : "After you order, we show you the number to send the money to. We confirm your payment by hand."}</div>
    <div class="spacer"></div>
    <button class="btn btn-green" data-act="place" id="placeBtn">Place order · ${K(money(svc))}</button>
  </div></div>`;
}

function stepBar(status) {
  const idx = { placed: 0, accepted: 0, picked_up: 1, on_the_way: 2, delivered: 3 }[status] ?? 0;
  const names = ["Placed", "Picked up", "On the way", "Delivered"];
  return `<div class="steps">${names.map((n, i) => `<div class="${i < idx || status === "delivered" ? "done" : i === idx ? "cur" : ""}"><i></i>${n}</div>`).join("")}</div>`;
}

function vTrack(o) {
  if (o === undefined) return `<div class="screen"><div class="center-msg"><div class="spin"></div><div>Loading your order…</div></div></div>`;
  if (o === null) return `<div class="screen"><div class="pad">${topbar("Track", "#/orders")}<div class="center-msg"><div class="t1">We could not find that order</div><div class="small">Check the tracking code and try again.</div><a class="btn btn-green" href="#/orders" style="max-width:220px">My orders</a></div></div></div>`;
  const total = Number(o.delivery_fee) + Number(o.service_fee) + Number(o.items_total || 0);
  const r = o.rider;
  const shopNote = !o.shop ? "" : o.merchant_status === "pending" ? `Waiting for ${esc(o.shop.name)} to accept your order.` : o.merchant_status === "accepted" ? `${esc(o.shop.name)} is preparing your order.` : o.merchant_status === "ready" ? "Your order is ready. The rider is collecting it." : o.merchant_status === "declined" ? "Sorry, the shop could not take this order." : "";
  const label = o.service === "ride" ? "Trip code" : "Delivery code";
  let payBox = "";
  if (o.status === "cancelled") payBox = `<div class="note orange"><div><b>This order was cancelled.</b></div></div>`;
  else if (o.pay_status === "confirmed") payBox = `<div class="note green">${ic("check", "#1B6B35")}<div><b>Payment received.</b> Thank you!</div></div>`;
  else if (o.pay_method === "cash") payBox = `<div class="note orange"><div>Please pay the rider <b>${K(total)}</b> in cash.</div></div>`;
  else payBox = `<div class="note orange"><div>Send <b>${K(total)}</b> by ${PAY_NAME[o.pay_method]} to <b>${esc(o.pay_to || "the number we send you on WhatsApp")}</b>. Use reference <b>${esc(o.code)}</b>. We confirm it by hand.</div></div>`;
  return `<div class="screen">
    <div class="map"><a class="back" href="#/orders" aria-label="Back">${ic("back", "#0B1F3A")}</a>
      <svg viewBox="0 0 430 300" preserveAspectRatio="xMidYMid slice"><rect width="430" height="300" fill="#E9EFE8"/>
      <path d="M-10 70 L440 110 M-10 200 L440 170 M120 -10 L160 310 M300 -10 L270 310" stroke="#fff" stroke-width="14" fill="none"/>
      <path d="M90 230 C150 180 180 150 230 140 S320 90 350 70" stroke="${OP.primary}" stroke-width="5" stroke-dasharray="2 10" stroke-linecap="round" fill="none"/>
      <circle cx="90" cy="230" r="10" fill="${OP.primary}" stroke="#fff" stroke-width="3"/><rect x="342" y="62" width="18" height="18" rx="4" fill="${OP.accent}" stroke="#fff" stroke-width="3"/></svg></div>
    <div class="sheet"><div class="grab"></div>
      <div class="orow"><div class="grow"><div style="font-size:20px;font-weight:800">${STATUS_TXT[o.status]}</div><div class="t2">${SVC[o.service]} · ${esc(o.code)}</div></div><span class="badge ${o.status === "cancelled" ? "g" : ""}">${K(total)}</span></div>
      ${o.status !== "cancelled" ? stepBar(o.status) : ""}
      ${r ? `<div class="rider"><div class="avatar">${esc(initials(r.name))}</div><div class="grow"><div class="t1">${esc(r.name)}</div><div class="t2">${esc(r.plate || "Your rider")}</div></div>
        ${r.phone ? `<a class="circle" href="tel:${esc(r.phone)}" aria-label="Call rider">${ic("phone", "#0B1F3A", 20)}</a><a class="circle g" href="https://wa.me/${intl(r.phone)}" target="_blank" rel="noopener" aria-label="WhatsApp rider">${ic("chat", "#fff", 20)}</a>` : ""}</div>`
      : o.status === "placed" ? `<div class="note blue"><div>${o.shop ? shopNote + " " : ""}${o.merchant_status === "pending" || o.merchant_status === "declined" ? "" : "We are finding you a rider. "}This page updates by itself.</div></div>` : ""}
      ${o.shop && o.status !== "placed" && o.status !== "cancelled" && shopNote && o.merchant_status !== "ready" ? `<div class="note blue"><div>${shopNote}</div></div>` : ""}
      ${o.status !== "delivered" && o.status !== "cancelled" ? `<div class="codebox"><div><div class="t1">${label}</div><div class="small">When you get your ${o.service === "ride" ? "ride" : "order"}, tap the green button below, or give the rider this code.</div></div><div class="digits">${String(o.delivery_code).split("").map((d) => `<span>${d}</span>`).join("")}</div></div>` : ""}
      ${payBox}
      ${o.items && o.items.length ? `<div class="card">${o.items.map((i) => `<div class="rowline"><span>${i.qty} × ${esc(i.name)}</span><b>${K(i.qty * i.price)}</b></div>`).join("")}<div class="hr"></div><div class="rowline"><span>Items</span><b>${K(o.items_total)}</b></div><div class="rowline"><span>Delivery</span><b>${K(o.delivery_fee)}</b></div>${Number(o.service_fee) > 0 ? `<div class="rowline"><span>Service fee</span><b>${K(o.service_fee)}</b></div>` : ""}</div>` : ""}
      <div class="card"><div class="rowline"><span>From</span><b>${esc(o.pickup)}</b></div><div class="rowline"><span>To</span><b>${esc(o.dropoff)}</b></div>${o.details ? `<div class="rowline"><span>Note</span><b>${esc(o.details)}</b></div>` : ""}</div>
      ${o.status === "picked_up" || o.status === "on_the_way" ? `<button class="btn btn-green" data-act="received" data-code="${esc(o.code)}">${o.service === "ride" ? "I have arrived safely" : "I have received my order"}</button>` : ""}
      ${o.status === "delivered" ? `<a class="btn btn-green" href="#/delivered/${esc(o.code)}">Rate your rider</a>` : ""}
      <a class="btn btn-ghost" href="https://wa.me/${intl(OP.phone)}?text=${encodeURIComponent("Hello " + OP.name + ", order " + o.code)}" target="_blank" rel="noopener">Need help? WhatsApp us</a>
    </div></div>`;
}

function vDelivered(o) {
  if (!o) return `<div class="screen"><div class="center-msg"><div class="spin"></div></div></div>`;
  const rated = o.rating;
  return `<div class="screen"><div class="dhead"><div class="bigcheck">${ic("check", "#1B6B35", 44)}</div>
      <div style="font-size:28px;font-weight:800">${o.service === "ride" ? "You have arrived" : "Delivered!"}</div><div style="opacity:.92">Thank you for using ${esc(OP.name)}.</div></div>
    <div class="pad">
      <div class="card" style="align-items:center;text-align:center"><div class="sec">${rated ? "Thanks for your rating" : "How was your rider?"}</div>
        <div class="stars">${[1, 2, 3, 4, 5].map((n) => `<button class="star" data-act="rate" data-v="${n}" data-code="${esc(o.code)}" ${rated ? "disabled" : ""} aria-label="${n} stars">${ic("star", n <= (rated || 0) ? "#F28C28" : "#C9D3CB", 40).replace('fill="none"', `fill="${n <= (rated || 0) ? "#F28C28" : "none"}"`)}</button>`).join("")}</div></div>
      <div class="card"><div class="rowline"><span>Order</span><b>${esc(o.code)}</b></div><div class="rowline"><span>Total</span><b>${K(Number(o.delivery_fee) + Number(o.service_fee) + Number(o.items_total || 0))}</b></div></div>
      <div class="spacer"></div>
      <a class="btn btn-green" href="#/home">Back to home</a>
    </div></div>`;
}

function vOrders(list) {
  const mine = myOrders();
  return `<div class="screen"><div class="pad" style="padding-bottom:12px">
    <div class="h1">My orders</div>
    ${mine.length ? mine.map((o) => { const d = list[o.code]; return `<a class="card" href="#/track/${esc(o.code)}"><div class="orow"><div class="oic">${ic(o.service === "ride" ? "car" : o.service === "errand" ? "bike" : "bag", "#1B6B35")}</div><div class="grow"><div class="t1">${esc(SVC[o.service] || "Order")} · ${esc(o.code)}</div><div class="t2">${d ? esc(d.pickup) + " → " + esc(d.dropoff) : new Date(o.at).toLocaleDateString()}</div></div><span class="badge ${d && d.status === "delivered" ? "" : "o"}">${d ? STATUS_TXT[d.status] : "…"}</span></div></a>`; }).join("")
      : `<div class="center-msg"><div class="t1">No orders yet</div><div class="small">Your orders on this phone will show here.</div><a class="btn btn-green" href="#/home" style="max-width:220px">Book now</a></div>`}
    <div class="card"><div class="sec">Have a tracking code?</div><div class="d-row"><input class="input" id="codeIn" placeholder="e.g. 3F9A1C7B" style="flex:1;text-transform:uppercase"><button class="btn btn-green btn-sm" data-act="findcode">Track</button></div></div>
  </div>${tabs("orders")}</div>`;
}

function vHelp() {
  const wa = `https://wa.me/${intl(OP.phone)}`;
  return `<div class="screen"><div class="pad" style="padding-bottom:12px"><div class="h1">Help</div>
    <div class="card"><div class="t1">Talk to us</div><div class="small">We reply fast on WhatsApp.</div>
      <a class="btn btn-green" href="${wa}" target="_blank" rel="noopener">WhatsApp us</a><a class="btn btn-ghost" href="tel:${esc(OP.phone)}">Call ${esc(OP.phone)}</a></div>
    <div class="card"><div class="t1">How it works</div><div class="small">1. Choose delivery, errand or ride.<br>2. Enter the places and pay with mobile money or cash.<br>3. A rider is assigned and you track the order.<br>4. Give the rider your 4-digit code when you get your order.</div></div>
    <div class="card"><div class="t1">Mobile money payments</div><div class="small">After ordering, send the money to the number shown with your order code as the reference. We confirm it by hand, usually within minutes.</div></div>
    ${powered}</div>${tabs("help")}</div>`;
}

function vAccount() {
  return `<div class="screen"><div class="pad" style="padding-bottom:12px"><div class="h1">Account</div>
    <div class="small">Saved on this phone so you do not type them again.</div>
    <input class="input" data-bind-acc="name" placeholder="Your name" value="${esc(account.name)}">
    <input class="input" data-bind-acc="phone" inputmode="tel" placeholder="Phone number" value="${esc(account.phone)}">
    <button class="btn btn-green" data-act="saveacc">Save</button>
    <a class="btn btn-ghost" href="#/rider">Rider sign-in</a>
    <a class="btn btn-ghost" href="#/merchant">Shop sign-in</a>
    <a class="btn btn-ghost" href="#/dispatch">Staff sign-in</a>${powered}</div>${tabs("account")}</div>`;
}

/* ---------- staff dispatch ---------- */
function vDispatch() {
  const D = dispatch;
  if (!sb) return `<div class="screen"><div class="pad">${topbar("Staff", "#/account")}<div class="note orange"><div>The app is not connected to its database yet.</div></div></div></div>`;
  if (!D.session) return `<div class="screen"><div class="pad">${topbar("Staff sign-in", "#/account")}
    <input class="input" id="sEmail" type="email" placeholder="Staff email" autocomplete="username">
    <input class="input" id="sPass" type="password" placeholder="Password" autocomplete="current-password">
    <button class="btn btn-green" data-act="login">Sign in</button></div></div>`;
  const tabsHtml = ["orders", "customers", "riders", "merchants", "settings"].concat(D.isSuper ? ["operators"] : []).map((t) => `<button class="chip ${D.tab === t ? "on" : ""}" data-act="dtab" data-v="${t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join("");
  let body = "";
  if (D.tab === "orders") {
    const active = D.orders.filter((o) => !["delivered", "cancelled"].includes(o.status));
    const done = D.orders.filter((o) => ["delivered", "cancelled"].includes(o.status)).slice(0, 12);
    const card = (o) => {
      const trusted = o.service === "delivery" ? D.riders.filter((r) => r.active) : D.riders.filter((r) => r.active && r.trusted);
      const isOpen = !["delivered", "cancelled"].includes(o.status);
      const rider = D.riders.find((r) => r.id === o.rider_id);
      const ck = pkey(o.customer_phone); const cu = D.customers.find((c) => c.phone_key === ck);
      const cst = cu ? cu.status : "new";
      const clabel = cst === "new" ? (cu && cu.completed >= 3 ? "Regular" : "New customer") : cst[0].toUpperCase() + cst.slice(1);
      return `<div class="d-order">${o.incident_level ? `<div class="note orange" style="border:2px solid #B3261E"><div><b style="color:#B3261E">${o.incident_level === "danger" ? "RIDER IN DANGER. Call them now." : "Rider reported a problem."}</b>${o.incident_note ? " " + esc(o.incident_note) : ""}${rider && rider.phone ? ` <a href="tel:${esc(rider.phone)}" style="color:#B3261E;font-weight:800">Call ${esc(rider.name)}</a>` : ""}<br><button class="btn btn-ghost btn-sm" data-act="clearinc" data-id="${o.id}">Clear alert</button></div></div>` : ""}<div class="d-row" style="justify-content:space-between"><b>${SVC[o.service]} · ${esc(o.code)}</b><span class="badge ${o.status === "delivered" ? "" : o.status === "cancelled" ? "g" : "o"}">${STATUS_TXT[o.status]}</span></div>
        <div class="t2">${esc(o.pickup)} → ${esc(o.dropoff)}</div>
        ${o.merchant_id ? `<div class="note blue"><div><b>Shop order · ${esc((D.merchants.find((m) => m.id === o.merchant_id) || {}).name || "Shop")}</b> · ${MST[o.merchant_status] || ""}<br>${esc(itemsText(o.items))}<br>Items ${K(o.items_total)} + delivery ${K(Number(o.delivery_fee) + Number(o.service_fee))}. Shop gets ${K(Number(o.items_total) - Number(o.commission))}.</div></div>` : ""}
        ${o.details ? `<div class="t2">Note: ${esc(o.details)}${o.budget ? " · Budget " + K(o.budget) : ""}</div>` : ""}
        <div class="t2">${esc(o.customer_name || "Customer")} · <a href="tel:${esc(o.customer_phone)}" style="color:var(--green);font-weight:700">${esc(o.customer_phone)}</a> · <a href="https://wa.me/${intl(o.customer_phone)}" target="_blank" rel="noopener" style="color:var(--green);font-weight:700">WhatsApp</a></div>
        <div class="d-row"><span class="badge ${cst === "trusted" ? "" : cst === "new" ? "o" : "g"}">${clabel} · ${cu ? cu.completed : 0} done${cu && cu.incidents ? " · " + cu.incidents + " incident" + (cu.incidents > 1 ? "s" : "") : ""}</span>${cst !== "blocked" ? `<button class="btn btn-ghost btn-sm" data-act="cset" data-id="${ck}" data-v="watch">Watch</button><button class="btn btn-ghost btn-sm" style="color:#B3261E;border-color:#B3261E" data-act="cset" data-id="${ck}" data-v="blocked">Block</button>` : ""}</div>
        <div class="d-row"><span class="badge ${o.pay_status === "confirmed" ? "" : "o"}">${PAY_NAME[o.pay_method]}: ${o.pay_status}</span><b>${K(Number(o.delivery_fee) + Number(o.service_fee) + Number(o.items_total || 0))}</b>
          ${o.pay_status !== "confirmed" && o.status !== "cancelled" ? `<button class="btn btn-ghost btn-sm" data-act="confirmpay" data-id="${o.id}">Mark paid</button>` : ""}</div>
        ${isOpen ? `<div class="d-row"><select class="input" id="rs-${o.id}" style="flex:1"><option value="">${rider ? esc(rider.name) : "Choose rider"}</option>${trusted.map((r) => `<option value="${r.id}" ${r.id === o.rider_id ? "selected" : ""}>${esc(r.name)}${r.trusted ? " ★" : ""}</option>`).join("")}</select>
          <button class="btn btn-green btn-sm" data-act="assign" data-id="${o.id}">Assign</button></div>
        <div class="d-row">${o.status === "accepted" ? `<button class="btn btn-ghost btn-sm" data-act="status" data-id="${o.id}" data-v="picked_up">Picked up</button>` : ""}
          ${["accepted", "picked_up"].includes(o.status) ? `<button class="btn btn-ghost btn-sm" data-act="status" data-id="${o.id}" data-v="on_the_way">On the way</button>` : ""}
          <button class="btn btn-orange btn-sm" data-act="status" data-id="${o.id}" data-v="delivered">Complete order</button>
          <button class="btn btn-ghost btn-sm" style="color:#B3261E;border-color:#B3261E" data-act="status" data-id="${o.id}" data-v="cancelled">Cancel</button></div>
        ` : ""}
      </div>`;
    };
    const awaitingPasses = D.passes.filter((p) => p.status === "awaiting");
    const passAlert = awaitingPasses.length ? `<div class="note orange"><div><b>${awaitingPasses.length} day pass payment${awaitingPasses.length > 1 ? "s" : ""} waiting:</b>${awaitingPasses.map((p) => { const rd = D.riders.find((x) => x.id === p.rider_id); return `<div class="d-row" style="margin-top:6px"><span>${esc(rd ? rd.name : "Rider")} · ${K(p.amount)} · ${PAY_NAME[p.method] || p.method} · ref <b>${esc(p.ref)}</b></span><button class="btn btn-green btn-sm" data-act="passok" data-id="${p.id}">Confirm paid</button></div>`; }).join("")}</div></div>` : "";
    const alerts = D.orders.filter((o) => o.incident_level === "danger" && ![ "delivered", "cancelled" ].includes(o.status));
    body = `${passAlert}${alerts.length ? `<div class="note orange" style="border:2px solid #B3261E"><div><b style="color:#B3261E">ALERT: ${alerts.length} rider${alerts.length > 1 ? "s" : ""} in danger.</b> Order ${alerts.map((o) => esc(o.code)).join(", ")}. Call them now.</div></div>` : ""}<div class="sec">Active (${active.length})</div><div class="d-grid">${active.map(card).join("") || '<div class="small">No active orders.</div>'}</div>
      <div class="sec" style="margin-top:10px">Recent</div><div class="d-grid">${done.map(card).join("") || '<div class="small">Nothing yet.</div>'}</div>`;
  } else if (D.tab === "customers") {
    const lab = (c) => c.status === "new" ? (c.completed >= 3 ? "Regular" : "New") : c.status[0].toUpperCase() + c.status.slice(1);
    const btn = (c, st, t) => c.status === st ? "" : `<button class="btn btn-ghost btn-sm" ${st === "blocked" ? 'style="color:#B3261E;border-color:#B3261E"' : ""} data-act="cset" data-id="${c.phone_key}" data-v="${st}">${t}</button>`;
    body = `<div class="small">New customers can pay cash only for small orders. After 3 completed orders they become Regular. <b>Trusted</b> = cash allowed, any amount. <b>Watch</b> = mobile money only. <b>Blocked</b> = cannot order.</div>
      <div class="d-grid" style="margin-top:12px">${D.customers.map((c) => `<div class="d-order"><div class="d-row" style="justify-content:space-between"><b>${esc(c.name || "No name")}</b><span class="badge ${c.status === "trusted" ? "" : c.status === "new" ? "o" : "g"}">${lab(c)}</span></div>
        <div class="t2"><a href="tel:0${esc(c.phone_key)}" style="color:var(--green);font-weight:700">0${esc(c.phone_key)}</a> · ${c.completed} done · ${c.cancelled} cancelled · ${c.incidents} incident${c.incidents === 1 ? "" : "s"}</div>
        <div class="d-row">${btn(c, "trusted", "Trusted")}${btn(c, "watch", "Watch")}${btn(c, "blocked", "Block")}${btn(c, "new", "Reset")}</div></div>`).join("") || '<div class="small">No customers yet.</div>'}</div>`;
  } else if (D.tab === "riders") {
    body = `<div class="d-order"><div class="sec">Add a rider</div><div class="d-row"><input class="input d-input" id="rN" placeholder="Name" style="flex:1;min-width:130px"><input class="input d-input" id="rP" placeholder="Phone" style="flex:1;min-width:130px"><input class="input d-input" id="rL" placeholder="Plate / bike" style="flex:1;min-width:110px"><input class="input d-input" id="rI" inputmode="numeric" maxlength="6" placeholder="Login PIN (4-6 digits)" style="flex:1;min-width:140px"></div>
      <label class="d-row small"><input type="checkbox" id="rT"> Trusted rider (can take errands and rides)</label><button class="btn btn-green btn-sm" data-act="addrider">Add rider</button></div>
      <div class="d-grid" style="margin-top:12px">${D.riders.map((r) => `<div class="d-order"><div class="d-row" style="justify-content:space-between"><b>${esc(r.name)} ${r.trusted ? "★" : ""}</b><span class="badge ${r.approved === false ? "o" : r.active ? "" : "g"}">${r.approved === false ? "Waiting for approval" : r.active ? (r.online ? "Online" : "Active") : "Off"}</span></div><div class="t2">${esc(r.phone || "")} · ${esc(r.plate || "")}</div>
        ${(() => { const tp = D.passes.find((p) => p.rider_id === r.id && p.pass_date === todayLusaka()); const lp = D.passes.find((p) => p.rider_id === r.id && p.status === "confirmed"); return `<div class="d-row"><span class="badge ${tp && tp.status === "confirmed" ? "" : "o"}">${tp ? (tp.status === "confirmed" ? "Pass paid today" : "Pass waiting: ref " + esc(tp.ref)) : "No pass today"}</span>${tp && tp.status === "awaiting" ? `<button class="btn btn-green btn-sm" data-act="passok" data-id="${tp.id}">Confirm paid</button>` : !tp ? `<button class="btn btn-ghost btn-sm" data-act="passgive" data-id="${r.id}">Record pass paid</button>` : ""}${!tp && lp ? `<span class="t2">Last: ${esc(lp.pass_date)}</span>` : ""}</div>`; })()}
        <div class="d-row">${r.approved === false ? `<button class="btn btn-green btn-sm" data-act="rapprove" data-id="${r.id}">Approve</button>` : ""}<input class="input d-input" id="rp-${r.id}" inputmode="numeric" maxlength="6" placeholder="New PIN" style="width:100px"><button class="btn btn-ghost btn-sm" data-act="rsetpin" data-id="${r.id}">Set PIN</button><button class="btn btn-ghost btn-sm" data-act="rtrust" data-id="${r.id}" data-v="${r.trusted ? 0 : 1}">${r.trusted ? "Remove trusted" : "Make trusted"}</button><button class="btn btn-ghost btn-sm" data-act="ractive" data-id="${r.id}" data-v="${r.active ? 0 : 1}">${r.active ? "Switch off" : "Switch on"}</button></div></div>`).join("")}</div>`;
  } else if (D.tab === "operators") {
    const ov = D.overview || [];
    const fld = (id, k, l, v, extra = "") => `<div style="flex:1;min-width:140px"><label class="lbl">${l}</label><input class="input d-input" id="op-${k}-${id}" value="${esc(v ?? "")}" ${extra}></div>`;
    body = `<div class="small">Each operator runs their own town under their own name. Pausing an operator, or letting the licence date pass, stops new orders on their app.</div>
      <div class="d-order" style="margin-top:12px"><div class="sec">Add an operator</div>
        <div class="d-row"><input class="input d-input" id="no-name" placeholder="Business name e.g. Kabwe Deli" style="flex:2;min-width:160px"><input class="input d-input" id="no-slug" placeholder="Short code e.g. kabwe" style="flex:1;min-width:120px"></div>
        <div class="d-row"><input class="input d-input" id="no-phone" placeholder="Support phone" style="flex:1;min-width:130px"><input class="input d-input" id="no-host" placeholder="Web address e.g. kabwe.urunji.com" style="flex:2;min-width:180px"></div>
        <div class="d-row"><label class="small">Main colour <input type="color" id="no-p" value="#1B6B35"></label><label class="small">Accent colour <input type="color" id="no-a" value="#F28C28"></label>
          <select class="input d-input" id="no-plan" style="flex:1;min-width:110px"><option value="pilot">Pilot</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select>
          <div style="flex:1;min-width:150px"><label class="lbl">Licence paid until</label><input class="input d-input" type="date" id="no-lic"></div></div>
        <input class="input d-input" id="no-staff" type="email" placeholder="First staff email (optional)">
        <button class="btn btn-green btn-sm" data-act="opcreate">Create operator</button></div>
      <div class="d-grid" style="margin-top:12px">${ov.map((o) => { const lic = o.licence_paid_until; const exp = lic && lic < todayLusaka();
        return `<div class="d-order"><div class="d-row" style="justify-content:space-between"><b>${esc(o.name)} <span class="t2">(${esc(o.slug)})</span></b><span class="badge ${o.status === "active" && !exp ? "" : "o"}">${o.status !== "active" ? "Paused" : exp ? "Licence expired" : "Active"}</span></div>
          <div class="t2">${o.orders_30d} orders (${o.delivered_30d} delivered) in 30 days · ${o.riders} riders · ${o.shops} shops · plan: ${esc(o.plan)}</div>
          <div class="t2">Staff: ${esc((o.staff || []).join(", ") || "none yet")}</div>
          <div class="d-row">${fld(o.id, "name", "Business name", o.name)}${fld(o.id, "phone", "Support phone", o.support_phone)}</div>
          <div class="d-row">${fld(o.id, "host", "Web address", (o.hosts || [])[0] || "")}<div style="flex:1;min-width:140px"><label class="lbl">Licence paid until</label><input class="input d-input" type="date" id="op-lic-${o.id}" value="${esc(lic || "")}"></div></div>
          <div class="d-row"><label class="small">Main colour <input type="color" id="op-p-${o.id}" value="${esc(o.primary_color)}"></label><label class="small">Accent <input type="color" id="op-a-${o.id}" value="${esc(o.accent_color)}"></label>
            <div class="stile" style="width:48px;height:48px;background:#fff;border:1px solid var(--border)">${safeImg(o.logo_url) ? `<img src="${esc(safeImg(o.logo_url))}" alt="" style="object-fit:contain">` : `<span class="ini" style="font-size:18px">${esc(initials(o.name))}</span>`}</div>
            <label class="btn btn-ghost btn-sm" style="cursor:pointer">${safeImg(o.logo_url) ? "Change logo" : "Add logo"}<input type="file" accept="image/*" data-file="oplogo" data-id="${o.id}" hidden></label></div>
          <div class="d-row"><button class="btn btn-green btn-sm" data-act="opsave" data-id="${o.id}">Save details</button><button class="btn btn-ghost btn-sm" data-act="opstatus" data-id="${o.id}" data-v="${o.status === "active" ? "paused" : "active"}">${o.status === "active" ? "Pause operator" : "Resume operator"}</button><a class="btn btn-ghost btn-sm" href="?op=${esc(o.slug)}" target="_blank" rel="noopener">Open their app</a></div>
          <div class="d-row"><input class="input d-input" id="op-staff-${o.id}" type="email" placeholder="Add staff email" style="flex:1;min-width:160px"><button class="btn btn-ghost btn-sm" data-act="opstaff" data-id="${o.id}">Add staff</button></div></div>`; }).join("") || '<div class="small">Loading…</div>'}</div>`;
  } else if (D.tab === "merchants") {
    const owedBy = {};
    D.owed.forEach((x) => { const e = owedBy[x.merchant_id] || (owedBy[x.merchant_id] = { n: 0, amt: 0, ids: [] }); e.n++; e.amt += Number(x.items_total) - Number(x.commission); e.ids.push(x.id); });
    body = `<div class="small">Customers pay ${esc(OP.name)}. After an order is delivered, you pay the shop its share (items minus commission) and tap <b>Mark paid out</b>.</div>
      <div class="d-order" style="margin-top:12px"><div class="sec">Add a shop</div><div class="d-row"><input class="input d-input" id="nmN" placeholder="Shop name" style="flex:1;min-width:140px"><input class="input d-input" id="nmP" placeholder="Phone" style="flex:1;min-width:120px"></div>
        <div class="d-row"><select class="input d-input" id="nmC" style="flex:1"><option value="grocery">Groceries</option><option value="bakery">Cakes &amp; bakery</option><option value="food">Food &amp; takeaways</option><option value="other">Other</option></select><input class="input d-input" id="nmA" placeholder="Address / landmark" style="flex:2;min-width:140px"></div>
        <div class="d-row"><input class="input d-input" id="nmI" inputmode="numeric" maxlength="6" placeholder="Login PIN (4-6 digits)" style="flex:1;min-width:140px"><input class="input d-input" id="nmM" inputmode="decimal" value="10" placeholder="Commission %" style="flex:1;min-width:110px"></div>
        <label class="d-row small"><input type="checkbox" id="nmF"> Featured (shown first)</label><button class="btn btn-green btn-sm" data-act="addshop">Add shop</button></div>
      <div class="d-grid" style="margin-top:12px">${D.merchants.map((m) => { const ow = owedBy[m.id]; return `<div class="d-order"><div class="d-row" style="justify-content:space-between"><b>${esc(m.name)} ${m.featured ? "★" : ""}</b><span class="badge ${m.approved === false ? "o" : m.active ? "" : "g"}">${m.approved === false ? "Waiting for approval" : m.active ? (m.is_open ? "Open" : "Closed") : "Off"}</span></div>
        <div class="t2">${esc((CAT[m.category] || CAT.other).name)} · <a href="tel:${esc(m.phone || "")}" style="color:var(--green);font-weight:700">${esc(m.phone || "")}</a> · ${esc(m.address || "")}</div>
        <div class="d-row"><div class="stile" style="width:64px;height:64px;background:${(CAT[m.category] || CAT.other).bg};color:${(CAT[m.category] || CAT.other).fg}">${safeImg(m.image_url) ? `<img src="${esc(safeImg(m.image_url))}" alt="">` : ic((CAT[m.category] || CAT.other).icon, (CAT[m.category] || CAT.other).fg, 28)}</div>
          <label class="btn btn-ghost btn-sm" style="cursor:pointer">${safeImg(m.image_url) ? "Change photo" : "Add photo"}<input type="file" accept="image/*" data-file="mimg" data-id="${m.id}" hidden></label>${safeImg(m.image_url) ? `<button class="btn btn-ghost btn-sm" style="color:#B3261E;border-color:#B3261E" data-act="mimgdel" data-id="${m.id}">Remove photo</button>` : ""}</div>
        <div class="d-row"><span class="badge ${ow ? "o" : ""}">${ow ? "Owed to shop: " + K(ow.amt) + " (" + ow.n + " order" + (ow.n > 1 ? "s" : "") + ")" : "Nothing owed"}</span>${ow ? `<button class="btn btn-orange btn-sm" data-act="mpaid" data-id="${m.id}">Mark paid out</button>` : ""}</div>
        <div class="d-row">${m.approved === false ? `<button class="btn btn-green btn-sm" data-act="mapprove" data-id="${m.id}">Approve</button>` : ""}<button class="btn btn-ghost btn-sm" data-act="mfeat" data-id="${m.id}" data-v="${m.featured ? 0 : 1}">${m.featured ? "Unfeature" : "Feature"}</button><button class="btn btn-ghost btn-sm" data-act="mactive" data-id="${m.id}" data-v="${m.active ? 0 : 1}">${m.active ? "Switch off" : "Switch on"}</button></div>
        <div class="d-row"><input class="input d-input" id="mc-${m.id}" inputmode="decimal" value="${esc(m.commission_pct)}" style="width:80px"><button class="btn btn-ghost btn-sm" data-act="mcomm" data-id="${m.id}">Save commission %</button></div>
        <div class="d-row"><input class="input d-input" id="mp-${m.id}" inputmode="numeric" maxlength="6" placeholder="New PIN" style="width:110px"><button class="btn btn-ghost btn-sm" data-act="mpin" data-id="${m.id}">Set PIN</button></div></div>`; }).join("") || '<div class="small">No shops yet.</div>'}</div>`;
  } else {
    const s = D.settings;
    const f = (k, l) => `<div><label class="lbl">${l}</label><input class="input d-input" id="st-${k}" value="${esc(s[k] ?? "")}"></div>`;
    body = `<div class="d-order"><div class="sec">Prices (Kwacha)</div>${f("fee_delivery", "Delivery fee")}${f("fee_errand", "Errand fee")}${f("fee_ride", "Ride fare")}${f("fee_service", "Service fee")}${f("cash_limit_new", "Cash limit for new customers (K)")}${f("day_pass", "Rider day pass (K)")}
      <div class="sec" style="margin-top:8px">Where customers send money</div>${f("pay_to_mtn", "MTN MoMo number")}${f("pay_to_airtel", "Airtel Money number")}${f("pay_to_zamtel", "Zamtel Kwacha number")}
      <button class="btn btn-green" data-act="savesettings">Save settings</button></div>`;
  }
  return `<div class="screen wide"><div class="pad"><div class="d-top"><div><div class="h1">Dispatch</div>${D.ops.length > 1 ? `<select class="input d-input" data-dop="1" style="margin-top:6px">${D.ops.map((x) => `<option value="${x.id}" ${x.id === D.op ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select>` : D.ops.length === 1 ? `<div class="small">${esc(D.ops[0].name)}</div>` : ""}</div><div class="d-row"><button class="btn btn-ghost btn-sm" data-act="refresh">Refresh</button><button class="btn btn-ghost btn-sm" data-act="logout">Sign out</button></div></div>
    <div class="d-tabs">${tabsHtml}</div>${D.loading ? '<div class="small">Loading…</div>' : ""}${body}</div></div>`;
}

async function loadDispatch(keepFocus) {
  if (!sb || !dispatch.session) return;
  if (keepFocus && $app.contains(document.activeElement) && /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
  const os = await sb.from("deli_operators").select("id,slug,name").order("name");
  if (!os.error && os.data && os.data.length) {
    dispatch.ops = os.data;
    if (!os.data.some((x) => x.id === dispatch.op)) { dispatch.op = (os.data.find((x) => x.id === OP.id) || os.data[0]).id; store.set("dop", dispatch.op); }
  }
  if (dispatch.isSuper === undefined) { try { dispatch.isSuper = !!(await rpc("deli_am_super")); } catch { dispatch.isSuper = false; } }
  if (dispatch.isSuper && dispatch.tab === "operators") { try { dispatch.overview = (await rpc("deli_owner_overview")) || []; } catch (e) { toast(e.message); } }
  if (!dispatch.op) { toast("No operator found for this staff account."); return; }
  const eo = dispatch.op;
  const [o, r, s, cs, ps, ms, ow] = await Promise.all([
    sb.from("deli_orders").select("*").eq("operator_id", eo).order("created_at", { ascending: false }).limit(80),
    sb.from("deli_riders").select("*").eq("operator_id", eo).order("name"),
    sb.from("deli_settings").select("*").eq("operator_id", eo),
    sb.from("deli_customers").select("*").eq("operator_id", eo).order("updated_at", { ascending: false }).limit(150),
    sb.from("deli_rider_passes").select("*").eq("operator_id", eo).order("created_at", { ascending: false }).limit(200),
    sb.from("deli_merchants").select("*").eq("operator_id", eo).order("created_at", { ascending: false }),
    sb.from("deli_orders").select("id,merchant_id,items_total,commission").eq("operator_id", eo).eq("status", "delivered").eq("pay_status", "confirmed").eq("merchant_paid", false).not("merchant_id", "is", null),
  ]);
  if (o.error) { toast(o.error.message.includes("permission") || o.error.code === "42501" ? "This email is not on the staff list." : o.error.message); return; }
  dispatch.orders = o.data || []; dispatch.riders = r.data || []; dispatch.customers = cs.data || []; dispatch.passes = ps.data || []; dispatch.merchants = ms.data || []; dispatch.owed = ow.data || [];
  dispatch.settings = Object.fromEntries((s.data || []).map((x) => [x.key, x.value]));
  render(true);
}

/* ---------- rider page ---------- */
function vRider() {
  if (!R.token) {
    const reg = R.mode === "register";
    return `<div class="screen"><div class="pad">${topbar(reg ? "Rider sign-up" : "Rider sign-in", "#/account")}
      <div class="note green">${ic("bike", "#1B6B35")}<div>${reg ? "Join our riders. We will call you to approve your account." : "Sign in with your phone number and PIN."}</div></div>
      ${reg ? '<input class="input" id="gName" placeholder="Your full name" autocomplete="name">' : ""}
      <input class="input" id="gPhone" inputmode="tel" placeholder="Phone number" autocomplete="tel">
      ${reg ? '<input class="input" id="gPlate" placeholder="Bike plate number (optional)">' : ""}
      <input class="input" id="gPin" type="password" inputmode="numeric" maxlength="6" placeholder="${reg ? "Choose a PIN (4 to 6 digits)" : "Your PIN"}">
      <button class="btn btn-green" data-act="${reg ? "rdregister" : "rdlogin"}">${reg ? "Sign up" : "Sign in"}</button>
      <button class="btn btn-ghost" data-act="rdmode" data-v="${reg ? "login" : "register"}">${reg ? "I already have an account" : "New rider? Sign up"}</button>
    </div></div>`;
  }
  const d = R.data;
  if (!d) return `<div class="screen"><div class="center-msg"><div class="spin"></div><div>Loading…</div></div></div>`;
  const me = d.me;
  const ps = d.pass || { status: "paid" };
  const pnum = ps.pay && ps.method ? ps.pay[ps.method] : "";
  const passBox = ps.status === "paid" ? `<div class="note green">${ic("check", "#1B6B35")}<div><b>Day pass paid.</b> You can work today.</div></div>`
    : ps.status === "awaiting" ? `<div class="note orange"><div><b>Waiting for staff to confirm your ${K(ps.price)} day pass.</b><br>${ps.method === "cash" ? "Give " + K(ps.amount || ps.price) + " in cash to staff." : "Send " + K(ps.amount || ps.price) + " by " + PAY_NAME[ps.method] + " to <b>" + esc(pnum || "the number staff will give you") + "</b>."} Reference: <b>${esc(ps.ref)}</b>.<br>This page updates by itself once staff confirm.</div></div>`
    : `<div class="note orange"><div><b>Pay your ${K(ps.price)} day pass to start work.</b> Choose how you will pay:</div></div>
      <div class="chips">${["mtn", "airtel", "zamtel", "cash"].map((m) => `<button class="chip" data-act="rdpass" data-v="${m}">${m === "cash" ? "Cash to staff" : PAY_NAME[m]}</button>`).join("")}</div>`;
  const job = (o) => {
    const next = o.status === "accepted" ? ["picked_up", "Picked up"] : o.status === "picked_up" ? ["on_the_way", "On the way"] : null;
    return `<div class="d-order"><div class="d-row" style="justify-content:space-between"><b>${SVC[o.service]} · ${esc(o.code)}</b><span class="badge o">${STATUS_TXT[o.status]}</span></div>
      ${o.incident ? `<div class="note orange"><div><b>${o.incident === "danger" ? "You reported danger. Staff have been told." : "Problem reported. Staff have been told."}</b></div></div>` : ""}
      ${o.cust === "watch" ? `<div class="note orange"><div><b>Watch customer.</b> Be careful. Deliver in a public place.</div></div>` : o.cust === "new" ? `<div class="note blue"><div><b>New customer</b> (${o.cust_done || 0} orders so far). Do not go into their house.</div></div>` : ""}
      ${o.hold ? `<div class="note orange"><div><b>Do not leave yet.</b> This customer has not paid. Staff must confirm payment first.</div></div>` : ""}
      ${o.shop ? `<div class="note blue"><div><b>Collect from ${esc(o.shop.name)}</b>${o.shop.address ? "<br>" + esc(o.shop.address) : ""}${o.shop.phone ? ` · <a href="tel:${esc(o.shop.phone)}" style="font-weight:800">Call shop</a>` : ""}<br>${esc(itemsText(o.items))}<br><b>${o.mstatus === "ready" ? "Order is READY. You can collect it." : "Shop is still preparing. Please wait."}</b></div></div>` : ""}
      <div class="t2"><b>From:</b> ${esc(o.pickup)}</div><div class="t2"><b>To:</b> ${esc(o.dropoff)}</div>
      ${o.details ? `<div class="t2"><b>Note:</b> ${esc(o.details)}${o.budget ? " · Items budget " + K(o.budget) : ""}</div>` : ""}
      ${o.item_type ? `<div class="t2">${esc(o.item_type)}${o.item_size ? " · " + esc(o.item_size) : ""}</div>` : ""}
      <div class="d-row"><span class="badge ${o.pay_status === "confirmed" ? "" : "o"}">${o.pay_method === "cash" ? "Collect cash: " + K(o.total) : PAY_NAME[o.pay_method] + (o.pay_status === "confirmed" ? " paid" : " awaiting")}</span></div>
      <div class="d-row"><a class="btn btn-ghost btn-sm" href="tel:${esc(o.customer_phone)}">Call ${esc(o.customer_name || "customer")}</a><a class="btn btn-ghost btn-sm" href="https://wa.me/${intl(o.customer_phone)}" target="_blank" rel="noopener">WhatsApp</a></div>
      ${next && !o.hold && !(o.shop && o.mstatus !== "ready") ? `<button class="btn btn-green" data-act="rdstage" data-id="${o.id}" data-v="${next[0]}">${next[1]}</button>` : ""}
      ${o.status === "on_the_way" || o.status === "picked_up" ? `<div class="d-row"><input class="input d-input" id="rc-${o.id}" inputmode="numeric" maxlength="4" placeholder="Customer's 4-digit code" style="flex:1"><button class="btn btn-orange btn-sm" data-act="rdcomplete" data-id="${o.id}">Complete</button></div>` : ""}
      <div class="d-row"><input class="input d-input" id="rn-${o.id}" placeholder="What is the problem? (optional)" style="flex:1"></div>
      <div class="d-row"><button class="btn btn-ghost btn-sm" data-act="rdreport" data-id="${o.id}" data-v="problem">Problem with customer</button><button class="btn btn-sm" style="background:#B3261E;color:#fff" data-act="rdreport" data-id="${o.id}" data-v="danger">I am in danger</button></div>
    </div>`;
  };
  const avail = (o) => `<div class="d-order"><div class="d-row" style="justify-content:space-between"><b>${o.shop_name ? esc(o.shop_name) + " · " : ""}${SVC[o.service]} · ${K(o.total)}</b><span class="badge">${o.pay_method === "cash" ? "Cash" : PAY_NAME[o.pay_method]}</span></div>
      <div class="t2"><b>From:</b> ${esc(o.pickup)}</div><div class="t2"><b>To:</b> ${esc(o.dropoff)}</div>${o.details ? `<div class="t2">${esc(o.details)}</div>` : ""}
      <button class="btn btn-green" data-act="rdaccept" data-id="${o.id}">Accept job</button></div>`;
  return `<div class="screen"><div class="hhead"><div class="brand"><div class="tile">${brandImg()}</div><b>Rider</b></div>
      <div><div style="font-size:24px;font-weight:800">Hi, ${esc(me.name.split(" ")[0])}</div><div style="opacity:.9;font-size:14px">Delivered today: ${d.done_today}${me.trusted ? " · Trusted rider" : ""}</div></div></div>
    <div class="pad" style="padding-top:18px">
      ${passBox}
      ${ps.status === "paid" ? `<button class="btn ${me.online ? "btn-orange" : "btn-green"}" data-act="rdonline" data-v="${me.online ? 0 : 1}">${me.online ? "You are ONLINE. Tap to go offline" : "Go online to get jobs"}</button>` : ""}
      <div class="sec">My jobs (${d.mine.length})</div>
      ${d.mine.map(job).join("") || '<div class="small">No active jobs.</div>'}
      <div class="sec">New jobs (${d.available.length})</div>
      ${me.online ? (d.available.map(avail).join("") || '<div class="small">No new jobs right now. This page updates by itself.</div>') : '<div class="small">Go online to see new jobs.</div>'}
      <button class="btn btn-ghost" data-act="rdlogout">Sign out</button>
    </div></div>`;
}
async function loadRider(keepFocus) {
  if (!R.token) return;
  if (keepFocus && $app.contains(document.activeElement) && /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
  try {
    const d = await rpc("deli_rider_jobs", { p_token: R.token });
    if (d && d.error) { R.token = null; R.data = null; store.set("rtoken", null); toast("Please sign in again"); } else R.data = d;
  } catch (e) { toast(e.message); }
  if (location.hash.startsWith("#/rider")) render(true);
}

/* ---------- merchant page ---------- */
function vMerchant() {
  if (!M.token) {
    const reg = M.mode === "register";
    return `<div class="screen"><div class="pad">${topbar(reg ? "Register your shop" : "Shop sign-in", "#/shops")}
      <div class="note green">${ic("shop", "#1B6B35")}<div>${reg ? "Sell on " + OP.name + ". We will call you to approve your shop." : "Sign in with your shop phone number and PIN."}</div></div>
      ${reg ? '<input class="input" id="mName" placeholder="Shop name" autocomplete="organization">' : ""}
      <input class="input" id="mPhone" inputmode="tel" placeholder="Shop phone number" autocomplete="tel">
      ${reg ? `<select class="input" id="mCat"><option value="grocery">Groceries</option><option value="bakery">Cakes &amp; bakery</option><option value="food">Food &amp; takeaways (shawarma, chicken...)</option><option value="other">Other</option></select><input class="input" id="mAddr" placeholder="Shop address or landmark">` : ""}
      <input class="input" id="mPin" type="password" inputmode="numeric" maxlength="6" placeholder="${reg ? "Choose a PIN (4 to 6 digits)" : "Your PIN"}">
      <button class="btn btn-green" data-act="${reg ? "mregister" : "mlogin"}">${reg ? "Sign up" : "Sign in"}</button>
      <button class="btn btn-ghost" data-act="mmode" data-v="${reg ? "login" : "register"}">${reg ? "I already have a shop account" : "New shop? Sign up"}</button>
    </div></div>`;
  }
  const d = M.data;
  if (!d) return `<div class="screen"><div class="center-msg"><div class="spin"></div><div>Loading…</div></div></div>`;
  const me = d.me;
  const mt = ["orders", "menu", "shop"].map((t) => `<button class="chip ${M.tab === t ? "on" : ""}" data-act="mtab" data-v="${t}">${{ orders: "Orders", menu: "My menu", shop: "My shop" }[t]}</button>`).join("");
  let body = "";
  if (M.tab === "orders") {
    const live = d.orders.filter((o) => ["pending", "accepted", "ready"].includes(o.merchant_status) && o.status !== "cancelled" && !["picked_up", "on_the_way", "delivered"].includes(o.status));
    const past = d.orders.filter((o) => !live.includes(o)).slice(0, 15);
    const card = (o) => {
      const get = Number(o.items_total) - Number(o.commission);
      const isLive = live.includes(o);
      return `<div class="d-order"><div class="d-row" style="justify-content:space-between"><b>Order ${esc(o.code)}</b><span class="badge ${o.merchant_status === "declined" || o.status === "cancelled" ? "g" : o.merchant_status === "pending" ? "o" : ""}">${o.status === "cancelled" ? "Cancelled" : o.status === "delivered" ? "Delivered" : o.status === "picked_up" || o.status === "on_the_way" ? "Collected" : MST[o.merchant_status] || ""}</span></div>
        ${(o.items || []).map((i) => `<div class="rowline"><span>${i.qty} × ${esc(i.name)}</span><b>${K(i.qty * i.price)}</b></div>`).join("")}
        ${o.details ? `<div class="t2">Note: ${esc(o.details)}</div>` : ""}
        <div class="hr"></div><div class="rowline"><span>Items total</span><b>${K(o.items_total)}</b></div><div class="rowline"><span>Our commission</span><b>− ${K(o.commission)}</b></div><div class="total" style="font-size:16px"><span>You receive</span><span style="color:var(--green)">${K(get)}</span></div>
        <div class="d-row"><span class="badge ${o.pay_status === "confirmed" ? "" : "o"}">${o.pay_status === "confirmed" ? "Customer has paid" : "Payment not confirmed yet"}</span>${o.rider ? `<span class="t2">Rider: ${esc(o.rider.name)}${o.rider.plate ? " · " + esc(o.rider.plate) : ""}</span>` : ""}</div>
        ${isLive && o.merchant_status === "pending" ? `<div class="d-row"><button class="btn btn-green btn-sm" data-act="mact" data-id="${o.id}" data-v="accept">Accept order</button><button class="btn btn-ghost btn-sm" style="color:#B3261E;border-color:#B3261E" data-act="mact" data-id="${o.id}" data-v="decline">Decline</button></div>${o.needs_payment ? '<div class="small">You can accept once we confirm the customer has paid.</div>' : ""}` : ""}
        ${isLive && o.merchant_status === "accepted" ? `<div class="d-row"><button class="btn btn-orange btn-sm" data-act="mact" data-id="${o.id}" data-v="ready">Order is ready</button><button class="btn btn-ghost btn-sm" style="color:#B3261E;border-color:#B3261E" data-act="mact" data-id="${o.id}" data-v="decline">Cancel order</button></div>` : ""}
        ${isLive && o.merchant_status === "ready" ? `<div class="small"><b>Ready.</b> A rider will come to collect it.</div>` : ""}
      </div>`;
    };
    body = `<div class="sec">New and active (${live.length})</div>${live.map(card).join("") || '<div class="small">No orders right now. This page updates by itself.</div>'}
      <div class="sec" style="margin-top:6px">Earlier</div>${past.map(card).join("") || '<div class="small">Nothing yet.</div>'}`;
  } else if (M.tab === "menu") {
    body = `<div class="d-order"><div class="sec">Add an item</div>
        <input class="input d-input" id="niN" placeholder="Item name e.g. Chocolate cake">
        <input class="input d-input" id="niP" inputmode="decimal" placeholder="Price in Kwacha e.g. 150">
        <input class="input d-input" id="niD" placeholder="Short description (optional)">
        <button class="btn btn-green btn-sm" data-act="mitemadd">Add to menu</button></div>
      ${d.items.map((i) => `<div class="d-order"><div class="d-row"><input class="input d-input" id="in-${i.id}" value="${esc(i.name)}" style="flex:2;min-width:140px"><input class="input d-input" id="ip-${i.id}" inputmode="decimal" value="${esc(i.price)}" style="flex:1;min-width:80px"></div>
        <input class="input d-input" id="id-${i.id}" value="${esc(i.description || "")}" placeholder="Description (optional)">
        <div class="d-row"><button class="btn btn-green btn-sm" data-act="mitemsave" data-id="${i.id}">Save</button><button class="btn btn-ghost btn-sm" data-act="mitemtoggle" data-id="${i.id}">${i.available ? "Mark sold out" : "Back in stock"}</button><button class="btn btn-ghost btn-sm" style="color:#B3261E;border-color:#B3261E" data-act="mitemdel" data-id="${i.id}">Delete</button><span class="badge ${i.available ? "" : "g"}">${i.available ? "On sale" : "Sold out"}</span></div></div>`).join("") || '<div class="small">Your menu is empty. Add your first item above.</div>'}`;
  } else {
    body = `<div class="d-order"><div class="sec">About your shop</div><label class="lbl">Address or landmark</label><input class="input d-input" id="msAddr" value="${esc(me.address || "")}"><label class="lbl">Short description</label><textarea class="input" id="msDesc" rows="3" placeholder="e.g. Fresh bread, cakes and cupcakes made daily">${esc(me.description || "")}</textarea>
      <button class="btn btn-green btn-sm" data-act="mshopsave">Save</button></div>
      <div class="small">Our commission on items is ${esc(me.commission_pct)}%. We pay you the rest after each delivered order. Call us on ${esc(OP.phone)} to change your shop name, phone or photo.</div>
      <button class="btn btn-ghost" data-act="mlogout">Sign out</button>`;
  }
  return `<div class="screen"><div class="hhead"><div class="brand"><div class="tile">${brandImg()}</div><b>Shop</b></div>
      <div><div style="font-size:24px;font-weight:800">${esc(me.name)}</div><div style="opacity:.9;font-size:14px">${me.is_open ? "Open for orders" : "Closed. Customers cannot order."}</div></div></div>
    <div class="pad" style="padding-top:18px">
      <button class="btn ${me.is_open ? "btn-orange" : "btn-green"}" data-act="mopen" data-v="${me.is_open ? 0 : 1}">${me.is_open ? "You are OPEN. Tap to close shop" : "Shop is CLOSED. Tap to open"}</button>
      <div class="chips">${mt}</div>${body}
    </div></div>`;
}
async function loadMerchant(keepFocus) {
  if (!M.token) return;
  if (keepFocus && $app.contains(document.activeElement) && /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
  try {
    const d = await rpc("deli_merchant_data", { p_token: M.token });
    if (d && d.error) { M.token = null; M.data = null; store.set("mtoken", null); toast("Please sign in again"); } else M.data = d;
  } catch (e) { toast(e.message); }
  if (location.hash.startsWith("#/merchant")) render(true);
}
async function loadShops() {
  try { shopsData = (await rpc("deli_shops", { p_op: OP.id })) || []; } catch { shopsData = []; }
  if (/^#\/(home|shops)$/.test(location.hash)) render(true);
}
async function loadMenu(id) {
  try { menuCache[id] = (await rpc("deli_shop_menu", { p_id: id })) || null; } catch { menuCache[id] = null; }
  if (location.hash === "#/shop/" + id) render(true);
}

function vPaused() {
  const wa = `https://wa.me/${intl(OP.phone)}`;
  return `<div class="screen"><div class="pad"><div class="center-msg" style="margin-top:40px"><div class="logo-tile" style="width:120px;height:120px;border-radius:28px;border:1px solid var(--border)">${brandImg()}</div>
    <div class="t1" style="font-size:22px">${esc(OP.name)} is paused right now</div><div class="small">We are not taking orders at the moment. Please contact us.</div></div>
    <a class="btn btn-green" href="${wa}" target="_blank" rel="noopener">WhatsApp us</a><a class="btn btn-ghost" href="tel:${esc(OP.phone)}">Call ${esc(OP.phone)}</a>
    <a class="small" style="text-align:center" href="#/dispatch">Staff sign-in</a></div></div>`;
}
function vUnknown() { return `<div class="screen"><div class="pad"><div class="center-msg" style="margin-top:80px"><div class="t1" style="font-size:22px">This address is not set up yet</div><div class="small">Please check the web address, or contact Urunji Innovations on ${esc(CFG.SUPPORT_PHONE || "")}.</div></div></div></div>`; }

/* ---------- router ---------- */
function stopTimer() { clearInterval(timer); timer = null; }

async function render(soft) {
  const hash = location.hash.replace(/^#\/?/, "");
  const [route, arg] = hash.split("/");
  if (!soft) { stopTimer(); lastSig = ""; window.scrollTo(0, 0); }
  if (OP.unknown) { $app.innerHTML = vUnknown(); return; }
  if (OP.paused && route !== "dispatch") { $app.innerHTML = vPaused(); return; }
  let html;
  switch (route) {
    case "": case "welcome": html = vWelcome(); if (!soft && store.get("seen", false)) timer = setTimeout(() => { if (/^#?\/?(welcome)?$/.test(location.hash)) location.hash = "#/home"; }, 2000); break;
    case "home": html = vHome(); if (!soft && shopsData === null) loadShops(); break;
    case "shops": html = vShops(); if (!soft) loadShops(); break;
    case "shop": html = vShop(arg); if (!soft) loadMenu(arg); break;
    case "basket": html = vBasket(); if (!soft) checkCust(); break;
    case "merchant":
      html = vMerchant();
      if (!soft && M.token) { loadMerchant(); timer = setInterval(() => loadMerchant(true), 8000); }
      break;
    case "delivery": case "errand": case "ride":
      if (draft.service !== route) { draft = Object.assign(blankDraft(), { service: route, pay_method: draft.pay_method || "mtn" }); saveDraft(); }
      html = vBook(route); break;
    case "pay": html = vPay(); if (!soft) checkCust(); break;
    case "track": case "delivered": return renderOrder(route, arg, soft);
    case "orders": return renderOrders(soft);
    case "help": html = vHelp(); break;
    case "account": html = vAccount(); break;
    case "rider":
      html = vRider();
      if (!soft && R.token) { loadRider(); timer = setInterval(() => loadRider(true), 8000); }
      break;
    case "dispatch":
      html = vDispatch();
      if (!soft) {
        if (sb && !dispatch.session) { const { data } = await sb.auth.getSession(); dispatch.session = data.session; if (dispatch.session) { render(true); } }
        if (dispatch.session) { loadDispatch(); timer = setInterval(() => loadDispatch(true), 10000); }
      }
      break;
    default: location.replace("#/home"); return;
  }
  if (html) $app.innerHTML = html;
}

async function renderOrder(route, code, soft) {
  if (!soft) $app.innerHTML = vTrack(undefined);
  const load = async () => {
    try {
      const o = await rpc("deli_track", { p_code: code || "" });
      const sig = JSON.stringify(o) + route;
      if (sig === lastSig) return;
      lastSig = sig;
      if (o && o.status === "delivered" && route === "track" && !soft && !lastSig.includes("seen")) { /* stay on track so they can see payment info */ }
      $app.innerHTML = route === "delivered" ? vDelivered(o) : vTrack(o);
    } catch (e) { if (!soft) $app.innerHTML = vTrack(null); toast(e.message); }
  };
  await load();
  if (route === "track") timer = setInterval(load, 8000);
}

async function renderOrders(soft) {
  const mine = myOrders();
  const cache = {};
  $app.innerHTML = vOrders(cache);
  await Promise.all(mine.slice(0, 15).map(async (o) => { try { const d = await rpc("deli_track", { p_code: o.code }); if (d) cache[o.code] = d; } catch {} }));
  if (location.hash.startsWith("#/orders")) $app.innerHTML = vOrders(cache);
}

/* ---------- events ---------- */
$app.addEventListener("input", (e) => {
  const t = e.target;
  if (t.dataset.bind) { draft[t.dataset.bind] = t.value; saveDraft(); }
  if (t.dataset.bindCart) { cart[t.dataset.bindCart] = t.value; saveCart(); }
  if (t.dataset.bindAcc) { account[t.dataset.bindAcc] = t.value; store.set("account", account); }
});

const shrink = (file, max = 700, type = "image/jpeg") => new Promise((ok, no) => {
  const url = URL.createObjectURL(file), im = new Image();
  im.onload = () => {
    const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement("canvas");
    c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
    c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
    c.toBlob((b) => (b ? ok(b) : no(new Error("Could not read this picture"))), type, 0.82);
  };
  im.onerror = () => { URL.revokeObjectURL(url); no(new Error("Could not read this picture. Try a JPG or PNG.")); };
  im.src = url;
});
$app.addEventListener("change", async (e) => {
  const t = e.target;
  if (t.dataset && t.dataset.bindAcc === "phone") checkCust();
  if (t.dataset && t.dataset.dop) { dispatch.op = t.value; store.set("dop", t.value); dispatch.orders = []; dispatch.riders = []; dispatch.customers = []; dispatch.passes = []; dispatch.merchants = []; dispatch.owed = []; dispatch.settings = {}; render(true); loadDispatch(); }
  if (t.dataset && t.dataset.file === "oplogo" && t.files && t.files[0]) {
    const id = t.dataset.id; toast("Uploading logo…");
    try {
      const blob = await shrink(t.files[0], 400, "image/png");
      const path = id + "/logo-" + Date.now() + ".png";
      const up = await sb.storage.from("deli-shops").upload(path, blob, { contentType: "image/png", upsert: true });
      if (up.error) throw up.error;
      await rpc("deli_owner_update_operator", { p_id: id, p_patch: { logo_url: sb.storage.from("deli-shops").getPublicUrl(path).data.publicUrl } });
      toast("Logo saved"); loadDispatch();
    } catch (err) { toast(err.message || "Upload failed"); }
  }
  if (t.dataset && t.dataset.file === "mimg" && t.files && t.files[0]) {
    const id = t.dataset.id; toast("Uploading photo…");
    try {
      const blob = await shrink(t.files[0]);
      const path = dispatch.op + "/" + id + "-" + Date.now() + ".jpg";
      const up = await sb.storage.from("deli-shops").upload(path, blob, { contentType: "image/jpeg", upsert: true });
      if (up.error) throw up.error;
      const url = sb.storage.from("deli-shops").getPublicUrl(path).data.publicUrl;
      const { error } = await sb.from("deli_merchants").update({ image_url: url }).eq("id", id);
      if (error) throw error;
      toast("Photo saved"); loadDispatch(); shopsData = null;
    } catch (err) { toast(err.message || "Upload failed"); }
  }
});

$app.addEventListener("click", async (e) => {
  const el = e.target.closest("[data-act]");
  if (!el) return;
  const a = el.dataset.act, v = el.dataset.v, id = el.dataset.id;
  if (a === "start") { store.set("seen", true); location.hash = "#/home"; }
  else if (a === "item") { draft.item_type = v; saveDraft(); render(true); }
  else if (a === "size") { draft.item_size = v; saveDraft(); render(true); }
  else if (a === "pm") { draft.pay_method = v; saveDraft(); render(true); }
  else if (a === "topay") {
    const svc = el.dataset.svc;
    if (draft.pickup.trim().length < 2 || draft.dropoff.trim().length < 2) return toast("Please fill in both places");
    if (svc === "errand" && draft.details.trim().length < 3) return toast("Please say what we should get");
    draft.service = svc; saveDraft(); location.hash = "#/pay";
  }
  else if (a === "place") {
    const svc = draft.service || "delivery";
    if (cust.blocked) return toast("Sorry, we cannot take this order right now. Please call us.");
    if (account.name.trim().length < 2) return toast("Please enter your name");
    if (String(account.phone).replace(/\D/g, "").length < 9) return toast("Please enter a valid phone number");
    el.disabled = true; el.textContent = "Placing order…";
    try {
      const r = await rpc("deli_create_order", {
        p_service: svc, p_name: account.name, p_phone: account.phone, p_pickup: draft.pickup, p_dropoff: draft.dropoff,
        p_item_type: svc === "delivery" ? draft.item_type : null, p_item_size: svc === "delivery" ? draft.item_size : null,
        p_details: draft.details || null, p_budget: draft.budget ? Number(String(draft.budget).replace(/[^0-9.]/g, "")) || null : null,
        p_pay_method: draft.pay_method, p_op: OP.id,
      });
      addOrder(r.code, svc);
      const keep = draft.pay_method; draft = Object.assign(blankDraft(), { pay_method: keep }); saveDraft();
      location.hash = "#/track/" + r.code;
    } catch (err) { toast(err.message); el.disabled = false; el.textContent = "Place order · " + K(money(svc)); }
  }
  else if (a === "saveacc") { store.set("account", account); toast("Saved"); }
  else if (a === "findcode") { const c = document.getElementById("codeIn").value.trim().toUpperCase(); if (c) { addOrder(c, "delivery"); location.hash = "#/track/" + c; } }
  else if (a === "received") {
    if (!twice("r" + el.dataset.code, "Tap the button again to confirm")) return;
    try { await rpc("deli_confirm_received", { p_code: el.dataset.code }); toast("Thank you!"); location.hash = "#/delivered/" + el.dataset.code; } catch (err) { toast(err.message); }
  }
  else if (a === "rate") {
    try { await rpc("deli_rate", { p_stars: Number(v), p_code: el.dataset.code }); toast("Thanks for rating!"); lastSig = ""; render(true); } catch (err) { toast(err.message); }
  }
  /* shops */
  else if (a === "shopcat") { shopFilter = v; render(true); }
  else if (a === "cartadd" || a === "cartsub") {
    const mid = el.dataset.mid; const m = menuCache[mid]; if (!m) return;
    if (cart.mid !== mid) { cart = Object.assign(cart, { mid, name: m.shop.name, lines: {} }); }
    const it = m.items.find((x) => x.id === id); if (!it) return;
    const cur = cart.lines[id] ? cart.lines[id].qty : 0;
    const q = Math.max(0, Math.min(20, cur + (a === "cartadd" ? 1 : -1)));
    if (q === 0) delete cart.lines[id]; else cart.lines[id] = { name: it.name, price: Number(it.price), qty: q };
    if (!Object.keys(cart.lines).length) cart.mid = null;
    saveCart(); render(true);
  }
  else if (a === "shoppm") { cart.pay = v; saveCart(); render(true); }
  else if (a === "placeshop") {
    if (cust.blocked) return toast("Sorry, we cannot take this order right now. Please call us.");
    if (cart.dropoff.trim().length < 2) return toast("Please say where to deliver");
    if (account.name.trim().length < 2) return toast("Please enter your name");
    if (String(account.phone).replace(/\D/g, "").length < 9) return toast("Please enter a valid phone number");
    const total = cartTotal() + (fees.delivery || 0) + (fees.service || 0);
    el.disabled = true; el.textContent = "Placing order…";
    try {
      const r = await rpc("deli_create_merchant_order", { p_merchant: cart.mid, p_items: Object.entries(cart.lines).map(([i, l]) => ({ id: i, qty: l.qty })), p_name: account.name, p_phone: account.phone, p_dropoff: cart.dropoff, p_details: cart.details || null, p_pay_method: cart.pay });
      addOrder(r.code, "delivery");
      cart = { mid: null, name: "", lines: {}, dropoff: cart.dropoff, details: "", pay: cart.pay }; saveCart();
      location.hash = "#/track/" + r.code;
    } catch (err) { toast(err.message); el.disabled = false; el.textContent = "Place order · " + K(total); }
  }
  /* merchant */
  else if (a === "mmode") { M.mode = v; render(true); }
  else if (a === "mlogin") {
    try {
      const r = await rpc("deli_merchant_login", { p_phone: document.getElementById("mPhone").value, p_pin: document.getElementById("mPin").value, p_op: OP.id });
      if (r.error) return toast(r.error);
      M.token = r.token; store.set("mtoken", r.token); M.data = null; M.tab = "orders"; render();
    } catch (err) { toast(err.message); }
  }
  else if (a === "mregister") {
    try {
      await rpc("deli_merchant_register", { p_name: document.getElementById("mName").value, p_phone: document.getElementById("mPhone").value, p_category: document.getElementById("mCat").value, p_address: document.getElementById("mAddr").value, p_pin: document.getElementById("mPin").value, p_op: OP.id });
      M.mode = "login"; render(true); toast("Thanks! We will call you once your shop is approved.");
    } catch (err) { toast(err.message); }
  }
  else if (a === "mlogout") { M.token = null; M.data = null; store.set("mtoken", null); render(); }
  else if (a === "mtab") { M.tab = v; render(true); }
  else if (a === "mopen") { try { await rpc("deli_merchant_set_open", { p_token: M.token, p_open: v === "1" }); toast(v === "1" ? "Shop is open" : "Shop is closed"); loadMerchant(); } catch (err) { toast(err.message); } }
  else if (a === "mact") {
    if (v === "decline" && !twice("md" + id, "Tap again to decline this order")) return;
    try { const ok = await rpc("deli_merchant_order_action", { p_token: M.token, p_id: id, p_action: v }); toast(ok ? (v === "accept" ? "Order accepted" : v === "ready" ? "Marked ready" : "Order declined") : "Sorry, that did not work"); loadMerchant(); } catch (err) { toast(err.message); loadMerchant(); }
  }
  else if (a === "mitemadd") {
    const name = document.getElementById("niN").value.trim(), price = Number(document.getElementById("niP").value);
    if (name.length < 2) return toast("Enter the item name"); if (!(price >= 0) || document.getElementById("niP").value.trim() === "") return toast("Enter the price");
    try { await rpc("deli_merchant_item_save", { p_token: M.token, p_id: null, p_name: name, p_description: document.getElementById("niD").value.trim() || null, p_price: price, p_available: true }); toast("Added"); loadMerchant(); } catch (err) { toast(err.message); }
  }
  else if (a === "mitemsave" || a === "mitemtoggle") {
    const it = M.data.items.find((x) => x.id === id); if (!it) return;
    const name = document.getElementById("in-" + id).value.trim(), price = Number(document.getElementById("ip-" + id).value);
    if (name.length < 2 || !(price >= 0)) return toast("Check the name and price");
    try { await rpc("deli_merchant_item_save", { p_token: M.token, p_id: id, p_name: name, p_description: document.getElementById("id-" + id).value.trim() || null, p_price: price, p_available: a === "mitemtoggle" ? !it.available : it.available }); toast("Saved"); loadMerchant(); } catch (err) { toast(err.message); }
  }
  else if (a === "mitemdel") {
    if (!twice("mi" + id, "Tap Delete again to remove this item")) return;
    try { await rpc("deli_merchant_item_delete", { p_token: M.token, p_id: id }); toast("Deleted"); loadMerchant(); } catch (err) { toast(err.message); }
  }
  else if (a === "mshopsave") {
    try { await rpc("deli_merchant_profile", { p_token: M.token, p_description: document.getElementById("msDesc").value, p_address: document.getElementById("msAddr").value }); toast("Saved"); loadMerchant(); } catch (err) { toast(err.message); }
  }
  /* rider */
  else if (a === "rdmode") { R.mode = v; render(true); }
  else if (a === "rdlogin") {
    try {
      const r = await rpc("deli_rider_login", { p_phone: document.getElementById("gPhone").value, p_pin: document.getElementById("gPin").value, p_op: OP.id });
      if (r.error) return toast(r.error);
      R.token = r.token; store.set("rtoken", r.token); R.data = null; render();
    } catch (err) { toast(err.message); }
  }
  else if (a === "rdregister") {
    try {
      await rpc("deli_rider_register", { p_name: document.getElementById("gName").value, p_phone: document.getElementById("gPhone").value, p_plate: document.getElementById("gPlate").value, p_pin: document.getElementById("gPin").value, p_op: OP.id });
      R.mode = "login"; render(true); toast("Thanks! We will call you once you are approved.");
    } catch (err) { toast(err.message); }
  }
  else if (a === "rdpass") {
    try { const r = await rpc("deli_rider_pass_request", { p_token: R.token, p_method: v }); toast(r && r.status === "paid" ? "Your pass is already paid" : "Pass requested. Pay now, then wait for staff."); loadRider(); } catch (err) { toast(err.message); }
  }
  else if (a === "rdonline") { try { await rpc("deli_rider_online", { p_token: R.token, p_online: v === "1" }); loadRider(); } catch (err) { toast(err.message); } }
  else if (a === "rdaccept") {
    try { const ok = await rpc("deli_rider_accept", { p_token: R.token, p_id: id }); toast(ok ? "Job accepted" : "Sorry, this job was taken"); loadRider(); } catch (err) { toast(err.message); loadRider(); }
  }
  else if (a === "rdstage") { try { await rpc("deli_rider_stage", { p_token: R.token, p_id: id, p_stage: v }); loadRider(); } catch (err) { toast(err.message); } }
  else if (a === "rdcomplete") {
    try { const ok = await rpc("deli_rider_complete", { p_token: R.token, p_id: id, p_code: document.getElementById("rc-" + id).value }); toast(ok ? "Delivered. Well done!" : "That code does not match"); loadRider(); } catch (err) { toast(err.message); }
  }
  else if (a === "rdreport") {
    if (v === "danger" && !twice("g" + id, "Tap I am in danger again to alert staff")) return;
    const nEl = document.getElementById("rn-" + id);
    try { await rpc("deli_rider_report", { p_token: R.token, p_id: id, p_level: v, p_note: nEl ? nEl.value : "" }); toast(v === "danger" ? "Staff alerted. Stay safe. Call us if you can." : "Reported. Staff have been told."); loadRider(); } catch (err) { toast(err.message); }
  }
  else if (a === "rdlogout") { R.token = null; R.data = null; store.set("rtoken", null); render(); }
  /* staff */
  else if (a === "login") {
    const { data, error } = await sb.auth.signInWithPassword({ email: document.getElementById("sEmail").value.trim(), password: document.getElementById("sPass").value });
    if (error) return toast(error.message);
    dispatch.session = data.session; render();
  }
  else if (a === "logout") { await sb.auth.signOut(); dispatch.session = null; render(); }
  else if (a === "dtab") { dispatch.tab = v; render(true); if (v === "operators") loadDispatch(); }
  else if (a === "refresh") loadDispatch();
  else if (a === "assign") {
    const rid = document.getElementById("rs-" + id).value; if (!rid) return toast("Choose a rider first");
    const o = dispatch.orders.find((x) => x.id === id);
    const { error } = await sb.from("deli_orders").update({ rider_id: rid, status: o.status === "placed" ? "accepted" : o.status }).eq("id", id);
    error ? toast(error.message) : (toast("Rider assigned"), loadDispatch());
  }
  else if (a === "status") {
    if (v === "cancelled" && !twice("c" + id, "Tap Cancel again to cancel this order")) return;
    if (v === "delivered" && !twice("d" + id, "Tap Complete order again to confirm")) return;
    const { error } = await sb.from("deli_orders").update({ status: v }).eq("id", id);
    error ? toast(error.message) : loadDispatch();
  }
  else if (a === "passok") {
    const { error } = await sb.from("deli_rider_passes").update({ status: "confirmed", confirmed_at: new Date().toISOString() }).eq("id", id);
    error ? toast(error.message) : (toast("Pass confirmed"), loadDispatch());
  }
  else if (a === "passgive") {
    const amt = Number(dispatch.settings.day_pass || 10);
    const { error } = await sb.from("deli_rider_passes").upsert({ operator_id: dispatch.op, rider_id: id, pass_date: todayLusaka(), amount: amt, method: "cash", ref: "STAFF", status: "confirmed", confirmed_at: new Date().toISOString() }, { onConflict: "rider_id,pass_date" });
    error ? toast(error.message) : (toast("Pass recorded"), loadDispatch());
  }
  else if (a === "cset") {
    if (v === "blocked" && !twice("b" + id, "Tap Block again to block this customer")) return;
    const { error } = await sb.from("deli_customers").update({ status: v }).eq("operator_id", dispatch.op).eq("phone_key", id);
    error ? toast(error.message) : (toast("Saved"), loadDispatch());
  }
  else if (a === "clearinc") { const { error } = await sb.from("deli_orders").update({ incident_level: null }).eq("id", id); error ? toast(error.message) : loadDispatch(); }
  else if (a === "confirmpay") { const { error } = await sb.from("deli_orders").update({ pay_status: "confirmed" }).eq("id", id); error ? toast(error.message) : loadDispatch(); }
  else if (a === "complete") {
    try { const ok = await rpc("deli_complete_order", { p_id: id, p_code: document.getElementById("dc-" + id).value }); ok ? (toast("Order completed"), loadDispatch()) : toast("That code does not match"); } catch (err) { toast(err.message); }
  }
  else if (a === "addrider") {
    const name = document.getElementById("rN").value.trim(); if (!name) return toast("Enter a name");
    const pin = document.getElementById("rI").value.trim();
    if (pin && !/^[0-9]{4,6}$/.test(pin)) return toast("PIN must be 4 to 6 digits");
    const { data: nr, error } = await sb.from("deli_riders").insert({ operator_id: dispatch.op, name, phone: document.getElementById("rP").value.trim(), plate: document.getElementById("rL").value.trim(), trusted: document.getElementById("rT").checked }).select().single();
    if (error) return toast(error.message);
    if (pin) { try { await rpc("deli_staff_set_pin", { p_rider: nr.id, p_pin: pin }); } catch (err) { toast(err.message); } }
    toast(pin ? "Rider added" : "Rider added. Set a PIN so they can sign in."); loadDispatch();
  }
  else if (a === "rapprove") { await sb.from("deli_riders").update({ approved: true, active: true }).eq("id", id); toast("Rider approved"); loadDispatch(); }
  else if (a === "rsetpin") {
    const pin = (document.getElementById("rp-" + id).value || "").trim();
    if (!/^[0-9]{4,6}$/.test(pin)) return toast("Type a PIN of 4 to 6 digits first");
    try { await rpc("deli_staff_set_pin", { p_rider: id, p_pin: pin }); document.getElementById("rp-" + id).value = ""; toast("PIN saved"); } catch (err) { toast(err.message); }
  }
  else if (a === "addshop") {
    const name = document.getElementById("nmN").value.trim(); if (name.length < 2) return toast("Enter the shop name");
    const pin = document.getElementById("nmI").value.trim(); if (pin && !/^[0-9]{4,6}$/.test(pin)) return toast("PIN must be 4 to 6 digits");
    const pct = Number(document.getElementById("nmM").value); if (!(pct >= 0 && pct <= 50)) return toast("Commission must be 0 to 50");
    const { data: nm, error } = await sb.from("deli_merchants").insert({ operator_id: dispatch.op, name, phone: document.getElementById("nmP").value.trim(), category: document.getElementById("nmC").value, address: document.getElementById("nmA").value.trim(), commission_pct: pct, featured: document.getElementById("nmF").checked, approved: true }).select().single();
    if (error) return toast(error.message);
    if (pin) { try { await rpc("deli_staff_set_merchant_pin", { p_merchant: nm.id, p_pin: pin }); } catch (err) { toast(err.message); } }
    toast(pin ? "Shop added" : "Shop added. Set a PIN so the owner can sign in."); loadDispatch();
  }
  else if (a === "mapprove") { await sb.from("deli_merchants").update({ approved: true, active: true }).eq("id", id); toast("Shop approved"); loadDispatch(); }
  else if (a === "opcreate") {
    const g = (i) => document.getElementById(i).value.trim();
    if (g("no-name").length < 2) return toast("Enter the business name");
    if (!/^[a-z0-9-]{2,30}$/.test(g("no-slug").toLowerCase())) return toast("Short code: letters, numbers or dashes only");
    try {
      await rpc("deli_owner_create_operator", { p_slug: g("no-slug").toLowerCase(), p_name: g("no-name"), p_phone: g("no-phone"), p_host: g("no-host"), p_primary: g("no-p"), p_accent: g("no-a"), p_plan: g("no-plan"), p_licence: g("no-lic") || null, p_staff_email: g("no-staff") });
      toast("Operator created"); loadDispatch();
    } catch (err) { toast(err.message); }
  }
  else if (a === "opsave") {
    const g = (k) => document.getElementById("op-" + k + "-" + id).value.trim();
    try { await rpc("deli_owner_update_operator", { p_id: id, p_patch: { name: g("name"), support_phone: g("phone"), host: g("host"), licence_paid_until: g("lic") || null, primary_color: g("p"), accent_color: g("a") } }); toast("Saved"); loadDispatch(); } catch (err) { toast(err.message); }
  }
  else if (a === "opstatus") {
    if (v === "paused" && !twice("ops" + id, "Tap again to pause this operator")) return;
    try { await rpc("deli_owner_update_operator", { p_id: id, p_patch: { status: v } }); toast(v === "paused" ? "Operator paused" : "Operator resumed"); loadDispatch(); } catch (err) { toast(err.message); }
  }
  else if (a === "opstaff") {
    const em = document.getElementById("op-staff-" + id).value.trim();
    try { await rpc("deli_owner_add_staff", { p_op: id, p_email: em }); toast("Staff added. Make sure they have a login in Supabase Authentication."); loadDispatch(); } catch (err) { toast(err.message); }
  }
  else if (a === "mimgdel") {
    if (!twice("mid" + id, "Tap again to remove the photo")) return;
    const { error } = await sb.from("deli_merchants").update({ image_url: null }).eq("id", id);
    error ? toast(error.message) : (toast("Photo removed"), loadDispatch(), shopsData = null);
  }
  else if (a === "mfeat") { await sb.from("deli_merchants").update({ featured: v === "1" }).eq("id", id); loadDispatch(); }
  else if (a === "mactive") { await sb.from("deli_merchants").update({ active: v === "1" }).eq("id", id); loadDispatch(); }
  else if (a === "mcomm") {
    const pct = Number(document.getElementById("mc-" + id).value); if (!(pct >= 0 && pct <= 50)) return toast("Commission must be 0 to 50");
    const { error } = await sb.from("deli_merchants").update({ commission_pct: pct }).eq("id", id); error ? toast(error.message) : (toast("Saved. Applies to new orders."), loadDispatch());
  }
  else if (a === "mpin") {
    const pin = (document.getElementById("mp-" + id).value || "").trim();
    if (!/^[0-9]{4,6}$/.test(pin)) return toast("Type a PIN of 4 to 6 digits first");
    try { await rpc("deli_staff_set_merchant_pin", { p_merchant: id, p_pin: pin }); document.getElementById("mp-" + id).value = ""; toast("PIN saved"); } catch (err) { toast(err.message); }
  }
  else if (a === "mpaid") {
    if (!twice("mpd" + id, "Tap again once you have paid the shop")) return;
    const ids = dispatch.owed.filter((x) => x.merchant_id === id).map((x) => x.id);
    const { error } = await sb.from("deli_orders").update({ merchant_paid: true }).in("id", ids);
    error ? toast(error.message) : (toast("Marked as paid out"), loadDispatch());
  }
  else if (a === "rtrust") { await sb.from("deli_riders").update({ trusted: v === "1" }).eq("id", id); loadDispatch(); }
  else if (a === "ractive") { await sb.from("deli_riders").update({ active: v === "1" }).eq("id", id); loadDispatch(); }
  else if (a === "savesettings") {
    const keys = ["fee_delivery", "fee_errand", "fee_ride", "fee_service", "cash_limit_new", "day_pass", "pay_to_mtn", "pay_to_airtel", "pay_to_zamtel"];
    const rows = keys.map((k) => ({ operator_id: dispatch.op, key: k, value: document.getElementById("st-" + k).value.trim() }));
    for (const r of rows.slice(0, 6)) if (!(Number(r.value) >= 0) || r.value === "") return toast("Prices must be numbers");
    const { error } = await sb.from("deli_settings").upsert(rows, { onConflict: "operator_id,key" });
    error ? toast(error.message) : (toast("Saved"), loadFees(), loadDispatch());
  }
});

async function loadFees() {
  try { const f = await rpc("deli_fees", { p_op: OP.id }); if (f) { fees = { delivery: Number(f.delivery), errand: Number(f.errand), ride: Number(f.ride), service: Number(f.service) }; } } catch {}
}

window.addEventListener("hashchange", () => render());
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) { /* offline cache can be added later */ }
async function loadOperator() {
  try {
    const c = await rpc("deli_operator_config", { p_host: location.hostname, p_slug: new URLSearchParams(location.search).get("op") || null });
    if (c === null) OP.unknown = true;
    else OP = Object.assign(OP, { id: c.id, slug: c.slug, name: c.name, tagline: c.tagline || OP.tagline, logo_url: c.logo_url, primary: hexOk(c.primary_color) ? c.primary_color : OP.primary, accent: hexOk(c.accent_color) ? c.accent_color : OP.accent, phone: c.support_phone || OP.phone, paused: !!c.paused });
  } catch {}
  applyBrand();
}
loadOperator().then(loadFees).finally(() => render());
