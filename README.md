# DARLINGS website

To visit: https://darlings-cookies.github.io/

A static website: plain HTML, CSS and JavaScript. There is no build step and
no server code. Open `index.html` in a browser to see it, or host the folder
as it is.

## Files

| File | What it is |
| --- | --- |
| `js/katalog.js` | **The file you edit.** Shop settings and the cookie catalogue. |
| `index.html` | Page structure and the fixed German texts (headline, ordering steps, cart labels). |
| `css/styles.css` | Colours, fonts and layout. The palette is at the top. |
| `css/fonts.css` | The two fonts, embedded so the site calls no outside servers. |
| `js/app.js` | Builds the cards, cart and order text from the catalogue. |
| `images/` | Logo and character illustrations. |

## Change a text, price or availability

Open `js/katalog.js`. Each character is one block:

```js
{
  id: "golden-standard",
  name: "Gold Standard",
  image: "images/golden-standard.webp",
  description: "…",
  draft: false,          // true shows a «Textentwurf» tag in test mode
  variety: "Classic Chocolate Chip",
  price: null,           // confirmed price in CHF, e.g. 3.5
  available: true,       // false keeps the character visible, without ordering
  accent: "#F2B632",
  ingredients: null,     // shown on the card once filled in
  allergens: null
}
```

## Add a new character

1. Put the illustration into `images/` (png, jpg or webp, any shape; a white
   background blends into the card).
2. Copy one block in `js/katalog.js`, change the `id` to a new short name
   without spaces, and fill in the rest.
3. Save. The card, the cart and the order text pick it up on their own.

## Test mode and going live

`testMode: true` in `js/katalog.js` means:

- cookies without a confirmed price use `samplePrice`, labelled «Beispielpreis»
- a test banner is shown and every order e-mail is marked «TESTBESTELLUNG»

To go live:

1. Enter the confirmed `price` for each cookie.
2. Check `order.email`, the address that receives the orders.
3. Optionally fill in `fulfilment.pickup`, `fulfilment.delivery`, `payment`
   and `order.note`. These lines appear in the order pop-up and the order e-mail.
4. Fill in `ingredients` and `allergens` once confirmed.
5. Set `testMode: false`.

In live mode a cookie without a confirmed price shows «Preis folgt bald» and
cannot be ordered.

## How ordering works

In the cart the customer taps «Bestellung erstellen», then enters their name,
picks pick-up or delivery within Lufingen (delivery asks for the address) and
how to be contacted: SMS, WhatsApp (mobile number) or e-mail. «Bestellung
senden» e-mails the order to `order.email` straight away. That e-mail is the
order.

The e-mail is sent by the free form service FormSubmit (formsubmit.co),
because a static site cannot send e-mail itself. The very first order makes
FormSubmit send an activation e-mail to `order.email`; click the link in it
once. Orders only arrive after that.

The cart is saved in the visitor's own browser and survives a page reload.
It is emptied after an order has been sent.

## Host on GitHub Pages

Target: repository `darlings-cookies` in the account `darmadeleine-ui`.
The site address will be https://darmadeleine-ui.github.io/darlings-cookies/

1. Sign in to GitHub as `darmadeleine-ui` and open https://github.com/new
2. Repository name: `darlings-cookies`. Visibility: Public. Do not add a
   README, .gitignore or licence. Click "Create repository".
3. On the empty repository page click "uploading an existing file".
4. Open this folder on your computer, select everything inside it
   (`index.html`, `README.md`, and the folders `css`, `js`, `images`) and
   drag it onto the upload area. `index.html` must end up at the top level,
   not inside another folder.
5. Click "Commit changes".
6. Go to Settings → Pages. Under "Build and deployment" choose Source
   "Deploy from a branch", branch `main`, folder `/ (root)`, and click Save.
7. Wait a minute or two, then open the site address above.

To change something later, edit the file on github.com (pencil icon) or
upload a new version of it the same way. The site updates by itself after
each commit.

## Credits

Fonts: Bagel Fat One and Andika, both under the SIL Open Font License 1.1.
The illustrations were trimmed of empty margins and resized for the web;
the drawings themselves are unchanged.
