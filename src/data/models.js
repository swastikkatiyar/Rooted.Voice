/** @typedef {{id:string,categoryId:string,title:string,prompt:string,used:boolean,firstUsedAt:string|null,recordingIds:string[]}} Topic */
/** @typedef {{id:string,topicId:string,createdAt:string,researchTimeSeconds:number,speakingTimeSeconds:number,actualDurationSeconds:number,fileName:string,folderName:string,fileStatus:'pending'|'saved'|'error',storageMode:'fsa'|'opfs',reviewed:boolean,lastReviewedMode:'video'|'audio'|'full'|null,timestampedNoteIds:string[]}} RecordingMeta */
/** @typedef {{id:string,recordingId:string,timestampSeconds:number,text:string,createdAt:string}} TimestampedNote */
/** @typedef {{id:string,topicId:string,text:string,createdAt:string,updatedAt:string,open:boolean}} TopicNote */
export const defaults={theme:'system',defaultResearchSeconds:600,defaultSpeakingSeconds:180,storageMode:'opfs',hasRootDirectory:false};
const id=()=>crypto.randomUUID(); const now=()=>new Date().toISOString();
export const createRecordingMeta=(x={})=>({id:id(),topicId:'',createdAt:now(),researchTimeSeconds:600,speakingTimeSeconds:180,actualDurationSeconds:0,fileName:'',folderName:'',fileStatus:'pending',storageMode:'opfs',reviewed:false,lastReviewedMode:null,timestampedNoteIds:[],...x});
export const createTimestampedNote=(x={})=>({id:id(),recordingId:'',timestampSeconds:0,text:'',createdAt:now(),...x});
export const createTopicNote=(x={})=>({id:id(),topicId:'',text:'',createdAt:now(),updatedAt:now(),open:true,...x});
