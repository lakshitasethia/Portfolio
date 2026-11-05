import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { SplitText } from "gsap/SplitText";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { Flip } from "gsap/Flip";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { createHeroArt } from "./illo.js";
import { createFooter, roll } from "./footer.js";
import { createPortrait } from "./portrait.js";
import { createToolkit } from "./toolkit.js";
import { createGraph } from "./graph.js";

gsap.registerPlugin(
  ScrollTrigger, ScrollSmoother, SplitText, DrawSVGPlugin, Flip,
  Draggable, InertiaPlugin, ScrambleTextPlugin, MorphSVGPlugin
);

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const coarse = matchMedia("(pointer: coarse)").matches;
if (reduce) document.documentElement.classList.add("reduce");

const LENS_R = coarse ? 96 : 130;
const lens = { x: innerWidth * 0.62, y: innerHeight * 0.45, tx: 0, ty: 0, r: 0, touched: false, last: 0, sup: 0, overPortrait: false };
lens.tx = lens.x;
lens.ty = lens.y;

let smoother = null;
const bloomState = { open: 0.02, spin: 0, mx: 0, my: 0 };

document.fonts.ready.then(init);

function init() {
  if (!reduce) {
    smoother = ScrollSmoother.create({
      wrapper: "#smooth-wrapper",
      content: "#smooth-content",
      // Lower smoothing = less input lag. 1.1s felt floaty on slower machines.
      smooth: 0.7,
      effects: true,
      smoothTouch: false,
    });
  }

  // Anything that splits or duplicates DOM must happen before the layers are cloned.
  // The h1 already carries the full name as its label, and the about paragraphs
  // read fine as plain text, so SplitText shouldn't add aria-labels of its own.
  SplitText.create(".hero .name .line", { type: "chars", charsClass: "ch", aria: "none" });
  SplitText.create(".about__text p", { type: "lines", linesClass: "ln", aria: "none" });
  document.querySelectorAll(".marquee__track").forEach((t) => (t.innerHTML += t.innerHTML));

  document.querySelectorAll("[data-lens]").forEach((sec) => {
    const human = sec.querySelector(".layer.human");
    const machine = human.cloneNode(true);
    machine.classList.replace("human", "machine");
    machine.setAttribute("aria-hidden", "true");
    machine.inert = true;
    machine.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
    sec.appendChild(machine);
  });

  measure();
  const art = createHeroArt(document.querySelector(".hero"));
  art.build();

  const portrait = createPortrait(document.querySelector(".hero"), {
    sketch: "/portrait-sketch.webp",
    photo: "/portrait.webp",
  });
  const pWrap = document.querySelector(".human .portrait");
  pWrap.addEventListener("pointerenter", (e) => e.pointerType !== "touch" && (lens.overPortrait = true));
  pWrap.addEventListener("pointerleave", () => (lens.overPortrait = false));

  setupLens();
  intro(art.parts, portrait);
  marquee();
  createGraph(document.querySelector(".graph"), { reduce });
  about();
  workRail();
  caseStudies();
  toolkit();
  footer();
  anchors();
  magnetic();

  // Content can change height after first layout (fonts, images, the canvas
  // portrait, fitted type). Re-measure so the smooth scroller always reaches
  // the very bottom of the footer.
  const content = document.querySelector("#smooth-content") || document.body;
  let lastH = content.offsetHeight;
  new ResizeObserver(debounce(() => {
    const h = content.offsetHeight;
    if (Math.abs(h - lastH) > 2) {
      lastH = h;
      ScrollTrigger.refresh();
      lastH = content.offsetHeight;
    }
  }, 250)).observe(content);
  addEventListener("load", () => ScrollTrigger.refresh());

  // Project screenshots: fetched only as the Projects section approaches, so
  // they never compete with the fonts and the hero on first load. (Native
  // lazy-loading still pulled them in during the initial page load.)
  const shotIO = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    shotIO.disconnect();
    document.querySelectorAll(".shot img[data-src]").forEach((img) => {
      img.sizes = img.dataset.sizes;
      img.srcset = img.dataset.srcset;
      img.src = img.dataset.src;
    });
  }, { rootMargin: "200% 0px" });
  shotIO.observe(document.querySelector(".work"));

  // three.js is the heaviest thing on the page: only fetch it as the About
  // section gets close, so it never competes with the first paint.
  //    It also gets built in idle time once the intro is over, so the setup
  //    (and shader compile) doesn't land in the middle of someone scrolling.
  const aboutSec = document.querySelector(".about");
  let bloomStarted = false;
  const loadBloom = () => {
    if (bloomStarted) return;
    bloomStarted = true;
    bloomIO.disconnect();
    import("./bloom.js").then(({ createBloom }) => createBloom(aboutSec, bloomState));
  };
  const bloomIO = new IntersectionObserver(([e]) => e.isIntersecting && loadBloom(), { rootMargin: "150% 0px" });
  bloomIO.observe(aboutSec);
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 200));
  setTimeout(() => idle(loadBloom, { timeout: 3000 }), reduce ? 500 : 6500);

  let lastW = innerWidth;
  addEventListener("resize", debounce(() => {
    measure();
    if (Math.abs(innerWidth - lastW) > 40) {
      lastW = innerWidth;
      art.build();
      ScrollTrigger.refresh();
    }
  }, 200));
}

/* ── helpers ───────────────────────────────────────────── */

function pair(scope, sel) {
  return [scope.querySelectorAll(`.human ${sel}`), scope.querySelectorAll(`.machine ${sel}`)];
}

function debounce(fn, ms) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}

function measure() {
  document.querySelectorAll("[data-lens]").forEach((sec) => {
    const [h, m] = pair(sec, "[data-spec]");
    h.forEach((el, i) => {
      const { width, height } = el.getBoundingClientRect();
      const fs = parseFloat(getComputedStyle(el).fontSize);
      m[i].dataset.measure = `${el.dataset.spec} · ${Math.round(width)}×${Math.round(height)} · ${Math.round(fs)}px`;
    });
  });
}

/* ── the lens ──────────────────────────────────────────── */

function setupLens() {
  const ring = document.querySelector(".ring");
  const sections = [...document.querySelectorAll("[data-lens]")];

  const move = (x, y) => {
    lens.tx = x;
    lens.ty = y;
    lens.touched = true;
    lens.last = performance.now();
    bloomState.mx = x / innerWidth - 0.5;
    bloomState.my = y / innerHeight - 0.5;
  };
  addEventListener("pointermove", (e) => move(e.clientX, e.clientY), { passive: true });
  addEventListener("touchmove", (e) => move(e.touches[0].clientX, e.touches[0].clientY), { passive: true });

  const k = reduce ? 1 : 0.18;

  // Performance notes for this loop, which runs every frame:
  // - The clip is written straight onto the machine layer. Writing CSS custom
  //   properties on the section made the browser restyle every element in it,
  //   both copies, on every frame.
  // - All rects are read before anything is written, so there is at most one
  //   layout per frame instead of one per section.
  // - A machine layer the lens isn't touching is hidden, so it isn't painted.
  // - Sections off screen are skipped without measuring them.
  const worlds = sections.map((sec) => ({
    sec, layer: sec.querySelector(".layer.machine"), clip: "", shown: false, onscreen: false,
  }));
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) worlds.find((w) => w.sec === e.target).onscreen = e.isIntersecting;
  });
  worlds.forEach((w) => io.observe(w.sec));
  const ringSize = { r: -1, tx: "", op: "", brush: null };

  gsap.ticker.add((time) => {
    const idle = !lens.touched || (coarse && performance.now() - lens.last > 2500);
    if (idle && !reduce) {
      const s = time * 0.35;
      lens.tx = innerWidth * (0.55 + 0.28 * Math.sin(s));
      lens.ty = innerHeight * (0.48 + 0.22 * Math.sin(s * 1.37));
    }
    lens.x += (lens.tx - lens.x) * k;
    lens.y += (lens.ty - lens.y) * k;
    // Over the portrait the lens turns into a paintbrush.
    lens.sup += ((lens.overPortrait ? 1 : 0) - lens.sup) * 0.15;
    const lensR = lens.r * (1 - lens.sup);

    let ringOpacity = 0;

    // read
    for (const w of worlds) {
      w.next = null;
      if (!w.onscreen || lensR < 0.5) continue;
      const rect = w.sec.getBoundingClientRect();
      const x = lens.x - rect.left;
      const y = lens.y - rect.top;
      if (lens.y > rect.top && lens.y < rect.bottom) ringOpacity = 1;
      const hit = x + lensR > 0 && x - lensR < rect.width && y + lensR > 0 && y - lensR < rect.height;
      if (hit) w.next = `circle(${lensR.toFixed(1)}px at ${x.toFixed(1)}px ${y.toFixed(1)}px)`;
    }

    // write
    for (const w of worlds) {
      const show = w.next !== null;
      if (show !== w.shown) {
        w.shown = show;
        w.sec._lensOn = show;
        w.layer.style.visibility = show ? "visible" : "hidden";
      }
      if (show && w.next !== w.clip) w.layer.style.clipPath = w.clip = w.next;
    }

    const r = Math.round(lensR + (26 - lensR) * lens.sup);
    if (r !== ringSize.r) ring.style.width = ring.style.height = `${r * 2}px`;
    ringSize.r = r;
    const tx = `translate3d(${(lens.x - r).toFixed(1)}px, ${(lens.y - r).toFixed(1)}px, 0)`;
    if (tx !== ringSize.tx) ring.style.transform = ringSize.tx = tx;
    const op = String(lens.r < 2 ? 0 : ringOpacity);
    if (op !== ringSize.op) ring.style.opacity = ringSize.op = op;
    const brush = lens.sup > 0.5;
    if (brush !== ringSize.brush) ring.classList.toggle("ring--brush", (ringSize.brush = brush));
  });

  addEventListener("pointerdown", () => gsap.to(lens, { r: LENS_R * 0.7, duration: 0.25, ease: "power3.out", overwrite: true }));
  addEventListener("pointerup", () => gsap.to(lens, { r: LENS_R, duration: 0.6, ease: "elastic.out(1, 0.4)", overwrite: true }));
}

/* ── page load ─────────────────────────────────────────── */

function intro(P, portraitReady) {
  const hero = document.querySelector(".hero");
  // Colour drains back to pencil as you scroll away, and paints back in on return.
  portraitReady.then((p) =>
    ScrollTrigger.create({
      trigger: hero, start: "top top", end: "bottom top",
      onUpdate: (self) => p.setScroll(1 - self.progress),
    })
  );
  if (reduce) {
    lens.r = LENS_R;
    portraitReady.then((p) => p.finish());
    return;
  }
  const by = (n) => (i) => (i >> 1) * n;
  const [hChars, mChars] = pair(hero, ".ch");
  const [hFoot, mFoot] = pair(hero, ".hero__foot > *");
  const tl = gsap.timeline({ defaults: { ease: "expo.out" } });

  // 1. The world grows in from both edges.
  tl.from(P.stems, { drawSVG: 0, duration: 1.5, ease: "power2.inOut", stagger: by(0.1) }, 0)
    .from(P.lines, { drawSVG: 0, duration: 1.2, ease: "power2.inOut", stagger: by(0.01) }, 0.1)
    .from(P.cols, { scaleY: 0, transformOrigin: "50% 100%", duration: 1.3, stagger: by(0.07) }, 0.2)
    .from(P.leaves, { scale: 0, transformOrigin: "0% 50%", duration: 0.7, ease: "back.out(2)", stagger: by(0.006) }, 0.45)
    .from(P.nodes, { scale: 0, transformOrigin: "50% 50%", duration: 0.6, ease: "back.out(3)", stagger: by(0.012) }, 0.4)
    .from(P.blooms, { scale: 0, rotation: "-=120", transformOrigin: "50% 50%", duration: 1.2, ease: "back.out(1.5)", stagger: by(0.05) }, 0.8)
    .from(P.fxIn, { opacity: 0, scale: 0.5, transformOrigin: "50% 50%", duration: 0.9, stagger: by(0.04) }, 1.1);

  // 2. The pencil draws the portrait, then watercolour washes bloom in.
  //    The rest of the intro doesn't wait for the photos: on a slow connection
  //    the name still rises straight away and the drawing starts on arrival.
  portraitReady.then((p) => {
    if (tl.isActive()) p.play(tl, Math.max(0.4, tl.time()));
    else p.play(gsap.timeline(), 0); // intro already over: draw on its own
  });

  // 3. The name rises, one line behind the portrait and one in front.
  //    (Started early: the name is the largest thing on screen, so it's what
  //    Lighthouse times as the page's main content arriving.)
  const chars = { yPercent: 115, rotate: 6, duration: 1.1, stagger: 0.03 };
  tl.from(hChars, chars, 0.3).from(mChars, chars, 0.3);

  // 4. Tendril and arm reach in towards her...
  tl.from(P.reach, { drawSVG: 0, duration: 1.1, ease: "power3.inOut" }, 1.5)
    .from(P.joints, { scale: 0, transformOrigin: "50% 50%", duration: 0.4, ease: "back.out(3)", stagger: by(0.12) }, 1.7);


  const foot = { y: 20, opacity: 0, duration: 1, stagger: 0.1 };
  tl.from(hFoot, foot, 3.4).from(mFoot, foot, 3.4);
  tl.to(lens, { r: LENS_R, duration: 1.1, ease: "elastic.out(1, 0.45)" }, 5.2);

}

/* ── velocity marquee ──────────────────────────────────── */

function marquee() {
  const sec = document.querySelector(".marquee");
  const [hT, mT] = pair(sec, ".marquee__track");
  const loops = [...hT].map((t, i) => {
    const targets = [t, mT[i]];
    const tw = i
      ? gsap.fromTo(targets, { xPercent: -50 }, { xPercent: 0, duration: 32, ease: "none", repeat: -1 })
      : gsap.fromTo(targets, { xPercent: 0 }, { xPercent: -50, duration: 28, ease: "none", repeat: -1 });
    tw.totalTime(tw.duration() * 50); // lets the loop run backwards forever
    return tw;
  });
  const icons = sec.querySelectorAll(".flor, .gear");
  const spin = gsap.to(icons, { rotation: 360, duration: 8, ease: "none", repeat: -1 });
  spin.totalTime(spin.duration() * 50);
  if (reduce) {
    loops.forEach((l) => l.pause());
    spin.pause();
    return;
  }
  // Scrolling speeds the loops up (and reverses them when scrolling up). One
  // value eased on the ticker, instead of new tweens on every scroll event.
  const all = [...loops, spin];
  let dir = 1, target = 1, speed = 1, on = false;
  const st = ScrollTrigger.create({
    trigger: sec,
    start: "top bottom",
    end: "bottom top",
    onToggle: (self) => (on = self.isActive),
    onUpdate(self) {
      dir = self.direction;
      target = dir * (1 + Math.min(8, Math.abs(self.getVelocity()) / 250));
    },
  });
  on = st.isActive;
  gsap.ticker.add(() => {
    if (!on) return;
    target += (dir - target) * 0.04;
    speed += (target - speed) * 0.2;
    for (const l of all) l.timeScale(speed);
  });
  // keep the loops idle while off screen
  ScrollTrigger.create({
    trigger: sec, start: "top bottom", end: "bottom top",
    onToggle: (self) => all.forEach((l) => l.paused(!self.isActive)),
  });
}

/* ── about: 3D bloom opens as you scroll ───────────────── */

function about() {
  const sec = document.querySelector(".about");
  const [hl, ml] = pair(sec, ".ln");
  const [hn, mn] = pair(sec, ".about__now > div");
  const [ht, mt] = pair(sec, ".about__title");
  const mm = gsap.matchMedia();
  mm.add({ desk: "(min-width: 761px)", mob: "(max-width: 760px)" }, (c) => {
    const desk = c.conditions.desk;
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sec,
        start: desk ? "top top" : "top 75%",
        end: desk ? "+=110%" : "bottom 30%",
        pin: desk,
        scrub: 0.4,
      },
    });
    tl.fromTo(bloomState, { open: 0.02 }, { open: 1, duration: 1, ease: "power1.inOut" }, 0)
      .fromTo(bloomState, { spin: 0 }, { spin: Math.PI * 0.8, duration: 1, ease: "none" }, 0);
    if (!reduce) {
      const title = { yPercent: 40, opacity: 0, duration: 0.2 };
      tl.from(ht, title, 0).from(mt, title, 0);
      const line = { opacity: 0.12, duration: 0.18, stagger: 0.07 };
      tl.from(hl, line, 0.1).from(ml, line, 0.1);
      const now = { y: 24, opacity: 0, duration: 0.2, stagger: 0.05 };
      tl.from(hn, now, 0.55).from(mn, now, 0.55);
    }
  });
}

/* ── horizontal work rail ──────────────────────────────── */

function workRail() {
  if (reduce) return;
  const sec = document.querySelector(".work");
  const tracks = sec.querySelectorAll(".track");
  const plates = sec.querySelectorAll(".plate");
  const dist = () => tracks[0].scrollWidth - innerWidth;
  const skew = gsap.quickTo(plates, "skewX", { duration: 0.5, ease: "power3" });

  gsap.to(tracks, {
    x: () => -dist(),
    ease: "none",
    scrollTrigger: {
      trigger: sec,
      start: "top top",
      end: () => `+=${dist()}`,
      pin: true,
      scrub: 0.6,
      invalidateOnRefresh: true,
      onUpdate: (self) => skew(gsap.utils.clamp(-12, 12, self.getVelocity() / -250)),
    },
  });
  ScrollTrigger.addEventListener("scrollEnd", () => skew(0));
}

/* ── case study: Flip the plate into a full-screen view ── */

function caseStudies() {
  const overlay = document.querySelector(".case");
  const media = overlay.querySelector(".case__media");
  const body = overlay.querySelector(".case__body");
  const titleEl = overlay.querySelector(".case__title");
  const closeBtn = overlay.querySelector(".case__close");
  let active = null;

  document.querySelectorAll(".human .plate").forEach((plate) => {
    const btn = plate.querySelector(".plate__open");
    btn.addEventListener("click", () => open(plate, btn));
  });

  function open(plate, btn) {
    if (active) return;
    const [title, meta, text, facts] = plate.dataset.case.split("|");
    overlay.querySelector(".case__meta").textContent = meta;
    overlay.querySelector(".case__text").textContent = text;
    overlay.querySelector(".case__facts").innerHTML = facts
      .split(";")
      .map((f) => f.split(":"))
      .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`)
      .join("");
    titleEl.textContent = title;
    for (const [sel, url] of [[".case__live", plate.dataset.live], [".case__repo", plate.dataset.repo]]) {
      const a = overlay.querySelector(sel);
      a.hidden = !url;
      if (url) a.href = url;
    }

    const fig = btn.querySelector(".art");
    btn.style.height = `${btn.offsetHeight}px`;
    const state = Flip.getState(fig);
    overlay.hidden = false;
    media.appendChild(fig);
    active = { fig, btn };
    smoother?.paused(true);

    gsap.fromTo(overlay, { backgroundColor: "rgba(247,239,230,0)" }, { backgroundColor: "rgba(247,239,230,1)", duration: 0.5 });
    gsap.fromTo(media, { backgroundColor: "rgba(232,213,193,0)" }, { backgroundColor: "rgba(232,213,193,1)", duration: 0.6 });
    Flip.from(state, { duration: reduce ? 0 : 0.9, ease: "expo.inOut", absolute: true });
    gsap.fromTo(body.children, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, stagger: 0.06, delay: 0.35, ease: "expo.out" });
    if (!reduce) gsap.to(titleEl, { duration: 1.1, delay: 0.35, scrambleText: { text: title, chars: "lowerCase", speed: 0.5 } });
    closeBtn.focus({ preventScroll: true });
  }

  function close() {
    if (!active) return;
    const { fig, btn } = active;
    const state = Flip.getState(fig);
    btn.appendChild(fig);
    btn.style.height = "";
    gsap.to(body.children, { opacity: 0, duration: 0.2 });
    gsap.to([overlay, media], { backgroundColor: "rgba(0,0,0,0)", duration: 0.3, onComplete: () => (overlay.hidden = true) });
    Flip.from(state, {
      duration: reduce ? 0 : 0.8, ease: "expo.inOut", absolute: true,
      onComplete: () => {
        active = null;
        smoother?.paused(false);
        btn.focus({ preventScroll: true });
      },
    });
  }

  closeBtn.addEventListener("click", close);
  // keep focus inside the dialog while it is open
  overlay.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    const f = [...overlay.querySelectorAll("a[href], button")];
    if (e.shiftKey && document.activeElement === f[0]) (e.preventDefault(), f.at(-1).focus());
    else if (!e.shiftKey && document.activeElement === f.at(-1)) (e.preventDefault(), f[0].focus());
  });
  addEventListener("keydown", (e) => e.key === "Escape" && close());
}

/* ── toolkit: stickers on strings that form figures ──── */

function toolkit() {
  const pit = document.querySelector(".toolkit__pit");
  const tk = createToolkit(pit, { reduce });
  if (reduce) tk.instant();
  else ScrollTrigger.create({ trigger: pit, start: "top 75%", once: true, onEnter: () => tk.enter() });
  let lastW = innerWidth;
  addEventListener("resize", debounce(() => {
    if (Math.abs(innerWidth - lastW) > 40) {
      lastW = innerWidth;
      tk.resize();
    }
  }, 250));
}

/* ── footer ────────────────────────────────────────────── */

function footer() {
  createFooter(document.querySelector(".footer"), { reduce, smoother });
  document.querySelectorAll(".bar a").forEach((a) => roll(a));
}

/* ── in-page links go through the smoother ─────────────── */

function anchors() {
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    const id = a.getAttribute("href");
    if (id.length < 2) return;
    a.addEventListener("click", (e) => {
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      if (smoother) smoother.scrollTo(target, true, "top top");
      else target.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
    });
  });
}

function magnetic() {
  if (reduce || coarse) return;
  document.querySelectorAll(".magnetic").forEach((el) => {
    const x = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3" });
    const y = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3" });
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      x((e.clientX - r.left - r.width / 2) * 0.4);
      y((e.clientY - r.top - r.height / 2) * 0.4);
    });
    el.addEventListener("pointerleave", () => {
      x(0);
      y(0);
    });
  });
}
