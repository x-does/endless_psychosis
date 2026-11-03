import {test} from 'node:test';import assert from 'node:assert/strict';
import {GameEngine} from '../src/game/engine.ts';import {PositionDash} from '../src/game/movement.ts';
function engine(){const e=Object.create(GameEngine.prototype) as any;
 Object.assign(e,{W:320,scale:1,groundY:200,runSpeed:330,phase:'run',paused:false,player:{x:80,y:200,vy:0,onGround:true,sliding:false,runCycle:0,jumpBuffer:0,coyote:.1,w:32},positionDash:new PositionDash(),enemies:[],obstacles:[],projectiles:[],particles:[],chapter:{accent:'#fff'}});
 e.dust=()=>{};return e;}
test('ordinary stationary overlaps do not enter dash sweep',()=>{
 const e=engine();let hits=0;e.hurt=()=>hits++;e.enemies=[{dead:false,x:70,y:150,w:30,h:50}];e.updatePlayer(.01);assert.equal(hits,0);
});
test('dash catches hostile shots between endpoints but preserves friendly shots',()=>{
 const e=engine();let damage=0;e.hurt=(n:number)=>damage+=n;e.positionDash.start(1,80,320,1,32);
 e.projectiles=[{kind:'aimed',x:110,y:170,r:3,damage:17},{kind:'calm',x:115,y:170,r:3,damage:2}];
 e.updatePlayer(.18);assert.equal(damage,17);assert.equal(e.projectiles[0].x,-9999);assert.equal(e.projectiles[1].x,115);
});
test('dash enemy contact preserves damage and settlement consequences',()=>{
 const e=engine();let damage=0,settled=0;e.hurt=(n:number)=>damage=n;e.damageEnemy=(enemy:any)=>{settled++;enemy.dead=true;};
 e.enemies=[{dead:false,x:105,y:150,w:10,h:50}];e.positionDash.start(1,80,320,1,32);e.updatePlayer(.18);
 assert.equal(damage,24);assert.equal(settled,1);
});
