import { test } from "node:test";
import assert from "node:assert/strict";
import { SatireState } from "../src/game/satire.ts";

test("serious opening is guaranteed; escalation only happens at checkpoints",()=>{
  const s=new SatireState(); s.add(100,100,100);
  assert.equal(s.checkpoint().stage,0);
  s.tick(45); assert.equal(s.stage,0); assert.equal(s.checkpoint().stage,1);
  s.tick(75); assert.equal(s.checkpoint().stage,2);
  s.tick(500); assert.equal(s.checkpoint().stage,2);
});
test("all abstinent encounters offer water and leave",()=>{
  const s=new SatireState();
  for(let i=0;i<3;i++){s.tick(45);const offer=s.checkpoint();assert.ok(offer.items.includes('water'));assert.equal(s.choose(null),true);}
  assert.equal(s.history.length,0);assert.equal(s.stage,0);
});
test("speed ramps smoothly, caps and returns during explicit aftermath",()=>{
  const s=new SatireState();s.checkpoint();assert.equal(s.choose('express'),true);
  s.tick(.375);assert.ok(Math.abs(s.speed-1.075)<.001);
  s.tick(.375);assert.equal(s.speed,1.15);
  s.tick(4.25);assert.equal(s.aftermath,true);assert.equal(s.speed,1);
  assert.equal(s.choose('water'),false);
  s.tick(7);assert.equal(s.effect,null);
});
test("steady-speed accessibility keeps the boost but removes acceleration",()=>{
  const s=new SatireState();s.checkpoint();s.choose('express');s.tick(1,true);
  assert.equal(s.speed,1);assert.equal(s.boosting,true);
});
test("invalid selection cannot close encounter or replace debt",()=>{
  const s=new SatireState();s.checkpoint();assert.equal(s.choose('orders'),false);
  assert.ok(s.offered);s.choose('subscription');assert.equal(s.effect,'subscription');
  s.tick(3);assert.equal(s.effect,null);assert.deepEqual(s.history,['subscription']);
});
test("revelation slows threats only during benefit, then charges pulse debt",()=>{
  const s=new SatireState();s.encounter=2;s.checkpoint();s.choose('revelation');
  assert.equal(s.projectileFactor,.7);assert.equal(s.pulseCost,18);
  s.tick(5);assert.equal(s.projectileFactor,1);assert.equal(s.pulseCost,27);
  s.tick(7);assert.equal(s.pulseCost,18);assert.equal(s.effect,null);
});
test("certificate ends after three fired pulses or six seconds",()=>{
  const s=new SatireState();s.encounter=2;s.checkpoint();s.choose('certificate');
  assert.equal(s.charges,3);assert.equal(s.pulsePower,2);assert.equal(s.pulseCost,27);
  s.firedPulse();s.firedPulse();assert.equal(s.charges,1);
  s.firedPulse();assert.equal(s.effect,null);assert.equal(s.pulsePower,1);
  s.checkpoint();s.choose(null);s.encounter=2;s.checkpoint();s.choose('certificate');
  s.tick(6);assert.equal(s.effect,null);assert.equal(s.charges,0);
});
test("third encounter offers both revelation routes with ordinary alternative",()=>{
  for(const weights of [[80,0,0],[0,80,0],[0,0,80]]){
    const s=new SatireState();s.tick(120);s.add(...weights as [number,number,number]);s.encounter=2;
    const offer=s.checkpoint();assert.deepEqual(offer.items,['revelation','certificate','water']);
    assert.ok(offer.story.length>100);
  }
});
