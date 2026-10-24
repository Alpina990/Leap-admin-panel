"use client";
import {useRef,useState} from 'react';

export type CatalogPrice={product:'catalog_lifetime';amountUzs:number;currency:'UZS';version:number;updatedAt:string|null;updatedBy:string|null;canWrite:boolean};

export function PricePanel({current,csrf,onSaved}:{current?:CatalogPrice;csrf:string;onSaved:(value:CatalogPrice)=>void}){
 const [amount,setAmount]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[passwordReady,setPasswordReady]=useState(false);
 const passwordInput=useRef<HTMLInputElement|null>(null);
 const request=useRef<{fingerprint:string;id:string}|null>(null);
 const parsed=Number(amount.replace(/[\s,_]/g,''));
 const valid=Number.isSafeInteger(parsed)&&parsed>0&&parsed<=100000000&&parsed!==current?.amountUzs&&passwordReady;
 function clearPassword(){if(passwordInput.current)passwordInput.current.value='';setPasswordReady(false);}
 async function save(){
  if(!current||!valid||busy)return;
  setBusy(true);setError('');
  const stable={action:'price',baseVersion:current.version,amountUzs:parsed};
  const fingerprint=JSON.stringify(stable);
  if(request.current?.fingerprint!==fingerprint)request.current={fingerprint,id:crypto.randomUUID()};
  const payload=JSON.stringify({...stable,requestId:request.current.id,password:passwordInput.current?.value??''});
  clearPassword();
  try{
   const response=await fetch('/api/admin/content-price',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-Admin-CSRF':csrf},body:payload,signal:AbortSignal.timeout(12000)});
   const data=await response.json();
   if(response.status===401){if(data.error?.code==='admin_reauthentication_failed'){setError('Joriy administrator paroli noto‘g‘ri. Qayta kiriting.');return;}window.location.replace('/login');return;}
   if(response.status===409){setError('Narx boshqa administrator tomonidan o‘zgartirilgan. Yangilangan narxni tekshirib, qayta urinib ko‘ring.');onSaved(current);return;}
   if(!response.ok){setError(response.status===429?'Juda ko‘p urinish bo‘ldi. Besh daqiqadan keyin qayta urinib ko‘ring.':response.status===403?'Narxni o‘zgartirish uchun ruxsat yo‘q.':'Saqlab bo‘lmadi. Qayta urinib ko‘ring.');return;}
   setAmount('');onSaved(data);
  }catch{setError('Natijani tasdiqlab bo‘lmadi. Shu ma’lumotlar bilan xavfsiz qayta urinib ko‘ring.');}
  finally{clearPassword();setBusy(false);}
 }
 return <div className="pd-price-panel">
  <div className="pd-detail-hero"><span>Yillik kurs narxi</span><strong>{current?`${current.amountUzs.toLocaleString('en-US')} UZS`:'—'}</strong></div>
  {current&&!current.canWrite?<p className="pd-feedback">Narxni o‘zgartirish uchun ruxsat yo‘q.</p>:<>
   <label className="pd-field">Yangi narx (UZS)<input aria-label="Yangi kurs narxi" inputMode="numeric" placeholder={current?String(current.amountUzs):''} value={amount} disabled={busy||!current} onChange={event=>{setAmount(event.target.value.replace(/[^\d\s,_]/g,''));}}/></label>
   <label className="pd-field">Joriy administrator paroli<input ref={passwordInput} aria-label="Joriy administrator paroli" type="password" autoComplete="current-password" maxLength={256} disabled={busy||!current} onChange={event=>{setPasswordReady(event.target.value.length>0&&event.target.value.length<=256);setError('');}}/></label>
   {error&&<p role="alert">{error}</p>}
   <div className="pd-dialog-actions"><button className="pd-button primary" disabled={!valid||busy} onClick={()=>void save()}>{busy?'Saqlanmoqda…':'Narxni saqlash'}</button></div>
  </>}
 </div>;
}
