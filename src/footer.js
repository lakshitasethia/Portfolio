// Blueprint footer: a hand-drawn render scene lit by a sun you can move,
// an isometric box with a light inside, a giant outlined name with
// construction ticks, and rolling-text hover effects on every link.

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

/* ── CTA buttons: ink sweeps in, arrow shoots out and back in ── */

function buttons(root, reduce) {
  root.querySelectorAll(".ft-btn").forEach((btn) => {
    const label = btn.querySelector(".ft-btn__label");
    roll(label, { trigger: btn });
    if (reduce) return;
    const fill = btn.querySelector(".ft-btn__fill");
    const a1 = btn.querySelector(".ft-btn__a1");
    const a2 = btn.querySelector(".ft-btn__a2");
    const ghost = btn.classList.contains("ft-btn--ghost");
    const tl = gsap.timeline({ paused: true, defaults: { duration: 0.5, ease: "expo.out" } });
    tl.fromTo(fill, { scaleX: 0, transformOrigin: "left" }, { scaleX: 1 }, 0);
    if (ghost) tl.to(btn, { color: "#f7efe6", duration: 0.3 }, 0);
    if (a1) tl.to(a1, { xPercent: 110 }, 0).fromTo(a2, { xPercent: -110 }, { xPercent: 0 }, 0.08);
    btn.addEventListener("mouseenter", () => tl.play());
    btn.addEventListener("mouseleave", () => {
      gsap.set(fill, { transformOrigin: "right" });
      tl.reverse();
    });
  });
}

/* ── the scene: a cube and two spheres on a floor grid, lit by a sun ── */

function scene(svg, reduce) {
  svg.replaceChildren();
  const g = mk("g", {}, svg);
  const lines = [];
  const L = (attrs, cls = "sc") => {
    const e = mk("line", { ...attrs, class: cls }, g);
    lines.push(e);
    return e;
  };
  const P = (d, cls = "sc") => {
    const e = mk("path", { d, class: cls }, g);
    lines.push(e);
    return e;
  };

  // sun sits behind everything, like a red disc on the paper
  const sun = mk("circle", { cx: 610, cy: 92, r: 46, class: "sc-sun" }, g);

  // floor: a perspective grid fading to the horizon
  const H = 300;
  L({ x1: -40, y1: H, x2: 840, y2: H }, "sc");
  for (let x = -520; x <= 1320; x += 80) L({ x1: x, y1: 440, x2: 400 + (x - 400) * 0.14, y2: H }, "sc-faint");
  for (const y of [306, 314, 325, 340, 360, 386, 420]) {
    const w = 60 + (y - H) * 5.2;
    L({ x1: 400 - w, y1: y, x2: 400 + w, y2: y }, "sc-faint");
  }

  // shadows (moved by the sun)
  const shadows = [
    { obj: [240, 360], e: mk("ellipse", { cx: 240, cy: 362, rx: 70, ry: 10, class: "sc-shadow" }, g) },
    { obj: [540, 372], e: mk("ellipse", { cx: 540, cy: 374, rx: 58, ry: 10, class: "sc-shadow" }, g) },
    { obj: [410, 382], e: mk("ellipse", { cx: 410, cy: 384, rx: 24, ry: 5, class: "sc-shadow" }, g) },
  ];

  // cube
  mk("path", { d: "M190 260 L220 238 L320 238 L290 260Z", class: "sc-face" }, g);
  mk("path", { d: "M290 260 L320 238 L320 338 L290 360Z", class: "sc-face2" }, g);
  mk("path", { d: "M190 260 H290 V360 H190Z", class: "sc-face" }, g);
  P("M190 260 L220 238 L320 238 L290 260Z", "sc-thick");
  P("M290 260 L320 238 L320 338 L290 360Z", "sc-thick");
  P("M190 260 H290 V360 H190Z", "sc-thick");
  for (let i = 0; i < 8; i++) P(`M${294 + i * 3.4} ${262 - i * 2.4} V${356 - i * 2.4}`, "sc-faint");
  // construction around the cube
  L({ x1: 190, y1: 214, x2: 190, y2: 392 }, "sc-faint");
  L({ x1: 290, y1: 214, x2: 290, y2: 392 }, "sc-faint");
  L({ x1: 150, y1: 260, x2: 340, y2: 260 }, "sc-faint");
  P("M190 226 H290 M190 222 V230 M290 222 V230", "sc");
  mk("text", { x: 240, y: 218, "text-anchor": "middle", class: "sc-label" }, g).textContent = "1.000";

  // matte sphere
  mk("circle", { cx: 540, cy: 322, r: 50, class: "sc-face" }, g);
  P("M540 272 A50 50 0 1 1 539.9 272", "sc-thick");
  P("M490 322 A50 14 0 0 0 590 322", "sc");
  P("M540 272 A16 50 0 0 0 540 372", "sc-faint");
  for (let i = 0; i < 7; i++) P(`M${552 + i * 5} ${360 - i * 3} A50 50 0 0 0 ${586 - i * 1} ${336 - i * 6}`, "sc-faint");
  L({ x1: 470, y1: 272, x2: 610, y2: 272 }, "sc-faint");
  L({ x1: 590, y1: 250, x2: 590, y2: 392 }, "sc-faint");

  // glass sphere
  mk("circle", { cx: 410, cy: 360, r: 22, class: "sc-face" }, g);
  P("M410 338 A22 22 0 1 1 409.9 338", "sc-thick");
  P("M398 350 A10 10 0 0 1 408 344", "sc");

  // crosshairs at key points
  for (const [x, y] of [[190, 360], [320, 238], [540, 272], [410, 382], [610, 92]])
    P(`M${x - 6} ${y} H${x + 6} M${x} ${y - 6} V${y + 6}`, "sc");

  // light rays: sun → object → bounce to the floor
  const targets = [[300, 246], [522, 286], [416, 344]];
  const rays = targets.map(() => mk("path", { d: "", class: "sc-ray" }, g));

  const state = { x: 610, y: 92 };
  function apply() {
    sun.setAttribute("cx", state.x);
    sun.setAttribute("cy", state.y);
    targets.forEach(([tx, ty], i) => {
      const bx = tx + (tx - state.x) * 0.55;
      const by = Math.min(430, ty + (ty - state.y) * 0.45 + 40);
      rays[i].setAttribute("d", `M${state.x} ${state.y} L${tx} ${ty} L${bx} ${by}`);
    });
    shadows.forEach(({ obj: [ox, oy], e }) => {
      const dx = (ox - state.x) * 0.35;
      e.setAttribute("cx", ox + dx);
      e.setAttribute("rx", Math.abs(dx) * 0.35 + (ox === 410 ? 22 : 56));
    });
  }
  apply();

  if (!reduce) {
    const art = svg.closest(".ft__art");
    const cross = art.querySelectorAll(".ft__cross i");
    art.addEventListener("pointermove", (e) => {
      const r = svg.getBoundingClientRect();
      const ar = art.getBoundingClientRect();
      const u = gsap.utils.clamp(0, 1, (e.clientX - r.left) / r.width);
      gsap.to(state, { x: 120 + u * 600, y: 60 + Math.abs(u - 0.5) * 120, duration: 0.9, ease: "power3", overwrite: true, onUpdate: apply });
      gsap.set(cross[0], { y: e.clientY - ar.top });
      gsap.set(cross[1], { x: e.clientX - ar.left });
    });
  }
  return { lines, sun, rays };
}

/* ── isometric box with a light inside ── */

function iso(svg, reduce) {
  svg.replaceChildren();
  const cx = 130, cy = 150, s = 80, w = 69.3, h = 40;
  const A = [cx, cy - 2 * h], B = [cx + w, cy - h], C = [cx, cy], D = [cx - w, cy - h];
  const pt = (p) => p.join(" ");
  const down = (p) => [p[0], p[1] + s];

  const left = mk("g", {}, svg);
  mk("path", { d: `M${pt(D)} L${pt(C)} L${pt(down(C))} L${pt(down(D))}Z`, class: "iso-line" }, left);
  mk("text", { class: "iso-text", transform: `matrix(0.866 0.5 0 1 ${D[0]} ${D[1]})`, x: 14, y: 54 }, left).textContent = "LS";
  const right = mk("g", {}, svg);
  mk("path", { d: `M${pt(C)} L${pt(B)} L${pt(down(B))} L${pt(down(C))}Z`, class: "iso-line" }, right);
  const gearFace = mk("g", { transform: `matrix(0.866 -0.5 0 1 ${C[0]} ${C[1]})` }, right);
  const gear = mk("g", {}, gearFace);
  mk("circle", { cx: 40, cy: 40, r: 15, class: "iso-mark" }, gear);
  mk("circle", { cx: 40, cy: 40, r: 5, class: "iso-mark" }, gear);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    mk("line", { x1: 40 + Math.cos(a) * 15, y1: 40 + Math.sin(a) * 15, x2: 40 + Math.cos(a) * 23, y2: 40 + Math.sin(a) * 23, class: "iso-mark" }, gear);
  }

  // light inside the box, hidden until the lid lifts
  const glow = mk("ellipse", { cx: cx, cy: cy - h, rx: 26, ry: 15, class: "iso-sun" }, svg);

  const lid = mk("g", {}, svg);
  mk("path", { d: `M${pt(A)} L${pt(B)} L${pt(C)} L${pt(D)}Z`, class: "iso-line" }, lid);
  const flower = mk("g", { transform: `matrix(0.866 0.5 0.866 -0.5 ${D[0]} ${D[1]})` }, lid);
  for (let i = 0; i < 6; i++) mk("ellipse", { cx: 40, cy: 28, rx: 6, ry: 12, transform: `rotate(${i * 60} 40 40)`, class: "iso-mark" }, flower);
  mk("circle", { cx: 40, cy: 40, r: 4, class: "iso-mark" }, flower);

  gsap.set(glow, { scale: 0, transformOrigin: "50% 50%" });
  if (reduce) return { parts: [left, right, lid] };

  const open = gsap
    .timeline({ paused: true, defaults: { ease: "expo.out", duration: 0.8 } })
    .to(lid, { y: -48, x: -10, rotation: -9, transformOrigin: "0% 100%" }, 0)
    .to(glow, { scale: 1.25, y: -26, duration: 0.9, ease: "back.out(2.2)" }, 0.08)
    .to(gear, { rotation: 90, svgOrigin: "40 40", duration: 1.2 }, 0);
  svg.addEventListener("mouseenter", () => open.play());
  svg.addEventListener("mouseleave", () => open.reverse());
  gsap.to(svg, { y: -6, duration: 2.4, ease: "sine.inOut", yoyo: true, repeat: -1 });
  return { parts: [left, right, lid] };
}

/* ── giant outlined name with construction ticks ── */

function giant(wrap, reduce) {
  const el = wrap.querySelector(".giant");
  const guides = wrap.querySelector(".giant__guides");
  const split = SplitText.create(el, { type: "chars", charsClass: "gc" });
  const chars = split.chars;

  function fit() {
    el.style.fontSize = "100px";
    const a = chars[0].getBoundingClientRect();
    const b = chars.at(-1).getBoundingClientRect();
    const fs = (100 * wrap.clientWidth * 0.995) / (b.right - a.left);
    el.style.fontSize = `${fs}px`;
    wrap.style.setProperty("--gfs", `${fs}px`);
    // ticks at every letter edge, a dashed cap line
    guides.replaceChildren();
    const wr = wrap.getBoundingClientRect();
    const capY = chars[0].getBoundingClientRect().top - wr.top + fs * 0.2;
    mk("line", { x1: 0, y1: capY, x2: wr.width, y2: capY, class: "dash" }, guides);
    chars.forEach((c) => {
      const r = c.getBoundingClientRect();
      if (!c.textContent.trim()) return;
      for (const x of [r.left - wr.left, r.right - wr.left]) {
        mk("line", { x1: x, y1: capY - 14, x2: x, y2: capY + 14 }, guides);
        mk("line", { x1: x - 5, y1: capY, x2: x + 5, y2: capY }, guides);
      }
    });
  }
  fit();
  let last = innerWidth;
  addEventListener("resize", () => {
    if (Math.abs(innerWidth - last) < 20) return;
    last = innerWidth;
    fit();
  });

  if (reduce) return;
  gsap.from(chars, {
    yPercent: 100, duration: 1.3, ease: "expo.out", stagger: 0.04,
    scrollTrigger: { trigger: wrap, start: "top bottom" },
  });
  // letters near the cursor lift, lean and fill with sanguine ink
  const ys = chars.map((c) => gsap.quickTo(c, "y", { duration: 0.6, ease: "power3" }));
  const rs = chars.map((c) => gsap.quickTo(c, "rotation", { duration: 0.6, ease: "power3" }));
  const fs = chars.map((c) => gsap.quickTo(c, "--f", { duration: 0.5, ease: "power2" }));
  wrap.addEventListener("pointermove", (e) => {
    chars.forEach((c, i) => {
      const r = c.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const f = Math.max(0, 1 - Math.abs(dx) / 240);
      ys[i](-f * f * r.height * 0.16);
      rs[i](f * Math.sign(dx) * -6);
      fs[i](f * f);
    });
  });
  wrap.addEventListener("pointerleave", () => chars.forEach((_, i) => (ys[i](0), rs[i](0), fs[i](0))));
}

/* ── assemble ── */

export function createFooter(foot, { reduce, smoother }) {
  const sc = scene(foot.querySelector(".scene"), reduce);
  const box = iso(foot.querySelector(".iso"), reduce);
  giant(foot.querySelector(".ft__giant"), reduce);
  buttons(foot, reduce);
  foot.querySelectorAll(".cell a").forEach((a) => roll(a));

  // dashed guides only span the CTA + scene rows
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
  const copyLabel = copy.querySelector(".ft-btn__label");
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

  // build-in on scroll: guides drop, the scene is drawn, the box assembles
  gsap.from(guides.children, {
    scaleY: 0, duration: 1.4, ease: "expo.inOut", stagger: 0.1,
    scrollTrigger: { trigger: foot, start: "top 85%" },
  });
  const title = SplitText.create(foot.querySelector(".ft__title"), { type: "words,chars", mask: "words" });
  gsap.from(title.words, {
    yPercent: 110, duration: 1.1, ease: "expo.out", stagger: 0.05,
    scrollTrigger: { trigger: foot, start: "top 75%" },
  });
  gsap.timeline({ scrollTrigger: { trigger: foot.querySelector(".ft__art"), start: "top 80%" } })
    .from(sc.lines, { drawSVG: 0, duration: 1.4, ease: "power2.inOut", stagger: 0.012 })
    .from(foot.querySelectorAll(".sc-face, .sc-face2, .sc-shadow"), { opacity: 0, duration: 0.8 }, 0.6)
    .from(sc.sun, { scale: 0, transformOrigin: "50% 50%", duration: 1.1, ease: "back.out(1.8)" }, 0.9)
    .from(sc.rays, { drawSVG: 0, duration: 0.9, ease: "power2.inOut", stagger: 0.12 }, 1.3);
  gsap.from(box.parts, {
    y: 40, opacity: 0, duration: 0.9, ease: "back.out(1.6)", stagger: 0.12,
    scrollTrigger: { trigger: foot.querySelector(".ft__grid"), start: "top 85%" },
  });
  gsap.from(foot.querySelectorAll(".cell > *:not(svg)"), {
    y: 18, opacity: 0, duration: 0.8, ease: "expo.out", stagger: 0.03,
    scrollTrigger: { trigger: foot.querySelector(".ft__grid"), start: "top 85%" },
  });
}
