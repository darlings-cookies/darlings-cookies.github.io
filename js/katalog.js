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
  //         the site shows a test banner, and every order e-mail is marked
  //         as «TESTBESTELLUNG».
  // false = live. Only cookies with a confirmed price can be ordered.
  testMode: true,

  // Sample price in CHF, used ONLY in test mode for cookies whose own
  // "price" is still null. It is labelled «Beispielpreis» everywhere.
  samplePrice: 3.5,

  currency: "CHF",

  // Highest quantity of one cookie in a single order.
  maxPerCookie: 99,

  // Where orders go. When a customer taps «Bestellung senden», the order
  // is e-mailed to this address by the form service FormSubmit
  // (formsubmit.co). Leave "email" null to switch sending off.
  order: {
    email: "darlings.cookies.ch@gmail.com",
    note: null        // optional extra line at the end of every order,
                      // e.g. "Bitte gewünschtes Abholdatum dazuschreiben."
  },

  // Shown in the order pop-up and added to the order e-mail once set.
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
   turnFrames   number of turn-around pictures and
   runFrames    number of running pictures for the "run into the cart"
                animation. They live in images/run/ and are called
                <id>-turn-1.svg, <id>-turn-2.svg ... (turning away) and
                <id>-1.svg, <id>-2.svg ... (running, seen from behind).
                Leave both out (or null) for a character without these
                pictures: its normal picture then runs instead.
   --------------------------------------------------------------------- */
window.DARLINGS_CATALOGUE = [
  {
    id: "golden-standard",
    name: "Gold Standard",
    image: "images/golden-standard.webp",
    imageAlt: "Gold Standard: ein lächelnder Chocolate-Chip-Cookie mit einer blauen Rosette, auf der eine 1 steht.",
    description: "Er sitzt in der ersten Reihe und hat das Zusatzblatt längst gelöst. Brauchst du einen Stift, fragt er freundlich: «Blau oder schwarz?» Er hat beide dabei. Und das Ärgerliche: Trotzdem ist er der Liebling von allen.",
    draft: false,
    variety: "Classic Chocolate Chip",
    price: null,
    available: true,
    accent: "#F2B632",
    turnFrames: 3,
    runFrames: 6,
    ingredients: null,
    allergens: null
  },
  {
    id: "biscoff-break",
    name: "Biscoff Break",
    image: "images/biscoff-break.webp",
    imageAlt: "Biscoff Break: ein fröhlicher Cookie, der sich am Kopf kratzt und eine übervolle blaue Tasse in der Hand hält.",
    description: "Er meint es immer gut, nur läuft selten etwas nach Plan. Der Kaffee schwappt über, die Krümel liegen überall, und seinen Stundenplan sucht er seit Montag. Dann kratzt er sich am Kopf und lacht: «Ups. Wo war ich gerade?» Böse sein kann ihm trotzdem niemand.",
    draft: true,
    variety: "Biscoff",
    price: null,
    available: true,
    accent: "#7FB3D3",
    turnFrames: 3,
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
    turnFrames: 3,
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
    turnFrames: 3,
    runFrames: 6,
    ingredients: null,
    allergens: null
  },
  {
    id: "the-sweetheart",
    name: "The Sweetheart",
    image: "images/the-sweetheart.webp",
    imageAlt: "The Sweetheart: ein goldener Cookie mit grossen, glänzenden Augen, Karamell und Salzflocken, der ein Herz fest an sich drückt.",
    description: "Sein Herz drückt er fest an sich und verschenkt es trotzdem jeden Tag. Fällt jemandem das Znüni auf den Boden, teilt er seines und flüstert: «Nimm ruhig die grössere Hälfte.» Innen weich wie Karamell. Und obendrauf eine Prise Salz, damit es nicht zu kitschig wird.",
    draft: true,
    variety: "Salted Caramel",
    price: null,
    available: true,
    accent: "#F29CA3",
    turnFrames: 3,
    runFrames: 6,
    ingredients: null,
    allergens: null
  },
  {
    id: "charming-churro",
    name: "The Charming Churro",
    image: "images/charming-churro.webp",
    imageAlt: "The Charming Churro: ein Cookie im Zimtzucker-Mantel mit roter Schleife und Stöckelschuhen, der eine Kusshand wirft und eine Zimtstange im Arm hält.",
    description: "Sie betritt keinen Raum, sie hat einen Auftritt. Schleife gerichtet, Zimtstange im Arm, Kusshand in die Runde: «Bitte, bitte, nicht alle auf einmal.» Wo sie war, glitzert es noch tagelang. Das ist kein Staub. Das ist Zimtzucker.",
    draft: true,
    variety: "Churro (Zimt & Zucker)",
    price: null,
    available: true,
    accent: "#C97B3A",
    turnFrames: 3,
    runFrames: 6,
    ingredients: null,
    allergens: null
  },
  {
    id: "sunday-in-sicily",
    name: "Sunday in Sicily",
    image: "images/sunday-in-sicily.webp",
    imageAlt: "Sunday in Sicily: ein grüner Pistazien-Cookie im weissen Hemd, die Sonnenbrille auf dem Kopf und eine Espressotasse in der Hand.",
    description: "Er hat nie Stress, nur Termine mit der Sonne. Sonnenbrille auf dem Kopf, Espresso in der Hand, Blick aufs Meer: «Heute mache ich nichts. Und das mache ich gründlich.» Weich, nussig und bis oben voll mit Pistazien.",
    draft: true,
    variety: "Pistazie",
    price: null,
    available: true,
    accent: "#9DBB5B",
    turnFrames: 3,
    runFrames: 6,
    ingredients: null,
    allergens: null
  },
  {
    id: "chunky-monkey",
    name: "Chunky Monkey",
    image: "images/chunky-monkey.webp",
    imageAlt: "Chunky Monkey: ein muskulöser Cookie voller Peanut-Butter-Chips mit gestreiftem Stirnband und Schweissbändern, der lachend den Daumen hochhält.",
    description: "Zwanzig Liegestütze vor dem Frühstück, und zwar mit einem Lachen. Schaffst du etwas nicht, steht er schon neben dir und ruft: «Komm, einer geht noch!» Seine Muskeln sind aus Erdnussbutter. Sein Daumen zeigt immer nach oben.",
    draft: true,
    variety: "Peanut Butter Chips",
    price: null,
    available: true,
    accent: "#E2643C",
    turnFrames: 3,
    runFrames: 6,
    ingredients: null,
    allergens: null
  }
];
