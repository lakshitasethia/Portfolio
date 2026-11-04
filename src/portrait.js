// Self-drawing portrait.
// 1. The pencil sketch draws itself: every connected line is revealed along
//    its own length, starting at the face and radiating outwards.
// 2. Watercolour washes bloom in, using the photo re-mapped to the site's
//    palette (indigo hair, sanguine shirt, warm skin), with darker rims.
// 3. The cursor paints the real photo colours on top, which dry back.
// The machine layer gets the same lines as white blueprint linework.

import gsap from "gsap";

const load = (src) =>
  new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });

// luminance → palette ramp
const RAMP = [
  [0.0, [31, 42, 85]],     // deep indigo
  [0.2, [43, 63, 124]],    // indigo
  [0.36, [110, 58, 70]],   // plum
  [0.5, [158, 69, 42]],    // sanguine
  [0.64, [201, 98, 74]],   // coral
  [0.78, [224, 151, 116]], // peach
  [0.9, [239, 201, 168]],  // light skin
  [1.0, [247, 239, 230]],  // paper
];
function ramp(t) {
  for (let i = 1; i < RAMP.length; i++) {
    if (t <= RAMP[i][0]) {
      const [t0, c0] = RAMP[i - 1];
      const [t1, c1] = RAMP[i];
      const k = (t - t0) / (t1 - t0);
      return [c0[0] + (c1[0] - c0[0]) * k, c0[1] + (c1[1] - c0[1]) * k, c0[2] + (c1[2] - c0[2]) * k];
    }
  }
  return RAMP.at(-1)[1];
}

function valueNoise(w, h, cell, seed = 1) {
  const gw = Math.ceil(w / cell) + 2;
  const gh = Math.ceil(h / cell) + 2;
  const g = new Float32Array(gw * gh);
  let s = seed;
  for (let i = 0; i < g.length; i++) {
    s = (s * 16807) % 2147483647;
    g[i] = s / 2147483647;
  }
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const fx = x / cell, fy = y / cell;
      const x0 = fx | 0, y0 = fy | 0;
      const tx = fx - x0, ty = fy - y0;
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const a = g[y0 * gw + x0], b = g[y0 * gw + x0 + 1];
      const c = g[(y0 + 1) * gw + x0], d = g[(y0 + 1) * gw + x0 + 1];
      out[y * w + x] = (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
    }
  return out;
}

export async function createPortrait(hero, { sketch: sketchSrc, photo: photoSrc }) {
  const wrap = hero.querySelector(".human .portrait");
  const hc = wrap.querySelector("canvas");
  const mc = hero.querySelector(".machine .portrait canvas");
  const [sk, ph] = await Promise.all([load(sketchSrc), load(photoSrc)]);

  const state = { draw: 0, washIntro: 0, washScroll: 1 };
  let W, H, scale, ctx;
  let linesCanvas, linesCtx, linesImg, bpCtx, bpImg, lineA, order, times, maxT, revealed;
  let ww, wh, washCanvas, washCtx, washImg, washRGB, washTh, person, grain;
  let photoCanvas, mask, tmp;

  const off = (w = W, h = H) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  };
  const pixels = (img, w, h, filter) => {
    const c = off(w, h);
    const x = c.getContext("2d", { willReadFrequently: true });
    if (filter) x.filter = filter;
    x.drawImage(img, 0, 0, w, h);
    return x.getImageData(0, 0, w, h).data;
  };

  /* ── 1. work out the order the pencil draws in ── */

  function buildLines() {
    const d = pixels(sk, W, H);
    const N = W * H;
    lineA = new Uint8ClampedArray(N);
    const isLine = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      const a = 255 - (d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11);
      lineA[i] = a;
      if (a > 30) isLine[i] = 1;
    }

    const fx = 0.6 * W, fy = 0.27 * H;
    const time = new Float32Array(N).fill(-1);
    const seen = new Uint8Array(N);
    const queue = new Int32Array(N);
    const depth = new Int32Array(N);
    const nb = [-1, 1, -W, W, -W - 1, -W + 1, W - 1, W + 1];
    const diag = Math.hypot(W, H);
    let count = 0;

    for (let start = 0; start < N; start++) {
      if (!isLine[start] || seen[start]) continue;
      // gather the component, and find the pixel closest to the face
      let qh = 0, qt = 0, seed = start, best = Infinity;
      queue[qt++] = start;
      seen[start] = 1;
      while (qh < qt) {
        const p = queue[qh++];
        const px = p % W, py = (p / W) | 0;
        const dd = (px - fx) ** 2 + (py - fy) ** 2;
        if (dd < best) (best = dd), (seed = p);
        for (const o of nb) {
          const q = p + o;
          if (q < 0 || q >= N || seen[q] || !isLine[q]) continue;
          if (Math.abs((q % W) - px) > 1) continue;
          seen[q] = 1;
          queue[qt++] = q;
        }
      }
      const comp = queue.slice(0, qt);
      // walk the component from its seed: that's the stroke direction
      const startT = Math.sqrt(best) * 1.1 + (Math.random() * 0.04 * diag);
      for (const p of comp) depth[p] = -1;
      qh = 0; qt = 0;
      queue[qt++] = seed;
      depth[seed] = 0;
      while (qh < qt) {
        const p = queue[qh++];
        const px = p % W;
        time[p] = startT + depth[p] * 1.6;
        for (const o of nb) {
          const q = p + o;
          if (q < 0 || q >= N || !isLine[q] || depth[q] !== -1) continue;
          if (Math.abs((q % W) - px) > 1) continue;
          depth[q] = depth[p] + 1;
          queue[qt++] = q;
        }
      }
      count += comp.length;
    }

    // bucket-sort the line pixels by time
    maxT = 0;
    for (let i = 0; i < N; i++) if (time[i] > maxT) maxT = time[i];
    const B = 4096;
    const counts = new Uint32Array(B + 1);
    for (let i = 0; i < N; i++) if (time[i] >= 0) counts[Math.min(B, ((time[i] / maxT) * B) | 0)]++;
    let acc = 0;
    for (let b = 0; b <= B; b++) {
      const c = counts[b];
      counts[b] = acc;
      acc += c;
    }
    order = new Uint32Array(count);
    for (let i = 0; i < N; i++) if (time[i] >= 0) order[counts[Math.min(B, ((time[i] / maxT) * B) | 0)]++] = i;
    times = time;
    revealed = 0;

    linesCanvas = off();
    linesCtx = linesCanvas.getContext("2d");
    linesImg = linesCtx.createImageData(W, H);
    bpCtx = mc.getContext("2d");
    bpImg = bpCtx.createImageData(W, H);
  }

  function reveal(p) {
    const target = p * maxT;
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    const L = linesImg.data, Bp = bpImg.data;
    const reset = target < (revealed ? times[order[revealed - 1]] : 0);
    if (reset) {
      L.fill(0);
      Bp.fill(0);
      revealed = 0;
      (x0 = 0), (y0 = 0), (x1 = W - 1), (y1 = H - 1);
    }
    while (revealed < order.length && times[order[revealed]] <= target) {
      const i = order[revealed++];
      const a = lineA[i];
      const k = i * 4;
      L[k] = 27; L[k + 1] = 21; L[k + 2] = 18; L[k + 3] = a;
      Bp[k] = 227; Bp[k + 1] = 235; Bp[k + 2] = 255; Bp[k + 3] = Math.min(255, a * 1.4);
      const x = i % W, y = (i / W) | 0;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    if (x1 >= 0) {
      linesCtx.putImageData(linesImg, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
      bpCtx.putImageData(bpImg, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
    }
  }

  /* ── 2. the watercolour wash ── */

  function buildWash() {
    ww = Math.round(W / 2);
    wh = Math.round(H / 2);
    const N = ww * wh;
    const ph3 = pixels(ph, ww, wh, "blur(1px)");
    const sk3 = pixels(sk, ww, wh);


    // where is the person? flood the background in from the top and sides,
    // stopping at (slightly thickened) pencil lines
    const wall = new Uint8Array(N);
    for (let i = 0; i < N; i++) if (255 - sk3[i * 4] > 24) wall[i] = 1;
    // close gaps in the outline: dilate the lines, flood the background in
    // from the top and sides, then grow the background back by the same amount
    const R = Math.max(3, Math.round(ww / 40));
    const dilate = (src, r) => {
      const h = new Uint8Array(N), out = new Uint8Array(N);
      for (let y = 0; y < wh; y++) {
        let run = 0;
        for (let x = -r; x < ww; x++) {
          if (x + r < ww && src[y * ww + x + r]) run++;
          if (x - r - 1 >= 0 && src[y * ww + x - r - 1]) run--;
          if (x >= 0) h[y * ww + x] = run > 0 ? 1 : 0;
        }
      }
      for (let x = 0; x < ww; x++) {
        let run = 0;
        for (let y = -r; y < wh; y++) {
          if (y + r < wh && h[(y + r) * ww + x]) run++;
          if (y - r - 1 >= 0 && h[(y - r - 1) * ww + x]) run--;
          if (y >= 0) out[y * ww + x] = run > 0 ? 1 : 0;
        }
      }
      return out;
    };
    const thick = dilate(wall, R);
    let bg = new Uint8Array(N);
    const q = new Int32Array(N);
    let qh = 0, qt = 0;
    const push = (i) => {
      if (!thick[i] && !bg[i]) (bg[i] = 1), (q[qt++] = i);
    };
    for (let x = 0; x < ww; x++) push(x);
    for (let y = 0; y < wh * 0.5; y++) push(y * ww), push(y * ww + ww - 1);
    while (qh < qt) {
      const i = q[qh++];
      const x = i % ww;
      if (x > 0) push(i - 1);
      if (x < ww - 1) push(i + 1);
      if (i >= ww) push(i - ww);
      if (i < N - ww) push(i + ww);
    }
    bg = dilate(bg, R);
    let bgCount = 0;
    for (let i = 0; i < N; i++) bgCount += bg[i];
    const usable = bgCount > N * 0.05 && bgCount < N * 0.85;
    person = new Float32Array(N);
    for (let i = 0; i < N; i++) person[i] = usable ? 1 - bg[i] : 1;
    // soften the edge
    for (let pass = 0; pass < 8; pass++) {
      const src = person.slice();
      for (let y = 1; y < wh - 1; y++)
        for (let x = 1; x < ww - 1; x++) {
          const i = y * ww + x;
          person[i] = (src[i] * 4 + src[i - 1] + src[i + 1] + src[i - ww] + src[i + ww]) / 8;
        }
    }

    // colour: photo luminance through the palette ramp, a little of the real hue kept
    washRGB = new Uint8ClampedArray(N * 3);
    for (let i = 0; i < N; i++) {
      const r = ph3[i * 4], g = ph3[i * 4 + 1], b = ph3[i * 4 + 2];
      const lum = Math.min(1, ((r * 0.3 + g * 0.59 + b * 0.11) / 255) * 0.9 + 0.16);
      const c = ramp(lum);
      washRGB[i * 3] = c[0] * 0.84 + r * 0.16;
      washRGB[i * 3 + 1] = c[1] * 0.84 + g * 0.16;
      washRGB[i * 3 + 2] = c[2] * 0.84 + b * 0.16;
    }

    // when each pixel gets wet: distance from a few drop points, roughened by noise
    const n1 = valueNoise(ww, wh, 22, 7);
    const n2 = valueNoise(ww, wh, 7, 13);
    grain = valueNoise(ww, wh, 5, 21);
    const seeds = [[0.6, 0.27], [0.52, 0.76], [0.3, 0.42], [0.84, 0.48], [0.75, 0.95], [0.15, 0.8]];
    washTh = new Float32Array(N);
    const aspect = wh / ww;
    for (let y = 0; y < wh; y++)
      for (let x = 0; x < ww; x++) {
        const u = x / ww, v = y / wh;
        let m = Infinity;
        for (const [sx, sy] of seeds) m = Math.min(m, Math.hypot(u - sx, (v - sy) * aspect));
        const i = y * ww + x;
        washTh[i] = (m / 0.75) * 0.72 + n1[i] * 0.22 + n2[i] * 0.08;
      }

    washCanvas = off(ww, wh);
    washCtx = washCanvas.getContext("2d");
    washImg = washCtx.createImageData(ww, wh);
  }

  function renderWash() {
    const p = state.washIntro * state.washScroll;
    const D = washImg.data;
    const pp = p * 1.2;
    for (let i = 0, n = ww * wh; i < n; i++) {
      const k = i * 4;
      const local = (pp - washTh[i]) / 0.08;
      if (local <= 0 || person[i] < 0.02) {
        D[k + 3] = 0;
        continue;
      }
      const a = local >= 1 ? 1 : local * local * (3 - 2 * local);
      // a darker rim right where the water is still spreading
      const rim = Math.max(0, 1 - Math.abs(local - 1.4) / 0.9) * 0.28;
      const shade = 1 - rim;
      D[k] = washRGB[i * 3] * shade;
      D[k + 1] = washRGB[i * 3 + 1] * shade;
      D[k + 2] = washRGB[i * 3 + 2] * shade;
      D[k + 3] = a * person[i] * (0.86 + 0.14 * grain[i]) * 200;
    }
    washCtx.putImageData(washImg, 0, 0);
  }

  /* ── compositing ── */

  function draw() {
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#efdccb";
    ctx.fillRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true;
    ctx.globalCompositeOperation = "multiply";
    ctx.drawImage(washCanvas, 0, 0, W, H);
    ctx.globalCompositeOperation = "source-over";
    const t = tmp.getContext("2d");
    t.globalCompositeOperation = "source-over";
    t.clearRect(0, 0, W, H);
    t.drawImage(photoCanvas, 0, 0);
    t.globalCompositeOperation = "destination-in";
    t.drawImage(mask, 0, 0);
    ctx.drawImage(tmp, 0, 0);
    ctx.globalCompositeOperation = "multiply";
    ctx.globalAlpha = 0.92;
    ctx.drawImage(linesCanvas, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  let dirty = true;
  const request = () => (dirty = true);
  gsap.ticker.add(() => {
    if (!dirty) return;
    dirty = false;
    draw();
  });

  function setup() {
    const r = hc.getBoundingClientRect();
    scale = Math.min(Math.min(devicePixelRatio, 2), 1000 / r.width);
    W = Math.max(2, Math.round(r.width * scale));
    H = Math.max(2, Math.round(r.height * scale));
    hc.width = mc.width = W;
    hc.height = mc.height = H;
    ctx = hc.getContext("2d");
    buildLines();
    buildWash();
    photoCanvas = off();
    const p = photoCanvas.getContext("2d");
    p.filter = "saturate(1.1) contrast(1.04)";
    p.drawImage(ph, 0, 0, W, H);
    mask = off();
    tmp = off();
    reveal(state.draw);
    renderWash();
    request();
  }

  /* ── 3. hover paints the real colours ── */

  const BRUSH = () => Math.max(W, H) * 0.06;
  let lastPaint = 0;
  let running = false;

  function dab(x, y, r) {
    const m = mask.getContext("2d");
    m.globalCompositeOperation = "source-over";
    for (let k = 0; k < 4; k++) {
      const ox = (Math.random() - 0.5) * r * 0.9;
      const oy = (Math.random() - 0.5) * r * 0.9;
      const rr = r * (0.45 + Math.random() * 0.6);
      const g = m.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rr);
      g.addColorStop(0, "rgba(0,0,0,0.5)");
      g.addColorStop(0.55, "rgba(0,0,0,0.32)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      m.fillStyle = g;
      m.beginPath();
      m.arc(x + ox, y + oy, rr, 0, Math.PI * 2);
      m.fill();
    }
  }
  function stroke(x0, y0, x1, y1, r = BRUSH()) {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (r * 0.3)));
    for (let i = 1; i <= n; i++) dab(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, r);
    touch();
  }
  function touch() {
    lastPaint = performance.now();
    if (!running) {
      running = true;
      gsap.ticker.add(dry);
    }
  }
  function dry() {
    const idle = performance.now() - lastPaint;
    if (idle > 1400) {
      const m = mask.getContext("2d");
      m.globalCompositeOperation = "destination-out";
      m.fillStyle = "rgba(0,0,0,0.014)";
      m.fillRect(0, 0, W, H);
    }
    if (idle > 9000) {
      mask.getContext("2d").clearRect(0, 0, W, H);
      running = false;
      gsap.ticker.remove(dry);
    }
    request();
  }

  let last = null;
  const local = (e) => {
    const r = hc.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H];
  };
  wrap.addEventListener("pointermove", (e) => {
    const p = local(e);
    if (last) stroke(last[0], last[1], p[0], p[1]);
    else dab(p[0], p[1], BRUSH()), touch();
    last = p;
  });
  wrap.addEventListener("pointerleave", () => (last = null));
  wrap.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "touch") last = local(e);
  });
  wrap.addEventListener("click", (e) => {
    const [x, y] = local(e);
    const o = { r: 0 };
    gsap.to(o, {
      r: Math.hypot(W, H), duration: 1.4, ease: "power2.out",
      onUpdate() {
        const m = mask.getContext("2d");
        m.globalCompositeOperation = "source-over";
        const g = m.createRadialGradient(x, y, o.r * 0.7, x, y, o.r + 1);
        g.addColorStop(0, "rgba(0,0,0,0.35)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        m.fillStyle = g;
        m.beginPath();
        m.arc(x, y, o.r + 1, 0, Math.PI * 2);
        m.fill();
        touch();
      },
    });
  });

  setup();
  let lastWidth = hc.getBoundingClientRect().width;
  new ResizeObserver(() => {
    const w = hc.getBoundingClientRect().width;
    if (Math.abs(w - lastWidth) > 4) {
      lastWidth = w;
      setup();
    }
  }).observe(wrap);

  return {
    wrap,
    // add the drawing + colouring to an intro timeline
    play(tl, at = 0) {
      tl.to(state, { draw: 1, duration: 3.4, ease: "power1.inOut", onUpdate: () => (reveal(state.draw), request()) }, at);
      tl.to(state, { washIntro: 1, duration: 2.6, ease: "power2.out", onUpdate: () => (renderWash(), request()) }, at + 2.6);
    },
    finish() {
      state.draw = 1;
      state.washIntro = 1;
      reveal(1);
      renderWash();
      request();
    },
    setScroll(v) {
      state.washScroll = v;
      renderWash();
      request();
    },
  };
}
