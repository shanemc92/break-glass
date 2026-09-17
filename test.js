const fs=require('fs');
const src=['data_core','data_injects','data_scen1','data_scen2','data_scen3','data_scen4','data_scen5','data_scen6','engine'].map(f=>fs.readFileSync('src/'+f+'.js','utf8')).join('\n');
const T=new Function(src+`
;return {SCEN,SCEN_INJ,TECH,CONTROLS,newRun,choose,cont,answerQuiz,getNode,sub,SHARED,PREP_SET,PIR_SET,KC,leaks,qwords};`)();
const {SCEN,SCEN_INJ,TECH,CONTROLS,newRun,choose,cont,answerQuiz,getNode,sub,SHARED,PREP_SET,PIR_SET,leaks}=T;
let quizN=0, quizKc=0;
const ORGS=new Function(src+';return ORGS;')();
let errs=[];
const allNodes=[];
SCEN.forEach(s=>{ s.nodes.forEach(n=>allNodes.push([s.id,n])); allNodes.push([s.id,s.esc]); allNodes.push([s.id,s.ll]);
  s.pre.forEach(p=>{ if(p.att && !TECH[p.att]) errs.push('pre tech '+p.att); });
  s.nodes.forEach(n=>{ if(n.if && !s.nodes.some(m=>m.opts.some(o=>o.set===n.if))) errs.push('flag never set '+n.if); });
});
SCEN.forEach(s=>(s.orgs||[]).forEach(o=>{ if(!ORGS.some(x=>x[0]===o)) errs.push('unknown org '+o+' in '+s.id); }));
if(new Set(SCEN.map(s=>s.id)).size!==SCEN.length) errs.push('duplicate scenario id');
Object.keys(SCEN_INJ).forEach(k=>{ if(!SCEN.some(s=>s.id===k)) errs.push('SCEN_INJ key not a scenario: '+k); });
SCEN.forEach(s=>{ if(!SCEN_INJ[s.id]||!SCEN_INJ[s.id].length) errs.push('no injects for '+s.id); });
{ const ids=Object.values(SCEN_INJ).flat().map(n=>n.id); if(new Set(ids).size!==ids.length) errs.push('duplicate inject id'); }
Object.values(SCEN_INJ).flat().forEach(n=>allNodes.push(['inj',n])); [...PREP_SET, ...PIR_SET, SHARED.FAIL].forEach(n=>allNodes.push(['shared',n]));
const tokens=new Set();
allNodes.forEach(([s,n])=>{
  (n.att||[]).forEach(t=>{ if(!TECH[t]) errs.push(s+' '+n.id+' tech '+t); });
  if(n.att&&n.att.length&&!n.obs) errs.push(s+' '+n.id+' no obs');
  n.opts.forEach(o=>{ (o.u||[]).forEach(c=>{ if(!CONTROLS[c]) errs.push('ctrl '+c); });
    if(o.q!=null && !o.w) errs.push(s+' '+n.id+' no why');
    if(o.q!=null && n.ph!=='lessons' && !o.r) errs.push(s+' '+n.id+' no r');
    JSON.stringify(o).replace(/\{(\w+)\}/g,(m,k)=>tokens.add(k)); });
  (n.text+n.title+(n.art||'')).replace(/\{(\w+)\}/g,(m,k)=>tokens.add(k));
  const all=JSON.stringify(n);
  if(/[^\x00-\x7F]/.test(all)) errs.push(s+' '+n.id+' non-ascii');
  if(all.includes('\u2014')) errs.push('emdash '+n.id);
});
console.log('tokens',[...tokens].join(','));
// answer-length tell: best option should not reliably be the longest
{ let tot=0,longest=0,ratio=0; allNodes.forEach(([s,n])=>{ const sc=n.opts.filter(o=>o.q!=null); if(sc.length<2) return; tot++;
    const best=sc.reduce((a,o)=>o.q>a.q?o:a); if(best.t.length===Math.max(...sc.map(o=>o.t.length))) longest++;
    ratio+=best.t.length/(sc.filter(o=>o!==best).reduce((a,o)=>a+o.t.length,0)/(sc.length-1)); });
  const pctL=Math.round(100*longest/tot), r=(ratio/tot).toFixed(2);
  console.log('length tell: best longest in',pctL+'% of',tot,'decisions, avg length ratio',r);
  if(pctL>40||r>1.2) errs.push('answer length tell: '+pctL+'% / '+r); }
// simulate
const stats={}; let fails=0, esc=0, injCount=0;
for(let i=0;i<10000;i++){
  const strat=i%5; // 0 random,1 best,2 worst,3 mid,4 mixed
  const r=newRun({scenario: SCEN[Math.floor(i/5)%SCEN.length].id, diff:['easy','real','night'][i%3], seed:'S'+i});
  let steps=0;
  while(r.status==='active'){
    if(++steps>200){errs.push('loop '+r.sid);break;}
    const n=getNode(r,r.node);
    let oi;
    if(n.opts[0].q==null) oi=0;
    else if(strat===1) oi=n.opts.findIndex(o=>o.q===Math.max(...n.opts.map(x=>x.q)));
    else if(strat===2) oi=n.opts.findIndex(o=>o.q===Math.min(...n.opts.map(x=>x.q)));
    else if(strat===3){ const g=n.opts.map((o,j)=>[o,j]).filter(([o])=>o.q>=2); oi=g[Math.floor(Math.random()*g.length)][1]; }
    else if(strat===4){ if(Math.random()<0.6) oi=n.opts.findIndex(o=>o.q===Math.max(...n.opts.map(x=>x.q))); else oi=Math.floor(Math.random()*n.opts.length); }
    else oi=Math.floor(Math.random()*n.opts.length);
    const res=choose(r,oi);
    if(res && res.quiz){ quizN++; if(res.quiz.type==='kc') quizKc++;
      if(res.quiz.type==='att'){ const id=res.quiz.opts[res.quiz.ans].split('  ')[0]; if(leaks(r,n,id)) errs.push('quiz leak '+n.id+' '+id); } }
    if(res){ if(res.quiz) answerQuiz(r,0); cont(r); }
    // check unresolved tokens in displayed text
    if(r.status==='active'){ const nn=getNode(r,r.node); const t=sub(r,nn.text+nn.title+(nn.art||'')+JSON.stringify(nn.opts)); const m=t.match(/\{\w+\}/); if(m) errs.push('unresolved '+m[0]+' '+nn.id); }
  }
  r.log.forEach(l=>{ if(typeof l.ph!=='string') errs.push('bad ph '+l.id); });
  const k=r.sid+'/'+['rand','best','worst','mid','mixed'][strat];
  stats[k]=stats[k]||{n:0,score:0,fail:0,esc:0,inj:0,min:1e9,max:0};
  const st=stats[k]; st.n++; st.score+=r.result.total; st.fail+=r.failed?1:0; st.esc+=r.flags.escalated?1:0; st.inj+=r.injUsed.length; st.min=Math.min(st.min,r.result.total); st.max=Math.max(st.max,r.result.total);
}
Object.entries(stats).sort().forEach(([k,s])=>console.log(k.padEnd(20),'avg',Math.round(s.score/s.n),'min',s.min,'max',s.max,'fail%',Math.round(100*s.fail/s.n),'esc%',Math.round(100*s.esc/s.n),'inj',(s.inj/s.n).toFixed(1)));
console.log('analyst checks generated',quizN,'(',Math.round(100*quizKc/quizN)+'% kill chain )');
// determinism: the analyst-check toggle must not change the dice
for(let i=0;i<200;i++){ const res=[true,false].map(q=>{ const r=newRun({scenario:SCEN[i%SCEN.length].id,seed:'D'+i,quiz:q}); let s=0;
    while(r.status==='active'&&s++<200){ const n=getNode(r,r.node); const oi=(i+s)%n.opts.length; const x=choose(r,oi); if(x){ if(x.quiz) answerQuiz(r,0); cont(r);} }
    return [r.impact,r.heat,r.trust,r.clock,r.log.length,r.injUsed.join()].join('|'); });
  if(res[0]!==res[1]) { errs.push('toggle changes dice seed D'+i); break; } }
console.log([...new Set(errs)].slice(0,40).join('\n')||'NO ERRORS');
