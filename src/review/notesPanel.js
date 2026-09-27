import {getAll,put,remove} from '../data/db.js';import {createTimestampedNote,createTopicNote} from '../data/models.js';
export async function notesForRecording(id){return (await getAll('timestampedNotes')).filter(n=>n.recordingId===id).sort((a,b)=>a.timestampSeconds-b.timestampSeconds)}
export async function addTimestamped(recordingId,time,text){const n=createTimestampedNote({recordingId,timestampSeconds:time,text});await put('timestampedNotes',n);const r=(await getAll('recordings')).find(x=>x.id===recordingId);r.timestampedNoteIds=[...(r.timestampedNoteIds||[]),n.id];await put('recordings',r);return n}
export async function deleteTimestamped(id){await remove('timestampedNotes',id)}
export async function notesForTopic(id){return (await getAll('topicNotes')).filter(n=>n.topicId===id)}
export async function saveTopicNote(topicId,text,existing){const n=existing?{...existing,text,updatedAt:new Date().toISOString()}:createTopicNote({topicId,text});await put('topicNotes',n);return n}
