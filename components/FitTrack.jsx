// components/FitTrack.jsx
// The app, wired to Supabase. Same UI as the prototype, but data now
// lives in the cloud and syncs across devices for the logged-in user.

"use client";
import React, { useState, useEffect, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, ReferenceLine, ResponsiveContainer, Tooltip } from "recharts";
import { Plus, Trash2, Droplet, Dumbbell, UtensilsCrossed, TrendingDown, BookOpen, Calculator, X, Check, LogOut } from "lucide-react";
import { supabase } from "../lib/supabase";

const C = { ink:"#2D2A32", plum:"#6B4E71", sage:"#7C9082", blush:"#C08497", gold:"#C9A66B", light:"#F4EFF4", lightsage:"#EBF0EC", paper:"#FBFAFB", line:"#E4DEE6" };
const TARGETS = { calories: 1500, waterOz: 100, startWeight: 146, goalWeight: 130 };
const FOODS = [
  { name:"Ground beef 90/10 (raw)", perG:1.79 }, { name:"Chicken tenderloin (raw)", perG:1.10 },
  { name:"Salmon (raw)", perG:1.75 }, { name:"Turkey meatball (per ball)", perEach:28, unit:"balls" },
  { name:"White rice (cooked)", perG:1.30 }, { name:"Quinoa (cooked)", perG:1.48 },
  { name:"Potato, roasted", perG:1.00 }, { name:"Avocado oil", perG:8.84 },
  { name:"Chickpeas (your container)", perG:0.92 }, { name:"Kale", perG:0.49 }, { name:"Avocado", perG:1.60 },
];

const todayKey = () => new Date().toISOString().slice(0,10);
const fmtDate = (k) => new Date(k+"T00:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});
const gallonFraction = (oz) => {
  if (!oz) return "0 gal";
  const e = Math.round((oz/128)*8);
  if (e===0) return "<⅛ gal"; if (e===8) return "1 gal";
  const m={1:"⅛",2:"¼",3:"⅜",4:"½",5:"⅝",6:"¾",7:"⅞"}; return `${m[e]||(e/8).toFixed(2)} gal`;
};

export default function FitTrack({ session }) {
  const userId = session.user.id;
  const [tab, setTab] = useState("today");
  const [loaded, setLoaded] = useState(false);
  const [dayRow, setDayRow] = useState(null);     // row in `days`
  const [meals, setMeals] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [weighins, setWeighins] = useState([]);
  const key = todayKey();

  // ---- initial load ----
  useEffect(() => { (async () => {
    // ensure today's day row exists
    let { data: d } = await supabase.from("days").select("*").eq("user_id", userId).eq("date", key).single();
    if (!d) {
      const ins = await supabase.from("days").insert({ user_id: userId, date: key }).select().single();
      d = ins.data;
    }
    setDayRow(d);
    const { data: m } = await supabase.from("meals").select("*").eq("day_id", d.id).order("created_at");
    setMeals(m || []);
    const { data: r } = await supabase.from("recipes").select("*").eq("user_id", userId).order("created_at");
    setRecipes(r || []);
    const { data: w } = await supabase.from("weighins").select("*").eq("user_id", userId).order("date");
    setWeighins(w || []);
    setLoaded(true);
  })(); }, [userId, key]);

  const totalCal = meals.reduce((s,m)=>s+(m.calories||0),0);

  // ---- mutations ----
  const addMeal = async (name, calories) => {
    const { data } = await supabase.from("meals").insert({ day_id: dayRow.id, name, calories }).select().single();
    if (data) setMeals([...meals, data]);
  };
  const removeMeal = async (id) => { await supabase.from("meals").delete().eq("id", id); setMeals(meals.filter(m=>m.id!==id)); };
  const setWater = async (oz) => { setDayRow({...dayRow, water_oz: oz}); await supabase.from("days").update({ water_oz: oz }).eq("id", dayRow.id); };
  const setWorkout = async (text) => { setDayRow({...dayRow, workout: text}); await supabase.from("days").update({ workout: text }).eq("id", dayRow.id); };
  const addWeighin = async (w) => { const { data } = await supabase.from("weighins").insert({ user_id: userId, ...w }).select().single(); if (data) setWeighins([...weighins, data]); };
  const removeWeighin = async (id) => { await supabase.from("weighins").delete().eq("id", id); setWeighins(weighins.filter(w=>w.id!==id)); };

  return (
    <div style={{ background:C.paper, minHeight:"100vh", color:C.ink, fontFamily:"ui-sans-serif, system-ui, sans-serif" }}>
      <div style={{ maxWidth:480, margin:"0 auto", paddingBottom:88 }}>
        <Header tab={tab} onSignOut={() => supabase.auth.signOut()} />
        <div style={{ padding:"0 18px" }}>
          {!loaded ? <div style={{padding:60,textAlign:"center",color:C.sage}}>Loading your data…</div> : (
            <>
              {tab==="today" && <Today day={dayRow} meals={meals} totalCal={totalCal} addMeal={addMeal} removeMeal={removeMeal} setWater={setWater} setWorkout={setWorkout} />}
              {tab==="recipes" && <Recipes recipes={recipes} />}
              {tab==="progress" && <Progress weighins={weighins} addWeighin={addWeighin} removeWeighin={removeWeighin} />}
            </>
          )}
        </div>
      </div>
      <TabBar tab={tab} setTab={setTab} />
    </div>
  );
}

/* The Header, Today, Recipes, Progress, and all reusable components below are
   identical in look to the prototype — only the data source changed (Supabase
   props instead of window.storage). Paste the UI bits from FitTrack_App.jsx,
   OR use this self-contained version which already includes them. */

function Header({ tab, onSignOut }) {
  const titles={today:"Today",recipes:"Recipes",progress:"Progress"};
  const subs={today:"Log food, water, and movement",recipes:"Your prep library + calculator",progress:"146 → 130 lbs"};
  return (
    <div style={{ padding:"26px 18px 14px", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
      <div>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:2, color:C.gold, textTransform:"uppercase" }}>The Tracker</div>
        <div style={{ fontFamily:"Georgia, serif", fontSize:32, fontWeight:700, color:C.plum, lineHeight:1.1, marginTop:2 }}>{titles[tab]}</div>
        <div style={{ fontSize:13, fontStyle:"italic", color:C.sage, marginTop:4 }}>{subs[tab]}</div>
      </div>
      <button onClick={onSignOut} title="Sign out" style={{ background:"none", border:"none", cursor:"pointer", padding:6, marginTop:24 }}><LogOut size={18} color={C.sage} /></button>
    </div>
  );
}

function Today({ day, meals, totalCal, addMeal, removeMeal, setWater, setWorkout }) {
  const [name,setName]=useState(""); const [cal,setCal]=useState("");
  const pct=Math.min(100,Math.round((totalCal/TARGETS.calories)*100));
  const remaining=TARGETS.calories-totalCal;
  const submit=()=>{ if(!name.trim())return; addMeal(name.trim(), Number(cal)||0); setName(""); setCal(""); };
  return (
    <div>
      <Card><div style={{display:"flex",alignItems:"center",gap:18}}>
        <Ring pct={pct} value={totalCal} />
        <div>
          <div style={{fontSize:13,color:C.sage}}>of {TARGETS.calories} cal</div>
          <div style={{fontSize:26,fontWeight:700,color:C.plum,fontFamily:"Georgia, serif"}}>{remaining>=0?`${remaining} left`:`${Math.abs(remaining)} over`}</div>
          <div style={{fontSize:12,color:C.ink,opacity:0.6}}>{meals.length} item{meals.length!==1?"s":""} logged</div>
        </div>
      </div></Card>
      <SectionLabel icon={<UtensilsCrossed size={14}/>}>Food</SectionLabel>
      <Card>
        <div style={{display:"flex",gap:8}}>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="What did you eat?" onKeyDown={e=>e.key==="Enter"&&submit()} style={inputStyle("1 1 auto")} />
          <input value={cal} onChange={e=>setCal(e.target.value.replace(/\D/g,""))} placeholder="cal" onKeyDown={e=>e.key==="Enter"&&submit()} inputMode="numeric" style={inputStyle("0 0 64px","center")} />
          <button onClick={submit} style={iconBtn(C.plum)}><Plus size={18}/></button>
        </div>
        {meals.length>0 && <div style={{marginTop:12}}>{meals.map(m=>(
          <Row key={m.id}><span style={{flex:1}}>{m.name}</span><span style={{fontWeight:700,color:C.plum,marginRight:10}}>{m.calories}</span>
          <button onClick={()=>removeMeal(m.id)} style={ghostBtn}><Trash2 size={15} color={C.blush}/></button></Row>
        ))}</div>}
      </Card>
      <SectionLabel icon={<Droplet size={14}/>}>Water</SectionLabel>
      <Card>
        <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between"}}>
          <div><span style={{fontSize:30,fontWeight:700,color:C.sage,fontFamily:"Georgia, serif"}}>{day.water_oz}</span><span style={{fontSize:14,color:C.sage}}> oz</span>
          <span style={{fontSize:13,color:C.ink,opacity:0.55,marginLeft:8}}>{gallonFraction(day.water_oz)}</span></div>
          <div style={{fontSize:12,color:C.ink,opacity:0.5}}>goal {TARGETS.waterOz} oz</div>
        </div>
        <div style={{height:8,background:C.lightsage,borderRadius:8,marginTop:12,overflow:"hidden"}}><div style={{width:`${Math.min(100,(day.water_oz/TARGETS.waterOz)*100)}%`,height:"100%",background:C.sage,borderRadius:8}}/></div>
        <div style={{display:"flex",gap:8,marginTop:12}}>
          {[8,16,40].map(a=><button key={a} onClick={()=>setWater(day.water_oz+a)} style={waterBtn}>+{a} oz</button>)}
          {day.water_oz>0 && <button onClick={()=>setWater(Math.max(0,day.water_oz-8))} style={{...waterBtn,flex:"0 0 44px",color:C.blush}}>–8</button>}
        </div>
      </Card>
      <SectionLabel icon={<Dumbbell size={14}/>}>Movement</SectionLabel>
      <Card><textarea defaultValue={day.workout} onBlur={e=>setWorkout(e.target.value)} placeholder="PT, workout, steps, swim…" rows={2} style={{...inputStyle("1 1 auto"),width:"100%",resize:"vertical",lineHeight:1.5}}/></Card>
      <div style={{height:8}}/>
    </div>
  );
}

function Recipes({ recipes }) {
  const [openCalc,setOpenCalc]=useState(false);
  const groups=["Main","Side","Drink"];
  return (
    <div>
      <button onClick={()=>setOpenCalc(true)} style={{...cardStyle,display:"flex",alignItems:"center",gap:10,width:"100%",cursor:"pointer",marginBottom:16}}>
        <div style={{background:C.lightsage,borderRadius:10,padding:8,display:"flex"}}><Calculator size={18} color={C.sage}/></div>
        <div style={{textAlign:"left"}}><div style={{fontWeight:700,color:C.plum}}>Calorie Calculator</div><div style={{fontSize:12,color:C.ink,opacity:0.6}}>Weigh in grams → get calories</div></div>
      </button>
      {groups.map(g=>(
        <div key={g}><SectionLabel icon={<BookOpen size={14}/>}>{g==="Main"?"Mains":g==="Side"?"Sides":"Drinks"}</SectionLabel>
        {recipes.filter(r=>r.kind===g).map(r=><RecipeCard key={r.id} r={r}/>)}</div>
      ))}
      <div style={{height:8}}/>
      {openCalc && <CalcModal onClose={()=>setOpenCalc(false)}/>}
    </div>
  );
}
function RecipeCard({ r }) {
  const [open,setOpen]=useState(false);
  return (
    <Card>
      <button onClick={()=>setOpen(!open)} style={{all:"unset",cursor:"pointer",width:"100%",display:"block"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontWeight:700,color:C.plum,fontFamily:"Georgia, serif",fontSize:17}}>{r.name}</span><Chip>{r.calories} cal</Chip>
        </div>
        <div style={{fontSize:12,color:C.sage,marginTop:3}}>{r.servings>1?`${r.servings} servings`:"per serving"}</div>
      </button>
      {open && <div style={{marginTop:12,borderTop:`1px solid ${C.line}`,paddingTop:12}}>
        <KV label="Batch" value={r.batch}/><KV label="Per serving" value={r.serving}/>
        <div style={{fontSize:12.5,fontStyle:"italic",color:C.ink,opacity:0.65,marginTop:8}}>{r.note}</div>
      </div>}
    </Card>
  );
}
function CalcModal({ onClose }) {
  const [food,setFood]=useState(FOODS[0]); const [amt,setAmt]=useState("");
  const result=useMemo(()=>{ const n=Number(amt)||0; return Math.round(food.perEach? n*food.perEach : n*food.perG); },[amt,food]);
  return (
    <Modal onClose={onClose} title="Calorie Calculator">
      <label style={modalLabel}>Food</label>
      <select value={food.name} onChange={e=>setFood(FOODS.find(f=>f.name===e.target.value))} style={{...inputStyle("1 1 auto"),width:"100%",marginBottom:14}}>
        {FOODS.map(f=><option key={f.name}>{f.name}</option>)}
      </select>
      <label style={modalLabel}>{food.perEach?"How many (balls)":"Weight (grams)"}</label>
      <input value={amt} onChange={e=>setAmt(e.target.value.replace(/\D/g,""))} inputMode="numeric" placeholder={food.perEach?"e.g. 9":"e.g. 150"} style={{...inputStyle("1 1 auto"),width:"100%"}} autoFocus/>
      <div style={{marginTop:20,textAlign:"center",padding:"18px 0",background:C.light,borderRadius:12}}>
        <div style={{fontSize:13,color:C.sage}}>calories</div><div style={{fontSize:40,fontWeight:700,color:C.plum,fontFamily:"Georgia, serif"}}>{result}</div>
      </div>
    </Modal>
  );
}

function Progress({ weighins, addWeighin, removeWeighin }) {
  const [open,setOpen]=useState(false);
  const sorted=[...weighins].sort((a,b)=>a.date.localeCompare(b.date));
  const latest=sorted[sorted.length-1];
  const data=sorted.map(w=>({...w,label:fmtDate(w.date).replace(/^\w+,?\s/,"")}));
  const lost=latest?(TARGETS.startWeight-latest.weight):0;
  const toGo=latest?(latest.weight-TARGETS.goalWeight):(TARGETS.startWeight-TARGETS.goalWeight);
  const yMin=TARGETS.goalWeight-2, yMax=Math.max(TARGETS.startWeight,...sorted.map(w=>w.weight))+1;
  return (
    <div>
      <div style={{display:"flex",gap:12}}>
        <Stat label="Current" value={latest?latest.weight:"—"} unit="lbs" color={C.plum}/>
        <Stat label="Lost" value={lost>0?lost.toFixed(1):"0"} unit="lbs" color={C.sage}/>
        <Stat label="To goal" value={toGo>0?toGo.toFixed(1):"0"} unit="lbs" color={C.gold}/>
      </div>
      <SectionLabel icon={<TrendingDown size={14}/>}>Trend toward 130</SectionLabel>
      <Card><div style={{height:200}}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{top:8,right:8,bottom:0,left:-18}}>
            <XAxis dataKey="label" tick={{fontSize:11,fill:C.sage}} axisLine={false} tickLine={false}/>
            <YAxis domain={[yMin,yMax]} tick={{fontSize:11,fill:C.sage}} axisLine={false} tickLine={false}/>
            <Tooltip contentStyle={{borderRadius:10,border:`1px solid ${C.line}`,fontSize:12}}/>
            <ReferenceLine y={TARGETS.goalWeight} stroke={C.gold} strokeDasharray="5 4" label={{value:"Goal 130",fontSize:10,fill:C.gold,position:"insideTopRight"}}/>
            <Line type="monotone" dataKey="weight" stroke={C.plum} strokeWidth={2.5} dot={{r:4,fill:C.plum}} activeDot={{r:6}}/>
          </LineChart>
        </ResponsiveContainer>
      </div></Card>
      <SectionLabel>Weigh-ins</SectionLabel>
      {sorted.slice().reverse().map(w=>(
        <Card key={w.id}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><div style={{fontWeight:700,color:C.plum}}>{w.weight} lbs</div><div style={{fontSize:12,color:C.sage}}>{fmtDate(w.date)}{w.note?` · ${w.note}`:""}</div></div>
          <button onClick={()=>removeWeighin(w.id)} style={ghostBtn}><Trash2 size={15} color={C.blush}/></button>
        </div></Card>
      ))}
      <button onClick={()=>setOpen(true)} style={{...waterBtn,width:"100%",marginTop:6,padding:"13px 0",background:C.plum,color:"#fff",fontWeight:700}}>+ Add weigh-in</button>
      {open && <WeighModal onClose={()=>setOpen(false)} onSave={w=>{addWeighin(w);setOpen(false);}}/>}
      <div style={{height:8}}/>
    </div>
  );
}
function WeighModal({ onClose, onSave }) {
  const [weight,setWeight]=useState(""); const [date,setDate]=useState(todayKey()); const [note,setNote]=useState("");
  return (
    <Modal onClose={onClose} title="Add weigh-in">
      <label style={modalLabel}>Weight (lbs)</label>
      <input value={weight} onChange={e=>setWeight(e.target.value.replace(/[^\d.]/g,""))} inputMode="decimal" placeholder="e.g. 145" style={{...inputStyle("1 1 auto"),width:"100%",marginBottom:14}} autoFocus/>
      <label style={modalLabel}>Date</label>
      <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{...inputStyle("1 1 auto"),width:"100%",marginBottom:14}}/>
      <label style={modalLabel}>Note (optional)</label>
      <input value={note} onChange={e=>setNote(e.target.value)} placeholder="How you feel…" style={{...inputStyle("1 1 auto"),width:"100%"}}/>
      <button onClick={()=>weight&&onSave({date,weight:Number(weight),note})} style={{width:"100%",marginTop:18,padding:"13px 0",background:C.plum,color:"#fff",border:"none",borderRadius:12,fontWeight:700,fontSize:15,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><Check size={17}/> Save</button>
    </Modal>
  );
}

/* reusable bits */
const cardStyle={background:"#fff",borderRadius:16,padding:16,marginBottom:10,boxShadow:"0 1px 2px rgba(45,42,50,0.04)",border:`1px solid ${C.line}`};
function Card({children}){return <div style={cardStyle}>{children}</div>;}
function SectionLabel({children,icon}){return <div style={{display:"flex",alignItems:"center",gap:6,margin:"18px 4px 8px",color:C.ink,opacity:0.55,fontSize:12,fontWeight:700,letterSpacing:0.6,textTransform:"uppercase"}}>{icon}{children}</div>;}
function Row({children}){return <div style={{display:"flex",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${C.line}`}}>{children}</div>;}
function Chip({children}){return <span style={{background:C.light,color:C.plum,fontWeight:700,fontSize:12,padding:"3px 10px",borderRadius:20}}>{children}</span>;}
function KV({label,value}){return <div style={{display:"flex",gap:8,marginBottom:6}}><span style={{flex:"0 0 84px",fontSize:12,fontWeight:700,color:C.sage,textTransform:"uppercase",letterSpacing:0.4}}>{label}</span><span style={{flex:1,fontSize:13.5}}>{value}</span></div>;}
function Stat({label,value,unit,color}){return <div style={{...cardStyle,flex:1,textAlign:"center",marginBottom:0}}><div style={{fontSize:11,color:C.sage,textTransform:"uppercase",letterSpacing:0.5}}>{label}</div><div style={{fontSize:26,fontWeight:700,color,fontFamily:"Georgia, serif",lineHeight:1.2}}>{value}</div><div style={{fontSize:11,color:C.ink,opacity:0.5}}>{unit}</div></div>;}
function Ring({pct,value}){const R=34,circ=2*Math.PI*R,over=pct>=100;return <div style={{position:"relative",width:84,height:84}}><svg width="84" height="84" style={{transform:"rotate(-90deg)"}}><circle cx="42" cy="42" r={R} fill="none" stroke={C.light} strokeWidth="8"/><circle cx="42" cy="42" r={R} fill="none" stroke={over?C.blush:C.plum} strokeWidth="8" strokeDasharray={circ} strokeDashoffset={circ-(Math.min(pct,100)/100)*circ} strokeLinecap="round"/></svg><div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:19,fontWeight:700,color:C.plum,fontFamily:"Georgia, serif"}}>{value}</span></div></div>;}
function Modal({children,onClose,title}){return <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(45,42,50,0.4)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:50}}><div onClick={e=>e.stopPropagation()} style={{background:"#fff",width:"100%",maxWidth:480,borderRadius:"20px 20px 0 0",padding:22,boxShadow:"0 -4px 20px rgba(0,0,0,0.1)"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><span style={{fontFamily:"Georgia, serif",fontSize:20,fontWeight:700,color:C.plum}}>{title}</span><button onClick={onClose} style={ghostBtn}><X size={20} color={C.ink}/></button></div>{children}</div></div>;}
function TabBar({tab,setTab}){const tabs=[{id:"today",label:"Today",icon:UtensilsCrossed},{id:"recipes",label:"Recipes",icon:BookOpen},{id:"progress",label:"Progress",icon:TrendingDown}];return <div style={{position:"fixed",bottom:0,left:0,right:0,background:"rgba(255,255,255,0.95)",backdropFilter:"blur(8px)",borderTop:`1px solid ${C.line}`,display:"flex",justifyContent:"center",zIndex:40}}><div style={{display:"flex",width:"100%",maxWidth:480}}>{tabs.map(t=>{const Icon=t.icon;const active=tab===t.id;return <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,border:"none",background:"none",padding:"12px 0 16px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4,color:active?C.plum:"#A89FAC"}}><Icon size={22} strokeWidth={active?2.4:1.8}/><span style={{fontSize:11,fontWeight:active?700:500}}>{t.label}</span></button>;})}</div></div>;}
function inputStyle(flex,align){return {flex,padding:"11px 12px",border:`1px solid ${C.line}`,borderRadius:11,fontSize:14,color:C.ink,outline:"none",background:"#fff",textAlign:align||"left",fontFamily:"inherit"};}
const iconBtn=(bg)=>({flex:"0 0 44px",background:bg,color:"#fff",border:"none",borderRadius:11,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"});
const ghostBtn={background:"none",border:"none",cursor:"pointer",padding:4,display:"flex"};
const waterBtn={flex:1,padding:"10px 0",background:C.lightsage,color:C.sage,border:"none",borderRadius:10,fontWeight:700,fontSize:14,cursor:"pointer"};
const modalLabel={display:"block",fontSize:12,fontWeight:700,color:C.sage,textTransform:"uppercase",letterSpacing:0.5,marginBottom:6};
