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
const blankDraft = () => ({ pickup: "", dropoff: "", item_type: "Parcel", item_size: "Small", details: "", budget: "", pay_method: "cash", who: "sender", o_name: "", o_phone: "", payer: "sender", pay_when: "delivery" });
let draft = Object.assign(blankDraft(), store.get("draft", {}));
let account = store.get("account", { name: "", phone: "" });
let timer = null;
let lastSig = "";
let dispatch = { session: null, tab: "orders", orders: [], riders: [], customers: [], passes: [], merchants: [], owed: [], agents: [], agentList: [], settings: {}, ops: [], op: store.get("dop", null), isSuper: undefined, role: undefined, me: null, team: [], overview: [], loading: false };
let R = { token: store.get("rtoken", null), data: null, mode: "login" };
let M = { token: store.get("mtoken", null), data: null, mode: "login", tab: "orders" };
let A = { token: store.get("atoken", null), data: null, mode: "login", tab: "recruits" };
let S = { choices: null };
const ROLE = { rider: ["Rider", "#/rider"], merchant: ["Shop", "#/merchant"], agent: ["Agent", "#/agent"], staff: ["Staff", "#/dispatch"] };
let shopsData = null, shopFilter = "all";
let placesList = store.get("places", []);
const placesDL = () => `<datalist id="placesDL">${placesList.map((p) => `<option value="${esc(p.name)}"></option>`).join("")}</datalist>`;
const knownPlace = (x) => placesList.some((p) => p.name.toLowerCase() === String(x || "").trim().toLowerCase());
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
    <div class="card"><div class="t1">Own a shop?</div><div class="small">Grocery, cakes, shawarma, takeaways. Sell on ${esc(OP.name)} and we deliver for you.</div><a class="btn btn-ghost" href="#/join">Sell with us</a></div>
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
      <div class="hr"></div><div class="rowline"><span>Items (you pay the shop)</span><b>${K(cartTotal())}</b></div><div class="rowline"><span>Delivery (you pay the rider)</span><b>${K(fee)}</b></div>${sf > 0 ? `<div class="rowline"><span>Service fee</span><b>${K(sf)}</b></div>` : ""}<div class="hr"></div><div class="total"><span>Total</span><span>${K(total)}</span></div></div>
    <div class="sec">Where should we deliver?</div>
    <input class="input" data-bind-cart="dropoff" list="placesDL" value="${esc(cart.dropoff)}" placeholder="Your place or landmark" autocomplete="off">${placesDL()}
    <textarea class="input" rows="2" data-bind-cart="details" placeholder="Note for the rider (optional)">${esc(cart.details)}</textarea>
    <div class="sec">Your details</div>
    <input class="input" data-bind-acc="name" placeholder="Your name" value="${esc(account.name)}" autocomplete="name">
    <input class="input" data-bind-acc="phone" inputmode="tel" placeholder="Phone number e.g. 0977123456" value="${esc(account.phone)}" autocomplete="tel">
    <div class="note blue"><div><b>How you pay</b><br>1. You pay the <b>shop</b> ${K(cartTotal())} by mobile money. After you order, we show you the shop's number.<br>2. You pay the <b>rider</b> ${K(fee + sf)} in cash when your order arrives.<br>The shop starts preparing once it has your money.</div></div>
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
    const snd = d.who !== "receiver";
    extra = `<div class="sec">Who are you?</div>
      <div class="chips"><button class="chip ${snd ? "on" : ""}" data-act="who" data-v="sender">I am sending</button><button class="chip ${snd ? "" : "on"}" data-act="who" data-v="receiver">I am receiving</button></div>
      <div class="sec">${snd ? "Who will receive it?" : "Who is sending it?"}</div>
      <input class="input" data-bind="o_name" value="${esc(d.o_name)}" placeholder="${snd ? "Receiver's name" : "Sender's name"}" autocomplete="off">
      <input class="input" data-bind="o_phone" inputmode="tel" value="${esc(d.o_phone)}" placeholder="${snd ? "Receiver's phone e.g. 0977123456" : "Sender's phone e.g. 0977123456"}" autocomplete="off">
      ${"contacts" in navigator && "ContactsManager" in window ? `<button class="btn btn-ghost btn-sm" data-act="pickcontact" style="margin-top:6px">Pick from my contacts</button>` : ""}
      <div class="small">${snd ? "We text the receiver the delivery code, and the rider calls them on arrival." : "The rider calls the sender when collecting the parcel."}</div>
      <div class="sec">What are we carrying?</div>
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
      <div class="fields"><div class="field"><label>${pl[0]}</label><input class="bare" data-bind="pickup" list="placesDL" value="${esc(d.pickup)}" placeholder="Type or pick a place" autocomplete="off"></div>
      <div class="field last"><label>${pl[1]}</label><input class="bare" data-bind="dropoff" list="placesDL" value="${esc(d.dropoff)}" placeholder="Type or pick a place" autocomplete="off"></div></div></div></div>${placesDL()}
    ${extra}
    <div class="spacer"></div>
    <div class="card"><div class="rowline"><span>${SVC[svc]} fee</span><b>${K(fees[svc])}</b></div>${fees.service > 0 ? `<div class="rowline"><span>Service fee</span><b>${K(fees.service)}</b></div>` : ""}<div class="hr"></div><div class="total"><span>Total</span><span>${K(money(svc))}</span></div></div>
    <button class="btn btn-green" data-act="topay" data-svc="${svc}">Continue to pay</button>
  </div></div>`;
}

function vPay() {
  const svc = draft.service || "delivery";
  const acc = account;
  const del = svc === "delivery";
  const rpay = del && draft.payer === "receiver";
  if (rpay) draft.pay_method = "cash";
  const m = rpay ? ["cash"] : ["mtn", "airtel", "zamtel", "cash"];
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
    ${del ? `<div class="sec">Who pays?</div>
    <div class="chips"><button class="chip ${rpay ? "" : "on"}" data-act="payer" data-v="sender">The sender pays</button><button class="chip ${rpay ? "on" : ""}" data-act="payer" data-v="receiver">The receiver pays</button></div>` : ""}
    <div class="sec">How ${rpay ? "will they pay?" : "will you pay?"}</div>
    ${m.map((k) => `<label class="pm ${draft.pay_method === k ? "on" : ""}" ${k === "cash" && cashOff ? 'style="opacity:.4"' : ""}><span class="ic">${k === "cash" ? "K" : k === "mtn" ? "M" : k === "airtel" ? "A" : "Z"}</span><span class="nm">${PAY_NAME[k]}</span><input type="radio" name="pm" data-act="pm" data-v="${k}" ${draft.pay_method === k ? "checked" : ""} ${k === "cash" && cashOff ? "disabled" : ""}></label>`).join("")}
    ${cashOff ? `<div class="note blue"><div>Cash is not available for this order. Please pay with mobile money. ${cust.limit ? "Cash is only for orders under " + K(cust.limit) + "." : ""}</div></div>` : ""}
    ${del && !rpay && draft.pay_method === "cash" ? `<div class="chips"><button class="chip ${draft.pay_when === "pickup" ? "on" : ""}" data-act="paywhen" data-v="pickup">Pay at pick-up</button><button class="chip ${draft.pay_when !== "pickup" ? "on" : ""}" data-act="paywhen" data-v="delivery">Pay on delivery</button></div>` : ""}
    <div class="small">${rpay ? "The receiver pays the rider in cash when the order arrives." : draft.pay_method === "cash" ? "Pay the rider in cash " + (del && draft.pay_when === "pickup" ? "when they collect the parcel." : "when your order is done.") : "After you order, we show you the number to send the money to. We confirm your payment by hand."}</div>
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
  else if (o.shop) {
    const sp = o.shop, rider$ = Number(o.delivery_fee) + Number(o.service_fee);
    payBox = (sp.paid ? `<div class="note green">${ic("check", "#1B6B35")}<div><b>${esc(sp.name)} has your payment.</b></div></div>`
      : `<div class="note orange"><div>Pay <b>${esc(sp.name)}</b> <b>${K(o.items_total)}</b> by mobile money${sp.pay_network ? " (" + PAY_NAME[sp.pay_network] + ")" : ""} to <b>${esc(sp.pay_number || "")}</b>. The shop starts preparing once it has your money.<br><button class="btn btn-ghost btn-sm" data-act="copy" data-v="${esc(sp.pay_number || "")}">Copy number</button></div></div>`)
      + (o.status !== "delivered" ? `<div class="note blue"><div>Pay the rider <b>${K(rider$)}</b> in cash for delivery.</div></div>` : "");
  }
  else if (o.pay_status === "confirmed") payBox = `<div class="note green">${ic("check", "#1B6B35")}<div><b>Payment received.</b> Thank you!</div></div>`;
  else if (o.pay_method === "cash") payBox = `<div class="note orange"><div>${o.payer === "receiver" ? "The receiver pays the rider" : "Please pay the rider"} <b>${K(total)}</b> in cash${o.payer === "receiver" ? " on delivery" : o.pay_when === "pickup" ? " at pick-up" : o.service === "delivery" ? " on delivery" : ""}.</div></div>`;
  else payBox = `<div class="note orange"><div>Send <b>${K(total)}</b> by ${PAY_NAME[o.pay_method]} to <b>${esc(o.pay_to || "the number we give you on WhatsApp: " + OP.phone)}</b>. Use reference <b>${esc(o.code)}</b>. We confirm it by hand.${o.pay_to ? `<br><button class="btn btn-ghost btn-sm" data-act="copy" data-v="${esc(o.pay_to)}">Copy number</button>` : ""}</div></div>`;
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
      <div class="card"><div class="rowline"><span>From</span><b>${esc(o.pickup)}</b></div><div class="rowline"><span>To</span><b>${esc(o.dropoff)}</b></div>${o.receiver_name ? `<div class="rowline"><span>Receiver</span><b>${esc(o.receiver_name)}</b></div>` : ""}${o.details ? `<div class="rowline"><span>Note</span><b>${esc(o.details)}</b></div>` : ""}</div>
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


const signedIn = () => [R.token && "rider", M.token && "merchant", A.token && "agent", dispatch.session && "staff"].filter(Boolean);
function vSignin() {
  if (S.choices) return `<div class="screen"><div class="pad">${topbar("Sign in", "#/account")}<div class="note green">${ic("user", "#1B6B35")}<div>This phone number has more than one role. Where would you like to go?</div></div>
    ${S.choices.map((k) => `<button class="btn btn-green" data-act="spick" data-v="${k}">${ROLE[k][0]} dashboard</button>`).join("")}</div></div>`;
  return `<div class="screen"><div class="pad">${topbar("Sign in", "#/account")}
    <div class="note green">${ic("user", "#1B6B35")}<div>Riders, shops, agents and staff all sign in here. We take you to the right place.</div></div>
    <input class="input" id="uId" autocomplete="username" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Phone number or staff email">
    <input class="input" id="uPw" type="password" inputmode="numeric" autocomplete="current-password" placeholder="PIN or password">
    <button class="btn btn-green" data-act="signin">Sign in</button>
    <a class="btn btn-ghost" href="#/join">New here? Join ${esc(OP.name)}</a></div></div>`;
}
function vJoin() {
  const c = (t, d, v, b) => `<div class="card"><div class="t1">${t}</div><div class="small">${d}</div><button class="btn btn-green" data-act="join" data-v="${v}">${b}</button></div>`;
  return `<div class="screen"><div class="pad">${topbar("Join " + OP.name, "#/account")}
    ${c("Ride with us", "Deliver orders on your own bike and earn. We approve every rider.", "rider", "Become a rider")}
    ${c("Sell with us", "Grocery, cakes, shawarma, takeaways. Customers order and our riders deliver.", "merchant", "Register my shop")}
    ${c("Help us grow", "Register riders and shops in your town and earn a bonus for each one.", "agent", "Become an agent")}
    <a class="small" style="text-align:center;color:var(--green);font-weight:700" href="#/signin">Already have an account? Sign in</a></div></div>`;
}

function vAccount() {
  return `<div class="screen"><div class="pad" style="padding-bottom:12px"><div class="h1">Account</div>
    <div class="small">Saved on this phone so you do not type them again.</div>
    <input class="input" data-bind-acc="name" placeholder="Your name" value="${esc(account.name)}">
    <input class="input" data-bind-acc="phone" inputmode="tel" placeholder="Phone number" value="${esc(account.phone)}">
    <button class="btn btn-green" data-act="saveacc">Save</button>
    ${signedIn().length ? `<div class="small" style="margin-top:6px">You are signed in as: <b>${signedIn().map((k) => ROLE[k][0]).join(", ")}</b></div>${signedIn().map((k) => `<a class="btn btn-green" href="${ROLE[k][1]}">Open my ${ROLE[k][0].toLowerCase()} dashboard</a>`).join("")}<button class="btn btn-ghost" data-act="signoutall">Sign out</button>` : '<a class="btn btn-ghost" href="#/signin">Sign in (riders, shops, agents, staff)</a>'}
    <a class="btn btn-ghost" href="#/join">Join ${esc(OP.name)}</a>${powered}</div>${tabs("account")}</div>`;
}

/* ---------- staff dispatch ---------- */
function vDispatch() {
  const D = dispatch;
  if (!sb) return `<div class="screen"><div class="pad">${topbar("Staff", "#/account")}<div class="note orange"><div>The app is not connected to its database yet.</div></div></div></div>`;
  if (!D.session) return `<div class="screen"><div class="pad">${topbar("Staff sign-in", "#/account")}
    <input class="input" id="sEmail" type="email" placeholder="Staff email" autocomplete="username">
    <input class="input" id="sPass" type="password" placeholder="Password" autocomplete="current-password">
    <button class="btn btn-green" data-act="login">Sign in</button></div></div>`;
  if (D.role === undefined) return `<div class="screen"><div class="pad"><div class="h1">Dispatch</div><div class="small">Loading…</div></div></div>`;
  const DP = D.role === "dispatcher";
  const tabsHtml = (DP ? ["orders"] : ["orders", "customers", "riders", "merchants", "agents", "places", "team", "settings"].concat(D.isSuper ? ["operators"] : [])).map((t) => `<button class="chip ${D.tab === t ? "on" : ""}" data-act="dtab" data-v="${t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join("");
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
        ${o.merchant_id || DP ? "" : [o.pickup, o.dropoff].filter((x, i, arr) => x && x.trim().length >= 2 && !knownPlace(x) && arr.indexOf(x) === i).map((x) => `<div class="d-row"><button class="btn btn-ghost btn-sm" data-act="addplace1" data-name="${esc(x)}">+ Add "${esc(x)}" to places</button></div>`).join("")}
        ${o.merchant_id ? `<div class="note blue"><div><b>Shop order · ${esc(o.shop_name || (D.merchants.find((m) => m.id === o.merchant_id) || {}).name || "Shop")}</b> · ${MST[o.merchant_status] || ""}<br>${esc(itemsText(o.items))}<br>Items ${K(o.items_total)} paid by the customer to the shop (${o.shop_paid_at ? "shop confirmed" : "not confirmed yet"}). Rider collects ${K(Number(o.delivery_fee) + Number(o.service_fee))} cash.${DP ? "" : ` Shop fee ${K(o.merchant_fee)} when delivered.`}</div></div>` : o.receiver_phone ? `<div class="note blue"><div><b>Sender:</b> ${esc(o.sender_name || "")} ${esc(o.sender_phone || "")}<br><b>Receiver:</b> ${esc(o.receiver_name || "")} ${esc(o.receiver_phone)}<br><b>${o.payer === "receiver" ? "Receiver pays" : "Sender pays"}</b> ${o.pay_method === "cash" ? "cash " + (o.payer === "receiver" || o.pay_when !== "pickup" ? "on delivery" : "at pick-up") : "by " + PAY_NAME[o.pay_method]}</div></div>` : ""}
        ${o.details ? `<div class="t2">Note: ${esc(o.details)}${o.budget ? " · Budget " + K(o.budget) : ""}</div>` : ""}
        <div class="t2">${esc(o.customer_name || "Customer")} · <a href="tel:${esc(o.customer_phone)}" style="color:var(--green);font-weight:700">${esc(o.customer_phone)}</a> · <a href="https://wa.me/${intl(o.customer_phone)}" target="_blank" rel="noopener" style="color:var(--green);font-weight:700">WhatsApp</a></div>
        ${DP ? "" : `<div class="d-row"><span class="badge ${cst === "trusted" ? "" : cst === "new" ? "o" : "g"}">${clabel} · ${cu ? cu.completed : 0} done${cu && cu.incidents ? " · " + cu.incidents + " incident" + (cu.incidents > 1 ? "s" : "") : ""}</span>${cst !== "blocked" ? `<button class="btn btn-ghost btn-sm" data-act="cset" data-id="${ck}" data-v="watch">Watch</button><button class="btn btn-ghost btn-sm" style="color:#B3261E;border-color:#B3261E" data-act="cset" data-id="${ck}" data-v="blocked">Block</button>` : ""}</div>`}
        <div class="d-row"><span class="badge ${o.pay_status === "confirmed" ? "" : "o"}">${PAY_NAME[o.pay_method]}: ${o.pay_status}</span><b>${K(Number(o.delivery_fee) + Number(o.service_fee) + (o.merchant_id ? 0 : Number(o.items_total || 0)))}</b>
          ${!DP && o.pay_status !== "confirmed" && o.status !== "cancelled" ? `<button class="btn btn-ghost btn-sm" data-act="confirmpay" data-id="${o.id}">Mark paid</button>` : ""}</div>
        ${isOpen ? `<div class="d-row"><select class="input" id="rs-${o.id}" style="flex:1"><option value="">${rider ? esc(rider.name) : "Choose rider"}</option>${trusted.map((r) => `<option value="${r.id}" ${r.id === o.rider_id ? "selected" : ""}>${esc(r.name)}${r.trusted ? " ★" : ""}</option>`).join("")}</select>
          <button class="btn btn-green btn-sm" data-act="assign" data-id="${o.id}">Assign</button></div>
        <div class="d-row">${o.status === "accepted" ? `<button class="btn btn-ghost btn-sm" data-act="status" data-id="${o.id}" data-v="picked_up">Picked up</button>` : ""}
          ${["accepted", "picked_up"].includes(o.status) ? `<button class="btn btn-ghost btn-sm" data-act="status" data-id="${o.id}" data-v="on_the_way">On the way</button>` : ""}
          <button class="btn btn-orange btn-sm" data-act="status" data-id="${o.id}" data-v="delivered">Complete order</button>
          ${DP ? "" : `<button class="btn btn-ghost btn-sm" style="color:#B3261E;border-color:#B3261E" data-act="status" data-id="${o.id}" data-v="cancelled">Cancel</button>`}</div>
        ` : ""}
      </div>`;
    };
    const awaitingPasses = DP ? [] : D.passes.filter((p) => p.status === "awaiting");
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
      <div class="d-grid" style="margin-top:12px">${D.riders.map((r) => `<div class="d-order"><div class="d-row" style="justify-content:space-between"><b>${esc(r.name)} ${r.trusted ? "★" : ""}</b><span class="badge ${r.approved === false ? "o" : r.active ? "" : "g"}">${r.approved === false ? "Waiting for approval" : r.active ? (r.online ? "Online" : "Active") : "Off"}</span></div><div class="t2">${esc(r.phone || "")} · ${esc(r.plate || "")}${r.agent_id ? " · Recruited by " + esc(((D.agentList || []).find((g) => g.id === r.agent_id) || {}).name || "an agent") : ""}</div>
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
  } else if (D.tab === "team") {
    body = `<div class="small">A <b>dispatcher</b> is an officer who runs the day: they see orders, assign riders, and mark orders Picked up, On the way and Completed. They cannot see customers, shops, agents, money, places or settings, and cannot cancel orders.</div>
      <div class="d-order" style="margin-top:12px"><div class="sec">Add a dispatcher</div>
        <div class="note blue"><div><b>Step 1.</b> In Supabase open <b>Authentication</b>, then <b>Users</b>, then <b>Add user</b>. Type their email and a password, and tick <b>Auto Confirm User</b>. <b>Step 2.</b> Type the same email here and tap Add.</div></div>
        <div class="d-row"><input class="input d-input" id="tdN" placeholder="Name" style="flex:1;min-width:130px"><input class="input d-input" id="tdE" type="email" placeholder="Their email" style="flex:1;min-width:160px"></div>
        <button class="btn btn-green btn-sm" data-act="adddisp">Add dispatcher</button></div>
      <div class="d-grid" style="margin-top:12px">${(D.team || []).map((t) => `<div class="d-order"><div class="d-row" style="justify-content:space-between"><b>${esc(t.name || "Dispatcher")}</b><button class="btn btn-ghost btn-sm" style="color:#B3261E;border-color:#B3261E" data-act="deldisp" data-id="${esc(t.email)}">Remove</button></div><div class="t2">${esc(t.email)} · added ${new Date(t.created_at).toLocaleDateString("en-GB")}</div></div>`).join("") || '<div class="small">No dispatchers yet.</div>'}</div>`;
  } else if (D.tab === "places") {
    body = `<div class="small">These places show as suggestions in the From and To boxes. Add places as you discover them. Customers can still type any other place.</div>
      <div class="d-order" style="margin-top:12px"><div class="sec">Add places</div><textarea class="input d-input" id="plN" rows="4" placeholder="One place per line, for example:&#10;Mumbwa Main Market&#10;Mumbwa Hospital"></textarea>
        <div class="d-row"><button class="btn btn-green btn-sm" data-act="addplaces">Add to list</button></div></div>
      <div class="sec">${placesList.length} place${placesList.length === 1 ? "" : "s"}</div>
      ${placesList.map((p) => `<div class="rowline"><span>${esc(p.name)}</span><button class="btn btn-ghost btn-sm" style="color:#B3261E;border-color:#B3261E" data-act="delplace" data-id="${p.id}">Remove</button></div>`).join("") || '<div class="small">No places yet.</div>'}`;
  } else if (D.tab === "agents") {
    const dt = (x) => (x ? new Date(x).toLocaleDateString("en-GB") : "");
    body = `<div class="small">Agents register riders and shops for you. When a recruit has done real deliveries the agent earns a bonus. Pay agents every Friday by mobile money, once a bonus is 7 days old and they are owed K50 or more. You cover the mobile money charge. Then tap <b>Record payout</b>.</div>
      <div class="d-order" style="margin-top:12px"><div class="sec">Add an agent</div><div class="d-row"><input class="input d-input" id="gaN" placeholder="Name" style="flex:1;min-width:130px"><input class="input d-input" id="gaP" placeholder="Phone" style="flex:1;min-width:120px"></div>
        <div class="d-row"><input class="input d-input" id="gaA" placeholder="Town / area" style="flex:1;min-width:120px"><input class="input d-input" id="gaI" inputmode="numeric" maxlength="6" placeholder="Login PIN (4-6 digits)" style="flex:1;min-width:140px"></div>
        <div class="d-row"><input class="input d-input" id="gaR" inputmode="decimal" value="20" placeholder="Bonus per rider (K)" style="flex:1;min-width:130px"><input class="input d-input" id="gaS" inputmode="decimal" value="50" placeholder="Bonus per shop (K)" style="flex:1;min-width:130px"></div>
        <button class="btn btn-green btn-sm" data-act="addagent">Add agent</button></div>
      <div class="d-grid" style="margin-top:12px">${D.agents.map((g) => { const owed = Number(g.earned) - Number(g.paid); return `<div class="d-order"><div class="d-row" style="justify-content:space-between"><b>${esc(g.name)}</b><span class="badge ${g.approved === false ? "o" : g.active ? "" : "g"}">${g.approved === false ? "Waiting for approval" : g.active ? "Active" : "Off"}</span></div>
        <div class="t2"><a href="tel:${esc(g.phone || "")}" style="color:var(--green);font-weight:700">${esc(g.phone || "")}</a> · ${esc(g.area || "")}</div>
        <div class="t2">${g.terms_accepted_at ? "Accepted terms " + esc(g.terms_version) + " on " + dt(g.terms_accepted_at) : "Has not accepted the terms yet"}</div>
        <div class="t2">Riders: ${g.riders}${g.riders_pending ? " (" + g.riders_pending + " waiting)" : ""} · Shops: ${g.shops}${g.shops_pending ? " (" + g.shops_pending + " waiting)" : ""}</div>
        <div class="d-row"><span class="badge">Earned ${K(g.earned)}</span><span class="badge">Paid ${K(g.paid)}</span><span class="badge ${owed > 0 ? "o" : ""}">Owed ${K(owed)}</span></div>
        ${owed > 0 ? `<div class="d-row"><input class="input d-input" id="gpa-${g.id}" inputmode="decimal" value="${owed}" style="width:90px"><input class="input d-input" id="gpn-${g.id}" placeholder="Note e.g. MTN ref" style="flex:1;min-width:110px"><button class="btn btn-orange btn-sm" data-act="gpaid" data-id="${g.id}">Record payout</button></div>` : ""}
        <div class="d-row">${g.approved === false ? `<button class="btn btn-green btn-sm" data-act="gapprove" data-id="${g.id}">Approve</button>` : ""}<button class="btn btn-ghost btn-sm" data-act="gactive" data-id="${g.id}" data-v="${g.active ? 0 : 1}">${g.active ? "Switch off" : "Switch on"}</button></div>
        <div class="d-row"><input class="input d-input" id="gp-${g.id}" inputmode="numeric" maxlength="6" placeholder="New PIN" style="width:110px"><button class="btn btn-ghost btn-sm" data-act="gpin" data-id="${g.id}">Set PIN</button></div>
        <div class="d-row small"><span>Rider K</span><input class="input d-input" id="gr-${g.id}" inputmode="decimal" value="${esc(g.rider_bonus)}" style="width:64px"><span>after</span><input class="input d-input" id="grg-${g.id}" inputmode="numeric" value="${esc(g.rider_goal)}" style="width:52px"><span>jobs</span></div>
        <div class="d-row small"><span>Shop K</span><input class="input d-input" id="gs-${g.id}" inputmode="decimal" value="${esc(g.shop_bonus)}" style="width:64px"><span>after</span><input class="input d-input" id="gsg-${g.id}" inputmode="numeric" value="${esc(g.shop_goal)}" style="width:52px"><span>orders</span><button class="btn btn-ghost btn-sm" data-act="grates" data-id="${g.id}">Save rates</button></div>
        ${(g.credits || []).length ? `<div class="sec" style="margin-top:4px">Bonuses</div>${g.credits.map((c) => `<div class="rowline"><span>${c.kind === "rider" ? "Rider" : "Shop"}: ${esc(c.who || "")} · ${dt(c.created_at)}${c.voided ? " · cancelled" : ""}</span><span><b>${K(c.amount)}</b> ${c.voided ? "" : `<button class="btn btn-ghost btn-sm" style="color:#B3261E;border-color:#B3261E" data-act="gvoid" data-id="${c.id}">Cancel</button>`}</span></div>`).join("")}` : ""}</div>`; }).join("") || '<div class="small">No agents yet.</div>'}</div>`;
  } else if (D.tab === "merchants") {
    const billOf = {}; (D.bills || []).forEach((x) => { billOf[x.id] = x; });
    body = `<div class="small">Customers pay the shop directly. Each delivered order adds ${K((D.settings.merchant_fee ?? 3))} to the shop's bill. When a shop pays you, tap <b>Record payment</b>. Shops that stay unpaid are hidden from customers automatically.</div>
      <div class="d-order" style="margin-top:12px"><div class="sec">Add a shop</div><div class="d-row"><input class="input d-input" id="nmN" placeholder="Shop name" style="flex:1;min-width:140px"><input class="input d-input" id="nmP" placeholder="Phone" style="flex:1;min-width:120px"></div>
        <div class="d-row"><select class="input d-input" id="nmC" style="flex:1"><option value="grocery">Groceries</option><option value="bakery">Cakes &amp; bakery</option><option value="food">Food &amp; takeaways</option><option value="other">Other</option></select><input class="input d-input" id="nmA" placeholder="Address / landmark" style="flex:2;min-width:140px"></div>
        <div class="d-row"><input class="input d-input" id="nmI" inputmode="numeric" maxlength="6" placeholder="Login PIN (4-6 digits)" style="flex:1;min-width:140px"></div>
        <label class="d-row small"><input type="checkbox" id="nmF"> Featured (shown first)</label><button class="btn btn-green btn-sm" data-act="addshop">Add shop</button></div>
      <div class="d-grid" style="margin-top:12px">${D.merchants.map((m) => { const bo = billOf[m.id] || {}, bl = bo.bill || {}; return `<div class="d-order"><div class="d-row" style="justify-content:space-between"><b>${esc(m.name)} ${m.featured ? "★" : ""}</b><span class="badge ${m.approved === false ? "o" : m.active ? "" : "g"}">${m.approved === false ? "Waiting for approval" : m.active ? (m.is_open ? "Open" : "Closed") : "Off"}</span></div>
        <div class="t2">${esc((CAT[m.category] || CAT.other).name)} · <a href="tel:${esc(m.phone || "")}" style="color:var(--green);font-weight:700">${esc(m.phone || "")}</a> · ${esc(m.address || "")}${m.agent_id ? " · Recruited by " + esc(((D.agentList || []).find((g) => g.id === m.agent_id) || {}).name || "an agent") : ""}</div>
        <div class="d-row"><div class="stile" style="width:64px;height:64px;background:${(CAT[m.category] || CAT.other).bg};color:${(CAT[m.category] || CAT.other).fg}">${safeImg(m.image_url) ? `<img src="${esc(safeImg(m.image_url))}" alt="">` : ic((CAT[m.category] || CAT.other).icon, (CAT[m.category] || CAT.other).fg, 28)}</div>
          <label class="btn btn-ghost btn-sm" style="cursor:pointer">${safeImg(m.image_url) ? "Change photo" : "Add photo"}<input type="file" accept="image/*" data-file="mimg" data-id="${m.id}" hidden></label>${safeImg(m.image_url) ? `<button class="btn btn-ghost btn-sm" style="color:#B3261E;border-color:#B3261E" data-act="mimgdel" data-id="${m.id}">Remove photo</button>` : ""}</div>
        <div class="t2">Customers pay: ${esc(m.pay_number || m.phone || "")} ${m.pay_network ? "(" + esc(PAY_NAME[m.pay_network]) + ")" : ""}${m.pay_number ? "" : " (shop has not set a number)"}</div>
        <div class="d-row"><span class="badge">${bl.orders || 0} delivered</span><span class="badge">Fees ${K(bl.fees)}</span><span class="badge">Paid ${K(bl.paid)}</span><span class="badge ${bl.owed > 0 ? "o" : ""}">Owes ${K(bl.owed)}</span>${bl.hidden ? '<span class="badge" style="background:#B3261E;color:#fff">Hidden: unpaid</span>' : bl.overdue > 0 ? '<span class="badge o">Overdue ' + K(bl.overdue) + "</span>" : ""}</div>
        ${bl.owed > 0 ? `<div class="d-row"><input class="input d-input" id="mfa-${m.id}" inputmode="decimal" value="${esc(bl.owed)}" style="width:90px"><input class="input d-input" id="mfn-${m.id}" placeholder="Note e.g. MTN ref" style="flex:1;min-width:110px"><button class="btn btn-orange btn-sm" data-act="mfeepaid" data-id="${m.id}">Record payment</button></div>` : ""}
        ${(bo.payments || []).length ? `<div class="small">${bo.payments.map((p) => `<div class="rowline"><span>${p.created_at ? new Date(p.created_at).toLocaleDateString("en-GB") : ""} · ${esc(p.note || "payment")}${p.voided ? " · cancelled" : ""}</span><span><b>${K(p.amount)}</b> ${p.voided ? "" : `<button class="btn btn-ghost btn-sm" style="color:#B3261E;border-color:#B3261E" data-act="mfeevoid" data-id="${p.id}">Cancel</button>`}</span></div>`).join("")}</div>` : ""}
        <div class="d-row">${m.approved === false ? `<button class="btn btn-green btn-sm" data-act="mapprove" data-id="${m.id}">Approve</button>` : ""}<button class="btn btn-ghost btn-sm" data-act="mfeat" data-id="${m.id}" data-v="${m.featured ? 0 : 1}">${m.featured ? "Unfeature" : "Feature"}</button><button class="btn btn-ghost btn-sm" data-act="mactive" data-id="${m.id}" data-v="${m.active ? 0 : 1}">${m.active ? "Switch off" : "Switch on"}</button></div>
        <div class="d-row"><input class="input d-input" id="mp-${m.id}" inputmode="numeric" maxlength="6" placeholder="New PIN" style="width:110px"><button class="btn btn-ghost btn-sm" data-act="mpin" data-id="${m.id}">Set PIN</button></div></div>`; }).join("") || '<div class="small">No shops yet.</div>'}</div>`;
  } else {
    const s = D.settings;
    const f = (k, l) => `<div><label class="lbl">${l}</label><input class="input d-input" id="st-${k}" value="${esc(s[k] ?? "")}"></div>`;
    const g3 = (k, l, def) => `<div><label class="lbl">${l}</label><input class="input d-input" id="st-${k}" value="${esc(s[k] ?? def)}"></div>`;
    body = `<div class="d-order"><div class="sec">Prices (Kwacha)</div>${f("fee_delivery", "Delivery fee")}${f("fee_errand", "Errand fee")}${f("fee_ride", "Ride fare")}${f("fee_service", "Service fee")}${f("cash_limit_new", "Cash limit for new customers (K)")}${f("day_pass", "Rider day pass (K)")}
      <div class="sec" style="margin-top:8px">Shop fee (paid by shops)</div>${g3("merchant_fee", "Fee per delivered order (K)", 3)}${g3("merchant_due_days", "Shop pays within (days)", 7)}${g3("merchant_grace_days", "Extra days before the shop is hidden", 3)}
      <div class="sec" style="margin-top:8px">Where customers send money</div>${f("pay_to_mtn", "MTN MoMo number")}${f("pay_to_airtel", "Airtel Money number")}${f("pay_to_zamtel", "Zamtel Kwacha number")}
      <button class="btn btn-green" data-act="savesettings">Save settings</button></div>`;
  }
  return `<div class="screen wide"><div class="pad"><div class="d-top"><div><div class="h1">Dispatch</div>${D.ops.length > 1 ? `<select class="input d-input" data-dop="1" style="margin-top:6px">${D.ops.map((x) => `<option value="${x.id}" ${x.id === D.op ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select>` : D.ops.length === 1 ? `<div class="small">${esc(D.ops[0].name)}</div>` : ""}</div><div class="d-row"><button class="btn btn-ghost btn-sm" data-act="refresh">Refresh</button><button class="btn btn-ghost btn-sm" data-act="logout">Sign out</button></div></div>
    <div class="d-tabs">${tabsHtml}</div>${D.loading ? '<div class="small">Loading…</div>' : ""}${body}</div></div>`;
}

async function loadDispatch(keepFocus) {
  if (!sb || !dispatch.session) return;
  if (keepFocus && $app.contains(document.activeElement) && /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
  if (dispatch.role === undefined) {
    try { const me = await rpc("deli_staff_me"); dispatch.me = me; dispatch.role = me && me.role === "dispatcher" ? "dispatcher" : "owner"; } catch { dispatch.role = "owner"; }
  }
  if (dispatch.role === "dispatcher") {
    const me = dispatch.me;
    dispatch.tab = "orders"; dispatch.op = me.operator_id; dispatch.ops = [{ id: me.operator_id, name: me.operator_name || "" }]; dispatch.isSuper = false;
    try {
      const [o, r] = await Promise.all([rpc("deli_dispatch_orders", { p_op: me.operator_id }), rpc("deli_dispatch_riders", { p_op: me.operator_id })]);
      dispatch.orders = o || []; dispatch.riders = r || [];
    } catch (e) { toast(e.message); return; }
    render(true); return;
  }
  const os = await sb.from("deli_operators").select("id,slug,name").order("name");
  if (!os.error && os.data && os.data.length) {
    dispatch.ops = os.data;
    if (!os.data.some((x) => x.id === dispatch.op)) { dispatch.op = (os.data.find((x) => x.id === OP.id) || os.data[0]).id; store.set("dop", dispatch.op); }
  }
  if (dispatch.isSuper === undefined) { try { dispatch.isSuper = !!(await rpc("deli_am_super")); } catch { dispatch.isSuper = false; } }
  if (dispatch.isSuper && dispatch.tab === "operators") { try { dispatch.overview = (await rpc("deli_owner_overview")) || []; } catch (e) { toast(e.message); } }
  if (!dispatch.op) { toast("No operator found for this staff account."); return; }
  const eo = dispatch.op;
  if (dispatch.tab === "merchants") { try { dispatch.bills = (await rpc("deli_staff_merchant_bills", { p_op: eo })) || []; } catch (e) { toast(e.message); } }
  if (dispatch.tab === "team") { try { dispatch.team = (await rpc("deli_staff_dispatchers", { p_op: eo })) || []; } catch (e) { toast(e.message); } }
  if (dispatch.tab === "agents") { try { dispatch.agents = (await rpc("deli_staff_agents", { p_op: eo })) || []; } catch (e) { toast(e.message); } }
  const [o, r, s, cs, ps, ms, ag] = await Promise.all([
    sb.from("deli_orders").select("*").eq("operator_id", eo).order("created_at", { ascending: false }).limit(80),
    sb.from("deli_riders").select("*").eq("operator_id", eo).order("name"),
    sb.from("deli_settings").select("*").eq("operator_id", eo),
    sb.from("deli_customers").select("*").eq("operator_id", eo).order("updated_at", { ascending: false }).limit(150),
    sb.from("deli_rider_passes").select("*").eq("operator_id", eo).order("created_at", { ascending: false }).limit(200),
    sb.from("deli_merchants").select("*").eq("operator_id", eo).order("created_at", { ascending: false }),
    sb.from("deli_agents").select("id,name").eq("operator_id", eo),
  ]);
  if (o.error) { toast(o.error.message.includes("permission") || o.error.code === "42501" ? "This email is not on the staff list." : o.error.message); return; }
  dispatch.orders = o.data || []; dispatch.riders = r.data || []; dispatch.customers = cs.data || []; dispatch.passes = ps.data || []; dispatch.merchants = ms.data || []; dispatch.agentList = ag.data || [];
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
      ${o.shop ? `<div class="note orange"><div><b>Collect ${K(o.total)} cash from the customer</b> on delivery. The shop was paid directly, do not take money for the items.</div></div>` : ""}
      ${o.hold ? `<div class="note orange"><div><b>Do not leave yet.</b> This customer has not paid. Staff must confirm payment first.</div></div>` : ""}
      ${o.shop ? `<div class="note blue"><div><b>Collect from ${esc(o.shop.name)}</b>${o.shop.address ? "<br>" + esc(o.shop.address) : ""}${o.shop.phone ? ` · <a href="tel:${esc(o.shop.phone)}" style="font-weight:800">Call shop</a>` : ""}<br>${esc(itemsText(o.items))}<br><b>${o.mstatus === "ready" ? "Order is READY. You can collect it." : "Shop is still preparing. Please wait."}</b></div></div>` : ""}
      <div class="t2"><b>From:</b> ${esc(o.pickup)}</div><div class="t2"><b>To:</b> ${esc(o.dropoff)}</div>
      ${o.details ? `<div class="t2"><b>Note:</b> ${esc(o.details)}${o.budget ? " · Items budget " + K(o.budget) : ""}</div>` : ""}
      ${o.item_type ? `<div class="t2">${esc(o.item_type)}${o.item_size ? " · " + esc(o.item_size) : ""}</div>` : ""}
      <div class="d-row"><span class="badge ${o.pay_status === "confirmed" ? "" : "o"}">${o.pay_method === "cash" ? "Collect cash: " + K(o.total) + (o.shop ? " (delivery only)" : o.payer ? " from the " + o.payer + (o.payer === "receiver" || o.pay_when !== "pickup" ? " on delivery" : " at pick-up") : "") : PAY_NAME[o.pay_method] + (o.pay_status === "confirmed" ? " paid" : " awaiting") + (o.pay_status === "confirmed" ? "" : o.pay_when === "pickup" ? "" : "")}</span></div>
      ${o.receiver_phone ? `<div class="d-row small"><b>Sender:</b> ${esc(o.sender_name || "")} <a class="btn btn-ghost btn-sm" href="tel:${esc(o.sender_phone || "")}">Call ${esc(o.sender_phone || "")}</a></div>
        <div class="d-row small"><b>Receiver:</b> ${esc(o.receiver_name || "")} <a class="btn btn-ghost btn-sm" href="tel:${esc(o.receiver_phone)}">Call ${esc(o.receiver_phone)}</a><a class="btn btn-ghost btn-sm" href="https://wa.me/${intl(o.receiver_phone)}" target="_blank" rel="noopener">WhatsApp</a></div>`
      : `<div class="d-row"><a class="btn btn-ghost btn-sm" href="tel:${esc(o.customer_phone)}">Call ${esc(o.customer_name || "customer")}</a><a class="btn btn-ghost btn-sm" href="https://wa.me/${intl(o.customer_phone)}" target="_blank" rel="noopener">WhatsApp</a></div>`}
      ${next && !o.hold && !(o.shop && o.mstatus !== "ready") ? `<button class="btn btn-green" data-act="rdstage" data-id="${o.id}" data-v="${next[0]}">${next[1]}</button>` : ""}
      ${o.status === "on_the_way" || o.status === "picked_up" ? `<div class="d-row"><input class="input d-input" id="rc-${o.id}" inputmode="numeric" maxlength="4" placeholder="${o.receiver_phone ? "Receiver's" : "Customer's"} 4-digit code" style="flex:1"><button class="btn btn-orange btn-sm" data-act="rdcomplete" data-id="${o.id}">Complete</button></div>` : ""}
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
      const isLive = live.includes(o);
      return `<div class="d-order"><div class="d-row" style="justify-content:space-between"><b>Order ${esc(o.code)}</b><span class="badge ${o.merchant_status === "declined" || o.status === "cancelled" ? "g" : o.merchant_status === "pending" ? "o" : ""}">${o.status === "cancelled" ? "Cancelled" : o.status === "delivered" ? "Delivered" : o.status === "picked_up" || o.status === "on_the_way" ? "Collected" : MST[o.merchant_status] || ""}</span></div>
        ${(o.items || []).map((i) => `<div class="rowline"><span>${i.qty} × ${esc(i.name)}</span><b>${K(i.qty * i.price)}</b></div>`).join("")}
        ${o.details ? `<div class="t2">Note: ${esc(o.details)}</div>` : ""}
        <div class="hr"></div><div class="total" style="font-size:16px"><span>Customer pays you</span><span style="color:var(--green)">${K(o.items_total)}</span></div>
        <div class="t2">${esc(o.customer_name || "Customer")} · <a href="tel:${esc(o.customer_phone || "")}" style="color:var(--green);font-weight:700">${esc(o.customer_phone || "")}</a></div>
        <div class="d-row"><span class="badge ${o.shop_paid ? "" : "o"}">${o.shop_paid ? "You received the payment" : "Waiting for customer's payment"}</span>${o.rider ? `<span class="t2">Rider: ${esc(o.rider.name)}${o.rider.plate ? " · " + esc(o.rider.plate) : ""}</span>` : ""}</div>
        ${isLive && o.merchant_status === "pending" ? (o.shop_paid ? `<div class="d-row"><button class="btn btn-green btn-sm" data-act="mact" data-id="${o.id}" data-v="accept">Accept order</button><button class="btn btn-ghost btn-sm" style="color:#B3261E;border-color:#B3261E" data-act="mact" data-id="${o.id}" data-v="decline">Decline</button></div>`
          : `<div class="small">Check your mobile money for <b>${K(o.items_total)}</b> from ${esc(o.customer_name || "the customer")}. Only tap below once the money is in.</div><div class="d-row"><button class="btn btn-green btn-sm" data-act="mact" data-id="${o.id}" data-v="paid">Payment received</button><button class="btn btn-ghost btn-sm" style="color:#B3261E;border-color:#B3261E" data-act="mact" data-id="${o.id}" data-v="decline">Decline</button></div>`) : ""}
        ${isLive && o.merchant_status === "accepted" ? `<div class="d-row"><button class="btn btn-orange btn-sm" data-act="mact" data-id="${o.id}" data-v="ready">Order is ready</button><button class="btn btn-ghost btn-sm" style="color:#B3261E;border-color:#B3261E" data-act="mact" data-id="${o.id}" data-v="decline">Cancel order</button></div>` : ""}
        ${isLive && o.merchant_status === "ready" ? `<div class="small"><b>Ready.</b> A rider will come to collect it.</div>` : ""}
      </div>`;
    };
    const bl = d.bill || {}, pt = d.pay_to || {};
    const ptxt = ["mtn", "airtel", "zamtel"].filter((k) => pt[k]).map((k) => PAY_NAME[k] + " " + pt[k]).join(" · ") || "the number we give you";
    const billBox = bl.hidden ? `<div class="note orange" style="border:2px solid #B3261E"><div><b style="color:#B3261E">Your shop is hidden from customers.</b> ${K(bl.overdue)} of our fees is unpaid. Pay to ${esc(ptxt)} (reference: ${esc(me.name)}). Your shop shows again once staff record your payment.</div></div>`
      : bl.overdue > 0 ? `<div class="note orange"><div><b>${K(bl.overdue)} is due now.</b> Pay to ${esc(ptxt)} (reference: ${esc(me.name)}). If it stays unpaid for ${esc(bl.grace_days)} more days, your shop is hidden from customers.</div></div>`
      : bl.owed > 0 ? `<div class="note blue"><div>Our fee so far: <b>${K(bl.owed)}</b> (${K(bl.rate)} per delivered order). Pay it within ${esc(bl.due_days)} days of each delivery to ${esc(ptxt)}, reference: ${esc(me.name)}.</div></div>` : "";
    const noPay = !me.pay_number ? `<div class="note orange"><div><b>Add the number customers pay you on.</b> Open the <b>My shop</b> tab. Until you do, customers are shown your shop phone number.</div></div>` : "";
    body = `${billBox}${noPay}<div class="sec">New and active (${live.length})</div>${live.map(card).join("") || '<div class="small">No orders right now. This page updates by itself.</div>'}
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
      <div class="d-order"><div class="sec">Where customers pay you</div><div class="small">Customers pay you directly for their items. Enter the mobile money number they should send to.</div>
        <input class="input d-input" id="msPay" inputmode="tel" placeholder="e.g. 0977123456" value="${esc(me.pay_number || "")}">
        <select class="input d-input" id="msNet"><option value="">Which network?</option>${["mtn", "airtel", "zamtel"].map((k) => `<option value="${k}" ${me.pay_network === k ? "selected" : ""}>${PAY_NAME[k]}</option>`).join("")}</select>
        <button class="btn btn-green btn-sm" data-act="mpaysave">Save number</button></div>
      <div class="small">Our fee is ${K((d.bill || {}).rate)} for each delivered order. You keep all the money from your items. Call us on ${esc(OP.phone)} to change your shop name, phone or photo.</div>
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

/* ---------- agent page ---------- */
const AGENT_TERMS_VERSION = "v2";
function agentTermsHtml() {
  const me = A.data && A.data.me;
  const rb = me ? K(me.rider_bonus) : "the rider bonus on your page";
  const sb2 = me ? K(me.shop_bonus) : "the shop bonus on your page";
  const rg = me ? me.rider_goal : 5, sg = me ? me.shop_goal : 3;
  const T = [
    ["Who you are", `You are an independent agent of ${OP.name}. You are not an employee, you have no salary, and you work your own hours. Either of us can end this at any time.`],
    ["What you do", "You find honest riders and shops in your area, register them in this app with their agreement, and help them with their first days. You pass problems to our staff."],
    ["How you earn", `You earn ${rb} for each rider you register once that rider is approved by us and has completed ${rg} real deliveries. You earn ${sb2} for each shop you register once it is approved and has ${sg} delivered orders. Your page shows what you have earned, what we have paid and what we still owe you. We may change the amounts for future recruits, and we will tell you first.`],
    ["When you are paid", "We pay every Friday, by mobile money, to the number on your account. A bonus is paid on the first Friday that is at least 7 days after you earned it, so we can check the orders are real. We pay once your bonuses add up to K50 or more; a smaller amount waits and is added to the next one. We pay the mobile money charge, so you receive the full amount."],
    ["What does not count", "Orders placed by you, by the rider or shop themselves, or by their family. Fake or repeat orders made to collect a bonus. People who were already registered. Riders or shops we switch off for bad behaviour before they reach the goal. If we find cheating, we cancel the bonus, close your account and may report it to the police."],
    ["Tell the truth", "Only register people you have met in person. Use their real name and phone number, and only with their permission. We may refuse or remove any recruit. Never promise people how much they will earn."],
    ["PINs and privacy", "Let each person type their own PIN on your phone, then do not write it down or keep it. You cannot see customers' details and you must never ask riders or shops for them. Use the phone numbers you collect only for this work. Keep them private as the Zambian Data Protection Act requires."],
    ["Money", `Never take or hold money for ${OP.name}. Never charge a rider or a shop to join. Riders pay their day pass only to our official numbers, and shops are paid directly by their own customers. You do not handle anyone's money except the bonus we pay you.`],
    ["How you behave", "Be polite and honest. Do not discriminate. You represent us in your town, so follow the rules in our rider and staff guides. If a rider or shop breaks them, tell our staff."],
    ["Your recruits", "You are not responsible for what your recruits do, but we expect you to help us sort out problems with them."],
    ["Ending", "If you stop, bonuses you have already earned are still paid. We can switch off your account if you break these terms."],
    ["The law", "Zambian law applies to this agreement. These terms were written in plain language and may be updated. We will ask you to accept the new version."],
  ];
  return `<div class="d-order">${T.map((t, i) => `<div><b>${i + 1}. ${esc(t[0])}</b><div class="small" style="margin-top:2px">${esc(t[1])}</div></div>`).join("")}</div>`;
}
function vAgentTerms() {
  return `<div class="screen"><div class="pad">${topbar("Agent terms", "#/agent")}<div class="small">Version ${AGENT_TERMS_VERSION}. Please read before you start.</div>${agentTermsHtml()}</div></div>`;
}
function vAgent() {
  if (!A.token) {
    const reg = A.mode === "register";
    return `<div class="screen"><div class="pad">${topbar(reg ? "Become an agent" : "Agent sign-in", "#/account")}
      <div class="note green">${ic("user", "#1B6B35")}<div>${reg ? "Help riders and shops join " + esc(OP.name) + " and earn a bonus for each one. We will call you to approve your account." : "Sign in with your phone number and PIN."}</div></div>
      ${reg ? '<input class="input" id="aName" placeholder="Your full name" autocomplete="name">' : ""}
      <input class="input" id="aPhone" inputmode="tel" placeholder="Phone number" autocomplete="tel">
      ${reg ? '<input class="input" id="aArea" placeholder="Town or area you will work in">' : ""}
      <input class="input" id="aPin" type="password" inputmode="numeric" maxlength="6" placeholder="${reg ? "Choose a PIN (4 to 6 digits)" : "Your PIN"}">
      <button class="btn btn-green" data-act="${reg ? "aregister" : "alogin"}">${reg ? "Sign up" : "Sign in"}</button>
      <button class="btn btn-ghost" data-act="amode" data-v="${reg ? "login" : "register"}">${reg ? "I already have an account" : "New agent? Sign up"}</button>
      <a class="small" style="text-align:center;color:var(--green);font-weight:700" href="#/agentterms">Read the agent terms</a>
    </div></div>`;
  }
  const d = A.data;
  if (!d) return `<div class="screen"><div class="center-msg"><div class="spin"></div><div>Loading…</div></div></div>`;
  const me = d.me;
  const head = `<div class="hhead"><div class="brand"><div class="tile">${brandImg()}</div><b>Agent</b></div><div><div style="font-size:24px;font-weight:800">${esc(me.name)}</div><div style="opacity:.9;font-size:14px">${esc(me.area || "")}</div></div></div>`;
  if (me.terms_version !== AGENT_TERMS_VERSION || !me.terms_accepted_at) {
    return `<div class="screen">${head}<div class="pad" style="padding-top:18px"><div class="note orange"><div>Please read and accept the agent terms to start.</div></div>${agentTermsHtml()}
      <button class="btn btn-green" data-act="aaccept">I have read and I agree</button><button class="btn btn-ghost" data-act="alogout">Sign out</button></div></div>`;
  }
  const rs = (x) => x.approved === false ? ["o", "Waiting for approval"] : x.active ? ["", "Active"] : ["g", "Switched off"];
  const row = (x, goal, unit, extra) => { const st = rs(x); return `<div class="d-order"><div class="d-row" style="justify-content:space-between"><b>${esc(x.name)}</b><span class="badge ${st[0]}">${st[1]}</span></div><div class="t2">${esc(x.phone || "")}${extra ? " · " + esc(extra) : ""}</div>
    ${x.credited ? '<div class="small"><b>Bonus earned</b></div>' : x.approved === false || !x.active ? "" : `<div class="bar"><i style="width:${Math.min(100, Math.round(x.jobs / goal * 100))}%"></i></div><div class="t2">${x.jobs} of ${goal} ${unit}</div>`}</div>`; };
  const tabs3 = ["recruits", "add", "earnings"].map((t) => `<button class="chip ${A.tab === t ? "on" : ""}" data-act="atab" data-v="${t}">${{ recruits: "My recruits", add: "Register", earnings: "Earnings" }[t]}</button>`).join("");
  let body = "";
  if (A.tab === "recruits") {
    body = `<div class="sec">Riders (${d.riders.length})</div>${d.riders.map((x) => row(x, me.rider_goal, "deliveries done", x.plate)).join("") || '<div class="small">No riders yet. Tap Register to add one.</div>'}
      <div class="sec" style="margin-top:6px">Shops (${d.shops.length})</div>${d.shops.map((x) => row(x, me.shop_goal, "orders delivered", (CAT[x.category] || CAT.other).name)).join("") || '<div class="small">No shops yet.</div>'}`;
  } else if (A.tab === "add") {
    body = `<div class="note blue"><div>Only register people you have met. Hand them your phone so they type their own PIN. Do not keep it. We will call them to approve.</div></div>
      <div class="d-order"><div class="sec">Register a rider</div>
        <input class="input d-input" id="arN" placeholder="Rider full name"><input class="input d-input" id="arP" inputmode="tel" placeholder="Rider phone number"><input class="input d-input" id="arL" placeholder="Bike plate number (optional)">
        <input class="input d-input" id="arI" type="password" inputmode="numeric" maxlength="6" placeholder="Rider's PIN (4 to 6 digits)"><button class="btn btn-green btn-sm" data-act="aaddrider">Register rider</button></div>
      <div class="d-order"><div class="sec">Register a shop</div>
        <input class="input d-input" id="asN" placeholder="Shop name"><input class="input d-input" id="asP" inputmode="tel" placeholder="Shop phone number">
        <select class="input d-input" id="asC"><option value="grocery">Groceries</option><option value="bakery">Cakes &amp; bakery</option><option value="food">Food &amp; takeaways (shawarma, chicken...)</option><option value="other">Other</option></select>
        <input class="input d-input" id="asA" placeholder="Shop address or landmark"><input class="input d-input" id="asI" type="password" inputmode="numeric" maxlength="6" placeholder="Shop's PIN (4 to 6 digits)"><button class="btn btn-green btn-sm" data-act="aaddshop">Register shop</button></div>`;
  } else {
    body = `<div class="d-order"><div class="sec">How you earn</div><div class="small">${K(me.rider_bonus)} for each rider who completes ${me.rider_goal} deliveries.<br>${K(me.shop_bonus)} for each shop with ${me.shop_goal} delivered orders.<br>Orders made by you, or by the rider or shop themselves, do not count.</div></div>
      <div class="sec">Payments to you</div>${d.payouts.map((p) => `<div class="rowline"><span>${new Date(p.created_at).toLocaleDateString("en-GB")}${p.note ? " · " + esc(p.note) : ""}</span><b>${K(p.amount)}</b></div>`).join("") || '<div class="small">Nothing paid yet.</div>'}
      <div class="small">Accepted the agent terms (${esc(me.terms_version)}) on ${new Date(me.terms_accepted_at).toLocaleDateString("en-GB")}. <a href="#/agentterms" style="color:var(--green);font-weight:700">Read them again</a></div>
      <button class="btn btn-ghost" data-act="alogout">Sign out</button>`;
  }
  return `<div class="screen">${head}<div class="pad" style="padding-top:18px">
    <div class="stat3"><div><span>Earned</span><b>${K(d.earned)}</b></div><div><span>Paid to you</span><b>${K(d.paid)}</b></div><div class="owed"><span>We owe you</span><b>${K(d.owed)}</b></div></div>
    <div class="chips">${tabs3}</div>${body}</div></div>`;
}
async function loadAgent(keepFocus) {
  if (!A.token) return;
  if (keepFocus && $app.contains(document.activeElement) && /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
  try {
    const d = await rpc("deli_agent_data", { p_token: A.token });
    if (d && d.error) { A.token = null; A.data = null; store.set("atoken", null); toast("Please sign in again"); } else A.data = d;
  } catch (e) { toast(e.message); }
  if (location.hash.startsWith("#/agent")) render(true);
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
      if (!M.token && M.mode !== "register") { location.hash = "#/signin"; return; }
      html = vMerchant();
      if (!soft && M.token) { loadMerchant(); timer = setInterval(() => loadMerchant(true), 8000); }
      break;
    case "agent":
      if (!A.token && A.mode !== "register") { location.hash = "#/signin"; return; }
      html = vAgent();
      if (!soft && A.token) { loadAgent(); timer = setInterval(() => loadAgent(true), 15000); }
      break;
    case "agentterms": html = vAgentTerms(); break;
    case "delivery": case "errand": case "ride":
      if (draft.service !== route) { draft = Object.assign(blankDraft(), { service: route, pay_method: draft.pay_method || "mtn" }); saveDraft(); }
      html = vBook(route); break;
    case "pay": html = vPay(); if (!soft) checkCust(); break;
    case "track": case "delivered": return renderOrder(route, arg, soft);
    case "orders": return renderOrders(soft);
    case "help": html = vHelp(); break;
    case "account": html = vAccount(); break;
    case "signin": html = vSignin(); break;
    case "join": html = vJoin(); break;
    case "rider":
      if (!R.token && R.mode !== "register") { location.hash = "#/signin"; return; }
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
  if (t.id === "uId") { const pw = document.getElementById("uPw"); if (pw) pw.inputMode = /^[0-9+\s]*$/.test(t.value) ? "numeric" : "text"; }
});
$app.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.id === "uPw") { const b = $app.querySelector("[data-act=signin]"); if (b) b.click(); } });

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
  if (t.dataset && t.dataset.dop) { dispatch.op = t.value; store.set("dop", t.value); dispatch.orders = []; dispatch.riders = []; dispatch.customers = []; dispatch.passes = []; dispatch.merchants = []; dispatch.owed = []; dispatch.agents = []; dispatch.agentList = []; dispatch.settings = {}; render(true); loadDispatch(); }
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
  else if (a === "who") { draft.who = v; draft.payer = v; if (v === "receiver") draft.pay_method = "cash"; saveDraft(); render(true); }
  else if (a === "payer") { draft.payer = v; if (v === "receiver") draft.pay_method = "cash"; saveDraft(); render(true); }
  else if (a === "paywhen") { draft.pay_when = v; saveDraft(); render(true); }
  else if (a === "pickcontact") {
    try {
      const r = await navigator.contacts.select(["name", "tel"], { multiple: false });
      if (r && r[0]) {
        const c = r[0];
        if (c.tel && c.tel[0]) draft.o_phone = String(c.tel[0]).replace(/[^\d+]/g, "");
        if (c.name && c.name[0]) draft.o_name = c.name[0];
        saveDraft(); render(true);
      }
    } catch { toast("Could not open your contacts. Please type the number."); }
  }
  else if (a === "copy") { try { await navigator.clipboard.writeText(v); toast("Number copied"); } catch { toast(v); } }
  else if (a === "topay") {
    const svc = el.dataset.svc;
    if (draft.pickup.trim().length < 2 || draft.dropoff.trim().length < 2) return toast("Please fill in both places");
    if (svc === "errand" && draft.details.trim().length < 3) return toast("Please say what we should get");
    if (svc === "delivery") {
      const rcv = draft.who === "receiver";
      if (draft.o_phone.replace(/\D/g, "").length < 9) return toast(rcv ? "Please enter the sender's phone number" : "Please enter the receiver's phone number");
      if (!rcv && draft.o_name.trim().length < 2) return toast("Please enter the receiver's name");
    }
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
        ...(svc === "delivery" ? (() => { const rcv = draft.who === "receiver";
          const mine = { n: account.name, p: account.phone }, other = { n: draft.o_name, p: draft.o_phone };
          const s2 = rcv ? other : mine, r2 = rcv ? mine : other;
          return { p_sender_name: s2.n || null, p_sender_phone: s2.p, p_receiver_name: r2.n || null, p_receiver_phone: r2.p, p_payer: draft.payer, p_pay_when: draft.pay_method === "cash" ? draft.pay_when : "pickup" }; })() : {}),
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
  /* one sign-in for everyone */
  else if (a === "signin") {
    const idv = document.getElementById("uId").value.trim(), pw = document.getElementById("uPw").value;
    if (!idv || !pw) return toast("Enter your phone number or email, and your PIN or password");
    el.disabled = true;
    try {
      if (idv.includes("@")) {
        if (!sb) return toast("The app is not connected to its database yet.");
        const { data, error } = await sb.auth.signInWithPassword({ email: idv, password: pw });
        if (error) return toast("Wrong email or password");
        dispatch.session = data.session; dispatch.role = undefined; dispatch.me = null; dispatch.isSuper = undefined; location.hash = "#/dispatch"; render();
      } else {
        const tries = [["rider", "deli_rider_login"], ["merchant", "deli_merchant_login"], ["agent", "deli_agent_login"]];
        const rs = await Promise.all(tries.map(([k, fn]) => rpc(fn, { p_phone: idv, p_pin: pw, p_op: OP.id }).then((r) => ({ k, r })).catch((e) => ({ k, r: { error: e.message } }))));
        const ok = rs.filter((x) => x.r && x.r.token);
        if (!ok.length) { const msg = rs.map((x) => x.r && x.r.error).find((e) => e && e !== "Wrong phone or PIN"); return toast(msg || "Wrong phone or PIN"); }
        ok.forEach(({ k, r }) => {
          if (k === "rider") { R.token = r.token; store.set("rtoken", r.token); R.data = null; }
          else if (k === "merchant") { M.token = r.token; store.set("mtoken", r.token); M.data = null; M.tab = "orders"; }
          else { A.token = r.token; store.set("atoken", r.token); A.data = null; A.tab = "recruits"; }
        });
        if (ok.length === 1) { S.choices = null; location.hash = ROLE[ok[0].k][1]; render(); }
        else { S.choices = ok.map((x) => x.k); render(); }
      }
    } catch (err) { toast(err.message); }
    finally { el.disabled = false; }
  }
  else if (a === "spick") { S.choices = null; location.hash = ROLE[v][1]; render(); }
  else if (a === "signoutall") {
    R.token = null; R.data = null; store.set("rtoken", null); M.token = null; M.data = null; store.set("mtoken", null); A.token = null; A.data = null; store.set("atoken", null);
    if (sb) { try { await sb.auth.signOut(); } catch {} } dispatch.session = null; dispatch.role = undefined; dispatch.me = null; dispatch.isSuper = undefined; dispatch.orders = []; dispatch.riders = []; S.choices = null; toast("Signed out"); render();
  }
  else if (a === "join") { ({ rider: R, merchant: M, agent: A })[v].mode = "register"; location.hash = ROLE[v][1]; render(); }
  /* agent */
  else if (a === "amode") { A.mode = v; render(true); }
  else if (a === "alogin") {
    try {
      const r = await rpc("deli_agent_login", { p_phone: document.getElementById("aPhone").value, p_pin: document.getElementById("aPin").value, p_op: OP.id });
      if (r.error) return toast(r.error);
      A.token = r.token; store.set("atoken", r.token); A.data = null; A.tab = "recruits"; render();
    } catch (err) { toast(err.message); }
  }
  else if (a === "aregister") {
    try {
      await rpc("deli_agent_register", { p_name: document.getElementById("aName").value, p_phone: document.getElementById("aPhone").value, p_area: document.getElementById("aArea").value, p_pin: document.getElementById("aPin").value, p_op: OP.id });
      A.mode = "login"; render(true); toast("Thanks! We will call you once your account is approved.");
    } catch (err) { toast(err.message); }
  }
  else if (a === "alogout") { A.token = null; A.data = null; store.set("atoken", null); render(); }
  else if (a === "atab") { A.tab = v; render(true); }
  else if (a === "aaccept") { try { await rpc("deli_agent_accept_terms", { p_token: A.token, p_version: AGENT_TERMS_VERSION }); toast("Thank you. You can start now."); loadAgent(); } catch (err) { toast(err.message); } }
  else if (a === "aaddrider") {
    const g = (i) => document.getElementById(i);
    try {
      await rpc("deli_agent_add_rider", { p_token: A.token, p_name: g("arN").value, p_phone: g("arP").value, p_plate: g("arL").value, p_pin: g("arI").value });
      ["arN", "arP", "arL", "arI"].forEach((i) => (g(i).value = "")); toast("Rider registered. We will call them to approve."); A.tab = "recruits"; loadAgent();
    } catch (err) { toast(err.message); }
  }
  else if (a === "aaddshop") {
    const g = (i) => document.getElementById(i);
    try {
      await rpc("deli_agent_add_shop", { p_token: A.token, p_name: g("asN").value, p_phone: g("asP").value, p_category: g("asC").value, p_address: g("asA").value, p_pin: g("asI").value });
      ["asN", "asP", "asA", "asI"].forEach((i) => (g(i).value = "")); toast("Shop registered. We will call them to approve."); A.tab = "recruits"; loadAgent();
    } catch (err) { toast(err.message); }
  }
  /* staff: agents */
  else if (a === "addplaces") {
    const names = document.getElementById("plN").value.split(/\n|,/).map((x) => x.trim()).filter((x) => x.length >= 2);
    if (!names.length) return toast("Type at least one place");
    try { const n = await rpc("deli_staff_add_places", { p_op: dispatch.op, p_names: names }); toast(n + " place" + (n === 1 ? "" : "s") + " added"); await loadPlaces(dispatch.op); render(true); } catch (err) { toast(err.message); }
  }
  else if (a === "addplace1") {
    try { await rpc("deli_staff_add_places", { p_op: dispatch.op, p_names: [el.dataset.name] }); toast("Added to places"); await loadPlaces(dispatch.op); render(true); } catch (err) { toast(err.message); }
  }
  else if (a === "delplace") {
    if (!twice("dpl" + id, "Tap again to remove this place")) return;
    try { await rpc("deli_staff_remove_place", { p_id: id }); toast("Removed"); await loadPlaces(dispatch.op); render(true); } catch (err) { toast(err.message); }
  }
  else if (a === "addagent") {
    const g = (i) => document.getElementById(i).value.trim();
    if (g("gaN").length < 2) return toast("Enter the agent's name");
    if (!/^[0-9]{4,6}$/.test(g("gaI"))) return toast("PIN must be 4 to 6 digits");
    try { await rpc("deli_staff_add_agent", { p_op: dispatch.op, p_name: g("gaN"), p_phone: g("gaP"), p_area: g("gaA"), p_pin: g("gaI"), p_rider_bonus: Number(g("gaR") || 0), p_shop_bonus: Number(g("gaS") || 0) }); toast("Agent added. They accept the terms when they first sign in."); loadDispatch(); } catch (err) { toast(err.message); }
  }
  else if (a === "gapprove") { try { await rpc("deli_staff_update_agent", { p_id: id, p_patch: { approved: true, active: true } }); toast("Agent approved"); loadDispatch(); } catch (err) { toast(err.message); } }
  else if (a === "gactive") { try { await rpc("deli_staff_update_agent", { p_id: id, p_patch: { active: v === "1" } }); loadDispatch(); } catch (err) { toast(err.message); } }
  else if (a === "grates") {
    const n = (i) => Number(document.getElementById(i + id).value);
    try { await rpc("deli_staff_update_agent", { p_id: id, p_patch: { rider_bonus: n("gr-"), shop_bonus: n("gs-"), rider_goal: n("grg-"), shop_goal: n("gsg-") } }); toast("Saved. Applies to bonuses not yet earned."); loadDispatch(); } catch (err) { toast(err.message); }
  }
  else if (a === "gpin") {
    const pin = (document.getElementById("gp-" + id).value || "").trim();
    if (!/^[0-9]{4,6}$/.test(pin)) return toast("Type a PIN of 4 to 6 digits first");
    try { await rpc("deli_staff_set_agent_pin", { p_agent: id, p_pin: pin }); document.getElementById("gp-" + id).value = ""; toast("PIN saved"); } catch (err) { toast(err.message); }
  }
  else if (a === "gpaid") {
    const amt = Number(document.getElementById("gpa-" + id).value);
    if (!(amt > 0)) return toast("Type the amount you paid first");
    if (!twice("gpd" + id, "Tap again once you have paid the agent K" + amt)) return;
    try { await rpc("deli_staff_agent_payout", { p_agent: id, p_amount: amt, p_note: document.getElementById("gpn-" + id).value }); toast("Payout recorded"); loadDispatch(); } catch (err) { toast(err.message); }
  }
  else if (a === "gvoid") {
    if (!twice("gv" + id, "Tap again to cancel this bonus")) return;
    try { await rpc("deli_staff_void_credit", { p_id: id }); toast("Bonus cancelled"); loadDispatch(); } catch (err) { toast(err.message); }
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
    try { const ok = await rpc("deli_merchant_order_action", { p_token: M.token, p_id: id, p_action: v }); toast(ok ? (v === "accept" ? "Order accepted" : v === "paid" ? "Payment noted. You can accept the order now." : v === "ready" ? "Marked ready" : "Order declined") : "Sorry, that did not work"); loadMerchant(); } catch (err) { toast(err.message); loadMerchant(); }
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
  else if (a === "mpaysave") {
    const num = document.getElementById("msPay").value.trim(), net = document.getElementById("msNet").value;
    if (!net) return toast("Please choose the network");
    try { await rpc("deli_merchant_set_pay", { p_token: M.token, p_number: num, p_network: net }); toast("Saved"); loadMerchant(); } catch (err) { toast(err.message); }
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
    dispatch.session = data.session; dispatch.role = undefined; dispatch.me = null; dispatch.isSuper = undefined; render();
  }
  else if (a === "logout") { await sb.auth.signOut(); dispatch.session = null; dispatch.role = undefined; dispatch.me = null; dispatch.isSuper = undefined; dispatch.orders = []; dispatch.riders = []; location.hash = "#/signin"; render(); }
  else if (a === "dtab") { dispatch.tab = v; render(true); if (v === "operators" || v === "agents" || v === "merchants" || v === "team") loadDispatch(); if (v === "places") loadPlaces(dispatch.op).then(() => render(true)); }
  else if (a === "refresh") loadDispatch();
  else if (a === "adddisp") {
    const em = document.getElementById("tdE").value.trim(); if (!em.includes("@")) return toast("Type their email");
    try { await rpc("deli_staff_add_dispatcher", { p_op: dispatch.op, p_email: em, p_name: document.getElementById("tdN").value }); toast("Dispatcher added. They can sign in with that email."); loadDispatch(); } catch (err) { toast(err.message); }
  }
  else if (a === "deldisp") {
    if (!twice("dd" + id, "Tap Remove again to remove this dispatcher")) return;
    try { await rpc("deli_staff_remove_dispatcher", { p_op: dispatch.op, p_email: id }); toast("Removed"); loadDispatch(); } catch (err) { toast(err.message); }
  }
  else if (a === "assign") {
    const rid = document.getElementById("rs-" + id).value; if (!rid) return toast("Choose a rider first");
    const o = dispatch.orders.find((x) => x.id === id);
    if (dispatch.role === "dispatcher") { try { await rpc("deli_dispatch_assign", { p_order: id, p_rider: rid }); toast("Rider assigned"); loadDispatch(); } catch (err) { toast(err.message); } return; }
    const { error } = await sb.from("deli_orders").update({ rider_id: rid, status: o.status === "placed" ? "accepted" : o.status }).eq("id", id);
    error ? toast(error.message) : (toast("Rider assigned"), loadDispatch());
  }
  else if (a === "status") {
    if (v === "cancelled" && !twice("c" + id, "Tap Cancel again to cancel this order")) return;
    if (v === "delivered" && !twice("d" + id, "Tap Complete order again to confirm")) return;
    if (dispatch.role === "dispatcher") { try { await rpc("deli_dispatch_status", { p_order: id, p_status: v }); loadDispatch(); } catch (err) { toast(err.message); } return; }
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
  else if (a === "clearinc" && dispatch.role === "dispatcher") { try { await rpc("deli_dispatch_clear_alert", { p_order: id }); loadDispatch(); } catch (err) { toast(err.message); } }
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
    const { data: nm, error } = await sb.from("deli_merchants").insert({ operator_id: dispatch.op, name, phone: document.getElementById("nmP").value.trim(), category: document.getElementById("nmC").value, address: document.getElementById("nmA").value.trim(), featured: document.getElementById("nmF").checked, approved: true }).select().single();
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
  else if (a === "mpin") {
    const pin = (document.getElementById("mp-" + id).value || "").trim();
    if (!/^[0-9]{4,6}$/.test(pin)) return toast("Type a PIN of 4 to 6 digits first");
    try { await rpc("deli_staff_set_merchant_pin", { p_merchant: id, p_pin: pin }); document.getElementById("mp-" + id).value = ""; toast("PIN saved"); } catch (err) { toast(err.message); }
  }
  else if (a === "mfeepaid") {
    const amt = Number(document.getElementById("mfa-" + id).value);
    if (!(amt > 0)) return toast("Enter the amount the shop paid");
    if (!twice("mfp" + id, "Tap again to record this payment")) return;
    try { await rpc("deli_staff_merchant_payment", { p_merchant: id, p_amount: amt, p_note: document.getElementById("mfn-" + id).value.trim() || null }); toast("Payment recorded"); shopsData = null; loadDispatch(); } catch (err) { toast(err.message); }
  }
  else if (a === "mfeevoid") {
    if (!twice("mfv" + id, "Tap again to cancel this payment")) return;
    try { await rpc("deli_staff_void_merchant_payment", { p_id: id }); toast("Payment cancelled"); shopsData = null; loadDispatch(); } catch (err) { toast(err.message); }
  }
  else if (a === "rtrust") { await sb.from("deli_riders").update({ trusted: v === "1" }).eq("id", id); loadDispatch(); }
  else if (a === "ractive") { await sb.from("deli_riders").update({ active: v === "1" }).eq("id", id); loadDispatch(); }
  else if (a === "savesettings") {
    const keys = ["fee_delivery", "fee_errand", "fee_ride", "fee_service", "cash_limit_new", "day_pass", "merchant_fee", "merchant_due_days", "merchant_grace_days", "pay_to_mtn", "pay_to_airtel", "pay_to_zamtel"];
    const rows = keys.map((k) => ({ operator_id: dispatch.op, key: k, value: document.getElementById("st-" + k).value.trim() }));
    for (const r of rows.slice(0, 9)) if (!(Number(r.value) >= 0) || r.value === "") return toast("Prices and days must be numbers");
    const { error } = await sb.from("deli_settings").upsert(rows, { onConflict: "operator_id,key" });
    error ? toast(error.message) : (toast("Saved"), loadFees(), loadDispatch());
  }
});

async function loadPlaces(op) {
  try { const r = await rpc("deli_places", { p_op: op || OP.id }); if (Array.isArray(r)) { placesList = r; store.set("places", r); } } catch {}
}
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
loadOperator().then(() => Promise.all([loadFees(), loadPlaces()])).finally(() => render());
if (sb) { sb.auth.getSession().then(({ data }) => { if (data && data.session && !dispatch.session) { dispatch.session = data.session; if (location.hash.startsWith("#/account")) render(true); } }).catch(() => {}); }
