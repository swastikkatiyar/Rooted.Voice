import {getById, getAll} from '../data/db.js';
import {drawTopic} from './topicDraw.js';
import {countdown} from './timer.js';
import {getStream, recordStream} from '../recording/recordingEngine.js';
import {saveRecording} from '../recording/fileSaver.js';
import {navigate} from '../shell/router.js';
import {mountClock} from '../ui/slidingNumber.js';

function timeParts(seconds) {
  const s = Math.max(0, seconds);
  return [
    {value: Math.floor(s / 60), pad: 2},
    {value: s % 60, pad: 2}
  ];
}

function bindClock(el, seconds) {
  let current = seconds;
  const clock = mountClock(el, () => timeParts(current));
  return remaining => {
    current = remaining;
    clock.refresh();
  };
}

export async function renderSetup(app, categoryId, topicId = null) {
  const settings = await getById('settings', 'app');
  const cs = await getAll('categories');
  const category = cs.find(c => c.id === categoryId);
  const topic = topicId ? (await getById('topics', topicId)) : await drawTopic(categoryId);

  if (!topic) {
    app.innerHTML = `
      <div class="hero">
        <div>
          <div class="eyebrow">Session setup</div>
          <h1 class="view-title">No topics yet.</h1>
          <p>Add a category and at least one topic in Settings, then come back to record.</p>
        </div>
        <a class="btn primary" href="#/settings">Open Settings</a>
      </div>`;
    return;
  }

  const already = topic.exhausted;
  app.innerHTML = `
    <div class="hero">
      <div>
        <div class="eyebrow">Session setup · ${category?.name || 'All categories'}</div>
        <h1 class="view-title">${topic.title}</h1>
        <p>${topic.prompt}</p>
      </div>
      <button class="btn" id="draw">Draw another topic</button>
    </div>
    ${already ? `<div class="alert">Already practiced · first recorded ${topic.firstUsedAt ? new Date(topic.firstUsedAt).toLocaleDateString() : 'before'} · ${(topic.recordingIds || []).length} recording(s). Open the network to add another recording.</div>` : ''}
    <div class="two-col">
      <section class="card">
        <div class="form-row">
          <label for="research">Research time<small>Silently gather your thoughts.</small></label>
          <input id="research" class="input" type="number" min="1" max="30" value="${Math.round(settings.defaultResearchSeconds / 60)}">
        </div>
        <input class="range" id="researchRange" type="range" min="1" max="30" value="${Math.round(settings.defaultResearchSeconds / 60)}">
        <div class="form-row">
          <label for="speaking">Speaking time<small>Up to ten minutes, at your own pace.</small></label>
          <input id="speaking" class="input" type="number" min="1" max="10" value="${Math.round(settings.defaultSpeakingSeconds / 60)}">
        </div>
        <input class="range" id="speakingRange" type="range" min="1" max="10" value="${Math.round(settings.defaultSpeakingSeconds / 60)}">
        <div class="actions">
          ${already
            ? `<a class="btn primary" href="#/garden">Open in Knowledge Network</a>`
            : `<button class="btn primary" id="start">Start research</button>`}
          <a class="btn ghost" href="#/home">Not now</a>
        </div>
      </section>
      <aside class="card">
        <div class="eyebrow">A gentle framing</div>
        <p>There is no score here. Try to make one clear point, support it with an example, and leave room for a thought you did not expect.</p>
      </aside>
    </div>`;

  const sync = (a, b) => { a.value = b.value; };
  app.querySelector('#research').oninput = e => sync(app.querySelector('#researchRange'), e.target);
  app.querySelector('#researchRange').oninput = e => sync(app.querySelector('#research'), e.target);
  app.querySelector('#speaking').oninput = e => sync(app.querySelector('#speakingRange'), e.target);
  app.querySelector('#speakingRange').oninput = e => sync(app.querySelector('#speaking'), e.target);
  app.querySelector('#draw').onclick = () => renderSetup(app, categoryId);
  const start = app.querySelector('#start');
  if (start) start.onclick = () => renderResearch(app, topic, Number(app.querySelector('#research').value) * 60, Number(app.querySelector('#speaking').value) * 60);
}

async function renderResearch(app, topic, research, speaking) {
  app.innerHTML = `
    <div class="timer">
      <div class="eyebrow">Research quietly</div>
      <h1>${topic.title}</h1>
      <p>${topic.prompt}</p>
      <div class="timer-value" aria-live="polite" id="clock"></div>
      <textarea class="textarea" id="scratch" placeholder="Optional scratchpad — save a reflection when research ends"></textarea>
      <div class="actions" style="justify-content:center;margin-top:20px">
        <button class="btn ghost" id="skip">Skip to camera</button>
      </div>
    </div>`;
  const setClock = bindClock(app.querySelector('#clock'), research);
  const stop = countdown(research, setClock, () => renderRecording(app, topic, speaking, research));
  app.querySelector('#skip').onclick = () => { stop(); renderRecording(app, topic, speaking, research); };
}

async function renderRecording(app, topic, speaking, research) {
  app.innerHTML = `
    <div class="timer">
      <div class="eyebrow">Speak when ready</div>
      <h1>${topic.title}</h1>
      <div class="timer-value" id="clock"></div>
      <div class="video-wrap"><video id="preview" autoplay muted playsinline></video></div>
      <p id="status" class="muted">Requesting camera and microphone…</p>
      <div class="actions" style="justify-content:center">
        <button class="btn danger" id="stop">Stop early</button>
      </div>
    </div>`;
  const setClock = bindClock(app.querySelector('#clock'), speaking);
  try {
    const stream = await getStream();
    const v = app.querySelector('#preview');
    v.srcObject = stream;
    const rec = recordStream(stream, speaking, {
      onTick: setClock,
      onStop: async (blob, duration) => {
        app.querySelector('#status').textContent = 'Saving your recording…';
        try {
          const r = await saveRecording(blob, topic, {
            defaultResearchSeconds: research,
            defaultSpeakingSeconds: speaking,
            storageMode: (await getById('settings', 'app')).storageMode
          }, duration);
          navigate('review/' + r.id);
        } catch {
          app.querySelector('#status').textContent = 'The recording could not be saved. Check folder permission and try again.';
          app.querySelector('#stop').disabled = false;
        }
      }
    });
    app.querySelector('#stop').onclick = () => rec.stop();
  } catch {
    app.querySelector('#status').innerHTML = 'Camera or microphone access was not available. Please check browser permissions and <button class="btn" id="retry">try again</button>.';
    app.querySelector('#retry').onclick = () => renderRecording(app, topic, speaking, research);
  }
}
