const NAME='rooted-voice',VERSION=1,stores=['categories','topics','recordings','timestampedNotes','topicNotes','settings','fileHandles'];
let dbPromise;
export function openDB(){if(dbPromise)return dbPromise;dbPromise=new Promise((resolve,reject)=>{const r=indexedDB.open(NAME,VERSION);r.onupgradeneeded=()=>{const db=r.result;stores.forEach(s=>{if(!db.objectStoreNames.contains(s))db.createObjectStore(s,{keyPath:'id'})})};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});return dbPromise}
export async function getAll(store){const db=await openDB();return new Promise((res,rej)=>{const r=db.transaction(store).objectStore(store).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
export async function getById(store,id){const db=await openDB();return new Promise((res,rej)=>{const r=db.transaction(store).objectStore(store).get(id);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
export async function put(store,value){const db=await openDB();return new Promise((res,rej)=>{const r=db.transaction(store,'readwrite').objectStore(store).put(value);r.onsuccess=()=>res(value);r.onerror=()=>rej(r.error)})}
export async function remove(store,id){const db=await openDB();return new Promise((res,rej)=>{const r=db.transaction(store,'readwrite').objectStore(store).delete(id);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}
export const getUnusedTopicsByCategory=async c=>(await getAll('topics')).filter(t=>t.categoryId===c&&!t.used);
export const getRecordingsByTopic=async t=>(await getAll('recordings')).filter(r=>r.topicId===t).sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
export const getOpenTopicNotes=async()=> (await getAll('topicNotes')).filter(n=>n.open);
export async function clearAll(){const db=await openDB();await Promise.all(stores.map(s=>new Promise((res,rej)=>{const r=db.transaction(s,'readwrite').objectStore(s).clear();r.onsuccess=res;r.onerror=()=>rej(r.error)})))}
export {stores};
