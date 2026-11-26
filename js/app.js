/* =====================================================================
   DARLINGS – page logic
   Builds the character cards, the cart and the order form from
   js/katalog.js. You normally do not need to edit this file.
   ===================================================================== */
(function () {
  "use strict";

  var SHOP = window.DARLINGS_SHOP || {};
  var ORDER = SHOP.order || {};
  var FULFILMENT = SHOP.fulfilment || {};
  /* Pick-up, delivery and payment details, as written in js/katalog.js. */
  var INFO_LINES = [FULFILMENT.pickup, FULFILMENT.delivery, FULFILMENT.timing, SHOP.payment, ORDER.note].filter(Boolean);
  var CATALOGUE = (window.DARLINGS_CATALOGUE || []).filter(function (c) {
    return c && c.id && c.name;
  });
  var TEST = SHOP.testMode !== false;
  var CURRENCY = SHOP.currency || "CHF";
  var MAX = Number.isInteger(SHOP.maxPerCookie) && SHOP.maxPerCookie > 0 ? SHOP.maxPerCookie : 99;
  var DELIVERY_FEE = typeof SHOP.deliveryFee === "number" && SHOP.deliveryFee > 0 ? Math.round(SHOP.deliveryFee * 100) : 0;
  var FREE_EVERY = Number.isInteger(SHOP.freeEvery) && SHOP.freeEvery > 1 ? SHOP.freeEvery : 0;
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

  /* Not introduced yet: shown as a black «???» silhouette. */
  function isLocked(cookie) { return cookie.locked === true; }

  function canOrder(cookie) {
    return !isLocked(cookie) && cookie.available !== false && priceOf(cookie) !== null;
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

  /* Price of everything in the cart before the discount. */
  function cartSubtotal() {
    return cartLines().reduce(function (sum, line) { return sum + line.sum; }, 0);
  }

  /* Every FREE_EVERY-th cookie is free. If prices ever differ, the cheapest
     cookies are the free ones. Returns { free: how many, rappen: their value }. */
  function cartDiscount() {
    var units = [];
    if (FREE_EVERY) {
      cartLines().forEach(function (line) {
        for (var i = 0; i < line.qty; i++) units.push(line.unit);
      });
    }
    units.sort(function (a, b) { return a - b; });
    var free = FREE_EVERY ? Math.floor(units.length / FREE_EVERY) : 0;
    var rappen = 0;
    for (var k = 0; k < free; k++) rappen += units[k];
    return { free: free, rappen: rappen };
  }

  /* What the customer pays for the cookies (delivery not included). */
  function cartTotal() {
    return cartSubtotal() - cartDiscount().rappen;
  }

  /* A nudge towards the next free cookie. */
  function dealHint(count) {
    var left = FREE_EVERY - (count % FREE_EVERY);    // the free one included
    if (left === 1) return "Dein nächster Cookie ist gratis!";
    return "Jeder " + FREE_EVERY + ". Cookie ist gratis. Noch " + (left - 1) + " " + cookieWord(left - 1) +
      ", dann ist der nächste gratis.";
  }

  function setQuantity(id, qty) {
    var cookie = findCookie(id);
    if (!cookie || !canOrder(cookie)) return;
    if (qty <= 0) delete cart[id];
    else cart[id] = Math.min(qty, MAX);
    delete lineErrors[id];
    saveCart();
  }

  /* ---------- character cards ---------- */

  var openFacts = {};       // { cookieId: true } while its «Zutaten und Allergene» sheet is open

  /* A character that is not introduced yet: only its shadow, no name, no text. */
  function lockedCard(cookie, i) {
    var titleId = "name-geheim-" + i;
    var shaded = !cookie.lockedImage;     // no silhouette picture: black out the normal one
    return el("article", {
      class: "card card--locked",
      id: "cookie-geheim-" + i,
      tabindex: "-1",
      "aria-labelledby": titleId,
      style: "--accent:#4A2A1C;--accent-ink:#FFF6E1;--tilt:" + TILTS[i % TILTS.length] + "deg"
    }, [
      el("div", { class: "card__art" }, [
        el("img", { class: shaded ? "is-shaded" : null, src: cookie.lockedImage || cookie.image,
          alt: "Ein noch geheimer DARLING, nur als schwarzer Schatten zu sehen.", loading: "lazy" })
      ]),
      el("div", { class: "card__head" }, [
        el("h3", { class: "card__name", id: titleId, text: "???" }),
        el("p", { class: "card__flavor", text: "Noch geheim" })
      ]),
      el("div", { class: "card__body" }, [
        el("p", { class: "card__text", text: "Wer das wohl ist? Dieser DARLING ist noch nicht freigeschaltet. Bald lernst du ihn kennen." })
      ]),
      el("div", { class: "card__buy" }, [
        el("p", { class: "card__state", text: "Bald verfügbar" })
      ])
    ]);
  }

  function renderCards() {
    var grid = $("karten");
    grid.textContent = "";
    if (!CATALOGUE.length) {
      grid.appendChild(el("p", { class: "notice", text: "Hier wohnen bald die ersten Cookies." }));
      return;
    }
    CATALOGUE.forEach(function (cookie, i) {
      if (isLocked(cookie)) { grid.appendChild(lockedCard(cookie, i)); return; }
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

      // Ingredients and allergens open as a sheet over the description, so nothing on the page moves.
      var facts = [];
      if (cookie.ingredients) facts.push(el("p", { class: "card__fact" }, [el("strong", { text: "Zutaten: " }), String(cookie.ingredients)]));
      if (cookie.allergens) facts.push(el("p", { class: "card__fact card__fact--strong" }, [el("strong", { text: "Allergene: " }), String(cookie.allergens)]));
      var sheetId = "infos-" + cookie.id;
      var isOpen = openFacts[cookie.id] === true;
      var details = facts.length ? [
        el("button", { class: "linkbtn card__morebtn", type: "button", "data-facts": cookie.id,
          "aria-expanded": isOpen ? "true" : "false", "aria-controls": sheetId }, ["Zutaten und Allergene"]),
        el("div", { class: "card__sheet", id: sheetId, hidden: !isOpen }, [
          el("button", { class: "linkbtn card__sheetclose", type: "button", "data-facts": cookie.id,
            "aria-label": "Zutaten und Allergene von " + cookie.name + " schliessen" }, ["Schliessen ✕"])
        ].concat(facts))
      ] : [];

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
        el("div", { class: "card__head" }, [
          el("h3", { class: "card__name", id: titleId, text: cookie.name }),
          cookie.flavor || cookie.variety ? el("p", { class: "card__flavor", text: cookie.flavor || cookie.variety }) : null
        ]),
        el("div", { class: "card__body" }, [
          TEST && cookie.draft ? el("p", { class: "tag tag--draft", text: "Textentwurf" }) : null,
          el("p", { class: "card__text", text: cookie.description || "" })
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

  /* Turn-around and running pictures (the cookie seen from behind), loaded
     ahead of time so the run never has to wait for them.
     { cookieId: { turn: [...], run: [...], ready } } */
  var runSets = {};
  function loadRunFrames() {
    CATALOGUE.forEach(function (cookie) {
      if (isLocked(cookie)) return;
      var runs = Number(cookie.runFrames);
      var turns = Number(cookie.turnFrames);
      if (!Number.isInteger(runs) || runs < 2) return;
      if (!Number.isInteger(turns) || turns < 0) turns = 0;
      var set = { turn: [], run: [], ready: false };
      var loaded = 0;
      function add(list, name) {
        var pic = new Image();
        pic.onload = function () { if (++loaded === runs + turns) set.ready = true; };
        pic.src = "images/run/" + cookie.id + "-" + name + ".svg";
        list.push(pic);
      }
      for (var t = 1; t <= turns; t++) add(set.turn, "turn-" + t);
      for (var r = 1; r <= runs; r++) add(set.run, r);
      runSets[cookie.id] = set;
    });
  }

  /* The cookie turns its back, runs off into the distance towards the cart
     and cannonballs into the counter. Returns false if there is no run
     (the page is in a background tab, or the picture has not loaded): the counter then updates
     straight away. */
  function sendCookieRunning(img, cookie, button) {
    if (!img || !img.naturalWidth || document.hidden || !window.requestAnimationFrame) return false;
    var from = img.getBoundingClientRect();
    if (!from.width || !from.height) return false;

    // Picture scrolled out of sight (a tall card on a small screen, or hidden
    // behind the header)? Then a small cookie hops out of the button instead.
    var bar = document.querySelector(".top");
    var roof = bar ? bar.getBoundingClientRect().bottom : 0;
    var middle = from.top + from.height / 2;
    if (middle < roof || middle > window.innerHeight) {
      var spot = button ? button.getBoundingClientRect() : null;
      if (!spot || !spot.width) return false;
      var fit = Math.min(1, 120 / Math.max(from.width, from.height));
      var fw = from.width * fit, fh = from.height * fit;
      from = { left: spot.left + spot.width / 2 - fw / 2, top: spot.top - fh - 4, width: fw, height: fh };
    }

    var w = from.width, h = from.height;
    var x0 = from.left + w / 2, y0 = from.top + h / 2;
    var runner = el("div", { class: "runner", "aria-hidden": "true" });
    runner.style.width = w + "px";
    runner.style.height = h + "px";
    var front = el("img", { src: img.currentSrc || img.src, alt: "" });
    runner.appendChild(front);

    // the back view: one picture per running position, shown one at a time
    var set = runSets[cookie.id];
    var turns = [];
    var frames = [];
    function stack(pic) {
      var f = el("img", { src: pic.src, alt: "" });
      f.style.visibility = "hidden";
      runner.appendChild(f);
      return f;
    }
    if (set && set.ready) {
      turns = set.turn.map(stack);
      frames = set.run.map(stack);
    }
    var showing = front;
    function show(pic) {
      if (pic === showing) return;
      showing.style.visibility = "hidden";
      pic.style.visibility = "visible";
      showing = pic;
    }
    document.body.appendChild(runner);

    var bubble = $("warenkorb-anzahl");
    var first = bubble.getBoundingClientRect();
    var distance = Math.hypot(first.left + first.width / 2 - x0, first.top + first.height / 2 - y0);
    var TURN = turns.length ? 340 : 420;         // a brisk turn, so it flows straight into the run
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
        if (turns.length) {                     // the picture narrows, then the turn-around pictures take over
          if (p < 0.3) {
            flip = 1 - 0.7 * (p / 0.3);
          } else {
            show(turns[Math.min(turns.length - 1, Math.floor((p - 0.3) / 0.7 * turns.length))]);
            flip = 1;
          }
        } else if (frames.length && p >= 0.5) { // edge-on at half time: swap to the back view
          show(frames[0]);
          flip = -flip;
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
          show(frames[Math.floor(phase * frames.length) % frames.length]);
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
    var deal = cartDiscount();
    foot.appendChild(el("dl", { class: "totals" }, [
      el("div", {}, [el("dt", { text: "Anzahl" }), el("dd", { text: count + " " + cookieWord(count) })]),
      deal.free ? el("div", {}, [el("dt", { text: "Zwischensumme" }), el("dd", { text: money(cartSubtotal()) })]) : null,
      deal.free ? el("div", { class: "totals__deal" }, [
        el("dt", { text: "Rabatt: " + deal.free + " " + cookieWord(deal.free) + " gratis" }),
        el("dd", { text: "− " + money(deal.rappen) })
      ]) : null,
      el("div", { class: "totals__sum" }, [
        el("dt", {}, ["Total", anySample ? el("span", { class: "tag", text: "Beispielpreise" }) : null]),
        el("dd", { id: "warenkorb-total", text: money(cartTotal()) })
      ])
    ]));
    if (FREE_EVERY) foot.appendChild(el("p", { class: "totals__hint", text: dealHint(count) }));
    foot.appendChild(el("p", { class: "totals__note",
      text: "Abholung gratis. Lieferung innerhalb von Lufingen" + (DELIVERY_FEE ? " + " + money(DELIVERY_FEE) + "." : " gratis.") }));
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

  /* ---------- order form ---------- */

  var SEND_URL = "https://formsubmit.co/ajax/";
  var sending = false;

  /* Delivery charge in Rappen for the chosen way of receiving the cookies. */
  function feeFor(delivery) { return delivery ? DELIVERY_FEE : 0; }

  function buildOrderText(delivery) {
    var lines = cartLines();
    var count = cartCount();
    var out = [];
    if (TEST) out.push("*** TESTBESTELLUNG – Beispielpreise, nicht gültig ***", "");
    lines.forEach(function (line) {
      out.push(line.qty + " × " + line.cookie.name +
        (line.cookie.variety ? " (" + line.cookie.variety + ")" : "") +
        " à " + money(line.unit) + " = " + money(line.sum));
    });
    out.push("", "Anzahl Cookies: " + count);
    var deal = cartDiscount();
    if (deal.free) {
      out.push("Rabatt (jeder " + FREE_EVERY + ". Cookie gratis): " + deal.free + " " + cookieWord(deal.free) +
        " gratis, − " + money(deal.rappen));
    }
    if (delivery && DELIVERY_FEE) out.push("Lieferung in Lufingen: " + money(DELIVERY_FEE));
    out.push("Total: " + money(cartTotal() + feeFor(delivery)));
    return out.join("\n");
  }

  function picked(name) {
    var box = document.querySelector('#bestellung-formular input[name="' + name + '"]:checked');
    return box ? box.value : "";
  }

  /* Shows the address field for delivery, and the phone or e-mail field
     that fits the chosen way of getting in touch. */
  function syncOrderFields() {
    var contact = picked("kontakt");
    var area = $("bestellung-text");
    area.value = buildOrderText(picked("erhalt") === "lieferung");
    area.style.height = "auto";
    area.style.height = (area.scrollHeight + 8) + "px";
    $("b-adresse-feld").hidden = picked("erhalt") !== "lieferung";
    $("b-telefon-feld").hidden = contact !== "whatsapp";
    $("b-email-feld").hidden = contact !== "email";
  }

  function setFieldError(id, message) {
    var box = $(id + "-fehler");
    var field = $(id);
    box.textContent = message || "";
    box.hidden = !message;
    if (field.tagName === "INPUT") {
      if (message) {
        field.setAttribute("aria-invalid", "true");
        field.setAttribute("aria-describedby", id + "-fehler");
      } else {
        field.removeAttribute("aria-invalid");
        field.removeAttribute("aria-describedby");
      }
    }
  }

  function setStatus(kind, message) {
    var status = $("bestellung-status");
    status.className = "status" + (kind ? " status--" + kind : "");
    status.textContent = message || "";
  }

  /* Reads the form. Returns the customer's details, or null after marking
     what is missing. */
  function readOrderForm() {
    var name = $("b-name").value.trim();
    var how = picked("erhalt");
    var address = $("b-adresse").value.trim();
    var contact = picked("kontakt");
    var phone = $("b-telefon").value.trim();
    var email = $("b-email").value.trim();
    var byPhone = contact === "whatsapp";
    var day = $("b-datum").value;                 // "2026-12-24" or ""
    var time = $("b-zeit").value;                 // "14:30" or ""
    var wish = "";
    if (day) {
      var parts = day.split("-");
      var date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      try { wish = date.toLocaleDateString("de-CH", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); }
      catch (err) { wish = day; }
    }
    if (time) wish += (wish ? ", " : "") + time + " Uhr";
    var comment = $("b-bemerkung").value.trim();
    var firstBad = null;

    function check(id, message, focusTarget) {
      setFieldError(id, message);
      if (message && !firstBad) firstBad = focusTarget || $(id);
    }

    check("b-name", name ? "" : "Bitte gib deinen Namen ein.");
    check("b-erhalt", how ? "" : "Bitte wähle Abholung oder Lieferung.",
      document.querySelector('#b-erhalt input'));
    check("b-adresse", how === "lieferung" && !address ? "Bitte gib deine Adresse in Lufingen ein." : "");
    check("b-kontakt", contact ? "" : "Bitte wähle, wie wir uns bei dir melden sollen.",
      document.querySelector('#b-kontakt input'));
    check("b-telefon", byPhone && phone.replace(/\D/g, "").length < 9
      ? "Bitte gib deine Handynummer ein, zum Beispiel 079 123 45 67." : "");
    check("b-email", contact === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ? "Bitte gib eine gültige E-Mail-Adresse ein." : "");

    if (firstBad) {
      setStatus("error", "Da fehlt noch etwas. Schau dir bitte die markierten Felder an.");
      firstBad.focus();
      return null;
    }
    return {
      name: name,
      delivery: how === "lieferung",
      how: how === "lieferung" ? "Lieferung innerhalb von Lufingen" : "Abholung",
      address: how === "lieferung" ? address : "",
      contactLabel: contact === "whatsapp" ? "WhatsApp" : "E-Mail",
      contactValue: byPhone ? phone : email,
      email: contact === "email" ? email : "",
      wish: wish,
      comment: comment
    };
  }

  /* The e-mail that arrives at the shop: one row per entry. */
  function buildOrderMail(who) {
    var mail = {
      _subject: (TEST ? "TESTBESTELLUNG" : "Neue Bestellung") + " DARLINGS Cookies: " + who.name,
      _template: "table",
      _captcha: "false"
    };
    if (who.email) mail._replyto = who.email;
    if (TEST) mail["Achtung"] = "TESTBESTELLUNG – Beispielpreise, nicht gültig";
    mail["Name"] = who.name;
    mail["Erhalt"] = who.how;
    if (who.address) mail["Lieferadresse"] = who.address;
    if (who.wish) mail["Wunschtermin"] = who.wish;
    mail["Kontakt per"] = who.contactLabel;
    mail[who.email ? "E-Mail-Adresse" : "Handynummer"] = who.contactValue;
    if (who.comment) mail["Bemerkung"] = who.comment;
    cartLines().forEach(function (line) {
      mail[line.cookie.name + (line.cookie.variety ? " (" + line.cookie.variety + ")" : "")] =
        line.qty + " Stück à " + money(line.unit) + " = " + money(line.sum);
    });
    mail["Anzahl Cookies"] = String(cartCount());
    var deal = cartDiscount();
    if (deal.free) {
      mail["Rabatt (jeder " + FREE_EVERY + ". Cookie gratis)"] =
        deal.free + " " + cookieWord(deal.free) + " gratis, − " + money(deal.rappen);
    }
    if (who.delivery && DELIVERY_FEE) mail["Lieferung"] = money(DELIVERY_FEE);
    mail["Total"] = money(cartTotal() + feeFor(who.delivery));
    if (ORDER.note) mail["Hinweis"] = ORDER.note;
    return mail;
  }

  function sendOrder() {
    if (sending || !cartCount()) return;
    setStatus("", "");
    var who = readOrderForm();
    if (!who) return;
    if ($("b-honig").value) return;          // filled in by a spam program
    if (!ORDER.email) {
      setStatus("error", "Bestellen ist im Moment ausgeschaltet. Bitte versuch es später nochmals.");
      return;
    }

    var button = $("bestellung-senden");
    function failed(err) {
      sending = false;
      button.disabled = false;
      button.textContent = "Bestellung senden";
      if (err && err.message === "locked") {
        // FormSubmit has not been activated yet: the shop must click the
        // link in the activation e-mail once.
        setStatus("error", "Das Bestellformular ist noch nicht freigeschaltet. Deine Bestellung ist noch NICHT bei uns. " +
          "Bitte schreib uns an " + ORDER.email + ".");
        return;
      }
      setStatus("error", "Das Senden hat nicht geklappt. Deine Bestellung ist noch NICHT bei uns. " +
        "Bitte versuch es nochmals oder schreib uns an " + ORDER.email + ".");
    }

    sending = true;
    button.disabled = true;
    button.textContent = "Wird gesendet …";

    window.fetch(SEND_URL + encodeURIComponent(ORDER.email), {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(buildOrderMail(who))
    }).then(function (response) {
      return response.json().then(function (answer) {
        if (response.ok && String(answer && answer.success) === "true") return;
        var locked = /activat/i.test(String(answer && answer.message));
        throw new Error(locked ? "locked" : "not sent");
      });
    }).then(function () {
      sending = false;
      button.disabled = false;
      button.textContent = "Bestellung senden";
      cart = {}; lineErrors = {}; saveCart(); renderAll();
      $("bestellung-formular").hidden = true;
      $("bestellung-danke").hidden = false;
      $("bestellung-danke-titel").textContent = "Danke, " + who.name + "!";
      $("bestellung-danke-text").textContent = "Deine Bestellung ist bei uns angekommen. " +
        "Wir melden uns innerhalb von 3 Werktagen per " + who.contactLabel + " mit einer Bestätigung bei dir." + (TEST ? " (Testmodus: Das war eine Probebestellung.)" : "");
      $("bestellung-danke-titel").focus();
      announce("Deine Bestellung wurde gesendet.");
    }).catch(failed);
  }

  function openOrder() {
    if (!cartCount()) return;
    var area = $("bestellung-text");
    $("b-abholung-preis").textContent = " (gratis)";
    var now = new Date();                           // no wish dates in the past
    $("b-datum").min = now.getFullYear() + "-" + ("0" + (now.getMonth() + 1)).slice(-2) + "-" + ("0" + now.getDate()).slice(-2);
    $("b-lieferung-preis").textContent = DELIVERY_FEE ? " (+ " + money(DELIVERY_FEE) + ")" : " (gratis)";
    setStatus("", "");
    $("bestellung-testhinweis").hidden = !TEST;
    $("bestellung-formular").hidden = false;
    $("bestellung-danke").hidden = true;
    ["b-name", "b-erhalt", "b-adresse", "b-kontakt", "b-telefon", "b-email"].forEach(function (id) {
      setFieldError(id, "");
    });
    syncOrderFields();

    var info = $("bestellung-info");
    info.textContent = "";
    INFO_LINES.forEach(function (t) {
      info.appendChild(el("p", { text: t }));
    });
    info.hidden = !info.childNodes.length;

    $("warenkorb").close();
    $("bestellung").showModal();
    syncOrderFields();   // again now that the pop-up is visible, so the order box gets its full height
    area.scrollTop = 0;
    $("bestellung-titel").focus();
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
        if ((cart[id] || 0) > before && card) sendCookieRunning(card.querySelector(".card__art img"), cookie, add);
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

      var factsBtn = t.closest("[data-facts]");
      if (factsBtn) {
        var factsId = factsBtn.getAttribute("data-facts");
        var sheet = $("infos-" + factsId);
        var opener = document.querySelector('.card__morebtn[data-facts="' + factsId + '"]');
        if (!sheet || !opener) return;
        openFacts[factsId] = sheet.hidden;          // open it if it was closed, and the other way round
        sheet.hidden = !openFacts[factsId];
        opener.setAttribute("aria-expanded", openFacts[factsId] ? "true" : "false");
        (openFacts[factsId] ? sheet.querySelector(".card__sheetclose") : opener).focus({ preventScroll: true });
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
      if (t.closest("#bestellung-fertig")) { $("bestellung").close(); return; }
      if (t.closest("#bestellung-schliessen")) { $("bestellung").close(); return; }
      if (t.closest("#bestellung-zurueck")) { $("bestellung").close(); openCart(); return; }

      // A click on the dark area around a dialog closes it.
      if (t === $("warenkorb") || t === $("bestellung")) t.close();
    });

    $("bestellung-formular").addEventListener("submit", function (event) {
      event.preventDefault();
      sendOrder();
    });

    // Typing a quantity directly.
    document.addEventListener("change", function (event) {
      if (event.target.closest("#bestellung-formular")) { syncOrderFields(); return; }
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

  /* ---------- start ---------- */

  function start() {
    loadCart();
    $("testhinweis").hidden = !TEST;
    $("fuss-testhinweis").hidden = !TEST;
    document.documentElement.classList.toggle("is-test", TEST);
    if (INFO_LINES.length && $("bestell-infos")) {
      INFO_LINES.forEach(function (t) { $("bestell-infos").appendChild(el("p", { text: t })); });
      $("bestell-infos").hidden = false;
    }
    if (FREE_EVERY && $("aktion")) {
      $("aktion").textContent = "Jeder " + FREE_EVERY + ". Cookie ist gratis: " + (FREE_EVERY - 1) + " bezahlen, " + FREE_EVERY + " bekommen.";
      $("aktion").hidden = false;
    }
    loadRunFrames();
    renderAll();
    bindEvents();
  }

  start();
})();
