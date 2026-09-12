"use client";
import {useState,type FormEvent} from 'react';
export default function Login(){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();const form=event.currentTarget;const data=new FormData(form);setBusy(true);setError('');
  try{
   const response=await fetch('/api/admin/login',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-Admin-CSRF':'login'},body:JSON.stringify({username:data.get('username'),password:data.get('password')}),signal:AbortSignal.timeout(12000)});
   form.reset();
   if(!response.ok){const result=await response.json();throw new Error(result.error?.message??'Sign in failed.');}
   window.location.replace('/');
  }catch(err){setError(err instanceof Error?err.message:'Sign in failed.');setBusy(false);}
 }
 return <main className="admin-login admin-panel"><p className="admin-eyebrow">LEAP ENGLISH · ADMIN</p><h1>Sign in</h1><p>Read-only learning operations. Administrator access only.</p><form onSubmit={submit}><label>Username<input name="username" autoComplete="username" required minLength={3} maxLength={64} pattern="[a-z0-9][a-z0-9_.-]{2,63}" disabled={busy}/></label><label>Password<input name="password" type="password" autoComplete="current-password" required minLength={1} maxLength={256} disabled={busy}/></label>{error&&<p role="alert">{error}</p>}<button className="action primary" disabled={busy}>{busy?'Signing in…':'Sign in'}</button></form><p className="admin-muted">HTTPS is required. Contact your operator for access.</p></main>;
}
