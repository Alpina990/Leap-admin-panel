"use client";
import {useEffect,useState,type FormEvent} from 'react';
import {useTheme} from 'next-themes';
import {Moon,Sun,RefreshCw,LogOut} from 'lucide-react';
import Link from 'next/link';
import type {AdminSession,AdminOverview,LearnerDirectory} from '@/lib/admin-types';

type Section='Overview'|'Learners'|'Content'|'Commerce'|'Learning'|'Messages';
const sections:Section[]=['Overview','Learners','Content','Commerce','Learning','Messages'];
function useRead<T>(path:string|null,revision:number){
 const key=`${path}:${revision}`;
 const [result,setResult]=useState<{key:string;data?:T;error?:string}>({key:''});
 useEffect(()=>{
  if(!path)return;
  const controller=new AbortController();
  fetch(path,{credentials:'same-origin',cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(12000)])})
   .then(async response=>{
    if(response.status===401){window.location.replace('/login');throw new Error('Session expired.');}
    const body=await response.json();
    if(!response.ok)throw new Error(body.error?.message??'Could not load data.');
    return body as T;
   }).then(data=>{if(!controller.signal.aborted)setResult({key,data});})
   .catch(error=>{if(!controller.signal.aborted)setResult({key,error:error instanceof Error?error.message:'Could not load data.'});});
  return()=>controller.abort();
 },[path,key]);
 return result.key===key?result:{key};
}
export default function Home({session}:{session:AdminSession}){
 const {theme,setTheme}=useTheme();
 const [section,setSection]=useState<Section>('Overview'),[revision,setRevision]=useState(0);
 const [draft,setDraft]=useState(''),[username,setUsername]=useState(''),[offset,setOffset]=useState(0);
 const [logoutError,setLogoutError]=useState(''),[signingOut,setSigningOut]=useState(false);
 const overview=useRead<AdminOverview>(section==='Overview'?'/api/admin/overview':null,revision);
 const query=new URLSearchParams({limit:'25',offset:String(offset)});if(username)query.set('username',username);
 const learners=useRead<LearnerDirectory>(section==='Learners'?'/api/admin/learners?'+query:null,revision);
 const current=section==='Overview'?overview:learners;
 const supported=section==='Overview'||section==='Learners';
 function filter(event:FormEvent){event.preventDefault();setUsername(draft);setOffset(0);setRevision(r=>r+1);}
 async function logout(){
  setSigningOut(true);setLogoutError('');
  try{
   const response=await fetch('/api/admin/logout',{method:'POST',credentials:'same-origin',headers:{'X-Admin-CSRF':session.csrfToken},signal:AbortSignal.timeout(12000)});
   if(response.status===204||response.status===401){window.location.replace('/login');return;}
   throw new Error('Could not sign out. Please retry.');
  }catch(error){setLogoutError(error instanceof Error?error.message:'Could not sign out.');setSigningOut(false);}
 }
 return <div className="admin-shell">
  <header className="admin-topbar admin-panel"><Link href="/" prefetch={false} className="admin-brand"><span className="admin-mark">L</span><span>LEAP English<small>Learning operations</small></span></Link>
   <nav aria-label="Primary navigation">{sections.map(item=><button key={item} className="design-nav" aria-current={section===item?'page':undefined} onClick={()=>setSection(item)}>{item}</button>)}</nav>
   <div className="admin-tools"><button className="nav-icon" aria-label="Toggle light or dark theme" onClick={()=>setTheme(theme==='light'?'dark':'light')}><Sun size={18}/><Moon size={14}/></button><span>{session.admin.username}</span><button className="action" disabled={signingOut} onClick={logout}><LogOut size={16}/>{signingOut?'Signing out…':'Sign out'}</button></div>
  </header>
  <main id="main-content"><div className="admin-heading"><div><p className="admin-eyebrow">WORKSPACE · READ ONLY</p><h1>{section}</h1><p className="admin-muted">{section==='Overview'?'Database totals, not activity or growth.':section==='Learners'?'Authoritative learner directory · ascending numeric Telegram ID.':'Unavailable in this read-only release.'}</p></div>{supported&&<button className="action" onClick={()=>setRevision(r=>r+1)}><RefreshCw size={16}/>Refresh</button>}</div>
   {logoutError&&<p role="alert">{logoutError}</p>}
   {!supported?<section className="admin-panel"><h2>Unavailable</h2><p>{section} tools are not connected to an approved backend contract. No sample data or actions are provided.</p></section>:<>
    {section==='Learners'&&<form className="admin-filter admin-panel" onSubmit={filter}><label>Username — exact, case-sensitive<input value={draft} onChange={e=>setDraft(e.target.value)} maxLength={64} placeholder="Exact username (without @)"/></label><button className="action primary">Apply filter</button><button className="action" type="button" onClick={()=>{setDraft('');setUsername('');setOffset(0);setRevision(r=>r+1);}}>Clear</button></form>}
    {current.error?<section className="admin-panel" role="alert"><h2>Data unavailable</h2><p>{current.error}</p><button className="action" onClick={()=>setRevision(r=>r+1)}>Retry</button></section>:!current.data?<p role="status">Loading {section.toLowerCase()}…</p>:null}
    {section==='Overview'&&overview.data&&<><div className="admin-metrics">{([['Learners',overview.data.learnersTotal],['Courses',overview.data.coursesTotal],['Sections',overview.data.sectionsTotal],['Lessons',overview.data.lessonsTotal]] as const).map(([label,value])=><section className="admin-panel" key={label}><h2>{label}</h2><strong>{value.toLocaleString('en-US')}</strong><p className="admin-muted">Total database records</p></section>)}</div><section className="admin-panel"><h2>What these counts mean</h2><p>Sections include drafts; lessons include unpublished content. Revenue, payments, access, online status, progress, completion and growth analytics are unavailable.</p></section></>}
    {section==='Learners'&&learners.data&&<section className="admin-panel"><div className="admin-heading"><h2>{learners.data.total.toLocaleString('en-US')} matching learners</h2><span className="admin-muted">Last seen is a persisted timestamp, not current presence.</span></div>{learners.data.items.length===0?<p>No learners match this page and filter.</p>:<div className="admin-table-scroll" role="region" aria-label="Learner table, scroll horizontally for all columns" tabIndex={0}><table><caption className="sr-only">Read-only learner directory</caption><thead><tr>{['Telegram ID','Username','First name','Last name','Language','Created at','Last seen at'].map(label=><th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{learners.data.items.map(person=><tr key={person.telegramUserId}><td className="mono">{person.telegramUserId}</td><td>{person.username??'—'}</td><td>{person.firstName??'—'}</td><td>{person.lastName??'—'}</td><td>{person.languageCode??'—'}</td><td><time dateTime={person.createdAt}>{person.createdAt}</time></td><td><time dateTime={person.lastSeenAt}>{person.lastSeenAt}</time></td></tr>)}</tbody></table></div>}<div className="admin-pagination"><button className="action" disabled={offset===0} onClick={()=>setOffset(Math.max(0,offset-25))}>Previous</button><span>Offset {learners.data.offset} · {learners.data.items.length} rows · page size {learners.data.limit}</span><button className="action" disabled={!learners.data.hasMore||offset+25>1000000} onClick={()=>setOffset(offset+25)}>Next</button></div><p className="admin-muted">Rows and totals may change between pages as learners use LEAP.</p></section>}
   </>}
  </main>
 </div>;
}
