"use client";
import {useEffect,useState,type ReactNode} from "react";
import {useTheme} from "next-themes";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BadgeCheck,
  BarChart3,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Download,
  FileText,
  Filter,
  Flame,
  Folder,
  Library,
  ListChecks,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  UsersRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import {ContentDialog,type ContentDetail,type ContentMode} from "./content-dialog";
import {ContentStructureDialog,type StructureTarget} from "./content-structure-dialog";
import {PriceDialog,type CatalogPrice} from "./price-dialog";
import {BusinessDialog} from "./business-dialog";
import {type LearnerAnalytics,type Summary} from "./analytics";
import {ReportingDialog,type ReportingResource} from "./reporting-dialog";
import {NoteDialog} from "./note-dialog";
import {money,type Orders,type Payment} from "./payments";
import {PushdayNavigation,type PushdaySection} from "./pushday-navigation";
import {SelfingoScreen} from "./selfingo-screen";
import {readState} from "@/lib/read-state.mjs";
import workflowCards from "@/lib/pushday-workflows.json";
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from "@/components/ui/dialog";
import {Sheet,SheetContent,SheetDescription,SheetHeader,SheetTitle} from "@/components/ui/sheet";
import type {AdminOverview,AdminSession,Learner,LearnerDirectory,RatingDirectory} from "@/lib/admin-types";

type Notification={id:string;learnerId:string;kind:string;title:string;body:string;actionPath:string|null;createdAt:string;readAt:string|null};
type Section=PushdaySection;
type PaymentSummary={learnerId:string;paymentsCount:number;paidTotalTiyin:string;lastPaidAt:string|null;learner?:Learner};
type PaymentSummaries={items:PaymentSummary[]};
type ContentTreeLesson={id:string;unitId:string;title:string;slug:string;position:number;status:string;version:string};
type ContentTreeUnit={id:string;sectionId:string;sectionTitle:string;title:string;slug:string;subtitle:string;position:number;version:string;lessons:ContentTreeLesson[]};
type ContentTreeCourse={id:string;title:string;slug:string;version:string;units:ContentTreeUnit[]};
type ContentTree={items:ContentTreeCourse[];total:number;limit:number;offset:number;hasMore:boolean;canWrite:boolean};
type AudienceFilter="all"|"active"|"access"|"attention";
type MetricFilter=AudienceFilter|"content-courses"|"content-units"|"content-lessons"|"content-published"|"commerce-revenue"|"commerce-paid"|"commerce-average"|"commerce-pending"|"messages-sent"|"messages-read"|"messages-unread"|"messages-total";
type Metric={icon:LucideIcon;label:string;value:string;detail:string;tone?:"success"|"warning"|"danger";filter?:MetricFilter};
type SortDirection=1|-1;
type SortState={key:string;direction:SortDirection};
type TableColumn={key:string;label:string;sortable?:boolean;right?:boolean};

const navRoutes:Section[]=["Overview","Learners","Ratings","Content","Commerce","AI","Messages"];
const audienceLabels:Record<AudienceFilter,string>={all:"Barcha profillar",active:"Faol foydalanuvchilar",access:"PRO",attention:"E’tibor kerak"};
const learnerColumns:TableColumn[]=[
  {key:"id",label:"ID",sortable:true},
  {key:"name",label:"Foydalanuvchi",sortable:true},
  {key:"progress",label:"Progress",sortable:true},
  {key:"status",label:"Holat",sortable:true},
  {key:"mini_app",label:"Mini App"},
  {key:"times",label:"To‘lovlar",sortable:true,right:true},
  {key:"total",label:"Jami",sortable:true,right:true},
  {key:"created_at",label:"Ro‘yxatdan o‘tgan",sortable:true},
  {key:"last_seen_at",label:"Oxirgi faollik",sortable:true},
  {key:"pro",label:"PRO"},
  {key:"actions",label:"Batafsil",right:true}
];
const ratingColumns:TableColumn[]=[
  {key:"rank",label:"O‘rin"},
  {key:"name",label:"Foydalanuvchi"},
  {key:"completed",label:"Tugatilgan darslar"},
  {key:"started",label:"Boshlangan darslar"},
  {key:"completion",label:"O‘zlashtirish"},
  {key:"status",label:"Holat"},
  {key:"last_seen_at",label:"Oxirgi faollik"},
  {key:"actions",label:"Batafsil",right:true}
];
const paymentColumns:TableColumn[]=[
  {key:"id",label:"Buyurtma",sortable:true},
  {key:"user",label:"Foydalanuvchi",sortable:true},
  {key:"date",label:"Sana",sortable:true},
  {key:"method",label:"Usul",sortable:true},
  {key:"amount",label:"Summa",sortable:true,right:true},
  {key:"status",label:"Holat",sortable:true}
];
const notificationColumns:TableColumn[]=[
  {key:"kind",label:"Turi"},
  {key:"message",label:"Xabar"},
  {key:"learner",label:"Foydalanuvchi"},
  {key:"date",label:"Sana"},
  {key:"read",label:"Holat"}
];
function formatMoney(tiyin?:string|null){
  if(tiyin===undefined||tiyin===null)return "—";
  const value=BigInt(tiyin);
  return `${(value/BigInt(100)).toLocaleString("en-US")}.${String(value%BigInt(100)).padStart(2,"0")} UZS`;
}

function formatMoneyCompact(tiyin?:string|null){
  if(tiyin===undefined||tiyin===null)return "—";
  const sums=BigInt(tiyin)/BigInt(100);
  if(sums>=BigInt(1_000_000))return `${(Number(sums)/1_000_000).toFixed(1).replace(/\.0$/,"")}M UZS`;
  if(sums>=BigInt(1_000))return `${(Number(sums)/1_000).toFixed(1).replace(/\.0$/,"")}K UZS`;
  return `${sums.toLocaleString("en-US")} UZS`;
}

function formatUzs(tiyin?:string|null){
  if(tiyin===undefined||tiyin===null)return "—";
  return `${(BigInt(tiyin)/BigInt(100)).toLocaleString("en-US").replace(/,/g," ")} so‘m`;
}

function providerLabel(value:string){
  const labels:Record<string,string>={payme:"Payme",click:"Click",uzum:"Uzum",paylov:"Paylov"};
  return labels[value.toLowerCase()]??value;
}

function isoDate(value:Date){
  return value.toISOString().slice(0,10);
}

function periodRange(kind:string):Record<string,string>{
  const today=new Date();
  const end=isoDate(today);
  if(kind==="all")return {};
  if(kind==="30")return {start:isoDate(new Date(Date.UTC(today.getUTCFullYear(),today.getUTCMonth(),today.getUTCDate()-29))),end};
  const month=kind==="lastMonth"?today.getUTCMonth()-1:today.getUTCMonth();
  const date=new Date(Date.UTC(today.getUTCFullYear(),month,1));
  const year=date.getUTCFullYear(),monthNumber=date.getUTCMonth();
  return {start:isoDate(date),end:monthNumber===today.getUTCMonth()&&year===today.getUTCFullYear()?end:isoDate(new Date(Date.UTC(year,monthNumber+1,0)))};
}

function formatDate(value?:string|null){
  return value?value.slice(0,10):"—";
}

function formatDateTime(value?:string|null){
  return value?value.slice(0,16).replace("T"," "):"—";
}

function relativeSeen(value?:string|null){
  if(!value)return "—";
  const then=new Date(value).getTime();
  if(Number.isNaN(then))return value;
  const minutes=Math.max(0,Math.round((Date.now()-then)/60000));
  if(minutes<60)return `${minutes} daq oldin`;
  const hours=Math.round(minutes/60);
  if(hours<24)return `${hours} soat oldin`;
  const days=Math.round(hours/24);
  return days<7?`${days} kun oldin`:value.slice(0,10);
}

function learnerName(person:Learner){
  return [person.firstName,person.lastName].filter(Boolean).join(" ")||person.username||person.telegramUserId;
}

function learnerInitials(person:Learner){
  return [person.firstName,person.lastName].filter(Boolean).map(value=>value!.slice(0,1)).join("")||"—";
}

function learnerProgress(person:Learner){
  const started=person.startedLessons??0;
  return started?Math.round(100*(person.completedLessons??0)/started):0;
}

function toneForProgress(value:number){
  if(value>=70)return "success" as const;
  if(value>=30)return "warning" as const;
  return "neutral" as const;
}

function learnerStatusRank(person:Learner){
  const progress=learnerProgress(person);
  return progress>=70?2:progress>=30?1:0;
}

function compareText(left?:string|null,right?:string|null){
  return (left??"").localeCompare(right??"","uz",{sensitivity:"base"});
}

function compareTimestamps(left?:string|null,right?:string|null){
  const a=left?new Date(left).getTime():0;
  const b=right?new Date(right).getTime():0;
  return a-b;
}

function compareBigInts(left:string|bigint,right:string|bigint){
  const a=typeof left==="bigint"?left:BigInt(left);
  const b=typeof right==="bigint"?right:BigInt(right);
  return a<b?-1:a>b?1:0;
}

function compareIds(left:string,right:string){
  return compareBigInts(left,right);
}

function nextSort(current:SortState,key:string,ascendingKeys:string[]=[]):SortState{
  if(current.key===key)return {key,direction:current.direction===1?-1:1};
  return {key,direction:ascendingKeys.includes(key)?1:-1};
}

function useRead<T>(path:string|null,revision:number){
  const key=`${path}:${revision}`;
  const [result,setResult]=useState<{key:string;path?:string;data?:T;error?:string;syncedAt?:string}>({key:""});
  useEffect(()=>{
    if(!path)return;
    const controller=new AbortController();
    fetch(path,{credentials:"same-origin",cache:"no-store",signal:AbortSignal.any([controller.signal,AbortSignal.timeout(12000)])})
      .then(async response=>{
        if(response.status===401){setResult({key,path,error:"Session expired."});window.location.replace("/login");throw new Error("Session expired.");}
        const body=await response.json();
        if(!response.ok)throw new Error(body.error?.message??"Could not load data.");
        return body as T;
      })
      .then(data=>{if(!controller.signal.aborted)setResult({key,path,data,syncedAt:new Date().toISOString()});})
      .catch(error=>{if(!controller.signal.aborted)setResult(previous=>({key,path,...(previous.path===path?{data:previous.data,syncedAt:previous.syncedAt}:{}),error:error instanceof Error?error.message:"Could not load data."}));});
    return()=>controller.abort();
  },[path,key]);
  return readState(result,path,revision) as {key:string;data?:T;error?:string;loading:boolean;syncedAt?:string};
}

function PageHeader({title,subtitle,actions}:{title:string;subtitle:string;actions?:ReactNode}){
  return <header className="pd-page-header">
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
    {actions&&<div className="pd-page-actions">{actions}</div>}
  </header>;
}

function MetricCard({icon:Icon,label,value,detail,tone="success",onClick,active=false}:{icon:LucideIcon;label:string;value:string;detail:string;tone?:"success"|"warning"|"danger";onClick?:()=>void;active?:boolean}){
  const body=<>
    <span className={`pd-metric-icon ${tone}`}><Icon size={19}/></span>
    <div>
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  </>;
  const className=`pd-metric-card${active?" active":""}`;
  return onClick?<button type="button" className={className} aria-pressed={active} onClick={onClick}>{body}</button>:<article className={className}>{body}</article>;
}

function Panel({title,subtitle,action,children,className=""}:{title?:string;subtitle?:string;action?:ReactNode;children:ReactNode;className?:string}){
  return <section className={`pd-panel ${className}`}>
    {(title||action)&&<header className="pd-panel-header">
      <div>{title&&<h2>{title}</h2>}{subtitle&&<p>{subtitle}</p>}</div>
      {action&&<div className="pd-panel-action">{action}</div>}
    </header>}
    {children}
  </section>;
}

function StatusPill({children,tone="neutral"}:{children:ReactNode;tone?:"success"|"warning"|"danger"|"neutral"}){
  return <span className={`pd-status ${tone}`}>{children}</span>;
}

function ProgressBar({value,label,hideLabel=false}:{value:number;label?:string;hideLabel?:boolean}){
  const safe=Math.max(0,Math.min(100,value));
  return <div className="pd-progress">
    <div className="pd-progress-copy">{!hideLabel&&<span>{label??"Progress"}</span>}<strong>{safe}%</strong></div>
    <div className="pd-progress-track"><i style={{width:`${safe}%`}}/></div>
  </div>;
}

function LearnerDetailDrawer({open,learnerId,learner,analytics,payments,loading,error,onClose,onRetry,onManageAccess}:{open:boolean;learnerId:string|null;learner?:Learner;analytics?:LearnerAnalytics;payments?:PaymentSummary;loading:boolean;error?:string;onClose:()=>void;onRetry:()=>void;onManageAccess:()=>void}){
  const name=learner?learnerName(learner):learnerId?`ID ${learnerId}`:"Foydalanuvchi";
  const initials=learner?learnerInitials(learner):"—";
  const subscription=analytics
    ? (analytics.catalogAccess?"PRO / Lifetime":analytics.sectionAccess.length?`${analytics.sectionAccess.length} bo‘lim`:"Yo‘q")
    : (learner?.catalogAccess?"PRO / Lifetime":"Yo‘q");
  const directoryRate=learner?.startedLessons
    ? Math.round(100*(learner.completedLessons??0)/learner.startedLessons)
    : null;
  const mastery=analytics
    ? (analytics.completionRate===null||analytics.completionRate===undefined?null:Math.round(analytics.completionRate))
    : directoryRate;
  const completedLessons=analytics?.completedLessons??learner?.completedLessons??0;
  const startedLessons=analytics?.startedLessons??learner?.startedLessons??0;
  const progressLabel=startedLessons>0?`${completedLessons} / ${startedLessons} dars`:`${completedLessons} tugatilgan dars`;
  return <Sheet open={open} onOpenChange={value=>{if(!value)onClose();}}>
    <SheetContent side="right" className="pd-profile-drawer">
      <SheetHeader className="pd-drawer-header">
        <div className="pd-drawer-person">
          <span>{initials}</span>
          <div>
            <SheetTitle>{name}</SheetTitle>
            <SheetDescription>{learner?.username?`@${learner.username}`:learnerId??"Foydalanuvchi ID kutilmoqda"}</SheetDescription>
          </div>
        </div>
      </SheetHeader>
      <div className="pd-drawer-body">
        {loading&&!learner?<div className="pd-loading">Foydalanuvchi ma’lumotlari yuklanmoqda…</div>:null}
        {error&&!learner?<ErrorState message={error} onRetry={onRetry}/>:null}
        {learner?<>
          <dl className="pd-drawer-facts">
            <div><dt>Kim</dt><dd>{learnerName(learner)}</dd></div>
            <div><dt>Username</dt><dd>{learner.username?`@${learner.username}`:"—"}</dd></div>
            <div><dt>Telegram ID</dt><dd>{learner.telegramUserId}</dd></div>
            <div><dt>Ro‘yxatdan o‘tgan</dt><dd>{formatDateTime(learner.createdAt)}</dd></div>
          </dl>
          <div className="pd-drawer-summary">
            <article><span><CalendarDays size={16}/></span><div><small>Oxirgi to‘lov</small><strong>{payments?.lastPaidAt?formatDateTime(payments.lastPaidAt):loading?"…":"—"}</strong></div></article>
            <article><span><BadgeCheck size={16}/></span><div><small>Obuna</small><strong>{subscription}</strong></div></article>
            <article><span><WalletCards size={16}/></span><div><small>To‘lovlar soni</small><strong>{payments?payments.paymentsCount.toLocaleString("en-US"):loading?"…":"—"}</strong></div></article>
            <article><span><Target size={16}/></span><div><small>O‘zlashtirish</small><strong>{mastery===null?loading?"…":"—":`${mastery}%`}</strong></div></article>
          </div>
          <section className="pd-drawer-mastery">
            <div><span>O‘zlashtirish foizi</span><strong>{mastery===null?"—":`${mastery}%`}</strong></div>
            <ProgressBar value={mastery??0} label={progressLabel}/>
          </section>
          {analytics?.sectionAccess.length?<section className="pd-drawer-access"><span>Faol obunalar</span>{analytics.sectionAccess.map(item=><div key={item.sectionId}><strong>{item.title}</strong><small>{item.source}</small></div>)}</section>:null}
          <div className="pd-drawer-actions"><button className="pd-button primary" onClick={onManageAccess}>Accessni boshqarish</button><button className="pd-button" onClick={onClose}>Yopish</button></div>
        </>:null}
      </div>
    </SheetContent>
  </Sheet>;
}

function EmptyState({title,description,action}:{title:string;description:string;action?:ReactNode}){
  return <div className="pd-empty">
    <span><FileText size={22}/></span>
    <h3>{title}</h3>
    <p>{description}</p>
    {action}
  </div>;
}

function Pager({offset,limit,total,hasMore,loading,onPrevious,onNext}:{offset:number;limit:number;total:number;hasMore:boolean;loading:boolean;onPrevious:()=>void;onNext:()=>void}){
  const from=total===0?0:offset+1;
  const to=Math.min(offset+limit,total);
  return <div className="pd-pager">
    <span>{from}–{to} / {total}</span>
    <div>
      <button className="pd-icon-button" aria-label="Oldingi sahifa" disabled={loading||offset===0} onClick={onPrevious}><ChevronLeft size={15}/></button>
      <button className="pd-icon-button" aria-label="Keyingi sahifa" disabled={loading||!hasMore} onClick={onNext}><ChevronRight size={15}/></button>
    </div>
  </div>;
}

function ErrorState({message,onRetry}:{message:string;onRetry:()=>void}){
  return <div className="pd-error" role="alert"><span>{message}</span><button className="pd-button" onClick={onRetry}><RefreshCw size={14}/>Qayta urinish</button></div>;
}

function SearchField({value,onChange,onSubmit,onClear}:{value:string;onChange:(value:string)=>void;onSubmit:()=>void;onClear:()=>void}){
  return <form className="pd-search" onSubmit={event=>{event.preventDefault();onSubmit();}}>
    <Search size={15}/>
    <input aria-label="Foydalanuvchini qidirish" value={value} onChange={event=>onChange(event.target.value)} placeholder="Ism, username yoki ID..."/>
    {value&&<button type="button" aria-label="Qidiruvni tozalash" onClick={onClear}>×</button>}
  </form>;
}

function manualDateToIso(value:string){
  const match=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if(!match)return null;
  const day=Number(match[1]),month=Number(match[2]),year=Number(match[3]);
  const date=new Date(Date.UTC(year,month-1,day));
  if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function isoToManualDate(value?:string){
  return value&&/^\d{4}-\d{2}-\d{2}$/.test(value)?`${value.slice(8,10)}/${value.slice(5,7)}/${value.slice(0,4)}`:"";
}

function ManualDateField({label,value,min,max,onChange}:{label:string;value?:string;min?:string;max?:string;onChange:(value:string)=>void}){
  const [draft,setDraft]=useState(isoToManualDate(value));
  function update(raw:string){
    const digits=raw.replace(/\D/g,"").slice(0,8);
    let next=digits;
    if(digits.length>4)next=`${digits.slice(0,2)}/${digits.slice(2,4)}/${digits.slice(4)}`;
    else if(digits.length>2)next=`${digits.slice(0,2)}/${digits.slice(2)}`;
    setDraft(next);
    if(!digits){onChange("");return;}
    const iso=manualDateToIso(next);
    if(iso&&(!min||iso>=min)&&(!max||iso<=max))onChange(iso);
  }
  return <label className="pd-period-field">
    <span>{label}</span>
    <div className="pd-period-control">
      <input aria-label={label} inputMode="numeric" maxLength={10} value={draft} onBlur={()=>setDraft(isoToManualDate(value))} onChange={event=>update(event.target.value)} placeholder="kk/oo/yyyy"/>
      <CalendarDays size={14}/>
    </div>
  </label>;
}

function PeriodBar({value,onChange}:{value:Record<string,string>;onChange:(value:Record<string,string>)=>void}){
  const months=["Yanvar","Fevral","Mart","Aprel","May","Iyun","Iyul","Avgust","Sentabr","Oktabr","Noyabr","Dekabr"];
  const today=new Date();
  const start=value.start??"",end=value.end??"";
  const year=Number(start.slice(0,4))||today.getUTCFullYear();
  const years=Array.from({length:7},(_,index)=>today.getUTCFullYear()-3+index);
  if(!years.includes(year))years.unshift(year);
  const parsedMonth=Number(start.slice(5,7));
  const month=Number.isInteger(parsedMonth)&&parsedMonth>=1?parsedMonth-1:today.getUTCMonth();
  const quick=!start&&!end?"all":start===periodRange("month").start?"month":start===periodRange("30").start&&end===periodRange("30").end?"30":start===periodRange("lastMonth").start?"lastMonth":"custom";
  const setMonth=(yearValue:number,monthValue:number)=>{
    const first=new Date(Date.UTC(yearValue,monthValue,1));
    const last=new Date(Date.UTC(yearValue,monthValue+1,0));
    onChange({start:isoDate(first),end:isoDate(last)});
  };
  const status=start||end?`Tanlangan: ${start?start.slice(8,10)+"/"+start.slice(5,7):"—"} - ${end?end.slice(8,10)+"/"+end.slice(5,7):"—"}`:"Barcha vaqt tanlangan";
  return <section className="pd-period-bar" aria-label="Davr filtri">
    <label className="pd-period-field">
      <span>TEZKOR DAVR</span>
      <div className="pd-period-control teal"><select aria-label="Tezkor davr" value={quick} onChange={event=>onChange(periodRange(event.target.value))}>{quick==="custom"&&<option value="custom" disabled>Tanlangan</option>}<option value="all">Barcha vaqt</option><option value="30">Oxirgi 30 kun</option><option value="month">Shu oy</option><option value="lastMonth">O‘tgan oy</option></select><ChevronDown size={15}/></div>
    </label>
    <div className="pd-period-field">
      <span>YIL VA OY</span>
      <div className="pd-period-controls">
        <label className="pd-period-control"><select aria-label="Yil" value={year} onChange={event=>setMonth(Number(event.target.value),month)}>{years.map(item=><option key={item} value={item}>{item}</option>)}</select><ChevronDown size={14}/></label>
        <label className="pd-period-control"><select aria-label="Oy" value={month} onChange={event=>setMonth(year,Number(event.target.value))}>{months.map((item,index)=><option key={item} value={index}>{item}</option>)}</select><ChevronDown size={14}/></label>
      </div>
    </div>
    <ManualDateField key={`start-${start}`} label="BOSHLANISH" value={start||undefined} max={end||undefined} onChange={next=>onChange({...(next?{start:next}:{}),...(end?{end}:{})})}/>
    <ManualDateField key={`end-${end}`} label="TUGASH" value={end||undefined} min={start||undefined} onChange={next=>onChange({...(start?{start}:{}),...(next?{end:next}:{})})}/>
    <div className="pd-period-status"><span>HOLAT</span><strong>{status}</strong></div>
  </section>;
}

function DataTable({columns,children,sortKey,sortDirection,onSort}:{columns:TableColumn[];children:ReactNode;sortKey?:string;sortDirection?:SortDirection;onSort?:(key:string)=>void}){
  return <div className="pd-table-wrap"><table className="pd-table"><thead><tr>{columns.map(column=>{
    const active=sortKey===column.key;
    const sortable=Boolean(column.sortable&&onSort);
    const Icon=active?(sortDirection===1?ArrowUp:ArrowDown):ArrowUpDown;
    return <th key={column.key} className={column.right?"r":undefined} aria-sort={active?(sortDirection===1?"ascending":"descending"):undefined}>
      {sortable?<button type="button" data-sort={column.key} className={`pd-sort${active?" on":""}${column.right?" r":""}`} onClick={()=>onSort?.(column.key)} aria-label={`${column.label} bo‘yicha saralash`}><span>{column.label}</span><Icon size={12} aria-hidden="true"/></button>:column.label}
    </th>;
  })}</tr></thead><tbody>{children}</tbody></table></div>;
}

function DialogBody({title,description,children}:{title:string;description:string;children:ReactNode}){
  return <DialogContent className="pd-dialog" showCloseButton={false}><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>{children}</DialogContent>;
}

export default function AdminApp({session}:{session:AdminSession}){
  const {resolvedTheme,setTheme}=useTheme();
  const [themeReady,setThemeReady]=useState(false);
  const [section,setSection]=useState<Section>("Overview");
  const [revision,setRevision]=useState(0);
  const [audience,setAudience]=useState<AudienceFilter>("all");
  const [learnerSort,setLearnerSort]=useState<SortState>({key:"created_at",direction:-1});
  const [contentMetric,setContentMetric]=useState<MetricFilter|null>(null);
  const [commerceMetric,setCommerceMetric]=useState<MetricFilter|null>(null);
  const [messagesMetric,setMessagesMetric]=useState<MetricFilter|null>(null);
  const [notificationRead,setNotificationRead]=useState<"all"|"read"|"unread">("all");
  const [draft,setDraft]=useState("");
  const [username,setUsername]=useState("");
  const [offset,setOffset]=useState(0);
  const [selected,setSelected]=useState<string|null>(null);
  const [profileId,setProfileId]=useState<string|null>(null);
  const [modal,setModal]=useState<"settings"|"account"|"search"|null>(null);
  const [contentMode,setContentMode]=useState<ContentMode|null>(null);
  const [structureTarget,setStructureTarget]=useState<StructureTarget|null>(null);
  const [unitId,setUnitId]=useState<string|null>(null);
  const [lessonId,setLessonId]=useState<string|null>(null);
  const [catalogOffset,setCatalogOffset]=useState(0);
  const [priceOpen,setPriceOpen]=useState(false);
  const [reporting,setReporting]=useState<"Date range"|"Sort & paginate"|"Export report"|null>(null);
  const [reportFilters,setReportFilters]=useState<Record<string,Record<string,string>>>({});
  const [dateRange,setDateRange]=useState<Record<string,string>>({});
  const [business,setBusiness]=useState<"Manage access"|"Reconcile case"|"Learning intervention"|null>(null);
  const [businessLearner,setBusinessLearner]=useState<string|undefined>();
  const [notificationOffset,setNotificationOffset]=useState(0);
  const [notificationId,setNotificationId]=useState<string|null>(null);
  const [commerceTab,setCommerceTab]=useState<"learners"|"transactions">("transactions");
  const [orderOffset,setOrderOffset]=useState(0);
  const [orderSort,setOrderSort]=useState<SortState>({key:"created_at",direction:-1});
  const [orderId,setOrderId]=useState<string|null>(null);
  const [paymentStatus,setPaymentStatus]=useState("");
  const [paymentMethod,setPaymentMethod]=useState("");
  const [paymentFilter,setPaymentFilter]=useState(false);
  const [statusDraft,setStatusDraft]=useState("");
  const [methodDraft,setMethodDraft]=useState("");
  const [noteTarget,setNoteTarget]=useState<Learner|null>(null);
  const [workflow,setWorkflow]=useState<keyof typeof workflowCards|null>(null);
  const [logoutError,setLogoutError]=useState("");
  const [signingOut,setSigningOut]=useState(false);
  const [globalDraft,setGlobalDraft]=useState("");
  const [globalQuery,setGlobalQuery]=useState<string|null>(null);
  const [searchRevision,setSearchRevision]=useState(0);
  const [autoRefresh,setAutoRefresh]=useState(false);
  const [preferenceTheme,setPreferenceTheme]=useState("light");
  const [preferenceRefresh,setPreferenceRefresh]=useState(false);
  const [preferenceError,setPreferenceError]=useState("");

  const overview=useRead<AdminOverview>("/api/admin/overview",revision);
  const summary=useRead<Summary>("/api/admin/analytics-summary?"+new URLSearchParams(dateRange),revision);
  const query=new URLSearchParams({limit:"25",offset:String(offset),audience,...dateRange,...reportFilters.learners});
  if(username)query.set("username",username);
  const directory=useRead<LearnerDirectory>(["Overview","Learners","Commerce"].includes(section)?"/api/admin/learners?"+query:null,revision);
  const people=directory.data?.items??[];
  const ratingQuery=new URLSearchParams({limit:"25",offset:String(offset)});
  if(username)ratingQuery.set("username",username);
  const ratings=useRead<RatingDirectory>(section==="Ratings"?"/api/admin/ratings?"+ratingQuery:null,revision);
  const paymentLearnerIds=people.slice(0,25).map(item=>item.telegramUserId);
  const showPaymentColumns=section==="Overview"||section==="Learners"||(section==="Commerce"&&commerceTab==="learners");
  const paymentSummaries=useRead<PaymentSummaries>(showPaymentColumns&&paymentLearnerIds.length?"/api/admin/learner-payments?"+new URLSearchParams({learnerIds:paymentLearnerIds.join(","),...dateRange}):null,revision);
  const paymentSummaryByLearner=new Map((paymentSummaries.data?.items??[]).map(item=>[item.learnerId,item]));
  const sortedPeople=[...people].sort((left,right)=>{
    let result=0;
    switch(learnerSort.key){
      case "id": result=compareIds(left.telegramUserId,right.telegramUserId); break;
      case "name": result=compareText(learnerName(left),learnerName(right)); break;
      case "progress": result=learnerProgress(left)-learnerProgress(right); break;
      case "status": result=learnerStatusRank(left)-learnerStatusRank(right); break;
      case "times": result=(paymentSummaryByLearner.get(left.telegramUserId)?.paymentsCount??0)-(paymentSummaryByLearner.get(right.telegramUserId)?.paymentsCount??0); break;
      case "total": result=compareBigInts(paymentSummaryByLearner.get(left.telegramUserId)?.paidTotalTiyin??"0",paymentSummaryByLearner.get(right.telegramUserId)?.paidTotalTiyin??"0"); break;
      case "created_at": result=compareTimestamps(left.createdAt,right.createdAt); break;
      case "last_seen_at": result=compareTimestamps(left.lastSeenAt,right.lastSeenAt); break;
    }
    return result*learnerSort.direction||compareIds(left.telegramUserId,right.telegramUserId);
  });
  const person=people.find(item=>item.telegramUserId===selected)??people[0];
  const profileDirectory=useRead<LearnerDirectory>(profileId?"/api/admin/learners?"+new URLSearchParams({limit:"1",offset:"0",learnerId:profileId}):null,revision);
  const profileLearner=profileDirectory.data?.items[0]??people.find(item=>item.telegramUserId===profileId);
  const profileAnalytics=useRead<LearnerAnalytics>(profileId?"/api/admin/analytics-learner?"+new URLSearchParams({learnerId:profileId}):null,revision);
  const profilePayments=useRead<PaymentSummaries>(profileId?"/api/admin/learner-payments?"+new URLSearchParams({learnerIds:profileId}):null,revision);
  const profilePayment=profilePayments.data?.items.find(item=>item.learnerId===profileId);
  const contentTree=useRead<ContentTree>(section==="Content"?"/api/admin/content-tree?limit=25&offset="+catalogOffset:null,revision);
  const catalogPrice=useRead<CatalogPrice>(section==="Content"?"/api/admin/content-price":null,revision);
  const treeUnits=(contentTree.data?.items??[]).flatMap(course=>course.units.map(unit=>({...unit,courseId:course.id,courseTitle:course.title,lessonCount:unit.lessons.length})));
  const activeUnit=treeUnits.find(item=>item.id===unitId)?.id??treeUnits[0]?.id??null;
  const activeUnitLessons=treeUnits.find(item=>item.id===activeUnit)?.lessons??[];
  const activeLesson=activeUnitLessons.find(item=>item.id===lessonId)?.id??activeUnitLessons[0]?.id??null;
  const contentDetail=useRead<ContentDetail>(section==="Content"&&activeLesson?"/api/admin/content-lesson?"+new URLSearchParams({lessonId:activeLesson}):null,revision);
  const ordersQuery=new URLSearchParams({limit:"25",offset:String(orderOffset),...dateRange,...reportFilters.payments});
  if(paymentStatus)ordersQuery.set("status",paymentStatus);
  if(paymentMethod)ordersQuery.set("method",paymentMethod);
  const orders=useRead<Orders>(section==="Commerce"&&commerceTab==="transactions"?"/api/admin/payments?"+ordersQuery:null,revision);
  const transactionLearnerIds=(orders.data?.items??[]).map(item=>item.learnerId);
  const transactionSummaries=useRead<PaymentSummaries>(section==="Commerce"&&commerceTab==="transactions"&&transactionLearnerIds.length?"/api/admin/learner-payments?"+new URLSearchParams({learnerIds:transactionLearnerIds.join(","),includeProfiles:"1"}):null,revision);
  const learnerByTelegramId=new Map([...people,...(transactionSummaries.data?.items??[]).flatMap(item=>item.learner?[item.learner]:[])].map(item=>[item.telegramUserId,item]));
  const orderPersonName=(order:Orders["items"][number])=>{
    const person=learnerByTelegramId.get(order.learnerId);
    return person?learnerName(person):`ID ${order.learnerId}`;
  };
  const sortedOrders=[...(orders.data?.items??[])].sort((left,right)=>{
    let result=0;
    switch(orderSort.key){
      case "id": result=compareText(left.id,right.id); break;
      case "user": result=compareText(orderPersonName(left),orderPersonName(right)); break;
      case "date": result=compareTimestamps(left.createdAt,right.createdAt); break;
      case "method": result=compareText(left.method,right.method); break;
      case "amount": result=compareBigInts(left.amountTiyin,right.amountTiyin); break;
      case "status": result=compareText(left.status,right.status); break;
    }
    return result*orderSort.direction||compareText(left.id,right.id);
  });
  const activeOrder=orders.data?.items.find(item=>item.id===orderId)?.id??orders.data?.items[0]?.id??null;
  const payment=useRead<Payment>(activeOrder?"/api/admin/payment?"+new URLSearchParams({orderId:activeOrder}):null,revision);
  const notificationQuery=new URLSearchParams({limit:"25",offset:String(notificationOffset),read:notificationRead,...dateRange,...reportFilters.notifications});
  const notifications=useRead<{items:Notification[];total:number;hasMore:boolean}>(section==="Messages"?"/api/admin/notifications?"+notificationQuery:null,revision);
  const notification=useRead<Notification>(notificationId?"/api/admin/notification?"+new URLSearchParams({notificationId}):null,revision);
  const globalResults=useRead<LearnerDirectory>(modal==="search"&&globalQuery?"/api/admin/learners?"+new URLSearchParams({limit:"25",offset:"0",username:globalQuery}):null,searchRevision);
  const reportResource:ReportingResource=section==="Messages"?"notifications":section==="Commerce"&&commerceTab==="transactions"?"payments":"learners";
  const reportQuery=reportResource==="notifications"?notificationQuery:reportResource==="payments"?ordersQuery:query;
  const isLight=themeReady&&resolvedTheme==="light";

  useEffect(()=>{queueMicrotask(()=>{try{setAutoRefresh(localStorage.getItem("leap-auto-refresh")==="true");}catch{}});},[]);
  useEffect(()=>{
    let active=true;
    async function keepSessionAlive(){
      try{
        const response=await fetch("/api/admin/session",{credentials:"same-origin",cache:"no-store",signal:AbortSignal.timeout(12000)});
        if(active&&response.status===401)window.location.replace("/login");
      }catch{return;}
    }
    void keepSessionAlive();
    const timer=setInterval(()=>{if(document.visibilityState==="visible")void keepSessionAlive();},300000);
    const onVisibility=()=>{if(document.visibilityState==="visible")void keepSessionAlive();};
    document.addEventListener("visibilitychange",onVisibility);
    return()=>{active=false;clearInterval(timer);document.removeEventListener("visibilitychange",onVisibility);};
  },[]);
  useEffect(()=>{if(!autoRefresh)return;const timer=setInterval(()=>{if(document.visibilityState==="visible")setRevision(value=>value+1);},60000);return()=>clearInterval(timer);},[autoRefresh]);
  useEffect(()=>{
    const next=draft.trim();
    const timer=setTimeout(()=>{
      setUsername(current=>current===next?current:next);
      setOffset(0);
      setSelected(null);
    },300);
    return()=>clearTimeout(timer);
  },[draft]);
  useEffect(()=>{
    if(modal!=="search")return;
    const next=globalDraft.trim();
    const timer=setTimeout(()=>setGlobalQuery(next||null),300);
    return()=>clearTimeout(timer);
  },[globalDraft,modal]);
  useEffect(()=>{
    const hash=()=>{
      const route=navRoutes.find(key=>key.toLowerCase()===location.hash.slice(1).split("/")[0]);
      if(route){setSection(route);setAudience("all");setContentMetric(null);setCommerceMetric(null);setMessagesMetric(null);setNotificationRead("all");setOffset(0);setUsername("");setDraft("");setSelected(null);setProfileId(null);}
    };
    queueMicrotask(()=>{setThemeReady(true);hash();});
    addEventListener("hashchange",hash);
    return()=>removeEventListener("hashchange",hash);
  },[]);

  function go(route:Section,preserveAudience=false){
    setSection(route);if(!preserveAudience)setAudience("all");setOffset(0);setUsername("");setDraft("");setSelected(null);setProfileId(null);
    if(!preserveAudience){setContentMetric(null);setCommerceMetric(null);setMessagesMetric(null);setNotificationRead("all");}
    history.pushState(null,"","#"+route.toLowerCase());window.scrollTo({top:0,behavior:"smooth"});
  }
  function changeAudience(next:AudienceFilter){setAudience(next);setOffset(0);setSelected(null);}

  function toggleLearnerSort(key:string){
    setLearnerSort(current=>nextSort(current,key,["id","name","progress"]));
    setOffset(0);
    setSelected(null);
  }

  function toggleOrderSort(key:string){
    setOrderSort(current=>nextSort(current,key,["id","user","method"]));
    setOrderOffset(0);
    setOrderId(null);
  }
  function toggleContentMetric(next:MetricFilter){
    setContentMetric(current=>current===next?null:next);
    setUnitId(null);setLessonId(null);
  }
  function toggleCommerceMetric(next:MetricFilter){
    const selected=commerceMetric===next?null:next;
    setCommerceMetric(selected);
    setPaymentStatus(selected==="commerce-pending"?"pending":selected?"paid":"");
    setPaymentMethod("");
    setOrderOffset(0);
    setOrderId(null);
  }
  function toggleMessagesMetric(next:MetricFilter){
    const selected=messagesMetric===next?null:next;
    setMessagesMetric(selected);
    setNotificationRead(selected==="messages-read"?"read":selected==="messages-unread"?"unread":"all");
    setNotificationOffset(0);
    setNotificationId(null);
  }
  function changeMetricFilter(sectionValue:Section,filter:MetricFilter){
    if(sectionValue==="Overview"||sectionValue==="Learners"){changeAudience(filter as AudienceFilter);return;}
    if(sectionValue==="Content"){toggleContentMetric(filter);return;}
    if(sectionValue==="Commerce"){toggleCommerceMetric(filter);return;}
    toggleMessagesMetric(filter);
  }
  function metricIsActive(sectionValue:Section,filter?:MetricFilter){
    if(!filter)return false;
    if(sectionValue==="Overview"||sectionValue==="Learners")return filter===audience;
    if(sectionValue==="Content")return filter===contentMetric;
    if(sectionValue==="Commerce")return filter===commerceMetric;
    return filter===messagesMetric;
  }
  function clearSearch(){setDraft("");setUsername("");setAudience("all");setOffset(0);setSelected(null);setRevision(value=>value+1);}
  function openModal(value:"settings"|"account"|"search"){
    if(value==="settings"){setPreferenceTheme(isLight?"light":"dark");setPreferenceRefresh(autoRefresh);setPreferenceError("");}
    if(value==="search"){setGlobalDraft("");setGlobalQuery(null);}
    setModal(value);
  }
  function savePreferences(){try{localStorage.setItem("leap-auto-refresh",String(preferenceRefresh));setAutoRefresh(preferenceRefresh);setTheme(preferenceTheme);setModal(null);}catch{setPreferenceError("Qurilma xotirasi mavjud emas.");}}
  async function logout(){
    setSigningOut(true);setLogoutError("");
    try{
      const response=await fetch("/api/admin/logout",{method:"POST",credentials:"same-origin",headers:{"X-Admin-CSRF":session.csrfToken},signal:AbortSignal.timeout(12000)});
      if(response.status===204||response.status===401){window.location.replace("/login");return;}
      throw new Error("Tizimdan chiqib bo‘lmadi. Qayta urinib ko‘ring.");
    }catch(error){setLogoutError(error instanceof Error?error.message:"Tizimdan chiqib bo‘lmadi.");setSigningOut(false);}
  }

  function openLearnerById(learnerId:string){setSelected(learnerId);setProfileId(learnerId);}
  function openLearner(personValue:Learner){openLearnerById(personValue.telegramUserId);}
  function openAllLearners(){go("Learners",true);}
  function openContent(mode:ContentMode){setContentMode(mode);}
  function openPaymentFilter(){setStatusDraft(paymentStatus);setMethodDraft(paymentMethod);setPaymentFilter(true);}
  function openNotification(id:string){setNotificationId(id);}
  function openBusiness(mode:"Manage access"|"Reconcile case"|"Learning intervention",learnerId?:string){setBusinessLearner(learnerId);setBusiness(mode);}

  function metricsFor(sectionValue:Section):Metric[]{
    if(sectionValue==="Learners"||sectionValue==="Overview")return [
      {icon:UsersRound,label:"Unikal telefonlar",value:overview.data?.uniquePhoneUsers.toLocaleString("en-US")??"—",detail:overview.data?`Web-only: ${overview.data.webOnlyPhoneUsers.toLocaleString("en-US")}`:"Bot va webdan olingan raqamlar",tone:"success" as const},
      {icon:Activity,label:"Faol foydalanuvchilar",value:summary.data?.activeLearners.toLocaleString("en-US")??"—",detail:"Tanlangan davrda",tone:"success" as const,filter:"active"},
      {icon:BadgeCheck,label:"PRO / access",value:summary.data?.lifetimeAccess?.toLocaleString("en-US")??"—",detail:"Lifetime access egalari",tone:"success" as const,filter:"access"},
      {icon:Flame,label:"E’tibor kerak",value:summary.data?.attention?(summary.data.attention.learners??summary.data.attention.access+summary.data.attention.learning).toLocaleString("en-US"):"—",detail:"Access va o‘quv signallari",tone:"warning" as const,filter:"attention"},
    ];
    if(sectionValue==="Ratings")return [
      {icon:UsersRound,label:"Jami PRO",value:ratings.data?.total.toLocaleString("en-US")??"—",detail:"Reyting ro‘yxatida",tone:"success" as const},
      {icon:Trophy,label:"Reytingda",value:ratings.data?.summary.ranked.toLocaleString("en-US")??"—",detail:"Kamida bitta dars tugatgan PRO",tone:"success" as const},
      {icon:Target,label:"Eng yuqori natija",value:ratings.data?.summary.topCompleted.toLocaleString("en-US")??"—",detail:"PRO foydalanuvchida",tone:"success" as const},
      {icon:TrendingUp,label:"O‘rtacha o‘zlashtirish",value:ratings.data?.summary.averageProgress===null||ratings.data?.summary.averageProgress===undefined?"—":`${ratings.data.summary.averageProgress}%`,detail:"Dars boshlagan PRO’larda",tone:"success" as const},
    ];
    if(sectionValue==="Content")return [
      {icon:Library,label:"Kurslar",value:overview.data?.coursesTotal.toLocaleString("en-US")??"—",detail:"Katalogdagi kurslar",tone:"success" as const,filter:"content-courses"},
      {icon:BookOpen,label:"Unitlar",value:contentTree.data?treeUnits.length.toLocaleString("en-US"):"—",detail:"Ko‘rinayotgan kurslarda",tone:"success" as const,filter:"content-units"},
      {icon:FileText,label:"Darslar",value:overview.data?.lessonsTotal.toLocaleString("en-US")??"—",detail:"Draft va published",tone:"success" as const,filter:"content-lessons"},
      {icon:Check,label:"Published",value:contentTree.data?treeUnits.flatMap(item=>item.lessons).filter(item=>item.status==="published").length.toLocaleString("en-US"):"—",detail:"Ko‘rinayotgan darslarda",tone:"success" as const,filter:"content-published"},
    ];
    if(sectionValue==="Commerce")return [
      {icon:CircleDollarSign,label:"Jami tushum",value:formatMoneyCompact(summary.data?.revenueTiyin),detail:"Tanlangan davr",tone:"success" as const,filter:"commerce-revenue"},
      {icon:WalletCards,label:"To‘langan buyurtmalar",value:summary.data?.paidOrders.toLocaleString("en-US")??"—",detail:"Muvaffaqiyatli to‘lovlar",tone:"success" as const,filter:"commerce-paid"},
      {icon:TrendingUp,label:"O‘rtacha chek",value:summary.data?.paidOrders?formatMoneyCompact(String(BigInt(summary.data.revenueTiyin)/BigInt(summary.data.paidOrders))):"—",detail:"Bir buyurtma o‘rtachasi",tone:"success" as const,filter:"commerce-average"},
      {icon:Clock3,label:"Kutilayotgan",value:summary.data?.health?.paymentsPending.toLocaleString("en-US")??"—",detail:"Pending buyurtmalar",tone:"warning" as const,filter:"commerce-pending"},
    ];
    return [
      {icon:Send,label:"Yuborilgan",value:summary.data?.notificationCreated.toLocaleString("en-US")??"—",detail:"Tanlangan davrda",tone:"success" as const,filter:"messages-sent"},
      {icon:MessageSquare,label:"O‘qilgan",value:summary.data?.notificationRead.toLocaleString("en-US")??"—",detail:"Mini App ichida",tone:"success" as const,filter:"messages-read"},
      {icon:Clock3,label:"O‘qilmagan",value:summary.data?Math.max(0,summary.data.notificationCreated-summary.data.notificationRead).toLocaleString("en-US"):"—",detail:"Hali ochilmagan",tone:"warning" as const,filter:"messages-unread"},
      {icon:BarChart3,label:"Jami xabarlar",value:notifications.data?.total.toLocaleString("en-US")??"—",detail:"Filtrlangan natijalar",tone:"success" as const,filter:"messages-total"},
    ];
  }

  function metrics(sectionValue:Section){
    return <div className="pd-metric-grid">{metricsFor(sectionValue).map(metric=><MetricCard key={metric.label} {...metric} onClick={metric.filter?()=>changeMetricFilter(sectionValue,metric.filter!):undefined} active={metricIsActive(sectionValue,metric.filter)}/>)}</div>;
  }

  function learnerRows(compact=false){
    if(directory.loading&&!directory.data)return <tr><td colSpan={11}><div className="pd-loading">Ma’lumotlar yuklanmoqda…</div></td></tr>;
    if(directory.error&&!directory.data)return <tr><td colSpan={11}><ErrorState message={directory.error} onRetry={()=>setRevision(value=>value+1)}/></td></tr>;
    if(!people.length)return <tr><td colSpan={11}><EmptyState title="Foydalanuvchi topilmadi" description="Qidiruv yoki filtrlarni o‘zgartirib qayta urinib ko‘ring." action={<button className="pd-button" onClick={clearSearch}>Filtrlarni tozalash</button>}/></td></tr>;
    return sortedPeople.slice(0,compact?5:25).map(personValue=>{
      const progress=learnerProgress(personValue);
      const hasCatalogAccess=personValue.catalogAccess===true;
      const payment=paymentSummaryByLearner.get(personValue.telegramUserId);
      const paymentCount=payment?payment.paymentsCount.toLocaleString("en-US"):paymentSummaries.loading?"…":"—";
      const paidTotal=payment?formatUzs(payment.paidTotalTiyin):paymentSummaries.loading?"…":"—";
      return <tr key={personValue.telegramUserId} data-learner-id={personValue.telegramUserId}>
        <td><span className="pd-id">{personValue.telegramUserId}</span></td>
        <td><button className="pd-person" onClick={()=>openLearner(personValue)}><span>{learnerInitials(personValue)}</span><div><strong>{learnerName(personValue)}</strong><small>{personValue.username?`@${personValue.username}`:"Username yo‘q"}</small></div></button></td>
        <td><ProgressBar value={progress} hideLabel/></td>
        <td><StatusPill tone={toneForProgress(progress)}>{personValue.botStartedAt?"Yangi":progress>=70?"Yaxshi":progress>=30?"Davom etmoqda":"Yangi"}</StatusPill></td>
        <td><span className="pd-muted">{personValue.miniAppOpenedAt?"(app)":"—"}</span></td>
        <td className="pd-table-number">{paymentCount}</td>
        <td className="pd-money">{paidTotal}</td>
        <td><span className="pd-muted">{formatDate(personValue.createdAt)}</span></td>
        <td><span className="pd-muted">{relativeSeen(personValue.lastSeenAt)}</span></td>
        <td><div className="pd-row-actions">{hasCatalogAccess?<button className="pd-row-action pro" title="Accessni o‘zgartirish" onClick={()=>openBusiness("Manage access",personValue.telegramUserId)}><BadgeCheck size={13}/>PRO</button>:<button className="pd-row-action fire" onClick={()=>openBusiness("Manage access",personValue.telegramUserId)}>PRO qilish</button>}</div></td>
        <td><button className="pd-text-button" onClick={()=>openLearner(personValue)}>Batafsil</button></td>
      </tr>;
    });
  }

  function ratingRows(){
    if(ratings.loading&&!ratings.data)return <tr><td colSpan={8}><div className="pd-loading">Reyting yuklanmoqda…</div></td></tr>;
    if(ratings.error&&!ratings.data)return <tr><td colSpan={8}><ErrorState message={ratings.error} onRetry={()=>setRevision(value=>value+1)}/></td></tr>;
    if(!ratings.data?.items.length)return <tr><td colSpan={8}><EmptyState title="PRO foydalanuvchi topilmadi" description="Qidiruvni o‘zgartirib qayta urinib ko‘ring." action={<button className="pd-button" onClick={clearSearch}>Qidiruvni tozalash</button>}/></td></tr>;
    return ratings.data.items.map(entry=>{
      const progress=entry.completionRate===null?0:Math.round(entry.completionRate);
      return <tr key={entry.learner.telegramUserId} data-rating-learner-id={entry.learner.telegramUserId}>
        <td><div className="pd-cell-stack"><strong>#{entry.rank}</strong><small>{entry.rankPool?`${entry.rankPool} ishtirokchi`:"Hali shakllanmagan"}</small></div></td>
        <td><button className="pd-person" onClick={()=>openLearner(entry.learner)}><span>{learnerInitials(entry.learner)}</span><div><strong>{learnerName(entry.learner)}</strong><small>{entry.learner.username?`@${entry.learner.username}`:entry.learner.telegramUserId}</small></div></button></td>
        <td className="pd-table-number">{entry.completedLessons.toLocaleString("en-US")}</td>
        <td className="pd-table-number">{entry.startedLessons.toLocaleString("en-US")}</td>
        <td><ProgressBar value={progress} hideLabel/></td>
        <td><StatusPill tone={toneForProgress(progress)}>{progress>=70?"Yaxshi":progress>=30?"Davom etmoqda":"Yangi"}</StatusPill></td>
        <td><span className="pd-muted">{relativeSeen(entry.learner.lastSeenAt)}</span></td>
        <td><button className="pd-text-button" onClick={()=>openLearner(entry.learner)}>Batafsil</button></td>
      </tr>;
    });
  }

  function learnerPanel(compact=false){
    return <Panel title="Foydalanuvchilar" subtitle={`Jami ${directory.data?.total.toLocaleString("en-US")??"—"} ta profil${audience==="all"?"":` · ${audienceLabels[audience]}`}`} action={<button className="pd-button" onClick={openAllLearners}>Barchasini ko‘rish</button>}>
      <div className="pd-toolbar">
        <SearchField value={draft} onChange={setDraft} onSubmit={()=>{setUsername(draft.trim());setOffset(0);setSelected(null);setRevision(value=>value+1);}} onClear={clearSearch}/>
        <label className="pd-filter-select"><Filter size={14}/><select aria-label="Foydalanuvchi filtri" value={audience} onChange={event=>changeAudience(event.target.value as AudienceFilter)}><option value="all">Barcha profillar</option><option value="active">Faol foydalanuvchilar</option><option value="access">PRO</option><option value="attention">E’tibor kerak</option></select><ChevronDown size={14}/></label>
        <button className="pd-button" onClick={()=>setReporting("Export report")}><Download size={14}/>Eksport</button>
      </div>
      <DataTable columns={learnerColumns} sortKey={learnerSort.key} sortDirection={learnerSort.direction} onSort={toggleLearnerSort}>{learnerRows(compact)}</DataTable>
      {!compact&&<Pager offset={directory.data?.offset??0} limit={directory.data?.limit??25} total={directory.data?.total??0} hasMore={directory.data?.hasMore??false} loading={directory.loading} onPrevious={()=>{setOffset(Math.max(0,offset-25));setSelected(null);}} onNext={()=>{setOffset(offset+25);setSelected(null);}}/>}
    </Panel>;
  }

  function ratingsScreen(){
    return <>
      <PageHeader title="Reyting" subtitle="PRO foydalanuvchilar o‘rtasida tugatilgan darslar va o‘zlashtirish reytingi" actions={<button className="pd-button primary" onClick={()=>setRevision(value=>value+1)}><RefreshCw size={14}/>Yangilash</button>}/>
      {metrics("Ratings")}
      <Panel title="PRO foydalanuvchilar reytingi" subtitle={`Jami ${ratings.data?.total.toLocaleString("en-US")??"—"} ta PRO profil`}>
        <div className="pd-toolbar">
          <SearchField value={draft} onChange={setDraft} onSubmit={()=>{setUsername(draft.trim());setOffset(0);setSelected(null);setRevision(value=>value+1);}} onClear={clearSearch}/>
        </div>
        <DataTable columns={ratingColumns}>{ratingRows()}</DataTable>
        <Pager offset={ratings.data?.offset??0} limit={ratings.data?.limit??25} total={ratings.data?.total??0} hasMore={ratings.data?.hasMore??false} loading={ratings.loading} onPrevious={()=>{setOffset(Math.max(0,offset-25));setSelected(null);}} onNext={()=>{setOffset(offset+25);setSelected(null);}}/>
      </Panel>
    </>;
  }

  function overviewScreen(){
    return <>
      <PageHeader title="Boshqaruv" subtitle="Foydalanuvchilar, kontent va to‘lovlarning umumiy holati" actions={<button className="pd-button primary" onClick={()=>setRevision(value=>value+1)}><RefreshCw size={14}/>Yangilash</button>}/>
      {metrics("Overview")}
      <div className="pd-two-column">
        {learnerPanel(true)}
        <Panel title="Faollik" subtitle="Kunlik tugatilgan darslar">
          <div className="pd-chart">
            {(summary.data?.daily??[]).slice(-14).map(day=>{
              const max=Math.max(1,...(summary.data?.daily??[]).map(item=>item.completedLessons));
              return <div key={day.date} className="pd-chart-column"><i style={{height:`${Math.max(6,Math.round(100*day.completedLessons/max))}%`}}/><small>{day.date.slice(8)}</small></div>;
            })}
            {!summary.data?.daily.length&&<EmptyState title="Faollik yo‘q" description="Tanlangan davrda saqlangan natijalar topilmadi."/>}
          </div>
          <div className="pd-insight-row">
            <div><span>Bugungi tushum</span><strong>{formatMoney(summary.data?.revenueTiyin)}</strong></div>
            <div><span>Faol o‘quvchilar</span><strong>{summary.data?.activeLearners.toLocaleString("en-US")??"—"}</strong></div>
          </div>
        </Panel>
      </div>
    </>;
  }

  function learnersScreen(){
    return <>
      <PageHeader title="Foydalanuvchilar" subtitle="Botdan foydalangan barcha a’zolar va to‘lov statistikasi" actions={<><button className="pd-button" onClick={()=>setReporting("Export report")}><Download size={14}/>Eksport</button><button className="pd-button primary" onClick={()=>setRevision(value=>value+1)}><RefreshCw size={14}/>Yangilash</button></>}/>
      <PeriodBar value={dateRange} onChange={next=>{setDateRange(next);setOffset(0);setSelected(null);}}/>
      {metrics("Learners")}
      {learnerPanel(false)}
    </>;
  }

  function contentScreen(){
    const courses=contentTree.data?.items??[];
    const canWrite=contentTree.data?.canWrite??false;
    const visibleCourses=courses.map(course=>{
      const units=course.units.flatMap(unit=>{
        const lessons=contentMetric==="content-published"?unit.lessons.filter(lesson=>lesson.status==="published"):unit.lessons;
        if(contentMetric==="content-published"&&!lessons.length)return [];
        return [{...unit,lessons:contentMetric==="content-units"?[]:lessons}];
      });
      return {...course,units:contentMetric==="content-courses"?[]:units};
    }).filter(course=>contentMetric==="content-lessons"||contentMetric==="content-published"?course.units.some(unit=>unit.lessons.length):true);
    const contentMetricText=contentMetric==="content-units"?"unitlar":contentMetric==="content-lessons"?"darslar":contentMetric==="content-published"?"published darslar":"barcha kontent";
    const selectedUnit=treeUnits.find(item=>item.id===activeUnit);
    const selectedLesson=selectedUnit?.lessons.find(item=>item.id===activeLesson);
    const blocks=contentDetail.data?.lesson.blocks??[];
    return <>
      <PageHeader title="Content" subtitle="Kurslar, unitlar va darslarni yagona joydan boshqaring" actions={<><button className="pd-button" disabled={!canWrite} onClick={()=>openContent("Import content")}><Plus size={14}/>Import</button><button className="pd-button" disabled={!canWrite||!activeUnit} onClick={()=>setStructureTarget({kind:"lesson",mode:"create",unitId:activeUnit??undefined})}><Plus size={14}/>Dars qo‘shish</button><button className="pd-button primary" disabled={!canWrite} onClick={()=>setStructureTarget({kind:"course",mode:"create"})}><Plus size={14}/>Kurs qo‘shish</button></>}/>
      {metrics("Content")}
      <div className="pd-content-grid">
        <Panel title="Kontent daraxti" subtitle={`${contentTree.data?.total??"—"} ta kurs · ${contentMetricText}`} className="pd-catalog-panel">
          {contentTree.loading&&!contentTree.data?<div className="pd-loading">Kontent yuklanmoqda…</div>:contentTree.error&&!contentTree.data?<ErrorState message={contentTree.error} onRetry={()=>setRevision(value=>value+1)}/>:<div className="pd-tree">
            {visibleCourses.map((course,index)=><details key={course.id} className="pd-tree-course" open={index===0}>
              <summary className="pd-tree-course-head">
                <span className="pd-tree-course-icon"><Folder size={16}/></span>
                <div><strong>{course.title}</strong><small>{course.slug} · {course.units.length} unit</small></div>
                <div className="pd-tree-actions" onClick={event=>event.preventDefault()}>
                  <button aria-label={`${course.title} kursini tahrirlash`} title="Kursni tahrirlash" disabled={!canWrite} onClick={()=>setStructureTarget({kind:"course",mode:"edit",id:course.id,version:course.version,title:course.title,slug:course.slug})}><Pencil size={13}/></button>
                  <button aria-label={`${course.title} kursiga unit qo‘shish`} title="Unit qo‘shish" disabled={!canWrite} onClick={()=>setStructureTarget({kind:"unit",mode:"create",courseId:course.id})}><Plus size={14}/></button>
                </div>
              </summary>
              <div className="pd-tree-units">
                {course.units.map(unit=><section key={unit.id} className="pd-tree-unit">
                  <div className="pd-tree-unit-head">
                    <button className={unit.id===activeUnit?"active":""} onClick={()=>{setUnitId(unit.id);setLessonId(unit.lessons[0]?.id??null);}}><BookOpen size={14}/><span><strong>{unit.title}</strong><small>{unit.slug} · {unit.lessons.length} dars</small></span></button>
                    <div className="pd-tree-actions">
                      <button aria-label={`${unit.title} unitini tahrirlash`} title="Unitni tahrirlash" disabled={!canWrite} onClick={()=>setStructureTarget({kind:"unit",mode:"edit",id:unit.id,version:unit.version,title:unit.title,slug:unit.slug,subtitle:unit.subtitle,courseId:course.id})}><Pencil size={13}/></button>
                      <button aria-label={`${unit.title} unitiga dars qo‘shish`} title="Dars qo‘shish" disabled={!canWrite} onClick={()=>setStructureTarget({kind:"lesson",mode:"create",unitId:unit.id})}><Plus size={14}/></button>
                    </div>
                  </div>
                  <div className="pd-tree-lessons">
                    {unit.lessons.map(lesson=><button key={lesson.id} data-lesson-id={lesson.id} className={`pd-tree-lesson ${lesson.id===activeLesson?"active":""}`} onClick={()=>{setUnitId(unit.id);setLessonId(lesson.id);}}><span>{lesson.position}</span><div><strong>{lesson.title}</strong><small>{lesson.slug}</small></div><StatusPill tone={lesson.status==="published"?"success":"warning"}>{lesson.status}</StatusPill></button>)}
                    {!unit.lessons.length&&<button className="pd-tree-empty" disabled={!canWrite} onClick={()=>setStructureTarget({kind:"lesson",mode:"create",unitId:unit.id})}><Plus size={13}/>Birinchi darsni qo‘shish</button>}
                  </div>
                </section>)}
                {!course.units.length&&<EmptyState title="Unit topilmadi" description="Bu kursda hali unit mavjud emas." action={<button className="pd-button primary" disabled={!canWrite} onClick={()=>setStructureTarget({kind:"unit",mode:"create",courseId:course.id})}><Plus size={14}/>Unit qo‘shish</button>}/>}
              </div>
            </details>)}
            {!visibleCourses.length&&<EmptyState title="Kontent topilmadi" description={courses.length?"Tanlangan metrika uchun mos kontent mavjud emas.":"Content bo‘limiga birinchi kursni qo‘shing."} action={!courses.length?<button className="pd-button primary" disabled={!canWrite} onClick={()=>setStructureTarget({kind:"course",mode:"create"})}><Plus size={14}/>Kurs qo‘shish</button>:undefined}/>}
          </div>
          }
          <Pager offset={catalogOffset} limit={25} total={contentTree.data?.total??0} hasMore={contentTree.data?.hasMore??false} loading={contentTree.loading} onPrevious={()=>{setCatalogOffset(Math.max(0,catalogOffset-25));setUnitId(null);setLessonId(null);}} onNext={()=>{setCatalogOffset(catalogOffset+25);setUnitId(null);setLessonId(null);}}/>
        </Panel>
        <Panel title={contentDetail.data?.lesson.title??selectedLesson?.title??"Darsni tanlang"} subtitle={selectedUnit?`${selectedUnit.courseTitle} / ${selectedUnit.title}`:"Kontentni tahrirlash"} className="pd-editor-panel">
          {contentDetail.data?<>
            <div className="pd-editor-meta"><StatusPill tone={contentDetail.data.lesson.status==="published"?"success":"warning"}>{contentDetail.data.lesson.status}</StatusPill><span title={`v${contentDetail.data.version}`}>v{contentDetail.data.version.slice(0,8)}</span></div>
            <div className="pd-block-list">{blocks.map(block=><article key={block.id}><span>{block.position}</span><div><strong>{block.type}</strong><small>{JSON.stringify(block.payload).slice(0,90)}</small></div><button className="pd-icon-button" aria-label="Blokni tahrirlash" onClick={()=>openContent(block.type==="video"?"Video block":block.type==="quiz"?"Quick check":"Key phrases")}><MoreHorizontal size={15}/></button></article>)}</div>
            <div className="pd-editor-actions"><button className="pd-button" onClick={()=>openContent("Lesson preview")}><FileText size={14}/>Ko‘rish</button><button className="pd-button" onClick={()=>openContent("Reorder lesson blocks")}><ListChecks size={14}/>Tartiblash</button><button className="pd-button primary" disabled={contentDetail.data.lesson.status==="published"} onClick={()=>openContent("Ready to publish")}><Check size={14}/>Publish</button></div>
            <div className="pd-editor-actions pd-editor-structure-actions"><button className="pd-button" disabled={!canWrite} onClick={()=>{const detail=contentDetail.data;if(detail)setStructureTarget({kind:"lesson",mode:"edit",id:detail.lesson.id,version:detail.version,title:detail.lesson.title,slug:detail.lesson.slug,unitId:detail.lesson.unitId});}}><Pencil size={14}/>Darsni tahrirlash</button></div>
          </>:contentTree.loading?<div className="pd-loading">Dars yuklanmoqda…</div>:<EmptyState title="Dars tanlanmagan" description="Daraxtdan dars tanlang yoki unit ichida yangi dars yarating."/>}
          <div className="pd-price-card"><div><span>Yillik kurs narxi</span><strong>{catalogPrice.data?`${catalogPrice.data.amountUzs.toLocaleString("en-US")} UZS`:"—"}</strong></div><button className="pd-button" disabled={!catalogPrice.data?.canWrite} title={catalogPrice.data?.canWrite?undefined:"Content yozish ruxsati kerak"} onClick={()=>setPriceOpen(true)}>Narxni o‘zgartirish</button></div>
        </Panel>
      </div>
    </>;
  }

  function transactionRows(){
    if(orders.loading&&!orders.data)return <tr><td colSpan={6}><div className="pd-loading">Buyurtmalar yuklanmoqda…</div></td></tr>;
    if(orders.error&&!orders.data)return <tr><td colSpan={6}><ErrorState message={orders.error} onRetry={()=>setRevision(value=>value+1)}/></td></tr>;
    if(!orders.data?.items.length)return <tr><td colSpan={6}><EmptyState title="Buyurtma topilmadi" description="Filtrlarni o‘zgartirib qayta urinib ko‘ring."/></td></tr>;
    return sortedOrders.map(order=>{
      const personValue=learnerByTelegramId.get(order.learnerId);
      return <tr key={order.id} data-order-id={order.id} className={order.id===activeOrder?"selected":""} onClick={()=>setOrderId(order.id)}>
      <td><span className="pd-id">{order.id.slice(0,18)}</span></td>
      <td><button className="pd-person-link" onClick={event=>{event.stopPropagation();openLearnerById(order.learnerId);}}><strong>{personValue?learnerName(personValue):`ID ${order.learnerId}`}</strong><small>{personValue?.username?`@${personValue.username}`:order.learnerId}</small></button></td>
      <td>{formatDateTime(order.createdAt)}</td>
      <td>{order.method}</td>
      <td><strong>{money(order)}</strong></td>
      <td><StatusPill tone={order.status==="paid"?"success":order.status==="cancelled"?"danger":"warning"}>{order.status}</StatusPill></td>
    </tr>;});
  }

  function revenueDistribution(){
    const total=BigInt(summary.data?.revenueTiyin??"0");
    const methods=[...(summary.data?.paymentMethods??[])].sort((left,right)=>BigInt(right.revenueTiyin)>BigInt(left.revenueTiyin)?1:-1);
    return <Panel title="Daromad taqsimoti" subtitle="To‘lov provayderlari bo‘yicha ulush">
      <div className="pd-revenue-total"><span>Jami tushum</span><strong>{formatMoneyCompact(summary.data?.revenueTiyin)}</strong></div>
      <div className="pd-provider-list">
        {methods.map(method=>{
          const share=total>BigInt(0)?Number(BigInt(method.revenueTiyin)*BigInt(100)/total):0;
          return <div className="pd-provider-row" key={method.method} data-provider={method.method}>
            <div><strong>{providerLabel(method.method)}</strong><span>{method.count.toLocaleString("en-US")} ta to‘lov</span><b>{share}%</b></div>
            <div className="pd-provider-track"><i style={{width:`${share}%`}}/></div>
            <small>{formatMoneyCompact(method.revenueTiyin)}</small>
          </div>;
        })}
        {!methods.length&&<EmptyState title="Daromad yo‘q" description="Tanlangan davrda muvaffaqiyatli to‘lovlar topilmadi."/>}
      </div>
    </Panel>;
  }

  function commerceScreen(){
    return <>
      <PageHeader title="To‘lovlar" subtitle="Tushumlar, buyurtmalar va foydalanuvchi access holati" actions={<button className="pd-button" onClick={()=>setReporting("Export report")}><Download size={14}/>Eksport</button>}/>
      <PeriodBar value={dateRange} onChange={next=>{setDateRange(next);setOrderOffset(0);setSelected(null);setOrderId(null);}}/>
      {metrics("Commerce")}
      <div className="pd-tabs"><button className={commerceTab==="transactions"?"active":""} onClick={()=>setCommerceTab("transactions")}>Tranzaksiyalar</button><button className={commerceTab==="learners"?"active":""} onClick={()=>setCommerceTab("learners")}>O‘quvchilar & access</button></div>
      {commerceTab==="transactions"?<div className="pd-commerce-grid">
        <Panel title="Oxirgi tranzaksiyalar" subtitle={`${orders.data?.total.toLocaleString("en-US")??"—"} ta buyurtma`} action={<button className="pd-button" onClick={openPaymentFilter}><Filter size={14}/>Filtr</button>}>
          <DataTable columns={paymentColumns} sortKey={orderSort.key} sortDirection={orderSort.direction} onSort={toggleOrderSort}>{transactionRows()}</DataTable>
          <Pager offset={orderOffset} limit={25} total={orders.data?.total??0} hasMore={orders.data?.hasMore??false} loading={orders.loading} onPrevious={()=>setOrderOffset(Math.max(0,orderOffset-25))} onNext={()=>setOrderOffset(orderOffset+25)}/>
        </Panel>
        <div className="pd-detail-stack">
          {revenueDistribution()}
          <Panel title="To‘lov tafsiloti" subtitle={activeOrder??"Buyurtma tanlanmagan"} className="pd-detail-panel">
            {payment.error&&<ErrorState message={payment.error} onRetry={()=>setRevision(value=>value+1)}/>}
            {payment.loading&&!payment.data&&<div className="pd-loading">Tafsilot yuklanmoqda…</div>}
            {payment.data&&<><div className="pd-detail-hero"><span>{payment.data.order.method}</span><strong>{money(payment.data.order)}</strong><StatusPill tone={payment.data.order.status==="paid"?"success":"warning"}>{payment.data.order.status}</StatusPill></div><dl className="pd-facts"><div><dt>Order ID</dt><dd>{payment.data.order.id}</dd></div><div><dt>Foydalanuvchi</dt><dd>{payment.data.order.learnerId}</dd></div><div><dt>Gateway</dt><dd>{payment.data.order.gateway}</dd></div><div><dt>Yaratilgan</dt><dd>{formatDateTime(payment.data.order.createdAt)}</dd></div><div><dt>To‘langan</dt><dd>{formatDateTime(payment.data.order.paidAt)}</dd></div><div><dt>Access</dt><dd>{payment.data.entitlement?.matchesPayment?"Mos":"Tekshirish kerak"}</dd></div></dl></>}
          </Panel>
        </div>
      </div>:learnerPanel(false)}
    </>;
  }

  function notificationRows(){
    if(notifications.loading&&!notifications.data)return <tr><td colSpan={5}><div className="pd-loading">Xabarlar yuklanmoqda…</div></td></tr>;
    if(notifications.error&&!notifications.data)return <tr><td colSpan={5}><ErrorState message={notifications.error} onRetry={()=>setRevision(value=>value+1)}/></td></tr>;
    if(!notifications.data?.items.length)return <tr><td colSpan={5}><EmptyState title="Xabar topilmadi" description="Tanlangan filtrlar bo‘yicha inbox yozuvlari mavjud emas."/></td></tr>;
    return notifications.data.items.map(item=><tr key={item.id} data-notification-id={item.id} className={item.id===notificationId?"selected":""} onClick={()=>openNotification(item.id)}><td><StatusPill tone={item.readAt?"success":"warning"}>{item.kind}</StatusPill></td><td><div className="pd-cell-stack"><strong>{item.title}</strong><small>{item.body.slice(0,70)}</small></div></td><td>{item.learnerId}</td><td>{formatDateTime(item.createdAt)}</td><td>{item.readAt?<StatusPill tone="success">O‘qilgan</StatusPill>:<StatusPill tone="warning">Yangi</StatusPill>}</td></tr>);
  }

  function messagesScreen(){
    return <>
      <PageHeader title="Xabarnoma" subtitle="Bot orqali yuborilgan xabarlar va Mini App inbox holati" actions={<><button className="pd-button" onClick={()=>setReporting("Date range")}><CalendarDays size={14}/>Davr</button><button className="pd-button" onClick={()=>setReporting("Export report")}><Download size={14}/>Eksport</button></>}/>
      {metrics("Messages")}
      <div className="pd-message-note"><span><Sparkles size={17}/></span><div><strong>Broadcast bot orqali boshqariladi</strong><p>Xabar yuborish uchun Telegram botning admin buyrug‘idan foydalaniladi. Bu ekran yuborilgan xabarlar tarixini ko‘rsatadi.</p></div></div>
      <div className="pd-commerce-grid">
        <Panel title="Yuborilgan xabarlar" subtitle={`${notifications.data?.total.toLocaleString("en-US")??"—"} ta yozuv`} action={<button className="pd-button" onClick={()=>setRevision(value=>value+1)}><RefreshCw size={14}/>Yangilash</button>}>
          <DataTable columns={notificationColumns}>{notificationRows()}</DataTable>
          <Pager offset={notificationOffset} limit={25} total={notifications.data?.total??0} hasMore={notifications.data?.hasMore??false} loading={notifications.loading} onPrevious={()=>setNotificationOffset(Math.max(0,notificationOffset-25))} onNext={()=>setNotificationOffset(notificationOffset+25)}/>
        </Panel>
        <Panel title="Xabar tafsiloti" subtitle={notificationId??"Xabar tanlanmagan"} className="pd-detail-panel">
          {notification.error&&<ErrorState message={notification.error} onRetry={()=>setRevision(value=>value+1)}/>}
          {notification.loading&&!notification.data&&<div className="pd-loading">Xabar yuklanmoqda…</div>}
          {notification.data&&<><div className="pd-detail-hero"><span>{notification.data.kind}</span><strong>{notification.data.title}</strong><StatusPill tone={notification.data.readAt?"success":"warning"}>{notification.data.readAt?"O‘qilgan":"O‘qilmagan"}</StatusPill></div><p className="pd-message-body">{notification.data.body}</p><dl className="pd-facts"><div><dt>Foydalanuvchi</dt><dd>{notification.data.learnerId}</dd></div><div><dt>Yaratilgan</dt><dd>{formatDateTime(notification.data.createdAt)}</dd></div><div><dt>O‘qilgan</dt><dd>{formatDateTime(notification.data.readAt)}</dd></div><div><dt>Action</dt><dd>{notification.data.actionPath??"—"}</dd></div></dl></>}
        </Panel>
      </div>
    </>;
  }

  function renderSection(){
    if(section==="Learners")return learnersScreen();
    if(section==="Ratings")return ratingsScreen();
    if(section==="Content")return contentScreen();
    if(section==="Commerce")return commerceScreen();
    if(section==="AI")return <SelfingoScreen/>;
    if(section==="Messages")return messagesScreen();
    return overviewScreen();
  }

  return <main className="pd-app" data-route={section}>
    <PushdayNavigation section={section} go={go} light={isLight} toggle={()=>setTheme(isLight?"dark":"light")} open={openModal} username={session.admin.username} logout={logout} refresh={()=>setRevision(value=>value+1)}/>
    <div className="pd-content">{renderSection()}</div>

    <LearnerDetailDrawer open={profileId!==null} learnerId={profileId} learner={profileLearner} analytics={profileAnalytics.data} payments={profilePayment} loading={profileDirectory.loading||profileAnalytics.loading||profilePayments.loading} error={profileDirectory.error??profileAnalytics.error??profilePayments.error} onClose={()=>setProfileId(null)} onRetry={()=>setRevision(value=>value+1)} onManageAccess={()=>{const id=profileId;setProfileId(null);openBusiness("Manage access",id??undefined);}}/>
    {contentMode&&<ContentDialog mode={contentMode} units={treeUnits} unitId={activeUnit??""} detail={contentDetail.data} csrf={session.csrfToken} canWrite={contentTree.data?.canWrite??false} onSaved={value=>{setUnitId(value.lesson.unitId);setLessonId(value.lesson.id);setRevision(current=>current+1);}} onClose={()=>{setContentMode(null);setRevision(current=>current+1);}}/>}
    {structureTarget&&<ContentStructureDialog target={structureTarget} courses={contentTree.data?.items.map(course=>({id:course.id,title:course.title}))??[]} units={treeUnits.map(unit=>({id:unit.id,title:unit.title,courseTitle:unit.courseTitle}))} csrf={session.csrfToken} canWrite={contentTree.data?.canWrite??false} onSaved={value=>{if(value.kind==="lesson")setLessonId(value.id);if(value.kind==="unit"){setUnitId(value.id);setLessonId(null);}setRevision(current=>current+1);}} onClose={()=>setStructureTarget(null)}/>}
    {priceOpen&&<PriceDialog current={catalogPrice.data} csrf={session.csrfToken} onSaved={()=>setRevision(value=>value+1)} onClose={()=>{setPriceOpen(false);setRevision(value=>value+1);}}/>}
    {business&&<BusinessDialog mode={business} learnerId={businessLearner??person?.telegramUserId} learnerName={businessLearner&&businessLearner!==person?.telegramUserId?businessLearner:person?learnerName(person):undefined} csrf={session.csrfToken} onClose={()=>setBusiness(null)} onSaved={()=>setRevision(value=>value+1)}/>}
    {reporting&&<ReportingDialog mode={reporting} resource={reportResource} query={reportQuery.toString()} onClose={()=>setReporting(null)} onApply={values=>{if(reporting==="Date range")setDateRange(Object.fromEntries(Object.entries(values).filter(([,value])=>value)));else setReportFilters(previous=>({...previous,[reportResource]:values}));setOffset(0);setOrderOffset(0);setNotificationOffset(0);setSelected(null);setOrderId(null);}}/>}
    {paymentFilter&&<Dialog open onOpenChange={setPaymentFilter}><DialogBody title="To‘lov filtrlari" description="Buyurtmalarni holat va to‘lov usuli bo‘yicha filtrlang."><label className="pd-field"><span>Holat</span><select value={statusDraft} onChange={event=>setStatusDraft(event.target.value)}><option value="">Barcha holatlar</option><option value="paid">Paid</option><option value="pending">Pending</option><option value="cancelled">Cancelled</option></select></label><label className="pd-field"><span>Usul</span><select value={methodDraft} onChange={event=>setMethodDraft(event.target.value)}><option value="">Barcha usullar</option>{["payme","click","uzum","paylov"].map(method=><option key={method} value={method}>{method}</option>)}</select></label><div className="pd-dialog-actions"><button className="pd-button" onClick={()=>setPaymentFilter(false)}>Bekor qilish</button><button className="pd-button primary" onClick={()=>{setCommerceMetric(null);setPaymentStatus(statusDraft);setPaymentMethod(methodDraft);setOrderOffset(0);setOrderId(null);setPaymentFilter(false);}}>Qo‘llash</button></div></DialogBody></Dialog>}
    {notificationId&&<Dialog open onOpenChange={value=>{if(!value)setNotificationId(null);}}><DialogBody title={notification.data?.title??"Xabar tafsiloti"} description="Mini App inbox yozuvi. Bu oynada o‘qilgan holat o‘zgartirilmaydi.">{notification.loading?<div className="pd-loading">Yuklanmoqda…</div>:notification.data?<><p className="pd-message-body">{notification.data.body}</p><dl className="pd-facts"><div><dt>Foydalanuvchi</dt><dd>{notification.data.learnerId}</dd></div><div><dt>Yaratilgan</dt><dd>{formatDateTime(notification.data.createdAt)}</dd></div><div><dt>O‘qilgan</dt><dd>{formatDateTime(notification.data.readAt)}</dd></div></dl></>:<ErrorState message={notification.error??"Xabar topilmadi"} onRetry={()=>setRevision(value=>value+1)}/>}<div className="pd-dialog-actions"><button className="pd-button primary" onClick={()=>setNotificationId(null)}>Yopish</button></div></DialogBody></Dialog>}
    {noteTarget&&<NoteDialog key={noteTarget.telegramUserId} learnerId={noteTarget.telegramUserId} learnerName={learnerName(noteTarget)} csrf={session.csrfToken} onViewRecord={()=>{setSelected(noteTarget.telegramUserId);setProfileId(noteTarget.telegramUserId);setNoteTarget(null);setRevision(value=>value+1);}} onClose={()=>{setNoteTarget(null);setRevision(value=>value+1);}}/>}
    <Dialog open={workflow!==null} onOpenChange={value=>{if(!value)setWorkflow(null);}}><DialogBody title={workflow??"Workflow"} description={workflow?workflowCards[workflow].description:"Bu amal hozircha mavjud emas."}><p className="pd-feedback">Bu workflow hozircha read-only rejimda. Backend API ulanmaguncha o‘zgartirish yaratilmaydi.</p><div className="pd-dialog-actions"><button className="pd-button" onClick={()=>setWorkflow(null)}>Bekor qilish</button><button className="pd-button primary" disabled>Mavjud emas</button></div></DialogBody></Dialog>
    <Dialog open={modal!==null} onOpenChange={value=>{if(!value)setModal(null);}}>
      <DialogBody title={modal==="settings"?"Sozlamalar":modal==="search"?"Qidiruv":"Administrator"} description={modal==="settings"?"Interfeys va avtomatik yangilash sozlamalari.":modal==="search"?"Ism, username yoki ID bo‘yicha foydalanuvchi qidirish.":"Tizimga kirgan administrator."}>
        {modal==="settings"&&<><label className="pd-field"><span>Ko‘rinish</span><select value={preferenceTheme} onChange={event=>setPreferenceTheme(event.target.value)}><option value="light">Light</option><option value="dark">Dark</option></select></label><label className="pd-field"><span>Avtomatik yangilash</span><select value={preferenceRefresh?"on":"off"} onChange={event=>setPreferenceRefresh(event.target.value==="on")}><option value="off">O‘chirilgan</option><option value="on">Har 60 sekundda</option></select></label>{preferenceError&&<p className="pd-error-text">{preferenceError}</p>}</>}
        {modal==="account"&&<><div className="pd-field"><span>Administrator</span><strong>{session.admin.username}</strong></div><div className="pd-field"><span>Sessiya</span><strong>Faol · Administrator</strong></div>{logoutError&&<p className="pd-error-text">{logoutError}</p>}</>}
        {modal==="search"&&<><form onSubmit={event=>{event.preventDefault();const next=globalDraft.trim();setGlobalQuery(next||null);setSearchRevision(value=>value+1);}}><label className="pd-field"><span>Qidiruv</span><input value={globalDraft} onChange={event=>setGlobalDraft(event.target.value)} placeholder="Ism, username yoki ID" required/></label><button className="pd-button primary" type="submit">Qidirish</button></form><div className="pd-search-results">{!globalQuery?<p>Kamida bitta harf yoki raqam kiriting.</p>:globalResults.loading?<p>Qidirilmoqda…</p>:globalResults.error?<ErrorState message={globalResults.error} onRetry={()=>setSearchRevision(value=>value+1)}/>:globalResults.data?.items.length?globalResults.data.items.map(result=><button key={result.telegramUserId} onClick={()=>{setModal(null);openLearner(result);}}><span>{learnerInitials(result)}</span><div><strong>{learnerName(result)}</strong><small>{result.username?`@${result.username}`:result.telegramUserId}</small></div><ChevronRight size={15}/></button>):<p>Natija topilmadi.</p>}</div></>}
        <div className="pd-dialog-actions"><button className="pd-button" onClick={()=>setModal(null)}>Yopish</button>{modal==="settings"&&<button className="pd-button primary" onClick={savePreferences}>Saqlash</button>}{modal==="account"&&<button className="pd-button primary" disabled={signingOut} onClick={logout}>{signingOut?"Chiqilmoqda…":"Chiqish"}</button>}</div>
      </DialogBody>
    </Dialog>
  </main>;
}
