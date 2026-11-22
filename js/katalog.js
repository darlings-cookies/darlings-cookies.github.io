/* =====================================================================
   DARLINGS – shop settings and cookie catalogue
   ---------------------------------------------------------------------
   This is the only file you need to edit for day-to-day changes.
   The cards, the sticker pile at the top, the cart and the order text
   are all built from what is written here.
   ===================================================================== */

/* ---------------------------------------------------------------------
   1. SHOP SETTINGS
   --------------------------------------------------------------------- */
window.DARLINGS_SHOP = {

  // true  = test mode. Cookies without a confirmed price use "samplePrice",
  //         the site shows a test banner, and the WhatsApp / e-mail send
  //         buttons stay switched off.
  // false = live. Only cookies with a confirmed price can be ordered.
  testMode: true,

  // Sample price in CHF, used ONLY in test mode for cookies whose own
  // "price" is still null. It is labelled «Beispielpreis» everywhere.
  samplePrice: 3.5,

  currency: "CHF",

  // Highest quantity of one cookie in a single order.
  maxPerCookie: 99,

  // Where the finished order text should go. Leave null until confirmed.
  order: {
    whatsapp: null,   // business number in international format, digits only, e.g. "41791234567"
    email: null,      // e.g. "bestellung@example.ch"
    note: null        // optional extra line at the end of every order text,
                      // e.g. "Bitte gewünschtes Abholdatum dazuschreiben."
  },

  // Shown in the order pop-up and added to the order text once set.
  fulfilment: {
    pickup: null,     // e.g. "Abholung: Mittwoch 12–14 Uhr, Musterstrasse 1, Zürich"
    delivery: null    // e.g. "Lieferung in Zürich ab CHF 30.–"
  },
  payment: null       // e.g. "Zahlung mit TWINT oder bar bei der Abholung"
};

/* ---------------------------------------------------------------------
   2. COOKIE CATALOGUE
   ---------------------------------------------------------------------
   One block per character. To add a new character, copy a block, give it
   a new "id", and put its picture into the "images" folder.

   id           short unique name without spaces (used by the cart)
   name         character name, shown exactly as written
   image        path to the illustration (png, jpg or webp, any shape)
   imageAlt     one sentence describing the picture, for screen readers
   description  the personality text on the card
   draft        true = text still waiting for approval (a small
                «Textentwurf» tag is shown in test mode only)
   variety      the cookie variety
   price        confirmed price in CHF as a number (e.g. 3.5), or null
   available    false = the character stays visible, but cannot be ordered
   accent       the character's sticker colour
   ingredients  leave null until confirmed; shown on the card once set
   allergens    leave null until confirmed; shown on the card once set
   runFrames    number of running pictures for the "run into the cart"
                animation. They live in images/run/ and are called
                <id>-1.svg, <id>-2.svg and so on. Leave it out (or null)
                for a character without running pictures: its normal
                picture then runs instead.
   --------------------------------------------------------------------- */
window.DARLINGS_CATALOGUE = [
  {
    id: "golden-standard",
    name: "The Golden Standard",
    image: "images/golden-standard.webp",
    imageAlt: "The Golden Standard: ein lächelnder Chocolate-Chip-Cookie mit einer blauen Rosette, auf der eine 1 steht.",
    description: "Er sitzt in der ersten Reihe und hat das Zusatzblatt längst gelöst. Brauchst du einen Stift, fragt er freundlich: «Blau oder schwarz?» Er hat beide dabei. Und das Ärgerliche: Trotzdem ist er der Liebling von allen.",
    draft: false,
    variety: "Classic Chocolate Chip",
    price: null,
    available: true,
    accent: "#F2B632",
    runFrames: 6,
    ingredients: null,
    allergens: null
  },
  {
    id: "biscoff-break",
    name: "Biscoff Break",
    image: "images/biscoff-break.webp",
    imageAlt: "Biscoff Break: ein fröhlicher Cookie, der winkt und eine blaue Tasse in der Hand hält.",
    description: "Alle rennen, nur er nicht. Während die anderen durch den Gang hetzen, nimmt er einen Schluck aus seiner Tasse und sagt: «Ich komme auch an. Nur gemütlicher.» Und wirklich: Er wird immer fertig und hat dabei am meisten Spass.",
    draft: true,
    variety: "Biscoff",
    price: null,
    available: true,
    accent: "#7FB3D3",
    runFrames: 6,
    ingredients: null,
    allergens: null
  },
  {
    id: "dough-vinci",
    name: "Dough Vinci",
    image: "images/dough-vinci.webp",
    imageAlt: "Dough Vinci: ein Cookie mit farbverschmierter Mütze, Jeansjacke, Pinsel und Farbpalette.",
    description: "Für ihn ist klar: Er ist der beste Künstler aller Zeiten. Hängen zwanzig Bilder an der Wand und nur eines ist von ihm, ruft er mit grosser Geste: «Neunzehn Bilder hängen am falschen Ort!» Bescheiden ist er nur im Schlaf.",
    draft: false,
    variety: "Oreo & Biscoff",
    price: null,
    available: true,
    accent: "#EE5C8F",
    runFrames: 6,
    ingredients: null,
    allergens: null
  },
  {
    id: "choc-noir",
    name: "Choc Noir",
    image: "images/choc-noir.webp",
    imageAlt: "Choc Noir: ein dunkler Schokoladen-Cookie mit Maske, Handschuhen und roten Turnschuhen.",
    description: "Maske auf, rote Turnschuhe geschnürt: Choc Noir ist der Superheld der Cookies. Sein Auftrag: verschwundene Kunstwerke finden und zurückbringen. Er gibt nie auf und übersieht keinen Krümel. Dough Vinci ist er schon dicht auf den Fersen.",
    draft: true,
    variety: "Triple Chocolate",
    price: null,
    available: true,
    accent: "#C8392D",
    runFrames: 6,
    ingredients: null,
    allergens: null
  }
];
