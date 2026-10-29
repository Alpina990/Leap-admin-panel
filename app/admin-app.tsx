"use client";
import {useEffect,useRef,useState,type ReactNode} from "react";
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
  ChevronUp,
  CircleDollarSign,
  Clock3,
  Download,
  FileText,
  Filter,
  Flame,
  Library,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Trophy,
  UsersRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import {ContentDialog,type ContentDetail,type ContentMode} from "./content-dialog";
import {ContentStructureDialog,type StructureTarget} from "./content-structure-dialog";
import {PricePanel,type CatalogPrice} from "./price-dialog";
import {BusinessDialog} from "./business-dialog";
import {TransactionDeleteDialog} from "./transaction-delete-dialog";
import {TransactionEditDialog} from "./transaction-edit-dialog";
import {type LearnerAnalytics,type Summary} from "./analytics";
import {ReportingDialog,type ReportingResource} from "./reporting-dialog";
import {NoteDialog} from "./note-dialog";
import {money,feeSummary,withdrawalMoney,withdrawalMoneyCompact,type Orders,type Withdrawal,type Withdrawals} from "./payments";
import {PushdayNavigation,type PushdaySection} from "./pushday-navigation";
import {WithdrawalDialog} from "./withdrawal-dialog";
import {WithdrawalEditDialog} from "./withdrawal-edit-dialog";
import {formatAdminDateTime as formatDateTime, formatAdminRegistered, formatAdminRelativeTime} from "@/lib/admin-date-time.mjs";
import {readState} from "@/lib/read-state.mjs";
import {transactionIdentity,transactionMethodLabel,transactionProviderLabel} from "@/lib/admin-sales.mjs";
import {availableBalanceTiyin} from "@/lib/admin-finance.mjs";
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
type AudienceFilter="all"|"active"|"access"|"attention"|"watched";
type MetricFilter=AudienceFilter|"content-courses"|"content-units"|"content-lessons"|"content-published"|"commerce-revenue"|"commerce-paid"|"commerce-average"|"commerce-pending"|"commerce-withdrawn"|"commerce-balance"|"ratings-all"|"ratings-ranked"|"ratings-top"|"ratings-progress"|"messages-sent"|"messages-read"|"messages-unread"|"messages-total";
type Metric={icon:LucideIcon;label:string;value:string;detail:string;tone?:"success"|"warning"|"danger";filter?:MetricFilter};
type SortDirection=1|-1;
type SortState={key:string;direction:SortDirection};
type TableColumn={key:string;label:string;icon?:LucideIcon;sortable?:boolean;right?:boolean};
type LedgerRow={kind:"order";order:Orders["items"][number]}|{kind:"withdrawal";withdrawal:Withdrawal};

const navRoutes:Section[]=["Learners","Ratings","Commerce","Messages"];
const audienceLabels:Record<AudienceFilter,string>={all:"Barcha profillar",active:"Faol foydalanuvchilar",access:"PRO",attention:"E’tibor kerak",watched:"Darslikni ko‘rganlar"};
const learnerColumns:TableColumn[]=[
  {key:"name",label:"Foydalanuvchi",sortable:true},
  {key:"progress",label:"Progress",sortable:true},
  {key:"status",label:"Holat",sortable:true},
  {key:"mini_app",label:"Mini App"},
  {key:"times",label:"To‘lovlar",sortable:true,right:true},
  {key:"total",label:"Jami",sortable:true,right:true},
  {key:"bot_started_at",label:"Ro‘yxatdan o‘tgan",sortable:true},
  {key:"last_seen_at",label:"Oxirgi faollik",sortable:true},
  {key:"contact",label:"Aloqa",icon:MessageSquare},
  {key:"pro",label:"PRO"}
];
// Every sortable learner column is ordered by the server across the whole filtered
// result set, not just the rows on the current page.
const learnerServerSortKeys:Record<string,string>={id:"telegramUserId",name:"name",progress:"progress",status:"status",times:"payments",total:"total",bot_started_at:"botStartedAt",last_seen_at:"lastSeenAt"};
const defaultLearnerSort={sort:"botStartedAt",direction:"desc"};
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
  {key:"status",label:"Holat",sortable:true},
  {key:"withdraw",label:"Yechish",right:true},
  {key:"edit",label:"Tahrirlash",right:true},
  {key:"delete",label:"O‘chirish",right:true}
];
const notificationColumns:TableColumn[]=[
  {key:"kind",label:"Turi"},
  {key:"message",label:"Xabar"},
  {key:"learner",label:"Foydalanuvchi"},
  {key:"date",label:"Sana"},
  {key:"read",label:"Holat"}
];
function formatMoneyCompact(tiyin?:string|null){
  if(tiyin===undefined||tiyin===null)return "—";
  const sums=BigInt(tiyin)/BigInt(100);
  return `${sums.toLocaleString("en-US").replace(/,/g," ")} UZS`;
}

function formatUzs(tiyin?:string|null){
  if(tiyin===undefined||tiyin===null)return "—";
  return `${(BigInt(tiyin)/BigInt(100)).toLocaleString("en-US").replace(/,/g," ")} so‘m`;
}

function providerLabel(value:string){
  const labels:Record<string,string>={unknown:"Noma’lum",crm:"Noma’lum",payme:"Payme",card_transfer:"Karta orqali",hamkorbank_transfer:"Hamkorbank transfer",click:"Click",uzum:"Uzum",paylov:"Paylov",paylater:"Paylater",other:"Boshqa usul"};
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

function learnerName(person:Learner){
  return [person.firstName,person.lastName].filter(Boolean).join(" ")||person.username||person.telegramUserId;
}

function learnerInitials(person:Learner){
  return [person.firstName,person.lastName].filter(Boolean).map(value=>value!.slice(0,1)).join("")||"—";
}

function learnerProgress(person:Learner){
  if(typeof person.watchedPercent==="number")return Math.max(0,Math.min(100,person.watchedPercent));
  const started=person.startedLessons??0;
  return started?Math.round(100*(person.completedLessons??0)/started):0;
}

function formatProgress(value:number){
  const rounded=Math.round(value*100)/100;
  return `${Number.isInteger(rounded)?rounded:rounded.toFixed(2).replace(/0+$/,"").replace(/\.$/,"")}%`;
}

function toneForProgress(value:number){
  if(value>=70)return "success" as const;
  if(value>=30)return "warning" as const;
  return "neutral" as const;
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
    <div className="pd-progress-copy">{!hideLabel&&<span>{label??"Progress"}</span>}<strong>{formatProgress(safe)}</strong></div>
    <div className="pd-progress-track"><i style={{width:`${safe}%`}}/></div>
  </div>;
}

function RegisteredStamp({value}:{value?:string|null}){
  const stamp=formatAdminRegistered(value);
  return <span className="pd-muted">{stamp.date}{stamp.time?<strong className="pd-stamp-time">{stamp.time}</strong>:null}</span>;
}

function LearnerDetailDrawer({open,learnerId,learner,analytics,payments,loading,error,order,onClose,onRetry,onManageAccess}:{open:boolean;learnerId:string|null;order?:Orders["items"][number]|null;learner?:Learner;analytics?:LearnerAnalytics;payments?:PaymentSummary;loading:boolean;error?:string;onClose:()=>void;onRetry:()=>void;onManageAccess:()=>void}){
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
            <div><dt>Ro‘yxatdan o‘tgan</dt><dd><RegisteredStamp value={learner.botStartedAt??learner.createdAt}/></dd></div>
          </dl>
          {order?<div className="pd-drawer-summary pd-drawer-order">
            <article><span><CircleDollarSign size={16}/></span><div><small>To‘lov summasi</small><strong>{money(order)}</strong>{(()=>{const fee=feeSummary(order);return fee?<small>Jami {fee.gross} · komissiya {fee.pct}%</small>:null;})()}</div></article>
            <article><span><WalletCards size={16}/></span><div><small>Provayder</small><strong>{transactionProviderLabel(order)}</strong><small>{formatDateTime(order.paidAt??order.createdAt)}</small></div></article>
          </div>:null}
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
  const picker=useRef<HTMLInputElement|null>(null);
  function openPicker(){const input=picker.current;if(!input)return;try{input.showPicker();}catch{input.focus();}}
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
  // A complete but unusable date is reported instead of being silently ignored.
  const draftIso=draft.length===10?manualDateToIso(draft):null;
  const invalid=draft.length===10&&(!draftIso||(!!min&&draftIso<min)||(!!max&&draftIso>max));
  return <label className="pd-period-field">
    <span>{label}</span>
    <div className="pd-period-control">
      <input aria-label={label} aria-invalid={invalid||undefined} inputMode="numeric" maxLength={10} value={draft} onBlur={()=>setDraft(isoToManualDate(value))} onChange={event=>update(event.target.value)} placeholder="kk/oo/yyyy"/>
      <button type="button" className="pd-period-picker" aria-label={`${label} sanasini kalendardan tanlash`} onClick={event=>{event.preventDefault();openPicker();}}><CalendarDays size={14}/></button>
      <input ref={picker} type="date" tabIndex={-1} aria-hidden="true" className="pd-period-native" value={value??""} min={min} max={max} onChange={event=>{const next=event.target.value;if(!next){onChange("");return;}if((!min||next>=min)&&(!max||next<=max))onChange(next);}}/>
    </div>
    {invalid&&<small role="alert" className="pd-period-error">{min&&draftIso&&draftIso<min?"Boshlanishdan oldin bo‘lmasin":max&&draftIso&&draftIso>max?"Tugashdan keyin bo‘lmasin":"Sana noto‘g‘ri"}</small>}
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
    // The current month ends today, matching the "Shu oy" preset.
    onChange({start:isoDate(first),end:isoDate(last<today?last:today)});
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
    const LabelIcon=column.icon;
    const label=LabelIcon?<span className="pd-column-label"><LabelIcon size={12} aria-hidden="true"/><span>{column.label}</span></span>:<span>{column.label}</span>;
    return <th key={column.key} className={column.right?"r":undefined} aria-sort={active?(sortDirection===1?"ascending":"descending"):undefined}>
      {sortable?<button type="button" data-sort={column.key} className={`pd-sort${active?" on":""}${column.right?" r":""}`} onClick={()=>onSort?.(column.key)} aria-label={`${column.label} bo‘yicha saralash`}>{label}<Icon size={12} aria-hidden="true"/></button>:label}
    </th>;
  })}</tr></thead><tbody>{children}</tbody></table></div>;
}

function DialogBody({title,description,children}:{title:string;description:string;children:ReactNode}){
  return <DialogContent className="pd-dialog" showCloseButton={false}><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>{children}</DialogContent>;
}

export default function AdminApp({session}:{session:AdminSession}){
  const {resolvedTheme,setTheme}=useTheme();
  const [themeReady,setThemeReady]=useState(false);
  const [section,setSection]=useState<Section>("Learners");
  const [revision,setRevision]=useState(0);
  const [audience,setAudience]=useState<AudienceFilter>("all");
  const [learnerSort,setLearnerSort]=useState<SortState>({key:"bot_started_at",direction:-1});
  const [contactMarks,setContactMarks]=useState<Record<string,boolean>>({});
  const [contactBusy,setContactBusy]=useState<Record<string,boolean>>({});
  const [contactError,setContactError]=useState("");
  const [withdrawBusy,setWithdrawBusy]=useState<Record<string,boolean>>({}),[withdrawError,setWithdrawError]=useState("");
  const [contentMetric,setContentMetric]=useState<MetricFilter|null>(null);
  const [commerceMetric,setCommerceMetric]=useState<MetricFilter|null>(null);
  const [messagesMetric,setMessagesMetric]=useState<MetricFilter|null>(null);
  const [ratingMetric,setRatingMetric]=useState<MetricFilter|null>(null);
  const [notificationRead,setNotificationRead]=useState<"all"|"read"|"unread">("all");
  const [draft,setDraft]=useState("");
  const [username,setUsername]=useState("");
  const [offset,setOffset]=useState(0);
  const [selected,setSelected]=useState<string|null>(null);
  const [profileId,setProfileId]=useState<string|null>(null);
  const [profileOrder,setProfileOrder]=useState<Orders["items"][number]|null>(null);
  const [modal,setModal]=useState<"settings"|"account"|"search"|null>(null);
  const [contentMode,setContentMode]=useState<ContentMode|null>(null);
  const [structureTarget,setStructureTarget]=useState<StructureTarget|null>(null);
  const [unitId,setUnitId]=useState<string|null>(null);
  const [lessonId,setLessonId]=useState<string|null>(null);
  const catalogOffset=0;
  const [withdrawalOpen,setWithdrawalOpen]=useState(false);
  const [reporting,setReporting]=useState<"Date range"|"Sort & paginate"|"Export report"|null>(null);
  const [reportFilters,setReportFilters]=useState<Record<string,Record<string,string>>>({});
  const [dateRange,setDateRange]=useState<Record<string,string>>({});
  const [business,setBusiness]=useState<"Manage access"|"Reconcile case"|"Learning intervention"|null>(null);
  const [businessLearner,setBusinessLearner]=useState<string|undefined>();
  const [notificationOffset,setNotificationOffset]=useState(0);
  const [notificationId,setNotificationId]=useState<string|null>(null);
  const [commerceTab,setCommerceTab]=useState<"learners"|"transactions">("transactions");
  const [financeOpen,setFinanceOpen]=useState(false);
  const [orderOffset,setOrderOffset]=useState(0);
  const [orderSort,setOrderSort]=useState<SortState>({key:"created_at",direction:-1});
  const [orderId,setOrderId]=useState<string|null>(null);
  const [deleteTransaction,setDeleteTransaction]=useState<Orders["items"][number]|null>(null);
  const [editTransaction,setEditTransaction]=useState<Orders["items"][number]|null>(null);
  const [deleteWithdrawal,setDeleteWithdrawal]=useState<Withdrawal|null>(null);
  const [editWithdrawal,setEditWithdrawal]=useState<Withdrawal|null>(null);
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
  const hasDateFilter=Object.keys(dateRange).length>0;
  const allTimeFinanceSummary=useRead<Summary>(section==="Commerce"&&hasDateFilter?"/api/admin/analytics-summary":null,revision);
  const learnerServerSort={sort:learnerServerSortKeys[learnerSort.key]??defaultLearnerSort.sort,direction:learnerSort.direction===1?"asc":"desc"};
  const query=new URLSearchParams({limit:"25",offset:String(offset),audience,...dateRange,...learnerServerSort,...reportFilters.learners});
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
  const person=people.find(item=>item.telegramUserId===selected)??people[0];
  const profileDirectory=useRead<LearnerDirectory>(profileId?"/api/admin/learners?"+new URLSearchParams({limit:"1",offset:"0",learnerId:profileId}):null,revision);
  const profileLearner=profileDirectory.data?.items[0]??people.find(item=>item.telegramUserId===profileId);
  const profileAnalytics=useRead<LearnerAnalytics>(profileId?"/api/admin/analytics-learner?"+new URLSearchParams({learnerId:profileId}):null,revision);
  const profilePayments=useRead<PaymentSummaries>(profileId?"/api/admin/learner-payments?"+new URLSearchParams({learnerIds:profileId}):null,revision);
  const profilePayment=profilePayments.data?.items.find(item=>item.learnerId===profileId);
  const profileLastOrder=useRead<Orders>(profileId&&!profileOrder?"/api/admin/payments?"+new URLSearchParams({learnerId:profileId,status:"paid",limit:"1",offset:"0",sort:"createdAt",direction:"desc"}):null,revision);
  const contentTree=useRead<ContentTree>(section==="Content"?"/api/admin/content-tree?limit=25&offset="+catalogOffset:null,revision);
  const catalogPrice=useRead<CatalogPrice>(section==="Commerce"?"/api/admin/content-price":null,revision);
  const treeUnits=(contentTree.data?.items??[]).flatMap(course=>course.units.map(unit=>({...unit,courseId:course.id,courseTitle:course.title,lessonCount:unit.lessons.length})));
  const activeUnit=treeUnits.find(item=>item.id===unitId)?.id??treeUnits[0]?.id??null;
  const activeUnitLessons=treeUnits.find(item=>item.id===activeUnit)?.lessons??[];
  const activeLesson=activeUnitLessons.find(item=>item.id===lessonId)?.id??activeUnitLessons[0]?.id??null;
  const contentDetail=useRead<ContentDetail>(section==="Content"&&activeLesson?"/api/admin/content-lesson?"+new URLSearchParams({lessonId:activeLesson}):null,revision);
  const ordersQuery=new URLSearchParams({limit:"25",offset:String(orderOffset),...dateRange,...reportFilters.payments});
  if(paymentStatus)ordersQuery.set("status",paymentStatus);
  if(paymentMethod)ordersQuery.set("method",paymentMethod);
  const orders=useRead<Orders>(section==="Commerce"&&commerceTab==="transactions"?"/api/admin/payments?"+ordersQuery:null,revision);
  const withdrawals=useRead<Withdrawals>(section==="Commerce"?"/api/admin/withdrawals?"+new URLSearchParams({limit:"100",offset:"0",...dateRange}):null,revision);
  const allTimeFinanceWithdrawals=useRead<Withdrawals>(section==="Commerce"&&hasDateFilter?"/api/admin/withdrawals?"+new URLSearchParams({limit:"1",offset:"0"}):null,revision);
  const currentBalanceSummary=hasDateFilter?allTimeFinanceSummary:summary;
  const currentBalanceWithdrawals=hasDateFilter?allTimeFinanceWithdrawals:withdrawals;
  const transactionLearnerIds=[...new Set((orders.data?.items??[]).map(item=>item.learnerId).filter((id):id is string=>id!==null))];
  const transactionSummaries=useRead<PaymentSummaries>(section==="Commerce"&&commerceTab==="transactions"&&transactionLearnerIds.length?"/api/admin/learner-payments?"+new URLSearchParams({learnerIds:transactionLearnerIds.join(","),includeProfiles:"1"}):null,revision);
  const learnerByTelegramId=new Map([...people,...(transactionSummaries.data?.items??[]).flatMap(item=>item.learner?[item.learner]:[])].map(item=>[item.telegramUserId,item]));
  const orderPersonName=(order:Orders["items"][number])=>{
    const person=order.learnerId?learnerByTelegramId.get(order.learnerId):undefined;
    return person?learnerName(person):transactionIdentity(order).label;
  };
  const ledgerSourceName=(sourceId:string)=>{const source=(orders.data?.items??[]).find(item=>item.id===sourceId);return source?orderPersonName(source):"tranzaksiya";};
  const ledgerId=(row:LedgerRow)=>row.kind==="order"?row.order.id:`withdrawal:${row.withdrawal.id}`;
  const ledgerDate=(row:LedgerRow)=>row.kind==="order"?row.order.createdAt:row.withdrawal.createdAt;
  const ledgerPerson=(row:LedgerRow)=>row.kind==="order"?orderPersonName(row.order):"Yechish";
  const ledgerMethod=(row:LedgerRow)=>row.kind==="order"?row.order.method:"";
  // Orders carry tiyin, withdrawals carry so'm. Compare both at tiyin scale and
  // keep money-out negative, so the amount column orders one mixed ledger.
  const ledgerAmount=(row:LedgerRow)=>(row.kind==="order"?BigInt(row.order.amountTiyin):-BigInt(row.withdrawal.amount)*BigInt(100)).toString();
  const ledgerStatus=(row:LedgerRow)=>row.kind==="order"?row.order.status:"withdrawal";
  // Metric cards narrow the ledger: withdrawals only, or orders only for order-status cards.
  const showLedgerOrders=commerceMetric!=="commerce-withdrawn";
  const showLedgerWithdrawals=!commerceMetric||commerceMetric==="commerce-withdrawn"||commerceMetric==="commerce-balance";
  const ledgerRows:LedgerRow[]=[...(showLedgerOrders?orders.data?.items??[]:[]).map(order=>({kind:"order" as const,order})),...(showLedgerWithdrawals?withdrawals.data?.items??[]:[]).map(withdrawal=>({kind:"withdrawal" as const,withdrawal}))].sort((left,right)=>{
    let result=0;
    switch(orderSort.key){
      case "id": result=compareText(ledgerId(left),ledgerId(right)); break;
      case "user": result=compareText(ledgerPerson(left),ledgerPerson(right)); break;
      case "date": case "created_at": result=compareTimestamps(ledgerDate(left),ledgerDate(right)); break;
      case "method": result=compareText(ledgerMethod(left),ledgerMethod(right)); break;
      case "amount": result=compareBigInts(ledgerAmount(left),ledgerAmount(right)); break;
      case "status": result=compareText(ledgerStatus(left),ledgerStatus(right)); break;
    }
    return result*orderSort.direction||compareText(ledgerId(left),ledgerId(right));
  });
  const activeOrder=orders.data?.items.find(item=>item.id===orderId)?.id??orders.data?.items[0]?.id??null;
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
    setPaymentStatus(selected==="commerce-pending"?"pending":selected==="commerce-revenue"||selected==="commerce-paid"?"paid":"");
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
    if(sectionValue==="Ratings"){setRatingMetric(current=>current===filter?null:filter);return;}
    toggleMessagesMetric(filter);
  }
  function metricIsActive(sectionValue:Section,filter?:MetricFilter){
    if(!filter)return false;
    if(sectionValue==="Overview"||sectionValue==="Learners")return filter===audience;
    if(sectionValue==="Content")return filter===contentMetric;
    if(sectionValue==="Commerce")return filter===commerceMetric;
    if(sectionValue==="Ratings")return filter===ratingMetric;
    return filter===messagesMetric;
  }
  function clearSearch(){setDraft("");setUsername("");setAudience("all");setOffset(0);setSelected(null);setRevision(value=>value+1);}
  const canWithdrawOrder=(order:Orders["items"][number])=>order.status==="paid"&&order.includedInSales!==false&&BigInt(order.amountTiyin)%BigInt(100)===BigInt(0);
  async function withdrawTransaction(order:Orders["items"][number]){
    if(withdrawBusy[order.id]||(!order.withdrawalId&&!canWithdrawOrder(order)))return;
    setWithdrawError("");
    setWithdrawBusy(current=>({...current,[order.id]:true}));
    try{
      if(order.withdrawalId){
        if(!order.withdrawalVersion)throw new Error("Yechish versiyasi topilmadi. Sahifani yangilang.");
        const removal=await fetch("/api/admin/business-delete-withdrawal",{method:"POST",credentials:"same-origin",cache:"no-store",headers:{"Content-Type":"application/json","X-Admin-CSRF":session.csrfToken},body:JSON.stringify({withdrawalId:order.withdrawalId,baseVersion:order.withdrawalVersion,requestId:crypto.randomUUID()}),signal:AbortSignal.timeout(12000)});
        if(removal.status===401){window.location.replace("/login");return;}
        const removed=await removal.json();
        if(!removal.ok)throw new Error(removed.error?.message??"Yechishni olib tashlab bo‘lmadi.");
        setRevision(value=>value+1);
        return;
      }
      const note=`Tranzaksiya ${order.id.slice(0,18)} · ${orderPersonName(order)}`.slice(0,255);
      const response=await fetch("/api/admin/withdrawals",{method:"POST",credentials:"same-origin",cache:"no-store",headers:{"Content-Type":"application/json","X-Admin-CSRF":session.csrfToken},body:JSON.stringify({amount:Number(BigInt(order.amountTiyin)/BigInt(100)),note,sourceTransactionId:order.id,requestId:crypto.randomUUID()}),signal:AbortSignal.timeout(12000)});
      if(response.status===401){window.location.replace("/login");return;}
      const data=await response.json();
      if(!response.ok)throw new Error(data.error?.message??"Yechishni yozib bo‘lmadi.");
      setRevision(value=>value+1);
    }catch(error){
      setWithdrawError(error instanceof Error?error.message:"Yechishni yozib bo‘lmadi.");setRevision(value=>value+1);
    }finally{
      setWithdrawBusy(current=>{const nextState={...current};delete nextState[order.id];return nextState;});
    }
  }
  function contactMarked(person:Learner){return contactMarks[person.telegramUserId]??person.contacted===true;}
  async function toggleContactMark(person:Learner){
    const learnerId=person.telegramUserId;
    const next=!contactMarked(person);
    setContactError("");
    setContactMarks(current=>({...current,[learnerId]:next}));
    setContactBusy(current=>({...current,[learnerId]:true}));
    try{
      const response=await fetch("/api/admin/contact-marks",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json","X-Admin-CSRF":session.csrfToken},body:JSON.stringify({learnerId,contacted:next}),signal:AbortSignal.timeout(12000)});
      if(response.status===401){window.location.replace("/login");return;}
      const data=await response.json();
      if(!response.ok)throw new Error(data.error?.message??"Aloqa belgisini saqlab bo‘lmadi.");
      setContactMarks(current=>({...current,[learnerId]:data.contacted===true}));
    }catch(error){
      setContactMarks(current=>({...current,[learnerId]:!next}));
      setContactError(error instanceof Error?error.message:"Aloqa belgisini saqlab bo‘lmadi.");
    }finally{
      setContactBusy(current=>{const nextState={...current};delete nextState[learnerId];return nextState;});
    }
  }
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

  function openLearnerById(learnerId:string,order:Orders["items"][number]|null=null){setSelected(learnerId);setProfileId(learnerId);setProfileOrder(order);}
  function openLearner(personValue:Learner){openLearnerById(personValue.telegramUserId);}
  function openAllLearners(){go("Learners",true);}
  function openPaymentFilter(){setStatusDraft(paymentStatus);setMethodDraft(paymentMethod);setPaymentFilter(true);}
  function openNotification(id:string){setNotificationId(id);}
  function openBusiness(mode:"Manage access"|"Reconcile case"|"Learning intervention",learnerId?:string){setBusinessLearner(learnerId);setBusiness(mode);}

  function metricsFor(sectionValue:Section):Metric[]{
    if(sectionValue==="Learners"||sectionValue==="Overview")return [
      {icon:UsersRound,label:"Unikal telefonlar",value:overview.data?.uniquePhoneUsers.toLocaleString("en-US")??"—",detail:overview.data?`Web-only: ${overview.data.webOnlyPhoneUsers.toLocaleString("en-US")}`:"Bot va webdan olingan raqamlar",tone:"success" as const,filter:"all"},
      {icon:Activity,label:"Faol foydalanuvchilar",value:summary.data?.activeLearners.toLocaleString("en-US")??"—",detail:"Tanlangan davrda",tone:"success" as const,filter:"active"},
      {icon:BadgeCheck,label:"PRO / access",value:summary.data?.lifetimeAccess?.toLocaleString("en-US")??"—",detail:"Lifetime access egalari",tone:"success" as const,filter:"access"},
      {icon:Flame,label:"E’tibor kerak",value:summary.data?.attention?(summary.data.attention.learners??summary.data.attention.access+summary.data.attention.learning).toLocaleString("en-US"):"—",detail:"Access va o‘quv signallari",tone:"warning" as const,filter:"attention"},
    ];
    if(sectionValue==="Ratings")return [
      {icon:UsersRound,label:"Jami PRO",value:ratings.data?.total.toLocaleString("en-US")??"—",detail:"Reyting ro‘yxatida",tone:"success" as const,filter:"ratings-all"},
      {icon:Trophy,label:"Reytingda",value:ratings.data?.summary.ranked.toLocaleString("en-US")??"—",detail:"Kamida bitta dars tugatgan PRO",tone:"success" as const,filter:"ratings-ranked"},
      {icon:Target,label:"Eng yuqori natija",value:ratings.data?.summary.topCompleted.toLocaleString("en-US")??"—",detail:"PRO foydalanuvchida",tone:"success" as const,filter:"ratings-top"},
      {icon:TrendingUp,label:"O‘rtacha o‘zlashtirish",value:ratings.data?.summary.averageProgress===null||ratings.data?.summary.averageProgress===undefined?"—":`${ratings.data.summary.averageProgress}%`,detail:"Dars boshlagan PRO’larda",tone:"success" as const,filter:"ratings-progress"},
    ];
    if(sectionValue==="Content")return [
      {icon:Library,label:"Kurslar",value:overview.data?.coursesTotal.toLocaleString("en-US")??"—",detail:"Katalogdagi kurslar",tone:"success" as const,filter:"content-courses"},
      {icon:BookOpen,label:"Unitlar",value:contentTree.data?treeUnits.length.toLocaleString("en-US"):"—",detail:"Ko‘rinayotgan kurslarda",tone:"success" as const,filter:"content-units"},
      {icon:FileText,label:"Darslar",value:overview.data?.lessonsTotal.toLocaleString("en-US")??"—",detail:"Draft va published",tone:"success" as const,filter:"content-lessons"},
      {icon:Check,label:"Published",value:contentTree.data?treeUnits.flatMap(item=>item.lessons).filter(item=>item.status==="published").length.toLocaleString("en-US"):"—",detail:"Ko‘rinayotgan darslarda",tone:"success" as const,filter:"content-published"},
    ];
    if(sectionValue==="Commerce")return [
      {icon:CircleDollarSign,label:"Jami tushum",value:formatMoneyCompact(summary.data?.revenueTiyin),detail:"Tanlangan davr",tone:"success" as const,filter:"commerce-revenue"},
      {icon:ArrowDown,label:"Yechib olingan",value:withdrawals.data?withdrawalMoneyCompact(Number(withdrawals.data.withdrawnTotal)||0):"—",detail:"Tanlangan davrda",tone:"danger" as const,filter:"commerce-withdrawn"},
      {icon:WalletCards,label:"Balance",value:currentBalanceSummary.data&&currentBalanceWithdrawals.data?formatMoneyCompact(availableBalanceTiyin(currentBalanceSummary.data.revenueTiyin,currentBalanceWithdrawals.data.withdrawnTotal)):"—",detail:"Hozir mavjud mablag‘",tone:"success" as const,filter:"commerce-balance"},
      {icon:WalletCards,label:"To‘langan buyurtmalar",value:summary.data?.paidOrders.toLocaleString("en-US")??"—",detail:"Muvaffaqiyatli to‘lovlar",tone:"success" as const,filter:"commerce-paid"},
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
    if(directory.loading&&!directory.data)return <tr><td colSpan={10}><div className="pd-loading">Ma’lumotlar yuklanmoqda…</div></td></tr>;
    if(directory.error&&!directory.data)return <tr><td colSpan={10}><ErrorState message={directory.error} onRetry={()=>setRevision(value=>value+1)}/></td></tr>;
    if(!people.length)return <tr><td colSpan={10}><EmptyState title="Foydalanuvchi topilmadi" description="Qidiruv yoki filtrlarni o‘zgartirib qayta urinib ko‘ring." action={<button className="pd-button" onClick={clearSearch}>Filtrlarni tozalash</button>}/></td></tr>;
    return people.slice(0,compact?5:25).map(personValue=>{
      const progress=learnerProgress(personValue);
      const hasCatalogAccess=personValue.catalogAccess===true;
      const payment=paymentSummaryByLearner.get(personValue.telegramUserId);
      const paymentCount=payment?payment.paymentsCount.toLocaleString("en-US"):paymentSummaries.loading?"…":"—";
      const paidTotal=payment?formatUzs(payment.paidTotalTiyin):paymentSummaries.loading?"…":"—";
      return <tr key={personValue.telegramUserId} data-learner-id={personValue.telegramUserId} className="pd-clickable-row" onClick={()=>openLearner(personValue)}>
        <td className="pd-cell-person"><button className="pd-person" title={personValue.username?`${learnerName(personValue)} · @${personValue.username}`:learnerName(personValue)} onClick={event=>{event.stopPropagation();openLearner(personValue);}}><span>{learnerInitials(personValue)}</span><div><strong>{learnerName(personValue)}</strong><small>{personValue.username?`@${personValue.username}`:"Username yo‘q"}</small></div></button></td>
        <td><ProgressBar value={progress} hideLabel/></td>
        <td><StatusPill tone={toneForProgress(progress)}>{personValue.botStartedAt?"Yangi":progress>=70?"Yaxshi":progress>=30?"Davom etmoqda":"Yangi"}</StatusPill></td>
        <td><span className="pd-muted">{personValue.miniAppOpenedAt?"(app)":"—"}</span></td>
        <td className="pd-table-number">{paymentCount}</td>
        <td className="pd-money">{paidTotal}</td>
        <td><RegisteredStamp value={personValue.botStartedAt??personValue.createdAt}/></td>
        <td><span className="pd-muted" title={formatDateTime(personValue.lastSeenAt)}>{formatAdminRelativeTime(personValue.lastSeenAt)}</span></td>
        <td><button type="button" className={`pd-contact-check${contactMarked(personValue)?" on":""}`} aria-pressed={contactMarked(personValue)} disabled={Boolean(contactBusy[personValue.telegramUserId])} onClick={event=>{event.stopPropagation();void toggleContactMark(personValue);}} aria-label={`${learnerName(personValue)} aloqa belgisi`}><Check size={13}/></button></td>
        <td><div className="pd-row-actions">{hasCatalogAccess?<button className="pd-row-action pro" title="Accessni o‘zgartirish" onClick={event=>{event.stopPropagation();openBusiness("Manage access",personValue.telegramUserId);}}><BadgeCheck size={13}/>PRO</button>:<button className="pd-row-action fire" onClick={event=>{event.stopPropagation();openBusiness("Manage access",personValue.telegramUserId);}}>PRO qilish</button>}</div></td>
      </tr>;
    });
  }

  function ratingRows(){
    if(ratings.loading&&!ratings.data)return <tr><td colSpan={9}><div className="pd-loading">Reyting yuklanmoqda…</div></td></tr>;
    if(ratings.error&&!ratings.data)return <tr><td colSpan={9}><ErrorState message={ratings.error} onRetry={()=>setRevision(value=>value+1)}/></td></tr>;
    const top=ratings.data?.summary.topCompleted??0;
    const ratingItems=(ratings.data?.items??[]).filter(entry=>ratingMetric==="ratings-ranked"?entry.completedLessons>0:ratingMetric==="ratings-top"?top>0&&entry.completedLessons===top:ratingMetric==="ratings-progress"?entry.startedLessons>0:true);
    if(!ratingItems.length)return <tr><td colSpan={9}><EmptyState title="PRO foydalanuvchi topilmadi" description="Qidiruvni o‘zgartirib qayta urinib ko‘ring." action={<button className="pd-button" onClick={clearSearch}>Qidiruvni tozalash</button>}/></td></tr>;
    return ratingItems.map(entry=>{
      const progress=entry.completionRate===null?0:Math.round(entry.completionRate);
      return <tr key={entry.learner.telegramUserId} data-rating-learner-id={entry.learner.telegramUserId}>
        <td><div className="pd-cell-stack"><strong>#{entry.rank}</strong><small>{entry.rankPool?`${entry.rankPool} ishtirokchi`:"Hali shakllanmagan"}</small></div></td>
        <td className="pd-cell-person"><button className="pd-person" title={entry.learner.username?`${learnerName(entry.learner)} · @${entry.learner.username}`:learnerName(entry.learner)} onClick={()=>openLearner(entry.learner)}><span>{learnerInitials(entry.learner)}</span><div><strong>{learnerName(entry.learner)}</strong><small>{entry.learner.username?`@${entry.learner.username}`:entry.learner.telegramUserId}</small></div></button></td>
        <td className="pd-table-number">{entry.completedLessons.toLocaleString("en-US")}</td>
        <td className="pd-table-number">{entry.startedLessons.toLocaleString("en-US")}</td>
        <td><ProgressBar value={progress} hideLabel/></td>
        <td><StatusPill tone={toneForProgress(progress)}>{progress>=70?"Yaxshi":progress>=30?"Davom etmoqda":"Yangi"}</StatusPill></td>
        <td><span className="pd-muted" title={formatDateTime(entry.learner.lastSeenAt)}>{formatAdminRelativeTime(entry.learner.lastSeenAt)}</span></td>
        <td><button className="pd-text-button" onClick={()=>openLearner(entry.learner)}>Batafsil</button></td>
      </tr>;
    });
  }

  function learnerPanel(compact=false){
    return <Panel title="Foydalanuvchilar" subtitle={`Jami ${directory.data?.total.toLocaleString("en-US")??"—"} ta profil${audience==="all"?"":` · ${audienceLabels[audience]}`}`} action={<button className="pd-button" onClick={openAllLearners}>Barchasini ko‘rish</button>}>
      <div className="pd-toolbar">
        <SearchField value={draft} onChange={setDraft} onSubmit={()=>{setUsername(draft.trim());setOffset(0);setSelected(null);setRevision(value=>value+1);}} onClear={clearSearch}/>
        <label className="pd-filter-select"><Filter size={14}/><select aria-label="Foydalanuvchi filtri" value={audience} onChange={event=>changeAudience(event.target.value as AudienceFilter)}><option value="all">Barcha profillar</option><option value="active">Faol foydalanuvchilar</option><option value="access">PRO</option><option value="attention">E’tibor kerak</option><option value="watched">Darslikni ko‘rganlar</option></select><ChevronDown size={14}/></label>
        <button className="pd-button" onClick={()=>setReporting("Export report")}><Download size={14}/>Eksport</button>
      </div>
      {contactError&&<p className="pd-feedback" role="alert">{contactError}</p>}
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

  function learnersScreen(){
    return <>
      <PageHeader title="Foydalanuvchilar" subtitle="Botdan foydalangan barcha a’zolar va to‘lov statistikasi" actions={<><button className="pd-button" onClick={()=>setReporting("Export report")}><Download size={14}/>Eksport</button><button className="pd-button primary" onClick={()=>setRevision(value=>value+1)}><RefreshCw size={14}/>Yangilash</button></>}/>
      <PeriodBar value={dateRange} onChange={next=>{setDateRange(next);setOffset(0);setSelected(null);}}/>
      {metrics("Learners")}
      {learnerPanel(false)}
    </>;
  }

  function transactionRows(){
    if(orders.loading&&!orders.data)return <tr><td colSpan={9}><div className="pd-loading">Tranzaksiyalar yuklanmoqda…</div></td></tr>;
    if(orders.error&&!orders.data)return <tr><td colSpan={9}><ErrorState message={orders.error} onRetry={()=>setRevision(value=>value+1)}/></td></tr>;
    if(!ledgerRows.length)return <tr><td colSpan={9}><EmptyState title="Tranzaksiya topilmadi" description="Filtrlarni o‘zgartirib qayta urinib ko‘ring."/></td></tr>;
    return ledgerRows.map(row=>{
      if(row.kind==="withdrawal"){
        const withdrawal=row.withdrawal;
        return <tr key={ledgerId(row)} data-withdrawal-id={withdrawal.id} className="pd-withdrawal-row">
          <td><span className="pd-id">Yechish</span></td>
          <td><span className="pd-cell-stack"><strong>Yechish</strong><small>{withdrawal.sourceTransactionId?`${withdrawal.sourceTransactionId.slice(0,18)} · ${ledgerSourceName(withdrawal.sourceTransactionId)}`:withdrawal.note??withdrawal.actor}</small></span></td>
          <td>{formatDateTime(withdrawal.createdAt)}</td>
          <td><span className="pd-muted">—</span></td>
          <td><strong className="pd-money-out">-{withdrawalMoney(withdrawal.amount)}</strong></td>
          <td><StatusPill tone="danger">Yechish</StatusPill></td>
          <td><span className="pd-muted">—</span></td>
          <td><button className="pd-icon-button pd-edit-action" aria-label="Yechishni tahrirlash" title="Yechishni tahrirlash" onClick={event=>{event.stopPropagation();setEditWithdrawal(withdrawal);}}><Pencil size={15}/></button></td>
          <td><button className="pd-icon-button pd-delete-action" aria-label="Yechishni o‘chirish" title="Xato yechishni o‘chirish" onClick={event=>{event.stopPropagation();setDeleteWithdrawal(withdrawal);}}><Trash2 size={15}/></button></td>
        </tr>;
      }
      const order=row.order;
      const personValue=order.learnerId?learnerByTelegramId.get(order.learnerId):undefined;
      return <tr key={order.id} data-order-id={order.id} className={order.id===activeOrder?"selected":""} onClick={()=>{setOrderId(order.id);if(order.learnerId)openLearnerById(order.learnerId,order);}}>
      <td><span className="pd-id">{order.id.slice(0,18)}</span></td>
      <td><button className="pd-person-link" disabled={!order.learnerId} onClick={event=>{event.stopPropagation();if(order.learnerId)openLearnerById(order.learnerId,order);}}><strong>{personValue?learnerName(personValue):transactionIdentity(order).label}</strong><small>{personValue?.username?`@${personValue.username}`:transactionIdentity(order).detail}</small></button></td>
      <td>{formatDateTime(order.createdAt)}</td>
      <td>{transactionMethodLabel(order)}</td>
      <td><strong>{money(order)}</strong>{(()=>{const fee=feeSummary(order);return fee?<small className="pd-fee-note" title={`Summa ${fee.gross} · komissiya ${fee.pct}% (−${fee.fee})`}>−{fee.fee} ({fee.pct}%)</small>:null;})()}</td>
      <td><StatusPill tone={order.status==="paid"?"success":order.status==="cancelled"?"danger":"warning"}>{order.status}</StatusPill></td>
      <td>{canWithdrawOrder(order)||order.withdrawalId?<button type="button" className={`pd-contact-check pd-withdraw-check${order.withdrawalId?" on":""}`} aria-pressed={Boolean(order.withdrawalId)} disabled={Boolean(withdrawBusy[order.id])} title={order.withdrawalId?"Yechilgan. Qaytarish uchun bosing":"Yechish"} aria-label={`${order.id} tranzaksiyasini yechish`} onClick={event=>{event.stopPropagation();void withdrawTransaction(order);}}><Check size={13}/></button>:<span className="pd-muted">—</span>}</td>
      <td>{order.canEdit?<button className="pd-icon-button pd-edit-action" aria-label={`${order.id} tranzaksiyasini tahrirlash`} title="Tranzaksiyani tahrirlash" onClick={event=>{event.stopPropagation();setEditTransaction(order);}}><Pencil size={15}/></button>:<span className="pd-muted">—</span>}</td>
      <td>{order.canDelete?<button className="pd-icon-button pd-delete-action" aria-label={`${order.id} tranzaksiyasini o‘chirish`} title="Xato tranzaksiyani o‘chirish" onClick={event=>{event.stopPropagation();setDeleteTransaction(order);}}><Trash2 size={15}/></button>:<span className="pd-muted">—</span>}</td>
    </tr>;});
  }

  function revenueDistribution(){
    const total=BigInt(summary.data?.revenueTiyin??"0");
    const grouped=new Map<string,{method:string;count:number;revenueTiyin:bigint}>();
    for(const item of summary.data?.paymentMethods??[]){
      const raw=item.method.trim();
      const label=/^uzum\b/i.test(raw)?"Uzum":providerLabel(raw);
      const key=label.trim().toLowerCase();
      const entry=grouped.get(key)??{method:item.method.trim(),count:0,revenueTiyin:BigInt(0)};
      entry.count+=item.count;
      entry.revenueTiyin+=BigInt(item.revenueTiyin);
      grouped.set(key,entry);
    }
    const methods=[...grouped.values()].map(item=>({...item,revenueTiyin:item.revenueTiyin.toString()})).sort((left,right)=>BigInt(right.revenueTiyin)>BigInt(left.revenueTiyin)?1:-1);
    return <Panel title="Daromad taqsimoti" subtitle="To‘lov provayderlari bo‘yicha ulush">
      <div className="pd-revenue-total"><span>Jami tushum</span><strong>{formatMoneyCompact(summary.data?.revenueTiyin)}</strong></div>
      {summary.error&&<ErrorState message={summary.error} onRetry={()=>setRevision(value=>value+1)}/>}
      {summary.loading&&!summary.data&&<div className="pd-loading">Tushum yuklanmoqda…</div>}
      <div className="pd-provider-list">
        {methods.map(method=>{
          const share=total>BigInt(0)?Number(BigInt(method.revenueTiyin)*BigInt(100)/total):0;
          return <div className="pd-provider-row" key={method.method} data-provider={method.method}>
            <div><strong>{providerLabel(method.method)}</strong><span>{method.count.toLocaleString("en-US")} ta to‘lov</span><b>{share}%</b></div>
            <div className="pd-provider-track"><i style={{width:`${share}%`}}/></div>
            <small>{formatMoneyCompact(method.revenueTiyin)}</small>
          </div>;
        })}
        {summary.data&&!methods.length&&<EmptyState title="Daromad yo‘q" description="Tanlangan davrda muvaffaqiyatli to‘lovlar topilmadi."/>}
      </div>
    </Panel>;
  }

  function financeMetrics(){
    return <div className="pd-finance-metrics">
      {withdrawals.error&&<ErrorState message={withdrawals.error} onRetry={()=>setRevision(value=>value+1)}/>}
      {withdrawals.loading&&!withdrawals.data&&<div className="pd-loading">Yechishlar yuklanmoqda…</div>}
      {hasDateFilter&&(allTimeFinanceSummary.error||allTimeFinanceWithdrawals.error)&&<ErrorState message={allTimeFinanceSummary.error??allTimeFinanceWithdrawals.error??"Joriy balansni yuklab bo‘lmadi."} onRetry={()=>setRevision(value=>value+1)}/>}
      {hasDateFilter&&(allTimeFinanceSummary.loading||allTimeFinanceWithdrawals.loading)&&(!allTimeFinanceSummary.data||!allTimeFinanceWithdrawals.data)&&<div className="pd-loading">Joriy balans yuklanmoqda…</div>}
      {metricsFor("Commerce").map(metric=><div className="pd-finance-metric" key={metric.label}>
      <MetricCard {...metric} onClick={metric.filter?()=>changeMetricFilter("Commerce",metric.filter!):undefined} active={metricIsActive("Commerce",metric.filter)}/>
    </div>)}</div>;
  }

  function commerceScreen(){
    return <>
      <PageHeader title="To‘lovlar" subtitle="Tushumlar, yechishlar va tranzaksiyalar hisoboti" actions={<><button className="pd-button primary" onClick={()=>setWithdrawalOpen(true)}><Plus size={14}/>Yechish qo‘shish</button><button className="pd-button" onClick={()=>setReporting("Export report")}><Download size={14}/>Eksport</button></>}/>
      <PeriodBar value={dateRange} onChange={next=>{setDateRange(next);setOrderOffset(0);setSelected(null);setOrderId(null);}}/>
      {!financeOpen?<><button type="button" className="pd-finance-toggle" aria-expanded={financeOpen} aria-controls="pd-commerce-finance" aria-busy={withdrawals.loading} onClick={()=>setFinanceOpen(true)}><span>Moliya</span><ChevronDown size={18}/></button>{summary.error&&<ErrorState message={summary.error} onRetry={()=>setRevision(value=>value+1)}/>} {withdrawals.error&&<ErrorState message={withdrawals.error} onRetry={()=>setRevision(value=>value+1)}/>}</>:<section id="pd-commerce-finance" className="pd-commerce-finance-layout" aria-label="Moliya">
        {financeMetrics()}
        {revenueDistribution()}
        <button type="button" className="pd-finance-collapse" aria-label="Moliyani yig‘ish" onClick={()=>setFinanceOpen(false)}><ChevronUp size={20}/></button>
      </section>}
      {commerceTab==="transactions"?<>
        <Panel title="Tranzaksiyalar tarixi" subtitle={`${orders.data?.total.toLocaleString("en-US")??"—"} ta buyurtma${withdrawals.data?.total?` · ${withdrawals.data.total.toLocaleString("en-US")} ta yechish`:""}`} className="pd-transaction-history" action={<><button className="pd-button" onClick={()=>setCommerceTab("learners")}>O‘quvchilar &amp; access</button><button className="pd-button" onClick={openPaymentFilter}><Filter size={14}/>Filtr</button></>}>
          {withdrawals.error&&<ErrorState message={withdrawals.error} onRetry={()=>setRevision(value=>value+1)}/>}
          {withdrawals.loading&&!withdrawals.data&&<div className="pd-loading">Yechishlar tarixi yuklanmoqda…</div>}
          {withdrawError&&<p className="pd-feedback" role="alert">{withdrawError}</p>}
          <DataTable columns={paymentColumns} sortKey={orderSort.key} sortDirection={orderSort.direction} onSort={toggleOrderSort}>{transactionRows()}</DataTable>
          <Pager offset={orderOffset} limit={25} total={orders.data?.total??0} hasMore={orders.data?.hasMore??false} loading={orders.loading} onPrevious={()=>setOrderOffset(Math.max(0,orderOffset-25))} onNext={()=>setOrderOffset(orderOffset+25)}/>
        </Panel>
        <Panel title="Kurs narxi" className="pd-detail-panel pd-commerce-detail-panel">
          <PricePanel current={catalogPrice.data} csrf={session.csrfToken} onSaved={()=>setRevision(value=>value+1)}/>
        </Panel>
      </>:<><div className="pd-commerce-back"><button className="pd-button" onClick={()=>setCommerceTab("transactions")}><ChevronLeft size={14}/>Tranzaksiyalarga qaytish</button></div>{learnerPanel(false)}</>}
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
    if(section==="Commerce")return commerceScreen();
    if(section==="Messages")return messagesScreen();
    return learnersScreen();
  }

  return <main className="pd-app" data-route={section}>
    <PushdayNavigation section={section} go={go} light={isLight} toggle={()=>setTheme(isLight?"dark":"light")} open={openModal} username={session.admin.username} logout={logout} refresh={()=>setRevision(value=>value+1)}/>
    <div className="pd-content">{renderSection()}</div>

    <LearnerDetailDrawer open={profileId!==null} learnerId={profileId} learner={profileLearner} analytics={profileAnalytics.data} payments={profilePayment} order={profileOrder??profileLastOrder.data?.items[0]??null} loading={profileDirectory.loading||profileAnalytics.loading||profilePayments.loading} error={profileDirectory.error??profileAnalytics.error??profilePayments.error} onClose={()=>{setProfileId(null);setProfileOrder(null);}} onRetry={()=>setRevision(value=>value+1)} onManageAccess={()=>{const id=profileId;setProfileId(null);openBusiness("Manage access",id??undefined);}}/>
    {contentMode&&<ContentDialog mode={contentMode} units={treeUnits} unitId={activeUnit??""} detail={contentDetail.data} csrf={session.csrfToken} canWrite={contentTree.data?.canWrite??false} onSaved={value=>{setUnitId(value.lesson.unitId);setLessonId(value.lesson.id);setRevision(current=>current+1);}} onClose={()=>{setContentMode(null);setRevision(current=>current+1);}}/>}
    {structureTarget&&<ContentStructureDialog target={structureTarget} courses={contentTree.data?.items.map(course=>({id:course.id,title:course.title}))??[]} units={treeUnits.map(unit=>({id:unit.id,title:unit.title,courseTitle:unit.courseTitle}))} csrf={session.csrfToken} canWrite={contentTree.data?.canWrite??false} onSaved={value=>{if(value.kind==="lesson")setLessonId(value.id);if(value.kind==="unit"){setUnitId(value.id);setLessonId(null);}setRevision(current=>current+1);}} onClose={()=>setStructureTarget(null)}/>}
    {withdrawalOpen&&<WithdrawalDialog csrf={session.csrfToken} onSaved={()=>setRevision(value=>value+1)} onClose={()=>{setWithdrawalOpen(false);setRevision(value=>value+1);}}/>}
    {business&&<BusinessDialog mode={business} learnerId={businessLearner??person?.telegramUserId} learnerName={businessLearner&&businessLearner!==person?.telegramUserId?businessLearner:person?learnerName(person):undefined} csrf={session.csrfToken} onClose={()=>setBusiness(null)} onSaved={()=>setRevision(value=>value+1)}/>}
    {editWithdrawal&&<WithdrawalEditDialog withdrawal={editWithdrawal} csrf={session.csrfToken} onClose={()=>setEditWithdrawal(null)} onSaved={()=>setRevision(value=>value+1)}/>}
    {deleteWithdrawal&&<TransactionDeleteDialog withdrawal={deleteWithdrawal} csrf={session.csrfToken} onClose={()=>setDeleteWithdrawal(null)} onDeleted={()=>setRevision(value=>value+1)}/>}
    {editTransaction&&<TransactionEditDialog transaction={editTransaction} csrf={session.csrfToken} onClose={()=>setEditTransaction(null)} onSaved={()=>{setOrderId(null);setRevision(value=>value+1);}}/>}
    {deleteTransaction&&<TransactionDeleteDialog transaction={deleteTransaction} csrf={session.csrfToken} onClose={()=>setDeleteTransaction(null)} onDeleted={()=>{setOrderId(null);setRevision(value=>value+1);}}/>}
    {reporting&&<ReportingDialog mode={reporting} resource={reportResource} query={reportQuery.toString()} onClose={()=>setReporting(null)} onApply={values=>{if(reporting==="Date range")setDateRange(Object.fromEntries(Object.entries(values).filter(([,value])=>value)));else setReportFilters(previous=>({...previous,[reportResource]:values}));setOffset(0);setOrderOffset(0);setNotificationOffset(0);setSelected(null);setOrderId(null);}}/>}
    {paymentFilter&&<Dialog open onOpenChange={setPaymentFilter}><DialogBody title="To‘lov filtrlari" description="Buyurtmalarni holat va to‘lov usuli bo‘yicha filtrlang."><label className="pd-field"><span>Holat</span><select value={statusDraft} onChange={event=>setStatusDraft(event.target.value)}><option value="">Barcha holatlar</option><option value="paid">Paid</option><option value="cancelled">Cancelled</option></select></label><label className="pd-field"><span>Usul</span><select value={methodDraft} onChange={event=>setMethodDraft(event.target.value)}><option value="">Barcha usullar</option>{["unknown","payme","card_transfer","hamkorbank_transfer","click","uzum","paylov","paylater","other","tribute"].map(method=><option key={method} value={method}>{providerLabel(method)}</option>)}</select></label><div className="pd-dialog-actions"><button className="pd-button" onClick={()=>setPaymentFilter(false)}>Bekor qilish</button><button className="pd-button primary" onClick={()=>{setCommerceMetric(null);setPaymentStatus(statusDraft);setPaymentMethod(methodDraft);setOrderOffset(0);setOrderId(null);setPaymentFilter(false);}}>Qo‘llash</button></div></DialogBody></Dialog>}
    {notificationId&&<Dialog open onOpenChange={value=>{if(!value)setNotificationId(null);}}><DialogBody title={notification.data?.title??"Xabar tafsiloti"} description="Mini App inbox yozuvi. Bu oynada o‘qilgan holat o‘zgartirilmaydi.">{notification.loading?<div className="pd-loading">Yuklanmoqda…</div>:notification.data?<><p className="pd-message-body">{notification.data.body}</p><dl className="pd-facts"><div><dt>Foydalanuvchi</dt><dd>{notification.data.learnerId}</dd></div><div><dt>Yaratilgan</dt><dd>{formatDateTime(notification.data.createdAt)}</dd></div><div><dt>O‘qilgan</dt><dd>{formatDateTime(notification.data.readAt)}</dd></div></dl></>:<ErrorState message={notification.error??"Xabar topilmadi"} onRetry={()=>setRevision(value=>value+1)}/>}<div className="pd-dialog-actions"><button className="pd-button primary" onClick={()=>setNotificationId(null)}>Yopish</button></div></DialogBody></Dialog>}
    {noteTarget&&<NoteDialog key={noteTarget.telegramUserId} learnerId={noteTarget.telegramUserId} learnerName={learnerName(noteTarget)} csrf={session.csrfToken} onViewRecord={()=>{setSelected(noteTarget.telegramUserId);openLearnerById(noteTarget.telegramUserId);setNoteTarget(null);setRevision(value=>value+1);}} onClose={()=>{setNoteTarget(null);setRevision(value=>value+1);}}/>}
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
