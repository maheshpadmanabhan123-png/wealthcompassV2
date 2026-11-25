# Wealth Compass

**AI wealth management with a human explanation.**

A multi-page, static website concept for a modern wealth-management product — built for India, the UAE, the US and global investors. Portfolio management, personal finance, retirement planning, AI investment analysis, market intelligence and financial goals, written in plain language.

> **Demo project.** All figures, market data, projections and AI signals are illustrative. Nothing here is investment, tax or legal advice.

---

## Live pages

| Page | What it covers |
| --- | --- |
| `index.html` | Homepage: hero, live-style portfolio dashboard, AI analysis terminal, global market tabs, SIP goal calculator, education preview, jargon decoder |
| `portfolio.html` | Portfolio management: 5-question risk quiz, 3-step onboarding, market-specific tax wrappers (India / UAE / USA), rebalancing table |
| `education.html` | Free education: filterable 12-resource library, learning paths, updated case studies, risk rules, glossary accordion |
| `insights.html` | Market intelligence: snapshot cards, interactive market chart, AI signal feed, economic calendar, "what this means for you" personas |

---

## Features

- **Interactive demo dashboard** — switch currency (INR / USD / AED), risk profile and time horizon; the chart, allocation donut and metrics update live.
- **SIP goal calculator** — sliders for monthly amount, horizon and expected return, with an animated projection chart.
- **AI analysis terminal** — typewriter-style plain-language portfolio read.
- **Risk profiler** — scored quiz that maps answers to an allocation and expected return/volatility.
- **Jargon decoder** — click any financial term to get a plain-English explanation.
- **Market coverage tabs** — India, UAE, USA and Global views.
- **Filterable education library** and **accordion glossary**.
- **Fully responsive**, keyboard-accessible, with `prefers-reduced-motion` support and visible focus states.

No frameworks. No build step. Just HTML, CSS and vanilla JavaScript.

---

## Tech stack

- **HTML5** — four static pages, semantic structure, ARIA where it matters
- **CSS** — one hand-written design system (`assets/css/style.css`), custom properties, fluid type, editorial "paper" sections
- **JavaScript** — one dependency-free script (`assets/js/main.js`), custom SVG chart engine, no libraries
- **Fonts** — Instrument Serif, Manrope, IBM Plex Mono (Google Fonts, with system fallbacks)
- **Icons** — inline SVG

---

## Project structure

```
.
├── index.html
├── portfolio.html
├── education.html
├── insights.html
├── assets/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── main.js
│   └── favicon.svg
├── .github/
│   └── workflows/
│       └── pages.yml
├── .gitignore
├── LICENSE
└── README.md
```

---

## Run locally

Because everything is static, you can open `index.html` directly in a browser. For the most accurate behaviour (and to match production), serve it over HTTP:

```bash
# Python 3
python -m http.server 8080

# or Node
npx serve .
```

Then visit <http://localhost:8080>.

---

## Deploy to GitHub Pages

1. Create a new repository on GitHub (for example `wealth-compass`).
2. Push this folder to the `main` branch.
3. In **Settings → Pages**, set **Source** to **GitHub Actions**.
4. The included workflow (`.github/workflows/pages.yml`) publishes the site on every push to `main`.

Your site will be live at `https://<your-username>.github.io/<repo-name>/`.

> Prefer a branch deploy? Set **Source** to **Deploy from a branch → main → / (root)** instead. Both work with this project because there is no build step.

---

## Customising

| What | Where |
| --- | --- |
| Colours, type, spacing | CSS custom properties at the top of `assets/css/style.css` |
| Portfolio base value, risk profiles, currency rates | `RISK`, `CURRENCIES` and `BASE_PORTFOLIO` in `assets/js/main.js` |
| Market series data | The seeded generators in `assets/js/main.js` |
| Copy and sections | The relevant `.html` file |

---

## Accessibility notes

- Skip link, landmark regions and a logical heading order.
- Tabs, filters and quiz use real buttons with `aria-pressed` / `aria-selected` state.
- Charts expose an accessible label and the surrounding figures are real text.
- Motion respects `prefers-reduced-motion`.
- Focus-visible outlines are preserved throughout.

---

## Disclaimer

Wealth Compass is a concept demonstration created for design and educational purposes. All figures, market data, projections and AI signals shown are illustrative and do not represent real accounts or live prices. Nothing on this site is investment, tax or legal advice. Investments carry risk, including loss of capital; past performance does not guarantee future results. Always consult a qualified, regulated adviser before making financial decisions.

---

## License

MIT — see [LICENSE](LICENSE).
