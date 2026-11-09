export const ROUTES = ["NORTH", "VOID", "HOME"] as const;
export const ARCHIVE_LIMIT = 24;
export type Route = typeof ROUTES[number];
export type Packet = { id:number; route:Route; sequence:number; seal:boolean; deadline:number; slot:number; checked?:boolean };
export type Transmission = { packet:Packet; ends:number };
export type FrequencyState = { beat:number; integrity:number; score:number; delivered:number; rejected:number; next:number; packets:Packet[]; channels:Transmission[]; ledger:Record<Route,number>; archive:Packet[]; pending:Packet|null; message:string; ended:boolean };
export type FrequencyAction = {type:"transmit"|"discard"|"challenge";id:number}|{type:"advance"};
export function newReceiver():FrequencyState {
  const s:FrequencyState={beat:0,integrity:4,score:0,delivered:0,rejected:0,next:0,packets:[],channels:[],ledger:{NORTH:0,VOID:0,HOME:0},archive:[],pending:null,message:"The first transmission is original. Read its seal and sequence.",ended:false};
  return arrive(s);
}
export function authentic(s:FrequencyState,p:Packet) { return p.seal && p.sequence>s.ledger[p.route]; }
export function evidence(s:FrequencyState,p:Packet) { return !p.seal?"BROKEN SEAL — one bracket is missing.":p.sequence<=s.ledger[p.route]?`REPLAY — ${p.route} ${p.sequence} was already accepted.`:`ORIGINAL — intact seal; ${p.sequence} is above ledger ${s.ledger[p.route]}.`; }
function createPacket(s:FrequencyState):Packet {
  const id=s.next; const route=ROUTES[Math.floor(id/3)%3];
  if(id%3===2 && s.archive.length) {const old=s.archive[Math.floor(id/3)%s.archive.length];return {...old,id,slot:0,checked:false,deadline:s.beat+6};}
  return {id,route,sequence:Math.floor(id/3)+1,seal:id%3!==1,deadline:s.beat+6,slot:0};
}
function arrive(s:FrequencyState):FrequencyState {
  const packet=s.pending??createPacket(s);const next=s.pending?s.next:s.next+1;const slot=[0,1,2,3].find(i=>!s.packets.some(p=>p.slot===i));
  if(slot===undefined)return {...s,next,pending:packet};
  return {...s,next,pending:null,packets:[...s.packets,{...packet,slot,deadline:s.beat+6}]};
}
export function actReceiver(previous:FrequencyState,action:FrequencyAction):FrequencyState {
  if(previous.ended)return previous;
  let s:FrequencyState={...previous,packets:previous.packets.map(p=>({...p})),channels:[...previous.channels],ledger:{...previous.ledger},archive:[...previous.archive]};
  if(action.type!=="advance") {
    const p=s.packets.find(p=>p.id===action.id);if(!p)return previous;
    const valid=authentic(s,p);
    if(action.type==="challenge") {p.checked=true;s.message=evidence(s,p);}
    else if(action.type==="discard") {
      s.packets=s.packets.filter(x=>x.id!==p.id);
      if(valid){s.integrity--;s.message=`FAULT: discarded an original. ${evidence(s,p)}`;}else{s.score+=5;s.rejected++;s.message=`Echo erased. ${evidence(s,p)}`;}
    } else {
      if(s.channels.length>=2)return {...previous,message:"Both channels occupied. Discard an echo or advance one beat."};
      s.packets=s.packets.filter(x=>x.id!==p.id);
      if(valid){s.ledger[p.route]=p.sequence;s.archive=[...s.archive,p].slice(-ARCHIVE_LIMIT);s.channels.push({packet:p,ends:s.beat+3});s.message="Sequence reserved. The same packet can never be accepted twice.";}
      else{s.integrity--;s.message=`FAULT: transmitted an echo. ${evidence(s,p)}`;}
    }
  } else s.message="One beat passes. The receiver remembers.";
  s.beat++;
  const completed=s.channels.filter(c=>c.ends<=s.beat);s.delivered+=completed.length;s.score+=completed.length*10;
  s.channels=s.channels.filter(c=>c.ends>s.beat);
  for(const p of s.packets.filter(p=>p.deadline<=s.beat))if(authentic(s,p)){s.integrity--;s.message=`FAULT: original ${p.route} ${p.sequence} expired. Its seal was intact and its sequence was new.`;}
  s.packets=s.packets.filter(p=>p.deadline>s.beat);
  s.integrity=Math.max(0,s.integrity);s.ended=s.integrity===0;
  if(!s.ended && (s.pending || s.beat%2===0)) s=arrive(s);
  return s;
}
