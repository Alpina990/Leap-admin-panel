"use client";
import {useEffect,useState,type ReactNode} from "react";
import {useTheme} from "next-themes";
import {
  Activity,
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
import type {AdminOverview,AdminSession,Learner,LearnerDirectory} from "@/lib/admin-types";

type Notification={id:string;learnerId:string;kind:string;title:string;body:string;actionPath:string|null;createdAt:string;readAt:string|null};
type Section=PushdaySection;
type PaymentSummary={learnerId:string;paymentsCount:number;paidTotalTiyin:string;lastPaidAt:string|null;learner?:Learner};
type PaymentSummaries={items:PaymentSummary[]};
type ContentTreeLesson={id:string;unitId:string;title:string;slug:string;position:number;status:string;version:string};
type ContentTreeUnit={id:string;sectionId:string;sectionTitle:string;title:string;slug:string;subtitle:string;position:number;version:string;lessons:ContentTreeLesson[]};
type ContentTreeCourse={id:string;title:string;slug:string;version:string;units:ContentTreeUnit[]};
type ContentTree={items:ContentTreeCourse[];total:number;limit:number;offset:number;hasMore:boolean;canWrite:boolean};

const navRoutes:Section[]=["Overview","Learners","Content","Commerce","AI","Messages"];
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

function MetricCard({icon:Icon,label,value,detail,tone="success"}:{icon:LucideIcon;label:string;value:string;detail:string;tone?:"success"|"warning"|"danger"}){
  return <article className="pd-metric-card">
    <span className={`pd-metric-icon ${tone}`}><Icon size={19}/></span>
    <div>
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  </article>;
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

function ProgressBar({value,label}:{value:number;label?:string}){
  const safe=Math.max(0,Math.min(100,value));
  return <div className="pd-progress">
    <div className="pd-progress-copy"><span>{label??"Progress"}</span><strong>{safe}%</strong></div>
    <div className="pd-progress-track"><i style={{width:`${safe}%`}}/></div>
  </div>;
}

function LearnerDetailDrawer({open,learnerId,learner,analytics,payments,loading,error,onClose,onRetry,onManageAccess}:{open:boolean;learnerId:string|null;learner?:Learner;analytics?:LearnerAnalytics;payments?:PaymentSummary;loading:boolean;error?:string;onClose:()=>void;onRetry:()=>void;onManageAccess:()=>void}){
  const name=learner?learnerName(learner):learnerId?`ID ${learnerId}`:"Foydalanuvchi";
  const initials=learner?learnerInitials(learner):"—";
  const subscription=analytics?.catalogAccess?"PRO / Lifetime":analytics?.sectionAccess.length?`${analytics.sectionAccess.length} bo‘lim`:"Yo‘q";
  const mastery=analytics?.completionRate===null||analytics?.completionRate===undefined?null:Math.round(analytics.completionRate);
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
            <ProgressBar value={mastery??0} label={`${analytics?.completedLessons??0} tugatilgan dars`}/>
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
    <input aria-label="Foydalanuvchi username" value={value} onChange={event=>onChange(event.target.value)} placeholder="Username yoki ID..."/>
    {value&&<button type="button" aria-label="Qidiruvni tozalash" onClick={onClear}>×</button>}
  </form>;
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
    <label className="pd-period-field">
      <span>BOSHLANISH</span>
      <div className="pd-period-control"><input aria-label="Boshlanish sanasi" type="date" max={end||undefined} value={start} onChange={event=>onChange({...(event.target.value?{start:event.target.value}:{}),...(end?{end}:{})})}/></div>
    </label>
    <label className="pd-period-field">
      <span>TUGASH</span>
      <div className="pd-period-control"><input aria-label="Tugash sanasi" type="date" min={start||undefined} value={end} onChange={event=>onChange({...(start?{start}:{}),...(event.target.value?{end:event.target.value}:{})})}/></div>
    </label>
    <div className="pd-period-status"><span>HOLAT</span><strong>{status}</strong></div>
  </section>;
}

function DataTable({headers,children}:{headers:string[];children:ReactNode}){
  return <div className="pd-table-wrap"><table className="pd-table"><thead><tr>{headers.map(header=><th key={header}>{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}

function DialogBody({title,description,children}:{title:string;description:string;children:ReactNode}){
  return <DialogContent className="pd-dialog" showCloseButton={false}><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>{children}</DialogContent>;
}

export default function AdminApp({session}:{session:AdminSession}){
  const {resolvedTheme,setTheme}=useTheme();
  const [themeReady,setThemeReady]=useState(false);
  const [section,setSection]=useState<Section>("Overview");
  const [revision,setRevision]=useState(0);
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
  const query=new URLSearchParams({limit:"25",offset:String(offset),...dateRange,...reportFilters.learners});
  if(username)query.set("username",username);
  const directory=useRead<LearnerDirectory>(["Overview","Learners","Commerce"].includes(section)?"/api/admin/learners?"+query:null,revision);
  const people=directory.data?.items??[];
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
  const activeOrder=orders.data?.items.find(item=>item.id===orderId)?.id??orders.data?.items[0]?.id??null;
  const payment=useRead<Payment>(activeOrder?"/api/admin/payment?"+new URLSearchParams({orderId:activeOrder}):null,revision);
  const notifications=useRead<{items:Notification[];total:number;hasMore:boolean}>(section==="Messages"?"/api/admin/notifications?"+new URLSearchParams({limit:"25",offset:String(notificationOffset),...dateRange,...reportFilters.notifications}):null,revision);
  const notification=useRead<Notification>(notificationId?"/api/admin/notification?"+new URLSearchParams({notificationId}):null,revision);
  const globalResults=useRead<LearnerDirectory>(modal==="search"&&globalQuery?"/api/admin/learners?"+new URLSearchParams({limit:"25",offset:"0",username:globalQuery}):null,searchRevision);
  const reportResource:ReportingResource=section==="Messages"?"notifications":section==="Commerce"&&commerceTab==="transactions"?"payments":"learners";
  const reportQuery=reportResource==="notifications"?new URLSearchParams({limit:"25",offset:String(notificationOffset),...dateRange,...reportFilters.notifications}):reportResource==="payments"?ordersQuery:query;
  const isLight=themeReady&&resolvedTheme==="light";

  useEffect(()=>{queueMicrotask(()=>{try{setAutoRefresh(localStorage.getItem("leap-auto-refresh")==="true");}catch{}});},[]);
  useEffect(()=>{if(!autoRefresh)return;const timer=setInterval(()=>{if(document.visibilityState==="visible")setRevision(value=>value+1);},60000);return()=>clearInterval(timer);},[autoRefresh]);
  useEffect(()=>{
    const hash=()=>{
      const route=navRoutes.find(key=>key.toLowerCase()===location.hash.slice(1).split("/")[0]);
      if(route){setSection(route);setOffset(0);setUsername("");setDraft("");setSelected(null);setProfileId(null);}
    };
    queueMicrotask(()=>{setThemeReady(true);hash();});
    addEventListener("hashchange",hash);
    return()=>removeEventListener("hashchange",hash);
  },[]);

  function go(route:Section){
    setSection(route);setOffset(0);setUsername("");setDraft("");setSelected(null);setProfileId(null);
    history.pushState(null,"","#"+route.toLowerCase());window.scrollTo({top:0,behavior:"smooth"});
  }
  function clearSearch(){setDraft("");setUsername("");setOffset(0);setSelected(null);setRevision(value=>value+1);}
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
  function openAllLearners(){go("Learners");}
  function openContent(mode:ContentMode){setContentMode(mode);}
  function openPaymentFilter(){setStatusDraft(paymentStatus);setMethodDraft(paymentMethod);setPaymentFilter(true);}
  function openNotification(id:string){setNotificationId(id);}
  function openBusiness(mode:"Manage access"|"Reconcile case"|"Learning intervention",learnerId?:string){setBusinessLearner(learnerId);setBusiness(mode);}

  function metricsFor(sectionValue:Section){
    if(sectionValue==="Learners"||sectionValue==="Overview")return [
      {icon:UsersRound,label:"Jami foydalanuvchilar",value:overview.data?.learnersTotal.toLocaleString("en-US")??"—",detail:"Bazadagi barcha profillar",tone:"success" as const},
      {icon:Activity,label:"Faol foydalanuvchilar",value:summary.data?.activeLearners.toLocaleString("en-US")??"—",detail:"Tanlangan davrda",tone:"success" as const},
      {icon:BadgeCheck,label:"PRO / access",value:summary.data?.lifetimeAccess?.toLocaleString("en-US")??"—",detail:"Lifetime access egalari",tone:"success" as const},
      {icon:Flame,label:"E’tibor kerak",value:summary.data?.attention?(summary.data.attention.access+summary.data.attention.learning).toLocaleString("en-US"):"—",detail:"Access va o‘quv signallari",tone:"warning" as const},
    ];
    if(sectionValue==="Content")return [
      {icon:Library,label:"Kurslar",value:overview.data?.coursesTotal.toLocaleString("en-US")??"—",detail:"Katalogdagi kurslar",tone:"success" as const},
      {icon:BookOpen,label:"Unitlar",value:contentTree.data?treeUnits.length.toLocaleString("en-US"):"—",detail:"Ko‘rinayotgan kurslarda",tone:"success" as const},
      {icon:FileText,label:"Darslar",value:overview.data?.lessonsTotal.toLocaleString("en-US")??"—",detail:"Draft va published",tone:"success" as const},
      {icon:Check,label:"Published",value:contentTree.data?treeUnits.flatMap(item=>item.lessons).filter(item=>item.status==="published").length.toLocaleString("en-US"):"—",detail:"Ko‘rinayotgan darslarda",tone:"success" as const},
    ];
    if(sectionValue==="Commerce")return [
      {icon:CircleDollarSign,label:"Jami tushum",value:formatMoneyCompact(summary.data?.revenueTiyin),detail:"Tanlangan davr",tone:"success" as const},
      {icon:WalletCards,label:"To‘langan buyurtmalar",value:summary.data?.paidOrders.toLocaleString("en-US")??"—",detail:"Muvaffaqiyatli to‘lovlar",tone:"success" as const},
      {icon:TrendingUp,label:"O‘rtacha chek",value:summary.data?.paidOrders?formatMoneyCompact(String(BigInt(summary.data.revenueTiyin)/BigInt(summary.data.paidOrders))):"—",detail:"Bir buyurtma o‘rtachasi",tone:"success" as const},
      {icon:Clock3,label:"Kutilayotgan",value:summary.data?.health?.paymentsPending.toLocaleString("en-US")??"—",detail:"Pending buyurtmalar",tone:"warning" as const},
    ];
    return [
      {icon:Send,label:"Yuborilgan",value:summary.data?.notificationCreated.toLocaleString("en-US")??"—",detail:"Tanlangan davrda",tone:"success" as const},
      {icon:MessageSquare,label:"O‘qilgan",value:summary.data?.notificationRead.toLocaleString("en-US")??"—",detail:"Mini App ichida",tone:"success" as const},
      {icon:Clock3,label:"O‘qilmagan",value:summary.data?Math.max(0,summary.data.notificationCreated-summary.data.notificationRead).toLocaleString("en-US"):"—",detail:"Hali ochilmagan",tone:"warning" as const},
      {icon:BarChart3,label:"Jami xabarlar",value:notifications.data?.total.toLocaleString("en-US")??"—",detail:"Filtrlangan natijalar",tone:"success" as const},
    ];
  }

  function metrics(sectionValue:Section){
    return <div className="pd-metric-grid">{metricsFor(sectionValue).map(metric=><MetricCard key={metric.label} {...metric}/>)}</div>;
  }

  function learnerRows(compact=false){
    if(directory.loading&&!directory.data)return <tr><td colSpan={10}><div className="pd-loading">Ma’lumotlar yuklanmoqda…</div></td></tr>;
    if(directory.error&&!directory.data)return <tr><td colSpan={10}><ErrorState message={directory.error} onRetry={()=>setRevision(value=>value+1)}/></td></tr>;
    if(!people.length)return <tr><td colSpan={10}><EmptyState title="Foydalanuvchi topilmadi" description="Qidiruv yoki filtrlarni o‘zgartirib qayta urinib ko‘ring." action={<button className="pd-button" onClick={clearSearch}>Filtrlarni tozalash</button>}/></td></tr>;
    return people.slice(0,compact?5:25).map(personValue=>{
      const progress=learnerProgress(personValue);
      const payment=paymentSummaryByLearner.get(personValue.telegramUserId);
      const paymentCount=payment?payment.paymentsCount.toLocaleString("en-US"):paymentSummaries.loading?"…":"—";
      const paidTotal=payment?formatUzs(payment.paidTotalTiyin):paymentSummaries.loading?"…":"—";
      return <tr key={personValue.telegramUserId} data-learner-id={personValue.telegramUserId}>
        <td><span className="pd-id">{personValue.telegramUserId}</span></td>
        <td><button className="pd-person" onClick={()=>openLearner(personValue)}><span>{learnerInitials(personValue)}</span><div><strong>{learnerName(personValue)}</strong><small>{personValue.username?`@${personValue.username}`:"Username yo‘q"}</small></div></button></td>
        <td><ProgressBar value={progress} label={`${personValue.completedLessons??0}/${personValue.startedLessons??0}`}/></td>
        <td><StatusPill tone={toneForProgress(progress)}>{progress>=70?"Yaxshi":progress>=30?"Davom etmoqda":"Yangi"}</StatusPill></td>
        <td className="pd-table-number">{paymentCount}</td>
        <td className="pd-money">{paidTotal}</td>
        <td><span className="pd-muted">{formatDate(personValue.createdAt)}</span></td>
        <td><span className="pd-muted">{relativeSeen(personValue.lastSeenAt)}</span></td>
        <td><button className="pd-pro-check" aria-label={`${learnerName(personValue)} PRO accessini boshqarish`} title="Accessni boshqarish" onClick={()=>openBusiness("Manage access",personValue.telegramUserId)}><BadgeCheck size={14}/></button></td>
        <td><div className="pd-row-actions"><button className="pd-row-action primary" onClick={()=>openBusiness("Manage access",personValue.telegramUserId)}>PRO qilish</button><button className="pd-text-button" onClick={()=>openLearner(personValue)}>Batafsil</button></div></td>
      </tr>;
    });
  }

  function learnerPanel(compact=false){
    return <Panel title="Foydalanuvchilar" subtitle={`Jami ${directory.data?.total.toLocaleString("en-US")??"—"} ta profil`} action={<button className="pd-button" onClick={openAllLearners}>Barchasini ko‘rish</button>}>
      <div className="pd-toolbar">
        <SearchField value={draft} onChange={setDraft} onSubmit={()=>{setUsername(draft);setOffset(0);setSelected(null);setRevision(value=>value+1);}} onClear={clearSearch}/>
        <button className="pd-button" onClick={()=>setReporting("Sort & paginate")}><Filter size={14}/>Saralash</button>
        <button className="pd-button" onClick={()=>setReporting("Export report")}><Download size={14}/>Eksport</button>
      </div>
      <DataTable headers={["ID","Foydalanuvchi","Progress","Holat","To‘lovlar","Jami","Ro‘yxatdan o‘tgan","Oxirgi faollik","PRO","Amal"]}>{learnerRows(compact)}</DataTable>
      {!compact&&<Pager offset={directory.data?.offset??0} limit={directory.data?.limit??25} total={directory.data?.total??0} hasMore={directory.data?.hasMore??false} loading={directory.loading} onPrevious={()=>{setOffset(Math.max(0,offset-25));setSelected(null);}} onNext={()=>{setOffset(offset+25);setSelected(null);}}/>}
    </Panel>;
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
    const selectedUnit=treeUnits.find(item=>item.id===activeUnit);
    const selectedLesson=selectedUnit?.lessons.find(item=>item.id===activeLesson);
    const blocks=contentDetail.data?.lesson.blocks??[];
    return <>
      <PageHeader title="Content" subtitle="Kurslar, unitlar va darslarni yagona joydan boshqaring" actions={<><button className="pd-button" disabled={!canWrite} onClick={()=>openContent("Import content")}><Plus size={14}/>Import</button><button className="pd-button" disabled={!canWrite||!activeUnit} onClick={()=>setStructureTarget({kind:"lesson",mode:"create",unitId:activeUnit??undefined})}><Plus size={14}/>Dars qo‘shish</button><button className="pd-button primary" disabled={!canWrite} onClick={()=>setStructureTarget({kind:"course",mode:"create"})}><Plus size={14}/>Kurs qo‘shish</button></>}/>
      {metrics("Content")}
      <div className="pd-content-grid">
        <Panel title="Kontent daraxti" subtitle={`${contentTree.data?.total??"—"} ta kurs`} className="pd-catalog-panel">
          {contentTree.loading&&!contentTree.data?<div className="pd-loading">Kontent yuklanmoqda…</div>:contentTree.error&&!contentTree.data?<ErrorState message={contentTree.error} onRetry={()=>setRevision(value=>value+1)}/>:<div className="pd-tree">
            {courses.map((course,index)=><details key={course.id} className="pd-tree-course" open={index===0}>
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
            {!courses.length&&<EmptyState title="Kurs topilmadi" description="Content bo‘limiga birinchi kursni qo‘shing." action={<button className="pd-button primary" disabled={!canWrite} onClick={()=>setStructureTarget({kind:"course",mode:"create"})}><Plus size={14}/>Kurs qo‘shish</button>}/>}
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
          <div className="pd-price-card"><div><span>Yillik kurs narxi</span><strong>{catalogPrice.data?`${catalogPrice.data.amountUzs.toLocaleString("en-US")} UZS`:"—"}</strong></div><button className="pd-button" disabled={!catalogPrice.data?.canWrite} onClick={()=>setPriceOpen(true)}>Narxni o‘zgartirish</button></div>
        </Panel>
      </div>
    </>;
  }

  function transactionRows(){
    if(orders.loading&&!orders.data)return <tr><td colSpan={6}><div className="pd-loading">Buyurtmalar yuklanmoqda…</div></td></tr>;
    if(orders.error&&!orders.data)return <tr><td colSpan={6}><ErrorState message={orders.error} onRetry={()=>setRevision(value=>value+1)}/></td></tr>;
    if(!orders.data?.items.length)return <tr><td colSpan={6}><EmptyState title="Buyurtma topilmadi" description="Filtrlarni o‘zgartirib qayta urinib ko‘ring."/></td></tr>;
    return orders.data.items.map(order=>{
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
          <DataTable headers={["Buyurtma","Foydalanuvchi","Sana","Usul","Summa","Holat"]}>{transactionRows()}</DataTable>
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
          <DataTable headers={["Turi","Xabar","Foydalanuvchi","Sana","Holat"]}>{notificationRows()}</DataTable>
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
    {paymentFilter&&<Dialog open onOpenChange={setPaymentFilter}><DialogBody title="To‘lov filtrlari" description="Buyurtmalarni holat va to‘lov usuli bo‘yicha filtrlang."><label className="pd-field"><span>Holat</span><select value={statusDraft} onChange={event=>setStatusDraft(event.target.value)}><option value="">Barcha holatlar</option><option value="paid">Paid</option><option value="pending">Pending</option><option value="cancelled">Cancelled</option></select></label><label className="pd-field"><span>Usul</span><select value={methodDraft} onChange={event=>setMethodDraft(event.target.value)}><option value="">Barcha usullar</option>{["payme","click","uzum","paylov"].map(method=><option key={method} value={method}>{method}</option>)}</select></label><div className="pd-dialog-actions"><button className="pd-button" onClick={()=>setPaymentFilter(false)}>Bekor qilish</button><button className="pd-button primary" onClick={()=>{setPaymentStatus(statusDraft);setPaymentMethod(methodDraft);setOrderOffset(0);setOrderId(null);setPaymentFilter(false);}}>Qo‘llash</button></div></DialogBody></Dialog>}
    {notificationId&&<Dialog open onOpenChange={value=>{if(!value)setNotificationId(null);}}><DialogBody title={notification.data?.title??"Xabar tafsiloti"} description="Mini App inbox yozuvi. Bu oynada o‘qilgan holat o‘zgartirilmaydi.">{notification.loading?<div className="pd-loading">Yuklanmoqda…</div>:notification.data?<><p className="pd-message-body">{notification.data.body}</p><dl className="pd-facts"><div><dt>Foydalanuvchi</dt><dd>{notification.data.learnerId}</dd></div><div><dt>Yaratilgan</dt><dd>{formatDateTime(notification.data.createdAt)}</dd></div><div><dt>O‘qilgan</dt><dd>{formatDateTime(notification.data.readAt)}</dd></div></dl></>:<ErrorState message={notification.error??"Xabar topilmadi"} onRetry={()=>setRevision(value=>value+1)}/>}<div className="pd-dialog-actions"><button className="pd-button primary" onClick={()=>setNotificationId(null)}>Yopish</button></div></DialogBody></Dialog>}
    {noteTarget&&<NoteDialog key={noteTarget.telegramUserId} learnerId={noteTarget.telegramUserId} learnerName={learnerName(noteTarget)} csrf={session.csrfToken} onViewRecord={()=>{setSelected(noteTarget.telegramUserId);setProfileId(noteTarget.telegramUserId);setNoteTarget(null);setRevision(value=>value+1);}} onClose={()=>{setNoteTarget(null);setRevision(value=>value+1);}}/>}
    <Dialog open={workflow!==null} onOpenChange={value=>{if(!value)setWorkflow(null);}}><DialogBody title={workflow??"Workflow"} description={workflow?workflowCards[workflow].description:"Bu amal hozircha mavjud emas."}><p className="pd-feedback">Bu workflow hozircha read-only rejimda. Backend API ulanmaguncha o‘zgartirish yaratilmaydi.</p><div className="pd-dialog-actions"><button className="pd-button" onClick={()=>setWorkflow(null)}>Bekor qilish</button><button className="pd-button primary" disabled>Mavjud emas</button></div></DialogBody></Dialog>
    <Dialog open={modal!==null} onOpenChange={value=>{if(!value)setModal(null);}}>
      <DialogBody title={modal==="settings"?"Sozlamalar":modal==="search"?"Qidiruv":"Administrator"} description={modal==="settings"?"Interfeys va avtomatik yangilash sozlamalari.":modal==="search"?"Aniq username bo‘yicha foydalanuvchi qidirish.":"Tizimga kirgan administrator."}>
        {modal==="settings"&&<><label className="pd-field"><span>Ko‘rinish</span><select value={preferenceTheme} onChange={event=>setPreferenceTheme(event.target.value)}><option value="light">Light</option><option value="dark">Dark</option></select></label><label className="pd-field"><span>Avtomatik yangilash</span><select value={preferenceRefresh?"on":"off"} onChange={event=>setPreferenceRefresh(event.target.value==="on")}><option value="off">O‘chirilgan</option><option value="on">Har 60 sekundda</option></select></label>{preferenceError&&<p className="pd-error-text">{preferenceError}</p>}</>}
        {modal==="account"&&<><div className="pd-field"><span>Administrator</span><strong>{session.admin.username}</strong></div><div className="pd-field"><span>Sessiya</span><strong>Faol · Administrator</strong></div>{logoutError&&<p className="pd-error-text">{logoutError}</p>}</>}
        {modal==="search"&&<><form onSubmit={event=>{event.preventDefault();setGlobalQuery(globalDraft);setSearchRevision(value=>value+1);}}><label className="pd-field"><span>Username</span><input value={globalDraft} onChange={event=>{setGlobalDraft(event.target.value);setGlobalQuery(null);}} placeholder="Masalan: username" required/></label><button className="pd-button primary" type="submit">Qidirish</button></form><div className="pd-search-results">{!globalQuery?<p>Username kiriting.</p>:globalResults.loading?<p>Qidirilmoqda…</p>:globalResults.error?<ErrorState message={globalResults.error} onRetry={()=>setSearchRevision(value=>value+1)}/>:globalResults.data?.items.length?globalResults.data.items.map(result=><button key={result.telegramUserId} onClick={()=>{setModal(null);openLearner(result);}}><span>{learnerInitials(result)}</span><div><strong>{learnerName(result)}</strong><small>{result.username?`@${result.username}`:result.telegramUserId}</small></div><ChevronRight size={15}/></button>):<p>Natija topilmadi.</p>}</div></>}
        <div className="pd-dialog-actions"><button className="pd-button" onClick={()=>setModal(null)}>Yopish</button>{modal==="settings"&&<button className="pd-button primary" onClick={savePreferences}>Saqlash</button>}{modal==="account"&&<button className="pd-button primary" disabled={signingOut} onClick={logout}>{signingOut?"Chiqilmoqda…":"Chiqish"}</button>}</div>
      </DialogBody>
    </Dialog>
  </main>;
}
