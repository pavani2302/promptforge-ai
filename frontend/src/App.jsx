import React, {useEffect, useState} from "react";
import {Copy, Sparkles, LogOut, History as HistoryIcon, ShieldCheck} from "lucide-react";
import {login, register, optimize, history} from "./api";

const empty = {score:0,clarity:0,specificity:0,context:0,constraints:0,output_format:0};

export default function App(){
  const [mode,setMode]=useState("login");
  const [auth,setAuth]=useState(!!localStorage.getItem("token"));
  const [form,setForm]=useState({name:"",email:"",password:""});
  const [prompt,setPrompt]=useState("");
  const [result,setResult]=useState({...empty,optimized_prompt:"",suggestions:[],tags:[]});
  const [historyRows,setHistoryRows]=useState([]);
  const [loading,setLoading]=useState(false);
  const [useCase,setUseCase]=useState("DevOps");
  const [tone,setTone]=useState("Professional");
  const [model,setModel]=useState("General");
  const [error,setError]=useState("");

  useEffect(()=>{ if(auth) loadHistory(); },[auth]);

  async function loadHistory(){try{const r=await history();setHistoryRows(r.data)}catch{}}
  async function submitAuth(e){
    e.preventDefault(); setError("");
    try{
      const r=mode==="login" ? await login(form.email,form.password) : await register(form.name,form.email,form.password);
      localStorage.setItem("token",r.data.access_token); setAuth(true);
    }catch(e){setError(e.response?.data?.detail||"Authentication failed");}
  }
  async function runOptimize(){
    if(!prompt.trim()) return;
    setLoading(true);setError("");
    try{const r=await optimize({prompt,use_case:useCase,tone,model_target:model,title:"Prompt optimization"});setResult(r.data);loadHistory();}
    catch(e){setError(e.response?.data?.detail||"Optimization failed");}
    finally{setLoading(false);}
  }
  if(!auth) return <div className="auth"><div className="card authcard"><div className="logo"><Sparkles/> PromptForge AI</div><h1>{mode==="login"?"Welcome back":"Create your account"}</h1><p>Advanced prompt engineering workspace.</p><form onSubmit={submitAuth}>
    {mode==="register"&&<input placeholder="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>}
    <input type="email" placeholder="Email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
    <input type="password" placeholder="Password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/>
    <button className="primary">{mode==="login"?"Login":"Register"}</button>
  </form>{error&&<div className="error">{error}</div>}<button className="link" onClick={()=>setMode(mode==="login"?"register":"login")}>{mode==="login"?"Create account":"Back to login"}</button></div></div>;

  return <div><header><div className="brand"><Sparkles/> PromptForge <span>AI</span></div><div className="headerRight"><span><ShieldCheck size={16}/> Azure OpenAI</span><button onClick={()=>{localStorage.removeItem("token");setAuth(false)}}><LogOut size={17}/> Logout</button></div></header>
  <main><section className="hero"><div><p className="eyebrow">ADVANCED PROMPT ENGINEERING</p><h1>Turn rough ideas into <span>production-ready prompts.</span></h1><p>Optimize, evaluate, version and reuse prompts from one workspace.</p></div></section>
  <div className="grid"><section className="card editor"><div className="sectionTitle"><div><h2>Prompt Optimizer</h2><p>Describe what you want the AI to do.</p></div><Sparkles/></div>
    <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Example: Create a Kubernetes troubleshooting guide..."/>
    <div className="controls"><label>Use case<select value={useCase} onChange={e=>setUseCase(e.target.value)}><option>DevOps</option><option>Software Development</option><option>Career</option><option>Marketing</option><option>Research</option><option>General</option></select></label><label>Tone<select value={tone} onChange={e=>setTone(e.target.value)}><option>Professional</option><option>Beginner Friendly</option><option>Technical</option><option>Concise</option><option>Detailed</option></select></label><label>Target<select value={model} onChange={e=>setModel(e.target.value)}><option>General</option><option>Azure OpenAI</option><option>ChatGPT</option><option>Claude</option><option>Gemini</option></select></label></div>
    <button className="primary optimize" onClick={runOptimize} disabled={loading}>{loading?"Optimizing...":<><Sparkles size={18}/> Optimize Prompt</>}</button>
    {error&&<div className="error">{error}</div>}</section>
  <section className="card result"><div className="sectionTitle"><div><h2>Optimized Prompt</h2><p>AI-generated production-ready version.</p></div><button onClick={()=>navigator.clipboard.writeText(result.optimized_prompt||"")}><Copy size={17}/> Copy</button></div><div className="output">{result.optimized_prompt||"Your optimized prompt will appear here."}</div>
  <div className="score">Overall Score <strong>{result.score||0}</strong>/100</div><div className="metrics">{[["Clarity",result.clarity],["Specificity",result.specificity],["Context",result.context],["Constraints",result.constraints],["Output Format",result.output_format]].map(x=><div key={x[0]}><span>{x[0]}</span><b>{x[1]}%</b><div className="bar"><i style={{width:`${x[1]}%`}}/></div></div>)}</div>
  {result.suggestions?.length>0&&<div className="suggestions"><h3>Suggestions</h3>{result.suggestions.map((s,i)=><div key={i}>✓ {s}</div>)}</div>}{result.tags?.length>0&&<div className="tags">{result.tags.map(t=><span key={t}>#{t}</span>)}</div>}</section></div>
  <section className="card"><div className="sectionTitle"><div><h2><HistoryIcon/> Prompt History</h2><p>Recent optimized prompts stored in PostgreSQL.</p></div></div><div className="history">{historyRows.map(r=><button key={r.id} onClick={()=>{setPrompt(r.original_prompt);setResult({...r,optimized_prompt:r.optimized_prompt})}}><b>{r.title}</b><span>{r.original_prompt.slice(0,90)}</span><strong>{r.score}</strong></button>)}{historyRows.length===0&&<p className="muted">No prompt history yet.</p>}</div></section>
  </main></div>
}
