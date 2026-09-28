"use client";
import {useRef,useState} from 'react';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog';

export type CatalogPrice={product:'catalog_lifetime';amountUzs:number;currency:'UZS';version:number;updatedAt:string|null;updatedBy:string|null;canWrite:boolean};

export function PriceDialog({current,csrf,onSaved,onClose}:{current?:CatalogPrice;csrf:string;onSaved:(value:CatalogPrice)=>void;onClose:()=>void}){
 const [amount,setAmount]=useState(String(current?.amountUzs??''));
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false),[conflict,setConflict]=useState(false);
 const request=useRef<{fingerprint:string;id:string}|null>(null);
 const parsed=Number(amount);
 const valid=Number.isSafeInteger(parsed)&&parsed>0&&parsed<=100000000;
 async function save(){
  if(!current||!valid)return;
  setBusy(true);setError('');
  const body={action:'price',requestId:'',baseVersion:current.version,amountUzs:parsed};
  const fingerprint=JSON.stringify({...body,requestId:undefined});
  if(request.current?.fingerprint!==fingerprint)request.current={fingerprint,id:crypto.randomUUID()};
  body.requestId=request.current.id;
  try{
   const response=await fetch('/api/admin/content-price',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-Admin-CSRF':csrf},body:JSON.stringify(body),signal:AbortSignal.timeout(12000)});
   if(response.status===401){window.location.replace('/login');return;}
   const data=await response.json();
   if(response.status===409){setConflict(true);return;}
   if(!response.ok)throw new Error(data.error?.message??'Price update failed.');
   onSaved(data);setSaved(true);
  }catch(e){setError(e instanceof Error?e.message:'Price update failed.');}
  finally{setBusy(false);}
 }
 const display=saved?'Price updated':conflict?'Price changed elsewhere':'Course price';
 return <Dialog open onOpenChange={v=>{if(!v&&!busy)onClose();}}><DialogContent className="pd-dialog" showCloseButton={false}><DialogHeader><DialogTitle>{display}</DialogTitle><DialogDescription>{saved?'The Mini App will read this price automatically.':conflict?'Another administrator changed the price. Close this dialog, reload, and retry.':'One-year course access price in UZS. Changes are version checked and audited.'}</DialogDescription></DialogHeader>
  {saved||conflict?null:<><div className="pd-field">Current price<div>{current?`${current.amountUzs.toLocaleString('en-US')} UZS`:'Unavailable'}</div></div><label className="pd-field">New price (UZS)<input aria-label="New course price" type="number" min={1} max={100000000} step={1000} value={amount} disabled={busy} onChange={e=>setAmount(e.target.value)}/></label></>}
  {error&&<p role="alert">{error}</p>}
  {!current?.canWrite&&!saved&&!conflict&&<p>Content writing permission required.</p>}
  <div className="pd-dialog-actions">{saved||conflict?<button className="pd-button primary" onClick={onClose}>Return to content</button>:<><button disabled={busy} onClick={onClose}>Cancel</button><button className="pd-button primary" disabled={busy||!current?.canWrite||!valid} onClick={()=>void save()}>{busy?'Saving…':'Save price'}</button></>}</div>
 </DialogContent></Dialog>;
}
