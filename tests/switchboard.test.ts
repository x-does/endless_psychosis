import { test } from "node:test";
import assert from "node:assert/strict";
import { advanceShift, connectCaller, newShift } from "../src/experiments/switchboard";
test("shift events do not depend on frame size",()=>{let fine=newShift();for(let i=0;i<2401;i++)fine=advanceShift(fine,.05);const coarse=advanceShift(newShift(),120);assert.equal(fine.missed,coarse.missed);assert.equal(fine.next,coarse.next);assert.equal(coarse.finished,true);});
test("a connection consumes one cord and completes exactly once",()=>{const s=advanceShift(newShift(),2);const c=s.waiting[0];const connected=connectCaller(s,c.id,c.destination);assert.equal(connected.active.length,1);assert.equal(connectCaller(connected,c.id,c.destination),connected);const done=advanceShift(connected,c.duration);assert.equal(done.completed,1);assert.equal(done.score,c.value);assert.equal(advanceShift(done,1).completed,1);});
test("wrong destinations do not consume callers or cords",()=>{const s=advanceShift(newShift(),2);assert.equal(connectCaller(s,s.waiting[0].id,"Key"),s);});
test("long foreground frames preserve elapsed time and resolve a completed call",()=>{let s=advanceShift(newShift(),2);s=connectCaller(s,s.waiting[0].id,s.waiting[0].destination);s=advanceShift(s,8);assert.equal(s.time,10);assert.equal(s.completed,1);assert.equal(s.waiting.length,1);});
