import { Run, WIDTH, HEIGHT } from "./model";
import { DISTRICTS, type PilotId } from "./content";
export function pilotArt(
  ctx: CanvasRenderingContext2D,
  id: PilotId,
  x: number,
  y: number,
  size: number,
  color: string,
  time = 0,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 40, size / 40);
  ctx.strokeStyle = color;
  ctx.fillStyle = "#111c22";
  ctx.lineWidth = 1.5;
  // Angular coats, masks and equipment give each pilot a distinct silhouette.
  if (id === "vesper") {
    ctx.beginPath();
    ctx.moveTo(-8, -9);
    ctx.lineTo(-21, 24);
    ctx.lineTo(-3, 17);
    ctx.lineTo(13, 24);
    ctx.lineTo(8, -9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-12, -17);
    ctx.lineTo(1, -28);
    ctx.lineTo(11, -12);
    ctx.lineTo(3, -2);
    ctx.lineTo(-8, -4);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-17, 2);
    ctx.lineTo(-31, 21);
    ctx.moveTo(14, 0);
    ctx.lineTo(27, -17);
    ctx.stroke();
  } else if (id === "rook") {
    ctx.beginPath();
    ctx.moveTo(-18, -8);
    ctx.lineTo(16, -8);
    ctx.lineTo(22, 18);
    ctx.lineTo(-20, 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeRect(-11, -25, 23, 17);
    ctx.fillStyle = color;
    ctx.fillRect(-7, -20, 15, 4);
    ctx.strokeRect(13, -3, 12, 29);
    ctx.fillRect(-14, 19, 8, 10);
    ctx.fillRect(8, 19, 8, 10);
  } else {
    ctx.beginPath();
    ctx.moveTo(0, -24);
    ctx.lineTo(13, -11);
    ctx.lineTo(9, 5);
    ctx.lineTo(19, 23);
    ctx.lineTo(0, 15);
    ctx.lineTo(-19, 23);
    ctx.lineTo(-9, 5);
    ctx.lineTo(-13, -11);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillRect(-4, -14, 8, 5);
    ctx.beginPath();
    ctx.ellipse(0, 0, 30, 9, -0.4, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 3; i++) {
      const a = time + (i * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 29, Math.sin(a) * 17, 3, 0, 7);
      ctx.fill();
    }
  }
  ctx.restore();
}
export function draw(
  ctx: CanvasRenderingContext2D,
  run: Run,
  reduceMotion: boolean,
) {
  const { color } = DISTRICTS[run.district];
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = "#0c151b";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const gradient = ctx.createRadialGradient(
    WIDTH / 2,
    HEIGHT / 2,
    20,
    WIDTH / 2,
    HEIGHT / 2,
    650,
  );
  gradient.addColorStop(0, color + "0c");
  gradient.addColorStop(1, "#080f15");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#aac7c309";
  for (let x = 0; x < WIDTH; x += 50) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y < HEIGHT; y += 50) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }
  ctx.strokeStyle = color + "25";
  ctx.strokeRect(16, 16, WIDTH - 32, HEIGHT - 32);
  ctx.save();
  ctx.translate(WIDTH / 2, HEIGHT / 2);
  ctx.strokeStyle = color + "0d";
  for (const r of [180, 280, 380]) {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  for (const w of run.warnings) {
    ctx.fillStyle = "#ff6e8728";
    ctx.strokeStyle = "#ff6e87";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w.x, w.y, w.radius, 0, 7);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(w.x, w.y, w.radius * (1 - w.time / w.max), 0, 7);
    ctx.stroke();
    ctx.fillStyle = "#ffc0cd";
    ctx.font = "bold 20px monospace";
    ctx.textAlign = "center";
    ctx.fillText("!", w.x, w.y + 7);
  }
  for (const s of run.shots) {
    ctx.strokeStyle = s.hostile ? "#ff6e87" : run.pilot.color;
    ctx.lineWidth = s.hostile ? 5 : 3;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x - s.vx * 0.022, s.y - s.vy * 0.022);
    ctx.stroke();
  }
  for (const p of run.pickups) {
    ctx.strokeStyle =
      p.kind === "repair"
        ? "#b9f279"
        : p.kind === "barrier"
          ? "#b9a0ff"
          : "#ffaf79";
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x - 12, p.y - 12, 24, 24);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.textAlign = "center";
    ctx.font = "16px monospace";
    ctx.fillText(
      p.kind === "repair" ? "+" : p.kind === "barrier" ? "◇" : "»",
      p.x,
      p.y + 5,
    );
  }
  for (const e of run.enemies) {
    if ((e.arrival ?? 0) > 0) {
      ctx.strokeStyle = "#ff6e8777";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius + 10, 0, 7);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#ff9fb0";
      ctx.font = "16px monospace";
      ctx.textAlign = "center";
      ctx.fillText("+", e.x, e.y + 5);
      continue;
    }
    if (e.kind === "boss" && e.timer < 0.8) {
      ctx.strokeStyle = "#ff6e87";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius + 15 + (1 - e.timer / 0.8) * 25, 0, 7);
      ctx.stroke();
      ctx.fillStyle = "#ff9fb0";
      ctx.font = "12px monospace";
      ctx.textAlign = "center";
      ctx.fillText("!", e.x, e.y - e.radius - 25);
    }
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.strokeStyle =
      e.flash > 0 ? "#fff" : e.kind === "boss" ? color : "#ff6e87";
    ctx.fillStyle = e.kind === "boss" ? "#20272a" : "#231923";
    ctx.lineWidth = 2;
    const r = e.radius;
    ctx.beginPath();
    if (e.kind === "hunter") {
      ctx.moveTo(0, -r);
      ctx.lineTo(r, r);
      ctx.lineTo(0, r * 0.5);
      ctx.lineTo(-r, r);
      ctx.closePath();
    } else if (e.kind === "gunner") {
      ctx.rect(-r, -r, r * 2, r * 2);
    } else {
      const sides = e.kind === "boss" ? 6 : 5;
      for (let i = 0; i <= sides; i++) {
        const a = (i * Math.PI * 2) / sides - Math.PI / 2;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
    }
    ctx.fill();
    ctx.stroke();
    if (e.kind === "boss") {
      ctx.rotate(reduceMotion ? 0 : run.time * 0.4);
      ctx.strokeRect(-r * 0.65, -r * 0.65, r * 1.3, r * 1.3);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, 7);
      ctx.fill();
    } else {
      ctx.fillStyle = "#ff9fb0";
      ctx.fillRect(-4, -2, 8, 3);
    }
    if (e.hp < e.maxHp) {
      ctx.fillStyle = "#44232e";
      ctx.fillRect(-r, -r - 10, r * 2, 3);
      ctx.fillStyle = "#ff6e87";
      ctx.fillRect(-r, -r - 10, (r * 2 * e.hp) / e.maxHp, 3);
    }
    ctx.restore();
  }
  if (run.pilot.id === "io") {
    ctx.strokeStyle = run.pilot.color + "35";
    ctx.beginPath();
    ctx.arc(run.player.x, run.player.y, 78, 0, 7);
    ctx.stroke();
    const count = Math.min(8, 3 + run.count("echo"));
    for (let i = 0; i < count; i++) {
      const a = run.time * 2.5 + (i * Math.PI * 2) / count;
      ctx.fillStyle = run.pilot.color;
      ctx.beginPath();
      ctx.arc(
        run.player.x + Math.cos(a) * 78,
        run.player.y + Math.sin(a) * 78,
        7,
        0,
        7,
      );
      ctx.fill();
    }
  }
  if (run.invincible > 0 || run.barrier > 0) {
    ctx.strokeStyle = run.pilot.color + "99";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(run.player.x, run.player.y, 26, 0, 7);
    ctx.stroke();
  }
  if (run.pulse > 0) {
    ctx.strokeStyle =
      run.pilot.color +
      Math.floor(run.pulse * 150)
        .toString(16)
        .padStart(2, "0");
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(run.player.x, run.player.y, (1 - run.pulse) * 280 + 25, 0, 7);
    ctx.stroke();
  }
  pilotArt(
    ctx,
    run.pilot.id,
    run.player.x,
    run.player.y,
    32,
    run.pilot.color,
    reduceMotion ? 0 : run.time,
  );
  if (!reduceMotion)
    for (const p of run.particles) {
      ctx.globalAlpha = Math.min(1, p.life * 2);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 3, 3);
    }
  ctx.globalAlpha = 1;
}
