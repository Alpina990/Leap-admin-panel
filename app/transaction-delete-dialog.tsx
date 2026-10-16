'use client';
import {useRef,useState} from 'react';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {formatAdminDateTime} from '@/lib/admin-date-time.mjs';
import {money,type Order} from './payments';

export function TransactionDeleteDialog({transaction,csrf,onClose,onDeleted}:{transaction:Order;csrf:string;onClose:()=>void;onDeleted:()=>void}){
 const [reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[conflict,setConflict]=useState(false),[passwordReady,setPasswordReady]=useState(false);
 const passwordInput=useRef<HTMLInputElement|null>(null);
 const request=useRef<{fingerprint:string;id:string}|null>(null);
 const transactionId=transaction.manualTransactionId;
 const baseVersion=transaction.manualTransactionVersion;
 const valid=!!transactionId&&!!baseVersion&&reason.trim().length>=20&&reason.length<=1000&&passwordReady;
 function clearPassword(){if(passwordInput.current)passwordInput.current.value='';setPasswordReady(false);}
 async function remove(){
  if(!valid||busy||!transactionId||!baseVersion)return;
  setBusy(true);setError('');setConflict(false);
  const stable={transactionId,baseVersion,reason:reason.trim()};
  const fingerprint=JSON.stringify(stable);
  if(request.current?.fingerprint!==fingerprint)request.current={fingerprint,id:crypto.randomUUID()};
  const payload=JSON.stringify({...stable,requestId:request.current.id,password:passwordInput.current?.value??''});
  clearPassword();
  try{
   const response=await fetch('/api/admin/business-delete-transaction',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-Admin-CSRF':csrf},body:payload,signal:AbortSignal.timeout(12000)});
   const result=await response.json();
   if(response.status===401){if(result.error?.code==='admin_reauthentication_failed'){setError('Joriy administrator paroli noto‘g‘ri. Qayta kiriting.');return;}window.location.replace('/login');return;}
   if(response.status===409){setConflict(true);return;}
   if(!response.ok){setError(response.status===429?'Juda ko‘p urinish bo‘ldi. Besh daqiqadan keyin qayta urinib ko‘ring.':'Tranzaksiyani o‘chirib bo‘lmadi. Qayta urinib ko‘ring.');return;}
   onDeleted();onClose();
  }catch{setError('Natijani tasdiqlab bo‘lmadi. Shu ma’lumotlar bilan xavfsiz qayta urinib ko‘ring.');}
  finally{clearPassword();setBusy(false);}
 }
 return <Dialog open onOpenChange={value=>{if(!value&&!busy){clearPassword();onClose();}}}>
  <DialogContent className="pd-dialog pd-delete-transaction" showCloseButton={false}>
   <DialogHeader><DialogTitle>Tranzaksiyani o‘chirish</DialogTitle><DialogDescription>Bu amal faqat administrator qo‘lda kiritgan CRM tranzaksiyasiga tegishli.</DialogDescription></DialogHeader>
   <div className="pd-delete-summary"><span>{transaction.id}</span><strong>{money(transaction)}</strong><small>{formatAdminDateTime(transaction.paidAt??transaction.createdAt)}</small></div>
   <p className="pd-feedback pd-delete-warning"><strong>PRO access o‘zgarmaydi.</strong> Faqat xato tranzaksiya to‘lov tarixidan yashiriladi; audit yozuvi va chek saqlanadi.</p>
   {conflict?<p role="alert">Tranzaksiya boshqa administrator tomonidan o‘zgartirilgan. Jadvalni yangilang va qayta tekshiring.</p>:<>
    <label className="pd-field">O‘chirish sababi<textarea aria-label="O‘chirish sababi" required minLength={20} maxLength={1000} disabled={busy} value={reason} onChange={event=>setReason(event.target.value)}/><small>Majburiy: 20–1000 belgi · {reason.trim().length}/1000</small></label>
    <label className="pd-field">Joriy administrator paroli<input ref={passwordInput} aria-label="Joriy administrator paroli" type="password" autoComplete="current-password" required maxLength={256} disabled={busy} onChange={event=>{setPasswordReady(event.target.value.length>0&&event.target.value.length<=256);setError('');}}/><small>Moliyaviy yozuvni o‘chirishni tasdiqlash uchun parolingizni kiriting.</small></label>
   </>}
   {error&&<p role="alert">{error}</p>}
   <div className="pd-dialog-actions"><button className="pd-button" disabled={busy} onClick={()=>{clearPassword();onClose();}}>Bekor qilish</button><button className="pd-button pd-delete-confirm" disabled={!valid||busy||conflict} onClick={()=>void remove()}>{busy?'O‘chirilmoqda…':'Tranzaksiyani o‘chirish'}</button></div>
  </DialogContent>
 </Dialog>;
}
