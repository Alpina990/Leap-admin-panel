"use client";
import {createElement,useEffect,useState,type ReactNode,type FormEvent} from 'react';
import {useTheme} from 'next-themes';
import {ContentDialog,type ContentMode,type ContentUnit,type ContentDetail,type ContentLesson} from './content-dialog';
import {BusinessDialog} from './business-dialog';
import {DailyChart,ActivityDialog,analyticsValues,type Summary,type Learning,type LearnerAnalytics} from './analytics';
import {ReportingDialog,type ReportingResource} from './reporting-dialog';
import {NoteDialog,type Note} from './note-dialog';
import {OrderList,PaymentFacts,type Orders,type Payment} from './payments';
import {PencilNavigation} from './pencil-navigation';
import {readState} from '@/lib/read-state.mjs';
import workflowCards from '@/lib/pencil-dialogs.json';
import {Search,RefreshCw} from 'lucide-react';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import type {AdminSession,AdminOverview,Learner,LearnerDirectory} from '@/lib/admin-types';
import design from '../archive/legacy/app/design.json';
import {adaptDesign,indexDesign,routes} from '@/lib/design-adapter.mjs';

type Notification={id:string;learnerId:string;kind:string;title:string;body:string;actionPath:string|null;createdAt:string;readAt:string|null};
type N={tag:string;attrs:Record<string,string>;children:(N|string)[]};
type Section=keyof typeof routes;
const screens=Object.fromEntries(Object.entries(design).map(([key,node])=>[key,adaptDesign(node)])) as Record<string,N>;
const indexes=Object.fromEntries(Object.entries(screens).map(([key,node])=>[key,indexDesign(node)])) as Record<string,Record<string,N>>;
const unavailable='Unavailable: the read-only API does not provide this data or action.';
const chartNames=new Set(['Weekly Completion Chart','Revenue Trend Chart','Weekly Activity Bars','Payment Mix Segments']);
function useRead<T>(path:string|null,revision:number){
 const key=`${path}:${revision}`;
 const [result,setResult]=useState<{key:string;path?:string;data?:T;error?:string;syncedAt?:string}>({key:''});
 useEffect(()=>{
  if(!path)return;
  const controller=new AbortController();
  fetch(path,{credentials:'same-origin',cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(12000)])})
   .then(async response=>{
    if(response.status===401){setResult({key,path,error:'Session expired.'});window.location.replace('/login');throw new Error('Session expired.');}
    const body=await response.json();
    if(!response.ok)throw new Error(body.error?.message??'Could not load data.');
    return body as T;
   }).then(data=>{if(!controller.signal.aborted)setResult({key,path,data,syncedAt:new Date().toISOString()});})
   .catch(error=>{if(!controller.signal.aborted)setResult(previous=>({key,path,...(previous.path===path?{data:previous.data,syncedAt:previous.syncedAt}:{}),error:error instanceof Error?error.message:'Could not load data.'}));});
  return()=>controller.abort();
 },[path,key]);
 return readState(result,path,revision) as {key:string;data?:T;error?:string;loading:boolean;syncedAt?:string};
}
const personName=(p:Learner)=>[p.firstName,p.lastName].filter(Boolean).join(' ')||p.username||p.telegramUserId;
const initials=(p:Learner)=>[p.firstName,p.lastName].filter(Boolean).map(s=>s!.slice(0,1)).join('')||'—';
export default function Home({session}:{session:AdminSession}){
 const {resolvedTheme,setTheme}=useTheme();
 const [returnFocus,setReturnFocus]=useState<HTMLElement|null>(null);
 const [themeReady,setThemeReady]=useState(false);
 const [section,setSection]=useState<Section>('Overview'),[revision,setRevision]=useState(0);
 const [draft,setDraft]=useState(''),[username,setUsername]=useState(''),[offset,setOffset]=useState(0),[selected,setSelected]=useState<string|null>(null);
 const [mobileDetail,setMobileDetail]=useState(false),[modal,setModal]=useState<'settings'|'account'|'profile'|'search'|null>(null);
 const [contentMode,setContentMode]=useState<ContentMode|null>(null),[unitId,setUnitId]=useState<string|null>(null),[lessonId,setLessonId]=useState<string|null>(null),[catalogOffset,setCatalogOffset]=useState(0),[lessonOffset,setLessonOffset]=useState(0);
 const catalog=useRead<{items:ContentUnit[];total:number;hasMore:boolean;canWrite:boolean}>(section==='Content'?'/api/admin/content-catalog?limit=25&offset='+catalogOffset:null,revision);
 const activeUnit=catalog.data?.items.find(u=>u.id===unitId)?.id??catalog.data?.items[0]?.id??null;
 const lessons=useRead<{items:ContentLesson[];total:number;hasMore:boolean}>(section==='Content'&&activeUnit?'/api/admin/content-lessons?'+new URLSearchParams({unitId:activeUnit,limit:'25',offset:String(lessonOffset)}):null,revision);
 const activeLesson=lessons.data?.items.find(l=>l.id===lessonId)?.id??lessons.data?.items[0]?.id??null;
 const contentDetail=useRead<ContentDetail>(section==='Content'&&activeLesson?'/api/admin/content-lesson?'+new URLSearchParams({lessonId:activeLesson}):null,revision);
 const [reporting,setReporting]=useState<'Date range'|'Sort & paginate'|'Export report'|null>(null);
 const [businessLearner,setBusinessLearner]=useState<string|undefined>();
 const [cohort,setCohort]=useState('all'),[cohortOpen,setCohortOpen]=useState(false),[cohortDraft,setCohortDraft]=useState('all'),[activityQuery,setActivityQuery]=useState<string|null>(null);
 const [business,setBusiness]=useState<'Manage access'|'Reconcile case'|'Learning intervention'|null>(null);
 const [reportFilters,setReportFilters]=useState<Record<string,Record<string,string>>>({});
 const [dateRange,setDateRange]=useState<Record<string,string>>({});
 const summary=useRead<Summary>('/api/admin/analytics-summary?'+new URLSearchParams(dateRange),revision);
 const learning=useRead<Learning>(section==='Learning'?'/api/admin/analytics-learning?'+new URLSearchParams({...dateRange,cohort}):null,revision);
 const [notificationOffset,setNotificationOffset]=useState(0),[notificationId,setNotificationId]=useState<string|null>(null);
 const notifications=useRead<{items:Notification[];total:number;hasMore:boolean}>(section==='Messages'?'/api/admin/notifications?'+new URLSearchParams({limit:'25',offset:String(notificationOffset),...dateRange,...reportFilters.notifications}):null,revision);
 const notification=useRead<Notification>(notificationId?'/api/admin/notification?'+new URLSearchParams({notificationId}):null,revision);
 const [noteOffset,setNoteOffset]=useState(0);
 const [noteTarget,setNoteTarget]=useState<Learner|null>(null);
 const [commerceTab,setCommerceTab]=useState<'learners'|'transactions'>('learners');
 const [orderOffset,setOrderOffset]=useState(0),[orderId,setOrderId]=useState<string|null>(null);
 const [paymentStatus,setPaymentStatus]=useState(''),[paymentMethod,setPaymentMethod]=useState(''),[paymentFilter,setPaymentFilter]=useState(false),[statusDraft,setStatusDraft]=useState(''),[methodDraft,setMethodDraft]=useState('');
 useEffect(()=>{if(mobileDetail&&commerceTab==='transactions'&&window.innerWidth<768){const frame=requestAnimationFrame(()=>document.querySelector('[data-pencil-name="Selected Payment Detail"]')?.scrollIntoView({block:'start'}));return()=>cancelAnimationFrame(frame);}},[mobileDetail,commerceTab]);
 const [workflow,setWorkflow]=useState<keyof typeof workflowCards|null>(null);
 const [logoutError,setLogoutError]=useState(''),[signingOut,setSigningOut]=useState(false);
 const [globalDraft,setGlobalDraft]=useState(''),[globalQuery,setGlobalQuery]=useState<string|null>(null),[searchRevision,setSearchRevision]=useState(0);
 const [autoRefresh,setAutoRefresh]=useState(false),[preferenceTheme,setPreferenceTheme]=useState('light'),[preferenceRefresh,setPreferenceRefresh]=useState(false),[preferenceError,setPreferenceError]=useState('');
 useEffect(()=>{queueMicrotask(()=>{try{setAutoRefresh(localStorage.getItem('leap-auto-refresh')==='true');}catch{}});},[]);
 useEffect(()=>{if(!autoRefresh)return;const timer=setInterval(()=>{if(document.visibilityState==='visible')setRevision(r=>r+1);},60000);return()=>clearInterval(timer);},[autoRefresh]);
 const globalResults=useRead<LearnerDirectory>(modal==='search'&&globalQuery?'/api/admin/learners?'+new URLSearchParams({limit:'25',offset:'0',username:globalQuery}):null,searchRevision);
 function openModal(value:'settings'|'account'|'search'){setReturnFocus(document.activeElement as HTMLElement);if(value==='settings'){setPreferenceTheme(isLight?'light':'dark');setPreferenceRefresh(autoRefresh);setPreferenceError('');}if(value==='search'){setGlobalDraft('');setGlobalQuery(null);}setModal(value);}
 function savePreferences(){try{localStorage.setItem('leap-auto-refresh',String(preferenceRefresh));setAutoRefresh(preferenceRefresh);setTheme(preferenceTheme);setModal(null);}catch{setPreferenceError('Device storage is unavailable. Preferences were not saved.');}}
 const overview=useRead<AdminOverview>('/api/admin/overview',revision);
 const query=new URLSearchParams({limit:'25',offset:String(offset),...dateRange,...reportFilters.learners});if(username)query.set('username',username);
 const directory=useRead<LearnerDirectory>(['Overview','Learners','Commerce'].includes(section)?'/api/admin/learners?'+query:null,revision);
 const people=directory.data?.items??[];
 const ordersQuery=new URLSearchParams({limit:'25',offset:String(orderOffset),...dateRange,...reportFilters.payments});if(paymentStatus)ordersQuery.set('status',paymentStatus);if(paymentMethod)ordersQuery.set('method',paymentMethod);
 const orders=useRead<Orders>(section==='Commerce'&&commerceTab==='transactions'?'/api/admin/payments?'+ordersQuery:null,revision);
 const activeOrder=orders.data?.items.find(o=>o.id===orderId)?.id??orders.data?.items[0]?.id??null;
 const payment=useRead<Payment>(activeOrder?'/api/admin/payment?'+new URLSearchParams({orderId:activeOrder}):null,revision);
 const person=people.find(p=>p.telegramUserId===selected)??people[0];
 const learnerAnalytics=useRead<LearnerAnalytics>(person?'/api/admin/analytics-learner?'+new URLSearchParams({learnerId:person.telegramUserId}):null,revision);
 const noteHistory=useRead<{items:Note[];total:number;hasMore:boolean}>(modal==='profile'&&person?'/api/admin/notes?'+new URLSearchParams({learnerId:person.telegramUserId,limit:'25',offset:String(noteOffset)}):null,revision);
 const reportResource:ReportingResource=section==='Messages'?'notifications':section==='Commerce'&&commerceTab==='transactions'?'payments':'learners';
 const reportQuery=reportResource==='notifications'?new URLSearchParams({limit:'25',offset:String(notificationOffset),...dateRange,...reportFilters.notifications}):reportResource==='payments'?ordersQuery:query;
 const byName=indexes[routes[section]];
 const isLight=themeReady&&resolvedTheme==='light';
 useEffect(()=>{
  const hash=()=>{const route=Object.keys(routes).find(k=>k.toLowerCase()===location.hash.slice(1).split('/')[0]) as Section|undefined;if(route){setSection(route);setOffset(0);setUsername('');setDraft('');setSelected(null);setMobileDetail(false);}};
  queueMicrotask(()=>{setThemeReady(true);hash();});addEventListener('hashchange',hash);return()=>removeEventListener('hashchange',hash);
 },[]);
 function go(route:Section){setSection(route);setOffset(0);setUsername('');setDraft('');setSelected(null);setMobileDetail(false);history.pushState(null,'','#'+route.toLowerCase());window.scrollTo({top:0});}
 function filter(event:FormEvent){event.preventDefault();setUsername(draft);setOffset(0);setSelected(null);setRevision(r=>r+1);}
 function clear(){setDraft('');setUsername('');setOffset(0);setSelected(null);setRevision(r=>r+1);}
 function select(p:Learner){setSelected(p.telegramUserId);setMobileDetail(true);}
 function openSelectedLearner(){setSection('Learners');setMobileDetail(false);history.pushState(null,'','#learners');window.scrollTo({top:0});}
 async function logout(){
  setSigningOut(true);setLogoutError('');
  try{
   const response=await fetch('/api/admin/logout',{method:'POST',credentials:'same-origin',headers:{'X-Admin-CSRF':session.csrfToken},signal:AbortSignal.timeout(12000)});
   if(response.status===204||response.status===401){window.location.replace('/login');return;}
   throw new Error('Could not sign out. Please retry.');
  }catch(error){setLogoutError(error instanceof Error?error.message:'Could not sign out.');setSigningOut(false);}
 }
 const values:Record<string,string>={
  'Date Range Label':dateRange.start||dateRange.end?`${dateRange.start||'Beginning'} – ${dateRange.end||'Present'} UTC`:'All dates',
  'Financial Date Filter Label':dateRange.start||dateRange.end?`${dateRange.start||'Beginning'} – ${dateRange.end||'Present'} UTC`:'All dates',
  'Publish Lesson Label':'Publish lesson','Save Lesson Label':'Reorder blocks',
  'Payment Status Filter Label':`Status: ${paymentStatus||'All'}`,
  'Payment Method Filter Label':`Method: ${paymentMethod||'All'}`,
  'Admin Initials':session.admin.username.slice(0,2).toUpperCase(),
  'Recent Learners Title':'Learners','Learner Count':overview.data?.learnersTotal.toLocaleString('en-US')??'—',
  'Registered Learners Metric Value':overview.data?.learnersTotal.toLocaleString('en-US')??'—',
  'Registered Learners Metric Delta':'Total records',
  'Learner Directory List Title':directory.data?`${directory.data.total} matching learners`:'Learners',
  'Learner Directory Sort':`${reportFilters.learners?.sort??'Telegram ID'} ${reportFilters.learners?.direction==='desc'?'↓':'↑'}`,
  'Individual Finance Count Label':directory.data?`${directory.data.total} learner records`:'—',
  'Learning Pulse Title':'Learners are moving',
  'Learning Pulse Description':'Saved lesson completions in the selected period.',
  'Learners Subtitle':'Identity, catalog access and saved learning progress.',
  'Content Subtitle':'Persisted catalog and audited draft authoring. Published lessons are protected from in-place edits.',
  'Messages Subtitle':'Mini App inbox records; Telegram delivery receipts are unavailable.',
  'Lesson Editor Title':contentDetail.data?.lesson.title??'Select a lesson','Lesson Editor Meta':contentDetail.data?`${contentDetail.data.lesson.slug} · position ${contentDetail.data.lesson.position}`:'—','Lesson Draft Badge Label':contentDetail.data?.lesson.status??'—','Lesson Autosave':'Explicit save · audited','Publish Blocker Title':contentDetail.data?.issues.length?'Publication blocked':'Readiness','Publish Blocker Copy':contentDetail.data?.issues.join(' ')||'Review saved content before publishing.',
  'Learner Attention Rule Copy':'Access changes and follow-up tasks require a reason and an audit record.',
  'Learner Attention Updated':'Attention signals unavailable',
  'Content Catalog Title':'Content catalog',
  'Selected Message Title':'No event data available','Message Preview Body':'Message contents unavailable.',
  'Message EventCount':'—','Message Event Retention':'Event history unavailable',
  'Selected Learner Profile Name':person?personName(person):'No learner selected',
  'Learner Detail Name':person?personName(person):'No learner selected',
  'Selected Learner Name':person?personName(person):'No learner selected',
  'Selected Learner Profile Initials':person?initials(person):'—',
  'Selected Learner Avatar Initials':person?initials(person):'—',
  'Selected Learner Profile Meta':person?`${person.username?'@'+person.username:'No username'} · ID ${person.telegramUserId}`:'—',
  'Selected Learner Handle':person?`${person.username?'@'+person.username:'No username'} · Telegram ${person.telegramUserId}`:'—',
 };
 Object.assign(values,analyticsValues(summary.data,learning.data,learnerAnalytics.data));
 values['Learning Cohort Label']=cohort==='all'?'All cohorts':cohort==='new'?'New learners':'Returning learners';
 values['Learning Date Label']=summary.data?summary.data.period.start+' – '+summary.data.period.end:'Last 30 days';
 const refresh=<button className="action" onClick={()=>setRevision(r=>r+1)}><RefreshCw size={14}/>Refresh data</button>;
 function pager(){return <div className="pager"><button className="action" disabled={offset===0||!directory.data||directory.loading} onClick={()=>{setOffset(Math.max(0,offset-25));setSelected(null);}}>Previous</button><span>{directory.data?`Offset ${directory.data.offset} · ${directory.data.items.length} rows · page size ${directory.data.limit}`:directory.error?'Page data unavailable':'Loading page…'}</span><button className="action" disabled={!directory.data?.hasMore||directory.loading||offset+25>1000000} onClick={()=>{setOffset(offset+25);setSelected(null);}}>Next</button></div>;}
 function state(){return directory.error?<div className="pencil-data-state error" role="alert"><strong>Refresh failed</strong><p>The latest records could not be loaded.</p><dl><dt>Connection</dt><dd>{directory.error}</dd><dt>Last successful sync</dt><dd>{directory.syncedAt??'Not yet loaded'}</dd></dl><p>{directory.data?'Previously loaded records remain visible.':'No previous records are available.'}</p><button className="action" onClick={()=>setRevision(r=>r+1)}>Retry</button></div>:directory.loading?<div className="pencil-data-state" role="status"><strong>Data is updating</strong><p>Loading summary and records…</p>{!directory.data&&<div className="pencil-skeleton" aria-hidden="true"><i/><i/><i/></div>}</div>:directory.data&&people.length===0?<div className="pencil-data-state" role="status"><strong>No results</strong><p>No learner matches your current search.</p><dl><dt>Search / filters</dt><dd>{username||'All learners'} · Offset {offset}</dd><dt>Result</dt><dd>0 matching learners on this page</dd></dl><p>Clear the query or broaden the filters.</p><button className="action" onClick={clear}>Clear filters</button></div>:null;}
 function search(){return <form className="readonly-search" onSubmit={filter}><label className="search-box"><Search size={15}/><input aria-label="Username — exact, case-sensitive" placeholder="Exact username (without @)" maxLength={64} value={draft} onChange={e=>setDraft(e.target.value)}/></label><button className="action">Apply filter</button><button type="button" className="action" onClick={clear}>Clear</button></form>;}
 function facts(){return person?<dl className="readonly-facts">{[['Telegram ID',person.telegramUserId],['Username',person.username],['First name',person.firstName],['Last name',person.lastName],['Language',person.languageCode],['Created at',person.createdAt],['Last seen at',person.lastSeenAt]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value??'—'}</dd></div>)}<p>Last seen is a persisted timestamp, not current presence.</p></dl>:<p>No learner selected.</p>;}
 function render(n:N|string,ctx:{person?:Learner;notification?:Notification;insideButton?:boolean}={}):ReactNode{
  if(typeof n==='string')return n;
  const name=n.attrs['data-pencil-name']??'',id=n.attrs['data-pencil-id'];
  let tag=n.tag;let content:ReactNode;let click:(()=>void)|undefined;
  const attrs:Record<string,unknown>={...n.attrs,key:id,className:n.attrs.class};delete attrs.class;
  if(name.endsWith('Admin Navigation'))return <PencilNavigation key={id} section={section} go={go} light={isLight} toggle={()=>setTheme(isLight?'dark':'light')} open={openModal} username={session.admin.username}/>;
  if(name.startsWith('Production /'))attrs.className='design-screen '+n.attrs.class;
  if(['Payments Filter Toolbar','Learner Directory Toolbar'].includes(name))attrs['data-theme-tone']='light';
  else if(['Primary Navigation','Learner Operations Workspace','Learner Directory Workspace','Content Studio Workspace','Message Events Workspace','Individual Payments Operations Workspace','Learning Insights Rail','Financial Command Center'].includes(name))attrs['data-theme-tone']='dark';
  else if(/bg-\[#(?:7469E8|00866B)\]|background-image:linear-gradient/.test(n.attrs.class||''))attrs['data-theme-tone']='accent';
  if(values[name]!==undefined)content=values[name];

  if(chartNames.has(name)||name.endsWith('Trend Bars')){attrs.className+=' readonly-chart';attrs['data-unavailable-chart']='true';attrs['aria-label']='Chart unavailable — no analytics API';}
  if(['Weekly Completion Chart','Weekly Activity Bars','Revenue Trend Chart'].includes(name)){const daily=name==='Weekly Activity Bars'?learning.data?.daily:summary.data?.daily;if(daily){attrs.className=String(attrs.className).replace('readonly-chart','');delete attrs['data-unavailable-chart'];attrs['aria-label']='Daily observations';content=<DailyChart items={daily.slice(-30).map(d=>({date:d.date,value:name==='Revenue Trend Chart'?Number('revenueTiyin' in d?d.revenueTiyin:0)/100:d.completedLessons}))} label={name==='Revenue Trend Chart'?'Revenue UZS':'Completions'} onSelect={day=>{if(name==='Revenue Trend Chart'){setDateRange({start:day,end:day});setReportFilters(previous=>({...previous,payments:{...previous.payments,dateField:'paidAt',currency:'UZS'}}));setPaymentStatus('paid');setOrderOffset(0);setOrderId(null);setCommerceTab('transactions');}else setActivityQuery(new URLSearchParams({...dateRange,day,cohort}).toString());}}/>;}}
  if(/(?:Progress Fill|Funnel Fill|Course Revenue Fill|Status Dot|Healthy Dot|Live Dot|Live Finance Dot|Timeline Check|Publish Check Icon|Finance Healthy Badge Icon)/.test(name)){attrs.className+=' readonly-signal';attrs['aria-hidden']=true;}
  const nav=Object.keys(routes).find(k=>name===k+' Nav Item') as Section|undefined;
  if(nav){click=()=>go(nav);attrs.className+=' design-nav';attrs['aria-current']=section===nav?'page':undefined;attrs['aria-label']=nav;}
  if(name==='Primary Navigation'){tag='nav';attrs['aria-label']='Primary navigation';}
  if(['Learner Directory Search','Payment Search'].includes(name))content=search();
  if(['Learner Directory List','Payments List Panel','Recent Learners Panel'].includes(name)){
   const isOverview=name==='Recent Learners Panel',isCommerce=name==='Payments List Panel';
   const template=byName[isOverview?'Madina Karimova Learner Row':isCommerce?'Madina Karimova Access Row':'Madina Karimova Learner Directory Row'];
   content=<>{render(byName[isOverview?'Recent Learners Header':isCommerce?'Learners Access Table Header':'Learner Directory List Header'])}{isOverview&&render(byName['Learner Filters'])}<div className="readonly-rows" role="list" aria-label="Learners">{state()}{(isOverview?people.slice(0,4):people).map(p=><div key={p.telegramUserId} data-learner-id={p.telegramUserId}>{render(template,{person:p})}</div>)}</div>{!isOverview&&pager()}</>;
  }
  if(name==='Message Event List')content=<>{render(byName['Message Event Toolbar'])}<div className="readonly-rows">{notifications.error&&<p role="alert">{notifications.error}<button onClick={()=>setRevision(r=>r+1)}>Retry notifications</button></p>}{notifications.loading&&<p role="status">Loading notifications…</p>}{notifications.data?.items.length===0&&<p>No notifications match these filters.</p>}{notifications.data?.items.map(item=>render({...byName['Payment confirmed Event Row'],attrs:{...byName['Payment confirmed Event Row'].attrs,'data-pencil-id':item.id}},{notification:item}))}</div><div className="pager"><button disabled={!notificationOffset} onClick={()=>setNotificationOffset(n=>Math.max(0,n-25))}>Previous notifications</button><span>{notifications.data?.total??'—'} inbox records</span><button disabled={!notifications.data?.hasMore} onClick={()=>setNotificationOffset(n=>n+25)}>Next notifications</button></div></>;
  if(ctx.notification){const item=ctx.notification;if(name.endsWith('Event Row')){click=()=>setNotificationId(item.id);attrs['data-notification-id']=item.id;attrs['aria-label']=item.title;}if(n.children.some(c=>typeof c==='string'))content=name.endsWith('Event Title')?item.title:name.endsWith('Event Recipient')?`Learner ${item.learnerId}`:name.endsWith('Event Detail')?item.kind:name.endsWith('Event Badge Label')?(item.readAt?'Read in Mini App':'Unread in Mini App'):name.endsWith('Event Time')?item.createdAt:'—';}
  if(name==='Refresh Messages Button')click=()=>setRevision(r=>r+1);
  if(name==='Selected Message Detail')content=<><h2 className="text-lg font-semibold">Notification detail</h2><p>Select an inbox record to inspect its persisted content and read timestamp. Delivery receipts are unavailable.</p></>;
  if(name==='Content Catalog Panel')content=<><h2>Content catalog</h2>{catalog.error&&<p role="alert">{catalog.error}</p>}{catalog.loading&&<p role="status">Loading catalog…</p>}<label className="pencil-field">Course / unit<select aria-label="Selected content unit" value={activeUnit??''} onChange={e=>{setUnitId(e.target.value);setLessonId(null);setLessonOffset(0);}}>{catalog.data?.items.map(u=><option value={u.id} key={u.id}>{u.courseTitle} / {u.title} ({u.lessonCount})</option>)}</select></label><div className="pager"><button disabled={!catalogOffset} onClick={()=>setCatalogOffset(n=>Math.max(0,n-25))}>Previous units</button><button disabled={!catalog.data?.hasMore} onClick={()=>setCatalogOffset(n=>n+25)}>Next units</button></div>{lessons.error&&<p role="alert">{lessons.error}</p>}{lessons.loading&&<p role="status">Loading lessons…</p>}{lessons.data?.items.length===0&&<p>No lessons in this unit.</p>}<div className="readonly-rows">{lessons.data?.items.map(l=><button className="pencil-field" data-content-lesson-id={l.id} aria-pressed={l.id===activeLesson} key={l.id} onClick={()=>setLessonId(l.id)}>{l.position}. {l.title} · {l.status}</button>)}</div><div className="pager"><button disabled={!lessonOffset} onClick={()=>setLessonOffset(n=>Math.max(0,n-25))}>Previous lessons</button><button disabled={!lessons.data?.hasMore} onClick={()=>setLessonOffset(n=>n+25)}>Next lessons</button></div><button onClick={()=>setRevision(r=>r+1)}>Refresh catalog</button></>;
  if(name==='Learning Funnel Card'&&learning.data)content=<><h2>Cohort learning funnel</h2><p>Current saved progress for the selected registration cohort.</p>{learning.data.funnel.map(stage=><div className="analytics-funnel" key={stage.stage}><span>{stage.stage}</span><strong>{stage.count.toLocaleString('en-US')}</strong><progress max={Math.max(1,learning.data!.funnel[0].count)} value={stage.count}/></div>)}</>;
  if(name==='Lesson Objective Value')content=contentDetail.error?<span role="alert">{contentDetail.error}<button onClick={()=>setRevision(r=>r+1)}>Retry lesson</button></span>:contentDetail.loading?'Loading saved content…':`${contentDetail.data?.lesson.blocks.length??0} saved blocks`;
  if(ctx.person){
   const p=ctx.person;
   if(/(?:Learner Row|Access Row|Learner Directory Row)$/.test(name)){click=()=>select(p);attrs.className+=' readonly-person';attrs['aria-label']=`Select ${personName(p)}`;attrs['aria-pressed']=person?.telegramUserId===p.telegramUserId;}
   if(n.children.some(c=>typeof c==='string')){
    content=/Initials$/.test(name)?initials(p):/(?:Directory Name| Name)$/.test(name)?personName(p):/(?:Username|Directory Username)$/.test(name)?(p.username?'@'+p.username:'—'):/Registered Value$/.test(name)?p.createdAt.slice(0,10):/Metadata$/.test(name)?(p.username?'@'+p.username:p.telegramUserId):'—';
   }
  }
  if((content===undefined||content==='—')&&n.children.some(c=>c==='—'))attrs.title=unavailable;
  if(['Open Learner Link','Open Learner Profile Button'].includes(name))click=openSelectedLearner;
  if(name==='Open Full Learner Record Button')click=()=>{setReturnFocus(document.activeElement as HTMLElement);setNoteOffset(0);setModal('profile');};
  if(name==='Individual Finance Scroll Cue')click=()=>document.querySelector('[data-pencil-name="Individual Finance Header"]')?.scrollIntoView({behavior:'smooth'});
  const workflowLinks:Record<string,keyof typeof workflowCards>={'Date Range Control':'Date range','Financial Date Filter':'Date range','Learning Date Filter':'Date range','Export Report Button':'Export report','Financial Export':'Export report','Export Learners Button':'Export report','Export Message Events Button':'Export report','Manage Access Button':'Manage access','Add Internal Note Button':'Add internal note','Copy Payment IDs Button':'Payment details','Payment Status Filter':'Payment filters','Payment Method Filter':'Payment filters','Transactions Method Filter':'Payment filters','Open Reconciliation Review Button':'Reconciliation case','Learning Cohort Filter':'Cohort filter','Open Intervention Queue Button':'Learning intervention','Import Content Button':'Import content','New Lesson Button':'Create lesson','Video lesson Editor Block':'Video block','Key phrases Editor Block':'Key phrases','Quick check Editor Block':'Quick check','Lesson navigation Editor Block':'Lesson navigation','Preview Lesson Button':'Lesson preview','Learner Directory Sort':'Sort & paginate'};
  if(workflowLinks[name])click=()=>{setReturnFocus(document.activeElement as HTMLElement);setWorkflow(workflowLinks[name]);};
  if(workflowLinks[name]&&['Date range','Sort & paginate','Export report'].includes(workflowLinks[name])&&['Overview','Learners','Commerce','Messages'].includes(section))click=()=>setReporting(workflowLinks[name] as 'Date range'|'Sort & paginate'|'Export report');
  const contentLinks:Record<string,ContentMode>={'Import Content Button':'Import content','Video lesson Editor Block':'Video block','New Lesson Button':'Create lesson','Key phrases Editor Block':'Key phrases','Quick check Editor Block':'Quick check','Lesson navigation Editor Block':'Lesson navigation','Preview Lesson Button':'Lesson preview','Publish Lesson Button':'Ready to publish','Save Lesson Button':'Reorder lesson blocks'};
  if(contentLinks[name]){click=()=>setContentMode(contentLinks[name]);attrs.disabled=name==='Import Content Button'?false:name==='New Lesson Button'?!activeUnit:!contentDetail.data||contentDetail.loading||!!contentDetail.error;}
  if(name==='Add Internal Note Button'){click=()=>{if(person)setNoteTarget(person);};attrs.disabled=!person;}
  if(name==='Manage Access Button'){click=()=>{setBusinessLearner(person?.telegramUserId);setBusiness('Manage access');};attrs.disabled=!person;}
  if(name==='Open Reconciliation Review Button'||name==='Reconciliation Commerce Tab')click=()=>setBusiness('Reconcile case');
  if(name==='Learning Cohort Filter')click=()=>{setCohortDraft(cohort);setCohortOpen(true);};
  if(name==='Learning Date Filter')click=()=>setReporting('Date range');
  if(name==='Selected Learner Progress Action')click=()=>{setModal('profile');};
  if(name==='Open Intervention Queue Button')click=()=>setActivityQuery(new URLSearchParams({...dateRange,cohort,activityStatus:'unfinished'}).toString());
  if(['Transactions Commerce Tab','Learners & access Commerce Tab'].includes(name)){attrs['aria-pressed']=commerceTab===(name==='Transactions Commerce Tab'?'transactions':'learners');attrs.className+=' operations-commerce-tab';}
  if(name==='Transactions Commerce Tab')click=()=>{setCommerceTab('transactions');setMobileDetail(false);};
  if(name==='Learners & access Commerce Tab')click=()=>{setCommerceTab('learners');setMobileDetail(false);};
  if(['Payment Status Filter','Payment Method Filter','Transactions Method Filter'].includes(name))click=()=>{setStatusDraft(paymentStatus);setMethodDraft(paymentMethod);setPaymentFilter(true);};
  if(name==='Copy Payment IDs Button')click=()=>{setCommerceTab('transactions');setMobileDetail(false);};
  if(name==='Payments List Panel'&&commerceTab==='transactions')content=<OrderList data={orders.data} error={orders.error} loading={orders.loading} selected={activeOrder} select={id=>{setOrderId(id);setMobileDetail(true);}} retry={()=>setRevision(r=>r+1)} offset={orderOffset} setOffset={n=>{setOrderOffset(n);setOrderId(null);setMobileDetail(false);}}/>;
  if(name==='Selected Payment Detail'&&commerceTab==='transactions')content=<PaymentFacts key={activeOrder} data={payment.data} error={payment.error} loading={payment.loading} retry={()=>setRevision(r=>r+1)}/>;
  const unsupported=/(?: Button$| Filter$| Control$| Commerce Tab$| Editor Block$| Catalog Row$| Unit Row$| Progress Action$|Message Preview Action$|Financial Export$|Learner Directory Sort$)/.test(name);
  if(!ctx.insideButton&&(click||unsupported)){
   tag='button';attrs.type='button';attrs.onClick=click;attrs.className+=' interactive';
   if(!click){attrs.disabled=true;attrs.title=unavailable;attrs['aria-describedby']='readonly-explanation';}
  }
  if(['Overview Title','Learners Title','Content Title','Financial Overview Title','Messages Title','Learning Title'].includes(name))tag='h1';
  for(const k of Object.keys(attrs)){
   if(['stroke-width','stroke-linecap','stroke-linejoin','fill-rule','clip-rule'].includes(k)){attrs[k.replace(/-([a-z])/g,(_,c:string)=>c.toUpperCase())]=attrs[k];delete attrs[k];}
   if(k==='xmlns:xlink')delete attrs[k];
  }
  return createElement(tag,attrs,content===undefined?n.children.map(child=>render(child,{...ctx,insideButton:ctx.insideButton||tag==='button'})):content);
 }
 return <main id="main-content" data-route={section} className={mobileDetail?'mobile-detail':''}>
  {render(screens[routes[section]])}
  <footer className="readonly-status"><p id="readonly-explanation">Administrator workspace · — means unavailable, not zero. Unsupported controls remain in place. Payment orders and private internal notes are connected. Draft authoring and Mini App inbox records are connected. Catalog grants, case closure, internal follow-up tasks and learning aggregates are connected. Telegram delivery receipts are not recorded.</p><p>Database totals: <span data-total="learners">Learners {overview.data?.learnersTotal.toLocaleString('en-US')??'—'}</span> · Courses {overview.data?.coursesTotal.toLocaleString('en-US')??'—'} · Sections {overview.data?.sectionsTotal.toLocaleString('en-US')??'—'} · Lessons {overview.data?.lessonsTotal.toLocaleString('en-US')??'—'} (including draft/unpublished records; not completions).</p>{overview.error&&<p role="alert">{overview.error}</p>}{refresh}<button className="action" disabled={signingOut} onClick={logout}>{signingOut?'Signing out…':'Sign out'}</button>{logoutError&&<p role="alert">{logoutError}</p>}</footer>
  {contentMode&&<ContentDialog mode={contentMode} units={catalog.data?.items??[]} unitId={activeUnit??''} detail={contentDetail.data} csrf={session.csrfToken} canWrite={catalog.data?.canWrite??false} onSaved={value=>{setUnitId(value.lesson.unitId);setLessonId(value.lesson.id);setRevision(r=>r+1);}} onClose={()=>{setContentMode(null);setRevision(r=>r+1);}}/>}
  {cohortOpen&&<Dialog open onOpenChange={setCohortOpen}><DialogContent className="admin-dialog pencil-dialog"><DialogHeader><DialogTitle>Cohort filter</DialogTitle><DialogDescription>New learners registered within the selected dates; returning learners registered earlier.</DialogDescription></DialogHeader><label className="pencil-field">Cohort<select value={cohortDraft} onChange={e=>setCohortDraft(e.target.value)}><option value="all">All learners</option><option value="new">New learners</option><option value="returning">Returning learners</option></select></label><div className="pencil-dialog-actions"><button onClick={()=>setCohortOpen(false)}>Cancel</button><button className="pencil-primary" onClick={()=>{setCohort(cohortDraft);setCohortOpen(false);}}>Apply cohort</button></div></DialogContent></Dialog>}
  {activityQuery!==null&&<ActivityDialog query={activityQuery} onClose={()=>setActivityQuery(null)} onLearner={id=>{setActivityQuery(null);setBusinessLearner(id);setBusiness('Learning intervention');}}/>}
  {business&&<BusinessDialog mode={business} learnerId={businessLearner??person?.telegramUserId} learnerName={businessLearner&&businessLearner!==person?.telegramUserId?businessLearner:person?personName(person):undefined} csrf={session.csrfToken} onClose={()=>setBusiness(null)} onSaved={()=>setRevision(r=>r+1)}/>}
  {reporting&&<ReportingDialog mode={reporting} resource={reportResource} query={reportQuery.toString()} onClose={()=>setReporting(null)} onApply={values=>{if(reporting==='Date range')setDateRange(Object.fromEntries(Object.entries(values).filter(([,value])=>value)));else setReportFilters(previous=>({...previous,[reportResource]:values}));setOffset(0);setOrderOffset(0);setNotificationOffset(0);setSelected(null);setOrderId(null);}}/>}
  {notificationId&&<Dialog open onOpenChange={v=>{if(!v)setNotificationId(null);}}><DialogContent className="admin-dialog pencil-dialog"><DialogHeader><DialogTitle>Notification detail</DialogTitle><DialogDescription>Persisted Mini App inbox record. Viewing here does not mark it read.</DialogDescription></DialogHeader>{notification.error?<p role="alert">{notification.error}<button onClick={()=>setRevision(r=>r+1)}>Retry notification</button></p>:notification.loading?<p role="status">Loading notification…</p>:notification.data&&<><div className="pencil-field">Event<div>{notification.data.title}<br/>{notification.data.body}<br/>{notification.data.kind} · {notification.data.id}</div></div><div className="pencil-field">Recipient<div>Learner {notification.data.learnerId}</div></div><div className="pencil-field">Delivery<div>Created: {notification.data.createdAt}<br/>Read in Mini App: {notification.data.readAt??'Not read'}<br/>Telegram delivery receipts unavailable.</div></div><div className="pencil-field">Action path<div>{notification.data.actionPath??'None'}</div></div></>}<div className="pencil-dialog-actions"><button onClick={()=>setNotificationId(null)}>Close</button></div></DialogContent></Dialog>}
  {noteTarget&&<NoteDialog key={noteTarget.telegramUserId} learnerId={noteTarget.telegramUserId} learnerName={personName(noteTarget)} csrf={session.csrfToken} onViewRecord={()=>{setSelected(noteTarget.telegramUserId);setNoteTarget(null);setNoteOffset(0);setRevision(r=>r+1);setModal('profile');}} onClose={()=>{setNoteTarget(null);setRevision(r=>r+1);}}/>}
  {paymentFilter&&<Dialog open onOpenChange={setPaymentFilter}><DialogContent className="admin-dialog pencil-dialog"><DialogHeader><DialogTitle>Payment filters</DialogTitle><DialogDescription>Filter persisted payment orders; no provider operation is performed.</DialogDescription></DialogHeader><label className="pencil-field">Payment status<select aria-label="Payment status" value={statusDraft} onChange={e=>setStatusDraft(e.target.value)}><option value="">All statuses</option><option value="paid">Paid</option><option value="pending">Pending</option><option value="cancelled">Cancelled</option></select></label><label className="pencil-field">Payment method<select aria-label="Payment method" value={methodDraft} onChange={e=>setMethodDraft(e.target.value)}><option value="">All methods</option>{['payme','click','uzum','paylov'].map(m=><option key={m} value={m}>{m}</option>)}</select></label><div className="pencil-dialog-actions"><button onClick={()=>setPaymentFilter(false)}>Cancel</button><button className="pencil-primary" onClick={()=>{setPaymentStatus(statusDraft);setPaymentMethod(methodDraft);setOrderOffset(0);setOrderId(null);setCommerceTab('transactions');setMobileDetail(false);setPaymentFilter(false);}}>Apply payment filters</button></div></DialogContent></Dialog>}
  <Dialog open={workflow!==null} onOpenChange={v=>{if(!v)setWorkflow(null);}}><DialogContent className="admin-dialog pencil-dialog" onCloseAutoFocus={e=>{e.preventDefault();if(returnFocus?.isConnected)returnFocus.focus();}}><DialogHeader><DialogTitle>{workflow??'Workflow unavailable'}</DialogTitle><DialogDescription>{workflow?workflowCards[workflow].description:''}</DialogDescription></DialogHeader>{workflow&&workflowCards[workflow].fields.map(label=><div className="pencil-field" key={label}>{label}<div>{workflow==='Export report'&&label==='Format'?'CSV · UTF-8':workflow==='Sort & paginate'&&label==='Sort'?'Telegram ID ↑ · fixed API order':workflow==='Sort & paginate'&&label==='Page'?`Offset ${offset} · page size 25`:workflow==='Sort & paginate'&&label==='Summary'&&directory.data?`${directory.data.items.length} of ${directory.data.total} matching learners`:'Unavailable — no approved API'}</div></div>)}<p className="pencil-feedback" id="workflow-unavailable">Read-only preview. This workflow is unavailable because its API is not connected. No changes, exports or success results are produced.</p><div className="pencil-dialog-actions"><button onClick={()=>setWorkflow(null)}>Cancel</button><button className="pencil-primary" disabled aria-describedby="workflow-unavailable">{workflow?workflowCards[workflow].action:'Unavailable'}</button></div></DialogContent></Dialog>
  {mobileDetail&&<button className="mobile-back action" onClick={()=>{setMobileDetail(false);requestAnimationFrame(()=>document.querySelector('[data-pencil-name="Payments List Panel"]')?.scrollIntoView({block:'start'}));}}>Back to list</button>}
  <Dialog open={modal!==null} onOpenChange={v=>{if(!v)setModal(null);}}><DialogContent className="admin-dialog pencil-dialog" onCloseAutoFocus={e=>{e.preventDefault();if(returnFocus?.isConnected)returnFocus.focus();}}><DialogHeader><DialogTitle>{modal==='settings'?'Workspace settings':modal==='profile'?'Learner record':modal==='search'?'Search LEAP':'Admin profile'}</DialogTitle><DialogDescription>{modal==='settings'?'Appearance and refresh preferences.':modal==='profile'?'One canonical profile for every learner.':modal==='search'?'Find a learner, order or message.':'Signed-in workspace administrator.'}</DialogDescription></DialogHeader>
   {modal==='settings'?<><label className="pencil-field">Appearance<select aria-label="Color theme" value={preferenceTheme} onChange={e=>setPreferenceTheme(e.target.value)}><option value="light">☀ Light</option><option value="dark">Dark</option></select></label><label className="pencil-field">Automatic refresh<select value={preferenceRefresh?'on':'off'} onChange={e=>setPreferenceRefresh(e.target.value==='on')}><option value="off">Off · manual refresh</option><option value="on">On · every 60 seconds</option></select></label><p className="pencil-feedback">Theme preference is remembered on this device.</p>{preferenceError&&<p role="alert">{preferenceError}</p>}</>:modal==='account'?<><div className="pencil-field">Account<div>{session.admin.username}</div></div><div className="pencil-field">Session<div>Authenticated · Administrator</div></div>{logoutError&&<p role="alert">{logoutError}</p>}</>:modal==='profile'?<><div className="pencil-field">Identity<div>{person?personName(person):'No learner selected'}<br/>{person?`${person.username?'@'+person.username:'No username'} · ${person.telegramUserId}`:'—'}</div></div><div className="pencil-field">Access / activity<div>{learnerAnalytics.error??(learnerAnalytics.loading?'Loading learner activity…':learnerAnalytics.data?`${learnerAnalytics.data.catalogAccess?'Whole catalog lifetime access':learnerAnalytics.data.sectionAccess.map(a=>a.title).join(', ')||'No paid access'} · ${learnerAnalytics.data.completedLessons} completed lessons`:'No learner selected.')}</div></div><details className="pencil-record-facts"><summary>Identity details</summary>{facts()}</details><details className="pencil-record-facts"><summary>Internal notes</summary>{noteHistory.error?<p role="alert">{noteHistory.error}<button className="action" onClick={()=>setRevision(r=>r+1)}>Retry notes</button></p>:noteHistory.loading?<p role="status">Loading notes…</p>:<>{noteHistory.data?.items.length===0&&<p>No internal notes.</p>}{noteHistory.data?.items.map(n=><article key={n.id}><p>{n.note}</p><small>{n.actor} · {n.createdAt}</small></article>)}<div className="pencil-note-pager"><button disabled={noteOffset===0} onClick={()=>setNoteOffset(n=>Math.max(0,n-25))}>Previous notes</button><span>{noteHistory.data?.total??'—'} notes</span><button disabled={!noteHistory.data?.hasMore||noteOffset+25>1000000} onClick={()=>setNoteOffset(n=>n+25)}>Next notes</button></div></>}</details></>:<><form onSubmit={e=>{e.preventDefault();setGlobalQuery(globalDraft);setSearchRevision(r=>r+1);}}><label className="pencil-field">Search<input aria-label="Search LEAP exact username" placeholder="Exact username (without @)" maxLength={64} required value={globalDraft} onChange={e=>{setGlobalDraft(e.target.value);setGlobalQuery(null);}}/></label><button className="pencil-search-submit" type="submit">Search learners</button></form><div className="pencil-field">Results<div aria-live="polite">{!globalQuery?'Enter an exact, case-sensitive username.':globalResults.error?<><strong>Refresh failed</strong><p>{globalResults.error}</p><button onClick={()=>setSearchRevision(r=>r+1)}>Retry search</button></>:!globalResults.data?'Loading learners…':globalResults.data.items.length?globalResults.data.items.map(p=><p key={p.telegramUserId}>{personName(p)} · @{p.username}</p>):'No results · 0 matching learners'}</div></div><p className="pencil-feedback">Orders and messages are unavailable. The API supports exact learner usernames only, not names or partial search.</p></>}
   <div className="pencil-dialog-actions"><button onClick={()=>setModal(null)}>Cancel</button>{modal==='settings'?<button className="pencil-primary" onClick={savePreferences}>Save preferences</button>:modal==='account'?<button className="pencil-primary" disabled={signingOut} onClick={logout}>{signingOut?'Signing out…':'Sign out'}</button>:modal==='profile'?<button className="pencil-primary" disabled={!person} onClick={()=>{setModal(null);setBusiness('Manage access');}}>Manage access</button>:<button className="pencil-primary" disabled={!globalQuery||globalResults.loading||!globalResults.data?.items.length||!!globalResults.error} onClick={()=>{const p=globalResults.data?.items[0];if(!p)return;go('Learners');setDraft(globalQuery!);setUsername(globalQuery!);setSelected(p.telegramUserId);setModal(null);}}>Open learner</button>}</div>
  </DialogContent></Dialog>
 </main>;
}
