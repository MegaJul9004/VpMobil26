// Erzeugt PNG-Icons ohne Fremdabhängigkeit (zlib + handgeschriebener PNG-Encoder).
import fs from "node:fs";
import zlib from "node:zlib";

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
};
function png(size, pixel) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x / size, y / size);
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

const inRR = (u, v, x0, y0, x1, y1, r) => {
  if (u < x0 || u > x1 || v < y0 || v > y1) return false;
  const cx = Math.min(Math.max(u, x0 + r), x1 - r), cy = Math.min(Math.max(v, y0 + r), y1 - r);
  return (u - cx) ** 2 + (v - cy) ** 2 <= r * r;
};

// Motiv: Indigo-Verlauf, weißer Stundenplan-Kasten mit Kopfzeile und Zellen (rote Akzentzelle = Änderung)
function design(scale) {
  return (u, v) => {
    const s = (u - 0.5) / scale + 0.5, t = (v - 0.5) / scale + 0.5;
    const bg = [79 - 30 * v, 70 + 0 * v, 229 - 40 * v, 255].map(Math.round);
    if (!inRR(s, t, 0.2, 0.2, 0.8, 0.8, 0.07)) return bg;
    if (t < 0.34) return [30, 27, 120, 255];
    const col = Math.floor((s - 0.2) / 0.2), row = Math.floor((t - 0.34) / 0.153);
    const cx = (s - 0.2) % 0.2, cy = (t - 0.34) % 0.153;
    if (cx < 0.012 || cy < 0.012) return [199, 210, 254, 255];
    if (col === 2 && row === 1) return [239, 68, 68, 255];
    return [255, 255, 255, 255];
  };
}

fs.mkdirSync("public/icons", { recursive: true });
fs.writeFileSync("public/icons/icon-192.png", png(192, design(1)));
fs.writeFileSync("public/icons/icon-512.png", png(512, design(1)));
fs.writeFileSync("public/icons/icon-maskable-512.png", png(512, design(0.8)));
fs.writeFileSync("public/icons/apple-touch-icon.png", png(180, (u, v) => {
  // iOS rundet selbst ab → vollflächig
  const p = design(1)(u, v);
  return [p[0], p[1], p[2], 255];
}));
console.log("Icons geschrieben");
