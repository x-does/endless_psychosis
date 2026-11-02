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
