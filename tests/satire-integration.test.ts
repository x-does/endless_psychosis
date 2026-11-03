import { test } from "node:test";
import assert from "node:assert/strict";
import { GameEngine } from "../src/game/engine.ts";
import { CopingState } from "../src/game/coping.ts";
import { SatireState } from "../src/game/satire.ts";

test("blocked recovery checkpoint remains pending until satire effect expires",()=>{
  const engine = Object.create(GameEngine.prototype) as any;
  engine.satire=new SatireState(); engine.coping=new CopingState();
  engine.phase='run';engine.chapterIndex=0;engine.levelPaused=false;
  engine.satire.checkpoint();engine.satire.choose('express');
  let offers=0;
  engine.cb={onCopingOffer:()=>offers++};
  engine.sfx={coping:()=>{}};engine.emitSnapshot=()=>{};engine.setPaused=()=>{};
  engine.scenarioShown=engine.offerCoping();
  assert.equal(engine.scenarioShown,false);assert.equal(offers,0);
  engine.satire.tick(12);
  engine.scenarioShown=engine.offerCoping();
  assert.equal(engine.scenarioShown,true);assert.equal(offers,1);
});
test("certificate counts fired pulses, not failed input, and captures projectile damage",()=>{
  const e=Object.create(GameEngine.prototype) as any;
  e.satire=new SatireState();e.satire.encounter=2;e.satire.checkpoint();e.satire.choose('certificate');
  e.coping=new CopingState();e.phase='run';e.paused=false;e.activeCooldown=0;e.focus=0;
  e.cb={onToast:()=>{}};e.pulse();assert.equal(e.satire.charges,3);
  e.focus=100;e.scale=1;e.stats={pulseRadius:0};e.playerRect=()=>({x:0,y:0,w:32,h:54});
  e.waves=[];e.projectiles=[];e.uid=1;e.chapter={accent:'#fff'};e.opts={haptics:false};e.sfx={pulse:()=>{}};
  for(let i=0;i<3;i++){e.activeCooldown=0;e.pulse();}
  assert.equal(e.satire.effect,null);assert.equal(e.focus,19);
  assert.deepEqual(e.projectiles.map((p:any)=>p.damage),[2,2,2]);
  assert.deepEqual(e.waves.map((w:any)=>w.damage),[2,2,2]);
});
