import type { CopingId } from "./coping";
export type SatireId = "express" | "orders" | "subscription" | "water" | "revelation" | "certificate";
export const SATIRE_ENABLED = import.meta.env?.VITE_SATIRE === "1";
export const SATIRE_ITEMS = {
  express: { name: "White-Line Express", icon: "ϟ", benefit: "5s: +15% road speed and double pulse damage.", cost: "+12 strain. Then 7s half focus regeneration.", seconds: 5, after: 7, color: "#f4e8cf" },
  orders: { name: "Last Orders", icon: "♜", benefit: "6s: 30% damage reduction. Each Cinder Comet hit deals 4 boss / 2 ordinary damage.", cost: "+12 strain. Each pulse costs 27 focus during the benefit.", seconds: 6, after: 0, color: "#ffb077" },
  subscription: { name: "Meditation Subscription", icon: "◎", benefit: "Clear hostile projectiles and restore 20 focus.", cost: "Commit to 3s without firing pulses. Jump and slide still work.", seconds: 3, after: 0, color: "#8be2c8" },
  water: { name: "Ordinary Water", icon: "◦", benefit: "Reduce strain by 8.", cost: "No offensive boost from this encounter.", seconds: 0, after: 0, color: "#a4d9f0" },
  revelation: {name:"LSD: Revelation Edition",icon:"◇",benefit:"5s: hostile projectiles move 30% slower. Revelations are subjective.",cost:"+10 strain. Then pulses cost 27 focus for 7s.",seconds:5,after:7,color:"#c2a7ff"},
  certificate: {name:"Enlightenment Certificate",icon:"✺",benefit:"Next 3 fired pulses deal double damage, within 6s.",cost:"Each empowered pulse costs 27 focus. Unused charges expire.",seconds:6,after:0,color:"#f3df9b"},
} as const;
export interface SatireOffer { title: string; story: string; items: SatireId[]; stage: number; }
export class SatireState {
  drive = 0; distance = 0; certainty = 0;
  time = 0; stage = 0; encounter = 0;
  offered: SatireOffer | null = null;
  effect: SatireId | null = null; remaining = 0; speed = 1;
  history: SatireId[] = [];
  charges = 0;
  get projectileFactor(){return this.effect==='revelation'&&this.boosting ? .7 : 1;}
  get pulseCost(){return this.effect==='certificate'||this.effect==='orders'||(this.effect==='revelation'&&this.aftermath)?27:18;}
  get pulsePower(){return (this.effect==='express'&&this.boosting)||this.effect==='certificate'?2:1;}
  firedPulse(){if(this.effect==='certificate'&&--this.charges<=0){this.effect=null;this.remaining=0;}}
  add(drive: number, distance: number, certainty: number) {
    this.drive = Math.max(0, Math.min(100, this.drive + drive));
    this.distance = Math.max(0, Math.min(100, this.distance + distance));
    this.certainty = Math.max(0, Math.min(100, this.certainty + certainty));
  }
  coping(id: CopingId) {
    const weights: Record<CopingId, [number,number,number]> = { ground:[0,-8,6], compassion:[-6,-4,-6], connect:[0,-8,-4], bottle:[0,12,4], push:[14,0,4], numb:[-4,14,0] };
    this.add(...weights[id]);
  }
  get boosting() { return !!this.effect && this.remaining > SATIRE_ITEMS[this.effect].after; }
  get aftermath() { return !!this.effect && !this.boosting; }
  tick(dt: number, steadySpeed = false) {
    this.time += dt; this.add(-.2*dt,-.2*dt,-.2*dt);
    this.remaining = Math.max(0, this.remaining - dt);
    if (!this.remaining) {this.effect = null;this.charges=0;}
    const target = !steadySpeed && this.effect === "express" && this.boosting ? 1.15 : 1;
    this.speed += Math.sign(target-this.speed)*Math.min(Math.abs(target-this.speed), .15*dt/.75);
  }
  checkpoint(): SatireOffer {
    const axes = [this.drive,this.distance,this.certainty].sort((a,b)=>b-a);
    if (this.time >= 45 && axes[0] >= 30) this.stage = Math.max(this.stage,1);
    if (this.time >= 120 && (axes[0]>=65 || axes[1]>=45)) this.stage = 2;
    const index = this.encounter++ % 3;
    const path = this.drive >= this.distance && this.drive >= this.certainty ? "drive" : this.distance >= this.certainty ? "distance" : "certainty";
    const scenes = [
      { title: this.stage ? "The Productivity Cathedral" : "The late bus", story: this.stage ? "The express lane now leads through a cathedral of deadlines. A clock-faced manager offers sustainable maximum output. Your inner peace subscription has expired." : "You missed the bus. The next one is late too. A machine offers urgency, numbness, or a moment to stay where your feet are." },
      { title: this.stage ? "The Ministry of Not Feeling It" : "Last orders", story: this.stage ? "The bar issues receipts for forgotten evenings. A padded clerk asks whether you want your feelings returned or rolled over into next month." : "A warm window promises distance from the day. Someone has left a glass of water beside the sales pitch. You can take either, or walk away." },
      { title: this.stage === 2 ? "The Ministry of Revelation" : "The revelation queue", story: this.stage === 2 ? "The universe has read your complaint and marked it resolved. Two clerks certify opposite truths. The exit is labelled: I don't know." : "A poster promises a better self. Below it, a stranger says that being here might be enough. Neither can prove it." },
    ];
    const branches = {
      drive:["The timetable measures your worth in minutes. Even rest needs a performance target.","The bartender asks whether your evening off delivered measurable outcomes.","The clerk offers enlightenment with unlimited output. Questions count as downtime."],
      distance:["The premium lane promises distance from every obligation. The fare includes remembering none of the journey.","Forgotten feelings incur storage fees. An ordinary glass of water is still free of paperwork.","Detachment promises escape from contradiction. The exit remains in the same room."],
      certainty:["The timetable has become doctrine. A delay is now a failure of belief.","Emotional compliance receives a certificate. Gratitude is mandatory; comfort is optional.","Two opposing truths receive identical official seals. The sign says: serenity is compulsory."],
    };
    const items: SatireId[] = index === 0 ? ["express","subscription","water"] : index === 1 ? ["orders","subscription","water"] : ["revelation","certificate","water"];
    return this.offered = { ...scenes[index], story:scenes[index].story+(this.stage?' '+branches[path][index]:''),items, stage:this.stage };
  }
  choose(id: SatireId | null) {
    if (!this.offered || (id && !this.offered.items.includes(id)) || this.effect) return false;
    this.offered = null;
    if (!id) return true;
    this.history.push(id);
    this.effect = SATIRE_ITEMS[id].seconds ? id : null;
    this.remaining = SATIRE_ITEMS[id].seconds + SATIRE_ITEMS[id].after;
    this.charges=id==='certificate'?3:0;
    const deltas: Record<SatireId,[number,number,number]> = {express:[18,0,0],orders:[0,14,0],subscription:[0,0,12],water:[-4,-4,0],revelation:[0,12,10],certificate:[0,0,18]};
    this.add(...deltas[id]); return true;
  }
}
