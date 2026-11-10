import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)])
);
const S = env.SCHOOL_NUMBER;
const auth = "Basic " + Buffer.from(`${env.SCHOOL_USER}:${env.SCHOOL_PASSWORD}`).toString("base64");
const base = `https://www.stundenplan24.de/${S}`;
const ymd = (d) => d.toISOString().slice(0, 10).replace(/-/g, "");

async function get(url) {
  try {
    const r = await fetch(url, { headers: { Authorization: auth } });
    let body = "";
    if (r.ok) body = (await r.text()).replace(/^\uFEFF/, "");
    return { status: r.status, body };
  } catch (e) {
    return { status: "ERR " + e.message, body: "" };
  }
}

// Werktage: 5 zurück bis 10 voraus
const days = [];
for (let i = -7; i <= 14; i++) {
  const d = new Date(); d.setDate(d.getDate() + i);
  if (d.getDay() % 6 !== 0) days.push(d);
}

const fixed = [
  `${base}/mobil/mobdaten/Klassen.xml`,
  `${base}/wplan/wdatenl/SPlanLe_Basis.xml`,
  `${base}/vplan/vdaten/VplanKl.xml`,
];
console.log("== Feste URLs ==");
const store = {};
for (const u of fixed) {
  const r = await get(u);
  store[u] = r.body;
  console.log(r.status, u, r.body ? `(${r.body.length} B)` : "");
}
console.log("\n== Tagesdateien ==");
const found = { A: [], B: [] };
for (const d of days) {
  const a = `${base}/mobil/mobdaten/PlanKl${ymd(d)}.xml`;
  const b = `${base}/wplan/wdatenk/WPlanKl_${ymd(d)}.xml`;
  const [ra, rb] = await Promise.all([get(a), get(b)]);
  console.log(ymd(d), "A:", ra.status, "B:", rb.status);
  if (ra.body) { found.A.push(ymd(d)); store["A" + ymd(d)] = ra.body; }
  if (rb.body) { found.B.push(ymd(d)); store["B" + ymd(d)] = rb.body; }
}
console.log("\nA gefunden:", found.A.join(",") || "-");
console.log("B gefunden:", found.B.join(",") || "-");

fs.mkdirSync(new URL("../samples/", import.meta.url), { recursive: true });
for (const [k, v] of Object.entries(store)) {
  if (!v) continue;
  const name = k.startsWith("http") ? k.split("/").pop() : (k[0] === "A" ? `PlanKl${k.slice(1)}.xml` : `WPlanKl_${k.slice(1)}.xml`);
  fs.writeFileSync(new URL("../samples/" + name, import.meta.url), v);
}
console.log("Samples gespeichert in samples/");
