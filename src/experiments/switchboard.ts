export const DESTINATIONS = ["Moon", "Key", "Wave", "Star"] as const;
export type Destination = typeof DESTINATIONS[number];
export type Caller = { id:number; destination:Destination; arrived:number; patience:number; duration:number; value:number; slot:number };
export type Connection = { caller:Caller; ends:number };
export type SwitchState = { time:number; next:number; waiting:Caller[]; active:Connection[]; completed:number; score:number; missed:number; finished:boolean };
export function newShift():SwitchState { return {time:0,next:0,waiting:[],active:[],completed:0,score:0,missed:0,finished:false}; }
export function arrivalTime(id:number) { return id<3 ? 2+id*6 : 20+(id-3)*3.4; }
export function advanceShift(previous:SwitchState, seconds:number):SwitchState {
  if(previous.finished || seconds<=0) return previous;
  const s:SwitchState={...previous,waiting:[...previous.waiting],active:[...previous.active]};
  const target=Math.min(120,s.time+seconds);
  // Resolve events chronologically, so frame rate cannot change outcomes.
  while(s.time<target) {
    const arrival=arrivalTime(s.next);
    const event=Math.min(target,...s.active.map(c=>c.ends),...s.waiting.map(c=>c.arrived+c.patience),arrival<=104?arrival:Infinity);
    s.time=event;
    const done=s.active.filter(c=>c.ends<=event);
    s.completed+=done.length; s.score+=done.reduce((sum,c)=>sum+c.caller.value,0);
    s.active=s.active.filter(c=>c.ends>event);
    s.missed+=s.waiting.filter(c=>c.arrived+c.patience<=event).length;
    s.waiting=s.waiting.filter(c=>c.arrived+c.patience>event);
    if(arrival<=event && arrival<=104) {
      const id=s.next++; const kind=id%3;
      const slot=[0,1,2,3,4,5].find(i=>!s.waiting.some(c=>c.slot===i));
      if(slot===undefined) s.missed++;
      else s.waiting.push({id,destination:DESTINATIONS[(id*3+Math.floor(id/4))%4],arrived:arrival,patience:[16,22,10][kind],duration:[4,10,7][kind],value:[1,3,2][kind],slot});
    }
  }
  if(s.time>=120) {s.finished=true;s.missed+=s.waiting.length+s.active.length;s.waiting=[];s.active=[];}
  return s;
}
export function connectCaller(s:SwitchState,id:number,destination:Destination):SwitchState {
  const caller=s.waiting.find(c=>c.id===id);
  if(s.finished || !caller || caller.destination!==destination || s.active.length>=3) return s;
  return {...s,waiting:s.waiting.filter(c=>c.id!==id),active:[...s.active,{caller,ends:s.time+caller.duration}]};
}
