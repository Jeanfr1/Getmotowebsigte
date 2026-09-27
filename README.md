# GetMOTO website

Static one-page site for GetMOTO (motorcycle & scooter repair and rental, Selbourne Road, Luton LU4 8NP).

- `index.html` · `css/style.css` · `js/main.js`
- Hero: scroll-scrubbed exploded-bike frame sequence (`assets/frames/desktop` 16:9, `assets/frames/mobile` 9:16), GSAP ScrollTrigger + Lenis from jsDelivr.
- Contact: phone 07749 818987, WhatsApp +44 7754 917319 (floating button, feature-card quotes, workshop card, footer).
- Booking form opens WhatsApp with the request pre-filled. Optionally set `FORM_ENDPOINT` in `js/main.js` to also post it to a form backend.

Local preview: `python3 -m http.server 5178`. Deploy: Vercel, no build step.
