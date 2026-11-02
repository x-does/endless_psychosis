import type { AppearanceState } from "./appearance";
import type { CopingId } from "./coping";
import type { SatireId } from "./satire";

export function drawAppearance(ctx: CanvasRenderingContext2D, a: AppearanceState,
  x: number, feet: number, h: number, s: number, cycle: number, reduced: boolean,
  effect: CopingId | null, aftermath: boolean,
  satire: { id: SatireId; aftermath: boolean; remaining: number; charges?:number } | null = null) {
  const { radiance: r, echo: e, bone: b } = a;
  const top = feet - h, cy = top + h * .46;
  ctx.save();
  ctx.translate(x, top);
  // All layers fit the same standing/crouched footprint; only soft light extends.
  if (e > .02) {
    ctx.globalAlpha = .15 + e * .65;
    ctx.fillStyle = "#a8baff"; ctx.strokeStyle = "#d4ddff"; ctx.lineWidth = s;
    ctx.beginPath(); ctx.moveTo(-12 * s, h * .24);
    ctx.quadraticCurveTo(0, -4 * s, 13 * s, h * .25);
    ctx.lineTo(15 * s, h * .87);
    ctx.lineTo(6 * s, h * .78); ctx.lineTo(0, h); ctx.lineTo(-6 * s, h * .82);
    ctx.lineTo(-15 * s, h * .94); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (!reduced) {
      ctx.globalAlpha = e * .3; ctx.translate(-5 * s, 0); ctx.stroke(); ctx.translate(5 * s, 0);
    }
  }
  if (b > .02) {
    ctx.globalAlpha = .2 + b * .8;
    ctx.strokeStyle = "#f0dfcb"; ctx.fillStyle = "#eadbc9";
    ctx.lineWidth = 2 * s; ctx.lineCap = "round";
    ctx.beginPath(); ctx.ellipse(0, h * .19, 8 * s, Math.min(9 * s, h * .18), 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#1d1829";
    ctx.fillRect(-5 * s, h * .17, 3 * s, 3 * s); ctx.fillRect(2 * s, h * .17, 3 * s, 3 * s);
    ctx.beginPath(); ctx.moveTo(0, h * .32); ctx.lineTo(0, h * .79); ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const yy = h * (.37 + i * .085), span = (10 - i) * s;
      ctx.beginPath(); ctx.moveTo(-span, yy); ctx.quadraticCurveTo(0, yy + 6 * s, span, yy); ctx.stroke();
    }
    const stride = reduced ? 5 * s : Math.sin(cycle) * 9 * s;
    ctx.beginPath(); ctx.moveTo(0, h * .75); ctx.lineTo(-stride, h); ctx.moveTo(0, h * .75); ctx.lineTo(stride, h); ctx.stroke();
  }
  if (r > .02) {
    ctx.globalAlpha = .3 + r * .7;
    const radius = (a.form === "radiance" ? 7 : 4) * s;
    const glow = ctx.createRadialGradient(0, h * .46, 1, 0, h * .46, 26 * s);
    glow.addColorStop(0, "#fff6d9bb"); glow.addColorStop(1, "#8ee6d200");
    ctx.fillStyle = glow; ctx.fillRect(-28 * s, h * .46 - 28 * s, 56 * s, 56 * s);
    ctx.fillStyle = "#fff5d6"; ctx.beginPath(); ctx.arc(0, h * .46, radius, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#a3ead5"; ctx.lineWidth = s;
    ctx.beginPath(); ctx.moveTo(0, h * .46); ctx.quadraticCurveTo(-5 * s, h * .8, 0, h); ctx.stroke();
    for (let i = 0; i < 3; i++) {
      const angle = i * Math.PI * 2 / 3 + (reduced ? 0 : cycle * .08);
      ctx.beginPath(); ctx.arc(Math.cos(angle) * 12 * s, h * .46 + Math.sin(angle) * 12 * s, 1.7 * s, 0, Math.PI * 2); ctx.fill();
    }
  }
  // Honest, stable collision-envelope cue remains even when the body becomes light.
  if (Math.max(r, e, b) >= .15) {
    ctx.globalAlpha = .65; ctx.strokeStyle = "#e0f2ee"; ctx.lineWidth = 1.2 * s;
    ctx.setLineDash([3 * s, 4 * s]);
    ctx.strokeRect(-16 * s, 0, 32 * s, h); ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(-14 * s, h); ctx.lineTo(-6 * s, h); ctx.moveTo(6 * s, h); ctx.lineTo(14 * s, h); ctx.stroke();
  }
  ctx.restore();
  if (a.cue) {
    ctx.save(); ctx.strokeStyle=a.cue.color; ctx.globalAlpha=.7; ctx.lineWidth=1.5*s;
    ctx.beginPath(); ctx.ellipse(x,feet-h*.45,19*s,h*.58,0,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
  if (satire) {
    ctx.save(); ctx.lineWidth=2*s;ctx.globalAlpha=.8;
    ctx.strokeStyle=satire.id==='express'?'#ffa36e':satire.id==='orders'?'#ffb077':satire.id==='subscription'?'#8be2c8':satire.id==='revelation'?'#c2a7ff':satire.id==='certificate'?'#f3df9b':'#a4d9f0';
    if(satire.aftermath)ctx.setLineDash([4*s,5*s]);
    ctx.beginPath();
    if(satire.aftermath)ctx.ellipse(x,cy,21*s,h*.55,0,0,Math.PI*2);
    else if(satire.id==='express') {
      for(let i=0;i<3;i++){const y=top+h*(.35+i*.15);ctx.moveTo(x-9*s,y+4*s);ctx.lineTo(x,y);ctx.lineTo(x+9*s,y+4*s);}
    } else if(satire.id==='orders') {
      ctx.setLineDash([8*s,3*s]);ctx.ellipse(x,cy,21*s,h*.55,0,0,Math.PI*2);
    } else if(satire.id==='subscription') {
      const segments=Math.max(1,Math.ceil(satire.remaining));
      for(let i=0;i<segments;i++){const angle=i*Math.PI*2/3;ctx.moveTo(x+Math.cos(angle)*23*s,cy+Math.sin(angle)*23*s);ctx.arc(x,cy,23*s,angle,angle+1.5);}
    } else if(satire.id==='revelation'||satire.id==='certificate'){
      const n=satire.id==='certificate'?(satire.charges??3):6;
      for(let i=0;i<n;i++){const angle=i*Math.PI*2/(satire.id==='certificate'?3:6);ctx.moveTo(x+Math.cos(angle)*23*s,cy+Math.sin(angle)*23*s);ctx.lineTo(x+Math.cos(angle+.6)*17*s,cy+Math.sin(angle+.6)*17*s);ctx.lineTo(x+Math.cos(angle+1.2)*23*s,cy+Math.sin(angle+1.2)*23*s);}
    } else ctx.ellipse(x,feet,22*s,5*s,0,0,Math.PI*2);
    ctx.stroke();
    if(satire.id==='orders'&&!satire.aftermath){
      const angle=reduced?-.8:cycle*.12;
      const cx=x+Math.cos(angle)*23*s, yy=cy+Math.sin(angle)*h*.52;
      ctx.fillStyle='#ffdcb0';ctx.beginPath();ctx.arc(cx,yy,3*s,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }
  if (!effect) return;
  ctx.save(); ctx.strokeStyle = ({ ground: "#7de3cd", compassion: "#ffd296", connect: "#9bdcff", bottle: "#bfafdb", push: "#ffa36e", numb: "#a8baff" })[effect];
  ctx.lineWidth = 2 * s; ctx.globalAlpha = .85;
  if (aftermath) ctx.setLineDash([4 * s, 6 * s]);
  ctx.beginPath();
  if (effect === "ground") ctx.ellipse(x, feet, 21 * s, 5 * s, 0, 0, Math.PI * 2);
  else if (effect === "compassion") ctx.arc(x, cy, 22 * s, -1.2, 1.6);
  else if (effect === "bottle") ctx.roundRect(x - 20 * s, top - 4 * s, 40 * s, h + 8 * s, 12 * s);
  else if (effect === "push") { for (let i = 0; i < 3; i++) { const y = top + h * (.35 + i * .15); ctx.moveTo(x - 8 * s, y + 4 * s); ctx.lineTo(x, y); ctx.lineTo(x + 8 * s, y + 4 * s); } }
  else if (effect === "numb") ctx.ellipse(x - 4 * s, cy, 19 * s, h * .55, 0, 0, Math.PI * 2);
  else { for (let i = 0; i < 3; i++) { const angle = i * Math.PI * 2 / 3; const px = x + Math.cos(angle) * 20 * s, py = cy + Math.sin(angle) * 18 * s; if (!i) ctx.moveTo(px, py); else ctx.lineTo(px, py); } ctx.closePath(); }
  ctx.stroke(); ctx.restore();
}
