import {getAll} from '../data/db.js';
import {readBlob} from '../data/fileStorage.js';
import {saveTopicNote, notesForTopic} from '../review/notesPanel.js';
import {buildGraph} from './layout3d.js';
import {mountNetwork3D} from './network3d.js';
import {mountAnimatedNumber} from '../ui/animatedNumber.js';

export async function renderGarden(app, actions) {
  const [cs, ts, rs] = await Promise.all([getAll('categories'), getAll('topics'), getAll('recordings')]);
  const {nodes, links} = buildGraph(cs, ts, rs);

  app.innerHTML = `
    <div class="hero">
      <div>
        <div class="eyebrow">Knowledge network</div>
        <h1 class="view-title">A map you can turn in your hands.</h1>
        <p class="muted">Drag to rotate, scroll to zoom, click a recording to watch it. Full screen when you want the graph alone.</p>
      </div>
      <div class="stat-block" id="video-stat">
        <div class="animated-number" id="video-count">0</div>
        <span class="muted">videos recorded</span>
      </div>
    </div>
    <div class="garden-layout">
      <div class="network-stage" id="stage">
        <div class="network-toolbar">
          <button class="btn ghost" type="button" id="auto">Pause spin</button>
          <button class="btn ghost" type="button" id="reset">Reset view</button>
          <button class="btn" type="button" id="fs">Full screen</button>
        </div>
        <div class="network-hint">Drag 360° · pinch or scroll to zoom</div>
      </div>
      <aside class="card garden-side">
        <input class="input" id="filter" placeholder="Filter topics and recordings" aria-label="Filter garden">
        <div class="garden-list" id="list"></div>
        <div id="detail"></div>
      </aside>
    </div>
    <div class="video-peek" id="peek" hidden>
      <div class="video-peek-panel">
        <div class="video-peek-bar">
          <strong id="peek-title">Recording</strong>
          <div class="actions">
            <a class="btn" id="peek-open" href="#/garden">Open review</a>
            <button class="btn ghost" type="button" id="peek-close">Close</button>
          </div>
        </div>
        <div class="video-wrap"><video id="peek-video" controls playsinline></video></div>
      </div>
    </div>`;

  mountAnimatedNumber(app.querySelector('#video-count'), rs.length, {duration: 2200});

  const stage = app.querySelector('#stage');
  const list = app.querySelector('#list');
  const detail = app.querySelector('#detail');
  const peek = app.querySelector('#peek');
  const peekVideo = app.querySelector('#peek-video');
  let spinning = true;
  let net;

  async function openRecording(id) {
    const r = rs.find(x => x.id === id);
    if (!r) return;
    app.querySelector('#peek-title').textContent = r.fileName || new Date(r.createdAt).toLocaleString();
    app.querySelector('#peek-open').href = '#/review/' + r.id;
    peek.hidden = false;
    peekVideo.removeAttribute('src');
    try {
      const file = await readBlob(r);
      peekVideo.src = URL.createObjectURL(file);
    } catch {
      peekVideo.removeAttribute('src');
      app.querySelector('#peek-title').textContent = 'This file could not be read from local storage.';
    }
  }

  function closePeek() {
    peek.hidden = true;
    if (peekVideo.src) URL.revokeObjectURL(peekVideo.src);
    peekVideo.removeAttribute('src');
  }

  async function topicDetail(id) {
    const t = ts.find(x => x.id === id);
    if (!t) return;
    const ns = await notesForTopic(id);
    const recs = rs.filter(r => r.topicId === id);
    detail.innerHTML = `
      <div class="divider"></div>
      <h2>${t.title}</h2>
      <p class="muted">${t.prompt}</p>
      <button class="btn primary" id="again">Add another recording</button>
      <h3>Topic notes</h3>
      ${ns.map(n => `<div class="note"><span>${n.text}</span><span class="pill">${n.open ? 'Open' : 'Resolved'}</span></div>`).join('') || '<p class="muted">No notes yet.</p>'}
      <textarea class="textarea" id="topic-note" placeholder="Add a reflection..."></textarea>
      <button class="btn" id="save-topic-note">Save topic note</button>
      <h3>Recordings (${recs.length})</h3>
      ${recs.map(r => `<button class="btn ghost" data-rec="${r.id}">${new Date(r.createdAt).toLocaleString()}</button>`).join('') || '<p class="muted">No videos on this topic yet.</p>'}`;
    detail.querySelector('#again').onclick = () => actions.session(t.id);
    detail.querySelector('#save-topic-note').onclick = async () => {
      const v = detail.querySelector('#topic-note').value.trim();
      if (v) { await saveTopicNote(id, v); topicDetail(id); }
    };
    detail.querySelectorAll('[data-rec]').forEach(b => b.onclick = () => openRecording(b.dataset.rec));
  }

  const drawList = filter => {
    const f = filter.toLowerCase();
    if (!cs.length) {
      list.innerHTML = '<div class="empty">Add a category in Settings, then a topic, then record.</div>';
      return;
    }
    list.innerHTML = cs.map(c => {
      const catTopics = ts.filter(t => t.categoryId === c.id && (!f || t.title.toLowerCase().includes(f)));
      return `<div class="tree-item"><b>${c.name}</b>${catTopics.map(t => {
        const recHtml = rs.filter(r => r.topicId === t.id).map(r =>
          `<div class="tree-item recording" data-rec="${r.id}">${new Date(r.createdAt).toLocaleDateString()}</div>`
        ).join('');
        return `<div class="tree-item topic" data-topic="${t.id}">${t.used ? '●' : '○'} ${t.title}${recHtml}</div>`;
      }).join('')}</div>`;
    }).join('');
    list.querySelectorAll('[data-topic]').forEach(x => x.onclick = () => topicDetail(x.dataset.topic));
    list.querySelectorAll('[data-rec]').forEach(x => x.onclick = () => openRecording(x.dataset.rec));
  };

  net = mountNetwork3D(stage, {
    nodes,
    links,
    onSelect(n) {
      if (n.type === 'topic') topicDetail(n.ref.id);
      if (n.type === 'recording') openRecording(n.ref.id);
      if (n.type === 'category') {
        const first = ts.find(t => t.categoryId === n.ref.id);
        if (first) topicDetail(first.id);
      }
    }
  });

  drawList('');
  app.querySelector('#filter').oninput = e => drawList(e.target.value);
  app.querySelector('#reset').onclick = () => net.reset();
  app.querySelector('#auto').onclick = e => {
    spinning = !spinning;
    net.setAuto(spinning);
    e.target.textContent = spinning ? 'Pause spin' : 'Spin';
  };
  const fsBtn = app.querySelector('#fs');
  fsBtn.onclick = async () => {
    try {
      if (document.fullscreenElement === stage) await document.exitFullscreen();
      else await stage.requestFullscreen();
    } catch {}
  };
  const onFs = () => {
    if (!fsBtn.isConnected) {
      document.removeEventListener('fullscreenchange', onFs);
      return;
    }
    fsBtn.textContent = document.fullscreenElement === stage ? 'Exit full screen' : 'Full screen';
  };
  document.addEventListener('fullscreenchange', onFs);
  app.querySelector('#peek-close').onclick = closePeek;
  peek.addEventListener('click', e => { if (e.target === peek) closePeek(); });
}
