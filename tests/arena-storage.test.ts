import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARENA_KEY, readRecords, writeRecords } from '../src/rebirth/storage';
test('arena storage validates corrupt data, writes only its own namespace, and survives unavailable storage',()=>{
 const data=new Map([['endless.save.v1','production'],['endless.dev.save.v1','staging'],['endless.cloud.code','secret']]);
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>data.set(key,value)}});
 try {
  for(const invalid of ['null','[1,2]','broken','{"runs":-4,"best":"bad","wins":null,"sound":"yes"}']){data.set(ARENA_KEY,invalid);const r=readRecords();assert.equal(r.runs,0);assert.equal(r.best,0);assert.equal(r.wins,0);assert.equal(r.sound,false);}
  const expected={runs:4,wins:1,best:1200,reduced:true,sound:true};assert.equal(writeRecords(expected),true);assert.deepEqual(readRecords(),expected);assert.equal(data.get('endless.save.v1'),'production');assert.equal(data.get('endless.dev.save.v1'),'staging');assert.equal(data.get('endless.cloud.code'),'secret');
  Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw new Error('blocked');}});assert.equal(readRecords().runs,0);assert.equal(writeRecords(expected),false);
 } finally {delete (globalThis as any).localStorage;}
});
