import {getById, put, getAll, clearAll, remove} from '../data/db.js';
import {chooseRoot, supportsFSA} from '../data/fileStorage.js';
import {createCategory, createTopic, categoryColorTokens} from '../data/models.js';

export async function renderSettings(app) {
  const s = await getById('settings', 'app');
  const cs = await getAll('categories');
  const ts = await getAll('topics');
  const usage = await navigator.storage?.estimate?.();

  app.innerHTML = `
    <div class="hero">
      <div>
        <div class="eyebrow">Settings</div>
        <h1 class="view-title">Make the ritual yours.</h1>
      </div>
    </div>
    <div class="settings-grid">
      <section class="card stack">
        <h2>Your catalog</h2>
        <p class="muted">Nothing is preloaded. Add categories and topics here, then record. They appear in the 3D network.</p>
        <label>Category name<input class="input" id="cat-name" placeholder="e.g. History"></label>
        <label>Category description<input class="input" id="cat-desc" placeholder="A short line"></label>
        <button class="btn" id="add-cat">Add category</button>
        <div class="divider"></div>
        <label>Topic title<input class="input" id="topic-title" placeholder="e.g. The Silk Roads"></label>
        <label>Prompt<textarea class="textarea" id="topic-prompt" placeholder="What should you speak about?"></textarea></label>
        <label>Category
          <select class="select" id="topic-cat">${cs.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}</select>
        </label>
        <button class="btn primary" id="add-topic" ${cs.length ? '' : 'disabled'}>Add topic</button>
        <div class="catalog-list">
          ${cs.map(c => {
            const n = ts.filter(t => t.categoryId === c.id).length;
            return `<div class="catalog-row"><span><b>${c.name}</b> · ${n} topic${n === 1 ? '' : 's'}</span><button class="btn ghost" data-del-cat="${c.id}">Remove</button></div>`;
          }).join('') || '<p class="muted">No categories yet.</p>'}
          ${ts.slice().reverse().slice(0, 12).map(t => `<div class="catalog-row"><span>${t.title}</span><button class="btn ghost" data-del-topic="${t.id}">Remove</button></div>`).join('')}
        </div>
      </section>
      <section class="card stack">
        <h2>Appearance</h2>
        <label>Theme<select class="select" id="theme"><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label>
        <label>Default research minutes<input class="input" id="research" type="number" min="1" max="30" value="${s.defaultResearchSeconds / 60}"></label>
        <label>Default speaking minutes<input class="input" id="speaking" type="number" min="1" max="10" value="${s.defaultSpeakingSeconds / 60}"></label>
        <button class="btn primary" id="save">Save preferences</button>
      </section>
      <section class="card stack">
        <h2>Local storage</h2>
        <p>Using: <b>${s.storageMode === 'fsa' ? 'File System Access' : 'OPFS + manual download'}</b></p>
        <p class="muted">${supportsFSA() ? 'This browser supports a chosen folder for real video files.' : 'This browser uses Origin Private File System; download recordings manually.'}</p>
        <p class="muted">Metadata estimate: ${usage?.usage ? Math.round(usage.usage / 1024 / 1024) + ' MB' : 'not available'}</p>
        <button class="btn" id="folder">${s.hasRootDirectory ? 'Re-select root folder' : 'Choose root folder'}</button>
      </section>
      <section class="card stack">
        <h2>Data management</h2>
        <button class="btn" id="export">Export metadata JSON</button>
        <button class="btn danger" id="clear">Clear all metadata</button>
        <small class="muted">Video files in your chosen folder are never deleted by this action.</small>
      </section>
    </div>`;

  app.querySelector('#theme').value = s.theme;
  app.querySelector('#save').onclick = async () => {
    await put('settings', {
      ...s,
      theme: app.querySelector('#theme').value,
      defaultResearchSeconds: Number(app.querySelector('#research').value) * 60,
      defaultSpeakingSeconds: Number(app.querySelector('#speaking').value) * 60
    });
    location.reload();
  };
  app.querySelector('#folder').onclick = async () => {
    try { await chooseRoot(); renderSettings(app); }
    catch { alert('Folder selection was cancelled or unavailable.'); }
  };
  app.querySelector('#export').onclick = async () => {
    const data = {
      categories: await getAll('categories'),
      topics: await getAll('topics'),
      recordings: await getAll('recordings'),
      timestampedNotes: await getAll('timestampedNotes'),
      topicNotes: await getAll('topicNotes'),
      settings: await getAll('settings')
    };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'}));
    a.download = 'rooted-voice-metadata.json';
    a.click();
  };
  app.querySelector('#clear').onclick = async () => {
    if (confirm('Clear all metadata? Video files on disk will remain untouched.')) {
      await clearAll();
      location.hash = '/home';
      location.reload();
    }
  };
  app.querySelector('#add-cat').onclick = async () => {
    const name = app.querySelector('#cat-name').value.trim();
    if (!name) return;
    const token = categoryColorTokens[cs.length % categoryColorTokens.length];
    await put('categories', createCategory({
      name,
      description: app.querySelector('#cat-desc').value.trim(),
      colorToken: token
    }));
    renderSettings(app);
  };
  app.querySelector('#add-topic').onclick = async () => {
    const title = app.querySelector('#topic-title').value.trim();
    const categoryId = app.querySelector('#topic-cat').value;
    if (!title || !categoryId) return;
    await put('topics', createTopic({
      title,
      prompt: app.querySelector('#topic-prompt').value.trim(),
      categoryId
    }));
    renderSettings(app);
  };
  app.querySelectorAll('[data-del-cat]').forEach(b => b.onclick = async () => {
    const id = b.dataset.delCat;
    const linked = ts.filter(t => t.categoryId === id);
    if (linked.length && !confirm('Remove this category and its topics? Recordings stay in storage.')) return;
    for (const t of linked) await remove('topics', t.id);
    await remove('categories', id);
    renderSettings(app);
  });
  app.querySelectorAll('[data-del-topic]').forEach(b => b.onclick = async () => {
    await remove('topics', b.dataset.delTopic);
    renderSettings(app);
  });
}
