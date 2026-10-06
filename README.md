<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Arrow Escape</title>
<style>
:root{--bg:#e6eee8;--ink:#14262b;--card:#fbfdf9;--ac:#14262b;--teal:#0f8b8d;--warn:#e4572e;--gold:#f2b134}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{height:100%;margin:0}
body{background:var(--bg);color:var(--ink);font-family:ui-rounded,"Trebuchet MS",system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;padding:env(safe-area-inset-top,0) 12px env(safe-area-inset-bottom,0)}
header{width:100%;max-width:560px;display:flex;justify-content:space-between;align-items:center;padding:14px 4px;font-weight:700;font-size:18px}
header span{display:flex;gap:6px;align-items:center}
button{font:inherit;cursor:pointer}
.btn{background:var(--ink);color:#fff;border:0;border-radius:14px;padding:13px 18px;font-weight:700;font-size:16px}
.btn.alt{background:#fff;color:var(--ink);border:2px solid var(--ink)}
.btn.gold{background:var(--gold);color:var(--ink)}
.btn:disabled{opacity:.4}
#board{position:relative;width:min(94vw,560px,calc(100vh - 170px));aspect-ratio:1;background:var(--card);border-radius:18px;border:2px solid var(--ink);background-image:radial-gradient(circle,#b9c6bd 1.5px,transparent 2px);background-size:calc(100%/var(--n)) calc(100%/var(--n));overflow:hidden;touch-action:manipulation}
.a{position:absolute;border:0;background:none;padding:6%;color:var(--ac);transition:transform .35s cubic-bezier(.5,0,.9,.5),opacity .35s}
.a svg{width:100%;height:100%;display:block}
.a.out{opacity:0}
.a.bump{animation:bump .3s}
.a.hint{animation:pulse .5s 3;color:var(--teal)}
@keyframes bump{25%{translate:-6px 0;color:var(--warn)}75%{translate:6px 0;color:var(--warn)}}
@keyframes pulse{50%{scale:1.3}}
footer{display:flex;gap:10px;margin-top:16px}
#ov{position:fixed;inset:0;background:rgba(20,38,43,.55);display:flex;align-items:center;justify-content:center;padding:20px}
#ov[hidden]{display:none}
.card{background:var(--card);border-radius:20px;border:2px solid var(--ink);padding:22px;width:100%;max-width:380px;display:flex;flex-direction:column;gap:10px;max-height:88vh;overflow:auto}
.card h2{margin:0 0 4px;font-size:24px}
.card p{margin:0;line-height:1.4}
.row{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #d5ded7}
.sw{width:26px;height:26px;border-radius:8px;display:inline-block;vertical-align:middle;margin-right:8px}
button:focus-visible{outline:3px solid var(--teal);outline-offset:2px}
@media (prefers-reduced-motion:reduce){.a,.a.bump,.a.hint{animation:none;transition:none}}
</style>
</head>
<body>
<header>
  <button class="btn alt" id="menu" style="padding:8px 14px">Menu</button>
  <span id="lvl"></span>
  <span><b id="lives"></b><b id="coins"></b></span>
</header>
<div id="board" style="--n:4"></div>
<footer>
  <button class="btn" id="hint">Hint</button>
  <button class="btn alt" id="restart">Restart</button>
</footer>
<div id="ov" hidden></div>

<script>
const $=s=>document.querySelector(s);
const DIR=[[0,-1],[1,0],[0,1],[-1,0]]; // up, right, down, left
const SKINS=[{n:'Ink',c:'#14262b',p:0},{n:'Lagoon',c:'#0f8b8d',p:100},{n:'Mango',c:'#f2a000',p:200},{n:'Berry',c:'#9b2c6a',p:300},{n:'Cobalt',c:'#2748d8',p:400}];
const HINT_PRICE=30;
/* ===== ADS: fill in your AdSense publisher ID to turn on real ads =====
   client: 'ca-pub-XXXXXXXXXXXXXXXX'  (leave '' to use the demo ad timer)
   test:   true shows Google test ads; set false when you go live
   every:  show a full-screen ad after every Nth level cleared */
const ADS={client:'',test:true,every:3};
let wins=0;
if(ADS.client){
  window.adsbygoogle=window.adsbygoogle||[];
  window.adBreak=window.adConfig=o=>window.adsbygoogle.push(o);
  const sc=document.createElement('script');
  sc.async=true;sc.crossOrigin='anonymous';
  sc.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='+ADS.client;
  if(ADS.test)sc.dataset.adbreakTest='on';
  document.head.appendChild(sc);
  window.adConfig({preloadAdBreaks:'on',sound:'on'});
}
let S=Object.assign({lvl:1,coins:0,hints:2,skin:0,own:[0],daily:{}},JSON.parse(localStorage.getItem('arrowEscape')||'{}'));
const save=()=>localStorage.setItem('arrowEscape',JSON.stringify(S));
const today=()=>new Date().toISOString().slice(0,10);
const hash=s=>[...s].reduce((h,c)=>(h*31+c.charCodeAt(0))|0,7);

function rng(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

/* Level generator: arrows are placed in their REMOVAL order.
   A new arrow may never sit on the path of an earlier arrow, so the
   placement order is always a valid solution -> every level is solvable. */
function gen(seed,lvl){
  const R=rng(seed),prog=lvl/1000;
  /* Difficulty curve: levels 1-2 easy, 3-6 a step harder, then grid size, arrow density
     and blocking chains keep growing until level 1000. */
  const n=lvl<=2?4:lvl<=6?5:Math.min(15,5+Math.floor(Math.sqrt(lvl)/3));
  const fill=lvl<=2?.3:lvl<=6?.4+.04*(lvl-3):.5+.3*Math.sqrt(prog);
  const chain=lvl<=2?.4:Math.min(.97,.6+lvl/300);
  const target=Math.round(n*n*fill);
  /* Built in REVERSE removal order: each new arrow needs a clear path to the edge
     (nothing placed so far on it), so the reverse of placement order is always a solution.
     New arrows are dropped onto cells that older arrows must travel through = blocking chains. */
  const occ=new Set(),pc=new Map(),arrows=[];
  const pathOf=(x,y,d)=>{const p=[];let cx=x+DIR[d][0],cy=y+DIR[d][1];while(cx>=0&&cy>=0&&cx<n&&cy<n){p.push(cx+','+cy);cx+=DIR[d][0];cy+=DIR[d][1]}return p};
  for(let i=0;i<60000&&arrows.length<target;i++){
    let best=null;
    for(let t=0;t<(R()<chain?8:1);t++){
      const x=Math.floor(R()*n),y=Math.floor(R()*n),k=x+','+y;
      if(occ.has(k))continue;
      const opts=[0,1,2,3].map(d=>({d,path:pathOf(x,y,d)})).filter(o=>!o.path.some(c=>occ.has(c)));
      if(!opts.length)continue;
      const score=pc.get(k)||0;
      if(!best||score>best.score)best={x,y,k,score,opts};
    }
    if(!best)continue;
    const o=R()<chain?best.opts.reduce((m,q)=>q.path.length>m.path.length?q:m):best.opts[Math.floor(R()*best.opts.length)];
    arrows.push({x:best.x,y:best.y,d:o.d,path:o.path});occ.add(best.k);
    o.path.forEach(c=>pc.set(c,(pc.get(c)||0)+1));
  }
  return{n,arrows};
}

let G,mode,lives,t0,live,over,finale;
const $ov=$('#ov');
function show(html){$ov.innerHTML='<div class="card">'+html+'</div>';$ov.hidden=false}
function hide(){$ov.hidden=true}
function hud(){
  $('#lvl').textContent=mode==='daily'?'Daily challenge':'Level '+S.lvl;
  $('#lives').textContent='♥'.repeat(lives)+'♡'.repeat(Math.max(0,3-lives))+' ';
  $('#coins').textContent='● '+S.coins;
  $('#hint').textContent='Hint ('+S.hints+')';
  document.body.style.setProperty('--ac',SKINS[S.skin].c);
}
function start(m){
  mode=m;over=false;
  const lvl=m==='daily'?25:S.lvl, seed=m==='daily'?hash(today()):lvl*7919+13;
  G=gen(seed,lvl);lives=3;t0=Date.now();live=new Map();
  const bd=$('#board');bd.innerHTML='';bd.style.setProperty('--n',G.n);
  G.arrows.forEach(a=>{
    live.set(a.x+','+a.y,a);
    const b=document.createElement('button');b.className='a';
    b.setAttribute('aria-label','Arrow '+['up','right','down','left'][a.d]);
    b.style.cssText=`left:${a.x*100/G.n}%;top:${a.y*100/G.n}%;width:${100/G.n}%;height:${100/G.n}%`;
    b.innerHTML=`<svg viewBox="0 0 24 24" style="transform:rotate(${a.d*90}deg)"><path fill="currentColor" d="M12 2 21 13h-6v9H9v-9H3z"/></svg>`;
    b.onclick=()=>tap(a);a.el=b;bd.appendChild(b);
  });
  hud();hide();
}
function tap(a){
  if(over||a.gone)return;
  if(a.path.some(c=>live.has(c))){
    a.el.classList.remove('bump');void a.el.offsetWidth;a.el.classList.add('bump');
    lives--;hud();
    if(lives<=0){over=true;setTimeout(lose,350)}
    return;
  }
  a.gone=true;live.delete(a.x+','+a.y);
  const [dx,dy]=DIR[a.d],n=G.n;
  const dist=a.d===0?a.y+1:a.d===2?n-a.y:a.d===3?a.x+1:n-a.x;
  a.el.classList.add('out');
  a.el.style.transform=`translate(${dx*dist*100}%,${dy*dist*100}%)`;
  setTimeout(()=>a.el.remove(),400);
  if(!live.size){over=true;setTimeout(win,450)}
}
function win(){
  finale=false;const secs=Math.round((Date.now()-t0)/1000);let gain=10+G.n,msg;
  if(mode==='daily'){
    const first=!(today() in S.daily);gain=first?gain*2:0;
    if(first||secs<S.daily[today()])S.daily[today()]=secs;
    msg=`Daily cleared in ${secs}s.`+(first?'':' Coins are paid once per day.');
  }else{finale=S.lvl>=1000;S.lvl=Math.min(1000,S.lvl+1);msg=finale?'You cleared all 1,000 levels!':`Cleared in ${secs}s.`}
  S.coins+=gain;save();hud();
  show(`<h2>${finale?'All levels cleared':'Path clear'}</h2><p>${msg} +${gain} coins.</p>
  ${gain>0?`<button class="btn gold" onclick="dbl(${gain})">Watch ad: double coins (+${gain})</button>`:''}
  <button class="btn" onclick="nextLevel()">${mode==='daily'?'Back to levels':'Next level'}</button><button class="btn alt" onclick="menu()">Menu</button>`);
}
function lose(){
  show(`<h2>Out of lives</h2><p>Every blocked tap costs a life. Look for arrows whose path to the edge is empty.</p>
  <button class="btn gold" onclick="ad(()=>{lives=1;over=false;hud();hide()})">Watch ad: continue with 1 life</button>
  <button class="btn" onclick="start('${mode}')">Retry</button><button class="btn alt" onclick="menu()">Menu</button>`);
}
function useHint(){
  if(over)return;
  if(S.hints<1){
    show(`<h2>No hints left</h2><p>A hint highlights an arrow you can safely tap.</p>
    <button class="btn gold" onclick="ad(()=>{S.hints++;save();hud();hide()})">Watch ad: get 1 hint</button>
    <button class="btn" ${S.coins<HINT_PRICE?'disabled':''} onclick="S.coins-=${HINT_PRICE};S.hints++;save();hud();hide()">Buy for ${HINT_PRICE} coins</button>
    <button class="btn alt" onclick="hide()">Close</button>`);return;
  }
  const a=G.arrows.find(a=>!a.gone&&!a.path.some(c=>live.has(c)));
  if(a){S.hints--;save();hud();a.el.classList.add('hint');setTimeout(()=>a.el.classList.remove('hint'),1600)}
}
/* Rewarded ad: the player chooses to watch, then cb() runs only if the ad was viewed. */
function ad(cb){
  if(!ADS.client||typeof adBreak!=='function')return demoAd(cb);
  let viewed=false;
  adBreak({type:'reward',name:'reward',
    beforeReward:showAd=>showAd(),
    adViewed:()=>{viewed=true},
    adBreakDone:()=>{
      if(viewed)cb();
      else show('<h2>No reward</h2><p>No ad was available, or it was closed early. Try again in a moment.</p><button class="btn" onclick="menu()">Menu</button>');
    }});
}
/* Full-screen ad between levels (Google decides if one is ready; the game continues either way). */
function nextLevel(){
  wins++;
  if(ADS.client&&typeof adBreak==='function'&&wins%ADS.every===0){
    hide();adBreak({type:'next',name:'next-level',adBreakDone:()=>start('lvl')});
  }else start('lvl');
}
function dbl(g){
  ad(()=>{S.coins+=g;save();hud();show(`<h2>Coins doubled</h2><p>+${g} bonus coins.</p><button class="btn" onclick="nextLevel()">Next level</button>`)});
}
/* Demo ad used when no AdSense ID is set */
function demoAd(cb){
  let s=3;show(`<h2>Ad</h2><p id="adt">Reward in ${s}s (demo ad, replace with a real network)</p>`);
  const t=setInterval(()=>{s--;if(s<=0){clearInterval(t);cb()}else $('#adt').textContent=`Reward in ${s}s (demo ad, replace with a real network)`},1000);
}
function menu(){
  const done=today() in S.daily;
  show(`<h2>Arrow Escape</h2><p>Tap an arrow to slide it off the board. A blocked arrow costs a life.</p>
  <button class="btn" onclick="start('lvl')">Play level ${S.lvl}</button>
  <button class="btn gold" onclick="start('daily')">Daily challenge${done?' (done, beat your time)':''}</button>
  <button class="btn alt" onclick="skins()">Skins</button>
  <button class="btn alt" onclick="board()">Leaderboard</button>
  ${G?'<button class="btn alt" onclick="hide()">Resume</button>':''}`);
}
function skins(){
  show('<h2>Skins</h2>'+SKINS.map((s,i)=>{
    const own=S.own.includes(i);
    return `<div class="row"><span><i class="sw" style="background:${s.c}"></i>${s.n}</span>
    <button class="btn ${S.skin===i?'':'alt'}" style="padding:8px 12px" ${!own&&S.coins<s.p?'disabled':''} onclick="pick(${i})">${S.skin===i?'Equipped':own?'Equip':'● '+s.p}</button></div>`}).join('')+
    '<button class="btn alt" onclick="menu()">Back</button>');
}
function pick(i){
  if(!S.own.includes(i)){S.coins-=SKINS[i].p;S.own.push(i)}
  S.skin=i;save();hud();skins();
}
/* Local leaderboard (this device only). For a global one, send scores to a backend such as Firebase. */
function board(){
  const days=Object.entries(S.daily).sort((a,b)=>a[1]-b[1]).slice(0,7);
  show(`<h2>Leaderboard</h2><div class="row"><span>Highest level</span><b>${S.lvl}</b></div>
  <p><b>Fastest daily clears</b></p>`+(days.length?days.map(([d,t])=>`<div class="row"><span>${d}</span><b>${t}s</b></div>`).join(''):'<p>Finish a daily challenge to set a time.</p>')+
  '<button class="btn alt" onclick="menu()">Back</button>');
}
$('#menu').onclick=menu;
$('#hint').onclick=useHint;
$('#restart').onclick=()=>start(mode);
start('lvl');
</script>
</body>
</html>
