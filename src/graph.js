// Desmos-style section: nine equations, each drawing one piece of a picture.
// Scrolling through the pinned section activates them one by one; the last
// step fills the picture in and reveals the line it was all building to.

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const NS = "http://www.w3.org/2000/svg";
const mk = (tag, attrs, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  parent.appendChild(e);
  return e;
};

// Plot window in maths units and in SVG pixels.
const X0 = -10, X1 = 10, Y0 = -6.4, Y1 = 6.4;
const W = 1000, H = 640;
const px = (x) => ((x - X0) / (X1 - X0)) * W;
const py = (y) => H - ((y - Y0) / (Y1 - Y0)) * H;

const TAU = Math.PI * 2;
const range = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
const polar = (cx, cy, rf, t0, t1, n = 600, k = 1) =>
  range(t0, t1, n).map((t) => {
    const r = rf(t) * k;
    return [cx + r * Math.cos(t), cy + r * Math.sin(t)];
  });

const STEM_Y0 = -4.6, STEM_Y1 = 1.4;
const stemX = (y) => 0.3 * Math.sin(1.1 * y);

// html: how the equation is written in the panel; note: its domain / centre.
const EQUATIONS = [
  {
    color: "#66785f", fill: false,
    html: "<i>y</i> = −4.6 + 0.2 sin(2<i>x</i>)",
    note: "the ground",
    pts: () => range(X0, X1, 400).map((x) => [x, -4.6 + 0.2 * Math.sin(2 * x)]),
  },
  {
    color: "#55664d", fill: false, width: 3,
    html: "<i>x</i> = 0.3 sin(1.1<i>y</i>)",
    note: "{ −4.6 ≤ <i>y</i> ≤ 1.4 }",
    pts: () => range(STEM_Y0, STEM_Y1, 200).map((y) => [stemX(y), y]),
  },
  {
    color: "#66785f", fill: "#8c9c7f",
    html: "<i>r</i> = 1.9 |sin 2<i>θ</i>|",
    note: "{ 0 ≤ <i>θ</i> ≤ π } · centred on the stem",
    pts: () => polar(stemX(-2.3), -2.3, (t) => 1.9 * Math.abs(Math.sin(2 * t)), 0, Math.PI, 500),
  },
  {
    color: "#9e452a", fill: "#e08d74",
    html: "<i>r</i> = 2.5 cos 5<i>θ</i>",
    note: "centred at (0, 2.7)",
    pts: () => polar(0, 2.7, (t) => 2.5 * Math.cos(5 * t), 0, Math.PI, 700),
  },
  {
    color: "#c9624a", fill: "#c9624a",
    html: "<i>r</i> = 1.5 sin 5<i>θ</i>",
    note: "centred at (0, 2.7)",
    pts: () => polar(0, 2.7, (t) => 1.5 * Math.sin(5 * t), 0, Math.PI, 600),
  },
  {
    color: "#b07a35", fill: "#cf9844",
    html: "<i>x</i><sup>2</sup> + (<i>y</i> − 2.7)<sup>2</sup> = 0.5<sup>2</sup>",
    note: "the centre",
    pts: () => polar(0, 2.7, () => 0.5, 0, TAU, 120),
  },
  {
    color: "#9e452a", fill: "#c9624a",
    html: "(<i>x</i> − 6.6)<sup>2</sup> + (<i>y</i> − 4)<sup>2</sup> = 1.1<sup>2</sup>",
    note: "the sun",
    pts: () => polar(6.6, 4, () => 1.1, 0, TAU, 160),
  },
  {
    color: "#cf9844", fill: false,
    html: "<i>r</i> = 1.6 + 0.22 cos 12<i>θ</i>",
    note: "centred at (6.6, 4)",
    pts: () => polar(6.6, 4, (t) => 1.6 + 0.22 * Math.cos(12 * t), 0, TAU, 600),
  },
  {
    color: "#3d3029", fill: "#c9b6a4",
    html: "<i>r</i> = <i>e</i><sup>sin <i>θ</i></sup> − 2 cos 4<i>θ</i> + sin<sup>5</sup>(<sup>2<i>θ</i> − π</sup>⁄<sub>24</sub>)",
    note: "Fay's butterfly, scaled by 0.42",
    pts: () =>
      polar(-6.2, 2.2, (t) => Math.exp(Math.sin(t)) - 2 * Math.cos(4 * t) + Math.sin((2 * t - Math.PI) / 24) ** 5, 0, 12 * Math.PI, 3000, 0.42),
  },
];

function drawGrid(svg) {
  const g = mk("g", { class: "plot__grid" }, svg);
  for (let x = Math.ceil(X0); x <= X1; x++) mk("line", { x1: px(x), y1: 0, x2: px(x), y2: H, class: x % 5 ? "minor" : "major" }, g);
  for (let y = Math.ceil(Y0); y <= Y1; y++) mk("line", { x1: 0, y1: py(y), x2: W, y2: py(y), class: y % 5 ? "minor" : "major" }, g);
  mk("line", { x1: 0, y1: py(0), x2: W, y2: py(0), class: "axis" }, g);
  mk("line", { x1: px(0), y1: 0, x2: px(0), y2: H, class: "axis" }, g);
  for (let x = -8; x <= 8; x += 2) if (x) mk("text", { x: px(x), y: py(0) + 16, "text-anchor": "middle", class: "tick" }, g).textContent = x;
  for (let y = -6; y <= 6; y += 2) if (y) mk("text", { x: px(0) - 8, y: py(y) + 4, "text-anchor": "end", class: "tick" }, g).textContent = y;
}

export function createGraph(section, { reduce }) {
  const svg = section.querySelector(".plot");
  const list = section.querySelector(".eqs");
  const caption = section.querySelector(".graph__caption");
  drawGrid(svg);

  const curves = mk("g", {}, svg);
  const items = EQUATIONS.map((eq, i) => {
    const pts = eq.pts();
    const d = "M" + pts.map(([x, y]) => `${px(x).toFixed(1)} ${py(y).toFixed(1)}`).join("L");
    const fill = eq.fill ? mk("path", { d, class: "curve-fill", fill: eq.fill, "fill-rule": "nonzero" }, curves) : null;
    const path = mk("path", { d, class: "curve", stroke: eq.color, "stroke-width": eq.width || 2.2 }, curves);

    const li = document.createElement("li");
    li.className = "eq";
    li.style.setProperty("--c", eq.color);
    li.innerHTML = `<span class="eq__n">${i + 1}</span><span class="eq__dot"></span><span class="eq__body"><span class="eq__tex">${eq.html}</span><span class="eq__note">${eq.note}</span></span>`;
    list.appendChild(li);
    return { path, fill, li };
  });
  const pen = mk("circle", { r: 6, class: "pen" }, svg);

  // Desmos-style coordinate readout under the cursor
  const xy = section.querySelector(".graph__xy");
  const plot = section.querySelector(".graph__plot");
  plot.addEventListener("pointermove", (e) => {
    const r = svg.getBoundingClientRect();
    const x = X0 + ((e.clientX - r.left) / r.width) * (X1 - X0);
    const y = Y1 - ((e.clientY - r.top) / r.height) * (Y1 - Y0);
    xy.textContent = `(${x.toFixed(2)}, ${y.toFixed(2)})`;
    xy.style.transform = `translate(${e.clientX - plot.getBoundingClientRect().left + 14}px, ${e.clientY - plot.getBoundingClientRect().top + 14}px)`;
    xy.style.opacity = 1;
  });
  plot.addEventListener("pointerleave", () => (xy.style.opacity = 0));

  const setCurrent = (k) => items.forEach((it, i) => it.li.classList.toggle("is-current", i === k));

  if (reduce) {
    items.forEach((it) => {
      it.li.classList.add("is-on");
      if (it.fill) it.fill.style.opacity = 0.55;
    });
    gsap.set(pen, { opacity: 0 });
    return;
  }

  gsap.set(items.map((it) => it.path), { drawSVG: 0 });
  gsap.set(caption, { opacity: 0, y: 30 });
  gsap.set(pen, { opacity: 0 });

  const n = items.length;
  const tl = gsap.timeline({
    defaults: { ease: "none" },
    onUpdate() {
      const t = tl.time();
      items.forEach((it, i) => it.li.classList.toggle("is-on", t >= i));
      setCurrent(t < n ? Math.floor(t) : -1);
    },
  });
  items.forEach((it, i) => {
    const len = it.path.getTotalLength();
    const proxy = { t: 0 };
    tl.fromTo(it.li, { opacity: 0.3, x: -10 }, { opacity: 1, x: 0, duration: 0.25, ease: "power2.out" }, i)
      .to(it.path, { drawSVG: "100%", duration: 0.85, ease: "power1.inOut" }, i + 0.1)
      .to(proxy, {
        t: 1, duration: 0.85, ease: "power1.inOut",
        onUpdate() {
          const p = it.path.getPointAtLength(len * proxy.t);
          pen.setAttribute("cx", p.x);
          pen.setAttribute("cy", p.y);
          pen.setAttribute("fill", EQUATIONS[i].color);
        },
      }, i + 0.1);
  });
  tl.to(pen, { opacity: 1, duration: 0.1 }, 0.1)
    .to(pen, { opacity: 0, duration: 0.2 }, n)
    .to(items.filter((it) => it.fill).map((it) => it.fill), { opacity: 0.55, duration: 0.6, stagger: 0.04, ease: "power2.out" }, n)
    .to(caption, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, n + 0.3)
    .to({}, { duration: 0.4 });

  ScrollTrigger.create({
    trigger: section,
    start: "top top",
    end: () => `+=${innerHeight * 4.2}`,
    pin: true,
    scrub: 0.8,
    animation: tl,
  });
}
