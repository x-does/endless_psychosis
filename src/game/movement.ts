import type { ActiveAction } from './content';
export type Move = 'jump'|'crouch'|'back'|'forward'|'hold';
export const MOVE_ORDER: Move[]=['jump','crouch','back','forward','hold'];
export const MOVE_INFO: Record<Move,{title:string;text:string}>={
 jump:{title:'Jump',text:'Tap Jump or Space to leave the ground.'},
 crouch:{title:'Get low',text:'Hold Crouch or ↓ to pass below a high branch. Release to stand.'},
 back:{title:'Make room',text:'Tap Back or ← to dash backward. You stay at the new position. This does not block damage.'},
 forward:{title:'Take space',text:'Tap Forward or → to dash forward. Both directions share a 1.6s cooldown. Jumping still works during a dash.'},
 hold:{title:'A second way to use your skill',text:'Tap and release Skill for its normal effect. Hold for 450ms, then release for the alternate shown on the button. Cancel or move focus away to do neither.'},
};
export function normalizeMoves(value:unknown):Move[]{return MOVE_ORDER.filter((id,i)=>i===0||(Array.isArray(value)&&value.includes(id)));}
export function nextMove(moves:Move[],distance:number,evolved:boolean):Move|null{
 const next=MOVE_ORDER.find(id=>!moves.includes(id));
 if(next==='crouch'&&distance>=40)return next;
 if(next==='back'&&distance>=100)return next;
 if(next==='forward'&&distance>=180)return next;
 if(next==='hold'&&evolved)return next;
 return null;
}
export const HOLD_ALTERNATES:Record<ActiveAction,{label:string;action:ActiveAction;power:number;duration:number}>={
 heal:{label:'+30 focus',action:'focus',power:30,duration:0},focus:{label:'+12 HP',action:'heal',power:12,duration:0},
 shield:{label:'Clear hostile shots',action:'purge',power:0,duration:0},slow:{label:'3s shield',action:'shield',power:0,duration:3},
 clear:{label:'+30 focus',action:'focus',power:30,duration:0},purge:{label:'3s threat slow',action:'slow',power:.7,duration:3},
 dash:{label:'Clear hostile shots',action:'purge',power:0,duration:0},rain:{label:'+12 HP',action:'heal',power:12,duration:0},
};
export class SkillPress {
 private started:number|null=null;
 begin(time:number){if(this.started!==null)return false;this.started=time;return true;}
 armed(time:number,unlocked:boolean){return unlocked&&this.started!==null&&time-this.started>=450;}
 release(time:number,unlocked:boolean):'tap'|'hold'|null{if(this.started===null)return null;const mode=this.armed(time,unlocked)?'hold':'tap';this.started=null;return mode;}
 cancel(){this.started=null;}
}
export class PositionDash {
 remaining=0;cooldown=0;private velocity=0;
 start(direction:-1|1,x:number,width:number,scale:number,playerWidth=0){
  if(this.cooldown>0||this.remaining>0)return false;
  const target=Math.max(width*.12+playerWidth/2,Math.min(width*.48-playerWidth/2,x+direction*65*scale));
  if(Math.abs(target-x)<8*scale)return false;
  this.remaining=.18;this.cooldown=1.6;this.velocity=(target-x)/.18;return true;
 }
 tick(dt:number,x:number,width:number,playerWidth=0){const step=Math.min(dt,this.remaining);this.remaining=Math.max(0,this.remaining-dt);this.cooldown=Math.max(0,this.cooldown-dt);return Math.max(width*.12+playerWidth/2,Math.min(width*.48-playerWidth/2,x+this.velocity*step));}
}
