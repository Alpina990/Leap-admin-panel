"use client";
import {useRef,useState} from 'react';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {type Withdrawal} from './payments';

const AMOUNT_MAX=1000000000000;

export function WithdrawalDialog({csrf,onSaved,onClose}:{csrf:string;onSaved:(value:Withdrawal)=>void;onClose:()=>void}){
 const [amount,setAmount]=useState(''),[note,setNote]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState<Withdrawal|null>(null);
 const request=useRef<{fingerprint:string;id:string}|null>(null);
 const parsed=Number(amount);
 const valid=Number.isSafeInteger(parsed)&&parsed>0&&parsed<=AMOUNT_MAX;
 function buildRequest(){
  const body={amount:parsed,note:note.trim()||null};
  const fingerprint=JSON.stringify(body);
  if(request.current?.fingerprint!==fingerprint)request.current={fingerprint,id:crypto.randomUUID()};
  return {...body,requestId:request.current.id};
 }
 async function save(){
  if(!valid||busy)return;
  setBusy(true);setError('');
  try{
   const response=await fetch('/api/admin/withdrawals',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-Admin-CSRF':csrf},body:JSON.stringify(buildRequest()),signal:AbortSignal.timeout(12000)});
   if(response.status===401){window.location.replace('/login');return;}
   const result=await response.json();
   if(!response.ok)throw new Error(result.error?.message??'Yechish yozilmadi. Qayta urinib ko‘ring.');
   setSaved(result);onSaved(result);
  }catch(e){setError(e instanceof Error?e.message:'Yechish yozilmadi. Qayta urinib ko‘ring.');}
  finally{setBusy(false);}
 }
 return <Dialog open onOpenChange={value=>{if(!value&&!busy)onClose();}}><DialogContent className="pd-dialog" showCloseButton={false}><DialogHeader><DialogTitle>{saved?'Yechish yozildi':'Daromad yechish'}</DialogTitle><DialogDescription>{saved?'Yechib olingan summa daromaddan ayirildi va tranzaksiyalar tarixiga qo‘shildi.':"Yechib olingan summa daromaddan ayirilib, hisobotga kiritiladi."}</DialogDescription></DialogHeader>
  {saved?<><div className="pd-field">Yozilgan yechish<div>{saved.amount.toLocaleString('en-US')} so‘m{saved.note?` · ${saved.note}`:''}</div></div><div className="pd-field">Kim yozdi<div>{saved.actor}</div></div><p className="pd-feedback">Yechish faqat administrator tarixida saqlanadi; to‘lovlar va access o‘zgarmaydi.</p><div className="pd-dialog-actions"><button className="pd-button primary" onClick={onClose}>Yopish</button></div></>:<>
   <label className="pd-field"><span>Summa (so‘m)</span><input aria-label="Yechish summasi" type="number" min={1} step={1} inputMode="numeric" placeholder="1000000" value={amount} disabled={busy} onChange={event=>{setAmount(event.target.value);request.current=null;}}/></label>
   <label className="pd-field"><span>Izoh (ixtiyoriy)</span><input aria-label="Yechish izohi" type="text" maxLength={255} placeholder="Masalan: karta raqamiga, naqd..." value={note} disabled={busy} onChange={event=>{setNote(event.target.value);request.current=null;}}/></label>
   <p className="pd-feedback">Summa so‘mda kiritiladi (tiyin emas) va daromaddan ayiriladi. Yozuv o‘zgartirilmaydi.</p>
   {error&&<p role="alert">{error}</p>}
   <div className="pd-dialog-actions"><button disabled={busy} onClick={onClose}>Bekor qilish</button><button className="pd-button primary" disabled={busy||!valid} onClick={()=>void save()}>{busy?'Saqlanmoqda…':'Saqlash'}</button></div>
  </>}
 </DialogContent></Dialog>;
}
