import { useState, useEffect, useRef, useCallback } from "react";

function shuffle(a){const s=[...a];for(let i=s.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[s[i],s[j]]=[s[j],s[i]];}return s;}
function wait(ms){return new Promise(r=>setTimeout(r,ms));}
function find(ps,n){return n?ps.find(p=>p.name.toLowerCase()===n.toLowerCase().trim()):null;}
function clean(t){return t.replace(/^["']|["']$/g,"").replace(/\*\*/g,"").replace(/\*([^*]+)\*/g,"$1").replace(/_([^_]+)_/g,"$1").trim();}
function checkWin(ps){const a=ps.filter(p=>p.alive),w=a.filter(p=>p.role==="Loup-Garou"),v=a.length-w.length;if(!w.length)return"village";if(w.length>=v)return"loups";return null;}

const P0=[
  {name:"Marguerite",role:"Loup-Garou",wolfStyle:"contributeur",emoji:"🌸",color:"#e8a0bf"},
  {name:"Victor",role:"Chasseur",emoji:"🔥",color:"#e8743a"},
  {name:"Camille",role:"Voyante",emoji:"🔮",color:"#7eb8da"},
  {name:"Thibault",role:"Villageois",emoji:"🧑",color:"#d4a843",isHuman:true},
  {name:"Hugo",role:"Loup-Garou",wolfStyle:"suiveur",emoji:"🌿",color:"#6bbf6b"},
  {name:"Basile",role:"Villageois",emoji:"🪨",color:"#9e9e9e"},
  {name:"Roxane",role:"Sorcière",emoji:"⚔️",color:"#d94f4f"},
  {name:"Lucie",role:"Villageois",emoji:"🌙",color:"#c4a0d4"},
];

const BASE=`Tu es un joueur dans une partie de Loup-Garou. Tu es un PERSONNAGE, pas une IA. Ne brise JAMAIS le 4ème mur.
RÈGLES : 8 joueurs (2 Loups-Garous, 1 Voyante, 1 Sorcière, 1 Chasseur, 3 Villageois). Nuit : Loups tuent, Voyante inspecte, Sorcière peut sauver/empoisonner (1 fois chaque). Jour : débat puis vote majorité. Village gagne si Loups éliminés. Loups gagnent si nombre >= villageois.
FORMAT : 2-4 phrases MAX. Parle comme une vraie personne. "je", prénoms. JAMAIS de listes. Émotif, sarcastique, humain. Ne décris JAMAIS tes gestes. INTERDIT : ne révèle JAMAIS ton rôle par accident.
ANTI-MEUTE : Si tout le monde accuse la même personne, méfie-toi. Aie ta PROPRE opinion.`;

const PERS={
  Victor:`Tu es Victor, 30 ans, nerveux, paranoïaque. "c'est louche","ça colle pas". Phrases courtes. Tu rebondis sur tout.`,
  Marguerite:`Tu es Marguerite, 50 ans, posée, diplomate. "Si je comprends bien...". Questions ouvertes. Synthèses. Hésites entre suspects.`,
  Camille:`Tu es Camille, 25 ans, brillante, analytique. Faits, élimination. Ton assuré. Incohérences. Raisonnements multi-tours.`,
  Hugo:`Tu es Hugo, 25 ans, chaleureux, fédérateur. "on","nous". Défends les accusés. Plans collectifs. Confiance publique.`,
  Basile:`Tu es Basile, 40 ans, bourru. 1-2 phrases MAX. "Mouais." "Pas convaincu." Avis DIFFÉRENT de la majorité.`,
  Roxane:`Tu es Roxane, 30 ans, frontale. Noms. "Arrête ton cirque". Doubles down. JAMAIS la majorité par défaut.`,
  Lucie:`Tu es Lucie, 20 ans, spontanée, impulsive. Instinct. "J'ai un mauvais feeling". Changes d'avis. Imprévisible.`,
};

const ROLES={
  "Villageois":`RÔLE SECRET : Villageois. Observe, argumente. Tu PEUX mentir sur ton rôle.`,
  "Voyante":`RÔLE SECRET : Voyante. PROTÈGE TON IDENTITÉ. UTILISE tes infos avec arguments "comportementaux". En dernier recours, révèle-toi.`,
  "Sorcière":`RÔLE SECRET : Sorcière. Protège ton identité. Tu sais qui les Loups ciblent.`,
  "Chasseur":`RÔLE SECRET : Chasseur. Si tu meurs, tu emportes quelqu'un. Tu PEUX menacer.`,
  "Loup-Garou":`RÔLE SECRET : Loup-Garou. Coéquipier: {p}. MENS. ACCUSE des innocents. CONTRE-ATTAQUE.`,
};

const WSTYLES={
  contributeur:`STYLE: Contributeur Actif. LANCE des accusations fabriquées. Crédibilité d'abord.`,
  suiveur:`STYLE: Suiveur Silencieux. Discret. "D'accord avec X." Invisible.`,
};

function sysPr(pl,ps){
  let s=BASE+"\n\n"+(PERS[pl.name]||"");
  let r=ROLES[pl.role]||"";
  if(pl.role==="Loup-Garou"){
    const pa=ps.find(x=>x.role==="Loup-Garou"&&x.name!==pl.name);
    r=r.replace("{p}",pa?.name||"mort");
    s+="\n\n"+r+"\n\n"+(WSTYLES[pl.wolfStyle]||"");
  } else s+="\n\n"+r;
  return s;
}

function gameCtx(pl,ps,msgs,cy,rd,nr,hist,seer){
  const alive=ps.filter(p=>p.alive).map(p=>p.name);
  const dead=ps.filter(p=>!p.alive);
  let c=`ÉTAT — Cycle ${cy}, Tour ${rd}/2\nEn vie (${alive.length}): ${alive.join(", ")}\n`;
  if(dead.length)c+=`Morts: ${dead.map(d=>`${d.name}(${d.role})`).join(", ")}\n`;
  if(hist.length){c+="\nCYCLES PASSÉS:\n";hist.forEach(h=>{c+=`C${h.cycle}: ${h.nightDeath||"aucun mort"} nuit, ${h.voteDeath?h.voteDeath+"("+h.voteRole+")":"pas de vote"} jour${h.hunterDeath?", Chasseur→"+h.hunterDeath:""}\n`;});}
  if(nr){c+=nr.deaths.length?`\nCette nuit: ${nr.deaths.map(d=>d.name+"("+d.role+")").join(", ")} tué(s).\n`:"\nCette nuit: personne tué.\n";}
  c+="\n";
  if(pl.role==="Voyante"&&seer.length){
    c+="TES INFOS (UTILISE-LES):\n";seer.forEach(s=>{c+=`- C${s.cycle}: ${s.target} = ${s.result}\n`;});
    const aw=seer.filter(s=>s.result==="LOUP-GAROU").map(s=>s.target).filter(w=>alive.includes(w));
    if(aw.length)c+=`→ ${aw.join("/")} = Loup(s) en vie. ORIENTE les soupçons!\n`;c+="\n";
  }else if(pl.role==="Loup-Garou"){
    const pa=ps.find(x=>x.role==="Loup-Garou"&&x.name!==pl.name);
    c+=`PRIVÉ: Loup avec ${pa?.name||"mort"}.${nr?.wolfTarget?" Ciblé "+nr.wolfTarget+".":""}\n\n`;
  }else if(pl.role==="Sorcière"&&nr?.wolfTarget){c+=`PRIVÉ: Loups ciblent ${nr.wolfTarget}.\n\n`;}
  const cm=msgs.filter(m=>m.cycle===cy&&!m.isSystem);
  if(cm.length){c+="DÉBAT:\n";cm.forEach(m=>{c+=`- ${m.speaker}: "${m.text}"\n`;});c+="\n";}
  c+=rd===1?"TOUR 1: Pose des questions, sonde, premiers doutes. Pas d'accusation sans fondement.\n":"TOUR 2 — DERNIER MOT: Sois direct. NOMME ton suspect. Prends position.\n";
  c+="2-4 phrases max.";return c;
}

function voteCtx(pl,ps,msgs,cy){
  const alive=ps.filter(p=>p.alive&&p.name!==pl.name).map(p=>p.name);
  const cm=msgs.filter(m=>m.cycle===cy&&!m.isSystem);
  let c="DÉBAT:\n";cm.forEach(m=>{c+=`- ${m.speaker}: "${m.text}"\n`;});
  c+=`\nVote parmi: ${alive.join(", ")}\nTA conviction. Unanime = piège.\nVOTE: [prénom]\nRAISON: [phrase]`;return c;
}

async function api(s,u){
  try{const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:200,system:s,messages:[{role:"user",content:u}]})});const d=await r.json();return d.content?.[0]?.text||"...";}
  catch(e){console.error(e);return "...";}
}

// ── UI ──
function Badge({player:p,active,speaking}){
  const d=!p.alive;
  return(<div className={`flex flex-col items-center transition-all duration-500 ${active?"scale-110":""} ${d?"opacity-30":""}`} style={{minWidth:48}}>
    <div className={`w-11 h-11 rounded-full flex items-center justify-center text-xl border-2 transition-all ${speaking?"border-yellow-400 shadow-lg shadow-yellow-400/30":active?"border-yellow-600/80":d?"border-gray-800":"border-white/15"}`} style={{backgroundColor:d?"#111":p.color+"22"}}>{d?"💀":p.emoji}</div>
    <span className={`mt-1 text-xs font-medium ${speaking?"text-yellow-300":d?"text-gray-600":"text-gray-300"}`}>{p.name}{p.isHuman&&!d&&<span className="text-yellow-500 ml-0.5">★</span>}</span>
    {d&&p.revealedRole&&<span className={`text-xs -mt-0.5 ${p.role==="Loup-Garou"?"text-red-500":"text-gray-600"}`}>{p.role==="Loup-Garou"?"🐺":"☮"}</span>}
  </div>);
}

function ChatMsg({m}){
  if(m.isSystem){
    const bg=m.isNight?"bg-indigo-950/50 border-indigo-800/20":m.isDawn?"bg-amber-950/40 border-amber-800/20":m.isVictory?"bg-emerald-950/40 border-emerald-700/20":m.isCycleSep?"bg-transparent border-white/5":"bg-red-950/30 border-red-800/20";
    const tx=m.isNight?"text-indigo-300":m.isDawn?"text-amber-200":m.isVictory?"text-emerald-200":m.isCycleSep?"text-gray-600 text-xs not-italic uppercase tracking-widest":"text-red-200";
    return(<div className="flex justify-center my-2"><div className={`rounded-xl px-4 py-2 max-w-lg text-center border ${bg}`}><p className={`text-sm italic ${tx}`}>{m.text}</p></div></div>);
  }
  const h=m.isHuman;
  return(<div className={`flex gap-2.5 my-1.5 ${h?"flex-row-reverse":""}`}>
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0 mt-1" style={{backgroundColor:(m.color||"#666")+"22"}}>{m.emoji}</div>
    <div className={`max-w-sm sm:max-w-md ${h?"text-right":""}`}>
      <span className="text-xs font-semibold" style={{color:m.color}}>{m.speaker}</span>
      <div className={`mt-0.5 rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${h?"bg-yellow-900/25 border border-yellow-700/20 text-yellow-100":"bg-white/5 border border-white/8 text-gray-200"}`}>{m.text}</div>
    </div>
  </div>);
}

function Dots({name,emoji}){
  return(<div className="flex gap-2.5 my-1.5 items-center">
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-base" style={{backgroundColor:"#ffffff08"}}>{emoji}</div>
    <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white/5 border border-white/8">
      <span className="text-xs text-gray-400">{name}</span>
      <span className="flex gap-0.5">{[0,150,300].map(d=><span key={d} className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{animationDelay:d+"ms"}}/>)}</span>
    </div>
  </div>);
}

// ── MAIN ──
export default function LycanaGame(){
  const[players,setPlayers]=useState(P0.map(p=>({...p,alive:true,revealedRole:false})));
  const[phase,setPhase]=useState("intro");
  const[cycle,setCycle]=useState(0);
  const[round,setRound]=useState(1);
  const[messages,setMessages]=useState([]);
  const[order,setOrder]=useState([]);
  const[idx,setIdx]=useState(0);
  const[speaker,setSpeaker]=useState(null);
  const[loading,setLoading]=useState(false);
  const[input,setInput]=useState("");
  const[votes,setVotes]=useState({});
  const[hVote,setHVote]=useState(null);
  const[nResult,setNResult]=useState(null);
  const[pots,setPots]=useState({heal:true,poison:true});
  const[seerLog,setSeerLog]=useState([]);
  const[hist,setHist]=useState([]);
  const[winner,setWinner]=useState(null);
  const[nText,setNText]=useState("");
  const[vReveals,setVReveals]=useState([]);
  const[hAlive,setHAlive]=useState(true);

  const chatRef=useRef(null);
  const inputRef=useRef(null);
  const busy=useRef(false);

  useEffect(()=>{if(chatRef.current)chatRef.current.scrollTop=chatRef.current.scrollHeight;},[messages,speaker,nText,vReveals]);

  function addMsg(text,sys=false,extra={}){setMessages(prev=>[...prev,{text,isSystem:sys,...extra}]);}
  function isDead(ps){const h=ps.find(p=>p.isHuman);return h&&!h.alive;}

  // ── NIGHT ──
  const runNight=useCallback(async(ps,cy)=>{
    setPhase("night");setNText("");
    const alive=ps.filter(p=>p.alive);
    const wolves=alive.filter(p=>p.role==="Loup-Garou");
    const seer=alive.find(p=>p.role==="Voyante");
    const witch=alive.find(p=>p.role==="Sorcière");

    addMsg("🌙 La nuit tombe. Les portes se ferment...",true,{isNight:true,cycle:cy});
    await wait(2000);

    // Wolves
    setNText("Les loups ouvrent les yeux...");
    let wTarget=null;
    if(wolves.length>0){
      const r=await api(sysPr(wolves[0],ps),`Nuit. Cibles: ${alive.filter(p=>p.role!=="Loup-Garou").map(p=>p.name).join(", ")}\nCIBLE: [prénom]\nRAISON: [phrase]`);
      const m=r.match(/CIBLE:\s*([A-Za-zÀ-ÿ]+)/i);
      const t=m?find(ps,m[1]):null;
      wTarget=(t&&t.alive&&t.role!=="Loup-Garou")?t.name:alive.filter(p=>p.role!=="Loup-Garou")[Math.floor(Math.random()*alive.filter(p=>p.role!=="Loup-Garou").length)]?.name;
    }
    await wait(1500);

    // Seer
    let seerT=null,seerR=null;
    if(seer){
      setNText("La voyante scrute les ombres...");
      const inspected=seerLog.map(s=>s.target);
      const cands=alive.filter(p=>p.name!==seer.name&&!inspected.includes(p.name)).map(p=>p.name);
      const targets=cands.length?cands:alive.filter(p=>p.name!==seer.name).map(p=>p.name);
      const r=await api(sysPr(seer,ps),`Nuit. Inspecte UN joueur.\n${seerLog.length?"Déjà: "+seerLog.map(s=>s.target+"="+s.result).join(", ")+"\n":""}Choix: ${targets.join(", ")}\nINSPECTE: [prénom]\nRAISON: [phrase]`);
      const m=r.match(/INSPECTE:\s*([A-Za-zÀ-ÿ]+)/i);
      const t=m?find(ps,m[1]):null;
      if(t){seerT=t.name;seerR=t.role==="Loup-Garou"?"LOUP-GAROU":"VILLAGEOIS";setSeerLog(prev=>[...prev,{target:t.name,result:seerR,cycle:cy}]);}
      await wait(1500);
    }

    // Witch
    let wAction=null;
    if(witch&&wTarget&&(pots.heal||pots.poison)){
      setNText("La sorcière prépare ses potions...");
      const opts=[];if(pots.heal)opts.push("SAUVER "+wTarget);if(pots.poison)opts.push("EMPOISONNER [prénom]");opts.push("RIEN");
      const r=await api(sysPr(witch,ps),`Nuit. Loups ciblent: ${wTarget}.\nPotions: Guérison ${pots.heal?"✓":"✗"}, Poison ${pots.poison?"✓":"✗"}\nOptions: ${opts.join(" / ")}\nACTION: [choix]\nRAISON: [phrase]`);
      const m=r.match(/ACTION:\s*(SAUVER|EMPOISONNER\s+[A-Za-zÀ-ÿ]+|RIEN)/i);
      if(m)wAction=m[1].trim();
      await wait(1500);
    }
    setNText("");

    // Resolve
    const deaths=[];let saved=false;
    if(wAction?.toUpperCase()==="SAUVER"&&pots.heal){saved=true;setPots(p=>({...p,heal:false}));}
    else if(wTarget){const v=find(ps,wTarget);if(v&&v.alive)deaths.push(v);}
    if(wAction?.toUpperCase().startsWith("EMPOISONNER")&&pots.poison){
      const pn=wAction.split(/\s+/)[1];const pt=find(ps,pn);
      if(pt&&pt.alive&&!deaths.find(d=>d.name===pt.name))deaths.push(pt);
      setPots(p=>({...p,poison:false}));
    }

    const nr={wolfTarget:wTarget,saved,deaths};setNResult(nr);
    let up=[...ps];let hunterD=null;
    deaths.forEach(d=>{up=up.map(p=>p.name===d.name?{...p,alive:false,revealedRole:true}:p);if(d.role==="Chasseur")hunterD=d;});
    setPlayers(up);if(isDead(up))setHAlive(false);

    await wait(1000);setPhase("dawn");
    if(!deaths.length)addMsg("Personne n'a été pris cette nuit.",true,{isDawn:true,cycle:cy});
    else{
      addMsg(`${deaths.map(d=>d.name+" ("+d.role+")").join(" et ")} ne verra plus le soleil.`,true,{isDawn:true,cycle:cy});
      if(deaths.find(d=>d.isHuman)){await wait(1500);addMsg("💀 Tu as été dévoré. Tu observes en silence...",true,{cycle:cy});}
    }

    if(hunterD){
      await wait(2000);addMsg(`🎯 ${hunterD.name} était le Chasseur !`,true,{isDawn:true,cycle:cy});
      await wait(1500);
      const r=await api(sysPr(hunterD,ps),`Chasseur mort. En vie: ${up.filter(p=>p.alive).map(p=>p.name).join(", ")}\nTIR: [prénom]\nRAISON: [phrase]`);
      const sm=r.match(/TIR:\s*([A-Za-zÀ-ÿ]+)/i);const sp=sm?find(up,sm[1]):null;
      if(sp&&sp.alive){up=up.map(p=>p.name===sp.name?{...p,alive:false,revealedRole:true}:p);setPlayers(up);if(isDead(up))setHAlive(false);
        addMsg(`Chasseur emporte ${sp.name} (${sp.role}) ! ${sp.role==="Loup-Garou"?"🎉 Loup!":"💀 Innocent..."}`,true,{isDawn:true,cycle:cy});}
    }

    await wait(2000);const v=checkWin(up);if(v){endGame(v);return;}
    addMsg("Les survivants se rassemblent.",true,{cycle:cy});await wait(1500);
    setOrder(shuffle(up.filter(p=>p.alive).map(p=>p.name)));setIdx(0);setRound(1);setPhase("debate");
  },[seerLog,pots]);

  // ── DEBATE ──
  const next=useCallback(async()=>{
    if(busy.current)return;busy.current=true;
    if(idx>=order.length){
      if(round===1)setPhase("roundTransition");
      else setPhase(hAlive?"voteHuman":"voteAuto");
      busy.current=false;return;
    }
    const nm=order[idx];const pl=players.find(p=>p.name===nm);
    if(!pl||!pl.alive){setIdx(p=>p+1);busy.current=false;return;}
    if(pl.isHuman&&hAlive){setPhase("humanTurn");setSpeaker(nm);busy.current=false;setTimeout(()=>inputRef.current?.focus(),100);return;}
    if(pl.isHuman&&!hAlive){setIdx(p=>p+1);busy.current=false;return;}

    setSpeaker(nm);setLoading(true);await wait(1000+Math.random()*2000);
    const r=await api(sysPr(pl,players),gameCtx(pl,players,messages,cycle,round,nResult,hist,seerLog));
    addMsg(clean(r),false,{speaker:nm,emoji:pl.emoji,color:pl.color,cycle});
    setLoading(false);setSpeaker(null);setIdx(p=>p+1);busy.current=false;
  },[idx,order,players,messages,cycle,round,nResult,hist,seerLog,hAlive]);

  useEffect(()=>{if(phase==="debate"&&!loading&&!busy.current){const t=setTimeout(next,600);return()=>clearTimeout(t);}},[phase,idx,loading,next]);
  useEffect(()=>{if(phase==="voteAuto")doVotes(null);},[phase]);
  useEffect(()=>{if(phase==="voteAI"&&hVote!==null)doVotes(hVote);},[phase,hVote]);

  async function doVotes(humanVote){
    setLoading(true);
    const ais=players.filter(p=>p.alive&&!p.isHuman);const av={};
    for(const p of ais){const r=await api(sysPr(p,players),voteCtx(p,players,messages,cycle));const vm=r.match(/VOTE:\s*([A-Za-zÀ-ÿ]+)/i);const rm=r.match(/RAISON:\s*(.+)/i);av[p.name]={target:vm?.[1]||"abstention",reason:rm?.[1]||""};}
    setVotes(av);setLoading(false);

    const all=[];if(humanVote)all.push({voter:"Thibault",target:humanVote,isHuman:true,reason:""});
    Object.entries(av).forEach(([k,v])=>all.push({voter:k,target:v.target,reason:v.reason}));
    setVReveals([]);for(let i=0;i<all.length;i++){await wait(600);setVReveals(p=>[...p,all[i]]);}

    await wait(800);const tally={};
    if(humanVote)tally[humanVote]=(tally[humanVote]||0)+1;
    Object.values(av).forEach(v=>{tally[v.target]=(tally[v.target]||0)+1;});
    const sorted=Object.entries(tally).sort((a,b)=>b[1]-a[1]);
    const tie=sorted.length>1&&sorted[0][1]===sorted[1][1];

    if(tie){addMsg("Égalité ! Pas d'élimination.",true,{cycle});setHist(p=>[...p,{cycle,nightDeath:nResult?.deaths?.[0]?.name,voteDeath:null,voteRole:null,hunterDeath:null}]);await wait(2000);goNext(players);return;}

    const en=sorted[0][0];const ep=find(players,en);const iw=ep?.role==="Loup-Garou";const ih=ep?.role==="Chasseur";
    const fem=["Roxane","Camille","Marguerite","Lucie"].includes(en);
    let up=players.map(p=>p.name===ep?.name?{...p,alive:false,revealedRole:true}:p);setPlayers(up);if(isDead(up))setHAlive(false);
    addMsg(`${en} éliminé${fem?"e":""}. ${iw?"Loup-Garou 🐺 !":ep?.role+"."}`,true,{cycle,isDawn:iw});

    let hd=null;
    if(ih){await wait(2000);addMsg(`🎯 ${en} était le Chasseur !`,true,{cycle});await wait(1500);
      const r=await api(sysPr(ep,players),`Chasseur mort. En vie: ${up.filter(p=>p.alive).map(p=>p.name).join(", ")}\nTIR: [prénom]\nRAISON: [phrase]`);
      const sm=r.match(/TIR:\s*([A-Za-zÀ-ÿ]+)/i);const sp=sm?find(up,sm[1]):null;
      if(sp&&sp.alive){up=up.map(p=>p.name===sp.name?{...p,alive:false,revealedRole:true}:p);setPlayers(up);if(isDead(up))setHAlive(false);hd=sp.name;
        addMsg(`Chasseur emporte ${sp.name} (${sp.role}) ! ${sp.role==="Loup-Garou"?"🎉":"💀"}`,true,{cycle});}
    }

    setHist(p=>[...p,{cycle,nightDeath:nResult?.deaths?.[0]?.name,voteDeath:en,voteRole:ep?.role,hunterDeath:hd}]);
    await wait(2000);const v=checkWin(up);if(v){endGame(v);return;}goNext(up);
  }

  function goNext(ps){setVotes({});setHVote(null);setVReveals([]);setNResult(null);const nc=cycle+1;setCycle(nc);addMsg(`── Cycle ${nc} ──`,true,{isCycleSep:true,cycle:nc});runNight(ps,nc);}
  function endGame(r){setWinner(r);setPhase("gameOver");addMsg(r==="village"?"🎉 Le dernier loup tombe. Le village respire.":"🐺 Les ombres se referment. Le village est tombé.",true,{isVictory:r==="village",cycle});}

  function submitH(){if(!input.trim())return;const h=players.find(p=>p.isHuman);addMsg(input.trim(),false,{speaker:"Thibault",isHuman:true,emoji:h.emoji,color:h.color,cycle});setInput("");setPhase("debate");setIdx(p=>p+1);setSpeaker(null);}
  function passH(){const h=players.find(p=>p.isHuman);addMsg("...",false,{speaker:"Thibault",isHuman:true,emoji:h.emoji,color:h.color,cycle});setPhase("debate");setIdx(p=>p+1);setSpeaker(null);}
  function round2(){addMsg("Dernier tour de parole...",true,{cycle});setOrder(shuffle(players.filter(p=>p.alive).map(p=>p.name)));setIdx(0);setRound(2);setPhase("debate");}
  function start(){setCycle(1);addMsg("── Cycle 1 ──",true,{isCycleSep:true,cycle:1});runNight(players,1);}

  function sugg(){
    const ai=players.filter(p=>p.alive&&!p.isHuman).map(p=>p.name);
    const r1=ai[Math.floor(Math.random()*ai.length)]||"?";
    const r2=ai.filter(n=>n!==r1)[Math.floor(Math.random()*Math.max(ai.length-1,1))]||"?";
    if(round===1)return[`Quelqu'un a un doute ?`,`${r1}, t'es bien tranquille.`,`On devrait écouter tout le monde.`,`Y'a un truc bizarre chez ${r2}.`];
    return[`Je maintiens sur ${r1}.`,`Y'a un loup dans le consensus.`,`${r2}, explique-toi.`,`Si on se trompe, on est morts demain.`];
  }

  const aliveN=players.filter(p=>p.alive).length;
  const pLabel={intro:"—",night:"🌙 Nuit",dawn:"☀️ Aube",debate:"💬 Débat",humanTurn:"✨ Ton tour",roundTransition:"⏳",voteHuman:"🗳️ Vote",voteAI:"🗳️ Vote",voteAuto:"🗳️ Vote",gameOver:winner==="village"?"🎉 Victoire":"💀 Défaite"}[phase]||"...";
  const bg=phase==="night"?"linear-gradient(170deg,#03030f,#08082a,#0a0820)":phase==="gameOver"&&winner==="loups"?"linear-gradient(170deg,#1a0505,#250808,#1a0505)":"linear-gradient(170deg,#0f0a1a,#1a0f2e,#1e1232)";

  return(
    <div className="min-h-screen text-white flex flex-col" style={{background:bg,transition:"background 2s ease"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Source+Sans+3:wght@400;600&display=swap');*{font-family:'Source Sans 3',sans-serif;}.font-display{font-family:'Cinzel',serif;}::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-thumb{background:#ffffff15;border-radius:3px;}@keyframes fadeUp{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}.fade-up{animation:fadeUp .4s ease forwards;}`}</style>

      <header className="text-center py-2.5 border-b border-white/8">
        <h1 className="font-display text-xl sm:text-2xl tracking-widest" style={{color:"#d4a843"}}>🐺 LYCANA</h1>
      </header>

      <div className="flex justify-center gap-1.5 sm:gap-3 py-2.5 px-2 border-b border-white/5 flex-wrap">
        {players.map(p=><Badge key={p.name} player={p} active={speaker===p.name} speaking={speaker===p.name&&loading}/>)}
      </div>

      {phase!=="intro"&&(
        <div className="flex items-center justify-center gap-3 py-1.5 bg-white/3 border-b border-white/5 text-xs flex-wrap px-2">
          {hAlive?<span><span className="text-gray-500">Rôle </span><span className="text-yellow-400 font-bold">Villageois</span></span>:<span className="text-red-400 font-bold">💀 Spectateur</span>}
          <span className="text-white/10">|</span>
          <span className="text-gray-500">C<span className="text-purple-400 font-bold">{cycle}</span></span>
          <span className="text-white/10">|</span>
          <span className="text-gray-500">{pLabel}</span>
          <span className="text-white/10">|</span>
          <span className="text-green-400 font-bold">{aliveN}/8</span>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {phase==="intro"?(
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <div className="max-w-sm text-center">
              <div className="text-6xl mb-4">🌕</div>
              <h2 className="font-display text-xl mb-2" style={{color:"#d4a843"}}>Le village s'endort</h2>
              <p className="text-gray-400 text-sm mb-1">8 joueurs. 2 loups parmi vous.</p>
              <p className="text-gray-500 text-sm mb-5">Tu es Villageois — observe, déduis, survit.</p>
              <div className="bg-white/5 rounded-xl p-3.5 mb-5 text-left border border-white/8 space-y-1 text-xs text-gray-500">
                <p>🌙 Nuit : loups chassent, Voyante inspecte, Sorcière agit</p>
                <p>☀️ Jour : 2 tours de débat puis vote</p>
                <p>🔄 Boucle jusqu'à victoire</p>
                <p>🎯 Le Chasseur tire en mourant</p>
              </div>
              <button onClick={start} className="px-8 py-3 rounded-xl font-display text-sm tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-yellow-900/20" style={{background:"linear-gradient(135deg,#d4a843,#b8892e)",color:"#1a0f2e"}}>PREMIÈRE NUIT</button>
            </div>
          </div>
        ):(
          <>
            <div ref={chatRef} className="flex-1 overflow-y-auto px-3 sm:px-4 py-3" style={{maxHeight:"calc(100vh - 260px)"}}>
              {messages.map((m,i)=><ChatMsg key={i} m={m}/>)}
              {nText&&<div className="flex justify-center my-4"><div className="bg-indigo-950/60 border border-indigo-700/20 rounded-2xl px-6 py-4 max-w-xs text-center"><div className="text-3xl mb-2">🌙</div><p className="text-indigo-200 text-sm animate-pulse">{nText}</p></div></div>}
              {loading&&speaker&&<Dots name={speaker} emoji={players.find(p=>p.name===speaker)?.emoji||"🤔"}/>}
              {(phase==="voteAI"||phase==="voteAuto")&&loading&&<div className="flex justify-center my-3"><div className="bg-purple-950/40 border border-purple-700/20 rounded-xl px-4 py-2"><p className="text-purple-300 text-sm animate-pulse">Délibération...</p></div></div>}
              {vReveals.length>0&&(
                <div className="flex justify-center my-3"><div className="bg-red-950/25 border border-red-800/20 rounded-xl px-4 py-3 max-w-md w-full">
                  <p className="text-red-300 text-xs font-bold mb-2 text-center uppercase tracking-wider">Votes</p>
                  {vReveals.map((v,i)=>{const vP=players.find(p=>p.name===v.voter);const tP=players.find(p=>p.name===v.target);
                    return(<div key={i} className="flex items-center justify-between text-sm fade-up my-1 px-1">
                      <span style={{color:vP?.color}} className="font-medium">{v.voter}{v.isHuman?" ★":""}</span>
                      <span className="text-gray-600 mx-1">→</span>
                      <span style={{color:tP?.color}} className="font-medium">{v.target}</span>
                      {v.reason&&<span className="text-gray-600 text-xs ml-2 truncate max-w-32 hidden sm:inline">"{v.reason}"</span>}
                    </div>);})}
                </div></div>
              )}
              {phase==="gameOver"&&(
                <div className="flex justify-center my-4"><div className="bg-white/5 border border-white/8 rounded-xl px-5 py-3 max-w-sm">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-2 text-center">Rôles</p>
                  <div className="grid grid-cols-2 gap-1">{P0.map(pi=>{const c=players.find(x=>x.name===pi.name);return(
                    <div key={pi.name} className={`flex items-center gap-1.5 text-xs py-0.5 ${c?.alive?"":"opacity-40"}`}>
                      <span>{c?.alive?pi.emoji:"💀"}</span><span style={{color:pi.color}}>{pi.name}</span>
                      <span className={`ml-auto ${pi.role==="Loup-Garou"?"text-red-400 font-bold":"text-gray-500"}`}>{pi.role==="Loup-Garou"?"🐺":pi.role.slice(0,8)}</span>
                    </div>);})}</div>
                </div></div>
              )}
            </div>

            <div className="border-t border-white/8 p-3 bg-black/20">
              {phase==="humanTurn"&&(
                <div>
                  <p className="text-yellow-400 text-xs mb-2 font-bold uppercase tracking-wider">💬 Ton tour — Tour {round}/2</p>
                  <div className="flex gap-2">
                    <input ref={inputRef} type="text" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submitH()}
                      placeholder="Accuse, défends, questionne..." className="flex-1 bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-700/50"/>
                    <button onClick={submitH} disabled={!input.trim()} className="px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-20 hover:scale-105 active:scale-95 transition-all" style={{background:input.trim()?"linear-gradient(135deg,#d4a843,#b8892e)":"#222",color:"#1a0f2e"}}>Parler</button>
                    <button onClick={passH} className="px-3 py-2.5 rounded-xl text-xs text-gray-500 bg-white/5 border border-white/10 hover:bg-white/10" title="Passer">Passer</button>
                  </div>
                  <div className="flex gap-1.5 mt-2 flex-wrap">{sugg().map((s,i)=>(
                    <button key={i} onClick={()=>setInput(s)} className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/8 text-gray-400 hover:bg-white/10 hover:text-gray-200 transition-colors truncate max-w-xs">{s}</button>
                  ))}</div>
                </div>
              )}
              {phase==="roundTransition"&&(
                <div className="text-center py-2">
                  <p className="text-purple-300 text-sm mb-2">Premier tour terminé.</p>
                  <button onClick={round2} className="px-6 py-2.5 rounded-xl font-display text-sm tracking-widest hover:scale-105 transition-all" style={{background:"linear-gradient(135deg,#8B5CF6,#6D28D9)",color:"white"}}>DERNIER MOT</button>
                </div>
              )}
              {phase==="voteHuman"&&hVote===null&&(
                <div>
                  <p className="text-red-400 text-xs mb-2 font-bold uppercase tracking-wider">🗳️ Qui éliminer ?</p>
                  <div className="flex gap-2 flex-wrap">{players.filter(p=>p.alive&&!p.isHuman).map(p=>(
                    <button key={p.name} onClick={()=>{setHVote(p.name);setPhase("voteAI");}}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-sm hover:bg-red-900/25 hover:border-red-700/30 transition-all hover:scale-105 active:scale-95" style={{color:p.color}}>{p.emoji} {p.name}</button>
                  ))}</div>
                </div>
              )}
              {["debate","night","dawn","voteAI","voteAuto"].includes(phase)&&phase!=="humanTurn"&&(
                <div className="text-center py-1"><p className="text-gray-500 text-xs">{phase==="night"?"Le village dort...":phase==="dawn"?"L'aube se lève...":phase==="voteAI"||phase==="voteAuto"?"Votes en cours...":speaker?speaker+" parle...":"..."}</p></div>
              )}
              {phase==="gameOver"&&(
                <div className="text-center py-2"><button onClick={()=>window.location.reload()} className="px-6 py-2.5 rounded-xl font-display text-sm tracking-widest hover:scale-105 transition-all shadow-lg" style={{background:"linear-gradient(135deg,#d4a843,#b8892e)",color:"#1a0f2e"}}>REJOUER</button></div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
