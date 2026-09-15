'use client';
import {useEffect,useRef,useState} from 'react';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
export type BusinessMode='Manage access'|'Reconcile case'|'Learning intervention';
type Permissions={canGrantCatalogAccess:boolean;canCloseReconciliation:boolean;canCreateIntervention:boolean};
type LearnerState={learnerId:string;accessState:'lifetime'|'no_access';accessVersion:number;accessOverride:boolean;catalogGrant:null|{version:number;revokedAt:string|null;grantedAt:string};followUpVersion:number;permissions:Permissions};
type Case={id:string;learnerId:string;orderId:string|null;status:string;issue:string;version:number;closureNote:string|null};
type Page={items:Case[];total:number;limit:number;offset:number;hasMore:boolean};
export function BusinessDialog({mode,learnerId,learnerName,csrf,onClose,onSaved}:{mode:BusinessMode;learnerId?:string;learnerName?:string;csrf:string;onClose:()=>void;onSaved?:()=>void}){
 const [state,setState]=useState<LearnerState|null>(null),[permissions,setPermissions]=useState<Permissions|null>(null),[page,setPage]=useState<Page|null>(null),[selected,setSelected]=useState<Case|null>(null);
 const [reason,setReason]=useState(''),[title,setTitle]=useState(''),[due,setDue]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[conflict,setConflict]=useState(false),[discard,setDiscard]=useState(false),[confirm,setConfirm]=useState(false),[saved,setSaved]=useState(false);
 const [offset,setOffset]=useState(0),[reload,setReload]=useState(0);
 const [access,setAccess]=useState<'lifetime'|'no_access'>('lifetime'),[passwordReady,setPasswordReady]=useState(false);
 const passwordInput=useRef<HTMLInputElement|null>(null);
 function clearPassword(){if(passwordInput.current)passwordInput.current.value='';setPasswordReady(false);}
 useEffect(()=>()=>{if(passwordInput.current)passwordInput.current.value='';},[]);
 const request=useRef<{fingerprint:string;id:string}|null>(null);
 const dirty=!!(reason||title||due)&&!saved;
 useEffect(()=>{if(!dirty)return;const guard=(e:BeforeUnloadEvent)=>e.preventDefault();window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);},[dirty]);
 useEffect(()=>{const controller=new AbortController();let active=true;
  async function read(path:string){const response=await fetch('/api/admin/'+path,{credentials:'same-origin',cache:'no-store',signal:controller.signal});if(response.status===401){window.location.replace('/login');throw new Error('Sign in required.');}const data=await response.json();if(!response.ok)throw new Error('Could not load records.');return data;}
  async function load(){try{if(mode==='Reconcile case'){const [cases,permission]=await Promise.all([read('business-cases?'+new URLSearchParams({limit:'25',offset:String(offset)})),read('business-permissions')]);if(active){setPage(cases);setPermissions(permission);setSelected(null);}}else{if(!learnerId)throw new Error('Select a learner first.');const result=await read('business-state?'+new URLSearchParams({learnerId}));if(active){setState(result);setPermissions(result.permissions);}}}catch{if(active)setError('Could not load records.');}finally{if(active)setLoading(false);}}
  void load();return()=>{active=false;controller.abort();};
 },[mode,learnerId,offset,reload]);
 function close(){if(busy)return;clearPassword();if(dirty)setDiscard(true);else onClose();}
 function refresh(){clearPassword();setState(null);setPermissions(null);setLoading(true);setError('');setConflict(false);setConfirm(false);request.current=null;setReload(v=>v+1);}
 const allowed=mode==='Manage access'?permissions?.canGrantCatalogAccess:mode==='Reconcile case'?permissions?.canCloseReconciliation:permissions?.canCreateIntervention;
 const activeGrant=state?.accessState==='lifetime'&&!state.accessOverride;
 const revoking=mode==='Manage access'&&access==='no_access';
 const valid=reason.trim().length>=20&&reason.length<=1000&&(mode!=='Learning intervention'||title.trim().length>=3)&&(mode!=='Reconcile case'||!!selected)&&(mode!=='Manage access'||!!state&&(revoking?!state.accessOverride:!activeGrant));
 async function save(){if(!confirm||!valid||!allowed||busy||(revoking&&!passwordReady))return;setBusy(true);setError('');
  const body:Record<string,unknown>=mode==='Reconcile case'?{caseId:selected!.id,baseVersion:selected!.version,note:reason}:mode==='Manage access'?{learnerId,baseVersion:state!.accessVersion,reason}:{learnerId,baseVersion:state!.followUpVersion,reason,taskTitle:title,dueAt:due?new Date(due).toISOString():null};
  const action=mode==='Manage access'?(revoking?'business-revoke':'business-grant'):mode==='Reconcile case'?'business-close':'business-intervention';
  // Idempotency identity deliberately excludes the write-only password.
  const fingerprint=JSON.stringify({action,...body});if(request.current?.fingerprint!==fingerprint)request.current={fingerprint,id:crypto.randomUUID()};body.requestId=request.current.id;
  if(revoking)body.password=passwordInput.current?.value??'';
  const payload=JSON.stringify(body);delete body.password;clearPassword();
  try{
   const response=await fetch('/api/admin/'+action,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-Admin-CSRF':csrf},body:payload,signal:AbortSignal.timeout(12000)});
   const result=await response.json();
   if(response.status===401){if(result.error?.code==='admin_reauthentication_failed'){setError('Current administrator password is incorrect. Enter it again.');return;}window.location.replace('/login');return;}
   if(response.status===409){setConflict(true);setConfirm(false);return;}
   if(!response.ok){setError(response.status===429?'Too many attempts. Wait five minutes before retrying.':response.status===403?'Permission denied or session verification failed. Reload before retrying.':'Could not save. Review and retry the same request safely.');return;}
   setSaved(true);setConfirm(false);setLoading(true);setReload(v=>v+1);onSaved?.();
  }catch{setError('Could not confirm the result. Retry the same request safely or reload the record.');}finally{clearPassword();setBusy(false);}
 }
 const heading=discard?'Unsaved changes':saved?'Changes saved':conflict?'Record changed':confirm?(mode==='Manage access'?'Confirm access change':mode==='Reconcile case'?'Resolve discrepancy':'Confirm intervention'):mode;
 return <Dialog open onOpenChange={v=>{if(!v)close();}}><DialogContent className="admin-dialog pencil-dialog"><DialogHeader><DialogTitle>{heading}</DialogTitle><DialogDescription>{discard?'Your draft has not been saved.':saved?'The change was committed with an immutable audit record.':conflict?'This record changed. Reload the current version before reviewing and submitting again.':mode==='Manage access'?`Catalog access for ${learnerName??learnerId??'the selected learner'}.`:mode==='Reconcile case'?'Review payment and entitlement discrepancies.':'Create an internal note and a follow-up task.'}</DialogDescription></DialogHeader>
 {discard?<><p className="pencil-feedback">Discarding removes only this unsaved draft.</p><div className="pencil-dialog-actions"><button onClick={()=>setDiscard(false)}>Keep editing</button><button className="pencil-primary" onClick={onClose}>Discard changes</button></div></>:saved?<>{loading?<p role="status">Verifying current record…</p>:error?<p role="alert">Change committed. {error} Retry verification before making another change.</p>:<p className="pencil-feedback">{mode==='Manage access'?(state?.accessOverride?'No access blocks even paid access. The first 3 Foundation lessons remain free. Payment and progress history were preserved.':'Lifetime access covers the whole catalog. Existing paid section entitlements were preserved.'):mode==='Reconcile case'?'The case is closed. Payment status and entitlements were preserved.':'The internal note and follow-up task were saved. No outbound message was sent.'}</p>}<div className="pencil-dialog-actions">{error&&<button disabled={loading} onClick={refresh}>Retry verification</button>}<button className="pencil-primary" onClick={onClose}>Done</button></div></>:conflict?<div className="pencil-dialog-actions"><button onClick={close}>Cancel</button><button className="pencil-primary" onClick={refresh}>Reload record</button></div>:<>
 {loading?<p role="status">Loading records…</p>:<>
 {mode==='Reconcile case'&&!confirm&&<><div className="pencil-field">Open cases{page?.items.length?<div>{page.items.map(item=><button aria-pressed={selected?.id===item.id} key={item.id} disabled={busy} onClick={()=>setSelected(item)}>{item.id} · Learner {item.learnerId}<br/>{item.issue}</button>)}</div>:<div>No open discrepancies.</div>}</div>{page&&<div className="pencil-dialog-actions"><button disabled={busy||offset===0} onClick={()=>{setLoading(true);setOffset(Math.max(0,offset-25));}}>Previous</button><span>{page.total} cases</span><button disabled={busy||!page.hasMore} onClick={()=>{setLoading(true);setOffset(offset+25);}}>Next</button></div>}</>}
 {mode==='Manage access'&&<><label className="pencil-field">Access<select aria-label="Access" value={access} disabled={busy||confirm} onChange={e=>{clearPassword();setAccess(e.target.value as 'lifetime'|'no_access');setError('');}}><option value="lifetime">Lifetime</option><option value="no_access">No access</option></select></label><p className="pencil-feedback">{revoking?'No access blocks even paid access, including future payments. The first 3 Foundation lessons remain free. Payment and progress history are preserved.':'Lifetime covers the whole catalog, including future content, and clears any No access override. Existing paid section entitlements are preserved.'}</p>{confirm&&revoking&&<label className="pencil-field">Current administrator password<input ref={passwordInput} aria-label="Current administrator password" type="password" autoComplete="current-password" required maxLength={256} disabled={busy} onChange={e=>setPasswordReady(e.target.value.length>0&&e.target.value.length<=256)}/><small>Confirm with your own current administrator login password.</small></label>}</>}
 {mode==='Reconcile case'&&selected&&<div className="pencil-field">Selected case<div>{selected.id}<br/>{selected.issue}<br/>Learner {selected.learnerId}</div></div>}
 {mode==='Learning intervention'&&<><label className="pencil-field">Follow-up task<input aria-label="Follow-up task" required minLength={3} maxLength={180} disabled={busy||confirm} value={title} onChange={e=>setTitle(e.target.value)}/></label><label className="pencil-field">Due date (optional)<input aria-label="Due date (optional)" type="datetime-local" disabled={busy||confirm} value={due} onChange={e=>setDue(e.target.value)}/></label><p className="pencil-feedback">Administrators only. No learner notification is sent.</p></>}
 {<label className="pencil-field">{mode==='Reconcile case'?'Closure note':'Reason'}<textarea aria-label={mode==='Reconcile case'?'Closure note':'Reason'} required minLength={20} maxLength={1000} disabled={busy||confirm} value={reason} onChange={e=>setReason(e.target.value)}/><small>Required: 20–1000 characters. {reason.trim().length}/1000</small></label>}
 {mode==='Reconcile case'&&<p className="pencil-feedback">Closing a case records your explanation. Payment status and access are not changed.</p>}
 {permissions&&!allowed&&<p role="status">Permission for this business operation is required.</p>}
 </>}
 {error&&<p role="alert">{error}</p>}<div className="pencil-dialog-actions"><button disabled={busy} onClick={confirm?()=>{clearPassword();setConfirm(false);}:close}>{confirm?'Back':'Cancel'}</button>{error&&!state&&!page?<button className="pencil-primary" disabled={loading} onClick={refresh}>Retry</button>:<button className="pencil-primary" disabled={loading||busy||!allowed||!valid||(confirm&&revoking&&!passwordReady)} onClick={confirm?()=>void save():()=>setConfirm(true)}>{busy?'Saving…':confirm?(mode==='Manage access'?(revoking?'Set No access':'Grant lifetime access'):mode==='Reconcile case'?'Close case':'Save intervention'):'Review change'}</button>}</div>
 </>}
 </DialogContent></Dialog>;
}
