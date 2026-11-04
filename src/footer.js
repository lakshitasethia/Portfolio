// Blueprint footer: the pencil sketch on a drafting sheet with a red sun,
// a seal that stamps, LEXI drawn as construction letters, and rolling-text
// hover effects on every link.

import gsap from "gsap";
import { SplitText } from "gsap/SplitText";

const NS = "http://www.w3.org/2000/svg";
const mk = (tag, attrs, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  parent.appendChild(e);
  return e;
};

/* ── rolling text: letters slide up and a fresh copy slides in ── */

export function roll(el, { trigger = el } = {}) {
  if (el.dataset.roll) return;
  el.dataset.roll = "1";
  const text = el.textContent.trim();
  if (!trigger.getAttribute("aria-label")) trigger.setAttribute("aria-label", text);
  el.innerHTML = `<span class="roll" aria-hidden="true"><span class="roll__a">${text}</span><span class="roll__b">${text}</span></span>`;
  const A = SplitText.create(el.querySelector(".roll__a"), { type: "chars" }).chars;
  const B = SplitText.create(el.querySelector(".roll__b"), { type: "chars" }).chars;
  const tl = gsap
    .timeline({ paused: true, defaults: { duration: 0.42, ease: "power3.inOut", stagger: 0.016 } })
    .to(A, { yPercent: -110 }, 0)
    .fromTo(B, { yPercent: 110 }, { yPercent: 0 }, 0);
  const on = () => tl.timeScale(1).play();
  const off = () => tl.timeScale(1.4).reverse();
  trigger.addEventListener("mouseenter", on);
  trigger.addEventListener("mouseleave", off);
  trigger.addEventListener("focus", on);
  trigger.addEventListener("blur", off);
}

/* ── CTA buttons: ink sweeps in, the arrow shoots out and back ── */

function buttons(root, reduce) {
  root.querySelectorAll(".ft-btn").forEach((btn) => {
    roll(btn.querySelector(".ft-btn__label"), { trigger: btn });
    if (reduce) return;
    const fill = btn.querySelector(".ft-btn__fill");
    const a1 = btn.querySelector(".ft-btn__a1");
    const a2 = btn.querySelector(".ft-btn__a2");
    const tl = gsap.timeline({ paused: true, defaults: { duration: 0.5, ease: "expo.out" } });
    tl.fromTo(fill, { scaleX: 0, transformOrigin: "left" }, { scaleX: 1 }, 0);
    if (btn.classList.contains("ft-btn--ghost")) tl.to(btn, { color: "#f7efe6", duration: 0.3 }, 0);
    if (a1) tl.to(a1, { xPercent: 110 }, 0).fromTo(a2, { xPercent: -110 }, { xPercent: 0 }, 0.08);
    btn.addEventListener("mouseenter", () => tl.play());
    btn.addEventListener("mouseleave", () => {
      gsap.set(fill, { transformOrigin: "right" });
      tl.reverse();
    });
  });
}

/* ── the sketch on a drafting sheet ── */

function sketch(art, reduce) {
  const svg = art.querySelector(".ft__draft");
  const sun = art.querySelector(".ft__sun");
  const lines = [];
  const L = (d, cls = "d") => {
    const e = mk("path", { d, class: cls }, svg);
    lines.push(e);
    return e;
  };
  // The svg spans the figure plus 40% either side and 12% above and below,
  // so in svg units the figure itself sits at x 60–240, y 33–367.
  const fx0 = 60, fx1 = 240, fy0 = 33, fy1 = 367;
  const eyeY = fy0 + (fy1 - fy0) * 0.2;
  const chinY = fy0 + (fy1 - fy0) * 0.43;
  const midX = (fx0 + fx1) / 2;
  L(`M0 ${fy1 - 30} H300`);
  L(`M${midX} ${fy0 - 20} V${fy1 + 10}`, "d-faint");
  L(`M${fx0 - 40} ${eyeY} H${fx1 + 40}`, "d-faint");
  L(`M${fx0 - 30} ${chinY} H${fx1 + 30}`, "d-faint");
  L(`M${fx0} ${fy0 - 10} V${fy1 - 20} M${fx1} ${fy0 - 10} V${fy1 - 20}`, "d-faint");
  for (const [x, y] of [[fx0, fy0], [fx1, fy0], [midX, eyeY], [fx0, fy1 - 30], [fx1, fy1 - 30], [midX + 40, chinY]])
    L(`M${x - 4} ${y} H${x + 4} M${x} ${y - 4} V${y + 4}`);
  L(`M${fx0} ${fy0 - 18} H${fx1} M${fx0} ${fy0 - 21} V${fy0 - 15} M${fx1} ${fy0 - 21} V${fy0 - 15}`);
  mk("text", { x: midX, y: fy0 - 22, "text-anchor": "middle", class: "d-label" }, svg).textContent = "LS / 2026";
  mk("text", { x: fx1 + 34, y: eyeY - 3, class: "d-label" }, svg).textContent = "eye line";

  if (reduce) return { lines, sun };
  const cross = art.querySelectorAll(".ft__cross i");
  const sunX = gsap.quickTo(sun, "x", { duration: 1, ease: "power3" });
  const sunY = gsap.quickTo(sun, "y", { duration: 1, ease: "power3" });
  art.addEventListener("pointermove", (e) => {
    const r = art.getBoundingClientRect();
    sunX(((e.clientX - r.left) / r.width - 0.5) * 60);
    sunY(((e.clientY - r.top) / r.height - 0.5) * 40);
    gsap.set(cross[0], { y: e.clientY - r.top });
    gsap.set(cross[1], { x: e.clientX - r.left });
  });
  art.addEventListener("pointerleave", () => (sunX(0), sunY(0)));
  return { lines, sun };
}

/* ── the seal: hover lifts it, click stamps it ── */

function seal(btn, reduce) {
  if (reduce) return;
  btn.addEventListener("mouseenter", () => gsap.to(btn, { rotation: 0, scale: 1.06, duration: 0.5, ease: "back.out(3)" }));
  btn.addEventListener("mouseleave", () => gsap.to(btn, { rotation: -8, scale: 1, duration: 0.6, ease: "power3.out" }));
  btn.addEventListener("click", () => {
    gsap.timeline()
      .to(btn, { scale: 0.88, duration: 0.12, ease: "power3.in" })
      .to(btn, { scale: 1.06, duration: 0.5, ease: "elastic.out(1, 0.4)" });
    const cell = btn.parentElement;
    const r = btn.getBoundingClientRect();
    const c = cell.getBoundingClientRect();
    const ring = document.createElement("span");
    ring.className = "seal-ring";
    Object.assign(ring.style, {
      left: `${r.left - c.left + r.width / 2 - 40}px`,
      top: `${r.top - c.top + r.height / 2 - 40}px`,
      width: "80px",
      height: "80px",
    });
    cell.appendChild(ring);
    gsap.fromTo(ring, { scale: 0.6, opacity: 0.9 }, { scale: 3.2, opacity: 0, duration: 1, ease: "power2.out", onComplete: () => ring.remove() });
  });
}

/* ── LEXI as construction letters ── */

function lexi(svg, reduce) {
  svg.replaceChildren();
  const H = 200; // cap height
  const t = 34; // stroke weight
  const gap = 44;
  const glyphs = [
    { w: 150, shapes: (w) => [[[0, 0], [t, 0], [t, H - t], [w, H - t], [w, H], [0, H]]] },
    {
      w: 150,
      shapes: (w) => {
        const m0 = (H - t) / 2, m1 = (H + t) / 2, mw = w * 0.86;
        return [[[0, 0], [w, 0], [w, t], [t, t], [t, m0], [mw, m0], [mw, m1], [t, m1], [t, H - t], [w, H - t], [w, H], [0, H]]];
      },
    },
    {
      w: 190,
      shapes: (w) => {
        const k = t * 1.25;
        return [
          [[0, 0], [k, 0], [w, H], [w - k, H]],
          [[w - k, 0], [w, 0], [k, H], [0, H]],
        ];
      },
    },
    { w: t, shapes: () => [[[0, 0], [t, 0], [t, H], [0, H]]] },
  ];
  const total = glyphs.reduce((a, g) => a + g.w, 0) + gap * (glyphs.length - 1);
  const pad = 22;
  const crop = H - 12; // trimmed through the bottom bars, like a cut sheet
  svg.setAttribute("viewBox", `${-pad} -64 ${total + pad * 2} ${64 + crop}`);

  const defs = mk("defs", {}, svg);
  const pat = mk("pattern", { id: "lx-hatch", width: 7, height: 7, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, defs);
  mk("line", { x1: 0, y1: 0, x2: 0, y2: 7, stroke: "#9e452a", "stroke-width": 3 }, pat);

  mk("path", { d: `M${-pad} 0 H${total + pad}`, class: "lx-guide" }, svg);
  mk("path", { d: `M${-pad} ${(H - t) / 2} H${total + pad}`, class: "lx-guide" }, svg);

  const letters = [];
  let x = 0;
  glyphs.forEach((g) => {
    const grp = mk("g", { class: "lx-letter", transform: `translate(${x} 0)` }, svg);
    const inner = mk("g", {}, grp);
    const polys = g.shapes(g.w);
    const d = (pts) => `M${pts.map((p) => p.join(" ")).join("L")}Z`;
    const fills = polys.map((pts) => mk("path", { d: d(pts), class: "lx-fill" }, inner));
    const outs = polys.map((pts) => mk("path", { d: d(pts), class: "lx-out" }, inner));
    const ticks = [];
    polys.flat().forEach(([px, py]) => {
      if (py > crop + 4) return;
      ticks.push(mk("path", { d: `M${px - 6} ${py} H${px + 6} M${px} ${py - 6} V${py + 6}`, class: "lx-tick" }, inner));
    });
    const dim = mk("g", { opacity: 0 }, inner);
    mk("path", { d: `M0 -22 H${g.w} M0 -28 V-16 M${g.w} -28 V-16`, class: "lx-dim" }, dim);
    mk("text", { x: g.w / 2, y: -30, "text-anchor": "middle", class: "lx-num" }, dim).textContent = `${g.w}.000`;
    // a hit area so the whole letter column reacts, not just its thin outline
    mk("rect", { x: -gap / 2, y: -64, width: g.w + gap, height: 64 + crop, fill: "transparent" }, grp);
    letters.push({ grp, inner, fills, outs, ticks, dim });
    x += g.w + gap;
  });

  if (reduce) return letters;

  letters.forEach(({ grp, inner, fills, outs, ticks, dim }) => {
    const tl = gsap
      .timeline({ paused: true, defaults: { ease: "expo.out" } })
      .fromTo(outs, { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 0.7, ease: "power2.inOut", immediateRender: false }, 0)
      .to(fills, { opacity: 1, duration: 0.5, ease: "power2.out" }, 0.15)
      .to(inner, { y: -14, duration: 0.6 }, 0)
      .to(ticks, { rotation: 45, transformOrigin: "50% 50%", duration: 0.5, stagger: 0.02 }, 0)
      .to(dim, { opacity: 1, duration: 0.3 }, 0.1);
    grp.addEventListener("mouseenter", () => tl.timeScale(1).play(0));
    grp.addEventListener("mouseleave", () => tl.timeScale(1.6).reverse());
  });
  return letters;
}

/* ── assemble ── */

export function createFooter(foot, { reduce, smoother }) {
  const art = sketch(foot.querySelector(".ft__art"), reduce);
  const letters = lexi(foot.querySelector(".lexi"), reduce);
  seal(foot.querySelector(".ft-seal"), reduce);
  buttons(foot, reduce);
  foot.querySelectorAll(".cell a").forEach((a) => roll(a));

  // dashed guides only span the CTA + sketch rows
  const guides = foot.querySelector(".ft__guides");
  const setGuides = () => guides.style.setProperty("--guides-h", `${foot.querySelector(".ft__grid").offsetTop}px`);
  setGuides();
  addEventListener("resize", setGuides);

  // live coordinates, like a drafting table
  const coords = foot.querySelector(".ft__coords");
  foot.addEventListener("pointermove", (e) => {
    const r = foot.getBoundingClientRect();
    coords.textContent = `[${Math.round(e.clientX - r.left)},${Math.round(e.clientY - r.top)}]`;
  });

  // clock, copy, back to top
  const clock = foot.querySelector(".clock");
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" });
  const tick = () => (clock.textContent = fmt.format(new Date()));
  tick();
  setInterval(tick, 10000);
  foot.querySelector(".totop").addEventListener("click", () =>
    smoother ? smoother.scrollTo(0, true) : scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" })
  );
  const copy = foot.querySelector(".copy");
  const email = foot.querySelector(".ft__mail").getAttribute("href").replace("mailto:", "");
  const toast = document.createElement("span");
  toast.className = "ft-btn__toast";
  toast.setAttribute("aria-hidden", "true");
  copy.appendChild(toast);
  copy.addEventListener("click", async () => {
    let msg = "Copied";
    try {
      await navigator.clipboard.writeText(email);
    } catch {
      msg = "Select it below";
    }
    toast.textContent = msg;
    copy.setAttribute("aria-label", msg);
    gsap.timeline()
      .fromTo(toast, { yPercent: 101 }, { yPercent: 0, duration: 0.45, ease: "expo.out" })
      .to(toast, { yPercent: -101, duration: 0.45, ease: "expo.in", delay: 1.4 })
      .add(() => copy.setAttribute("aria-label", "Copy email"));
  });

  if (reduce) return;

  gsap.from(guides.children, {
    scaleY: 0, duration: 1.4, ease: "expo.inOut", stagger: 0.1,
    scrollTrigger: { trigger: foot, start: "top 85%" },
  });
  const title = SplitText.create(foot.querySelector(".ft__title"), { type: "words", mask: "words" });
  gsap.from(title.words, {
    yPercent: 110, duration: 1.1, ease: "expo.out", stagger: 0.05,
    scrollTrigger: { trigger: foot, start: "top 75%" },
  });
  gsap.timeline({ scrollTrigger: { trigger: foot.querySelector(".ft__art"), start: "top 80%" } })
    .from(art.lines, { drawSVG: 0, duration: 1.2, ease: "power2.inOut", stagger: 0.05 })
    .from(foot.querySelector(".ft__sketch img"), { clipPath: "inset(100% 0% 0% 0%)", duration: 1.6, ease: "expo.inOut" }, 0.1)
    .from(art.sun, { scale: 0, duration: 1.1, ease: "back.out(1.8)" }, 0.9);
  gsap.from(foot.querySelectorAll(".cell > *"), {
    y: 18, opacity: 0, duration: 0.8, ease: "expo.out", stagger: 0.03,
    scrollTrigger: { trigger: foot.querySelector(".ft__grid"), start: "top 85%" },
  });
  const lx = gsap.timeline({ scrollTrigger: { trigger: foot.querySelector(".ft__giant"), start: "top 95%" } });
  letters.forEach((l, i) => {
    lx.from(l.outs, { drawSVG: 0, duration: 1.2, ease: "power2.inOut" }, i * 0.12)
      .from(l.ticks, { scale: 0, transformOrigin: "50% 50%", duration: 0.4, ease: "back.out(3)", stagger: 0.02 }, 0.5 + i * 0.12);
  });
}
