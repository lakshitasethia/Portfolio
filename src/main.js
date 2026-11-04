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
      smooth: 1.1,
      effects: true,
      smoothTouch: false,
    });
  }

  // Anything that splits or duplicates DOM must happen before the layers are cloned.
  SplitText.create(".hero .name .line", { type: "chars", charsClass: "ch" });
  SplitText.create(".about__text", { type: "lines", linesClass: "ln" });
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
    sketch: "/portrait-sketch.jpg",
    photo: "/portrait.jpg",
  });
  const pWrap = document.querySelector(".human .portrait");
  pWrap.addEventListener("pointerenter", (e) => e.pointerType !== "touch" && (lens.overPortrait = true));
  pWrap.addEventListener("pointerleave", () => (lens.overPortrait = false));

  setupLens();
  intro(art.parts, portrait);
  marquee();
  dive();
  about();
  workRail();
  caseStudies();
  toolkit();
  experience();
  footer();
  stamps();
  anchors();
  magnetic();

  import("./bloom.js").then(({ createBloom }) => createBloom(document.querySelector(".about"), bloomState));

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

  const ease = gsap.parseEase("power2.inOut");
  const k = reduce ? 1 : 0.18;

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
    const full = Math.hypot(innerWidth, innerHeight);

    for (const sec of sections) {
      const rect = sec.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > innerHeight) continue;
      let x = lens.x - rect.left;
      let y = lens.y - rect.top;
      let r = lensR;
      const over = lens.y > rect.top && lens.y < rect.bottom;
      if (over) ringOpacity = 1;
      const d = ease(sec._dive || 0);
      if (d > 0) {
        x += (innerWidth / 2 - rect.left - x) * d;
        y += (innerHeight / 2 - rect.top - y) * d;
        r += (full - r) * d;
        if (over) ringOpacity = 1 - Math.min(1, d * 3);
      }
      sec.style.setProperty("--x", `${x}px`);
      sec.style.setProperty("--y", `${y}px`);
      sec.style.setProperty("--r", `${r}px`);
    }

    const r = lensR + (26 - lensR) * lens.sup;
    ring.style.width = ring.style.height = `${r * 2}px`;
    ring.style.transform = `translate(${lens.x - r}px, ${lens.y - r}px)`;
    ring.style.opacity = lens.r < 2 ? 0 : ringOpacity;
    ring.classList.toggle("ring--brush", lens.sup > 0.5);
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
  const [hSeal, mSeal] = pair(hero, ".seal");
  const [hFoot, mFoot] = pair(hero, ".hero__foot > *");
  const tl = gsap.timeline({ defaults: { ease: "expo.out" }, paused: true });

  // 1. The world grows in from both edges.
  tl.from(P.stems, { drawSVG: 0, duration: 1.5, ease: "power2.inOut", stagger: by(0.1) }, 0)
    .from(P.lines, { drawSVG: 0, duration: 1.2, ease: "power2.inOut", stagger: by(0.01) }, 0.1)
    .from(P.cols, { scaleY: 0, transformOrigin: "50% 100%", duration: 1.3, stagger: by(0.07) }, 0.2)
    .from(P.leaves, { scale: 0, transformOrigin: "0% 50%", duration: 0.7, ease: "back.out(2)", stagger: by(0.006) }, 0.45)
    .from(P.nodes, { scale: 0, transformOrigin: "50% 50%", duration: 0.6, ease: "back.out(3)", stagger: by(0.012) }, 0.4)
    .from(P.blooms, { scale: 0, rotation: "-=120", transformOrigin: "50% 50%", duration: 1.2, ease: "back.out(1.5)", stagger: by(0.05) }, 0.8)
    .from(P.fxIn, { opacity: 0, scale: 0.5, transformOrigin: "50% 50%", duration: 0.9, stagger: by(0.04) }, 1.1);

  // 2. The pencil draws the portrait, then watercolour washes bloom in.
  portraitReady.then((p) => {
    p.play(tl, 0.4);
    tl.play();
  });

  // 3. The name rises, one line behind the portrait and one in front.
  const chars = { yPercent: 115, rotate: 6, duration: 1.2, stagger: 0.035 };
  tl.from(hChars, chars, 0.9).from(mChars, chars, 0.9);

  // 4. Tendril and arm reach in towards her...
  tl.from(P.reach, { drawSVG: 0, duration: 1.1, ease: "power3.inOut" }, 1.5)
    .from(P.joints, { scale: 0, transformOrigin: "50% 50%", duration: 0.4, ease: "back.out(3)", stagger: by(0.12) }, 1.7);

  // 5. ...and the finished painting gets signed.
  const seal = { scale: 3.4, rotate: -50, opacity: 0, duration: 0.3, ease: "power4.in" };
  tl.from(hSeal, seal, 3.6).from(mSeal, seal, 3.6);
  tl.to([hChars, mChars], { y: 6, duration: 0.06, ease: "power1.out", yoyo: true, repeat: 1 }, 3.9);

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
  ScrollTrigger.create({
    trigger: sec,
    start: "top bottom",
    end: "bottom top",
    onUpdate(self) {
      const boost = 1 + Math.min(8, Math.abs(self.getVelocity()) / 250);
      const dir = self.direction;
      [...loops, spin].forEach((l) => {
        gsap.to(l, {
          timeScale: dir * boost, duration: 0.15, overwrite: true,
          onComplete: () => gsap.to(l, { timeScale: dir, duration: 1.2, ease: "power2.out" }),
        });
      });
    },
  });
}

/* ── scroll into the machine ───────────────────────────── */

function dive() {
  const sec = document.querySelector(".statement");
  ScrollTrigger.create({
    trigger: sec,
    start: "top top",
    end: "+=120%",
    pin: true,
    onUpdate: (self) => {
      sec._dive = gsap.utils.clamp(0, 1, self.progress / 0.7);
    },
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
        scrub: 1,
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
    overlay.querySelector(".case__live").href = plate.dataset.live;
    overlay.querySelector(".case__repo").href = plate.dataset.repo;

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

/* ── experience rows ───────────────────────────────────── */

function experience() {
  const sec = document.querySelector(".exp");
  const [hr, mr] = pair(sec, ".exp__list li");
  if (!reduce) {
    const rows = { y: 40, opacity: 0, duration: 0.9, ease: "expo.out", stagger: 0.08 };
    const st = { trigger: sec, start: "top 70%" };
    gsap.from(hr, { ...rows, scrollTrigger: st });
    gsap.from(mr, { ...rows, scrollTrigger: { ...st } });
  }
  hr.forEach((li) => {
    const role = li.querySelector(".exp__role");
    const text = role.textContent;
    li.addEventListener("mouseenter", () => {
      if (!reduce) gsap.to(role, { duration: 0.6, scrambleText: { text, chars: "◇◆○●□■", speed: 0.6 } });
    });
  });
}

/* ── footer ────────────────────────────────────────────── */

function footer() {
  createFooter(document.querySelector(".footer"), { reduce, smoother });
  document.querySelectorAll(".bar a").forEach((a) => roll(a));
}

/* ── click anywhere to stamp the paper ─────────────────── */

function stamps() {
  const initials = document.body.dataset.initials || "";
  const placed = [];

  addEventListener("click", (e) => {
    if (e.target.closest("a, button, input, textarea, .case, .portrait")) return;
    const sec = e.target.closest("[data-lens]");
    if (!sec) return;
    const layer = sec.querySelector(".layer.human");
    const rect = layer.getBoundingClientRect();

    const el = document.createElement("div");
    el.className = "stamp";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = [...initials].map((c) => `<span>${c}</span>`).join("");
    el.style.left = `${e.clientX - rect.left}px`;
    el.style.top = `${e.clientY - rect.top}px`;
    layer.appendChild(el);
    placed.push(el);

    const rot = gsap.utils.random(-24, 24);
    if (reduce) gsap.set(el, { rotate: rot, opacity: 0.9 });
    else
      gsap.fromTo(el, { scale: 2.6, rotate: rot - 30, opacity: 0 }, { scale: 1, rotate: rot, opacity: 0.9, duration: 0.2, ease: "power4.in" });

    if (placed.length > 14) {
      const old = placed.shift();
      gsap.to(old, { opacity: 0, scale: 0.9, duration: 0.4, onComplete: () => old.remove() });
    }
  });
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
