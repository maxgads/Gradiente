/* Gradiente v2 · Ingeniería UNLP
   App estática: router por hash, datos en JSON, progreso guardado en el navegador. */
(function () {
  "use strict";

  var CFG = window.GRADIENTE || {};
  var main = document.getElementById("main");

  /* ---------------- utilidades ---------------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function ic(name, cls) { return '<svg' + (cls ? ' class="' + cls + '"' : "") + ' aria-hidden="true"><use href="#i-' + name + '"/></svg>'; }
  function stagger(root) { $all(".rise", root).forEach(function (el, i) { el.style.setProperty("--i", Math.min(i, 14)); }); }
  document.addEventListener("pointermove", function (e) {
    var g = e.target.closest && e.target.closest(".glow");
    if (!g) return;
    var r = g.getBoundingClientRect();
    g.style.setProperty("--mx", (e.clientX - r.left) + "px"); g.style.setProperty("--my", (e.clientY - r.top) + "px");
  }, { passive: true });
  function norm(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim(); }
  function getJSON(url) {
    return fetch(url, { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error(url + " " + r.status);
      return r.text();
    }).then(function (t) { return JSON.parse(t.replace(/^﻿/, "")); });
  }
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin storage: la app sigue andando en memoria */ } }
  };

  /* ---------------- estado ---------------- */
  var KEY = "gradiente.v2";
  var S = store.get(KEY, null) || {};
  S.career = S.career || null;
  S.prog = S.prog || {};
  S.view = S.tv || "tree";
  S.name = S.name || "";
  S.filter = "all";
  var DEV = { on: false, temp: false };
  try {
    DEV.on = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/.test(location.hostname) || /[?&#]dev\b/.test(location.href) || sessionStorage.getItem("gradiente.dev") === "1";
    if (/[?&#]dev\b/.test(location.href)) sessionStorage.setItem("gradiente.dev", "1");
    DEV.temp = sessionStorage.getItem("gradiente.temp") === "1";
  } catch (e) {}
  function save() { if (DEV.temp) return; store.set(KEY, { career: S.career, prog: S.prog, tv: S.view, name: S.name }); }

  var DATA = { plans: null, byId: {}, nube: {}, catedras: {}, links: null, kiosco: null };
  var ui = { query: "", focus: null, lastRoute: null };

  /* ---------------- fondo: los brillos se mueven un poco al scrollear ---------------- */
  (function () {
    var amb = $(".ambient"), ticking = false;
    if (!amb || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)) return;
    window.addEventListener("scroll", function () {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () { amb.style.setProperty("--sy", Math.round(window.scrollY)); ticking = false; });
    }, { passive: true });
  })();

  /* ---------------- tema ---------------- */
  var themeBtn = $("#themeBtn");
  function isDark() {
    var t = document.documentElement.dataset.theme;
    if (t) return t === "dark";
    return window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches;
  }
  function paintThemeBtn() { themeBtn.innerHTML = ic(isDark() ? "sun" : "moon"); themeBtn.setAttribute("aria-label", isDark() ? "Usar tema claro" : "Usar tema oscuro"); }
  themeBtn.addEventListener("click", function () {
    var next = isDark() ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("gradiente.theme", next); } catch (e) {}
    paintThemeBtn();
    if (ui.lastRoute === "plan" && S.view === "tree") drawTreeLines();
  });
  paintThemeBtn();

  var consultaBtn = $("#consultaBtn");
  consultaBtn.addEventListener("click", function (e) { e.preventDefault(); openConsultas(); });

  /* ---------------- toast ---------------- */
  var toastEl = $("#toast"), toastTimer;
  function toast(msg, action) {
    toastEl.innerHTML = "<span>" + esc(msg) + "</span>" + (action ? '<button type="button">' + esc(action.label) + "</button>" : "");
    if (action) toastEl.querySelector("button").onclick = function () { action.run(); hideToast(); };
    toastEl.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, action ? 4500 : 2600);
  }
  function hideToast() { toastEl.classList.remove("is-on"); }

  /* ---------------- sheet ---------------- */
  var sheet = $("#sheet"), sheetBody = $("#sheetBody"), lastFocus = null, sheetRender = null;
  function openSheet(renderFn) {
    if (sheet.hidden) lastFocus = document.activeElement;
    sheetRender = renderFn;
    sheetBody.innerHTML = renderFn();
    sheet.hidden = false;
    document.body.style.overflow = "hidden";
    sheetBody.scrollTop = 0;
    var f = sheetBody.querySelector("[data-autofocus]") || sheetBody.querySelector("button, a, input");
    if (f) f.focus({ preventScroll: true });
  }
  function refreshSheet() { if (!sheet.hidden && sheetRender) { var top = sheetBody.scrollTop; sheetBody.innerHTML = sheetRender(); sheetBody.scrollTop = top; } }
  function closeSheet() {
    if (sheet.hidden) return;
    sheet.hidden = true; sheetRender = null; sheet.classList.remove("sheet--ob");
    document.body.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  sheet.addEventListener("click", function (e) { if (e.target.closest("[data-close]")) closeSheet(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSheet(); });

  /* ======================================================================
     PLANES DE ESTUDIO
     ====================================================================== */
  var ST_LABEL = { p: "Pendiente", c: "Cursando", r: "Regular", a: "Aprobada" };
  var ST_COLOR = { p: "var(--st-block)", c: "var(--st-cur)", r: "var(--st-reg)", a: "var(--st-done)" };
  var STATE = {
    done: { label: "Aprobada", pill: "done", icon: "check" },
    final: { label: "Podés rendir", pill: "final", icon: "check" },
    reg: { label: "Regular", pill: "reg", icon: "lock" },
    cur: { label: "Cursando", pill: "cur", icon: "" },
    ready: { label: "Podés cursar", pill: "ready", icon: "" },
    block: { label: "Bloqueada", pill: "block", icon: "lock" }
  };
  var CLS = { done: "is-done", final: "is-final", reg: "is-reg", cur: "is-cur", ready: "is-ready", block: "is-block" };

  function prepPlans(data) {
    DATA.plans = data;
    data.careers.forEach(function (c) {
      c.byCode = {};
      c.all = [];
      c.courses.forEach(function (x) { x.pool = x.pool || null; c.byCode[x.c] = x; c.all.push(x); });
      c.opt.forEach(function (x) { x.k = x.k || "opt"; c.byCode[x.c] = x; });
      c.hum.forEach(function (x) { x.k = x.k || "hum"; c.byCode[x.c] = x; });
      c.unlocks = {};
      [].concat(c.courses, c.opt, c.hum).forEach(function (x) {
        (x.r || []).forEach(function (r) { (c.unlocks[r] = c.unlocks[r] || []).push(x.c); });
      });
      c.mainCount = c.courses.filter(function (x) { return x.k !== "lang"; }).length;
      DATA.byId[c.id] = c;
    });
  }
  function career() { return S.career ? DATA.byId[S.career] : null; }
  function prog(cid) { return (S.prog[cid] = S.prog[cid] || {}); }
  function stOf(cid, code) { var p = S.prog[cid] && S.prog[cid][code]; return p ? p.s : "p"; }
  function semLabel(s) { if (s === 0) return "Nivelación"; if (s < 0) return "Idioma"; return Math.ceil(s / 2) + "° año · " + (s % 2 ? "1°" : "2°") + " cuatri"; }

  function picked(c) {
    var set = {};
    c.courses.forEach(function (x) { var p = S.prog[c.id] && S.prog[c.id][x.c]; if (x.k === "slot" && p && p.pick) set[p.pick] = 1; });
    return set;
  }
  function approvedCount(c, exclude) {
    var n = 0, pk = picked(c), P = S.prog[c.id] || {};
    Object.keys(P).forEach(function (code) {
      if (code === exclude || P[code].s !== "a" || !c.byCode[code] || pk[code]) return;
      if (c.byCode[code].k === "lang") return;
      n++;
    });
    return n;
  }
  function evaluate(c, x) {
    var s = stOf(c.id, x.c), reqs = x.r || [];
    var isLang = function (r) { return c.byCode[r] && c.byCode[r].k === "lang"; };
    var needCursar = reqs.filter(function (r) { var t = stOf(c.id, r); return isLang(r) ? t !== "a" : (t !== "a" && t !== "r"); });
    var needFinal = reqs.filter(function (r) { return stOf(c.id, r) !== "a"; });
    var have = approvedCount(c, x.c);
    var minMissing = x.min ? Math.max(0, x.min - have) : 0;
    var semMissing = [];
    if (x.sem) semMissing = c.courses.filter(function (y) { return y.s > 0 && y.s <= x.sem && y.k !== "lang" && stOf(c.id, y.c) !== "a"; });
    var gate = !minMissing && !semMissing.length;
    var canCursar = !needCursar.length && gate, canFinal = !needFinal.length && gate;
    var state = s === "a" ? "done" : s === "r" ? (canFinal ? "final" : "reg") : s === "c" ? "cur" : canCursar ? "ready" : "block";
    return { s: s, state: state, needCursar: needCursar, needFinal: needFinal, have: have, minMissing: minMissing, semMissing: semMissing, canCursar: canCursar, canFinal: canFinal };
  }
  function setStatus(c, code, s, silent) {
    var P = prog(c.id), prev = P[code] ? JSON.parse(JSON.stringify(P[code])) : null;
    if (s === "p" && !(P[code] && P[code].pick)) delete P[code];
    else { P[code] = P[code] || {}; P[code].s = s; if (s !== "a") delete P[code].n; }
    save();
    ui.pop = code;
    rerenderPlanBits();
    var x = c.byCode[code];
    if (s === "a" && (!prev || prev.s !== "a") && x && x.k !== "lang" && x.k !== "afc") askGrade(c, code);
  }

  /* ---------------- nota al aprobar (mini modal) ---------------- */
  var gradeDlg = null;
  function closeGrade() {
    if (!gradeDlg) return;
    var d = gradeDlg; gradeDlg = null;
    d.classList.add("is-out");
    setTimeout(function () { d.remove(); }, 160);
    if (d._back && d._back.focus) try { d._back.focus({ preventScroll: true }); } catch (e) {}
  }
  function askGrade(c, code) {
    closeGrade();
    var x = c.byCode[code];
    var d = document.createElement("div");
    d.className = "gdlg";
    d.setAttribute("role", "dialog"); d.setAttribute("aria-modal", "true"); d.setAttribute("aria-labelledby", "gdlgT");
    d.innerHTML = '<div class="gdlg-bg" data-g-skip></div><div class="gdlg-card">' +
      '<span class="gdlg-mark">' + ic("check") + "</span>" +
      '<p class="gdlg-k">Aprobada</p><h2 class="gdlg-t" id="gdlgT">' + esc(displayName(c, x)) + "</h2>" +
      '<p class="gdlg-q">¿Con qué nota?</p>' +
      '<div class="gdlg-grades" role="group" aria-label="Nota">' + [4, 5, 6, 7, 8, 9, 10].map(function (n) { return '<button type="button" data-g="' + n + '">' + n + "</button>"; }).join("") + "</div>" +
      '<button type="button" class="gdlg-skip" data-g-skip>Sin nota por ahora</button></div>';
    d._back = document.activeElement;
    document.body.appendChild(d);
    gradeDlg = d;
    setTimeout(function () { var f = d.querySelector('[data-g="7"]'); if (f) f.focus({ preventScroll: true }); }, 30);
    d.onclick = function (ev) {
      if (ev.target.closest("[data-g-skip]")) { closeGrade(); return; }
      var b = ev.target.closest("[data-g]"); if (!b) return;
      pickGrade(c, code, +b.dataset.g, b);
    };
  }
  function pickGrade(c, code, g, btn) {
    var P = prog(c.id); if (!P[code] || P[code].s !== "a") { closeGrade(); return; }
    P[code].n = g; save();
    if (btn) btn.classList.add("is-picked");
    setTimeout(function () {
      closeGrade(); rerenderPlanBits();
      toast("Nota " + g + " guardada · Promedio " + fmtAvg(summary(c).avg));
    }, 170);
  }
  window.addEventListener("keydown", function (e) {
    if (!gradeDlg) return;
    if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); closeGrade(); return; }
    var k = e.key === "0" ? 10 : +e.key;
    if (k >= 4 && k <= 10 && /^[0-9]$/.test(e.key)) {
      var b = gradeDlg.querySelector('[data-g="' + k + '"]');
      e.preventDefault(); if (b) b.click();
    }
  }, true);
  function shortName(x) { var n = x.n; return n.length > 34 ? n.slice(0, 32) + "…" : n; }
  function displayName(c, x) {
    if (x.k === "slot") {
      var p = S.prog[c.id] && S.prog[c.id][x.c];
      if (p && p.pick && c.byCode[p.pick]) return x.n + ": " + c.byCode[p.pick].n;
    }
    return x.n;
  }
  function summary(c) {
    var sum = { a: 0, r: 0, c: 0, total: c.mainCount, notes: [], ready: [], final: [] };
    c.courses.forEach(function (x) {
      if (x.k === "lang") return;
      var s = stOf(c.id, x.c);
      if (s === "a") { sum.a++; var n = S.prog[c.id][x.c].n; if (n) sum.notes.push(n); }
      else if (s === "r") sum.r++;
      else if (s === "c") sum.c++;
    });
    c.courses.forEach(function (x) {
      var e = evaluate(c, x);
      if (e.state === "ready" && x.k !== "lang") sum.ready.push(x);
      if (e.state === "final") sum.final.push(x);
    });
    sum.avg = sum.notes.length ? (sum.notes.reduce(function (a, b) { return a + b; }, 0) / sum.notes.length) : null;
    sum.pct = sum.total ? Math.round((sum.a / sum.total) * 100) : 0;
    sum.pctR = sum.total ? Math.round(((sum.a + sum.r) / sum.total) * 100) : 0;
    return sum;
  }
  function careerPct(c) { var n = 0; c.courses.forEach(function (x) { if (x.k !== "lang" && stOf(c.id, x.c) === "a") n++; }); return c.mainCount ? Math.round(n / c.mainCount * 100) : 0; }

  /* ---------------- share / import ---------------- */
  function encodeProgress(cid) {
    var P = S.prog[cid] || {};
    var parts = Object.keys(P).map(function (k) { var p = P[k]; return k + ":" + (p.s || "p") + (p.n ? p.n : "") + (p.pick ? "@" + p.pick : ""); });
    var raw = "1|" + cid + "|" + parts.join(",");
    return btoa(unescape(encodeURIComponent(raw))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function decodeProgress(code) {
    try {
      var b = code.replace(/-/g, "+").replace(/_/g, "/");
      var raw = decodeURIComponent(escape(atob(b)));
      var bits = raw.split("|");
      if (bits[0] !== "1" || !DATA.byId[bits[1]]) return null;
      var P = {};
      (bits[2] || "").split(",").filter(Boolean).forEach(function (t) {
        var m = t.match(/^([^:]+):([pcra])(\d+)?(?:@(.+))?$/);
        if (!m) return;
        P[m[1]] = { s: m[2] };
        if (m[3]) P[m[1]].n = +m[3];
        if (m[4]) P[m[1]].pick = m[4];
      });
      return { cid: bits[1], prog: P };
    } catch (e) { return null; }
  }
  function shareLink(cid) { return location.origin + location.pathname + "#/plan?importar=" + encodeProgress(cid); }

  /* ======================================================================
     ROUTER
     ====================================================================== */
  function parseHash() {
    var h = location.hash.replace(/^#/, "") || "/";
    var q = {}, i = h.indexOf("?");
    if (i >= 0) { h.slice(i + 1).split("&").forEach(function (kv) { var p = kv.split("="); q[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ""); }); h = h.slice(0, i); }
    var name = h.replace(/^\/+|\/+$/g, "") || "home";
    return { name: name, q: q };
  }
  var routes = { home: renderHome, plan: renderPlan, recursos: renderRecursos, mesita: renderMesita,
    // #/consultas: abre el asistente arriba del inicio (link para compartir)
    consultas: function () { history.replaceState(null, "", "#/"); ui.lastRoute = "home"; return renderHome().then(function () { openConsultas(); }); } };
  function route() {
    closeGrade();
    var r = parseHash();
    if (!routes[r.name]) r.name = "home";
    closeSheet(); hideFocusBar(); hideToast();
    $all("[data-nav]").forEach(function (a) { if (a.dataset.nav === r.name) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    var titles = { consultas: "Consultas · Gradiente", home: "Gradiente · Ingeniería UNLP", plan: "Mi plan · Gradiente", recursos: "Recursos · Gradiente", mesita: "Mesita en Electro · Gradiente" };
    document.title = titles[r.name];
    var changed = ui.lastRoute !== r.name;
    ui.lastRoute = r.name;
    Promise.resolve(routes[r.name](r.q)).then(function () {
      if (changed) { window.scrollTo(0, 0); main.focus({ preventScroll: true }); }
    });
  }
  window.addEventListener("hashchange", route);

  function ensurePlans() {
    if (DATA.plans) return Promise.resolve();
    return Promise.all([
      getJSON(CFG.data.planes).then(prepPlans),
      getJSON(CFG.data.nube).then(function (n) { DATA.nube = n; }).catch(function () {}),
      CFG.data.catedras ? getJSON(CFG.data.catedras).then(function (k) { DATA.catedras = k.c || {}; DATA.catedrasBase = k.base; }).catch(function () {}) : null
    ]);
  }
  function ensureLinks() {
    if (DATA.links) return Promise.resolve();
    return getJSON(CFG.data.links).then(function (list) {
      DATA.links = list.filter(function (l) { return l.active !== false && l.url && l.url !== "#" && l.url.charAt(0) !== "/"; })
        .sort(function (a, b) { return (a.priority || 99) - (b.priority || 99); });
    }).catch(function () { DATA.links = []; });
  }
  function ensureKiosco() {
    if (DATA.kiosco) return Promise.resolve();
    return getJSON(CFG.data.kiosco).then(function (k) {
      var by = function (a, b) { return (a.priority || 99) - (b.priority || 99); };
      DATA.kiosco = {
        promos: (k.promos || []).filter(function (p) { return p.active !== false; }).sort(by),
        productos: (k.productos || []).filter(function (p) { return p.active !== false; }).sort(by)
      };
    }).catch(function () { DATA.kiosco = { promos: [], productos: [] }; });
  }
  function loading() { main.innerHTML = '<div class="wrap page"><p class="muted">Cargando…</p></div>'; }
  function failed(err) { main.innerHTML = '<div class="wrap page"><div class="card emptyState"><p><strong>No pudimos cargar los datos.</strong></p><p class="small">Revisá tu conexión y recargá la página.</p></div></div>'; console.error(err); }

  /* ======================================================================
     INICIO
     ====================================================================== */
  function renderHome() {
    if (!DATA.plans || !DATA.links || !DATA.kiosco) loading();
    return Promise.all([ensurePlans(), ensureLinks(), ensureKiosco()]).then(function () {
      var c = career();
      var avisos = DATA.links.filter(function (l) { return l.category === "Avisos"; });
      var html = '<div class="wrap page">';
      html += '<section class="hero"><div>' +
        '<p class="kicker">' + (S.name ? "Hola, " + esc(S.name) : "Gradiente · Ingeniería UNLP") + "</p>" +
        '<h1 class="h1 h1--brand">Tu carrera,<br><span class="hero-mark"><span>a la vista</span></span></h1>' +
        '<p class="lead">Marcá lo que aprobaste y te mostramos qué podés cursar, qué finales podés rendir y cuánto te falta.</p>' +
        '<div class="hero-actions">' + (c ? '<a class="btn btn--primary" href="#/plan">' + ic("plan") + "Ver mi plan</a>" : '<button class="btn btn--primary" type="button" data-onboard>' + ic("plan") + "Armar mi plan</button>") +
        '<a class="btn" href="#/recursos">' + ic("links") + "Apuntes y trámites</a></div></div>";
      html += '<div class="rise">' + (c ? homeProgress(c) : homeStart()) + "</div></section>";

      if (avisos.length) {
        html += '<div class="sectionHead"><h2 class="h2">Avisos</h2></div><div class="linkList">';
        avisos.forEach(function (l) { html += '<a class="card notice lift" href="' + esc(l.url) + '" target="_blank" rel="noopener"><div><strong>' + esc(l.title) + "</strong></div>" + ic("ext") + "</a>"; });
        html += "</div>";
      }

      html += '<div class="sectionHead"><h2 class="h2">Accesos rápidos</h2><a href="#/recursos">Ver todo' + ic("chev") + "</a></div>";
      html += '<div class="quickGrid">' + quickLinks().map(function (q) {
        return '<a class="card quick lift" href="' + esc(q.url) + '" target="_blank" rel="noopener"><span class="quick-ic">' + ic(q.icon || "ext") + "</span>" + esc(q.title) + "</a>";
      }).join("") + "</div>";

      if (DATA.kiosco.promos.length) {
        html += '<div class="sectionHead"><h2 class="h2">Mesita en Electro</h2><a href="#/mesita">Ver todo' + ic("chev") + '</a></div><div class="promoCards promoCards--row">' +
          DATA.kiosco.promos.map(function (p) { return promoCard(p, true); }).join("") + "</div>";
      }
      html += footer() + "</div>";
      main.innerHTML = html;
      stagger(main); animateRing();
      bindHome();
    }).catch(failed);
  }
  function miniKpis(s) {
    return '<div class="miniKpis" aria-label="' + s.pct + '% aprobado">' +
      '<div class="ring ring--sm is-zero" style="--p:' + s.pct + ";--p2:" + s.pctR + '"><div><b>' + s.pct + "%</b></div></div>" +
      '<dl class="kpis"><div><dt>Aprob.</dt><dd class="k-done">' + s.a + '</dd></div><div><dt>Reg.</dt><dd class="k-reg">' + s.r + '</dd></div><div><dt>Cursando</dt><dd class="k-cur">' + s.c + "</dd></div>" +
      '<div><dt>Prom.</dt><dd>' + (s.avg ? s.avg.toFixed(1).replace(".", ",") : "–") + "</dd></div></dl></div>";
  }
  function rowItem(c, x) {
    return '<button class="nextItem" type="button" data-open="' + esc(x.c) + '"><span class="code">' + esc(x.k === "slot" ? "—" : x.c) + "</span><strong>" + esc(displayName(c, x)) + "</strong>" + ic("chev") + "</button>";
  }
  function homeProgress(c) {
    var s = summary(c), MAX = 6;
    var cur = c.courses.filter(function (x) { return stOf(c.id, x.c) === "c"; });
    var h = '<div class="card pc">';
    h += '<div class="pc-head"><div class="pc-title"><p class="pc-kicker">Plan ' + esc(c.plan) + '</p><h2 class="h3">' + esc(c.name) + '</h2><a class="pc-link" href="#/plan">Ir al plan' + ic("chev") + "</a></div>" + miniKpis(s) + "</div>";
    if (!s.a && !s.r && !s.c) {
      h += '<div class="pc-empty"><p>Todavía no marcaste materias.</p><a class="btn btn--sm" href="#/plan">Marcar en el plan' + ic("chev") + "</a></div>";
    }
    if (cur.length) {
      h += '<div class="pc-sec"><p class="dLabel"><i class="dotc" style="background:var(--st-cur)"></i>Cursando ahora · ' + cur.length + '</p><div class="nextList">' + cur.slice(0, MAX).map(function (x) { return rowItem(c, x); }).join("") + "</div></div>";
    }
    var left = Math.max(0, MAX - Math.min(cur.length, MAX));
    if (s.ready.length) {
      var open = left >= 3;
      var show = open ? left : MAX;
      h += '<details class="acc"' + (open ? " open" : "") + '><summary><i class="dotc" style="background:var(--ink)"></i>Podés cursar · ' + s.ready.length + ic("chev", "chev") + '</summary><div class="nextList">' +
        s.ready.slice(0, show).map(function (x) { return rowItem(c, x); }).join("") + "</div>" +
        (s.ready.length > show ? '<a class="pc-more" href="#/plan?filtro=ready">Ver las ' + s.ready.length + " en el plan" + ic("chev") + "</a>" : "") + "</details>";
    }
    if (s.final.length) {
      h += '<details class="acc"><summary><i class="dotc" style="background:var(--st-reg)"></i>Finales para rendir · ' + s.final.length + ic("chev", "chev") + '</summary><div class="nextList">' +
        s.final.slice(0, MAX).map(function (x) { return rowItem(c, x); }).join("") + "</div></details>";
    }
    return h + "</div>";
  }
  function animateRing() { requestAnimationFrame(function () { requestAnimationFrame(function () { $all(".ring.is-zero, .pp.is-zero").forEach(function (r) { r.classList.remove("is-zero"); }); }); }); }
  function fmtAvg(v) { return v == null ? "–" : v.toFixed(2).replace(".", ","); }
  function planProgress(s) {
    var t = s.total || 1, pend = Math.max(0, s.total - s.a - s.r - s.c);
    var w = function (n) { return (n / t * 100).toFixed(2) + "%"; };
    return '<section class="pp is-zero" aria-label="Progreso de la carrera">' +
      '<div class="pp-pct"><b>' + s.pct + '<span>%</span></b><p>de la carrera aprobada<small>' + s.a + " de " + s.total + " materias</small></p></div>" +
      '<div class="pp-avg"><p>Promedio</p><b>' + fmtAvg(s.avg) + "</b><small>" + (s.notes.length ? "con " + s.notes.length + (s.notes.length === 1 ? " nota" : " notas") : "Cargá la nota al aprobar") + "</small></div>" +
      '<div class="pp-bar" role="img" aria-label="' + s.a + " aprobadas, " + s.r + " regulares, " + s.c + ' cursando">' +
      '<i class="d" style="--w:' + w(s.a) + '"></i><i class="r" style="--w:' + w(s.r) + '"></i><i class="c" style="--w:' + w(s.c) + '"></i></div>' +
      '<ul class="pp-legend"><li><i class="d"></i><b>' + s.a + "</b> aprobadas</li><li><i class=\"r\"></i><b>" + s.r + "</b> " + (s.r === 1 ? "regular" : "regulares") +
      "</li><li><i class=\"c\"></i><b>" + s.c + '</b> cursando</li><li class="pp-rest"><b>' + pend + "</b> por hacer</li></ul></section>";
  }
  function homeStart() {
    return '<div class="card pc pc--start"><p class="pc-kicker">Tu plan de estudios</p><h2 class="h3">Armalo en un minuto</h2>' +
      '<ol class="steps"><li>Elegí tu carrera</li><li>Contanos hasta dónde llegaste</li><li>Mirá qué podés cursar y rendir</li></ol>' +
      '<button class="btn btn--primary btn--block" type="button" data-onboard>Empezar</button>' +
      '<p class="small muted" style="margin:0">Sin cuenta: tu progreso queda guardado en este dispositivo.</p></div>';
  }
  function bindHome() {
    $all("[data-onboard]", main).forEach(function (b) { b.onclick = function () { openOnboarding(); }; });
    $all("[data-open]", main).forEach(function (b) { b.onclick = function () { openSubject(career(), b.dataset.open); }; });
  }
  function quickLinks() {
    return (CFG.quickLinks || []).map(function (q) {
      if (q.url) return q;
      var l = DATA.links.find(function (x) { return x.title === q.match; });
      return l ? { title: q.title, url: l.url, icon: q.icon } : null;
    }).filter(Boolean);
  }
  function footer() {
    return '<footer class="footer"><div class="social">' + (CFG.socialLinks || []).map(function (s) {
      return '<a href="' + esc(s.url) + '" target="_blank" rel="noopener" aria-label="' + esc(s.label) + '">' + ic(s.icon) + "</a>";
    }).join("") + '</div><p class="small muted" style="margin:0">' + esc(CFG.description || "") + '<br>Los planes salen de la web oficial de la Facultad. Ante cualquier duda, SIU Guaraní y el Departamento de Alumnos tienen la última palabra.</p></footer>';
  }

  /* ======================================================================
     MI PLAN
     ====================================================================== */
  function renderPlan(q) {
    if (!DATA.plans) loading();
    return ensurePlans().then(function () {
      if (q && q.importar) { var imp = decodeProgress(q.importar); history.replaceState(null, "", "#/plan"); if (imp) setTimeout(function () { askImport(imp); }, 50); }
      if (q && q.carrera && DATA.byId[q.carrera]) { S.career = q.carrera; save(); }
      if (q && q.filtro) { S.filter = q.filtro; history.replaceState(null, "", "#/plan"); }
      var c = career();
      if (q && q.elegir) return renderCareerPicker();
      if (!c) { renderCareerPicker(); setTimeout(openOnboarding, 60); return; }
      ui.focus = null; ui.animate = true;
      var html = '<div class="wrap page">';
      html += '<header class="planHead"><div class="planTitle"><div class="planTitle-l">' +
        '<button class="careerSwitch" type="button" id="switchCareer">' + ic("plan") + "Cambiar carrera" + ' <span class="mono">Plan ' + esc(c.plan) + "</span></button>" +
        '<h1 class="h1">' + esc(c.name.replace(/^Ingeniería (en )?/, "Ing. $1")) + "</h1></div></div>" +
        '<div id="planStats"></div></header>';
      html += '<div class="stickSentinel" id="stickSentinel"></div><div class="planTools" id="planTools"><div class="planTools-row"><label class="search"><span class="sr">Buscar materia</span>' + ic("search") +
        '<input id="planSearch" type="search" placeholder="Buscar materia" autocomplete="off" value="' + esc(ui.query) + '"></label>' +
        '<div class="seg" role="group" aria-label="Vista"><button type="button" data-view="tree" aria-pressed="' + (S.view === "tree") + '">' + ic("tree") + '<span>Árbol</span></button><button type="button" data-view="list" aria-pressed="' + (S.view === "list") + '">' + ic("list") + "<span>Lista</span></button></div>" +
        '<button class="iconBtn" type="button" id="helpBtn" aria-label="Cómo funciona">' + ic("help") + '</button><button class="iconBtn" type="button" id="menuBtn" aria-label="Opciones del plan">' + ic("more") + "</button></div>" +
        '<div class="chipsRow" id="planFilters" role="group" aria-label="Filtrar"></div></div>';
      html += '<div id="planBody"></div></div>';
      main.innerHTML = html;

      watchSticky();
      $("#switchCareer").onclick = function () { location.hash = "#/plan?elegir=1"; };
      $("#helpBtn").onclick = openHelp;
      $("#menuBtn").onclick = function () { openPlanMenu(c); };
      var input = $("#planSearch");
      input.addEventListener("input", function () { ui.query = input.value; renderPlanBody(); });
      $all("[data-view]", main).forEach(function (b) {
        b.onclick = function () {
          S.view = b.dataset.view; save(); ui.animate = true; ui.focus = null; hideFocusBar();
          $all("[data-view]", main).forEach(function (o) { o.setAttribute("aria-pressed", String(o === b)); });
          renderPlanBody();
        };
      });
      rerenderPlanBits();
      animateRing();
    }).catch(failed);
  }
  var stickyObs;
  function watchSticky() {
    var sen = $("#stickSentinel"), bar = $("#planTools");
    if (!sen || !bar || !window.IntersectionObserver) return;
    if (stickyObs) stickyObs.disconnect();
    stickyObs = new IntersectionObserver(function (en) { bar.classList.toggle("is-stuck", !en[0].isIntersecting); }, { rootMargin: "-" + (60 + 1) + "px 0px 0px 0px" });
    stickyObs.observe(sen);
  }
  function rerenderPlanBits() {
    if (ui.lastRoute === "plan" && $("#planBody")) { renderPlanStats(); renderFilters(); renderPlanBody(); }
    if (ui.lastRoute === "home" && $(".pc")) {
      var c = career(); var holder = $(".hero > div:last-child");
      if (c && holder) { var openAcc = $all("details.acc", holder).map(function (d) { return d.open; }); holder.innerHTML = homeProgress(c).replace("is-zero", ""); $all("details.acc", holder).forEach(function (d, i) { if (openAcc[i] != null) d.open = openAcc[i]; }); bindHome(); }
    }
    refreshSheet();
  }
  function renderPlanStats() {
    var c = career(), s = summary(c), el = $("#planStats");
    if (!el) return;
    var first = !el.innerHTML;
    el.innerHTML = planProgress(s);
    if (!first) $all(".is-zero", el).forEach(function (r) { r.classList.remove("is-zero"); });
  }
  var FILTERS = [
    ["all", "Todas", null],
    ["ready", "Podés cursar", "var(--ink)"],
    ["final", "Podés rendir", "var(--st-reg)"],
    ["cur", "Cursando", "var(--st-cur)"],
    ["block", "Bloqueadas", "var(--st-block)"],
    ["done", "Aprobadas", "var(--st-done)"]
  ];
  function matchFilter(state, f) {
    if (f === "all") return true;
    if (f === "final") return state === "final";
    if (f === "cur") return state === "cur";
    if (f === "block") return state === "block" || state === "reg";
    return state === f;
  }
  function renderFilters() {
    var c = career(), el = $("#planFilters");
    if (!el) return;
    var ev = {}; c.courses.forEach(function (x) { ev[x.c] = evaluate(c, x).state; });
    el.innerHTML = FILTERS.map(function (f) {
      var n = c.courses.filter(function (x) { return x.k !== "lang" && matchFilter(ev[x.c], f[0]); }).length;
      if (f[0] !== "all" && !n && S.filter !== f[0]) return "";
      return '<button class="chip" type="button" data-filter="' + f[0] + '" aria-pressed="' + (S.filter === f[0]) + '">' + (f[2] ? '<span class="dot" style="background:' + f[2] + '"></span>' : "") + f[1] + " <em>" + n + "</em></button>";
    }).join("");
    $all("[data-filter]", el).forEach(function (b) { b.onclick = function () { S.filter = b.dataset.filter; renderFilters(); renderPlanBody(); }; });
  }
  function queryHit(c, x) {
    if (!ui.query) return true;
    var q = norm(ui.query);
    return norm(displayName(c, x)).indexOf(q) >= 0 || norm(x.c).indexOf(q) >= 0;
  }
  function renderPlanBody() {
    var c = career(), el = $("#planBody");
    if (!el) return;
    if (S.view === "tree") return renderTree(c, el);
    var groups = {};
    c.courses.forEach(function (x) { var y = x.s < 0 ? 99 : x.s === 0 ? 0 : Math.ceil(x.s / 2); (groups[y] = groups[y] || []).push(x); });
    var html = "", shown = 0;
    Object.keys(groups).map(Number).sort(function (a, b) { return a - b; }).forEach(function (y) {
      var items = groups[y].filter(function (x) { return queryHit(c, x) && matchFilter(evaluate(c, x).state, S.filter); });
      if (!items.length) return;
      shown += items.length;
      var title = y === 99 ? "Idioma" : y === 0 ? "Nivelación" : y + "° año";
      var doneInYear = groups[y].filter(function (x) { return stOf(c.id, x.c) === "a"; }).length;
      html += '<section class="yearBlock"><div class="yearHead"><h2 class="h2">' + title + '</h2><span class="yearBar"><i style="width:' + Math.round(doneInYear / groups[y].length * 100) + '%"></i></span><span class="mono">' + doneInYear + "/" + groups[y].length + "</span></div>";
      if (y >= 1 && y < 99) {
        html += '<div class="semGrid">';
        [2 * y - 1, 2 * y].forEach(function (s) {
          var col = items.filter(function (x) { return x.s === s; });
          if (!col.length) return;
          html += '<div class="semCol"><div class="semLabel"><span>' + (s % 2 ? "1°" : "2°") + " cuatrimestre</span><span>Sem. " + s + "</span></div>" + col.map(function (x) { return subjCard(c, x); }).join("") + "</div>";
        });
        html += "</div>";
      } else html += '<div class="semCol">' + items.map(function (x) { return subjCard(c, x); }).join("") + "</div>";
      html += "</section>";
    });
    if (!shown) html += '<div class="emptyState"><p><strong>Nada por acá.</strong></p><p class="small">Probá con otro filtro o buscá de otra forma.</p></div>';

    // optativas y humanísticas
    [["opt", "Optativas", c.opt], ["hum", "Electivas humanísticas", c.hum]].forEach(function (p) {
      var list = p[2].filter(function (x) { return queryHit(c, x) && matchFilter(evaluate(c, x).state, S.filter); });
      if (!list.length) return;
      var done = p[2].filter(function (x) { return stOf(c.id, x.c) === "a"; }).length;
      html += '<section class="poolBlock"><details class="pool"' + (ui.query ? " open" : "") + '><summary>' + p[1] + ' <span class="mono small muted">' + list.length + (done ? " · " + done + " aprobadas" : "") + "</span>" + ic("chev", "chev") + '</summary><div class="pool-body">' +
        list.map(function (x) { return subjCard(c, x); }).join("") + "</div></details></section>";
    });
    html += '<p class="small muted" style="margin-top:26px">Fuente: <a href="' + esc(c.official) + '" target="_blank" rel="noopener" style="text-decoration:underline">plan oficial ' + esc(c.plan) + "</a> de la Facultad de Ingeniería UNLP. " + c.hours + " horas totales.</p>";
    el.innerHTML = html;
    if (ui.animate) stagger(el);
    ui.animate = false; ui.pop = null;
    bindSubjects(el, c);
  }
  function subjCard(c, x) {
    var e = evaluate(c, x), st = STATE[e.state], P = S.prog[c.id] && S.prog[c.id][x.c];
    var reqs = (x.r || []).filter(function (r) { return r !== "M0001" && r !== "INFIN"; });
    var sub = "";
    if (reqs.length) sub = reqs.map(function (r) { var s = stOf(c.id, r); return '<span class="req is-' + ({ a: "aprobada", r: "regular", c: "cursando", p: "pendiente" })[s] + '" title="' + esc((c.byCode[r] || {}).n || r) + '">' + esc(r) + "</span>"; }).join("");
    if (x.x && !reqs.length) sub += '<span class="cond">' + esc(x.x) + "</span>";
    var nube = DATA.nube[x.c] || (P && P.pick && DATA.nube[P.pick]);
    return '<div class="subj ' + CLS[e.state] + (x.k === "slot" ? " subj--slot" : "") + (ui.pop === x.c ? " is-pop" : "") + (ui.animate ? " rise" : "") + '" data-code="' + esc(x.c) + '">' +
      '<button class="stBtn" type="button" data-quick="' + esc(x.c) + '" aria-label="Cambiar estado de ' + esc(x.n) + " (ahora: " + ST_LABEL[e.s] + ')">' + ic("check") + "</button>" +
      '<button class="subj-main" type="button" data-open="' + esc(x.c) + '" style="text-align:left">' +
      '<span class="subj-top"><span class="subj-code">' + esc(x.k === "slot" ? "A elección" : x.c) + '</span><span class="pill pill--' + st.pill + '">' + (st.icon ? ic(st.icon) : "") + st.label + "</span>" +
      (nube ? '<span class="nubeTag" title="Hay material en la nube">' + ic("folder") + "</span>" : "") + "</span>" +
      '<span class="subj-name">' + esc(displayName(c, x)) + (x.a ? ' <span class="muted small">· anual</span>' : "") + "</span>" +
      (sub ? '<span class="subj-sub">' + sub + "</span>" : "") + "</button>" +
      (P && P.n ? '<span class="subj-note" aria-label="Nota ' + P.n + '">' + P.n + "</span>" : ic("chev", "chev")) + "</div>";
  }
  var CYCLE = { p: "c", c: "r", r: "a", a: "p" };
  function bindSubjects(root, c) {
    $all("[data-quick]", root).forEach(function (b) { b.onclick = function (ev) { ev.stopPropagation(); var code = b.dataset.quick; setStatus(c, code, CYCLE[stOf(c.id, code)]); }; });
    $all(".subj [data-open]", root).forEach(function (b) { b.onclick = function () { openSubject(c, b.dataset.open); }; });
  }

  /* ---------------- árbol ---------------- */
  var treeState = { lines: [] };
  function renderTree(c, el) {
    var cols = {};
    c.courses.forEach(function (x) { var s = x.s < 0 ? 0 : x.s; (cols[s] = cols[s] || []).push(x); });
    var html = '<div class="tree" id="tree"><div class="tree-in" id="treeIn"><svg class="tree-lines" id="treeLines"></svg>';
    Object.keys(cols).map(Number).sort(function (a, b) { return a - b; }).forEach(function (s) {
      html += '<div class="tree-col"><header><span>' + (s === 0 ? "Nivelación" : s % 2 ? Math.ceil(s / 2) + "° año" : "") + "</span><span>" + (s ? (s % 2 ? "1" : "2") + "° cuatri" : "") + "</span></header>";
      cols[s].forEach(function (x) {
        var e = evaluate(c, x), hit = queryHit(c, x) && matchFilter(e.state, S.filter);
        var P = S.prog[c.id] && S.prog[c.id][x.c];
        html += '<button type="button" class="tnode ' + CLS[e.state] + (hit ? "" : " is-dim") + (ui.pop === x.c ? " is-pop" : "") + '" data-node="' + esc(x.c) + '">' +
          '<span class="subj-top"><span class="subj-code">' + esc(x.k === "slot" ? "A elección" : x.c) + "</span>" + (P && P.n ? '<span class="mono small" style="margin-left:auto;color:var(--st-done);font-weight:700">' + P.n + "</span>" : "") + "</span>" +
          "<strong>" + esc(displayName(c, x)) + "</strong></button>";
      });
      html += "</div>";
    });
    html += "</div></div>";
    var prev = $("#tree"), keep = prev ? { l: prev.scrollLeft, t: prev.scrollTop } : null;
    el.innerHTML = tipHtml() + html;
    var tree = $("#tree");
    if (keep) { tree.scrollLeft = keep.l; tree.scrollTop = keep.t; }
    ui.pop = null;
    bindTip(el);
    if (!tipSeen()) { var first = $all(".tnode.is-ready", tree).filter(function (n) { var x = c.byCode[n.dataset.node]; return x && x.k !== "lang" && x.s > 0; })[0] || $(".tnode.is-ready", tree); if (first) first.classList.add("is-hint"); }
    enablePan(tree);
    $all("[data-node]", tree).forEach(function (n) {
      n.onclick = function () {
        if (tree.dataset.panned === "1") return;
        var code = n.dataset.node;
        $all(".is-hint", tree).forEach(function (h) { h.classList.remove("is-hint"); });
        if (ui.focus === code) openSubject(c, code);
        else { ui.focus = code; paintFocus(c); }
      };
    });
    tree.addEventListener("click", function (e) { if (e.target === tree || e.target.id === "treeIn" || e.target.classList.contains("tree-col")) { ui.focus = null; paintFocus(c); } });
    requestAnimationFrame(function () { drawTreeLines(); paintFocus(c); });
  }
  function drawTreeLines() {
    var c = career(), inner = $("#treeIn"), svg = $("#treeLines");
    if (!inner || !svg || !c) return;
    var base = inner.getBoundingClientRect(), pos = {};
    $all("[data-node]", inner).forEach(function (n) { var r = n.getBoundingClientRect(); pos[n.dataset.node] = { l: r.left - base.left, r: r.right - base.left, y: r.top - base.top + r.height / 2 }; });
    svg.setAttribute("width", inner.scrollWidth); svg.setAttribute("height", inner.scrollHeight);
    var paths = [];
    c.courses.forEach(function (x) {
      (x.r || []).forEach(function (r) {
        if (r === "M0001" || r === "INFIN") return;
        var a = pos[r], b = pos[x.c];
        if (!a || !b) return;
        var x1 = a.r, y1 = a.y, x2 = b.l, y2 = b.y;
        if (x2 < x1) return;
        var dx = Math.max(24, (x2 - x1) / 2);
        var s = stOf(c.id, r);
        paths.push('<path data-from="' + r + '" data-to="' + x.c + '" class="' + (s === "a" ? "is-aprobada" : s === "r" ? "is-regular" : "") + '" d="M' + x1 + " " + y1 + " C" + (x1 + dx) + " " + y1 + " " + (x2 - dx) + " " + y2 + " " + x2 + " " + y2 + '"/>');
      });
    });
    svg.innerHTML = paths.join("");
    paintFocus(c);
  }
  function paintFocus(c) {
    var tree = $("#tree");
    if (!tree) return;
    var sel = ui.focus;
    tree.classList.toggle("has-focus", !!sel);
    if (sel) showFocusBar(c, sel); else hideFocusBar();
    var up = {}, down = {};
    if (sel) {
      (function back(code) { (c.byCode[code].r || []).forEach(function (r) { if (!up[r] && c.byCode[r]) { up[r] = 1; back(r); } }); })(sel);
      (function fwd(code) { (c.unlocks[code] || []).forEach(function (u) { if (!down[u]) { down[u] = 1; fwd(u); } }); })(sel);
    }
    $all("[data-node]", tree).forEach(function (n) {
      var k = n.dataset.node;
      n.classList.toggle("is-on", !!(sel && (k === sel || up[k] || down[k])));
      n.classList.toggle("is-sel", k === sel);
    });
    $all("#treeLines path", tree).forEach(function (p) {
      var f = p.dataset.from, t = p.dataset.to;
      var inUp = !!((up[f] || f === sel) && (up[t] || t === sel));
      var inDown = !!(down[t] && (down[f] || f === sel));
      p.classList.toggle("is-on", !!sel && (inUp || inDown));
      p.classList.toggle("is-out", !!sel && inDown && !inUp);
    });
  }
  function showFocusBar(c, code) {
    var bar = $("#focusBar");
    if (!bar) { bar = document.createElement("div"); bar.id = "focusBar"; bar.className = "treeFocusBar"; document.body.appendChild(bar); }
    document.body.classList.add("has-fb");
    var x = c.byCode[code], e = evaluate(c, x);
    bar.innerHTML = '<div class="fb-top"><span class="fb-name"><small>' + esc(x.k === "slot" ? "A elección" : x.c) + " · " + STATE[e.state].label + "</small>" + esc(displayName(c, x)) + "</span>" +
      '<button class="fb-ic" type="button" data-fb-open aria-label="Ver detalle">' + ic("help") + '</button><button class="fb-ic" type="button" aria-label="Quitar selección" data-fb-x>' + ic("x") + "</button></div>" +
      '<div class="fb-seg" role="group" aria-label="Marcar como">' + ["p", "c", "r", "a"].map(function (st) {
        return '<button type="button" data-fb-st="' + st + '" aria-pressed="' + (e.s === st) + '"><i style="background:' + ST_COLOR[st] + '"></i>' + ST_LABEL[st] + "</button>";
      }).join("") + "</div>";
    bar.querySelector("[data-fb-open]").onclick = function () { openSubject(c, code); };
    bar.querySelector("[data-fb-x]").onclick = function () { ui.focus = null; paintFocus(c); };
    $all("[data-fb-st]", bar).forEach(function (b) { b.onclick = function () { tipDone(); ui.focus = null; hideFocusBar(); setStatus(c, code, b.dataset.fbSt, true); }; });
  }
  function hideFocusBar() { var bar = $("#focusBar"); if (bar) bar.remove(); document.body.classList.remove("has-fb"); }
  function enablePan(el) {
    var st = null;
    el.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      st = { x: e.clientX, y: e.clientY, l: el.scrollLeft, t: el.scrollTop, moved: false };
      el.dataset.panned = "0";
    });
    el.addEventListener("pointermove", function (e) {
      if (!st) return;
      var dx = e.clientX - st.x, dy = e.clientY - st.y;
      if (!st.moved && Math.hypot(dx, dy) < 6) return;
      if (!st.moved) { st.moved = true; el.classList.add("is-grabbing"); el.setPointerCapture(e.pointerId); el.dataset.panned = "1"; }
      el.scrollLeft = st.l - dx; el.scrollTop = st.t - dy;
    });
    function end(e) { if (!st) return; if (el.hasPointerCapture && el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId); el.classList.remove("is-grabbing"); st = null; setTimeout(function () { el.dataset.panned = "0"; }, 0); }
    el.addEventListener("pointerup", end); el.addEventListener("pointercancel", end);
  }
  var rT; window.addEventListener("resize", function () { clearTimeout(rT); rT = setTimeout(function () { if (ui.lastRoute === "plan" && S.view === "tree") drawTreeLines(); }, 120); });

  /* ---------------- guía corta (una sola vez) ---------------- */
  function tipSeen() { return store.get("gradiente.tip", 0) >= 1; }
  function tipDone() { if (!tipSeen()) { store.set("gradiente.tip", 1); var t = $("#planTip"); if (t) t.remove(); } }
  function tipHtml() {
    if (tipSeen()) return "";
    return '<div class="tip" id="planTip"><ol>' +
      '<li><b>1</b><span><strong>Tocá una materia</strong> y abajo elegís si la estás cursando, la regularizaste o la aprobaste.</span></li>' +
      '<li><b>2</b><span>Se marca su camino: <em class="c-red">rojo</em> lo que necesitás antes, <em class="c-blue">azul</em> lo que destraba.</span></li>' +
      '<li><b>3</b><span>Arrastrá para moverte. Si preferís, pasá a <strong>Lista</strong>.</span></li>' +
      '</ol><button class="btn btn--sm" type="button" data-tip-ok>Entendido</button></div>';
  }
  function bindTip(root) { var b = $("[data-tip-ok]", root); if (b) b.onclick = function () { tipDone(); $all(".is-hint").forEach(function (h) { h.classList.remove("is-hint"); }); }; }

  /* ---------------- onboarding tipo encuesta ---------------- */
  function openOnboarding() {
    var o = { step: 0, name: S.name || "", career: S.career || null, level: null };
    var LEVELS = [[-1, "Recién empiezo", "Todavía no aprobé nada"], [0, "Terminé el ingreso", "Nivelación aprobada"], [2, "Terminé 1° año", ""], [4, "Terminé 2° año", ""], [6, "Terminé 3° año", ""], [8, "Terminé 4° año", ""], [99, "Prefiero marcarlo yo", "Voy materia por materia"]];
    function render() {
      var dots = '<div class="ob-dots">' + [0, 1, 2].map(function (i) { return '<i class="' + (i <= o.step ? "on" : "") + '"></i>'; }).join("") + "</div>";
      var head = '<div class="dHead"><div>' + dots + "</div>" + '<button class="iconBtn" type="button" data-close aria-label="Cerrar">' + ic("x") + "</button></div>";
      if (o.step === 0) return head + '<h2 class="h2 ob-q" id="sheetTitle">¿Cómo te llamás?</h2><p class="muted ob-sub">Para saludarte. Es opcional y queda solo en tu dispositivo.</p>' +
        '<input class="ob-input" id="obName" type="text" maxlength="30" autocomplete="given-name" placeholder="Tu nombre" value="' + esc(o.name) + '" data-autofocus>' +
        '<div class="ob-actions"><button class="btn btn--ghost" type="button" data-ob="skip">Saltar</button><button class="btn btn--primary" type="button" data-ob="next">Seguir</button></div>';
      if (o.step === 1) return head + '<h2 class="h2 ob-q" id="sheetTitle">' + (o.name ? esc(o.name) + ", ¿q" : "¿Q") + 'ué carrera estudiás?</h2><p class="muted ob-sub">Podés cambiarla cuando quieras.</p><div class="ob-grid">' +
        DATA.plans.careers.map(function (c) { return '<button type="button" class="ob-opt' + (o.career === c.id ? " is-on" : "") + '" data-ob-career="' + c.id + '">' + esc(c.short) + "</button>"; }).join("") +
        '</div><div class="ob-actions"><button class="btn btn--ghost" type="button" data-ob="back">Atrás</button><button class="btn btn--primary" type="button" data-ob="next"' + (o.career ? "" : " disabled") + ">Seguir</button></div>";
      return head + '<h2 class="h2 ob-q" id="sheetTitle">¿Hasta dónde llegaste?</h2><p class="muted ob-sub">Marcamos como aprobadas las materias hasta ahí. Después ajustás lo que haga falta.</p><div class="ob-list">' +
        LEVELS.map(function (l) { return '<button type="button" class="ob-opt ob-opt--row' + (o.level === l[0] ? " is-on" : "") + '" data-ob-level="' + l[0] + '"><strong>' + l[1] + "</strong>" + (l[2] ? "<small>" + l[2] + "</small>" : "") + "</button>"; }).join("") +
        '</div><div class="ob-actions"><button class="btn btn--ghost" type="button" data-ob="back">Atrás</button><button class="btn btn--primary" type="button" data-ob="finish"' + (o.level === null ? " disabled" : "") + ">Ver mi plan</button></div>";
    }
    openSheet(render);
    sheet.classList.add("sheet--ob");
    sheetBody.onclick = function (ev) {
      var t = ev.target.closest("button"); if (!t) return;
      var nameEl = $("#obName"); if (nameEl) o.name = nameEl.value.trim();
      if (t.dataset.obCareer) { o.career = t.dataset.obCareer; o.step = 2; refreshSheet(); return; }
      if (t.dataset.obLevel != null) { o.level = +t.dataset.obLevel; refreshSheet(); return; }
      var a = t.dataset.ob;
      if (a === "skip") { o.name = ""; o.step = 1; }
      else if (a === "next") o.step = Math.min(2, o.step + 1);
      else if (a === "back") o.step = Math.max(0, o.step - 1);
      else if (a === "finish") {
        S.name = o.name; S.career = o.career; S.filter = "all"; ui.query = "";
        var c = DATA.byId[o.career], P = prog(c.id), n = 0;
        if (o.level >= 0 && o.level < 99) c.courses.forEach(function (x) { if (x.k === "lang" || x.k === "slot" || x.k === "afc") return; if (x.s <= o.level && !P[x.c]) { P[x.c] = { s: "a" }; n++; } });
        save(); closeSheet();
        if (location.hash === "#/plan") route(); else location.hash = "#/plan";
        toast(n ? "Marcamos " + n + " materias como aprobadas." : "¡Listo! Tocá una materia para marcarla.");
        return;
      }
      refreshSheet();
      var ni = $("#obName"); if (ni) { ni.focus(); ni.onkeydown = function (e) { if (e.key === "Enter") { o.name = ni.value.trim(); o.step = 1; refreshSheet(); } }; }
    };
    var ni = $("#obName"); if (ni) ni.onkeydown = function (e) { if (e.key === "Enter") { o.name = ni.value.trim(); o.step = 1; refreshSheet(); } };
  }

  /* ---------------- selector de carrera ---------------- */
  function renderCareerPicker() {
    var html = '<div class="wrap page"><div class="pickerTop"><p class="kicker">Plan de estudios</p>' + (career() ? '<a class="btn btn--sm" href="#/plan">' + ic("chev") + "Volver a " + esc(career().short) + "</a>" : "") + '</div><h1 class="h1">Elegí tu carrera</h1>' +
      '<p class="lead">Están los 13 planes vigentes de Ingeniería UNLP con sus correlativas. Tu progreso queda guardado en este dispositivo y podés tener varias carreras a la vez.</p><div class="careerPick">';
    DATA.plans.careers.forEach(function (c) {
      var pct = careerPct(c);
      html += '<button type="button" class="card careerCard lift glow rise' + (c.id === S.career ? " is-current" : "") + '" data-career="' + c.id + '"><span class="mono">Plan ' + esc(c.plan) + " · " + c.mainCount + " materias</span><strong>" + esc(c.short) + "</strong>" +
        (pct ? '<span class="bar"><i style="width:' + pct + '%"></i></span>' : '<span class="bar"></span>') + "</button>";
    });
    html += "</div></div>";
    main.innerHTML = html; stagger(main);
    $all("[data-career]", main).forEach(function (b) { b.onclick = function () { S.career = b.dataset.career; S.filter = "all"; ui.query = ""; save(); if (location.hash === "#/plan") route(); else location.hash = "#/plan"; }; });
  }

  /* ---------------- detalle de materia ---------------- */
  function openSubject(c, code) {
    if (!c || !c.byCode[code]) return;
    openSheet(function () { return subjectSheet(c, code); });
    bindSheet(c, code);
  }
  function bindSheet(c, code) {
    sheetBody.onclick = function (ev) {
      var t = ev.target.closest("button, a");
      if (!t) return;
      if (t.dataset.setst) { setStatus(c, code, t.dataset.setst, true); bindSheet(c, code); }
      else if (t.dataset.grade) {
        var P = prog(c.id); var g = +t.dataset.grade;
        P[code] = P[code] || { s: "a" }; if (P[code].n === g) delete P[code].n; else P[code].n = g;
        save(); rerenderPlanBits();
      } else if (t.dataset.pick !== undefined) {
        var P2 = prog(c.id); P2[code] = P2[code] || { s: "p" };
        if (t.dataset.pick) P2[code].pick = t.dataset.pick; else delete P2[code].pick;
        if (!P2[code].pick && P2[code].s === "p") delete P2[code];
        save(); rerenderPlanBits();
      } else if (t.dataset.goto) { openSubject(c, t.dataset.goto); }
    };
  }
  function nameOf(c, code) { var x = c.byCode[code]; return x ? x.n : code; }
  function listNames(c, codes) { return codes.map(function (r) { return "<strong>" + esc(nameOf(c, r)) + "</strong>"; }).join(", "); }
  function subjectSheet(c, code) {
    var x = c.byCode[code], e = evaluate(c, x), P = (S.prog[c.id] || {})[code] || {};
    var where = x.s != null ? semLabel(x.s) : x.k === "opt" ? "Optativa" : "Electiva humanística";
    var h = '<div class="dHead"><div><p class="dMeta">' + esc(x.k === "slot" ? "A elección" : x.c) + " · " + esc(where) + (x.a ? " · anual" : "") + '</p><h2 class="h2" id="sheetTitle">' + esc(displayName(c, x)) + '</h2></div><button class="iconBtn" type="button" data-close aria-label="Cerrar">' + ic("x") + "</button></div>";

    // 1) acción principal: el estado
    h += '<div class="statusSeg" role="group" aria-label="Estado" style="margin-top:16px">' +
      ["p", "c", "r", "a"].map(function (s) { return '<button type="button" data-setst="' + s + '" aria-pressed="' + (e.s === s) + '"><i style="background:' + ST_COLOR[s] + '"></i>' + ST_LABEL[s] + "</button>"; }).join("") + "</div>";
    if (e.s === "a" && x.k !== "lang" && x.k !== "afc") {
      h += '<div class="gradeRow"><span class="small muted" style="margin-right:4px">Nota</span>' + [4, 5, 6, 7, 8, 9, 10].map(function (n) { return '<button type="button" data-grade="' + n + '" aria-pressed="' + (P.n === n) + '">' + n + "</button>"; }).join("") + "</div>";
    }

    // 2) una línea que explica qué pasa
    var extra = [];
    if (e.minMissing) extra.push("tener " + x.min + " materias aprobadas (tenés " + e.have + ")");
    if (e.semMissing.length) extra.push("aprobar todo hasta el " + x.sem + "° semestre");
    var msg, tone = "";
    if (e.state === "done") { tone = "ok"; msg = P.n ? "Aprobada con " + P.n + "." : "Aprobada. Cargale la nota si querés sumar al promedio."; }
    else if (e.state === "final") { tone = "warn"; msg = "Podés rendir el final: tenés todas sus correlativas aprobadas."; }
    else if (e.state === "reg") { tone = "warn"; msg = "Para rendir el final te falta aprobar " + [e.needFinal.map(function (r) { return nameOf(c, r); }).join(", ")].concat(extra).filter(Boolean).join(" y ") + "."; }
    else if (e.state === "cur") { msg = e.needFinal.length ? "Para aprobarla vas a necesitar aprobar " + e.needFinal.map(function (r) { return nameOf(c, r); }).join(", ") + "." : "La estás cursando. Ya tenés todo para aprobarla."; }
    else if (e.state === "ready") { tone = "ok"; msg = "Podés cursarla." + (e.needFinal.length ? " Para aprobarla antes tenés que aprobar " + e.needFinal.map(function (r) { return nameOf(c, r); }).join(", ") + "." : ""); }
    else {
      var nl = e.needCursar.filter(function (r) { return !(c.byCode[r] && c.byCode[r].k === "lang"); }).map(function (r) { return nameOf(c, r); });
      var ll = e.needCursar.filter(function (r) { return c.byCode[r] && c.byCode[r].k === "lang"; }).map(function (r) { return nameOf(c, r); });
      var parts = []; if (nl.length) parts.push("regularizar " + nl.join(", ")); if (ll.length) parts.push("aprobar " + ll.join(", "));
      msg = "Para cursarla te falta " + parts.concat(extra).join(" y ") + ".";
    }
    h += '<p class="dNote' + (tone ? " is-" + tone : "") + '">' + esc(msg) + "</p>";

    if (x.k === "slot") {
      var pool = x.pool === "opt" ? c.opt : c.hum;
      h += '<div class="dSection"><p class="dLabel">¿Cuál elegiste?</p><div class="poolChoice">' +
        '<button type="button" class="reqRow" data-pick=""><span class="dot"></span><span><strong>Todavía no elegí</strong></span>' + (P.pick ? "" : ic("check", "chev")) + "</button>" +
        pool.map(function (o) { var oe = evaluate(c, o); return '<button type="button" class="reqRow" data-pick="' + esc(o.c) + '"><span class="dot is-' + ({ a: "aprobada", r: "regular", c: "cursando", p: "" })[oe.s] + '"></span><span><strong>' + esc(o.n) + "</strong><small>" + esc(o.c) + " · " + STATE[oe.state].label + "</small></span>" + (P.pick === o.c ? ic("check", "chev") : "") + "</button>"; }).join("") +
        "</div></div>";
    }

    // 3) correlativas y lo que habilita, compacto
    function chips(codes) {
      return '<div class="relChips">' + codes.map(function (r) {
        var st = stOf(c.id, r);
        return '<button type="button" class="relChip" data-goto="' + esc(r) + '"><i class="dot is-' + ({ a: "aprobada", r: "regular", c: "cursando", p: "" })[st] + '"></i>' + esc(nameOf(c, r)) + "</button>";
      }).join("") + "</div>";
    }
    var reqs = x.r || [];
    if (reqs.length) h += '<div class="dSection"><p class="dLabel">Necesita</p>' + chips(reqs) + "</div>";
    if (x.x) h += '<div class="dSection"><p class="dLabel">Condición</p><p class="small" style="margin:0">' + esc(x.x) + "</p></div>";
    var un = c.unlocks[x.c] || [];
    if (un.length) h += '<div class="dSection"><p class="dLabel">Habilita</p>' + chips(un) + "</div>";
    if (!reqs.length && !x.x && x.k !== "slot") h += '<p class="small muted" style="margin:14px 0 0">Sin correlativas: se puede cursar desde el principio.</p>';

    if (x.k !== "slot" && x.k !== "afc" && DATA.catedras[x.c]) h += '<div class="dSection"><p class="dLabel">Cátedra</p>' + catedraBlock(x.c, true) + "</div>";
    h += '<a class="dFoot" href="' + esc(c.official) + '" target="_blank" rel="noopener">Ver en el plan oficial' + ic("ext") + "</a>";
    return h;
  }

  /* ---------------- menú / ayuda / import ---------------- */
  function openPlanMenu(c) {
    var confirmReset = false;
    function render() {
      var n = Object.keys(S.prog[c.id] || {}).length;
      return '<div class="dHead"><div><p class="dMeta">' + esc(c.name) + '</p><h2 class="h2" id="sheetTitle">Opciones</h2></div><button class="iconBtn" type="button" data-close aria-label="Cerrar">' + ic("x") + "</button></div>" +
        '<div class="sheetList" style="margin-top:16px">' +
        '<button type="button" data-act="share">' + ic("share") + "<span>Pasar mi plan a otro dispositivo<small>Genera un link con tu progreso. Abrilo en el celu o la compu.</small></span></button>" +
        '<button type="button" data-act="switch">' + ic("plan") + "<span>Cambiar de carrera<small>Tu progreso de cada carrera queda guardado.</small></span></button>" +
        '<a href="' + esc(c.official) + '" target="_blank" rel="noopener">' + ic("ext") + "<span>Plan oficial en la web de la Facultad<small>Plan " + esc(c.plan) + " · " + c.hours + " horas</small></span></a>" +
        (n ? '<button type="button" class="danger" data-act="reset">' + ic("x") + "<span>" + (confirmReset ? "Tocá de nuevo para borrar todo" : "Reiniciar mi progreso") + "<small>" + (confirmReset ? "No se puede deshacer." : "Borra lo que marcaste en esta carrera (" + n + " materias).") + "</small></span></button>" : "") +
        "</div>";
    }
    openSheet(render);
    sheetBody.onclick = function (ev) {
      var t = ev.target.closest("[data-act]");
      if (!t) return;
      var a = t.dataset.act;
      if (a === "switch") { closeSheet(); location.hash = "#/plan?elegir=1"; }
      else if (a === "share") {
        var link = shareLink(c.id);
        if (navigator.share) { navigator.share({ title: "Mi plan · Gradiente", url: link }).catch(function () {}); }
        else if (navigator.clipboard) { navigator.clipboard.writeText(link).then(function () { toast("Link copiado. Pegalo en tu otro dispositivo."); }, function () { showLink(link); }); }
        else showLink(link);
      } else if (a === "reset") {
        if (!confirmReset) { confirmReset = true; refreshSheet(); return; }
        delete S.prog[c.id]; save(); closeSheet(); rerenderPlanBits(); toast("Listo, arrancás de cero.");
      }
    };
  }
  function showLink(link) {
    openSheet(function () {
      return '<div class="dHead"><div><h2 class="h2" id="sheetTitle">Tu link</h2></div><button class="iconBtn" type="button" data-close aria-label="Cerrar">' + ic("x") + '</button></div><p class="muted">Copialo y abrilo en tu otro dispositivo.</p><textarea class="textArea" readonly>' + esc(link) + "</textarea>";
    });
  }
  function askImport(imp) {
    var c = DATA.byId[imp.cid], n = Object.keys(imp.prog).length, cur = Object.keys(S.prog[imp.cid] || {}).length;
    openSheet(function () {
      return '<div class="dHead"><div><p class="dMeta">Importar progreso</p><h2 class="h2" id="sheetTitle">' + esc(c.name) + '</h2></div><button class="iconBtn" type="button" data-close aria-label="Cerrar">' + ic("x") + "</button></div>" +
        '<p>Este link trae <strong>' + n + " materias</strong> marcadas." + (cur ? " Va a reemplazar lo que tenés guardado en esta carrera (" + cur + " materias)." : "") + "</p>" +
        '<div class="dLinks"><button class="btn btn--primary btn--block" type="button" data-imp="1" data-autofocus>Importar</button><button class="btn btn--block" type="button" data-close>Cancelar</button></div>';
    });
    sheetBody.onclick = function (ev) {
      if (!ev.target.closest("[data-imp]")) return;
      S.prog[imp.cid] = imp.prog; S.career = imp.cid; save(); closeSheet(); route(); toast("¡Listo! Importamos tu plan.");
    };
  }
  function openHelp() {
    openSheet(function () {
      return '<div class="dHead"><div><p class="dMeta">Mi plan</p><h2 class="h2" id="sheetTitle">¿Cómo funciona?</h2></div><button class="iconBtn" type="button" data-close aria-label="Cerrar">' + ic("x") + "</button></div>" +
        '<ul class="helpList" style="margin-top:14px">' +
        "<li>En el <strong>Árbol</strong>, tocá una materia y abajo elegís su estado. En la <strong>Lista</strong>, el cuadradito de la izquierda va cambiando: pendiente → cursando → regular → aprobada.</li>" +
        "<li>Tocá el <strong>nombre</strong> para ver el detalle: qué te falta, qué habilita y cargar la nota.</li>" +
        "<li><strong>Regular</strong> = aprobaste la cursada y te queda el final. <strong>Aprobada</strong> = final o promoción.</li>" +
        "<li>Para <strong>cursar</strong> una materia necesitás sus correlativas regulares o aprobadas. Para <strong>rendir el final o promocionar</strong>, las correlativas tienen que estar aprobadas.</li>" +
        "<li>Al seleccionar una materia en el árbol se marca su camino: lo que necesitás antes (rojo) y lo que destraba después (azul).</li>" +
        "<li>Todo se guarda en este dispositivo, nadie más lo ve. Para pasarlo a otro, usá ⋯ → «Pasar mi plan a otro dispositivo».</li>" +
        "</ul>" +
        '<div class="dState" style="margin-top:18px">' + ic("help") + '<p>Los datos salen de los planes oficiales publicados por la Facultad. Si ves algo raro, avisanos por <a href="' + esc(CFG.consultationFormUrl) + '" target="_blank" rel="noopener" style="text-decoration:underline">consultas</a>. Ante dudas, SIU Guaraní y el Dpto. de Alumnos mandan.</p></div>';
    });
  }

  /* ======================================================================
     RECURSOS
     ====================================================================== */
  var resState = { q: "", spy: null };
  function catList() {
    return (CFG.categories || []).map(function (c) { return Array.isArray(c) ? { id: c[0], name: c[1] } : c; });
  }
  function catOf(id) { return catList().find(function (c) { return c.id === id; }) || { id: id, name: id }; }
  function linkLabel(l) { return l.label || (l.url.indexOf("mailto:") === 0 ? l.title.split(":")[0] : l.title); }
  function linkHost(l) { return l.url.indexOf("mailto:") === 0 ? l.url.slice(7) : l.url.replace(/^https?:\/\/(www\d?\.)?/, "").split("/")[0]; }
  function linkIcon(l) {
    var u = l.url || "";
    if (u.indexOf("mailto:") === 0) return "mail";
    if (/drive\.google/.test(u)) return "folder";
    if (/forms/.test(u)) return "chat";
    return "ext";
  }
  function cStyle(color) { return color ? ' style="--c:' + esc(color) + '"' : ""; }

  /* --- nube: buscador "¿hay material de mi materia?" --- */
  function subjectIndex() {
    if (DATA.subjects) return DATA.subjects;
    var map = {};
    (DATA.plans ? DATA.plans.careers : []).forEach(function (c) {
      [].concat(c.courses, c.opt, c.hum).forEach(function (x) {
        if (!x.c || x.k === "slot" || x.k === "afc" || /^(OPT|HUM|AFC)\d/.test(x.c)) return;
        var m = map[x.c] || (map[x.c] = { c: x.c, n: x.n, careers: [], key: "" });
        if (m.careers.indexOf(c.short || c.name) < 0) m.careers.push(c.short || c.name);
      });
    });
    DATA.subjects = Object.keys(map).map(function (k) { var m = map[k]; m.key = norm(m.n + " " + m.c); return m; })
      .sort(function (a, b) { return a.n.localeCompare(b.n, "es"); });
    return DATA.subjects;
  }
  function searchSubjects(q, onlyNube) {
    var nq = norm(q), list = subjectIndex(), mine = career();
    if (onlyNube) list = list.filter(function (s) { return DATA.nube[s.c]; });
    if (!nq) return [];
    var words = nq.split(/\s+/);
    var hits = list.filter(function (s) { return words.every(function (w) { return s.key.indexOf(w) >= 0; }); });
    hits.sort(function (a, b) {
      var am = mine && mine.byCode[a.c] ? 0 : 1, bm = mine && mine.byCode[b.c] ? 0 : 1;
      var as = norm(a.n).indexOf(nq) === 0 ? 0 : 1, bs = norm(b.n).indexOf(nq) === 0 ? 0 : 1;
      return am - bm || as - bs || a.n.localeCompare(b.n, "es");
    });
    return hits;
  }
  function mySubjects(filterFn) {
    var c = career(); if (!c) return [];
    var order = { c: 0, r: 1, p: 2, a: 3 };
    return c.courses.filter(function (x) { return x.k !== "lang" && x.k !== "slot" && x.k !== "afc" && (!filterFn || filterFn(x)); })
      .map(function (x) { return { c: x.c, n: x.n, st: stOf(c.id, x.c) }; })
      .filter(function (x) { return x.st === "c" || x.st === "r"; })
      .sort(function (a, b) { return order[a.st] - order[b.st]; });
  }
  function nubeCount() { return Object.keys(DATA.nube || {}).length; }
  function nubeHit(s) {
    var n = DATA.nube[s.c];
    return '<a class="nubeHit" href="' + esc(CFG.driveUrl) + '" target="_blank" rel="noopener"><span class="nubeHit-ic">' + ic("folder") + '</span><span><strong>' + esc(s.n) + "</strong><small>Carpeta «" + esc(n.f[0]) + "»</small></span><em>" + n.n + " archivo" + (n.n === 1 ? "" : "s") + "</em></a>";
  }
  function nubeFinderResults(q) {
    if (!q) {
      var mine = mySubjects(function (x) { return DATA.nube[x.c]; }).slice(0, 4);
      if (!mine.length) return '<p class="nubeHint">Probá con «análisis», «física» o el código de la materia.</p>';
      return '<p class="nubeHint">De lo que estás cursando:</p>' + mine.map(nubeHit).join("");
    }
    var hits = searchSubjects(q, true).slice(0, 5);
    if (hits.length) return hits.map(nubeHit).join("");
    var any = searchSubjects(q, false)[0];
    return '<p class="nubeHint">' + (any ? "Todavía no hay material de <strong>" + esc(any.n) + "</strong>. Si tenés, ¡compartilo!" : "No encontramos esa materia.") + "</p>";
  }
  function nubeFinder(id) {
    return '<div class="nubeFind"><label class="search search--soft"><span class="sr">Buscar materia en la nube</span>' + ic("search") +
      '<input id="' + id + '" type="search" placeholder="¿Hay material de tu materia?" autocomplete="off"></label>' +
      '<div class="nubeHits" id="' + id + 'Hits">' + nubeFinderResults("") + "</div></div>";
  }
  function bindNubeFinder(id, root) {
    var inp = $("#" + id, root), out = $("#" + id + "Hits", root);
    if (inp) inp.addEventListener("input", function () { out.innerHTML = nubeFinderResults(inp.value); });
  }
  function nubeCard() {
    return '<section class="nubeCard rise"><div class="nubeCard-main">' +
      '<span class="nubeCard-badge">' + ic("cloud") + "Nube Gradiente</span>" +
      '<h2 class="h2">Parciales, finales y apuntes</h2>' +
      "<p>Material de estudiantes para estudiantes, ordenado por materia. En tu plan te marcamos con " + ic("folder", "inlineIc") + " las materias que tienen algo.</p>" +
      '<div class="nubeStats"><span><b>2.600+</b>archivos</span><span><b>' + nubeCount() + "</b>materias</span></div>" +
      '<a class="btn btn--accent" href="' + esc(CFG.driveUrl) + '" target="_blank" rel="noopener">' + ic("folder") + "Abrir la nube</a></div>" +
      nubeFinder("nubeQ") + "</section>";
  }

  /* --- página --- */
  function renderRecursos() {
    if (!DATA.links || !DATA.plans) loading();
    return Promise.all([ensureLinks(), ensurePlans()]).then(function () {
      var cats = catList().filter(function (c) { return !c.hide && DATA.links.some(function (l) { return l.category === c.id; }); });
      var html = '<div class="wrap page res"><p class="kicker">Recursos</p><h1 class="h1">Todo lo que<br>vas a buscar</h1>' +
        '<p class="lead">Trámites, becas, apuntes, cursada y contactos útiles de la Facultad, en un solo lugar.</p>' +
        nubeCard() +
        '<div class="stickSentinel" id="stickSentinel"></div><div class="planTools resTools" id="planTools"><label class="search"><span class="sr">Buscar</span>' + ic("search") +
        '<input id="resSearch" type="search" placeholder="Buscar: becas, SIU, turnos, mails…" autocomplete="off" value="' + esc(resState.q) + '"></label>' +
        '<nav class="chipsRow resChips" aria-label="Ir a una categoría">' +
        cats.map(function (c) { return '<a class="chip chip--c" href="#res-' + slug(c.id) + '" data-jump="' + slug(c.id) + '"' + cStyle(c.color) + '><i class="dot"></i>' + esc(c.name) + "</a>"; }).join("") + "</nav></div>" +
        '<div id="resBody"></div>' +
        '<section class="askBand rise"><div><h2 class="h3">¿No encontrás lo que buscás?</h2><p>Contanos qué necesitás y te decimos a dónde ir, o encontrá el mail de tu cátedra.</p></div>' +
        '<button class="btn btn--primary" type="button" data-help>' + ic("chat") + "Hacer una consulta</button></section>" +
        footer() + "</div>";
      main.innerHTML = html; stagger(main);
      watchSticky();
      bindNubeFinder("nubeQ", main);
      var inp = $("#resSearch");
      inp.addEventListener("input", function () { resState.q = inp.value; paintRes(cats); });
      $all("[data-jump]", main).forEach(function (a) {
        a.addEventListener("click", function (e) {
          e.preventDefault();
          if (resState.q) { resState.q = ""; inp.value = ""; paintRes(cats); }
          var t = $("#res-" + a.dataset.jump);
          if (t) window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - (60 + $("#planTools").offsetHeight + 8), behavior: "smooth" });
        });
      });
      $("[data-help]", main).onclick = function () { openConsultas(); };
      paintRes(cats);
    }).catch(failed);
  }
  function slug(s) { return norm(s).replace(/[^a-z0-9]+/g, "-"); }
  function resRow(l) {
    var mail = l.url.indexOf("mailto:") === 0;
    var inner = '<a class="resRow" href="' + esc(l.url) + '"' + (mail ? "" : ' target="_blank" rel="noopener"') + '><span class="resRow-t"><strong>' + esc(linkLabel(l)) + "</strong><small>" + esc(mail ? linkHost(l) : (l.desc || linkHost(l))) + "</small></span>" + ic(mail ? "mail" : "ext") + "</a>";
    if (!mail) return inner;
    return '<div class="resRow-wrap">' + inner + '<button class="iconBtn iconBtn--sm" type="button" data-copy="' + esc(linkHost(l)) + '" aria-label="Copiar mail">' + ic("copy") + "</button></div>";
  }
  function resTile(l) {
    return '<a class="resTile lift" href="' + esc(l.url) + '" target="_blank" rel="noopener"><strong>' + esc(linkLabel(l)) + "</strong><span>" + esc(l.desc || "") + "</span><small>" + esc(linkHost(l)) + ic("ext") + "</small></a>";
  }
  function paintRes(cats) {
    var q = norm(resState.q), el = $("#resBody"), html = "";
    if (q) {
      var words = q.split(/\s+/);
      var hits = DATA.links.filter(function (l) {
        var hay = norm([l.title, l.label, l.desc, l.category, catOf(l.category).name, linkHost(l)].concat(l.tags || []).join(" "));
        return words.every(function (w) { return hay.indexOf(w) >= 0; });
      });
      html = hits.length ? '<p class="resCount">' + hits.length + " resultado" + (hits.length === 1 ? "" : "s") + '</p><div class="resResults">' + hits.map(function (l) {
        var c = catOf(l.category);
        return '<div class="resHit"' + cStyle(c.color) + '><span class="resHit-cat">' + ic(c.icon || "ext") + esc(c.name) + "</span>" + resRow(l) + "</div>";
      }).join("") + "</div>"
        : '<div class="emptyState"><p><strong>No encontramos nada con eso.</strong></p><p class="small">Probá con otra palabra o <button type="button" class="linkBtn" data-help>hacé una consulta</button>.</p></div>';
    } else {
      html = '<div class="resGrid">' + cats.map(function (c) {
        var items = DATA.links.filter(function (l) { return l.category === c.id; });
        var tiles = c.layout === "tiles";
        return '<section class="resPanel' + (tiles ? " resPanel--wide" : "") + '" id="res-' + slug(c.id) + '"' + cStyle(c.color) + ">" +
          '<header class="resPanel-h"><span class="resPanel-ic">' + ic(c.icon || "links") + '</span><div><h2 class="h3">' + esc(c.name) + "</h2>" + (c.desc ? "<p>" + esc(c.desc) + "</p>" : "") + '</div><span class="resPanel-n">' + items.length + "</span></header>" +
          (tiles ? '<div class="resTiles">' + items.map(resTile).join("") + "</div>" : '<div class="resRows">' + items.map(resRow).join("") + "</div>") +
          "</section>";
      }).join("") + "</div>";
    }
    el.innerHTML = html;
    $all("[data-help]", el).forEach(function (b) { b.onclick = function () { openConsultas(); }; });
    watchSpy();
  }
  // copiar mails (en toda la app)
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-copy]");
    if (!b) return;
    e.preventDefault();
    var txt = b.dataset.copy;
    var done = function () { toast("Mail copiado: " + txt); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, function () { toast(txt); });
    else toast(txt);
  });
  // resalta en la barra la categoría que estás viendo
  var spyObs;
  function watchSpy() {
    if (spyObs) spyObs.disconnect();
    if (!("IntersectionObserver" in window)) return;
    var panels = $all(".resPanel", main);
    if (!panels.length) return;
    var visible = {};
    spyObs = new IntersectionObserver(function (en) {
      en.forEach(function (x) { visible[x.target.id] = x.isIntersecting ? x.boundingClientRect.top : null; });
      var best = null, bestTop = Infinity;
      Object.keys(visible).forEach(function (k) { if (visible[k] != null && visible[k] < bestTop) { bestTop = visible[k]; best = k; } });
      $all("[data-jump]", main).forEach(function (a) {
        var on = best === "res-" + a.dataset.jump;
        a.classList.toggle("is-on", on);
        if (on && a.scrollIntoView && a.parentNode.scrollWidth > a.parentNode.clientWidth) a.parentNode.scrollTo({ left: a.offsetLeft - 16, behavior: "smooth" });
      });
    }, { rootMargin: "-140px 0px -55% 0px" });
    panels.forEach(function (p) { spyObs.observe(p); });
  }

  /* ======================================================================
     CONSULTAS: asistente "¿En qué te ayudamos?"
     ====================================================================== */
  var helpState = { step: "home", q: "", code: null };
  function openConsultas(step) {
    helpState = { step: step || "home", q: "", code: null };
    Promise.all([ensureLinks(), ensurePlans()]).then(function () { showHelp(); });
  }
  function showHelp() { openSheet(helpView); bindHelp(); }
  function helpGo(step, extra) { helpState.step = step; if (extra) Object.keys(extra).forEach(function (k) { helpState[k] = extra[k]; }); showHelp(); }
  function helpTopic(id) { return (CFG.help || []).find(function (t) { return t.id === id; }); }
  function linkByTitle(t) { return DATA.links.find(function (l) { return l.title === t; }) || (DATA.allLinks || []).find(function (l) { return l.title === t; }); }
  function mailCard(m) {
    return '<div class="mailCard"><a href="mailto:' + esc(m.mail) + '"><span class="mailCard-ic">' + ic("mail") + '</span><span><strong>' + esc(m.label) + "</strong><small>" + esc(m.mail) + "</small>" + (m.note ? "<em>" + esc(m.note) + "</em>" : "") + "</span></a>" +
      '<button class="iconBtn iconBtn--sm" type="button" data-copy="' + esc(m.mail) + '" aria-label="Copiar mail">' + ic("copy") + "</button></div>";
  }
  function helpHead(title, meta, back) {
    return '<div class="dHead">' + (back ? '<button class="iconBtn" type="button" data-hback aria-label="Volver">' + ic("back") + "</button>" : "") +
      '<div><p class="dMeta">' + esc(meta) + '</p><h2 class="h2" id="sheetTitle">' + esc(title) + '</h2></div><button class="iconBtn" type="button" data-close aria-label="Cerrar">' + ic("x") + "</button></div>";
  }
  function helpFoot() {
    return '<div class="helpFoot"><p>¿No se resolvió?</p><a class="btn btn--sm" href="' + esc(CFG.consultationFormUrl) + '" target="_blank" rel="noopener">' + ic("chat") + "Escribile a Gradiente</a></div>";
  }
  function helpView() {
    var st = helpState.step;
    if (st === "home") {
      return helpHead("¿En qué te ayudamos?", "Consultas", false) +
        '<a class="helpNube" href="' + esc(CFG.driveUrl) + '" target="_blank" rel="noopener"><span class="helpNube-ic">' + ic("cloud") + '</span><span><em>Lo más buscado</em><strong>Nube de parciales, finales y apuntes</strong><small>' + nubeCount() + " materias con material</small></span>" + ic("ext") + "</a>" +
        '<p class="dLabel" style="margin:20px 0 8px">Elegí un tema</p><div class="helpTopics">' +
        (CFG.help || []).map(function (t) {
          return '<button type="button" class="helpTopic" data-topic="' + esc(t.id) + '"' + cStyle(t.color) + '><span class="helpTopic-ic">' + ic(t.icon || "help") + "</span><span><strong>" + esc(t.title) + "</strong>" + (t.sub ? "<small>" + esc(t.sub) + "</small>" : "") + "</span>" + ic("chev") + "</button>";
        }).join("") + "</div>";
    }
    if (st === "materia") return helpMateria();
    if (st === "catedra") return helpCatedra(helpState.code);
    var t = helpTopic(st);
    if (!t) return "";
    var h = helpHead(t.title, "Consultas", true);
    if (t.nube) {
      h += '<p class="dNote">Buscá tu materia para ver si hay material y en qué carpeta está.</p>' + nubeFinder("helpNubeQ") +
        '<a class="btn btn--accent btn--block" style="margin-top:14px" href="' + esc(CFG.driveUrl) + '" target="_blank" rel="noopener">' + ic("folder") + "Abrir la nube</a>";
    }
    if (t.gradiente) {
      h += '<p class="dNote">Somos estudiantes como vos. Escribinos por donde te quede más cómodo.</p><div class="helpLinks">' +
        '<a class="resRow" href="' + esc(CFG.consultationFormUrl) + '" target="_blank" rel="noopener"><span class="resRow-t"><strong>Formulario de consultas</strong><small>Te respondemos por mail</small></span>' + ic("ext") + "</a>" +
        (CFG.socialLinks || []).filter(function (s) { return s.icon !== "tt"; }).map(function (s) {
          return '<a class="resRow" href="' + esc(s.url) + '" target="_blank" rel="noopener"><span class="resRow-t"><strong>' + esc(s.label) + "</strong><small>" + esc(s.url.replace(/^mailto:|^https?:\/\/(www\.)?/, "").split("?")[0]) + "</small></span>" + ic(s.icon) + "</a>";
        }).join("") + "</div>";
      return h;
    }
    if (t.mails && t.mails.length) h += '<p class="dLabel" style="margin:18px 0 8px">Escribiles</p>' + t.mails.map(mailCard).join("");
    var ls = (t.links || []).map(linkByTitle).filter(Boolean);
    if (ls.length) h += '<p class="dLabel" style="margin:18px 0 8px">Links útiles</p><div class="helpLinks">' + ls.map(resRow).join("") + "</div>";
    return h + helpFoot();
  }
  function helpMateria() {
    var h = helpHead("¿De qué materia?", "Consultas · Cátedras", true);
    h += '<label class="search" style="margin-top:14px"><span class="sr">Buscar materia</span>' + ic("search") + '<input id="helpMatQ" type="search" placeholder="Nombre o código de la materia" autocomplete="off" value="' + esc(helpState.q) + '" data-autofocus></label>' +
      '<div class="helpMatList" id="helpMatList">' + helpMatResults() + "</div>";
    return h;
  }
  function matRow(s, extra) {
    var cat = DATA.catedras[s.c];
    return '<button type="button" class="matRow" data-mat="' + esc(s.c) + '"><span><strong>' + esc(s.n) + "</strong><small>" + esc(s.c) + (extra ? " · " + esc(extra) : s.careers ? " · " + esc(s.careers.slice(0, 2).join(", ")) + (s.careers.length > 2 ? "…" : "") : "") + "</small></span>" +
      (cat && cat.m ? '<span class="matRow-tag">' + ic("mail") + "</span>" : "") + ic("chev") + "</button>";
  }
  function helpMatResults() {
    var q = helpState.q;
    if (!q) {
      var mine = mySubjects();
      if (mine.length) return '<p class="dLabel" style="margin:16px 0 6px">Lo que estás cursando</p>' + mine.slice(0, 8).map(function (s) { return matRow(s, s.st === "c" ? "cursando" : "regular"); }).join("");
      return '<p class="nubeHint" style="margin-top:14px">Escribí el nombre de la materia. Te mostramos el mail de la cátedra y su página.</p>';
    }
    var hits = searchSubjects(q, false).slice(0, 25);
    return hits.length ? hits.map(function (s) { return matRow(s); }).join("") : '<p class="nubeHint" style="margin-top:14px">No encontramos esa materia.</p>';
  }
  function subjName(code) { var s = subjectIndex().find(function (x) { return x.c === code; }); return s ? s.n : code; }
  function catedraBlock(code, compact) {
    var cat = DATA.catedras[code], base = (DATA.catedrasBase || "https://www1.ing.unlp.edu.ar/catedras/");
    var h = "";
    if (cat && cat.m) h += mailCard({ label: compact ? "Mail de la cátedra" : "Contacto de la cátedra", mail: cat.m, note: compact ? "" : "Es el mail que la cátedra publica en su página." });
    else if (!compact) h += '<div class="dState">' + ic("help") + "<p>La cátedra no publicó un mail de contacto. Probá por su página o por el aula virtual.</p></div>";
    h += '<div class="helpLinks">';
    if (cat) h += '<a class="resRow" href="' + esc(base + cat.p) + '" target="_blank" rel="noopener"><span class="resRow-t"><strong>Página de la cátedra</strong><small>Docentes, horarios, programa y novedades</small></span>' + ic("ext") + "</a>";
    h += '<a class="resRow" href="https://www.asignaturas.ing.unlp.edu.ar/course/search.php?search=' + encodeURIComponent(subjName(code)) + '" target="_blank" rel="noopener"><span class="resRow-t"><strong>Aula virtual</strong><small>Buscarla en el Portal de Asignaturas</small></span>' + ic("ext") + "</a>";
    h += "</div>";
    return h;
  }
  function helpCatedra(code) {
    var h = helpHead(subjName(code), code + " · Cátedra", true);
    h += '<div style="margin-top:14px">' + catedraBlock(code, false) + "</div>";
    var n = DATA.nube[code];
    if (n) h += '<a class="helpNube helpNube--sm" href="' + esc(CFG.driveUrl) + '" target="_blank" rel="noopener"><span class="helpNube-ic">' + ic("folder") + '</span><span><em>En la nube</em><strong>' + n.n + " archivo" + (n.n === 1 ? "" : "s") + "</strong><small>Carpeta «" + esc(n.f[0]) + "»</small></span>" + ic("ext") + "</a>";
    h += '<p class="small muted" style="margin:16px 0 0">Tip: escribí desde tu correo institucional, poné la materia y tu comisión en el asunto.</p>';
    return h + helpFoot();
  }
  function bindHelp() {
    var b = sheetBody;
    $all("[data-topic]", b).forEach(function (x) { x.onclick = function () { helpGo(x.dataset.topic, { q: "" }); }; });
    var back = $("[data-hback]", b);
    if (back) back.onclick = function () { helpGo(helpState.step === "catedra" ? "materia" : "home"); };
    bindNubeFinder("helpNubeQ", b);
    var mq = $("#helpMatQ", b);
    if (mq) {
      var list = $("#helpMatList", b);
      var bindRows = function () { $all("[data-mat]", list).forEach(function (r) { r.onclick = function () { helpGo("catedra", { code: r.dataset.mat }); }; }); };
      mq.addEventListener("input", function () { helpState.q = mq.value; list.innerHTML = helpMatResults(); bindRows(); });
      bindRows();
      var end = mq.value.length; try { mq.setSelectionRange(end, end); } catch (e) {}
    }
  }

  /* ======================================================================
     MESITA
     ====================================================================== */
  var shopCat = "all";
  function promoCard(p, compact) {
    var items = Array.isArray(p.items) ? p.items : [];
    var list = !items.length ? "" : compact
      ? '<span class="promoItems-line">' + esc(items.join(" · ")) + "</span>"
      : '<ul class="promoItems">' + items.map(function (it) { return "<li>" + esc(it) + "</li>"; }).join("") + "</ul>";
    return '<div class="promoCard' + (compact ? "" : " lift rise") + '"><span class="tag">' + esc(p.label || "Promo") + "</span><strong>" + esc(p.title) + "</strong>" +
      list + '<span class="price">' + esc(p.price) + "</span></div>";
  }
  function renderMesita() {
    if (!DATA.kiosco) loading();
    return ensureKiosco().then(function () {
      var K = DATA.kiosco;
      var cats = []; K.productos.forEach(function (p) { if (p.category && cats.indexOf(p.category) < 0) cats.push(p.category); });
      var html = '<div class="wrap page"><p class="kicker">Mesita en Electro</p><h1 class="h1">Librería<br>a precio estudiante</h1>' +
        '<p class="lead">Kits de cuadernos y útiles sueltos. Pasá a buscar el tuyo por la mesita de Gradiente, en el edificio de Electro.</p>';
      if (K.promos.length) html += '<div class="promoCards">' + K.promos.map(function (p) { return promoCard(p, false); }).join("") + "</div>";
      html += '<div class="sectionHead"><h2 class="h2">Productos</h2></div>';
      if (cats.length > 1) html += '<div class="chipsRow" role="group" aria-label="Categorías"><button class="chip" type="button" data-shop="all" aria-pressed="' + (shopCat === "all") + '">Todo</button>' + cats.map(function (c) { return '<button class="chip" type="button" data-shop="' + esc(c) + '" aria-pressed="' + (shopCat === c) + '">' + esc(c) + "</button>"; }).join("") + "</div>";
      html += '<div class="shopGrid" id="shopGrid"></div>' + footer() + "</div>";
      main.innerHTML = html;
      $all("[data-shop]", main).forEach(function (b) { b.onclick = function () { shopCat = b.dataset.shop; $all("[data-shop]", main).forEach(function (o) { o.setAttribute("aria-pressed", String(o === b)); }); paintShop(); }; });
      paintShop();
    }).catch(failed);
  }
  function paintShop() {
    var list = DATA.kiosco.productos.filter(function (p) { return shopCat === "all" || p.category === shopCat; });
    $("#shopGrid").innerHTML = list.map(function (p) {
      var out = p.stock && p.stock !== "disponible";
      return '<div class="card product lift rise"><span class="cat">' + esc(p.category || "") + "</span><strong>" + esc(p.name) + "</strong><p>" + esc(p.description || "") + '</p><span class="price">' + esc(p.price) + '</span><span class="stock' + (out ? " is-out" : "") + '">' + (out ? "Sin stock" : "● Disponible") + "</span></div>";
    }).join("") || '<p class="muted">Pronto cargamos productos.</p>';
    stagger($("#shopGrid"));
  }

  /* ---------------- modo desarrollo (solo en localhost o con ?dev) ---------------- */
  function sampleProgress(c) {
    var P = {}, notes = [7, 8, 6, 9, 7, 10, 8, 6, 7, 9];
    var main = c.courses.filter(function (x) { return x.k !== "lang" && x.k !== "slot"; }).sort(function (a, b) { return a.s - b.s; });
    main.forEach(function (x, i) {
      if (x.s <= 2) P[x.c] = { s: "a", n: notes[i % notes.length] };
      else if (x.s === 3) P[x.c] = i % 3 === 0 ? { s: "r" } : { s: "a", n: notes[i % notes.length] };
      else if (x.s === 4 && i % 2 === 0) P[x.c] = { s: "c" };
    });
    return P;
  }
  function mountDev() {
    if (!DEV.on) return;
    var fab = document.createElement("button");
    fab.type = "button"; fab.className = "devFab";
    function paint() { fab.classList.toggle("is-temp", DEV.temp); fab.innerHTML = "<i></i>DEV" + (DEV.temp ? " · sin guardar" : ""); }
    paint(); document.body.appendChild(fab);
    fab.onclick = function () {
      openSheet(function () {
        var c = career();
        return '<div class="dHead"><div><p class="dMeta">Solo se ve en tu compu (localhost)</p><h2 class="h2" id="sheetTitle">Modo desarrollo</h2></div><button class="iconBtn" type="button" data-close aria-label="Cerrar">' + ic("x") + "</button></div>" +
          '<div class="sheetList" style="margin-top:16px">' +
          '<button type="button" data-dev="fresh">' + ic("home") + "<span>Ver como primera vez<small>Borra carrera, progreso y tema, y vuelve al inicio.</small></span></button>" +
          '<button type="button" data-dev="temp" class="' + (DEV.temp ? "is-on" : "") + '">' + ic(DEV.temp ? "check" : "lock") + "<span>" + (DEV.temp ? "Modo prueba activado" : "Activar modo prueba") + "<small>" + (DEV.temp ? "Nada de lo que toques se guarda. Tocá para desactivar y volver a lo guardado." : "Podés tocar todo; al recargar vuelve a como estaba.") + "</small></span></button>" +
          '<button type="button" data-dev="picker">' + ic("plan") + "<span>Elegir otra carrera<small>Va al selector de carreras.</small></span></button>" +
          (c ? '<button type="button" data-dev="sample">' + ic("check") + "<span>Cargar progreso de ejemplo<small>Marca 1° año aprobado, algunas regulares y cursando en " + esc(c.short) + ".</small></span></button>" : "") +
          '<button type="button" class="danger" data-dev="wipe">' + ic("x") + "<span>Borrar progreso de todas las carreras<small>Mantiene la carrera elegida.</small></span></button>" +
          "</div>";
      });
      sheetBody.onclick = function (ev) {
        var t = ev.target.closest("[data-dev]"); if (!t) return;
        var a = t.dataset.dev;
        if (a === "fresh") {
          try { localStorage.removeItem(KEY); localStorage.removeItem("gradiente.theme"); localStorage.removeItem("gradiente.tip"); } catch (e) {}
          S.name = "";
          delete document.documentElement.dataset.theme; paintThemeBtn();
          S.career = null; S.prog = {}; S.view = "tree"; S.filter = "all"; ui.query = "";
          closeSheet(); if (location.hash === "#/" || !location.hash) route(); else location.hash = "#/";
          toast("Listo: estás viendo la página como alguien nuevo.");
        } else if (a === "temp") {
          DEV.temp = !DEV.temp;
          try { sessionStorage.setItem("gradiente.temp", DEV.temp ? "1" : "0"); } catch (e) {}
          if (!DEV.temp) { var saved = store.get(KEY, {}) || {}; S.career = saved.career || null; S.prog = saved.prog || {}; S.view = saved.tv || "tree"; route(); }
          paint(); refreshSheet();
          toast(DEV.temp ? "Modo prueba: no se guarda nada." : "Modo prueba apagado: volviste a lo guardado.");
        } else if (a === "picker") { closeSheet(); location.hash = "#/plan?elegir=1"; }
        else if (a === "sample") { var c = career(); S.prog[c.id] = sampleProgress(c); save(); closeSheet(); route(); toast("Progreso de ejemplo cargado."); }
        else if (a === "wipe") { S.prog = {}; save(); closeSheet(); route(); toast("Progreso borrado."); }
      };
    };
  }
  mountDev();

  /* ---------------- arranque ---------------- */
  route();
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
  }
})();
