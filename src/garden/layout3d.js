function tokenColor(token) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(token || '--accent').trim();
  return raw || '#63796d';
}

export function buildGraph(categories, topics, recordings) {
  const catOf = Object.fromEntries(categories.map(c => [c.id, c]));
  const nodes = categories.map(c => ({
    id: 'c-' + c.id,
    type: 'category',
    label: c.name,
    color: tokenColor(c.colorToken),
    ref: c
  }));
  topics.forEach(t => {
    nodes.push({
      id: 't-' + t.id,
      type: 'topic',
      label: t.title,
      used: t.used,
      color: tokenColor(catOf[t.categoryId]?.colorToken),
      categoryId: t.categoryId,
      ref: t
    });
  });
  recordings.forEach(r => {
    const topic = topics.find(t => t.id === r.topicId);
    nodes.push({
      id: 'r-' + r.id,
      type: 'recording',
      label: new Date(r.createdAt).toLocaleDateString(),
      color: tokenColor(catOf[topic?.categoryId]?.colorToken),
      topicId: r.topicId,
      ref: r
    });
  });
  const links = topics.map(t => ({source: 'c-' + t.categoryId, target: 't-' + t.id}))
    .concat(recordings.map(r => ({source: 't-' + r.topicId, target: 'r-' + r.id})))
    .filter(l => nodes.some(n => n.id === l.source) && nodes.some(n => n.id === l.target));
  return {nodes, links};
}

export function layout3d(nodes, links) {
  const pos = new Map();
  const cats = nodes.filter(n => n.type === 'category');
  const topics = nodes.filter(n => n.type === 'topic');
  const recs = nodes.filter(n => n.type === 'recording');
  const ring = Math.max(160, 70 + cats.length * 28);

  cats.forEach((n, i) => {
    const a = (i / Math.max(1, cats.length)) * Math.PI * 2 - Math.PI / 2;
    pos.set(n.id, {x: Math.cos(a) * ring, y: Math.sin(a) * 18, z: Math.sin(a) * ring});
  });

  const byCat = new Map();
  topics.forEach(t => {
    const key = t.categoryId || 'none';
    if (!byCat.has(key)) byCat.set(key, []);
    byCat.get(key).push(t);
  });
  byCat.forEach((list, key) => {
    const parent = pos.get('c-' + key) || {x: 0, y: 0, z: 0};
    list.forEach((t, i) => {
      const a = (i / Math.max(1, list.length)) * Math.PI * 2;
      const r = 70 + list.length * 4;
      pos.set(t.id, {
        x: parent.x + Math.cos(a) * r * 0.7,
        y: parent.y + Math.sin(i * 1.7) * 42,
        z: parent.z + Math.sin(a) * r * 0.7
      });
    });
  });

  const byTopic = new Map();
  recs.forEach(r => {
    const key = r.topicId || 'none';
    if (!byTopic.has(key)) byTopic.set(key, []);
    byTopic.get(key).push(r);
  });
  byTopic.forEach((list, key) => {
    const parent = pos.get('t-' + key) || {x: 0, y: 40, z: 0};
    list.forEach((r, i) => {
      const a = (i / Math.max(1, list.length)) * Math.PI * 2 + 0.4;
      const elev = (i % 3 - 1) * 22;
      pos.set(r.id, {
        x: parent.x + Math.cos(a) * 36,
        y: parent.y + 28 + elev,
        z: parent.z + Math.sin(a) * 36
      });
    });
  });

  for (let k = 0; k < 40; k++) {
    for (const a of nodes) {
      const p = pos.get(a.id);
      for (const b of nodes) {
        if (a === b) continue;
        const q = pos.get(b.id);
        const dx = p.x - q.x, dy = p.y - q.y, dz = p.z - q.z;
        const d = Math.max(16, Math.hypot(dx, dy, dz));
        if (d < 90) {
          const f = (90 - d) / d * 0.35;
          p.x += dx * f; p.y += dy * f; p.z += dz * f;
        }
      }
    }
    for (const l of links) {
      const a = pos.get(l.source), b = pos.get(l.target);
      if (!a || !b) continue;
      const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
      const d = Math.max(1, Math.hypot(dx, dy, dz));
      const pull = (d - 95) * 0.012;
      a.x += dx / d * pull; a.y += dy / d * pull; a.z += dz / d * pull;
      b.x -= dx / d * pull; b.y -= dy / d * pull; b.z -= dz / d * pull;
    }
  }
  return pos;
}
