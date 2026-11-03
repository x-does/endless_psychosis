import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BonusState} from '../src/game/bonus.ts';
test('bonus spawns after twenty active seconds and can only be claimed once',()=>{
 const b=new BonusState();b.tick(19,true);assert.equal(b.bat,null);b.tick(1,true);
 const id=b.bat!.id;assert.equal(b.claim(id+1),null);assert.equal(b.claim(id),'xp');assert.equal(b.claim(id),null);
});
test('missed bonuses expire without carrying into bosses',()=>{
 const b=new BonusState();b.tick(20,true);b.tick(5,true);assert.equal(b.bat,null);
 b.tick(15,true);assert.equal(b.bat?.reward,'heal');b.tick(1,false);assert.equal(b.bat,null);
 b.tick(19,true);assert.equal(b.bat,null);b.tick(1,true);assert.ok(b.bat);
});
