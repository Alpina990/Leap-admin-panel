'use client';
import {useRef,useState} from 'react';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import type {Withdrawal} from './payments';

const AMOUNT_MAX=1000000000000;

export function WithdrawalEditDialog({withdrawal,csrf,onClose,onSaved}:{withdrawal:Withdrawal;csrf:string;onClose:()=>void;onSaved:()=>void}){
 const [amount,setAmount]=useState(String(withdrawal.amount)),[note,setNote]=useState(withdrawal.note??'');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[conflict,setConflict]=useState(false);
 const request=useRef<{fingerprint:string;id:string}|null>(null);
 const parsed=Number(amount.replace(/[\s,_]/g,''));
 const valid=Number.isSafeInteger(parsed)&&parsed>0&&parsed<=AMOUNT_MAX;
 async function save(){
  if(!valid||busy)return;
  setBusy(true);setError('');setConflict(false);
  const stable={withdrawalId:withdrawal.id,baseVersion:withdrawal.version,amount:parsed,note:note.trim()||null};
  const fingerprint=JSON.stringify(stable);
  if(request.current?.fingerprint!==fingerprint)request.current={fingerprint,id:crypto.randomUUID()};
  try{
   const response=await fetch('/api/admin/business-edit-withdrawal',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-Admin-CSRF':csrf},body:JSON.stringify({...stable,requestId:request.current.id}),signal:AbortSignal.timeout(12000)});
   if(response.status===401){window.location.replace('/login');return;}
   if(response.status===409){setConflict(true);onSaved();return;}
   if(!response.ok){setError(response.status===403?'Ruxsat yo‘q yoki administrator sessiyasi tasdiqlanmadi.':'Saqlab bo‘lmadi. Qayta urinib ko‘ring.');return;}
   onSaved();onClose();
  }catch{setError('Natijani tasdiqlab bo‘lmadi. Shu ma’lumotlar bilan xavfsiz qayta urinib ko‘ring.');}
  finally{setBusy(false);}
 }
 return <Dialog open onOpenChange={value=>{if(!value&&!busy)onClose();}}>
  <DialogContent className="pd-dialog pd-pro-dialog" showCloseButton={false}>
   <DialogHeader><DialogTitle>Yechishni tahrirlash</DialogTitle><DialogDescription>{withdrawal.actor}</DialogDescription></DialogHeader>
   {conflict?<p role="alert">Yechish boshqa administrator tomonidan o‘zgartirilgan. Jadvalni yangilang va qayta urinib ko‘ring.</p>:<>
    <label className="pd-field">Summa (so‘m)<input aria-label="Yechish summasi" inputMode="numeric" value={amount} disabled={busy} onChange={event=>setAmount(event.target.value.replace(/[^\d\s,_]/g,''))}/></label>
    <label className="pd-field">Izoh (ixtiyoriy)<input aria-label="Yechish izohi" maxLength={255} value={note} disabled={busy} onChange={event=>setNote(event.target.value)}/></label>
   </>}
   {error&&<p role="alert">{error}</p>}
   <div className="pd-dialog-actions"><button className="pd-button" disabled={busy} onClick={onClose}>Bekor qilish</button><button className="pd-button primary" disabled={!valid||busy||conflict} onClick={()=>void save()}>{busy?'Saqlanmoqda…':'Saqlash'}</button></div>
  </DialogContent>
 </Dialog>;
}
