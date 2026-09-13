'use client';
import {useRef,useState} from 'react';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
export type Note={id:string;learnerId:string;actor:string;note:string;createdAt:string};
export function NoteDialog({learnerId,learnerName,csrf,onClose,onViewRecord}:{learnerId:string;learnerName:string;csrf:string;onClose:()=>void;onViewRecord:()=>void}){
 const [text,setText]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState<Note|null>(null),[discard,setDiscard]=useState(false);
 const requestId=useRef<string|null>(null);
 function close(){if(busy)return;if(text&&!saved)setDiscard(true);else onClose();}
 async function save(){
  if(!text.trim()||busy)return;setBusy(true);setError('');requestId.current??=crypto.randomUUID();
  try{
   const response=await fetch('/api/admin/notes',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-Admin-CSRF':csrf},body:JSON.stringify({learnerId,note:text,requestId:requestId.current}),signal:AbortSignal.timeout(12000)});
   if(response.status===401){window.location.replace('/login');return;}
   const result=await response.json();if(!response.ok)throw new Error(result.error?.message??'Note was not saved. Retry with the same request.');
   const check=await fetch('/api/admin/notes?'+new URLSearchParams({learnerId,limit:'100',offset:'0'}),{cache:'no-store',credentials:'same-origin',signal:AbortSignal.timeout(12000)});
   if(!check.ok)throw new Error('Save response received; verification failed. Retry safely to verify the same note.');
   const persisted=(await check.json()).items.find((n:Note)=>n.id===result.id&&n.note===text&&n.learnerId===learnerId);
   if(!persisted)throw new Error('Saved note could not be verified. Retry safely.');setSaved(persisted);
  }catch(e){setError(e instanceof Error?e.message:'Could not save note.');}finally{setBusy(false);}
 }
 return <Dialog open onOpenChange={v=>{if(!v)close();}}><DialogContent className="admin-dialog pencil-dialog"><DialogHeader><DialogTitle>{discard?'Unsaved changes':saved?'Changes saved':'Add internal note'}</DialogTitle><DialogDescription>{discard?'Your note has not been saved.':saved?'The learner record is up to date.':`Private note on ${learnerName}’s record.`}</DialogDescription></DialogHeader>
 {discard?<><p className="pencil-feedback">Discarding removes only this unsaved draft.</p><div className="pencil-dialog-actions"><button onClick={()=>setDiscard(false)}>Keep editing</button><button className="pencil-primary" onClick={onClose}>Discard changes</button></div></>:saved?<><div className="pencil-field">Result<div>{saved.note}</div></div><div className="pencil-field">Audit<div>{saved.actor} · {saved.createdAt}<br/>Learner {saved.learnerId}</div></div><p className="pencil-feedback">Saved and verified in administrator-only history. No message was sent to the learner.</p><div className="pencil-dialog-actions"><button onClick={onClose}>Cancel</button><button className="pencil-primary" onClick={onViewRecord}>View record</button></div></>:<><label className="pencil-field">Note<textarea aria-label="Note" maxLength={2000} required value={text} disabled={busy} onChange={e=>{setText(e.target.value);requestId.current=null;}}/></label><div className="pencil-field">Visibility<div>Administrators only</div></div><p className="pencil-feedback">A saved note appears in learner history and the immutable audit log. Notes cannot be edited or deleted.</p>{error&&<p role="alert">{error}</p>}<div className="pencil-dialog-actions"><button disabled={busy} onClick={close}>Cancel</button><button className="pencil-primary" disabled={busy||!text.trim()} onClick={save}>{busy?'Saving…':'Save note'}</button></div></>}
 </DialogContent></Dialog>;
}
