(()=>{'use strict';
const root=document.getElementById('ov');
const dirs=[[0,-1],[1,0],[0,1],[-1,0]],glyph=['↑','→','↓','←'];
let game=null;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function panel(html){root.innerHTML='<div class="card duel-card">'+html+'</div>';root.hidden=false}
function path(a,n){const out=[];let x=a.x+dirs[a.d][0],y=a.y+dirs[a.d][1];while(x>=0&&y>=0&&x<n&&y<n){out.push(x+','+y);x+=dirs[a.d][0];y+=dirs[a.d][1]}return out}
function blocked(a){const p=path(a,5);return p.some(k=>game.arrows.some(q=>!q.gone&&q!==a&&q.x+','+q.y===k)||game.walls.has(k))}
function makeBoard(){
 const arrows=[],occupied=new Set(),rand=()=>Math.random();
 for(let i=0;i<13;i++){
  let choices=[];
  for(let y=0;y<5;y++)for(let x=0;x<5;x++)if(!occupied.has(x+','+y))for(let d=0;d<4;d++){const a={x,y,d,gone:false};if(!path(a,5).some(k=>occupied.has(k)))choices.push(a)}
  if(!choices.length)break;
  const a=choices[Math.floor(rand()*choices.length)];arrows.push(a);occupied.add(a.x+','+a.y);
 }
 const first=arrows.find(a=>!arrows.some(b=>b!==a&&path(a,5).some(k=>k===b.x+','+b.y)));
 const safePath=new Set(first?path(first,5):[]);
 const candidates=[];
 for(let y=0;y<5;y++)for(let x=0;x<5;x++){const k=x+','+y;if(!occupied.has(k)&&!safePath.has(k)&&arrows.some(a=>path(a,5).includes(k)))candidates.push(k)}
 const walls=new Set();while(walls.size<Math.min(2,candidates.length)){walls.add(candidates.splice(Math.floor(rand()*candidates.length),1)[0])}
 return{arrows,walls};
}
function begin(){game={players:[{name:'Player 1',lives:3,skills:{drill:1,scout:1,shield:1},shield:false},{name:'Player 2',lives:3,skills:{drill:1,scout:1,shield:1},shield:false}],turn:0,arrows:[],walls:new Set(),drilling:false,scout:null,score:[0,0]};const b=makeBoard();game.arrows=b.arrows;game.walls=b.walls;draw()}
function draw(){
 const p=game.players[game.turn],remaining=game.arrows.filter(a=>!a.gone).length;
 let cells='';
 for(let y=0;y<5;y++)for(let x=0;x<5;x++){
  const k=x+','+y,a=game.arrows.find(q=>!q.gone&&q.x===x&&q.y===y);
  if(a)cells+='<button class="duel-cell arrow '+(game.scout===a?'scouted':'')+'" data-arrow="'+game.arrows.indexOf(a)+'" aria-label="Arrow '+glyph[a.d]+'">'+glyph[a.d]+'</button>';
  else if(game.walls.has(k))cells+='<button class="duel-cell wall '+(game.drilling?'target':'')+'" data-wall="'+k+'" aria-label="Stone wall">▦</button>';
  else cells+='<div class="duel-cell empty"></div>';
 }
 panel('<div class="duel-top"><span class="pill">LOCAL 1 VS 1</span><span class="pill">'+remaining+' arrows left</span></div><h2>⚔️ Duel arena</h2><div class="duel-players">'+game.players.map((q,i)=>'<div class="duel-player '+(i===game.turn?'active':'')+'"><b>'+esc(q.name)+'</b><strong>'+'♥'.repeat(q.lives)+'♡'.repeat(3-q.lives)+'</strong><small>'+game.score[i]+' escapes</small></div>').join('')+'</div><p class="duel-turn"> '+esc(p.name)+'’s turn — clear one arrow or use a technique</p><div class="duel-board">'+cells+'</div><div class="duel-skills"><button class="btn alt" id="drill" '+(!p.skills.drill?'disabled':'')+'>🧨 Drill wall ('+p.skills.drill+')</button><button class="btn alt" id="scout" '+(!p.skills.scout?'disabled':'')+'>👁 Scout ('+p.skills.scout+')</button><button class="btn alt" id="shield" '+(!p.skills.shield?'disabled':'')+'>🛡 Shield ('+p.skills.shield+')</button></div><p class="duel-help">'+(game.drilling?'Tap a stone wall to destroy it.':'Stone walls block arrows. Drill removes one wall; Scout reveals a safe arrow; Shield protects against one mistake.')+'</p><button class="btn alt" id="duel-exit">Exit duel</button>');
 root.querySelectorAll('[data-arrow]').forEach(b=>b.onclick=()=>tap(+b.dataset.arrow));
 root.querySelectorAll('[data-wall]').forEach(b=>b.onclick=()=>removeWall(b.dataset.wall));
 document.getElementById('drill').onclick=()=>{game.drilling=true;game.scout=null;draw()};
 document.getElementById('scout').onclick=()=>{if(!p.skills.scout)return;p.skills.scout--;game.drilling=false;game.scout=game.arrows.find(a=>!a.gone&&!blocked(a))||null;draw()};
 document.getElementById('shield').onclick=()=>{if(!p.skills.shield)return;p.skills.shield--;p.shield=true;draw()};
 document.getElementById('duel-exit').onclick=menu;
}
function nextTurn(){game.turn=1-game.turn;game.drilling=false;game.scout=null;draw()}
function removeWall(k){if(!game.drilling)return;const p=game.players[game.turn];if(!p.skills.drill)return;game.walls.delete(k);p.skills.drill--;game.drilling=false;draw()}
function tap(i){const a=game.arrows[i],p=game.players[game.turn];if(!a||a.gone)return;if(blocked(a)){if(p.shield)p.shield=false;else p.lives--;if(p.lives<=0)return finish(1-game.turn,'knocked out');nextTurn();return}a.gone=true;game.score[game.turn]++;if(game.arrows.every(q=>q.gone))return finish(game.score[0]===game.score[1]?-1:game.score[0]>game.score[1]?0:1,'board cleared');nextTurn()}
function finish(winner,reason){const result=winner<0?'It’s a draw!':game.players[winner].name+' wins!';panel('<span class="pill">DUEL COMPLETE</span><h2>🏆 '+result+'</h2><p>'+reason==='knocked out'?'The other player used all three lives.':'All arrows were cleared.'+'</p><div class="duel-players">'+game.players.map((p,i)=>'<div class="duel-player"><b>'+esc(p.name)+'</b><strong>'+p.score+' escapes</strong></div>').join('')+'</div><button class="btn" id="duel-again">Play rematch</button><button class="btn alt" id="duel-home">Back to More</button>');document.getElementById('duel-again').onclick=begin;document.getElementById('duel-home').onclick=menu}
function menu(){panel('<h2>⚔️ 1 vs 1 Duel</h2><p>Challenge a friend on the same phone. Take turns, survive the obstacles and use your techniques wisely.</p><div class="duel-players"><div class="duel-player"><b>Player 1</b><small>First move</small></div><div class="duel-player"><b>Player 2</b><small>Second move</small></div></div><p><b>New arena obstacles</b><br>Stone walls block arrow paths and must be drilled away.</p><p><b>Escape techniques</b><br>Drill: destroy one wall.<br>Scout: reveal a safe arrow.<br>Shield: protect yourself from one blocked move.</p><button class="btn" id="duel-start">Start duel</button><p style="font-size:11px">Local pass-and-play only. Online matchmaking, friend invites and worldwide PvP are not connected yet.</p><button class="btn alt" id="duel-back">Back</button>');document.getElementById('duel-start').onclick=begin;document.getElementById('duel-back').onclick=()=>window.ArrowEscapeExtras.open()}
window.ArrowEscapeDuel={open:menu};
})();