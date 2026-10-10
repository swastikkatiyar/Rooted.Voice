import {getAll} from '../data/db.js';
import {navigate} from './router.js';
import {mountAnimatedNumber} from '../ui/animatedNumber.js';
import {mountSlidingNumber} from '../ui/slidingNumber.js';

export async function renderHome(app) {
  const [cs, ts, rs] = await Promise.all([getAll('categories'), getAll('topics'), getAll('recordings')]);
  const open = (await getAll('topicNotes')).filter(n => n.open).length;
  const unused = ts.filter(t => !t.used).length;

  app.innerHTML = `
    <div class="hero">
      <div>
        <div class="eyebrow">A quiet practice ritual</div>
        <h1>Speak with more<br><em>presence.</em></h1>
        <p>Choose an idea, give it your full attention, and let your voice become a record of the work.</p>
      </div>
      <button class="btn primary" id="next" ${unused ? '' : 'disabled'}>${unused ? 'Start a topic' : 'Add a topic in Settings'}</button>
    </div>
    ${open ? `<div class="alert">You have <b>${open}</b> open topic note${open > 1 ? 's' : ''}. <a href="#/notes">Visit your Notes Inbox →</a></div>` : ''}
    <div class="section-head">
      <h2>Practice by category</h2>
      <span class="muted stat-inline"><span id="home-videos">0</span> videos recorded</span>
    </div>
    <div class="grid">${cs.map(c => {
      const all = ts.filter(t => t.categoryId === c.id);
      const done = all.filter(t => t.used).length;
      const total = all.length;
      const pct = total ? Math.round(done / total * 100) : 0;
      return `<a class="card category-card" style="--cat:var(${c.colorToken})" href="#/setup/${c.id}">
        <div><h3>${c.name}</h3><p>${c.description}</p></div>
        <div>
          <div class="progress"><span>${done}/${total || 0} practiced</span><span class="pct-wrap" data-pct="${pct}"></span></div>
          <div class="progress-bar"><i style="width:${pct}%"></i></div>
        </div>
      </a>`;
    }).join('') || '<div class="empty">Add a category in Settings to begin.</div>'}</div>
    <div class="section-head"><h2>Recent activity</h2></div>
    <div class="recent">${rs.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5).map(r => {
      const t = ts.find(t => t.id === r.topicId);
      return `<div class="activity"><span><b>${t?.title || 'Unknown topic'}</b><br><small>${new Date(r.createdAt).toLocaleString()}</small></span><a class="btn" href="#/review/${r.id}">Review</a></div>`;
    }).join('') || '<div class="empty">Your first recording will appear here.</div>'}</div>`;

  mountAnimatedNumber(app.querySelector('#home-videos'), rs.length, {duration: 2000});
  app.querySelectorAll('[data-pct]').forEach(el => {
    const target = Number(el.dataset.pct);
    el.innerHTML = `<span class="pct-number"></span>%`;
    const ctrl = mountSlidingNumber(el.querySelector('.pct-number'), 0);
    const io = new IntersectionObserver(entries => {
      if (!entries.some(e => e.isIntersecting)) return;
      io.disconnect();
      let v = 0;
      const step = () => {
        v = Math.min(target, v + 1);
        ctrl.set(v);
        if (v < target) requestAnimationFrame(step);
      };
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) ctrl.set(target);
      else requestAnimationFrame(step);
    }, {threshold: 0.4});
    io.observe(el);
  });
  app.querySelector('#next').onclick = () => {
    if (unused) navigate('setup/all');
    else location.hash = '/settings';
  };
}
