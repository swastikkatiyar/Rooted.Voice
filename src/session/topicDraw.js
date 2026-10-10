import {getAll} from '../data/db.js';

export async function drawTopic(categoryId) {
  const all = await getAll('topics');
  const inCat = categoryId === 'random' || categoryId === 'all' || !categoryId
    ? all
    : all.filter(t => t.categoryId === categoryId);
  const pool = inCat.filter(t => !t.used);
  if (!inCat.length) return null;
  const exhausted = pool.length === 0;
  const source = exhausted ? inCat : pool;
  return {...source[Math.floor(Math.random() * source.length)], exhausted};
}
