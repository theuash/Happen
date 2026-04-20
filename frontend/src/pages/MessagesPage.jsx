import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import api from "../lib/axios";
import { toast } from "sonner";
import { Send, Search, Video, Plus, X, Clock, CheckCheck, Check, Users, MessageSquare, Calendar } from "lucide-react";

const RC = { admin:"#7C3AED",manager:"#F59E0B",hr:"#EC4899",team_lead:"#0EA5E9",accounting:"#22C55E",employee:"#F4631E" };

function Av({ u, size=40 }) {
  const bg = RC[u?.role] || "var(--orange)";
  const i = ((u?.first_name||"").charAt(0)+(u?.last_name||"").charAt(0)).toUpperCase()||"?";
  return <div className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style={{width:size,height:size,background:bg,fontSize:size*0.35}}>{i}</div>;
}

function ChatPanel({ contact, myId, onMsg }) {
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottom = useRef(null);
  const poll = useRef(null);
  const cid = contact?._id?.toString()||contact?.id?.toString();

  const load = useCallback(async()=>{ if(!cid)return; try{ const r=await api.get("/messages/"+cid); setMsgs(r.data); }catch{} },[cid]);

  useEffect(()=>{ if(!cid)return; setLoading(true); setMsgs([]); load().finally(()=>setLoading(false)); poll.current=setInterval(load,3000); return()=>clearInterval(poll.current); },[cid,load]);
  useEffect(()=>{ bottom.current?.scrollIntoView({behavior:"smooth"}); },[msgs]);

  const send = async()=>{ if(!text.trim()||sending)return; setSending(true); try{ const r=await api.post("/messages/"+cid,{text:text.trim()}); setMsgs(p=>[...p,r.data]); setText(""); onMsg?.(); }catch{ toast.error("Failed"); }finally{ setSending(false); } };
  const onKey=(e)=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();} };
  const ft=(d)=>new Date(d).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"});
  const fd=(d)=>{ const t=new Date(),dt=new Date(d); if(dt.toDateString()===t.toDateString())return"Today"; const y=new Date(t);y.setDate(t.getDate()-1); if(dt.toDateString()===y.toDateString())return"Yesterday"; return dt.toLocaleDateString("en-US",{month:"short",day:"numeric"}); };
  const grouped=msgs.reduce((a,m)=>{ const d=fd(m.createdAt||m.created_at); if(!a[d])a[d]=[]; a[d].push(m); return a; },{});

  if(!contact) return <div className="flex-1 flex flex-col items-center justify-center" style={{background:"var(--page-bg)"}}><MessageSquare size={56} className="mb-4" style={{color:"var(--border)"}}/><p className="font-semibold" style={{color:"var(--text-secondary)"}}>Select a conversation</p><p className="text-sm mt-1" style={{color:"var(--text-secondary)"}}>Pick someone from the list</p></div>;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-5 py-3 border-b bg-white flex items-center gap-3 flex-shrink-0" style={{borderColor:"var(--border)"}}>
        <Av u={contact} size={40}/>
        <div><p className="font-bold">{contact.first_name} {contact.last_name}</p><p className="text-xs capitalize" style={{color:"var(--text-secondary)"}}>{contact.role?.replace("_"," ")} · {contact.team_name||""}</p></div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4" style={{background:"var(--page-bg)"}}>
        {loading?<div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{borderColor:"var(--orange)"}}/></div>
        :msgs.length===0?<p className="text-center py-12 text-sm" style={{color:"var(--text-secondary)"}}>No messages yet. Say hi! 👋</p>
        :Object.entries(grouped).map(([date,ms])=>(
          <div key={date}>
            <div className="flex items-center gap-3 my-4"><div className="flex-1 h-px" style={{background:"var(--border)"}}/><span className="text-xs px-3 py-1 rounded-full" style={{background:"var(--border)",color:"var(--text-secondary)"}}>{date}</span><div className="flex-1 h-px" style={{background:"var(--border)"}}/></div>
            {ms.map((m,i)=>{ const mine=m.sender_id?.toString()===myId; return(
              <div key={m._id||i} className={"flex gap-2 mb-2 "+(mine?"flex-row-reverse":"flex-row")}>
                {!mine&&<Av u={contact} size={32}/>}
                <div className={"flex flex-col "+(mine?"items-end":"items-start")+" max-w-xs lg:max-w-md"}>
                  <div className="px-4 py-2.5 rounded-2xl text-sm" style={{background:mine?"var(--orange)":"white",color:mine?"white":"var(--text-primary)",borderBottomRightRadius:mine?4:16,borderBottomLeftRadius:mine?16:4,boxShadow:"0 1px 2px rgba(0,0,0,0.07)"}}>{m.text}</div>
                  <div className="flex items-center gap-1 mt-0.5 px-1"><span className="text-xs" style={{color:"var(--text-secondary)"}}>{ft(m.createdAt||m.created_at)}</span>{mine&&(m.is_read?<CheckCheck size={12} style={{color:"var(--orange)"}}/>:<Check size={12} style={{color:"var(--text-secondary)"}}/>)}</div>
                </div>
              </div>
            );})}
          </div>
        ))}
        <div ref={bottom}/>
      </div>
      <div className="px-4 py-3 bg-white border-t flex-shrink-0" style={{borderColor:"var(--border)"}}>
        <div className="flex items-end gap-2">
          <textarea value={text} onChange={e=>setText(e.target.value)} onKeyDown={onKey} placeholder={"Message "+contact.first_name+"…"} rows={1} className="flex-1 px-4 py-2.5 rounded-xl border resize-none focus:outline-none focus:ring-2 text-sm" style={{borderColor:"var(--border)","--tw-ring-color":"var(--orange)",maxHeight:100}}/>
          <button onClick={send} disabled={!text.trim()||sending} className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all hover:-translate-y-0.5 disabled:opacity-40 flex-shrink-0" style={{background:"var(--orange)"}}><Send size={17}/></button>
        </div>
      </div>
    </div>
  );
}

function MeetingsTab({ myId }) {
  const [meetings,setMeetings]=useState([]);
  const [contacts,setContacts]=useState([]);
  const [showForm,setShowForm]=useState(false);
  const [form,setForm]=useState({title:"",description:"",start_time:"",end_time:"",link:"",attendee_ids:[]});
  const [saving,setSaving]=useState(false);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{ Promise.all([api.get("/meetings"),api.get("/messages/contacts")]).then(([m,c])=>{setMeetings(m.data);setContacts(c.data);}).catch(()=>{}).finally(()=>setLoading(false)); },[]);

  const toggle=(id)=>setForm(f=>({...f,attendee_ids:f.attendee_ids.includes(id)?f.attendee_ids.filter(x=>x!==id):[...f.attendee_ids,id]}));
  const create=async()=>{ if(!form.title||!form.start_time||!form.end_time){toast.error("Title, start and end required");return;} setSaving(true); try{ const r=await api.post("/meetings",form); setMeetings(p=>[...p,r.data]); setShowForm(false); setForm({title:"",description:"",start_time:"",end_time:"",link:"",attendee_ids:[]}); toast.success("Meeting scheduled!"); }catch(e){toast.error(e.response?.data?.error||"Failed");}finally{setSaving(false);} };
  const cancel=async(id)=>{ try{await api.patch("/meetings/"+id+"/cancel");setMeetings(p=>p.filter(m=>(m.id||m._id)!==id));toast.success("Cancelled");}catch{toast.error("Failed");} };
  const fmt=(d)=>new Date(d).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});
  const upcoming=meetings.filter(m=>new Date(m.start_time)>=new Date());
  const past=meetings.filter(m=>new Date(m.start_time)<new Date());

  if(loading)return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{borderColor:"var(--orange)"}}/></div>;

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold" style={{color:"var(--text-primary)"}}>Meetings</h3>
        <button onClick={()=>setShowForm(v=>!v)} className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-white text-sm" style={{background:"var(--orange)"}}><Plus size={15}/> Schedule</button>
      </div>
      {showForm&&(
        <div className="card border-2 space-y-3" style={{borderColor:"var(--orange)"}}>
          <div className="flex items-center justify-between"><p className="font-bold">New Meeting</p><button onClick={()=>setShowForm(false)}><X size={18}/></button></div>
          <input type="text" placeholder="Title *" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none" style={{borderColor:"var(--border)"}}/>
          <textarea placeholder="Description" rows={2} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none resize-none" style={{borderColor:"var(--border)"}}/>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-semibold mb-1 block" style={{color:"var(--text-secondary)"}}>Start *</label><input type="datetime-local" value={form.start_time} onChange={e=>setForm(f=>({...f,start_time:e.target.value}))} className="w-full px-3 py-2 rounded-lg border text-sm" style={{borderColor:"var(--border)"}}/></div>
            <div><label className="text-xs font-semibold mb-1 block" style={{color:"var(--text-secondary)"}}>End *</label><input type="datetime-local" value={form.end_time} onChange={e=>setForm(f=>({...f,end_time:e.target.value}))} className="w-full px-3 py-2 rounded-lg border text-sm" style={{borderColor:"var(--border)"}}/></div>
          </div>
          <input type="url" placeholder="Video call link (optional)" value={form.link} onChange={e=>setForm(f=>({...f,link:e.target.value}))} className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none" style={{borderColor:"var(--border)"}}/>
          <div>
            <label className="text-xs font-semibold mb-2 block" style={{color:"var(--text-secondary)"}}>Attendees ({form.attendee_ids.length})</label>
            <div className="max-h-36 overflow-y-auto border rounded-lg p-2 space-y-1" style={{borderColor:"var(--border)"}}>
              {contacts.map(c=>{ const cid=c._id?.toString()||c.id?.toString(); const sel=form.attendee_ids.includes(cid); return(
                <button key={cid} onClick={()=>toggle(cid)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left" style={{background:sel?"var(--orange-pale)":"transparent"}}>
                  <Av u={c} size={28}/><div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{c.first_name} {c.last_name}</p><p className="text-xs capitalize" style={{color:"var(--text-secondary)"}}>{c.role?.replace("_"," ")}</p></div>
                  {sel&&<CheckCheck size={15} style={{color:"var(--orange)"}}/>}
                </button>
              );})}
            </div>
          </div>
          <button onClick={create} disabled={saving} className="w-full py-3 rounded-lg font-bold text-white disabled:opacity-50" style={{background:"var(--orange)"}}>{saving?"Scheduling…":"Schedule Meeting"}</button>
        </div>
      )}
      {upcoming.length>0&&(<div><p className="text-xs font-bold uppercase tracking-wide mb-3" style={{color:"var(--text-secondary)"}}>Upcoming</p><div className="space-y-3">{upcoming.map(m=>{ const isOrg=(m.organizer_id?._id||m.organizer_id)?.toString()===myId; const mid=m.id||m._id; return(<div key={mid} className="card border-l-4" style={{borderLeftColor:"var(--orange)"}}><div className="flex items-start justify-between gap-3"><div className="flex-1 min-w-0"><p className="font-bold truncate">{m.title}</p>{m.description&&<p className="text-sm mt-0.5 truncate" style={{color:"var(--text-secondary)"}}>{m.description}</p>}<div className="flex items-center gap-2 mt-2 text-sm" style={{color:"var(--text-secondary)"}}><Clock size={13}/><span>{fmt(m.start_time)}</span></div><div className="flex items-center gap-2 mt-1 text-sm" style={{color:"var(--text-secondary)"}}><Users size={13}/><span>{(m.attendee_ids?.length||0)+1} participants</span></div><div className="flex items-center gap-1 mt-2 flex-wrap">{m.attendee_ids?.slice(0,6).map((a,i)=><Av key={i} u={a} size={26}/>)}{(m.attendee_ids?.length||0)>6&&<span className="text-xs" style={{color:"var(--text-secondary)"}}>+{m.attendee_ids.length-6}</span>}</div></div><div className="flex flex-col gap-2 flex-shrink-0">{m.link&&<a href={m.link} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{background:"var(--success)"}}><Video size={13}/> Join</a>}{isOrg&&<button onClick={()=>cancel(mid)} className="px-3 py-1.5 rounded-lg text-xs font-bold border-2 hover:bg-red-50" style={{borderColor:"var(--danger)",color:"var(--danger)"}}>Cancel</button>}</div></div></div>); })}</div></div>)}
      {past.length>0&&(<div><p className="text-xs font-bold uppercase tracking-wide mb-3" style={{color:"var(--text-secondary)"}}>Past</p><div className="space-y-2">{past.slice(0,5).map(m=>(<div key={m.id||m._id} className="card opacity-60"><p className="font-semibold text-sm">{m.title}</p><p className="text-xs mt-1" style={{color:"var(--text-secondary)"}}>{fmt(m.start_time)}</p></div>))}</div></div>)}
      {upcoming.length===0&&past.length===0&&(<div className="text-center py-16"><Calendar size={48} className="mx-auto mb-4" style={{color:"var(--border)"}}/><p className="font-semibold" style={{color:"var(--text-secondary)"}}>No meetings yet</p><p className="text-sm mt-1" style={{color:"var(--text-secondary)"}}>Schedule one above</p></div>)}
    </div>
  );
}

export default function MessagesPage() {
  const [searchParams,setSearchParams]=useSearchParams();
  const user=useAuthStore(s=>s.user);
  const myId=user?._id?.toString()||user?.id?.toString();
  const [tab,setTab]=useState(searchParams.get("tab")==="meetings"?"meetings":"messages");
  const [contacts,setContacts]=useState([]);
  const [active,setActive]=useState(null);
  const [search,setSearch]=useState("");
  const [loadingC,setLoadingC]=useState(true);

  const fetchC=useCallback(async()=>{ try{ const r=await api.get("/messages/contacts"); setContacts(r.data); const cp=searchParams.get("contact"); if(cp){ const f=r.data.find(c=>(c._id?.toString()||c.id?.toString())===cp); if(f)setActive(f); } }catch{}finally{setLoadingC(false);} },[]);
  useEffect(()=>{fetchC();},[fetchC]);
  useEffect(()=>{ const t=setInterval(()=>{ api.get("/messages/contacts").then(r=>setContacts(r.data)).catch(()=>{}); },5000); return()=>clearInterval(t); },[]);

  const open=(c)=>{ setActive(c); setTab("messages"); setSearchParams({contact:c._id?.toString()||c.id?.toString()}); };
  const switchTab=(t)=>{ setTab(t); setSearchParams(t==="meetings"?{tab:"meetings"}:active?{contact:active._id?.toString()||active.id?.toString()}:{}); };
  const filtered=contacts.filter(c=>`${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase())||c.role?.toLowerCase().includes(search.toLowerCase())||c.team_name?.toLowerCase().includes(search.toLowerCase()));
  const unread=contacts.reduce((s,c)=>s+(c.unread_count||0),0);

  return (
    <div className="flex rounded-2xl overflow-hidden border bg-white" style={{borderColor:"var(--border)",height:"calc(100vh - 112px)"}}>
      <div className="w-72 flex-shrink-0 flex flex-col border-r" style={{borderColor:"var(--border)"}}>
        <div className="flex border-b flex-shrink-0" style={{borderColor:"var(--border)"}}>
          {[{k:"messages",l:"Messages",b:unread},{k:"meetings",l:"Meetings",b:0}].map(t=>(
            <button key={t.k} onClick={()=>switchTab(t.k)} className="flex-1 py-3.5 text-sm font-semibold transition-colors" style={{color:tab===t.k?"var(--orange)":"var(--text-secondary)",borderBottom:tab===t.k?"2px solid var(--orange)":"2px solid transparent"}}>
              {t.l}{t.b>0&&<span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-bold text-white" style={{background:"var(--orange)"}}>{t.b}</span>}
            </button>
          ))}
        </div>
        <div className="p-3 flex-shrink-0">
          <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:"var(--text-secondary)"}}/><input type="text" placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-8 pr-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2" style={{borderColor:"var(--border)","--tw-ring-color":"var(--orange)"}}/></div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingC?<div className="flex justify-center py-8"><div className="animate-spin rounded-full h-7 w-7 border-b-2" style={{borderColor:"var(--orange)"}}/></div>
          :filtered.length===0?<p className="text-center py-8 text-sm" style={{color:"var(--text-secondary)"}}>No contacts</p>
          :filtered.map(c=>{ const cid=c._id?.toString()||c.id?.toString(); const isA=(active?._id?.toString()||active?.id?.toString())===cid; return(
            <button key={cid} onClick={()=>open(c)} className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50" style={{background:isA?"var(--orange-pale)":"transparent"}}>
              <Av u={c} size={40}/>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between"><p className="text-sm font-semibold truncate">{c.first_name} {c.last_name}</p>{c.last_message&&<span className="text-xs flex-shrink-0 ml-1" style={{color:"var(--text-secondary)"}}>{new Date(c.last_message.createdAt).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})}</span>}</div>
                <div className="flex items-center justify-between mt-0.5"><p className="text-xs truncate" style={{color:"var(--text-secondary)"}}>{c.last_message?c.last_message.text:c.role?.replace("_"," ")+" · "+c.team_name}</p>{c.unread_count>0&&<span className="ml-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{background:"var(--orange)"}}>{c.unread_count}</span>}</div>
              </div>
            </button>
          );})}
        </div>
      </div>
      {tab==="messages"?<ChatPanel contact={active} myId={myId} onMsg={fetchC}/>:<MeetingsTab myId={myId}/>}
    </div>
  );
}
