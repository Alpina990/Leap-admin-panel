'use client';
import {useRef,useState} from 'react';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {formatTashkentDateTimeInput,parseTashkentDateTimeInput} from '@/lib/admin-date-time.mjs';
import type {Order} from './payments';

const providers:[string,string][]=[['card_transfer','Karta orqali'],['hamkorbank_transfer','Hamkorbank o‘tkazmasi'],['payme','Payme'],['click','Click'],['uzum','Uzum'],['paylov','Paylov'],['other','Boshqa provayder…']];

export function TransactionEditDialog({transaction,csrf,onClose,onSaved}:{transaction:Order;csrf:string;onClose:()=>void;onSaved:()=>void}){
 const known=providers.some(([value])=>value===transaction.method&&value!=='other');
 const gross=BigInt(transaction.grossTiyin??transaction.amountTiyin);
 const [init]=useState(()=>({amount:(gross/BigInt(100)).toString(),provider:known?transaction.method:'other',providerName:known?'':(transaction.providerName??''),feePercent:transaction.feeBps?String(transaction.feeBps/100):'',paidAt:formatTashkentDateTimeInput(Date.parse(transaction.paidAt??transaction.createdAt))}));
 const [amount,setAmount]=useState(init.amount),[provider,setProvider]=useState(init.provider),[providerName,setProviderName]=useState(init.providerName),[feePercent,setFeePercent]=useState(init.feePercent),[paidAt,setPaidAt]=useState(init.paidAt);
 const [reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[conflict,setConflict]=useState(false),[passwordReady,setPasswordReady]=useState(false);
 const passwordInput=useRef<HTMLInputElement|null>(null);
 const request=useRef<{fingerprint:string;id:string}|null>(null);
 const cleanAmount=amount.replace(/[\s,_]/g,'');
 const amountValid=/^[1-9]\d{0,13}$/.test(cleanAmount);
 const feeValid=feePercent===''||(/^\d{1,2}(\.\d{1,2})?$/.test(feePercent)&&Number(feePercent)<100);
 const customProvider=provider==='other';
 const nameValid=!customProvider||(providerName.trim().length>=1&&providerName.trim().length<=64);
 const paidAtIso=parseTashkentDateTimeInput(paidAt);
 const feeBps=feePercent&&feeValid?Math.round(Number(feePercent)*100):0;
 const grossTiyin=amountValid?BigInt(cleanAmount)*BigInt(100):BigInt(0);
 const feeTiyin=(grossTiyin*BigInt(feeBps)+BigInt(5000))/BigInt(10000);
 const netSom=Number(grossTiyin-feeTiyin)/100;
 const isManual=transaction.id.startsWith('manual:');
 const baseVersion=transaction.manualTransactionVersion??null;
 const valid=amountValid&&feeValid&&nameValid&&!!paidAtIso&&(!isManual||!!baseVersion)&&reason.trim().length>=20&&reason.length<=1000&&passwordReady;
 function clearPassword(){if(passwordInput.current)passwordInput.current.value='';setPasswordReady(false);}
 async function save(){
  if(!valid||busy||!paidAtIso)return;
  if(Date.parse(paidAtIso)>Date.now()){setError('To‘lov sanasi kelajakda bo‘lishi mumkin emas.');return;}
  setBusy(true);setError('');setConflict(false);
  const stable={transactionId:transaction.id,baseVersion:isManual?baseVersion:null,reason:reason.trim(),amountTiyin:String(grossTiyin),provider,providerName:customProvider?providerName.trim():null,feePercent:feePercent||null,paidAt:paidAtIso};
  const fingerprint=JSON.stringify(stable);
  if(request.current?.fingerprint!==fingerprint)request.current={fingerprint,id:crypto.randomUUID()};
  const payload=JSON.stringify({...stable,requestId:request.current.id,password:passwordInput.current?.value??''});
  clearPassword();
  try{
   const response=await fetch('/api/admin/business-edit-ledger',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-Admin-CSRF':csrf},body:payload,signal:AbortSignal.timeout(12000)});
   const result=await response.json();
   if(response.status===401){if(result.error?.code==='admin_reauthentication_failed'){setError('Joriy administrator paroli noto‘g‘ri. Qayta kiriting.');return;}window.location.replace('/login');return;}
   if(response.status===409){setConflict(true);return;}
   if(!response.ok){setError(response.status===429?'Juda ko‘p urinish bo‘ldi. Besh daqiqadan keyin qayta urinib ko‘ring.':response.status===403?'Ruxsat yo‘q yoki administrator sessiyasi tasdiqlanmadi.':'Saqlab bo‘lmadi. Qayta urinib ko‘ring.');return;}
   onSaved();onClose();
  }catch{setError('Natijani tasdiqlab bo‘lmadi. Shu ma’lumotlar bilan xavfsiz qayta urinib ko‘ring.');}
  finally{clearPassword();setBusy(false);}
 }
 return <Dialog open onOpenChange={value=>{if(!value&&!busy){clearPassword();onClose();}}}>
  <DialogContent className="pd-dialog pd-pro-dialog" showCloseButton={false}>
   <DialogHeader><DialogTitle>Tranzaksiyani tahrirlash</DialogTitle><DialogDescription>{transaction.id}</DialogDescription></DialogHeader>
   {conflict?<p role="alert">Tranzaksiya boshqa administrator tomonidan o‘zgartirilgan. Jadvalni yangilang va qayta urinib ko‘ring.</p>:<>
    <label className="pd-field">To‘lov provayderi<select aria-label="To‘lov provayderi" value={provider} disabled={busy} onChange={event=>setProvider(event.target.value)}>{providers.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    {customProvider&&<label className="pd-field">Provayder nomi<input aria-label="Provayder nomi" maxLength={64} value={providerName} disabled={busy} onChange={event=>setProviderName(event.target.value)}/></label>}
    <label className="pd-field">Pul o‘tkazmasi miqdori<input aria-label="Pul o‘tkazmasi miqdori" inputMode="numeric" value={amount} disabled={busy} onChange={event=>setAmount(event.target.value.replace(/[^\d\s,_]/g,''))}/></label>
    <label className="pd-field">Provayder foizi (ixtiyoriy)<input aria-label="Provayder foizi" inputMode="decimal" placeholder="masalan, 5" value={feePercent} disabled={busy} onChange={event=>setFeePercent(event.target.value.replace(/[^\d.]/g,''))}/>{feePercent&&!feeValid&&<small role="alert">Foiz 0–99.99 oralig‘ida bo‘lishi kerak.</small>}</label>
    {amountValid&&feeBps>0&&feeValid&&<p className="pd-feedback">Komissiya {feeBps/100}% (−{(Number(feeTiyin)/100).toLocaleString('en-US')}) · tushumga qo‘shiladi: {netSom.toLocaleString('en-US')} so‘m</p>}
    <label className="pd-field">To‘lov sanasi va vaqti<input aria-label="To‘lov sanasi va vaqti" type="datetime-local" value={paidAt} max={formatTashkentDateTimeInput()} disabled={busy} onChange={event=>setPaidAt(event.target.value)}/></label>
    <label className="pd-field">Tahrirlash sababi<textarea aria-label="Tahrirlash sababi" required minLength={20} maxLength={1000} disabled={busy} value={reason} onChange={event=>setReason(event.target.value)}/></label>
    <label className="pd-field">Joriy administrator paroli<input ref={passwordInput} aria-label="Joriy administrator paroli" type="password" autoComplete="current-password" required maxLength={256} disabled={busy} onChange={event=>{setPasswordReady(event.target.value.length>0&&event.target.value.length<=256);setError('');}}/></label>
   </>}
   {error&&<p role="alert">{error}</p>}
   <div className="pd-dialog-actions"><button className="pd-button" disabled={busy} onClick={()=>{clearPassword();onClose();}}>Bekor qilish</button><button className="pd-button primary" disabled={!valid||busy||conflict} onClick={()=>void save()}>{busy?'Saqlanmoqda…':'Saqlash'}</button></div>
  </DialogContent>
 </Dialog>;
}
