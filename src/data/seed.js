import {getAll, put, remove} from './db.js';
import {categories} from './categories.js';
import {defaults} from './models.js';

const seedId = t => /^\w[\w-]*-\d{3}$/.test(t.id);

export async function seed() {
  const existingSettings = await getAll('settings');
  if (!existingSettings.length) await put('settings', {id: 'app', ...defaults});

  const existingCats = await getAll('categories');
  if (!existingCats.length) {
    for (const c of categories) await put('categories', c);
  }

  const [topics, recordings] = await Promise.all([getAll('topics'), getAll('recordings')]);
  const unusedSeed = topics.filter(t => seedId(t) && !t.used && !(t.recordingIds || []).length);
  if (unusedSeed.length && recordings.length === 0 && unusedSeed.length === topics.length) {
    for (const t of unusedSeed) await remove('topics', t.id);
  }
}
