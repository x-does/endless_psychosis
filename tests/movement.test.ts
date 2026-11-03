import {test} from 'node:test';import assert from 'node:assert/strict';
import {nextMove,normalizeMoves,PositionDash,SkillPress,HOLD_ALTERNATES} from '../src/game/movement.ts';
test('movement discovery is ordered and old saves start with Jump',()=>{
 assert.deepEqual(normalizeMoves(undefined),['jump']);assert.equal(nextMove(['jump'],39,false),null);
 assert.equal(nextMove(['jump'],200,false),'crouch');assert.equal(nextMove(['jump','crouch'],200,false),'back');
 assert.equal(nextMove(['jump','crouch','back'],200,false),'forward');
 assert.equal(nextMove(['jump','crouch','back','forward'],200,false),null);
 assert.equal(nextMove(['jump','crouch','back','forward'],200,true),'hold');
});
test('dash advances over time, stays bounded, shares cooldown and rejects tiny travel',()=>{
 const d=new PositionDash();assert.ok(d.start(1,80,320,1));assert.equal(d.tick(.09,80,320),112.5);
 assert.equal(d.start(-1,112.5,320,1),false);assert.equal(d.tick(.09,112.5,320),145);
 d.tick(2,145,320);assert.ok(d.start(1,145,320,1));assert.equal(d.tick(.18,145,320),153.6);
 d.tick(2,153.6,320);assert.equal(d.start(1,153.6,320,1),false);assert.equal(d.cooldown,0);
});
test('skill tap/hold fires once only on release and cancellation fires neither',()=>{
 const p=new SkillPress();p.begin(0);assert.equal(p.release(449,true),'tap');assert.equal(p.release(800,true),null);
 p.begin(0);assert.equal(p.armed(450,true),true);assert.equal(p.release(450,true),'hold');
 p.begin(0);assert.equal(p.release(900,false),'tap');p.begin(0);p.cancel();assert.equal(p.release(900,true),null);
});
test('each active action has a defined bounded alternate',()=>{
 assert.equal(Object.keys(HOLD_ALTERNATES).length,8);assert.equal(HOLD_ALTERNATES.heal.power,30);assert.equal(HOLD_ALTERNATES.purge.duration,3);
});
test('dash bounds include full player width',()=>{
 const d=new PositionDash();d.start(-1,80,320,1,32);const left=d.tick(.18,80,320,32);
 assert.ok(left-16>=320*.12);d.tick(2,left,320,32);d.start(1,left,320,1,32);
 const right=d.tick(.18,left,320,32);assert.ok(right+16<=320*.48);
});
