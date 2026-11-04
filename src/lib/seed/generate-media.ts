"use client";

/**
 * Genera recursos multimedia de demostración en el navegador (canvas / MediaRecorder).
 * Así la demo no depende de archivos externos: todo termina en Firebase Storage.
 */

type Palette = [string, string, string];

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return { c, ctx: c.getContext("2d")! };
}

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function paintAbstract(ctx: CanvasRenderingContext2D, w: number, h: number, palette: Palette, seed: number, t = 0) {
  const rnd = seeded(seed);
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, palette[0]);
  g.addColorStop(1, palette[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 9; i++) {
    const x = rnd() * w + Math.sin(t * 0.8 + i) * w * 0.05;
    const y = rnd() * h + Math.cos(t * 0.6 + i * 1.3) * h * 0.06;
    const r = (0.12 + rnd() * 0.35) * Math.min(w, h);
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, `${palette[2]}66`);
    rg.addColorStop(1, `${palette[2]}00`);
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Retícula sutil tipo "molecular"
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = Math.max(1, w / 900);
  const pts = Array.from({ length: 26 }, () => [rnd() * w + Math.sin(t + rnd() * 6) * 12, rnd() * h + Math.cos(t + rnd() * 6) * 12]);
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const d = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]);
      if (d < Math.min(w, h) * 0.28) {
        ctx.beginPath();
        ctx.moveTo(pts[i][0], pts[i][1]);
        ctx.lineTo(pts[j][0], pts[j][1]);
        ctx.stroke();
      }
    }
  }
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  for (const [x, y] of pts) {
    ctx.beginPath();
    ctx.arc(x, y, Math.max(2, w / 400), 0, Math.PI * 2);
    ctx.fill();
  }
}

function toFile(c: HTMLCanvasElement, name: string, type: "image/jpeg" | "image/png" | "image/webp", quality = 0.86): Promise<File> {
  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(new File([b], name, { type })) : reject(new Error("No se pudo generar la imagen"))), type, quality),
  );
}

export async function abstractImage(name: string, w: number, h: number, palette: Palette, seed: number, caption?: string) {
  const { c, ctx } = canvas(w, h);
  paintAbstract(ctx, w, h, palette, seed);
  if (caption) {
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = `600 ${Math.round(h * 0.07)}px system-ui, sans-serif`;
    ctx.textBaseline = "bottom";
    ctx.fillText(caption, w * 0.06, h * 0.92);
  }
  return toFile(c, name, "image/jpeg");
}

export async function portrait(name: string, palette: Palette, seed: number, initials: string) {
  const s = 320;
  const { c, ctx } = canvas(s, s);
  paintAbstract(ctx, s, s, palette, seed);
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = `700 ${s * 0.36}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(initials, s / 2, s / 2 + 6);
  return toFile(c, name, "image/jpeg");
}

export async function logo(name: string, text: string, color: string, accent: string) {
  const { c, ctx } = canvas(520, 140);
  ctx.clearRect(0, 0, 520, 140);
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(70, 70, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 44px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("+", 70, 72);
  ctx.textAlign = "left";
  ctx.fillStyle = color;
  ctx.font = "800 64px system-ui, sans-serif";
  ctx.fillText(text, 136, 74);
  return toFile(c, name, "image/png");
}

/** Video corto (webm) animado. Devuelve null si el navegador no soporta MediaRecorder. */
export async function abstractVideo(name: string, palette: Palette, seconds = 6): Promise<File | null> {
  if (typeof MediaRecorder === "undefined") return null;
  const w = 1280;
  const h = 720;
  const { c, ctx } = canvas(w, h);
  const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((m) => MediaRecorder.isTypeSupported(m));
  if (!mime || !("captureStream" in c)) return null;
  const stream = (c as HTMLCanvasElement & { captureStream: (fps: number) => MediaStream }).captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2_500_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise<void>((r) => (recorder.onstop = () => r()));
  recorder.start(250);
  const start = performance.now();
  await new Promise<void>((resolve) => {
    const frame = () => {
      const t = (performance.now() - start) / 1000;
      paintAbstract(ctx, w, h, palette, 7, t);
      if (t < seconds) requestAnimationFrame(frame);
      else resolve();
    };
    frame();
  });
  recorder.stop();
  await done;
  stream.getTracks().forEach((tr) => tr.stop());
  return new File([new Blob(chunks, { type: "video/webm" })], name, { type: "video/webm" });
}
