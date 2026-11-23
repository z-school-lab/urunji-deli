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
};
const ic = (n, c = "currentColor", s = 24) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n] || ""}</svg>`;

/* ---------- state ---------- */
let fees = { delivery: 15, errand: 20, ride: 25, service: 3 };
const blankDraft = () => ({ pickup: "", dropoff: "", item_type: "Parcel", item_size: "Small", details: "", budget: "", pay_method: "mtn" });
let draft = Object.assign(blankDraft(), store.get("draft", {}));
let account = store.get("account", { name: "", phone: "" });
let timer = null;
let lastSig = "";
let dispatch = { session: null, tab: "orders", orders: [], riders: [], settings: {}, loading: false };
let R = { token: store.get("rtoken", null), data: null, mode: "login" };

const saveDraft = () => store.set("draft", draft);
const myOrders = () => store.get("orders", []);
const addOrder = (code, service) => store.set("orders", [{ code, service, at: Date.now() }, ...myOrders().filter((o) => o.code !== code)].slice(0, 30));
const rpc = async (fn, args) => {
  if (!sb) throw new Error("The app is not connected yet. Please try again later.");
  const { data, error } = await sb.rpc(fn, args || {});
  if (error) throw new Error(error.message || "Something went wrong");
  return data;
};

/* ---------- shared pieces ---------- */
const tabs = (on) => `<nav class="tabs">
  <a href="#/home" class="${on === "home" ? "on" : ""}">${ic("home")}Home</a>
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
    <div class="logo-tile"><img src="logo.png" alt="Urunji Deli"></div>
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

function vHome() {
  const act = myOrders();
  return `<div class="screen">
    <div class="hhead"><div class="brand"><div class="tile"><img src="logo.png" alt=""></div><b>Urunji Deli</b></div>
      <div><div style="font-size:26px;font-weight:800;letter-spacing:-.5px">${account.name ? "Hello, " + esc(account.name.split(" ")[0]) : "Hello there"}</div>
      <div style="opacity:.9;font-size:15px;margin-top:2px">What do you need today?</div></div></div>
    <div class="pad" style="padding-top:20px">
      <div class="tiles">
        <a class="tile-btn" href="#/delivery"><div class="ic" style="background:var(--green-t)">${ic("bag", "#1B6B35", 28)}</div>Delivery</a>
        <a class="tile-btn" href="#/errand"><div class="ic" style="background:var(--orange-t)">${ic("bike", "#C8700F", 28)}</div>Errand</a>
        <a class="tile-btn" href="#/ride"><div class="ic" style="background:var(--blue-t)">${ic("car", "#0B1F3A", 28)}</div>Ride</a>
      </div>
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
    <div class="card"><div class="rowline"><span>${SVC[svc]} fee</span><b>${K(fees[svc])}</b></div><div class="rowline"><span>Service fee</span><b>${K(fees.service)}</b></div><div class="hr"></div><div class="total"><span>Total</span><span>${K(money(svc))}</span></div></div>
    <button class="btn btn-green" data-act="topay" data-svc="${svc}">Continue to pay</button>
  </div></div>`;
}

function vPay() {
  const svc = draft.service || "delivery";
  const acc = account;
  const m = ["mtn", "airtel", "zamtel", "cash"];
  return `<div class="screen"><div class="pad">
    ${topbar("Pay", "#/" + svc)}
    <div class="card"><div class="rowline"><span>${SVC[svc]}</span><b>${K(fees[svc])}</b></div><div class="rowline"><span>Service fee</span><b>${K(fees.service)}</b></div><div class="hr"></div><div class="total"><span>Total</span><span>${K(money(svc))}</span></div></div>
    <div class="sec">Your details</div>
    <input class="input" data-bind-acc="name" placeholder="Your name" value="${esc(acc.name)}" autocomplete="name">
    <input class="input" data-bind-acc="phone" inputmode="tel" placeholder="Phone number e.g. 0977123456" value="${esc(acc.phone)}" autocomplete="tel">
    <div class="sec">How will you pay?</div>
    ${m.map((k) => `<label class="pm ${draft.pay_method === k ? "on" : ""}"><span class="ic">${k === "cash" ? "K" : k === "mtn" ? "M" : k === "airtel" ? "A" : "Z"}</span><span class="nm">${PAY_NAME[k]}</span><input type="radio" name="pm" data-act="pm" data-v="${k}" ${draft.pay_method === k ? "checked" : ""}></label>`).join("")}
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
  const total = Number(o.delivery_fee) + Number(o.service_fee);
  const r = o.rider;
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
      <path d="M90 230 C150 180 180 150 230 140 S320 90 350 70" stroke="#1B6B35" stroke-width="5" stroke-dasharray="2 10" stroke-linecap="round" fill="none"/>
      <circle cx="90" cy="230" r="10" fill="#1B6B35" stroke="#fff" stroke-width="3"/><rect x="342" y="62" width="18" height="18" rx="4" fill="#F28C28" stroke="#fff" stroke-width="3"/></svg></div>
    <div class="sheet"><div class="grab"></div>
      <div class="orow"><div class="grow"><div style="font-size:20px;font-weight:800">${STATUS_TXT[o.status]}</div><div class="t2">${SVC[o.service]} · ${esc(o.code)}</div></div><span class="badge ${o.status === "cancelled" ? "g" : ""}">${K(total)}</span></div>
      ${o.status !== "cancelled" ? stepBar(o.status) : ""}
      ${r ? `<div class="rider"><div class="avatar">${esc(initials(r.name))}</div><div class="grow"><div class="t1">${esc(r.name)}</div><div class="t2">${esc(r.plate || "Your rider")}</div></div>
        ${r.phone ? `<a class="circle" href="tel:${esc(r.phone)}" aria-label="Call rider">${ic("phone", "#0B1F3A", 20)}</a><a class="circle g" href="https://wa.me/${intl(r.phone)}" target="_blank" rel="noopener" aria-label="WhatsApp rider">${ic("chat", "#fff", 20)}</a>` : ""}</div>`
      : o.status === "placed" ? `<div class="note blue"><div>We are finding you a rider. This page updates by itself.</div></div>` : ""}
      ${o.status !== "delivered" && o.status !== "cancelled" ? `<div class="codebox"><div><div class="t1">${label}</div><div class="small">When you get your ${o.service === "ride" ? "ride" : "order"}, tap the green button below, or give the rider this code.</div></div><div class="digits">${String(o.delivery_code).split("").map((d) => `<span>${d}</span>`).join("")}</div></div>` : ""}
      ${payBox}
      <div class="card"><div class="rowline"><span>From</span><b>${esc(o.pickup)}</b></div><div class="rowline"><span>To</span><b>${esc(o.dropoff)}</b></div>${o.details ? `<div class="rowline"><span>Note</span><b>${esc(o.details)}</b></div>` : ""}</div>
      ${o.status === "picked_up" || o.status === "on_the_way" ? `<button class="btn btn-green" data-act="received" data-code="${esc(o.code)}">${o.service === "ride" ? "I have arrived safely" : "I have received my order"}</button>` : ""}
      ${o.status === "delivered" ? `<a class="btn btn-green" href="#/delivered/${esc(o.code)}">Rate your rider</a>` : ""}
      <a class="btn btn-ghost" href="https://wa.me/${intl(CFG.SUPPORT_PHONE)}?text=${encodeURIComponent("Hello Urunji Deli, order " + o.code)}" target="_blank" rel="noopener">Need help? WhatsApp us</a>
    </div></div>`;
}

function vDelivered(o) {
  if (!o) return `<div class="screen"><div class="center-msg"><div class="spin"></div></div></div>`;
  const rated = o.rating;
  return `<div class="screen"><div class="dhead"><div class="bigcheck">${ic("check", "#1B6B35", 44)}</div>
      <div style="font-size:28px;font-weight:800">${o.service === "ride" ? "You have arrived" : "Delivered!"}</div><div style="opacity:.92">Thank you for using Urunji Deli.</div></div>
    <div class="pad">
      <div class="card" style="align-items:center;text-align:center"><div class="sec">${rated ? "Thanks for your rating" : "How was your rider?"}</div>
        <div class="stars">${[1, 2, 3, 4, 5].map((n) => `<button class="star" data-act="rate" data-v="${n}" data-code="${esc(o.code)}" ${rated ? "disabled" : ""} aria-label="${n} stars">${ic("star", n <= (rated || 0) ? "#F28C28" : "#C9D3CB", 40).replace('fill="none"', `fill="${n <= (rated || 0) ? "#F28C28" : "none"}"`)}</button>`).join("")}</div></div>
      <div class="card"><div class="rowline"><span>Order</span><b>${esc(o.code)}</b></div><div class="rowline"><span>Total</span><b>${K(Number(o.delivery_fee) + Number(o.service_fee))}</b></div></div>
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
  const wa = `https://wa.me/${intl(CFG.SUPPORT_PHONE)}`;
  return `<div class="screen"><div class="pad" style="padding-bottom:12px"><div class="h1">Help</div>
    <div class="card"><div class="t1">Talk to us</div><div class="small">We reply fast on WhatsApp.</div>
      <a class="btn btn-green" href="${wa}" target="_blank" rel="noopener">WhatsApp us</a><a class="btn btn-ghost" href="tel:${esc(CFG.SUPPORT_PHONE)}">Call ${esc(CFG.SUPPORT_PHONE)}</a></div>
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
  const tabsHtml = ["orders", "riders", "settings"].map((t) => `<button class="chip ${D.tab === t ? "on" : ""}" data-act="dtab" data-v="${t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join("");
  let body = "";
  if (D.tab === "orders") {
    const active = D.orders.filter((o) => !["delivered", "cancelled"].includes(o.status));
    const done = D.orders.filter((o) => ["delivered", "cancelled"].includes(o.status)).slice(0, 12);
    const card = (o) => {
      const trusted = o.service === "delivery" ? D.riders.filter((r) => r.active) : D.riders.filter((r) => r.active && r.trusted);
      const isOpen = !["delivered", "cancelled"].includes(o.status);
      const rider = D.riders.find((r) => r.id === o.rider_id);
      return `<div class="d-order"><div class="d-row" style="justify-content:space-between"><b>${SVC[o.service]} · ${esc(o.code)}</b><span class="badge ${o.status === "delivered" ? "" : o.status === "cancelled" ? "g" : "o"}">${STATUS_TXT[o.status]}</span></div>
        <div class="t2">${esc(o.pickup)} → ${esc(o.dropoff)}</div>
        ${o.details ? `<div class="t2">Note: ${esc(o.details)}${o.budget ? " · Budget " + K(o.budget) : ""}</div>` : ""}
        <div class="t2">${esc(o.customer_name || "Customer")} · <a href="tel:${esc(o.customer_phone)}" style="color:var(--green);font-weight:700">${esc(o.customer_phone)}</a> · <a href="https://wa.me/${intl(o.customer_phone)}" target="_blank" rel="noopener" style="color:var(--green);font-weight:700">WhatsApp</a></div>
        <div class="d-row"><span class="badge ${o.pay_status === "confirmed" ? "" : "o"}">${PAY_NAME[o.pay_method]}: ${o.pay_status}</span><b>${K(Number(o.delivery_fee) + Number(o.service_fee))}</b>
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
    body = `<div class="sec">Active (${active.length})</div><div class="d-grid">${active.map(card).join("") || '<div class="small">No active orders.</div>'}</div>
      <div class="sec" style="margin-top:10px">Recent</div><div class="d-grid">${done.map(card).join("") || '<div class="small">Nothing yet.</div>'}</div>`;
  } else if (D.tab === "riders") {
    body = `<div class="d-order"><div class="sec">Add a rider</div><div class="d-row"><input class="input d-input" id="rN" placeholder="Name" style="flex:1;min-width:130px"><input class="input d-input" id="rP" placeholder="Phone" style="flex:1;min-width:130px"><input class="input d-input" id="rL" placeholder="Plate / bike" style="flex:1;min-width:110px"><input class="input d-input" id="rI" inputmode="numeric" maxlength="6" placeholder="Login PIN (4-6 digits)" style="flex:1;min-width:140px"></div>
      <label class="d-row small"><input type="checkbox" id="rT"> Trusted rider (can take errands and rides)</label><button class="btn btn-green btn-sm" data-act="addrider">Add rider</button></div>
      <div class="d-grid" style="margin-top:12px">${D.riders.map((r) => `<div class="d-order"><div class="d-row" style="justify-content:space-between"><b>${esc(r.name)} ${r.trusted ? "★" : ""}</b><span class="badge ${r.approved === false ? "o" : r.active ? "" : "g"}">${r.approved === false ? "Waiting for approval" : r.active ? (r.online ? "Online" : "Active") : "Off"}</span></div><div class="t2">${esc(r.phone || "")} · ${esc(r.plate || "")}</div>
        <div class="d-row">${r.approved === false ? `<button class="btn btn-green btn-sm" data-act="rapprove" data-id="${r.id}">Approve</button>` : ""}<button class="btn btn-ghost btn-sm" data-act="rsetpin" data-id="${r.id}">Set PIN</button><button class="btn btn-ghost btn-sm" data-act="rtrust" data-id="${r.id}" data-v="${r.trusted ? 0 : 1}">${r.trusted ? "Remove trusted" : "Make trusted"}</button><button class="btn btn-ghost btn-sm" data-act="ractive" data-id="${r.id}" data-v="${r.active ? 0 : 1}">${r.active ? "Switch off" : "Switch on"}</button></div></div>`).join("")}</div>`;
  } else {
    const s = D.settings;
    const f = (k, l) => `<div><label class="lbl">${l}</label><input class="input d-input" id="st-${k}" value="${esc(s[k] ?? "")}"></div>`;
    body = `<div class="d-order"><div class="sec">Prices (Kwacha)</div>${f("fee_delivery", "Delivery fee")}${f("fee_errand", "Errand fee")}${f("fee_ride", "Ride fare")}${f("fee_service", "Service fee")}
      <div class="sec" style="margin-top:8px">Where customers send money</div>${f("pay_to_mtn", "MTN MoMo number")}${f("pay_to_airtel", "Airtel Money number")}${f("pay_to_zamtel", "Zamtel Kwacha number")}
      <button class="btn btn-green" data-act="savesettings">Save settings</button></div>`;
  }
  return `<div class="screen wide"><div class="pad"><div class="d-top"><div class="h1">Dispatch</div><div class="d-row"><button class="btn btn-ghost btn-sm" data-act="refresh">Refresh</button><button class="btn btn-ghost btn-sm" data-act="logout">Sign out</button></div></div>
    <div class="d-tabs">${tabsHtml}</div>${D.loading ? '<div class="small">Loading…</div>' : ""}${body}</div></div>`;
}

async function loadDispatch(keepFocus) {
  if (!sb || !dispatch.session) return;
  if (keepFocus && $app.contains(document.activeElement) && /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
  const [o, r, s] = await Promise.all([
    sb.from("deli_orders").select("*").order("created_at", { ascending: false }).limit(80),
    sb.from("deli_riders").select("*").order("name"),
    sb.from("deli_settings").select("*"),
  ]);
  if (o.error) { toast(o.error.message.includes("permission") || o.error.code === "42501" ? "This email is not on the staff list." : o.error.message); return; }
  dispatch.orders = o.data || []; dispatch.riders = r.data || [];
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
  const job = (o) => {
    const next = o.status === "accepted" ? ["picked_up", "Picked up"] : o.status === "picked_up" ? ["on_the_way", "On the way"] : null;
    return `<div class="d-order"><div class="d-row" style="justify-content:space-between"><b>${SVC[o.service]} · ${esc(o.code)}</b><span class="badge o">${STATUS_TXT[o.status]}</span></div>
      <div class="t2"><b>From:</b> ${esc(o.pickup)}</div><div class="t2"><b>To:</b> ${esc(o.dropoff)}</div>
      ${o.details ? `<div class="t2"><b>Note:</b> ${esc(o.details)}${o.budget ? " · Items budget " + K(o.budget) : ""}</div>` : ""}
      ${o.item_type ? `<div class="t2">${esc(o.item_type)}${o.item_size ? " · " + esc(o.item_size) : ""}</div>` : ""}
      <div class="d-row"><span class="badge ${o.pay_status === "confirmed" ? "" : "o"}">${o.pay_method === "cash" ? "Collect cash: " + K(o.total) : PAY_NAME[o.pay_method] + (o.pay_status === "confirmed" ? " paid" : " awaiting")}</span></div>
      <div class="d-row"><a class="btn btn-ghost btn-sm" href="tel:${esc(o.customer_phone)}">Call ${esc(o.customer_name || "customer")}</a><a class="btn btn-ghost btn-sm" href="https://wa.me/${intl(o.customer_phone)}" target="_blank" rel="noopener">WhatsApp</a></div>
      ${next ? `<button class="btn btn-green" data-act="rdstage" data-id="${o.id}" data-v="${next[0]}">${next[1]}</button>` : ""}
      ${o.status === "on_the_way" || o.status === "picked_up" ? `<div class="d-row"><input class="input d-input" id="rc-${o.id}" inputmode="numeric" maxlength="4" placeholder="Customer's 4-digit code" style="flex:1"><button class="btn btn-orange btn-sm" data-act="rdcomplete" data-id="${o.id}">Complete</button></div>` : ""}
    </div>`;
  };
  const avail = (o) => `<div class="d-order"><div class="d-row" style="justify-content:space-between"><b>${SVC[o.service]} · ${K(o.total)}</b><span class="badge">${o.pay_method === "cash" ? "Cash" : PAY_NAME[o.pay_method]}</span></div>
      <div class="t2"><b>From:</b> ${esc(o.pickup)}</div><div class="t2"><b>To:</b> ${esc(o.dropoff)}</div>${o.details ? `<div class="t2">${esc(o.details)}</div>` : ""}
      <button class="btn btn-green" data-act="rdaccept" data-id="${o.id}">Accept job</button></div>`;
  return `<div class="screen"><div class="hhead"><div class="brand"><div class="tile"><img src="logo.png" alt=""></div><b>Rider</b></div>
      <div><div style="font-size:24px;font-weight:800">Hi, ${esc(me.name.split(" ")[0])}</div><div style="opacity:.9;font-size:14px">Delivered today: ${d.done_today}${me.trusted ? " · Trusted rider" : ""}</div></div></div>
    <div class="pad" style="padding-top:18px">
      <button class="btn ${me.online ? "btn-orange" : "btn-green"}" data-act="rdonline" data-v="${me.online ? 0 : 1}">${me.online ? "You are ONLINE. Tap to go offline" : "Go online to get jobs"}</button>
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

/* ---------- router ---------- */
function stopTimer() { clearInterval(timer); timer = null; }

async function render(soft) {
  const hash = location.hash.replace(/^#\/?/, "");
  const [route, arg] = hash.split("/");
  if (!soft) { stopTimer(); lastSig = ""; window.scrollTo(0, 0); }
  let html;
  switch (route) {
    case "": case "welcome": html = vWelcome(); if (!soft && store.get("seen", false)) timer = setTimeout(() => { if (/^#?\/?(welcome)?$/.test(location.hash)) location.hash = "#/home"; }, 2000); break;
    case "home": html = vHome(); break;
    case "delivery": case "errand": case "ride":
      if (draft.service !== route) { draft = Object.assign(blankDraft(), { service: route, pay_method: draft.pay_method || "mtn" }); saveDraft(); }
      html = vBook(route); break;
    case "pay": html = vPay(); break;
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
  if (t.dataset.bindAcc) { account[t.dataset.bindAcc] = t.value; store.set("account", account); }
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
    if (account.name.trim().length < 2) return toast("Please enter your name");
    if (String(account.phone).replace(/\D/g, "").length < 9) return toast("Please enter a valid phone number");
    el.disabled = true; el.textContent = "Placing order…";
    try {
      const r = await rpc("deli_create_order", {
        p_service: svc, p_name: account.name, p_phone: account.phone, p_pickup: draft.pickup, p_dropoff: draft.dropoff,
        p_item_type: svc === "delivery" ? draft.item_type : null, p_item_size: svc === "delivery" ? draft.item_size : null,
        p_details: draft.details || null, p_budget: draft.budget ? Number(String(draft.budget).replace(/[^0-9.]/g, "")) || null : null,
        p_pay_method: draft.pay_method,
      });
      addOrder(r.code, svc);
      const keep = draft.pay_method; draft = Object.assign(blankDraft(), { pay_method: keep }); saveDraft();
      location.hash = "#/track/" + r.code;
    } catch (err) { toast(err.message); el.disabled = false; el.textContent = "Place order · " + K(money(svc)); }
  }
  else if (a === "saveacc") { store.set("account", account); toast("Saved"); }
  else if (a === "findcode") { const c = document.getElementById("codeIn").value.trim().toUpperCase(); if (c) { addOrder(c, "delivery"); location.hash = "#/track/" + c; } }
  else if (a === "received") {
    if (!confirm(el.textContent.trim() + "?")) return;
    try { await rpc("deli_confirm_received", { p_code: el.dataset.code }); toast("Thank you!"); location.hash = "#/delivered/" + el.dataset.code; } catch (err) { toast(err.message); }
  }
  else if (a === "rate") {
    try { await rpc("deli_rate", { p_stars: Number(v), p_code: el.dataset.code }); toast("Thanks for rating!"); lastSig = ""; render(true); } catch (err) { toast(err.message); }
  }
  /* rider */
  else if (a === "rdmode") { R.mode = v; render(true); }
  else if (a === "rdlogin") {
    try {
      const r = await rpc("deli_rider_login", { p_phone: document.getElementById("gPhone").value, p_pin: document.getElementById("gPin").value });
      if (r.error) return toast(r.error);
      R.token = r.token; store.set("rtoken", r.token); R.data = null; render();
    } catch (err) { toast(err.message); }
  }
  else if (a === "rdregister") {
    try {
      await rpc("deli_rider_register", { p_name: document.getElementById("gName").value, p_phone: document.getElementById("gPhone").value, p_plate: document.getElementById("gPlate").value, p_pin: document.getElementById("gPin").value });
      R.mode = "login"; render(true); toast("Thanks! We will call you once you are approved.");
    } catch (err) { toast(err.message); }
  }
  else if (a === "rdonline") { try { await rpc("deli_rider_online", { p_token: R.token, p_online: v === "1" }); loadRider(); } catch (err) { toast(err.message); } }
  else if (a === "rdaccept") {
    try { const ok = await rpc("deli_rider_accept", { p_token: R.token, p_id: id }); toast(ok ? "Job accepted" : "Sorry, this job was taken"); loadRider(); } catch (err) { toast(err.message); loadRider(); }
  }
  else if (a === "rdstage") { try { await rpc("deli_rider_stage", { p_token: R.token, p_id: id, p_stage: v }); loadRider(); } catch (err) { toast(err.message); } }
  else if (a === "rdcomplete") {
    try { const ok = await rpc("deli_rider_complete", { p_token: R.token, p_id: id, p_code: document.getElementById("rc-" + id).value }); toast(ok ? "Delivered. Well done!" : "That code does not match"); loadRider(); } catch (err) { toast(err.message); }
  }
  else if (a === "rdlogout") { R.token = null; R.data = null; store.set("rtoken", null); render(); }
  /* staff */
  else if (a === "login") {
    const { data, error } = await sb.auth.signInWithPassword({ email: document.getElementById("sEmail").value.trim(), password: document.getElementById("sPass").value });
    if (error) return toast(error.message);
    dispatch.session = data.session; render();
  }
  else if (a === "logout") { await sb.auth.signOut(); dispatch.session = null; render(); }
  else if (a === "dtab") { dispatch.tab = v; render(true); }
  else if (a === "refresh") loadDispatch();
  else if (a === "assign") {
    const rid = document.getElementById("rs-" + id).value; if (!rid) return toast("Choose a rider first");
    const o = dispatch.orders.find((x) => x.id === id);
    const { error } = await sb.from("deli_orders").update({ rider_id: rid, status: o.status === "placed" ? "accepted" : o.status }).eq("id", id);
    error ? toast(error.message) : (toast("Rider assigned"), loadDispatch());
  }
  else if (a === "status") {
    if (v === "cancelled" && !confirm("Cancel this order?")) return;
    if (v === "delivered" && !confirm("Mark this order as completed?")) return;
    const { error } = await sb.from("deli_orders").update({ status: v }).eq("id", id);
    error ? toast(error.message) : loadDispatch();
  }
  else if (a === "confirmpay") { const { error } = await sb.from("deli_orders").update({ pay_status: "confirmed" }).eq("id", id); error ? toast(error.message) : loadDispatch(); }
  else if (a === "complete") {
    try { const ok = await rpc("deli_complete_order", { p_id: id, p_code: document.getElementById("dc-" + id).value }); ok ? (toast("Order completed"), loadDispatch()) : toast("That code does not match"); } catch (err) { toast(err.message); }
  }
  else if (a === "addrider") {
    const name = document.getElementById("rN").value.trim(); if (!name) return toast("Enter a name");
    const pin = document.getElementById("rI").value.trim();
    if (pin && !/^[0-9]{4,6}$/.test(pin)) return toast("PIN must be 4 to 6 digits");
    const { data: nr, error } = await sb.from("deli_riders").insert({ name, phone: document.getElementById("rP").value.trim(), plate: document.getElementById("rL").value.trim(), trusted: document.getElementById("rT").checked }).select().single();
    if (error) return toast(error.message);
    if (pin) { try { await rpc("deli_staff_set_pin", { p_rider: nr.id, p_pin: pin }); } catch (err) { toast(err.message); } }
    toast(pin ? "Rider added" : "Rider added. Set a PIN so they can sign in."); loadDispatch();
  }
  else if (a === "rapprove") { await sb.from("deli_riders").update({ approved: true, active: true }).eq("id", id); toast("Rider approved"); loadDispatch(); }
  else if (a === "rsetpin") {
    const pin = prompt("New PIN for this rider (4 to 6 digits)"); if (!pin) return;
    try { await rpc("deli_staff_set_pin", { p_rider: id, p_pin: pin.trim() }); toast("PIN saved"); } catch (err) { toast(err.message); }
  }
  else if (a === "rtrust") { await sb.from("deli_riders").update({ trusted: v === "1" }).eq("id", id); loadDispatch(); }
  else if (a === "ractive") { await sb.from("deli_riders").update({ active: v === "1" }).eq("id", id); loadDispatch(); }
  else if (a === "savesettings") {
    const keys = ["fee_delivery", "fee_errand", "fee_ride", "fee_service", "pay_to_mtn", "pay_to_airtel", "pay_to_zamtel"];
    const rows = keys.map((k) => ({ key: k, value: document.getElementById("st-" + k).value.trim() }));
    for (const r of rows.slice(0, 4)) if (!(Number(r.value) >= 0) || r.value === "") return toast("Prices must be numbers");
    const { error } = await sb.from("deli_settings").upsert(rows);
    error ? toast(error.message) : (toast("Saved"), loadFees(), loadDispatch());
  }
});

async function loadFees() {
  try { const f = await rpc("deli_fees"); if (f) { fees = { delivery: Number(f.delivery), errand: Number(f.errand), ride: Number(f.ride), service: Number(f.service) }; } } catch {}
}

window.addEventListener("hashchange", () => render());
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) { /* offline cache can be added later */ }
loadFees().finally(() => render());
