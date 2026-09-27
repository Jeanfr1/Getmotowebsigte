# GetMOTO website

Static one-page site for GetMOTO (motorcycle & scooter repair and rental, Selbourne Road, Luton LU4 8NP).

- `index.html` · `css/style.css` · `js/main.js`
- Hero: scroll-scrubbed exploded-bike frame sequence (`assets/frames/desktop` 16:9, `assets/frames/mobile` 9:16), GSAP ScrollTrigger + Lenis from jsDelivr.
- Booking form: set `FORM_ENDPOINT` in `js/main.js` to a form backend (Formspree/Web3Forms) to receive requests by email; until then it hands the request to SMS / phone (07749 818987).

Local preview: `python3 -m http.server 5178`. Deploy: Vercel, no build step.
