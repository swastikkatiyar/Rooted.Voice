import {layout3d} from './layout3d.js';

function css(name, fallback) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function hexToRgb(hex) {
  const h = hex.replace('#', '').trim();
  if (h.length === 3) return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)];
  if (h.length >= 6) return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  return [99, 121, 109];
}

function mix(hex, t, toward = '#ffffff') {
  const a = hexToRgb(hex), b = hexToRgb(toward);
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

export function mountNetwork3D(container, {nodes, links, onSelect}) {
  const canvas = document.createElement('canvas');
  canvas.className = 'network-canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', '3D practice network. Drag to rotate, scroll to zoom, click a node to open it.');
  container.insertBefore(canvas, container.firstChild);
  const ctx = canvas.getContext('2d');
  const pos = layout3d(nodes, links);
  const cam = {yaw: 0.55, pitch: 0.32, dist: 720, targetYaw: 0.55, targetPitch: 0.32, targetDist: 720};
  let auto = true;
  let dragging = false;
  let lastX = 0, lastY = 0;
  let vYaw = 0, vPitch = 0;
  let moved = 0;
  let hover = null;
  let raf = 0;
  let running = true;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) auto = false;

  const sizeOf = n => n.type === 'category' ? 16 : n.type === 'topic' ? (n.used ? 9 : 7) : 5.5;

  function resize() {
    const r = container.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, r.width * dpr);
    canvas.height = Math.max(1, r.height * dpr);
    canvas.style.width = r.width + 'px';
    canvas.style.height = r.height + 'px';
  }

  function project(p) {
    const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
    const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    let x = p.x, y = p.y, z = p.z;
    const x1 = x * cy + z * sy;
    const z1 = -x * sy + z * cy;
    const y2 = y * cp - z1 * sp;
    const z2 = y * sp + z1 * cp;
    const depth = z2 + cam.dist;
    const f = 620 / Math.max(80, depth);
    return {
      x: canvas.width / 2 + x1 * f * (canvas.width / (canvas.height || 1)) * 0.42,
      y: canvas.height / 2 + y2 * f,
      z: depth,
      s: f
    };
  }

  function pick(mx, my) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const x = mx * dpr, y = my * dpr;
    let best = null, bestD = 22 * dpr;
    for (const n of nodes) {
      const pr = project(pos.get(n.id));
      const d = Math.hypot(pr.x - x, pr.y - y);
      const hit = sizeOf(n) * pr.s * dpr * 1.8 + 10;
      if (d < hit && d < bestD + 8) {
        best = n;
        bestD = d;
      }
    }
    return best;
  }

  function draw() {
    const w = canvas.width, h = canvas.height;
    const bg = css('--surface', '#fbfaf7');
    const line = css('--line', '#d9d8d0');
    const text = css('--text', '#28302d');
    const muted = css('--muted', '#68716d');
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const fog = hexToRgb(bg);
    const projected = nodes.map(n => ({n, p: project(pos.get(n.id))})).sort((a, b) => b.p.z - a.p.z);

    ctx.lineCap = 'round';
    for (const l of links) {
      const a = project(pos.get(l.source));
      const b = project(pos.get(l.target));
      const alpha = Math.max(0.08, Math.min(0.45, 1.2 - (a.z + b.z) / (cam.dist * 3.2)));
      ctx.strokeStyle = line;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = Math.max(0.6, 1.4 * ((a.s + b.s) / 2));
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    for (const {n, p} of projected) {
      const r = sizeOf(n) * p.s * Math.min(2, window.devicePixelRatio || 1);
      const depthT = Math.max(0, Math.min(1, (p.z - 200) / 1400));
      const fill = n.type === 'topic' && !n.used ? mix(n.color, 0.72, bg) : mix(n.color, depthT * 0.35, '#000000');
      ctx.beginPath();
      ctx.fillStyle = fill;
      ctx.strokeStyle = n.type === 'topic' && !n.used ? n.color : mix(bg, 0.2, '#ffffff');
      ctx.lineWidth = n.type === 'topic' && !n.used ? 1.6 : 1.2;
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (hover && hover.id === n.id) {
        ctx.beginPath();
        ctx.strokeStyle = n.color;
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 2;
        ctx.arc(p.x, p.y, r + 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    if (hover) {
      const p = project(pos.get(hover.id));
      const label = hover.type === 'recording' ? `Recording · ${hover.label}` : hover.label;
      ctx.font = `${11 * Math.min(2, window.devicePixelRatio || 1)}px ${css('--sans', 'system-ui')}`;
      const pad = 8;
      const tw = ctx.measureText(label).width;
      const bx = p.x + 14, by = p.y - 18;
      ctx.fillStyle = mix(bg, 0.08, '#000000');
      ctx.strokeStyle = line;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect?.(bx, by - 14, tw + pad * 2, 22, 8);
      if (!ctx.roundRect) ctx.rect(bx, by - 14, tw + pad * 2, 22);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = text;
      ctx.fillText(label, bx + pad, by + 2);
      ctx.fillStyle = muted;
    }
  }

  function frame() {
    if (!running) return;
    if (auto && !dragging) cam.targetYaw += 0.0032;
    cam.yaw += (cam.targetYaw - cam.yaw) * 0.14;
    cam.pitch += (cam.targetPitch - cam.pitch) * 0.14;
    cam.dist += (cam.targetDist - cam.dist) * 0.14;
    if (!dragging) {
      cam.targetYaw += vYaw;
      cam.targetPitch += vPitch;
      vYaw *= 0.92;
      vPitch *= 0.92;
    }
    cam.targetPitch = Math.max(-1.2, Math.min(1.2, cam.targetPitch));
    cam.targetDist = Math.max(280, Math.min(1600, cam.targetDist));
    draw();
    raf = requestAnimationFrame(frame);
  }

  function localXY(e) {
    const r = canvas.getBoundingClientRect();
    return {x: e.clientX - r.left, y: e.clientY - r.top};
  }

  canvas.addEventListener('pointerdown', e => {
    dragging = true;
    auto = false;
    moved = 0;
    canvas.setPointerCapture(e.pointerId);
    const {x, y} = localXY(e);
    lastX = x; lastY = y;
    vYaw = 0; vPitch = 0;
  });
  canvas.addEventListener('pointermove', e => {
    const {x, y} = localXY(e);
    if (dragging) {
      const dx = (x - lastX) * 0.008;
      const dy = (y - lastY) * 0.008;
      moved += Math.hypot(x - lastX, y - lastY);
      cam.targetYaw += dx;
      cam.targetPitch += dy;
      vYaw = dx;
      vPitch = dy;
      lastX = x; lastY = y;
    } else {
      hover = pick(x, y);
      canvas.style.cursor = hover ? 'pointer' : 'grab';
    }
  });
  const endDrag = () => { dragging = false; };
  canvas.addEventListener('pointerup', e => {
    if (!dragging) return;
    dragging = false;
    const {x, y} = localXY(e);
    if (moved < 6) {
      const hit = pick(x, y);
      if (hit) onSelect?.(hit);
    }
  });
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('pointerleave', () => { hover = null; });
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    auto = false;
    cam.targetDist += e.deltaY * 0.7;
  }, {passive: false});

  const onResize = () => resize();
  window.addEventListener('resize', onResize);
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();
  raf = requestAnimationFrame(frame);

  return {
    canvas,
    reset() {
      cam.targetYaw = 0.55;
      cam.targetPitch = 0.32;
      cam.targetDist = 720;
      auto = !reduce;
    },
    setAuto(v) { auto = v && !reduce; },
    destroy() {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      ro.disconnect();
      canvas.remove();
    }
  };
}
