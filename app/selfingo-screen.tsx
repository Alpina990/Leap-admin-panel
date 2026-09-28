"use client";
import {useEffect,useState} from "react";
import {BookOpen,Bot,Check,CircleDollarSign,Cpu,Lightbulb,MessageCircle,Mic2,Save,ShieldCheck} from "lucide-react";

type SelfingoSettings={
  answers:boolean;
  speaking:boolean;
  lessons:boolean;
  explanations:boolean;
  model:string;
  dailyLimit:number;
  systemPrompt:string;
};

const defaults:SelfingoSettings={
  answers:true,
  speaking:true,
  lessons:true,
  explanations:true,
  model:"gpt-4o-mini",
  dailyLimit:50,
  systemPrompt:"Learnerning savoliga qisqa, sodda va amaliy ingliz tili javobini ber.",
};

const capabilityRows=[
  {key:"answers" as const,icon:MessageCircle,title:"Savol-javob",description:"Barcha savollarga javob beradi."},
  {key:"speaking" as const,icon:Mic2,title:"Speaking",description:"Ingliz tilida suhbatlashib, talaffuz va muloqotni rivojlantiradi."},
  {key:"lessons" as const,icon:BookOpen,title:"Tizimli dars",description:"Zamonlar, artikllar va lug‘at bo‘yicha dars o‘tadi."},
  {key:"explanations" as const,icon:Lightbulb,title:"O‘zbekcha izoh",description:"Tushunarsiz mavzularni sodda o‘zbek tilida tushuntiradi."},
];

export function SelfingoScreen(){
  const [settings,setSettings]=useState<SelfingoSettings>(defaults);
  const [saved,setSaved]=useState(false);
  const [error,setError]=useState("");

  useEffect(()=>{
    queueMicrotask(()=>{
      try{
        const stored=localStorage.getItem("leap-selfingo-settings");
        if(stored)setSettings({...defaults,...JSON.parse(stored) as Partial<SelfingoSettings>});
      }catch{
        setError("Saqlangan sozlamalarni o‘qib bo‘lmadi.");
      }
    });
  },[]);

  function update<Key extends keyof SelfingoSettings>(key:Key,value:SelfingoSettings[Key]){
    setSaved(false);
    setSettings(current=>({...current,[key]:value}));
  }

  function save(){
    try{
      localStorage.setItem("leap-selfingo-settings",JSON.stringify(settings));
      setSaved(true);setError("");
    }catch{
      setError("Sozlamalarni saqlab bo‘lmadi.");
    }
  }

  return <>
    <header className="pd-page-header">
      <div><h1>Selfingo</h1><p>AI ustozning mahsulot holati va administrator sozlamalari</p></div>
      <div className="pd-page-actions"><button className="pd-button primary" onClick={save}><Save size={14}/>Saqlash</button></div>
    </header>
    <section className="pd-ai-hero">
      <div className="pd-ai-mark"><Bot size={30}/></div>
      <div className="pd-ai-copy"><span>AI USTOZ</span><h2>Selfingo</h2><p>Savolingizga 24/7 javob beradigan AI ustoz. IELTS 9.0 olgan ;)</p></div>
      <div className="pd-ai-state"><small>Mahsulot holati</small><strong>Tez kunda</strong><span>Billing va bot handoff ulanmagan</span></div>
    </section>
    <div className="pd-ai-summary">
      <article><span><CircleDollarSign size={17}/></span><div><small>E’lon qilingan narx</small><strong>99 000 so‘m / oy</strong><p>To‘lov kontrakti hali ulanmagan.</p></div></article>
      <article><span><Cpu size={17}/></span><div><small>Model</small><strong>{settings.model}</strong><p>Administrator afzalligi; Selfingo backendiga yuborilmaydi.</p></div></article>
      <article><span><ShieldCheck size={17}/></span><div><small>Holat</small><strong>Read-only integratsiya</strong><p>Hozircha faqat mahsulot kontrakti kutilmoqda.</p></div></article>
    </div>
    <div className="pd-ai-grid">
      <section className="pd-panel">
        <header className="pd-panel-header"><div><h2>Funksiyalar</h2><p>Selfingo qila oladigan asosiy ishlar</p></div></header>
        <div className="pd-ai-capabilities">
          {capabilityRows.map(({key,icon:Icon,title,description})=><article key={key} className={settings[key]?"enabled":""}><span><Icon size={18}/></span><div><strong>{title}</strong><p>{description}</p></div><button aria-pressed={settings[key]} aria-label={`${title} funksiyasini ${settings[key]?"o‘chirish":"yoqish"}`} onClick={()=>update(key,!settings[key])}>{settings[key]?<Check size={15}/>:null}</button></article>)}
        </div>
      </section>
      <section className="pd-panel">
        <header className="pd-panel-header"><div><h2>Boshqarish sozlamalari</h2><p>Administrator brauzerida saqlanadigan qoralama</p></div>{saved&&<span className="pd-saved"><Check size={13}/>Saqlandi</span>}</header>
        <div className="pd-ai-form">
          <label className="pd-field">Model<input value={settings.model} maxLength={120} onChange={event=>update("model",event.target.value)}/></label>
          <label className="pd-field">Kunlik limit<input type="number" min={1} max={1000} value={settings.dailyLimit} onChange={event=>update("dailyLimit",Math.max(1,Math.min(1000,Number(event.target.value)||1)))}/></label>
          <label className="pd-field">System prompt<textarea rows={6} maxLength={4000} value={settings.systemPrompt} onChange={event=>update("systemPrompt",event.target.value)}/></label>
          <p className="pd-ai-note"><ShieldCheck size={15}/>Bu sozlamalar hozircha faqat admin brauzerida saqlanadi. Selfingo backend API’si ulangach, ular server tomonda boshqariladi.</p>
        </div>
      </section>
    </div>
    {error&&<p className="pd-error-text" role="alert">{error}</p>}
  </>;
}
