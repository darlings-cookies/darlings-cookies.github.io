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
  function renderCounter() {
    var count = cartCount();
    var bubble = $("warenkorb-anzahl");
    bubble.textContent = String(count);
    bubble.classList.toggle("is-empty", count === 0);
    $("warenkorb-anzahl-text").textContent = count + " " + cookieWord(count) + " im Warenkorb";
    if (lastCount !== null && count !== lastCount) {
      bubble.classList.remove("bump");
      void bubble.offsetWidth;            // restart the little bounce
      bubble.classList.add("bump");
    }
    lastCount = count;
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
        setQuantity(id, (cart[id] || 0) + 1);
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

  /* ---------- start ---------- */

  function start() {
    loadCart();
    $("testhinweis").hidden = !TEST;
    $("fuss-testhinweis").hidden = !TEST;
    document.documentElement.classList.toggle("is-test", TEST);
    renderPile();
    renderAll();
    bindEvents();
  }

  start();
})();
