"use client";
import {useRef,useState} from "react";
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from "@/components/ui/dialog";
import {Plus,Save} from "lucide-react";

export type StructureKind="course"|"unit"|"lesson";
export type StructureMode="create"|"edit";
export type StructureTarget={
  kind:StructureKind;
  mode:StructureMode;
  id?:string;
  version?:string;
  title?:string;
  slug?:string;
  subtitle?:string;
  courseId?:string;
  unitId?:string;
};
export type StructureCourseOption={id:string;title:string};
export type StructureUnitOption={id:string;title:string;courseTitle:string};
export type StructureResult={kind:StructureKind;id:string;version:string};

function label(kind:StructureKind){
  return kind==="course"?"kurs":kind==="unit"?"unit":"dars";
}

export function ContentStructureDialog({
  target,
  courses,
  units,
  csrf,
  canWrite,
  onSaved,
  onClose,
}:{
  target:StructureTarget;
  courses:StructureCourseOption[];
  units:StructureUnitOption[];
  csrf:string;
  canWrite:boolean;
  onSaved:(value:StructureResult)=>void;
  onClose:()=>void;
}){
  const [title,setTitle]=useState(target.title??"");
  const [slug,setSlug]=useState(target.slug??"");
  const [subtitle,setSubtitle]=useState(target.subtitle??"");
  const [courseId,setCourseId]=useState(target.courseId??courses[0]?.id??"");
  const [unitId,setUnitId]=useState(target.unitId??units[0]?.id??"");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const request=useRef<{fingerprint:string;id:string}|null>(null);
  const action=`${target.kind}_${target.mode==="create"?"create":"update"}`;
  const ready=title.trim().length>0&&slug.trim().length>0&&(target.kind!=="unit"||courseId)&&(target.kind!=="lesson"||unitId);

  function changeTitle(value:string){
    setTitle(value);
    if(target.mode==="create"&&!slug){
      setSlug(value.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,160));
    }
  }

  async function save(){
    setBusy(true);setError("");
    try{
      const body:Record<string,unknown>={action,requestId:crypto.randomUUID()};
      if(target.id)body[`${target.kind}Id`]=target.id;
      if(target.version)body.baseVersion=target.version;
      body.title=title.trim();
      body.slug=slug.trim();
      if(target.kind==="unit"){
        body.subtitle=subtitle.trim();
        if(target.mode==="create")body.courseId=courseId;
      }
      if(target.kind==="lesson"&&target.mode==="create")body.unitId=unitId;
      const fingerprint=JSON.stringify(body);
      if(request.current?.fingerprint!==fingerprint)request.current={fingerprint,id:crypto.randomUUID()};
      body.requestId=request.current.id;
      const response=await fetch("/api/admin/content-structure-write",{
        method:"POST",
        credentials:"same-origin",
        headers:{"Content-Type":"application/json","X-Admin-CSRF":csrf},
        body:JSON.stringify(body),
        signal:AbortSignal.timeout(12000),
      });
      if(response.status===401){window.location.replace("/login");return;}
      const data=await response.json();
      if(!response.ok)throw new Error(data.error?.message??"Amalni bajarib bo‘lmadi.");
      onSaved(data);
      onClose();
    }catch(reason){
      setError(reason instanceof Error?reason.message:"Amalni bajarib bo‘lmadi.");
    }finally{
      setBusy(false);
    }
  }

  const heading=`${label(target.kind).replace(/^./,value=>value.toUpperCase())} ${target.mode==="create"?"qo‘shish":"tahrirlash"}`;
  const description=target.mode==="create"?"Yangi kontent draft holatida yaratiladi va auditga yoziladi.":"Nomi va slug yangilanadi; o‘zgarish auditga yoziladi.";

  return <Dialog open onOpenChange={value=>{if(!value&&!busy)onClose();}}>
    <DialogContent className="pd-dialog" showCloseButton={false}>
      <DialogHeader>
        <DialogTitle>{heading}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <>
        {target.kind==="unit"&&target.mode==="create"&&<label className="pd-field">Kurs<select value={courseId} onChange={event=>setCourseId(event.target.value)}>{courses.map(course=><option key={course.id} value={course.id}>{course.title}</option>)}</select></label>}
        {target.kind==="lesson"&&target.mode==="create"&&<label className="pd-field">Unit<select value={unitId} onChange={event=>setUnitId(event.target.value)}>{units.map(unit=><option key={unit.id} value={unit.id}>{unit.courseTitle} / {unit.title}</option>)}</select></label>}
        <label className="pd-field">{target.kind==="course"?"Kurs nomi":target.kind==="unit"?"Unit nomi":"Dars nomi"}<input autoFocus maxLength={target.kind==="lesson"?300:240} value={title} disabled={busy} onChange={event=>changeTitle(event.target.value)}/></label>
        <label className="pd-field">Slug<input maxLength={target.kind==="lesson"?200:160} value={slug} disabled={busy} onChange={event=>setSlug(event.target.value)}/></label>
        {target.kind==="unit"&&<label className="pd-field">Qisqa izoh<textarea maxLength={320} rows={3} value={subtitle} disabled={busy} onChange={event=>setSubtitle(event.target.value)}/></label>}
      </>
      {error&&<p role="alert">{error}</p>}
      {!canWrite&&<p>Kontentni o‘zgartirish uchun ruxsat kerak.</p>}
      <div className="pd-dialog-actions">
        <button disabled={busy} onClick={onClose}>Bekor qilish</button>
        <button className="pd-button primary" disabled={busy||!canWrite||!ready} onClick={()=>void save()}>
          {target.mode==="create"?<Plus size={14}/>:<Save size={14}/>}
          {busy?"Saqlanmoqda…":target.mode==="create"?"Qo‘shish":"Saqlash"}
        </button>
      </div>
    </DialogContent>
  </Dialog>;
}
