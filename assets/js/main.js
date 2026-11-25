/* =========================================================
   WEALTH COMPASS — interactions
   ========================================================= */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const NS = "http://www.w3.org/2000/svg";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const svgEl = (tag, attrs = {}) => {
    const node = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    return node;
  };

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  /* ---------------------------------------------------------
     Currency
  --------------------------------------------------------- */
  const CURRENCIES = {
    INR: { rate: 84.2, locale: "en-IN", symbol: "₹" },
    AED: { rate: 3.6725, locale: "en-AE", symbol: "AED " },
    USD: { rate: 1, locale: "en-US", symbol: "$" },
  };

  function moneyLocal(value, ccy = "USD", compact = false) {
    const c = CURRENCIES[ccy] || CURRENCIES.USD;
    const val = value;

    if (compact) {
      if (ccy === "INR") {
        if (val >= 1e7) return `₹${(val / 1e7).toFixed(2)} Cr`;
        if (val >= 1e5) return `₹${(val / 1e5).toFixed(1)} L`;
      } else {
        const prefix = ccy === "AED" ? "AED " : "$";
        if (val >= 1e6) return `${prefix}${(val / 1e6).toFixed(2)}M`;
        if (val >= 1e4) return `${prefix}${Math.round(val / 1e3)}K`;
      }
    }

    try {
      return new Intl.NumberFormat(c.locale, {
        style: "currency",
        currency: ccy,
        maximumFractionDigits: 0,
      }).format(val);
    } catch (e) {
      return `${c.symbol}${Math.round(val).toLocaleString()}`;
    }
  }

  function money(value, ccy = "USD", compact = false) {
    const c = CURRENCIES[ccy] || CURRENCIES.USD;
    return moneyLocal(value * c.rate, ccy, compact);
  }

  const num = (v, decimals = 0) =>
    Number(v).toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

  /* ---------------------------------------------------------
     Market / risk data
  --------------------------------------------------------- */
  const BASE_PORTFOLIO = 48500; // USD
  const RANGE_YEARS = { "1M": 1 / 12, "6M": 0.5, "1Y": 1, "5Y": 5 };
  const RANGE_POINTS = { "1M": 24, "6M": 30, "1Y": 52, "5Y": 60 };

  const RISK = {
    conservative: {
      label: "Conservative",
      expected: 6.9,
      vol: 6.2,
      score: 76,
      delta: 7.8,
      alloc: [
        { name: "Global equity", pct: 24, color: "#d6b36a" },
        { name: "India & EM equity", pct: 6, color: "#e8d3a0" },
        { name: "Bonds", pct: 45, color: "#7ba7c9" },
        { name: "Gold", pct: 12, color: "#c98b5b" },
        { name: "Cash", pct: 13, color: "#3e4a5a" },
      ],
      note: "Your cash cushion covers 8 months of expenses — more than you need. Three months is your target, so the rest can work harder.",
      result:
        "You value steadiness over speed. A bond-heavy mix with a slice of equity and gold is built to soften the bumps while still beating cash over time.",
    },
    balanced: {
      label: "Balanced",
      expected: 9.6,
      vol: 10.8,
      score: 82,
      delta: 12.4,
      alloc: [
        { name: "Global equity", pct: 48, color: "#d6b36a" },
        { name: "India & EM equity", pct: 14, color: "#e8d3a0" },
        { name: "Bonds", pct: 22, color: "#7ba7c9" },
        { name: "Gold", pct: 9, color: "#c98b5b" },
        { name: "Cash", pct: 7, color: "#3e4a5a" },
      ],
      note: "Your US equity weight is 3.2% above target. A small trim keeps the risk exactly where you chose it — no prediction needed.",
      result:
        "You want growth without losing sleep. A global equity core, a bond cushion and gold for the bad days — rebalanced automatically so you never have to guess.",
    },
    growth: {
      label: "Growth",
      expected: 11.4,
      vol: 14.6,
      score: 88,
      delta: 16.9,
      alloc: [
        { name: "Global equity", pct: 58, color: "#d6b36a" },
        { name: "India & EM equity", pct: 17, color: "#e8d3a0" },
        { name: "Bonds", pct: 10, color: "#7ba7c9" },
        { name: "Gold", pct: 8, color: "#c98b5b" },
        { name: "Cash", pct: 7, color: "#3e4a5a" },
      ],
      note: "Your portfolio is doing its job. A 14.6% expected swing feels loud, but your 12-year horizon can absorb it. Stay invested.",
      result:
        "You can live with swings for a shot at higher growth. An equity-led mix suits a long horizon and a steady income — as long as you can leave it alone.",
    },
  };

  function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(seed) {
    let a = seed;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const END_DATE = new Date(2026, 10, 24);

  function labelsFor(range, n) {
    const years = RANGE_YEARS[range] || 1;
    const start = new Date(END_DATE.getTime() - years * 365.25 * 864e5);
    const out = [];
    for (let i = 0; i < n; i++) {
      const d = new Date(start.getTime() + ((END_DATE - start) * i) / (n - 1));
      const m = d.toLocaleString("en-US", { month: "short" });
      out.push(range === "1M" || range === "6M" ? `${d.getDate()} ${m}` : `${m} ’${String(d.getFullYear()).slice(2)}`);
    }
    return out;
  }

  function walk(range, riskKey, n) {
    const rng = mulberry32(hashString(`${range}-${riskKey}`));
    const years = RANGE_YEARS[range];
    const { expected, vol } = RISK[riskKey];
    const mu = expected / 100;
    const sigma = vol / 100;
    const dt = years / (n - 1);
    let v = 1;
    const out = [1];
    for (let i = 1; i < n; i++) {
      const shock = (rng() + rng() + rng() + rng() - 2) / 0.577;
      v *= Math.exp((mu - (sigma * sigma) / 2) * dt + sigma * Math.sqrt(dt) * shock);
      out.push(v);
    }
    const last = out[out.length - 1] || 1;
    return out.map((x) => x / last);
  }

  /* ---------------------------------------------------------
     Chart engine
  --------------------------------------------------------- */
  let chartUid = 0;
  const chartRegistry = new WeakMap();

  function smoothPath(points) {
    if (points.length < 2) return "";
    let d = `M${points[0][0]},${points[0][1]}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;
      const c1x = p1[0] + (p2[0] - p0[0]) / 6;
      const c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6;
      const c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
    }
    return d;
  }

  function renderChart(container, config, animate = true) {
    if (!container) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width < 20 || height < 20) return;

    chartRegistry.set(container, config);
    container.innerHTML = "";

    const tip = document.createElement("div");
    tip.className = "chart-tip";
    container.appendChild(tip);

    const svg = svgEl("svg", {
      viewBox: `0 0 ${width} ${height}`,
      width: "100%",
      height: "100%",
      role: "img",
      "aria-label": config.ariaLabel || "Illustrative portfolio chart",
      preserveAspectRatio: "none",
    });
    container.appendChild(svg);

    const minimal = !!config.minimal;
    const pad = minimal ? { l: 2, r: 2, t: 8, b: 2 } : { l: 50, r: 12, t: 14, b: 26 };
    const plotW = width - pad.l - pad.r;
    const plotH = height - pad.t - pad.b;
    if (plotW <= 0 || plotH <= 0) return;

    const series = config.series.filter((s) => s.values && s.values.length);
    if (!series.length) return;

    let min = Infinity;
    let max = -Infinity;
    series.forEach((s) => {
      s.values.forEach((v) => {
        if (v < min) min = v;
        if (v > max) max = v;
      });
    });
    if (config.zeroBase) min = 0;
    if (min === max) {
      min -= 1;
      max += 1;
    }
    const span = max - min;
    min -= span * (config.zeroBase ? 0 : 0.12);
    max += span * 0.12;

    const n = Math.max(...series.map((s) => s.values.length));
    const xAt = (i) => pad.l + (plotW * i) / (n - 1);
    const yAt = (v) => pad.t + plotH - ((v - min) / (max - min)) * plotH;

    /* grid + y labels */
    if (!minimal) {
      const ticks = 4;
      for (let i = 0; i < ticks; i++) {
        const y = pad.t + (plotH * i) / (ticks - 1);
        svg.appendChild(
          svgEl("line", {
            x1: pad.l,
            x2: width - pad.r,
            y1: y,
            y2: y,
            stroke: "rgba(242,239,231,0.07)",
            "stroke-dasharray": "2 5",
          })
        );
        const val = max - ((max - min) * i) / (ticks - 1);
        const label = svgEl("text", {
          x: pad.l - 9,
          y: y + 3,
          fill: "rgba(152,160,174,0.75)",
          "font-size": "9",
          "font-family": "'IBM Plex Mono', monospace",
          "text-anchor": "end",
        });
        label.textContent = config.formatY ? config.formatY(val) : num(val);
        svg.appendChild(label);
      }

      if (config.labels && config.labels.length === n) {
        const indices = [0, Math.floor((n - 1) / 2), n - 1];
        indices.forEach((idx, k) => {
          const t = svgEl("text", {
            x: xAt(idx),
            y: height - 7,
            fill: "rgba(152,160,174,0.62)",
            "font-size": "9",
            "font-family": "'IBM Plex Mono', monospace",
            "text-anchor": k === 0 ? "start" : k === indices.length - 1 ? "end" : "middle",
          });
          t.textContent = config.labels[idx];
          svg.appendChild(t);
        });
      }
    }

    /* area + lines */
    series.forEach((s, si) => {
      const pts = s.values.map((v, i) => [xAt(i), yAt(v)]);
      const d = smoothPath(pts);

      if (s.fill) {
        const gid = `chart-grad-${++chartUid}`;
        const defs = svgEl("defs");
        const grad = svgEl("linearGradient", { id: gid, x1: "0", y1: "0", x2: "0", y2: "1" });
        grad.appendChild(svgEl("stop", { offset: "0%", "stop-color": s.color, "stop-opacity": "0.3" }));
        grad.appendChild(svgEl("stop", { offset: "100%", "stop-color": s.color, "stop-opacity": "0" }));
        defs.appendChild(grad);
        svg.appendChild(defs);

        const area = svgEl("path", {
          d: `${d} L${xAt(n - 1)},${height - pad.b} L${xAt(0)},${height - pad.b} Z`,
          fill: `url(#${gid})`,
          stroke: "none",
        });
        if (animate && !reduceMotion) {
          area.style.opacity = "0";
          area.style.transition = "opacity 0.9s ease 0.15s";
          requestAnimationFrame(() => (area.style.opacity = "1"));
        }
        svg.appendChild(area);
      }

      const path = svgEl("path", {
        d,
        fill: "none",
        stroke: s.color,
        "stroke-width": s.width || 2.1,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        "stroke-dasharray": s.dashed ? "4 5" : "",
        "vector-effect": "non-scaling-stroke",
      });
      if (animate && !reduceMotion && !s.dashed) {
        try {
          const len = path.getTotalLength();
          if (len > 0) {
            path.style.strokeDasharray = `${len}`;
            path.style.strokeDashoffset = `${len}`;
            requestAnimationFrame(() => {
              path.style.transition = "stroke-dashoffset 1.5s cubic-bezier(.2,.7,.2,1)";
              path.style.strokeDashoffset = "0";
            });
          }
        } catch (e) {
          /* noop */
        }
      }
      svg.appendChild(path);

      if (!s.dashed) {
        const lastX = xAt(n - 1);
        const lastY = yAt(s.values[s.values.length - 1]);
        svg.appendChild(svgEl("circle", { cx: lastX, cy: lastY, r: 7, fill: s.color, opacity: "0.14" }));
        svg.appendChild(svgEl("circle", { cx: lastX, cy: lastY, r: 3.2, fill: s.color }));
      }
    });

    /* hover */
    if (!config.noTooltip) {
      const hoverLine = svgEl("line", {
        y1: pad.t,
        y2: height - pad.b,
        stroke: "rgba(241,220,168,0.35)",
        "stroke-width": "1",
        "stroke-dasharray": "3 4",
        opacity: "0",
      });
      svg.appendChild(hoverLine);

      const dots = series.map((s) => {
        const c = svgEl("circle", {
          r: 4,
          fill: "#080d13",
          stroke: s.color,
          "stroke-width": "2",
          opacity: "0",
        });
        svg.appendChild(c);
        return c;
      });

      const overlay = svgEl("rect", {
        x: pad.l,
        y: pad.t,
        width: plotW,
        height: plotH,
        fill: "transparent",
      });
      svg.appendChild(overlay);

      overlay.addEventListener("pointermove", (e) => {
        const rect = container.getBoundingClientRect();
        const px = clamp(e.clientX - rect.left, pad.l, width - pad.r);
        const ratio = (px - pad.l) / plotW;
        const idx = clamp(Math.round(ratio * (n - 1)), 0, n - 1);
        const x = xAt(idx);

        hoverLine.setAttribute("x1", x);
        hoverLine.setAttribute("x2", x);
        hoverLine.setAttribute("opacity", "1");

        let topY = height;
        series.forEach((s, i) => {
          const v = s.values[Math.min(idx, s.values.length - 1)];
          const y = yAt(v);
          dots[i].setAttribute("cx", x);
          dots[i].setAttribute("cy", y);
          dots[i].setAttribute("opacity", "1");
          topY = Math.min(topY, y);
        });

        const label = (config.labels && config.labels[idx]) || "";
        if (series.length === 1) {
          tip.innerHTML = `<strong>${config.format(series[0].values[idx])}</strong><span>${label}</span>`;
        } else {
          tip.innerHTML =
            `<span>${label}</span>` +
            series
              .map(
                (s) =>
                  `<div class="tip-row"><i style="background:${s.color}"></i>${s.name ? s.name + " " : ""}${config.format(
                    s.values[Math.min(idx, s.values.length - 1)]
                  )}</div>`
              )
              .join("");
        }

        tip.style.left = `${clamp(x, 58, width - 58)}px`;
        tip.style.top = `${clamp(topY - 10, 48, height - 20)}px`;
        tip.style.opacity = "1";
      });

      overlay.addEventListener("pointerleave", () => {
        tip.style.opacity = "0";
        hoverLine.setAttribute("opacity", "0");
        dots.forEach((d) => d.setAttribute("opacity", "0"));
      });
    }

    if (!chartRegistry.has(container)) {
      /* noop — observer attached below by initCharts */
    }
  }

  function observeCharts() {
    if (typeof ResizeObserver === "undefined") return;
    $$(".chart, .market-spark, .hero-spark").forEach((c) => {
      if (c.dataset.observed) return;
      c.dataset.observed = "1";
      let frame = 0;
      const ro = new ResizeObserver(() => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          const cfg = chartRegistry.get(c);
          if (cfg) renderChart(c, cfg, false);
        });
      });
      ro.observe(c);
    });
  }

  function sparkline(container, values, color = "#a9822f", format = (v) => num(v)) {
    if (!container) return;
    renderChart(
      container,
      {
        series: [{ values, color, fill: true, width: 1.8 }],
        format,
        formatY: format,
        minimal: true,
        noTooltip: true,
        ariaLabel: "Illustrative trend line",
      },
      false
    );
  }

  function drawSpark(container) {
    const raw = container.dataset.spark;
    if (!raw) return;
    const vals = raw.split(",").map(Number).filter((v) => !Number.isNaN(v));
    if (!vals.length) return;
    const color = container.dataset.sparkColor || "#a9822f";
    sparkline(container, vals, color, (v) => num(v, 0));
  }

  /* ---------------------------------------------------------
     Donut
  --------------------------------------------------------- */
  function renderDonut(svg, alloc) {
    if (!svg) return;
    const R = 52;
    const C = 2 * Math.PI * R;
    svg.innerHTML = "";
    const track = svgEl("circle", {
      cx: 60,
      cy: 60,
      r: R,
      fill: "none",
      stroke: "rgba(242,239,231,0.07)",
      "stroke-width": "13",
    });
    svg.appendChild(track);

    let offset = 0;
    alloc.forEach((a) => {
      const len = (a.pct / 100) * C;
      const gap = Math.min(2.4, len * 0.2);
      const c = svgEl("circle", {
        cx: 60,
        cy: 60,
        r: R,
        fill: "none",
        stroke: a.color,
        "stroke-width": "13",
        "stroke-dasharray": `${Math.max(len - gap, 0.5)} ${C - len + gap}`,
        "stroke-dashoffset": `${-offset}`,
        "stroke-linecap": "butt",
      });
      svg.appendChild(c);
      offset += len;
    });
  }

  function renderAllocList(el, alloc) {
    if (!el) return;
    el.innerHTML = alloc
      .map(
        (a) =>
          `<li><span class="dot" style="background:${a.color}"></span>${a.name}<b>${a.pct}%</b></li>`
      )
      .join("");
  }

  /* ---------------------------------------------------------
     Dashboard
  --------------------------------------------------------- */
  const dashState = { risk: "balanced", ccy: "INR", range: "1Y" };

  function updateDashboard(animate = true) {
    const root = $("#dashboard");
    if (!root) return;
    const risk = RISK[dashState.risk];
    const total = BASE_PORTFOLIO;

    const totalEl = $("#dashTotal");
    if (totalEl) {
      totalEl.textContent = money(total, dashState.ccy, true);
      totalEl.title = money(total, dashState.ccy, false);
    }

    const deltaEl = $("#dashDelta");
    if (deltaEl) deltaEl.textContent = `+${risk.delta.toFixed(1)}% past year`;

    const n = RANGE_POINTS[dashState.range];
    const base = walk(dashState.range, dashState.risk, n);
    const values = base.map((v) => v * total);

    const chart = $("#dashChart");
    if (chart) {
      renderChart(
        chart,
        {
          series: [{ values, color: "#d6b36a", fill: true, name: "Portfolio" }],
          labels: labelsFor(dashState.range, n),
          format: (v) => money(v, dashState.ccy, true),
          formatY: (v) => money(v, dashState.ccy, true),
          ariaLabel: "Illustrative portfolio performance chart",
        },
        animate
      );
    }

    renderDonut($("#dashDonut"), risk.alloc);
    const label = $("#donutLabel");
    if (label) label.textContent = risk.label;
    renderAllocList($("#dashAlloc"), risk.alloc);

    const retEl = $("#dashReturn");
    if (retEl) retEl.textContent = `${risk.expected.toFixed(1)}%`;
    const volEl = $("#dashVol");
    if (volEl) volEl.textContent = `${risk.vol.toFixed(1)}%`;

    const projEl = $("#dashProjected");
    if (projEl) {
      const projected = total * Math.pow(1 + risk.expected / 100, 10);
      projEl.textContent = money(projected, dashState.ccy, true);
      projEl.title = money(projected, dashState.ccy, false);
    }

    const noteEl = $("#dashNote");
    if (noteEl) noteEl.innerHTML = risk.note;

    $$("[data-risk]").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.risk === dashState.risk));
    });
    $$("[data-dash-ccy]").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.dashCcy === dashState.ccy));
    });
    $$("[data-range]").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.range === dashState.range));
    });
  }

  function initDashboard() {
    if (!$("#dashboard")) return;
    $$("[data-risk]").forEach((b) =>
      b.addEventListener("click", () => {
        dashState.risk = b.dataset.risk;
        updateDashboard();
      })
    );
    $$("[data-dash-ccy]").forEach((b) =>
      b.addEventListener("click", () => {
        dashState.ccy = b.dataset.dashCcy;
        updateDashboard();
      })
    );
    $$("[data-range]").forEach((b) =>
      b.addEventListener("click", () => {
        dashState.range = b.dataset.range;
        updateDashboard();
      })
    );
    updateDashboard(false);
  }

  /* ---------------------------------------------------------
     SIP calculator
  --------------------------------------------------------- */
  const SIP_RANGES = {
    INR: { min: 500, max: 200000, step: 500, def: 25000 },
    AED: { min: 200, max: 40000, step: 100, def: 2000 },
    USD: { min: 50, max: 10000, step: 50, def: 500 },
  };

  const sipState = { ccy: "INR", amount: 25000, years: 20, ret: 11 };

  function setSliderFill(input) {
    if (!input) return;
    const min = Number(input.min);
    const max = Number(input.max);
    const val = Number(input.value);
    const pct = ((val - min) / (max - min)) * 100;
    input.style.setProperty("--p", `${pct}%`);
  }

  function updateSip() {
    if (!$("#sipAmount")) return;
    const ccy = sipState.ccy;
    const amount = sipState.amount;
    const years = sipState.years;
    const ret = sipState.ret;
    const months = years * 12;
    const i = ret / 100 / 12;
    const invested = amount * months;
    const fv = i === 0 ? invested : amount * ((Math.pow(1 + i, months) - 1) / i) * (1 + i);
    const gains = fv - invested;

    const big = $("#sipBig");
    if (big) {
      big.textContent = moneyLocal(fv, ccy, true);
      big.title = moneyLocal(fv, ccy, false);
    }
    const sub = $("#sipSub");
    if (sub) sub.textContent = `after ${years} years at ${ret.toFixed(1)}% assumed annual return`;

    const invEl = $("#sipInvested");
    if (invEl) {
      invEl.textContent = moneyLocal(invested, ccy, true);
      invEl.title = moneyLocal(invested, ccy, false);
    }
    const gainEl = $("#sipGains");
    if (gainEl) {
      gainEl.textContent = moneyLocal(gains, ccy, true);
      gainEl.title = moneyLocal(gains, ccy, false);
    }
    const multEl = $("#sipMultiple");
    if (multEl) multEl.textContent = `${(fv / invested).toFixed(1)}×`;

    const bar = $("#sipBar");
    if (bar) {
      bar.style.setProperty("--invested", `${(invested / fv) * 100}%`);
      bar.style.setProperty("--gains", `${(gains / fv) * 100}%`);
    }

    const note = $("#sipNote");
    if (note) {
      note.textContent = `You put in ${moneyLocal(invested, ccy, true)}; the rest is assumed growth. Real markets zig-zag — this is a planning estimate, not a promise.`;
    }

    const amountOut = $("#sipAmountOut");
    if (amountOut) amountOut.textContent = moneyLocal(amount, ccy);
    const yearsOut = $("#sipYearsOut");
    if (yearsOut) yearsOut.textContent = `${years} yr${years === 1 ? "" : "s"}`;
    const retOut = $("#sipRetOut");
    if (retOut) retOut.textContent = `${ret.toFixed(1)}%`;

    const chart = $("#sipChart");
    if (chart) {
      const values = [];
      const investedLine = [];
      for (let y = 0; y <= years; y++) {
        const m = y * 12;
        const val = i === 0 ? amount * m : amount * ((Math.pow(1 + i, m) - 1) / i) * (1 + i);
        values.push(val);
        investedLine.push(amount * m);
      }
      const labels = values.map((_, idx) => (idx === 0 ? "Now" : `Yr ${idx}`));
      renderChart(
        chart,
        {
          series: [
            { values, color: "#d6b36a", fill: true, name: "Projected" },
            { values: investedLine, color: "rgba(242,239,231,0.4)", dashed: true, width: 1.4, name: "Invested" },
          ],
          labels,
          format: (v) => moneyLocal(v, ccy, true),
          formatY: (v) => moneyLocal(v, ccy, true),
          minimal: true,
          zeroBase: true,
          ariaLabel: "Projected growth of your monthly investment",
        },
        false
      );
    }
  }

  function initSip() {
    const amountInput = $("#sipAmount");
    if (!amountInput) return;

    const applyCurrency = (ccy) => {
      sipState.ccy = ccy;
      const cfg = SIP_RANGES[ccy];
      sipState.amount = cfg.def;
      amountInput.min = cfg.min;
      amountInput.max = cfg.max;
      amountInput.step = cfg.step;
      amountInput.value = cfg.def;
      setSliderFill(amountInput);
      $$("[data-sip-ccy]").forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.sipCcy === ccy))
      );
      updateSip();
    };

    $$("[data-sip-ccy]").forEach((b) =>
      b.addEventListener("click", () => applyCurrency(b.dataset.sipCcy))
    );

    amountInput.addEventListener("input", () => {
      sipState.amount = Number(amountInput.value);
      setSliderFill(amountInput);
      updateSip();
    });

    const yearsInput = $("#sipYears");
    if (yearsInput) {
      yearsInput.addEventListener("input", () => {
        sipState.years = Number(yearsInput.value);
        setSliderFill(yearsInput);
        updateSip();
      });
      setSliderFill(yearsInput);
    }

    const retInput = $("#sipRet");
    if (retInput) {
      retInput.addEventListener("input", () => {
        sipState.ret = Number(retInput.value);
        setSliderFill(retInput);
        updateSip();
      });
      setSliderFill(retInput);
    }

    setSliderFill(amountInput);
    applyCurrency("INR");
  }

  /* ---------------------------------------------------------
     AI terminal typing
  --------------------------------------------------------- */
  function initTyping() {
    const el = $("#aiType");
    if (!el) return;
    const messages = [
      "Reading 14,208 signals across India, UAE and US markets…",
      "Comparing your allocation to the risk you chose…",
      "1 drift found: US equity is 3.2% above target.",
      "Rebalance drafted — tax-aware, 0.4% turnover.",
    ];

    if (reduceMotion) {
      el.textContent = messages[messages.length - 1];
      return;
    }

    let msg = 0;
    let char = 0;
    let deleting = false;

    function tick() {
      const current = messages[msg];
      if (!deleting) {
        char++;
        el.textContent = current.slice(0, char);
        if (char >= current.length) {
          deleting = true;
          setTimeout(tick, 2100);
          return;
        }
        setTimeout(tick, 28 + Math.random() * 34);
      } else {
        char -= 2;
        if (char <= 0) {
          char = 0;
          deleting = false;
          msg = (msg + 1) % messages.length;
          el.textContent = "";
          setTimeout(tick, 420);
          return;
        }
        el.textContent = current.slice(0, char);
        setTimeout(tick, 14);
      }
    }

    setTimeout(tick, 700);
  }

  /* ---------------------------------------------------------
     Generic tabs
  --------------------------------------------------------- */
  function initTabs() {
    $$("[data-tabs-group]").forEach((group) => {
      const tabs = $$("[data-tab]", group);
      const panels = $$("[data-panel]", group);
      if (!tabs.length) return;

      const activate = (key) => {
        tabs.forEach((t) => {
          const on = t.dataset.tab === key;
          t.setAttribute("aria-selected", String(on));
          t.setAttribute("tabindex", on ? "0" : "-1");
        });
        panels.forEach((p) => {
          p.hidden = p.dataset.panel !== key;
        });
        const panel = panels.find((p) => p.dataset.panel === key);
        if (panel) {
          const spark = $("[data-spark]", panel);
          if (spark) drawSpark(spark);
        }
      };

      tabs.forEach((tab, idx) => {
        tab.addEventListener("click", () => activate(tab.dataset.tab));
        tab.addEventListener("keydown", (e) => {
          let next = null;
          if (e.key === "ArrowRight" || e.key === "ArrowDown") next = tabs[(idx + 1) % tabs.length];
          if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = tabs[(idx - 1 + tabs.length) % tabs.length];
          if (next) {
            e.preventDefault();
            next.focus();
            activate(next.dataset.tab);
          }
        });
      });

      const initial = tabs.find((t) => t.getAttribute("aria-selected") === "true") || tabs[0];
      activate(initial.dataset.tab);
    });
  }

  /* ---------------------------------------------------------
     Translator
  --------------------------------------------------------- */
  const TERMS = [
    {
      term: "Volatility",
      pron: "vol-uh-TIL-uh-tee",
      plain:
        "How much an investment's price bounces around. High volatility isn't automatically bad — it just means the ride is bumpier. What matters is whether you can stay in the seat.",
      example:
        "A fund that typically swings ±20% a year is more volatile than one that swings ±5%. Same destination, very different journey.",
      tag: "Risk",
    },
    {
      term: "Drawdown",
      pron: "draw-down",
      plain:
        "The distance from an investment's peak to its lowest point before it recovers. It is the number that tells you how bad the bad times felt.",
      example:
        "If your portfolio went from ₹10 lakh to ₹8 lakh, that's a 20% drawdown. It isn't a loss until you sell.",
      tag: "Risk",
    },
    {
      term: "Rebalancing",
      pron: "ree-BAL-uhn-sing",
      plain:
        "Bringing your portfolio back to the mix you originally chose. You trim what has grown too big and top up what has lagged. It is maintenance, not market timing.",
      example:
        "Your target is 60% shares. A good year pushes it to 66%. Rebalancing sells the extra 6% and restores the plan.",
      tag: "Portfolio",
    },
    {
      term: "Expense ratio",
      pron: "ex-PENS ray-shee-oh",
      plain:
        "The yearly fee a fund quietly takes from your money. It sounds tiny, but it compounds against you for as long as you invest.",
      example:
        "On ₹10 lakh over 20 years, a 1.5% fee can cost you several lakh more than a 0.2% fee. Ask before you buy.",
      tag: "Fees",
    },
    {
      term: "SIP",
      pron: "ess-eye-pee",
      plain:
        "A Systematic Investment Plan: investing a fixed amount on a fixed schedule, whatever the market is doing. It removes the hardest part — deciding when.",
      example:
        "₹10,000 on the 5th of every month. Some months you buy high, some low; over time it averages out.",
      tag: "Habit",
    },
    {
      term: "Diversification",
      pron: "dy-VUR-suh-fuh-kay-shun",
      plain:
        "Spreading money across things that don't all move together, so one bad decision or one bad market can't sink everything.",
      example:
        "Indian shares, global shares, bonds and gold in one portfolio. When one zigs, another may zag.",
      tag: "Portfolio",
    },
    {
      term: "Liquidity",
      pron: "lih-KWID-ih-tee",
      plain:
        "How quickly you can turn something into spendable cash without losing value. A savings account is liquid; a apartment is not.",
      example:
        "Keep three to six months of expenses liquid before locking money into long-term investments.",
      tag: "Planning",
    },
    {
      term: "Alpha",
      pron: "AL-fuh",
      plain:
        "The part of a return that isn't explained by the market going up. Positive alpha means the manager added something; negative means they subtracted.",
      example:
        "The market returned 10% and your fund returned 12%. The 2% gap is alpha — before fees and luck are considered.",
      tag: "Performance",
    },
  ];

  function initTranslator() {
    const list = $("#termList");
    const panel = $("#termPanel");
    if (!list || !panel) return;

    list.innerHTML = TERMS.map(
      (t, i) =>
        `<button class="term-btn" role="tab" aria-selected="${i === 0}" data-term="${i}">
          ${t.term}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </button>`
    ).join("");

    const show = (i) => {
      const t = TERMS[i];
      panel.innerHTML = `
        <span class="pron">${t.pron}</span>
        <h3>${t.term}</h3>
        <p class="term-plain">${t.plain}</p>
        <p class="term-example">${t.example}</p>
        <span class="pill pill--gold">${t.tag}</span>
      `;
      $$(".term-btn", list).forEach((b, idx) => b.setAttribute("aria-selected", String(idx === i)));
    };

    list.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-term]");
      if (btn) show(Number(btn.dataset.term));
    });

    show(0);
  }

  /* ---------------------------------------------------------
     Education filters
  --------------------------------------------------------- */
  function initFilters() {
    const chips = $$("[data-filter]");
    const cards = $$("[data-cat]");
    const count = $("#eduCount");
    if (!chips.length || !cards.length) return;

    const apply = (filter) => {
      let visible = 0;
      cards.forEach((card) => {
        const show = filter === "all" || card.dataset.cat === filter;
        card.hidden = !show;
        if (show) visible++;
      });
      chips.forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.filter === filter)));
      if (count) count.textContent = `${visible} resource${visible === 1 ? "" : "s"}`;
    };

    chips.forEach((c) => c.addEventListener("click", () => apply(c.dataset.filter)));
    apply("all");
  }

  /* ---------------------------------------------------------
     Risk quiz
  --------------------------------------------------------- */
  const QUESTIONS = [
    {
      q: "Your portfolio drops 20% in a month. What do you do?",
      options: [
        { t: "Sell everything. I can't watch it fall.", s: 0 },
        { t: "Sell some, to stop the bleeding.", s: 1 },
        { t: "Hold and review the plan.", s: 2 },
        { t: "Add money — the plan didn't change.", s: 3 },
      ],
    },
    {
      q: "When will you need this money?",
      options: [
        { t: "Within 3 years.", s: 0 },
        { t: "In 3–7 years.", s: 1 },
        { t: "In 8–15 years.", s: 2 },
        { t: "15 years or more.", s: 3 },
      ],
    },
    {
      q: "How steady is your income?",
      options: [
        { t: "Variable — some months are thin.", s: 0 },
        { t: "Mostly steady, with occasional gaps.", s: 1 },
        { t: "Stable and predictable.", s: 2 },
        { t: "Stable, with room to save more.", s: 3 },
      ],
    },
    {
      q: "Which sentence sounds most like you?",
      options: [
        { t: "Protect what I have first.", s: 0 },
        { t: "A little growth, but keep it calm.", s: 1 },
        { t: "Grow steadily and accept some swings.", s: 2 },
        { t: "Maximise growth; I can ride it out.", s: 3 },
      ],
    },
    {
      q: "How much investing experience do you have?",
      options: [
        { t: "Just starting. Explain everything.", s: 0 },
        { t: "I've bought a few funds.", s: 1 },
        { t: "I invest regularly and follow markets.", s: 2 },
        { t: "I've managed a portfolio through a crash.", s: 3 },
      ],
    },
  ];

  function initQuiz() {
    const stage = $("#quizStage");
    const result = $("#quizResult");
    if (!stage || !result) return;

    let index = 0;
    let score = 0;
    const answers = [];

    const qEl = $("#quizQ");
    const optEl = $("#quizOptions");
    const countEl = $("#quizCount");
    const bar = $("#quizBar");
    const back = $("#quizBack");

    function renderQuestion() {
      const item = QUESTIONS[index];
      qEl.textContent = item.q;
      countEl.textContent = `Question ${index + 1} of ${QUESTIONS.length}`;
      bar.style.width = `${((index + 1) / QUESTIONS.length) * 100}%`;
      optEl.innerHTML = item.options
        .map(
          (o, i) =>
            `<button class="quiz-option" data-score="${o.s}" data-i="${i}">
              <span class="key">${String.fromCharCode(65 + i)}</span>
              <span>${o.t}</span>
            </button>`
        )
        .join("");
      back.style.visibility = index === 0 ? "hidden" : "visible";
    }

    optEl.addEventListener("click", (e) => {
      const btn = e.target.closest(".quiz-option");
      if (!btn) return;
      const s = Number(btn.dataset.score);
      answers[index] = s;
      score = answers.reduce((a, b) => a + (b || 0), 0);
      if (index < QUESTIONS.length - 1) {
        index++;
        setTimeout(renderQuestion, 120);
      } else {
        showResult();
      }
    });

    if (back) {
      back.addEventListener("click", () => {
        if (index > 0) {
          index--;
          renderQuestion();
        }
      });
    }

    function showResult() {
      const key = score <= 5 ? "conservative" : score <= 10 ? "balanced" : "growth";
      const risk = RISK[key];
      stage.hidden = true;
      result.hidden = false;
      bar.style.width = "100%";

      const nameEl = $("#quizRiskName");
      if (nameEl) nameEl.textContent = risk.label;
      const badgeEl = $("#quizRiskBadge");
      if (badgeEl) badgeEl.textContent = `Score ${score} / 15`;
      const copyEl = $("#quizResultCopy");
      if (copyEl) copyEl.textContent = risk.result;

      renderDonut($("#quizDonut"), risk.alloc);
      const label = $("#quizDonutLabel");
      if (label) label.textContent = risk.label;
      renderAllocList($("#quizAlloc"), risk.alloc);

      const expEl = $("#quizExpected");
      if (expEl) expEl.textContent = `${risk.expected.toFixed(1)}%`;
      const volEl = $("#quizVol");
      if (volEl) volEl.textContent = `${risk.vol.toFixed(1)}%`;

      result.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    }

    const retake = $("#quizRetake");
    if (retake) {
      retake.addEventListener("click", () => {
        index = 0;
        score = 0;
        answers.length = 0;
        result.hidden = true;
        stage.hidden = false;
        renderQuestion();
        stage.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
      });
    }

    renderQuestion();
  }

  /* ---------------------------------------------------------
     Insights chart
  --------------------------------------------------------- */
  const insightState = { range: "1Y" };
  const insightBase = { "1M": 24100, "6M": 23240, "1Y": 24812, "5Y": 19840 };

  function updateInsight(animate = true) {
    const chart = $("#marketChart");
    if (!chart) return;
    const range = insightState.range;
    const n = RANGE_POINTS[range];
    const base = walk(range, "balanced", n);
    const start = insightBase[range];
    const values = base.map((v) => v * start);

    renderChart(
      chart,
      {
        series: [{ values, color: "#d6b36a", fill: true, name: "Composite" }],
        labels: labelsFor(range, n),
        format: (v) => num(v, 0),
        formatY: (v) => num(v, 0),
        ariaLabel: "Illustrative global equity composite chart",
      },
      animate
    );

    $$("[data-mrange]").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.mrange === range))
    );

    const change = ((values[values.length - 1] - values[0]) / values[0]) * 100;
    const chgEl = $("#marketChartChange");
    if (chgEl) {
      chgEl.textContent = `${change >= 0 ? "+" : ""}${change.toFixed(1)}% over the period`;
      chgEl.style.color = change >= 0 ? "var(--green)" : "var(--red)";
    }
  }

  function initInsight() {
    if (!$("#marketChart")) return;
    $$("[data-mrange]").forEach((b) =>
      b.addEventListener("click", () => {
        insightState.range = b.dataset.mrange;
        updateInsight();
      })
    );
    updateInsight(false);
  }

  /* ---------------------------------------------------------
     Header, nav, reveal, misc
  --------------------------------------------------------- */
  function initHeader() {
    const header = $(".site-header");
    const progress = $(".scroll-progress");
    const onScroll = () => {
      const y = window.scrollY;
      if (header) header.classList.toggle("is-scrolled", y > 12);
      if (progress) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        progress.style.width = `${max > 0 ? clamp((y / max) * 100, 0, 100) : 0}%`;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const toggle = $(".menu-toggle");
    if (toggle) {
      toggle.addEventListener("click", () => {
        const open = document.body.classList.toggle("nav-open");
        toggle.setAttribute("aria-expanded", String(open));
        toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      });
      $$(".nav a").forEach((a) =>
        a.addEventListener("click", () => {
          document.body.classList.remove("nav-open");
          toggle.setAttribute("aria-expanded", "false");
        })
      );
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && document.body.classList.contains("nav-open")) {
          document.body.classList.remove("nav-open");
          toggle.setAttribute("aria-expanded", "false");
          toggle.focus();
        }
      });
      document.addEventListener("click", (e) => {
        if (
          document.body.classList.contains("nav-open") &&
          !e.target.closest(".nav") &&
          !e.target.closest(".menu-toggle")
        ) {
          document.body.classList.remove("nav-open");
          toggle.setAttribute("aria-expanded", "false");
        }
      });
      window.addEventListener("resize", () => {
        if (window.innerWidth > 980) {
          document.body.classList.remove("nav-open");
          toggle.setAttribute("aria-expanded", "false");
        }
      });
    }

    const path = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    $$(".nav a").forEach((a) => {
      const href = (a.getAttribute("href") || "").split("#")[0].toLowerCase();
      if (href && href === path) a.setAttribute("aria-current", "page");
    });
  }

  function initReveal() {
    const items = $$("[data-reveal]");
    if (!items.length) return;
    if (reduceMotion || !("IntersectionObserver" in window)) {
      items.forEach((i) => i.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const delay = Number(entry.target.dataset.delay || 0);
          entry.target.style.transitionDelay = `${delay}ms`;
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );
    items.forEach((i) => io.observe(i));
  }

  function initCounters() {
    const items = $$("[data-count]");
    if (!items.length) return;
    const run = (el) => {
      const target = Number(el.dataset.count);
      if (Number.isNaN(target)) return;
      if (reduceMotion) {
        el.textContent = target;
        return;
      }
      const dur = 1500;
      const start = performance.now();
      const step = (now) => {
        const p = clamp((now - start) / dur, 0, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if (!("IntersectionObserver" in window)) {
      items.forEach(run);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            run(e.target);
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.4 }
    );
    items.forEach((i) => io.observe(i));
  }

  function initHeroGauge() {
    const gauge = $("#heroGaugeValue");
    if (!gauge) return;
    const target = 82;
    setTimeout(() => {
      gauge.style.strokeDasharray = `${target} 100`;
    }, 350);
  }

  function initTicker() {
    const track = $(".ticker-track");
    if (!track) return;
    const group = $(".ticker-group", track);
    if (!group) return;
    const clone = group.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    track.appendChild(clone);
  }

  function initCursor() {
    if (!finePointer) return;
    const glow = document.createElement("div");
    glow.className = "cursor-glow";
    document.body.appendChild(glow);
    let shown = false;
    window.addEventListener(
      "pointermove",
      (e) => {
        glow.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
        if (!shown) {
          glow.style.opacity = "1";
          shown = true;
        }
      },
      { passive: true }
    );
  }

  function initSpotlight() {
    if (!finePointer) return;
    $$(".spotlight").forEach((card) => {
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${e.clientX - r.left}px`);
        card.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
    });
  }

  function initForm() {
    const form = $("#signupForm");
    if (!form) return;
    const msg = $("#formMsg");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = $("input[type='email']", form);
      const value = (input && input.value.trim()) || "";
      const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
      if (!valid) {
        if (msg) {
          msg.textContent = "Please enter a valid email address.";
          msg.style.color = "var(--red)";
        }
        if (input) input.focus();
        return;
      }
      if (msg) {
        msg.textContent = "You're on the list. Your first plain-language plan is on its way.";
        msg.style.color = "var(--green)";
      }
      form.reset();
    });
  }

  function initYear() {
    $$("[data-year]").forEach((el) => (el.textContent = String(new Date().getFullYear())));
  }

  function initSparklines() {
    $$("[data-spark]").forEach((el) => {
      if (el.clientWidth > 10) drawSpark(el);
    });
    const hero = $("#heroSpark");
    if (hero) {
      sparkline(hero, [42, 46, 44, 51, 49, 56, 54, 61, 66, 63, 71, 78, 76, 84], "#d6b36a");
    }
  }

  /* ---------------------------------------------------------
     Boot
  --------------------------------------------------------- */
  function boot() {
    initHeader();
    initTicker();
    initReveal();
    initCounters();
    initHeroGauge();
    initDashboard();
    initSip();
    initTyping();
    initTabs();
    initTranslator();
    initFilters();
    initQuiz();
    initInsight();
    initForm();
    initYear();
    initSparklines();
    observeCharts();
    initCursor();
    initSpotlight();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
