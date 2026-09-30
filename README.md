# GetMOTO website

Static one-page site for GetMOTO (motorcycle & scooter repair and rental, Selbourne Road, Luton LU4 8NP).

- `index.html` · `css/style.css` · `js/main.js`
- Hero: scroll-scrubbed exploded-scooter frame sequence (150 frames cut from the source video; `assets/frames/desktop` 16:9, `assets/frames/mobile` 9:16), GSAP ScrollTrigger + Lenis from jsDelivr.
- Rent: Honda PCX 125, Vision 110 and SH 125 cards (`assets/img/rent-*.webp`), each opens WhatsApp pre-filled.
- Testimonials: real Google reviews (5.0, 128 reviews) in endless upward-scrolling columns.
- Contact: phone and WhatsApp are the same number, 07749 818987 (+44 7749 818987) (floating button, feature-card quotes, workshop card, footer).
- Booking form opens WhatsApp with the request pre-filled. Optionally set `FORM_ENDPOINT` in `js/main.js` to also post it to a form backend.

Local preview: `python3 -m http.server 5178`. Deploy: Vercel, no build step.
