export type SwipeAction='jump'|'crouch'|'back'|'forward';
export class SwipeGesture {
 private start:{id:number;x:number;y:number;time:number}|null=null;
 begin(id:number,x:number,y:number,time:number){if(this.start)return false;this.start={id,x,y,time};return true;}
 cancel(pointerId?:number){if(pointerId===undefined||this.start?.id===pointerId)this.start=null;}
 release(id:number,x:number,y:number,time:number):SwipeAction|null{
  const start=this.start;if(!start||start.id!==id)return null;this.start=null;
  const dx=x-start.x,dy=y-start.y,ax=Math.abs(dx),ay=Math.abs(dy);
  if(time-start.time>700||Math.max(ax,ay)<28||Math.max(ax,ay)<Math.min(ax,ay)*1.25)return null;
  return ax>ay?(dx<0?'back':'forward'):(dy<0?'jump':'crouch');
 }
}
