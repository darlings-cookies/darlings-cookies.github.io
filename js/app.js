/* =====================================================================
   DARLINGS – page logic
   Builds the character cards, the cart and the order text from
   js/katalog.js. You normally do not need to edit this file.
   ===================================================================== */
(function () {
  "use strict";

  var SHOP = window.DARLINGS_SHOP || {};
  var ORDER = SHOP.order || {};
  var FULFILMENT = SHOP.fulfilment || {};
  var CATALOGUE = (window.DARLINGS_CATALOGUE || []).filter(function (c) {
    return c && c.id && c.name;
  });
  var TEST = SHOP.testMode !== false;
  var CURRENCY = SHOP.currency || "CHF";
  var MAX = Number.isInteger(SHOP.maxPerCookie) && SHOP.maxPerCookie > 0 ? SHOP.maxPerCookie : 99;
  var STORAGE_KEY = "darlings-warenkorb-v1";
  var TILTS = [-1.1, 0.9, -0.7, 1.2, -0.9, 0.6];

  var cart = {};            // { cookieId: quantity }
  var lineErrors = {};      // { cookieId: message }
  var storageWorks = true;

  /* ---------- small helpers ---------- */

  function $(id) { return document.getElementById(id); }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) {
      var value = attrs[key];
      if (value === null || value === undefined || value === false) return;
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value;
      else if (key === "style") node.setAttribute("style", value);
      else if (value === true) node.setAttribute(key, "");
      else node.setAttribute(key, value);
    });
    (children || []).forEach(function (child) {
      if (child === null || child === undefined || child === false) return;
      node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
    });
    return node;
  }

  function findCookie(id) {
    for (var i = 0; i < CATALOGUE.length; i++) if (CATALOGUE[i].id === id) return CATALOGUE[i];
    return null;
  }

  /* Price in Rappen (whole numbers avoid rounding slips). null = no price. */
  function priceOf(cookie) {
    if (typeof cookie.price === "number" && cookie.price > 0) {
      return { rappen: Math.round(cookie.price * 100), sample: false };
    }
    if (TEST && typeof SHOP.samplePrice === "number" && SHOP.samplePrice > 0) {
      return { rappen: Math.round(SHOP.samplePrice * 100), sample: true };
    }
    return null;
  }

  function canOrder(cookie) {
    return cookie.available !== false && priceOf(cookie) !== null;
  }

  function money(rappen) {
    return CURRENCY + " " + (rappen / 100).toFixed(2);
  }

  function cookieWord(n) { return n === 1 ? "Cookie" : "Cookies"; }

  /* Dark or light text on a character's accent colour. */
  function inkFor(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(String(hex || "").trim());
    if (!m) return "#3A1D12";
    var n = parseInt(m[1], 16);
    var lum = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    var L = 0.2126 * lum[0] + 0.7152 * lum[1] + 0.0722 * lum[2];
    return L > 0.3 ? "#3A1D12" : "#FFF6E1";
  }

  function announce(message) {
    var box = $("ansage");
    box.textContent = "";
    window.setTimeout(function () { box.textContent = message; }, 30);
  }

  /* ---------- cart state ---------- */

  function cleanCart(raw) {
    var clean = {};
    if (!raw || typeof raw !== "object") return clean;
    Object.keys(raw).forEach(function (id) {
      var cookie = findCookie(id);
      var qty = Number(raw[id]);
      if (cookie && canOrder(cookie) && Number.isInteger(qty) && qty >= 1) {
        clean[id] = Math.min(qty, MAX);
      }
    });
    return clean;
  }

  function loadCart() {
    try {
      var saved = window.localStorage.getItem(STORAGE_KEY);
      cart = cleanCart(saved ? JSON.parse(saved) : {});
    } catch (err) {
      cart = {};
      storageWorks = false;
    }
  }

  function saveCart() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
      storageWorks = true;
    } catch (err) {
      storageWorks = false;
    }
  }

  function cartLines() {
    // Catalogue order, so the cart and the order text always read the same way.
    return CATALOGUE.filter(function (c) { return cart[c.id]; }).map(function (c) {
      var price = priceOf(c);
      return { cookie: c, qty: cart[c.id], unit: price.rappen, sum: price.rappen * cart[c.id], sample: price.sample };
    });
  }

  function cartCount() {
    return Object.keys(cart).reduce(function (sum, id) { return sum + cart[id]; }, 0);
  }

  function cartTotal() {
    return cartLines().reduce(function (sum, line) { return sum + line.sum; }, 0);
  }

  function setQuantity(id, qty) {
    var cookie = findCookie(id);
    if (!cookie || !canOrder(cookie)) return;
    if (qty <= 0) delete cart[id];
    else cart[id] = Math.min(qty, MAX);
    delete lineErrors[id];
    saveCart();
  }

  /* ---------- hero sticker pile ---------- */

  function renderPile() {
    var pile = $("stapel");
    pile.textContent = "";
    CATALOGUE.slice(0, 4).forEach(function (cookie, i) {
      pile.appendChild(el("a", {
        class: "pile__sticker",
        href: "#cookie-" + cookie.id,
        "aria-label": cookie.name + " ansehen",
        style: "--tilt:" + (TILTS[(i + 1) % TILTS.length] * 3.2).toFixed(1) + "deg"
      }, [el("img", { src: cookie.image, alt: "", loading: "eager" })]));
    });
  }

  /* ---------- character cards ---------- */

  function renderCards() {
    var grid = $("karten");
    grid.textContent = "";
    if (!CATALOGUE.length) {
      grid.appendChild(el("p", { class: "notice", text: "Hier wohnen bald die ersten Cookies." }));
      return;
    }
    CATALOGUE.forEach(function (cookie, i) {
      var price = priceOf(cookie);
      var orderable = canOrder(cookie);
      var inCart = cart[cookie.id] || 0;
      var titleId = "name-" + cookie.id;

      var buy = el("div", { class: "card__buy" });
      if (cookie.available === false) {
        buy.appendChild(el("p", { class: "card__state", text: "Zurzeit nicht erhältlich" }));
      } else if (!price) {
        buy.appendChild(el("p", { class: "card__state card__state--soon", text: "Preis folgt bald" }));
      } else {
        buy.appendChild(el("p", { class: "card__price" }, [
          el("span", { class: "card__amount", text: money(price.rappen) }),
          price.sample ? el("span", { class: "tag", text: "Beispielpreis" }) : null
        ]));
        buy.appendChild(el("button", {
          class: "btn card__add", type: "button",
          "data-add": cookie.id, "aria-describedby": titleId,
          disabled: inCart >= MAX
        }, ["In den Warenkorb"]));
        buy.appendChild(el("p", {
          class: "card__incart",
          text: inCart ? inCart + " im Warenkorb" : " ",
          "aria-hidden": inCart ? null : "true"
        }));
      }

      var details = [];
      if (cookie.ingredients) details.push(el("p", { class: "card__fact" }, [el("strong", { text: "Zutaten: " }), String(cookie.ingredients)]));
      if (cookie.allergens) details.push(el("p", { class: "card__fact" }, [el("strong", { text: "Allergene: " }), String(cookie.allergens)]));

      grid.appendChild(el("article", {
        class: "card" + (orderable ? "" : " card--resting"),
        id: "cookie-" + cookie.id,
        tabindex: "-1",
        "aria-labelledby": titleId,
        style: "--accent:" + (cookie.accent || "#F2B632") + ";--accent-ink:" + inkFor(cookie.accent || "#F2B632") +
               ";--tilt:" + TILTS[i % TILTS.length] + "deg"
      }, [
        el("div", { class: "card__art" }, [
          el("img", { src: cookie.image, alt: cookie.imageAlt || cookie.name, loading: i < 2 ? "eager" : "lazy" })
        ]),
        el("h3", { class: "card__name", id: titleId, text: cookie.name }),
        el("div", { class: "card__body" }, [
          TEST && cookie.draft ? el("p", { class: "tag tag--draft", text: "Textentwurf" }) : null,
          el("p", { class: "card__text", text: cookie.description || "" }),
          cookie.variety ? el("p", { class: "card__sort" }, [el("span", { text: "Sorte" }), cookie.variety]) : null
        ].concat(details)),
        buy
      ]));
    });
  }

  /* ---------- header counter ---------- */

  var lastCount = null;
  var inFlight = 0;         // cookies still running to the cart: counted once they land
  function renderCounter() {
    var count = cartCount();
    var shown = Math.max(0, count - inFlight);
    var bubble = $("warenkorb-anzahl");
    bubble.textContent = String(shown);
    bubble.classList.toggle("is-empty", shown === 0);
    $("warenkorb-anzahl-text").textContent = count + " " + cookieWord(count) + " im Warenkorb";
    if (lastCount !== null && shown !== lastCount) {
      bubble.classList.remove("bump");
      void bubble.offsetWidth;            // restart the little bounce
      bubble.classList.add("bump");
    }
    lastCount = shown;
  }

  /* ---------- cookie run: from the card into the cart ---------- */

  function calmMotion() {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  /* Crumbs fly out of the counter and the cart button wobbles. */
  function splash(x, y) {
    var button = $("warenkorb-oeffnen");
    if (!button.animate) return;
    button.animate([
      { transform: "scale(1, 1)" },
      { transform: "scale(1.1, 0.84)", offset: 0.25 },
      { transform: "scale(0.95, 1.08)", offset: 0.6 },
      { transform: "scale(1, 1)" }
    ], { duration: 420, easing: "ease-out" });

    for (var i = 0; i < 8; i++) {
      var crumb = el("span", { class: "crumb" + (i % 2 ? " crumb--light" : ""), "aria-hidden": "true" });
      var angle = Math.PI * (0.12 + 0.76 * (i / 7)) + (Math.random() - 0.5) * 0.3;   // fan above the cart
      var reach = 26 + Math.random() * 22;
      var dx = Math.cos(angle) * reach;
      var up = Math.sin(angle) * reach;
      crumb.style.left = (x - 3.5) + "px";
      crumb.style.top = (y - 3.5) + "px";
      document.body.appendChild(crumb);
      crumb.animate([
        { transform: "translate(0, 0) scale(1)", opacity: 1 },
        { transform: "translate(" + (dx * 0.75) + "px," + (-up) + "px) scale(1)", opacity: 1, offset: 0.45 },
        { transform: "translate(" + (dx * 1.15) + "px," + (-up * 0.2 + 16) + "px) scale(0.4)", opacity: 0 }
      ], { duration: 480 + Math.random() * 160, easing: "ease-out" })
        .onfinish = (function (node) { return function () { node.remove(); }; })(crumb);
    }
  }

  /* Running pictures (the cookie seen from behind), loaded ahead of time so
     the run never has to wait for them. { cookieId: { imgs: [...], ready } } */
  var runSets = {};
  function loadRunFrames() {
    CATALOGUE.forEach(function (cookie) {
      var n = Number(cookie.runFrames);
      if (!Number.isInteger(n) || n < 2) return;
      var set = { imgs: [], ready: false };
      var loaded = 0;
      for (var i = 1; i <= n; i++) {
        var pic = new Image();
        pic.onload = function () { if (++loaded === n) set.ready = true; };
        pic.src = "images/run/" + cookie.id + "-" + i + ".svg";
        set.imgs.push(pic);
      }
      runSets[cookie.id] = set;
    });
  }

  /* The cookie turns its back, runs off into the distance towards the cart
     and cannonballs into the counter. Returns false if there is no run
     (reduced motion, picture not on screen): the counter then updates
     straight away. */
  function sendCookieRunning(img, cookie) {
    if (!img || !img.naturalWidth || calmMotion() || document.hidden || !window.requestAnimationFrame) return false;
    var from = img.getBoundingClientRect();
    if (!from.width || !from.height || from.bottom < 0 || from.top > window.innerHeight) return false;

    var w = from.width, h = from.height;
    var x0 = from.left + w / 2, y0 = from.top + h / 2;
    var runner = el("div", { class: "runner", "aria-hidden": "true" });
    runner.style.width = w + "px";
    runner.style.height = h + "px";
    var front = el("img", { src: img.currentSrc || img.src, alt: "" });
    runner.appendChild(front);

    // the back view: one picture per running position, shown one at a time
    var set = runSets[cookie.id];
    var frames = [];
    if (set && set.ready) {
      set.imgs.forEach(function (pic) {
        var f = el("img", { src: pic.src, alt: "" });
        f.style.visibility = "hidden";
        runner.appendChild(f);
        frames.push(f);
      });
    }
    var showing = -1;                           // -1 = the normal picture
    function show(index) {
      if (index === showing) return;
      (showing < 0 ? front : frames[showing]).style.visibility = "hidden";
      (index < 0 ? front : frames[index]).style.visibility = "visible";
      showing = index;
    }
    document.body.appendChild(runner);

    var bubble = $("warenkorb-anzahl");
    var first = bubble.getBoundingClientRect();
    var distance = Math.hypot(first.left + first.width / 2 - x0, first.top + first.height / 2 - y0);
    var TURN = 420;
    var RUN = Math.min(1500, Math.max(700, distance * 1.5));
    var JUMP = 700;
    var cycles = Math.max(2, Math.round(RUN / 280));   // one cycle = a left and a right step
    var sRun = 52 / Math.max(w, h);             // far away = small
    var sLand = 18 / Math.max(w, h);
    var t0 = null;

    inFlight++;

    function frame(now) {
      if (t0 === null) t0 = now;
      var t = now - t0;
      var b = bubble.getBoundingClientRect();   // read every frame: the header may move or resize
      var cx = b.left + b.width / 2, cy = b.top + b.height / 2;
      var lx = cx - 46, ly = cy + 36;           // take-off spot just below the cart
      var x, y, s, flip, rot = 0, alpha = 1, p;

      if (t < TURN) {                           // 1. hop and turn its back to us
        p = t / TURN;
        x = x0;
        y = y0 - Math.sin(p * Math.PI) * 18;
        s = 1;
        flip = Math.cos(p * Math.PI);
        if (frames.length) {                    // edge-on at half time: swap to the back view
          if (p >= 0.5) { show(0); flip = -flip; }
        }
      } else if (t < TURN + RUN) {              // 2. run off into the distance
        p = (t - TURN) / RUN;
        var e = easeInOut(p);
        var phase = p * cycles;
        var stride = Math.sin(phase * 2 * Math.PI);
        s = lerp(1, sRun, e);
        x = lerp(x0, lx, e);
        y = lerp(y0, ly, e) - Math.abs(stride) * 0.07 * h * s;
        if (frames.length) {
          show(Math.floor(phase * frames.length) % frames.length);
          rot = stride * 4;
          flip = 1;
        } else {                                // no running pictures: the normal picture waddles
          rot = stride * 12;
          flip = -1;
        }
      } else if (t < TURN + RUN + JUMP) {       // 3. cannonball
        p = (t - TURN - RUN) / JUMP;
        var q = 1 - p;
        x = q * q * lx + 2 * q * p * (cx - 20) + p * p * cx;
        y = q * q * ly + 2 * q * p * (cy - 64) + p * p * cy;
        s = lerp(sRun, sLand, p * p);
        rot = -720 * p;
        flip = frames.length ? 1 : -1;
        if (p > 0.88) alpha = 1 - (p - 0.88) / 0.12;
      } else {                                  // splash: now the number ticks up
        runner.remove();
        inFlight = Math.max(0, inFlight - 1);
        renderCounter();
        splash(cx, cy);
        return;
      }

      runner.style.opacity = alpha;
      runner.style.transform = "translate(" + (x - w / 2) + "px," + (y - h / 2) + "px) rotate(" + rot + "deg) scale(" + (s * flip) + "," + s + ")";
      window.requestAnimationFrame(frame);
    }
    window.requestAnimationFrame(frame);
    return true;
  }

  /* ---------- cart drawer ---------- */

  function renderCart() {
    var body = $("warenkorb-inhalt");
    var foot = $("warenkorb-fuss");
    var lines = cartLines();
    body.textContent = "";
    foot.textContent = "";

    if (!storageWorks) {
      body.appendChild(el("p", { class: "error", role: "alert",
        text: "Dein Browser kann den Warenkorb nicht speichern. Nach dem Neuladen der Seite ist er leer." }));
    }

    if (!lines.length) {
      body.appendChild(el("div", { class: "empty" }, [
        el("p", { class: "empty__title", text: "Dein Warenkorb ist noch leer." }),
        el("p", { text: "Such dir zuerst einen Cookie aus." }),
        el("a", { class: "btn", href: "#cookies", "data-close-cart": "1" }, ["Cookies entdecken"])
      ]));
      return;
    }

    var list = el("ul", { class: "lines" });
    lines.forEach(function (line) {
      var id = line.cookie.id;
      var inputId = "menge-" + id;
      var errorId = "fehler-" + id;
      list.appendChild(el("li", { class: "line" }, [
        el("img", { class: "line__img", src: line.cookie.image, alt: "" }),
        el("div", { class: "line__main" }, [
          el("p", { class: "line__name", text: line.cookie.name }),
          el("p", { class: "line__meta", text: (line.cookie.variety ? line.cookie.variety + ", " : "") + money(line.unit) + " pro Stück" }),
          el("div", { class: "qty" }, [
            el("button", { class: "qty__btn", type: "button", "data-step": "-1", "data-id": id,
              "aria-label": "Einen " + line.cookie.name + " weniger", disabled: line.qty <= 1 }, ["−"]),
            el("label", { class: "sr-only", for: inputId, text: "Anzahl " + line.cookie.name }),
            el("input", { class: "qty__input", id: inputId, type: "number", inputmode: "numeric",
              min: "1", max: String(MAX), step: "1", value: String(line.qty), "data-qty": id,
              "aria-describedby": lineErrors[id] ? errorId : null,
              "aria-invalid": lineErrors[id] ? "true" : null }),
            el("button", { class: "qty__btn", type: "button", "data-step": "1", "data-id": id,
              "aria-label": "Einen " + line.cookie.name + " mehr", disabled: line.qty >= MAX }, ["+"]),
            el("button", { class: "linkbtn", type: "button", "data-remove": id,
              "aria-label": line.cookie.name + " entfernen" }, ["Entfernen"])
          ]),
          lineErrors[id] ? el("p", { class: "error", id: errorId, role: "alert", text: lineErrors[id] }) : null
        ]),
        el("p", { class: "line__sum", text: money(line.sum) })
      ]));
    });
    body.appendChild(list);

    var count = cartCount();
    var anySample = lines.some(function (line) { return line.sample; });
    foot.appendChild(el("dl", { class: "totals" }, [
      el("div", {}, [el("dt", { text: "Anzahl" }), el("dd", { text: count + " " + cookieWord(count) })]),
      el("div", { class: "totals__sum" }, [
        el("dt", {}, ["Total", anySample ? el("span", { class: "tag", text: "Beispielpreise" }) : null]),
        el("dd", { id: "warenkorb-total", text: money(cartTotal()) })
      ])
    ]));
    foot.appendChild(el("div", { class: "drawer__actions" }, [
      el("button", { class: "btn btn--big", type: "button", id: "bestellung-erstellen" }, ["Bestellung erstellen"]),
      el("button", { class: "linkbtn", type: "button", id: "warenkorb-leeren" }, ["Warenkorb leeren"])
    ]));
  }

  function renderAll(focusSelector) {
    renderCards();
    renderCounter();
    renderCart();
    if (focusSelector) {
      var target = document.querySelector(focusSelector);
      if (target && !target.disabled) target.focus();
    }
  }

  /* ---------- order text ---------- */

  function buildOrderText() {
    var lines = cartLines();
    var count = cartCount();
    var out = [];
    if (TEST) out.push("*** TESTBESTELLUNG – Beispielpreise, nicht gültig ***", "");
    out.push("Bestellung DARLINGS Cookies", "");
    lines.forEach(function (line) {
      out.push(line.qty + " × " + line.cookie.name +
        (line.cookie.variety ? " (" + line.cookie.variety + ")" : "") +
        " à " + money(line.unit) + " = " + money(line.sum));
    });
    out.push("", "Anzahl Cookies: " + count, "Total: " + money(cartTotal()));
    var extra = [FULFILMENT.pickup, FULFILMENT.delivery, SHOP.payment, ORDER.note].filter(Boolean);
    if (extra.length) out.push("", extra.join("\n"));
    return out.join("\n");
  }

  function openOrder() {
    if (!cartCount()) return;
    var text = buildOrderText();
    var area = $("bestellung-text");
    area.value = text;
    area.rows = Math.min(Math.max(text.split("\n").length + 1, 6), 14);
    $("bestellung-status").textContent = "";
    $("bestellung-status").className = "status";
    $("bestellung-testhinweis").hidden = !TEST;

    var info = $("bestellung-info");
    info.textContent = "";
    [FULFILMENT.pickup, FULFILMENT.delivery, SHOP.payment].filter(Boolean).forEach(function (t) {
      info.appendChild(el("p", { text: t }));
    });
    if (!TEST && ORDER.email) info.appendChild(el("p", { text: "E-Mail: " + ORDER.email }));
    if (!TEST && ORDER.whatsapp) info.appendChild(el("p", { text: "WhatsApp: +" + String(ORDER.whatsapp).replace(/\D/g, "") }));
    info.hidden = !info.childNodes.length;

    // Send buttons only exist once a destination is set AND test mode is off.
    var send = $("bestellung-senden");
    send.textContent = "";
    if (!TEST && ORDER.whatsapp) {
      send.appendChild(el("a", { class: "btn btn--plain", target: "_blank", rel: "noopener",
        href: "https://wa.me/" + String(ORDER.whatsapp).replace(/\D/g, "") + "?text=" + encodeURIComponent(text) },
        ["Per WhatsApp senden"]));
    }
    if (!TEST && ORDER.email) {
      send.appendChild(el("a", { class: "btn btn--plain",
        href: "mailto:" + ORDER.email + "?subject=" + encodeURIComponent("Bestellung DARLINGS Cookies") +
              "&body=" + encodeURIComponent(text) },
        ["Per E-Mail senden"]));
    }

    $("warenkorb").close();
    $("bestellung").showModal();
    // show the whole text at once; on small screens the pop-up itself scrolls
    area.style.height = "auto";
    area.style.height = (area.scrollHeight + 8) + "px";
    area.scrollTop = 0;
    $("bestellung-titel").focus();
  }

  function copyOrder() {
    var area = $("bestellung-text");
    var status = $("bestellung-status");

    function byHand() {
      try { area.focus(); area.select(); return document.execCommand("copy"); }
      catch (err) { return false; }
    }
    function done(ok) {
      if (ok) {
        status.className = "status status--ok";
        status.textContent = TEST
          ? "Kopiert. Im Testmodus wird nichts verschickt."
          : "Kopiert. Füge den Text jetzt in deine E-Mail oder WhatsApp-Nachricht ein und schick ihn ab.";
      } else {
        area.focus(); area.select();
        status.className = "status status--error";
        status.textContent = "Kopieren hat nicht geklappt. Der Text ist markiert: Kopiere ihn bitte von Hand.";
      }
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(area.value).then(function () { done(true); }, function () { done(byHand()); });
    } else {
      done(byHand());
    }
  }

  /* ---------- events ---------- */

  function scrollToTarget(hash) {
    var target = document.getElementById(hash.slice(1));
    if (!target) return;
    var calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
    if (target.hasAttribute("tabindex")) target.focus({ preventScroll: true });
  }

  function openCart() {
    renderCart();
    $("warenkorb").showModal();
    $("warenkorb-titel").focus();
  }

  function bindEvents() {
    document.addEventListener("click", function (event) {
      var t = event.target;

      var link = t.closest('a[href^="#"]');
      if (link) {
        event.preventDefault();
        if (link.hasAttribute("data-close-cart")) $("warenkorb").close();
        scrollToTarget(link.getAttribute("href"));
        return;
      }

      var add = t.closest("[data-add]");
      if (add) {
        var id = add.getAttribute("data-add");
        var cookie = findCookie(id);
        var before = cart[id] || 0;
        var card = add.closest(".card");
        setQuantity(id, before + 1);
        // start the run before the cards are rebuilt, while the picture is still on the page
        if ((cart[id] || 0) > before && card) sendCookieRunning(card.querySelector(".card__art img"), cookie);
        renderAll('[data-add="' + id + '"]');
        announce(cookie.name + " liegt im Warenkorb. Jetzt " + cartCount() + " " + cookieWord(cartCount()) + ".");
        return;
      }

      var step = t.closest("[data-step]");
      if (step) {
        var stepId = step.getAttribute("data-id");
        var dir = step.getAttribute("data-step");
        setQuantity(stepId, (cart[stepId] || 0) + Number(dir));
        renderAll('[data-step="' + dir + '"][data-id="' + stepId + '"]');
        if (!$("warenkorb-inhalt").contains(document.activeElement)) {
          // the button just reached its limit and is switched off: keep focus on this line
          var input = $("menge-" + stepId);
          if (input) input.focus();
        }
        announce(findCookie(stepId).name + ": " + (cart[stepId] || 0) + " Stück. Total " + money(cartTotal()) + ".");
        return;
      }

      var remove = t.closest("[data-remove]");
      if (remove) {
        var removeId = remove.getAttribute("data-remove");
        setQuantity(removeId, 0);
        renderAll();
        $("warenkorb-titel").focus();
        announce(findCookie(removeId).name + " wurde entfernt.");
        return;
      }

      if (t.closest("#warenkorb-oeffnen")) { openCart(); return; }
      if (t.closest("#warenkorb-schliessen")) { $("warenkorb").close(); return; }
      if (t.closest("#warenkorb-leeren")) {
        cart = {}; lineErrors = {}; saveCart(); renderAll();
        $("warenkorb-titel").focus();
        announce("Der Warenkorb ist jetzt leer.");
        return;
      }
      if (t.closest("#bestellung-erstellen")) { openOrder(); return; }
      if (t.closest("#bestellung-kopieren")) { copyOrder(); return; }
      if (t.closest("#bestellung-schliessen")) { $("bestellung").close(); return; }
      if (t.closest("#bestellung-zurueck")) { $("bestellung").close(); openCart(); return; }

      // A click on the dark area around a dialog closes it.
      if (t === $("warenkorb") || t === $("bestellung")) t.close();
    });

    // Typing a quantity directly.
    document.addEventListener("change", function (event) {
      var input = event.target.closest("[data-qty]");
      if (!input) return;
      var id = input.getAttribute("data-qty");
      var raw = input.value.trim();
      var qty = Number(raw);
      if (raw === "" || !Number.isInteger(qty) || qty < 1 || qty > MAX) {
        lineErrors[id] = "Bitte eine ganze Zahl von 1 bis " + MAX + " eingeben.";
        renderCart();
        var again = $("menge-" + id);
        if (again) { again.focus(); again.select(); }
        return;
      }
      setQuantity(id, qty);
      renderAll("#menge-" + id);
      announce(findCookie(id).name + ": " + qty + " Stück. Total " + money(cartTotal()) + ".");
    });

    // Another tab changed the cart: keep this one in step.
    window.addEventListener("storage", function (event) {
      if (event.key === STORAGE_KEY) { loadCart(); renderAll(); }
    });
  }

  /* ---------- "last updated" in the footer ---------- */

  /* The browser knows when the server last changed this page. On GitHub Pages
     that is the moment the site was published, so nothing has to be typed in. */
  function renderUpdated() {
    var when = new Date(document.lastModified);
    if (isNaN(when.getTime())) return;
    var text;
    try {
      text = when.toLocaleString("de-CH", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) + " Uhr";
    } catch (err) {
      text = when.toLocaleString();
    }
    var time = $("fuss-stand-zeit");
    if (!time || !$("fuss-stand")) return;   // an older copy of the page from the browser cache
    time.textContent = text;
    time.setAttribute("datetime", when.toISOString());
    $("fuss-stand").hidden = false;
  }

  /* ---------- start ---------- */

  function start() {
    loadCart();
    $("testhinweis").hidden = !TEST;
    $("fuss-testhinweis").hidden = !TEST;
    document.documentElement.classList.toggle("is-test", TEST);
    renderUpdated();
    if (!calmMotion()) loadRunFrames();
    renderPile();
    renderAll();
    bindEvents();
  }

  start();
})();
