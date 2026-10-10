import {getById,put} from './db.js';
export const supportsFSA=()=>typeof window.showDirectoryPicker==='function';
export async function chooseRoot(){if(!supportsFSA())return false;const handle=await window.showDirectoryPicker({mode:'readwrite'});await put('fileHandles',{id:'root',handle});const s=await getById('settings','app');await put('settings',{...s,storageMode:'fsa',hasRootDirectory:true});return true}
async function rootHandle(){const x=await getById('fileHandles','root');if(!x)return null;try{const p=await x.handle.queryPermission({mode:'readwrite'});if(p==='granted'||await x.handle.requestPermission({mode:'readwrite'})==='granted')return x.handle}catch(e){}return null}
const safe = s => s
  .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, 100);
export async function saveBlob(blob,title,date=new Date()){const day=date.toISOString().slice(0,10),base=safe(`${title} – ${day}`);let settings=await getById('settings','app');let mode=settings?.storageMode==='fsa'&&supportsFSA()?'fsa':'opfs';let n=1,name=base;let fileName=()=>`${name}.webm`;
 if(mode==='fsa'){let root=await rootHandle();if(!root){await chooseRoot();root=await rootHandle()}if(!root)throw new Error('Folder permission was not granted.');while(true){try{const d=await root.getDirectoryHandle(name,{create:true});await d.getFileHandle(fileName(),{create:false});n++;name=`${base} (${n})`}catch(e){break}}const dir=await root.getDirectoryHandle(name,{create:true});const fh=await dir.getFileHandle(fileName(),{create:true});const w=await fh.createWritable();await w.write(blob);await w.close();return {mode:'fsa',folderName:name,fileName:fileName(),handle:fh}}
 const opfs=await navigator.storage.getDirectory();while(true){try{const d=await opfs.getDirectoryHandle(name,{create:true});await d.getFileHandle(fileName(),{create:false});n++;name=`${base} (${n})`}catch(e){break}}const dir=await opfs.getDirectoryHandle(name,{create:true});const fh=await dir.getFileHandle(fileName(),{create:true});const w=await fh.createWritable();await w.write(blob);await w.close();return {mode:'opfs',folderName:name,fileName:fileName()};}
export async function readBlob(recording){if(recording.storageMode==='fsa'){const x=await getById('fileHandles','recording-'+recording.id);if(x?.handle)return x.handle.getFile()}const root=await navigator.storage.getDirectory();const d=await root.getDirectoryHandle(recording.folderName);const f=await d.getFileHandle(recording.fileName);return f.getFile()}
export async function saveFileHandle(recordingId,handle){await put('fileHandles',{id:'recording-'+recordingId,handle})}
