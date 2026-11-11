// Vérifie les alertes MaxFinder sur l'open data SNCF et notifie via ntfy les nouvelles places MAX.
// Usage : node scripts/check.mjs            (réel)
//         MOCK=fichier.json DRY=1 node …    (test hors ligne)
import fs from 'node:fs';
const BASE = 'https://ressources.data.sncf.com/api/explore/v2.1/catalog/datasets/tgvmax';
const DOW = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const MON = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const q = s => '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
const pretty = n => String(n).replace(/\s*\(.*?\)\s*/g, ' ').trim().toLowerCase().replace(/(^|[\s-])\p{L}/gu, c => c.toUpperCase()).replace(/\bTgv\b/g, 'TGV');
const parisDate = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(d);
const fday = s => { const d = new Date(s + 'T12:00:00Z'); return `${DOW[d.getUTCDay()]} ${d.getUTCDate()} ${MON[d.getUTCMonth()]}`; };

const dir = 'alerts';
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /^alertes-.*\.json$/.test(f)).sort() : [];
if (!files.length) { console.log('Aucune alerte enregistrée.'); process.exit(0); }
const cfgFile = files[files.length - 1];
const cfg = JSON.parse(fs.readFileSync(`${dir}/${cfgFile}`, 'utf8'));
for (const old of files.slice(0, -1)) fs.unlinkSync(`${dir}/${old}`); // on ne garde que la dernière version
if (!cfg.alerts?.length) { console.log('Liste d’alertes vide.'); process.exit(0); }
if (!/^[A-Za-z0-9_-]{8,64}$/.test(cfg.topic || '')) throw new Error('Sujet ntfy invalide');

const statePath = 'state/seen.json';
let state = { cfg: '', seen: [] };
try { state = JSON.parse(fs.readFileSync(statePath, 'utf8')); } catch {}
const firstRun = state.cfg !== cfgFile;
const seen = new Set(firstRun ? [] : state.seen);

const today = parisDate(), end = parisDate(new Date(Date.now() + 31 * 864e5));
async function rows(a) {
  if (process.env.MOCK) return JSON.parse(fs.readFileSync(process.env.MOCK, 'utf8')).filter(r => a.o.includes(r.origine) && a.d.includes(r.destination));
  const where = [`(${a.o.map(s => 'origine=' + q(s)).join(' or ')})`, `(${a.d.map(s => 'destination=' + q(s)).join(' or ')})`,
    `date>=date'${today}' and date<=date'${end}'`, 'od_happy_card="OUI"'].join(' and ');
  const url = `${BASE}/exports/json?limit=-1&select=${encodeURIComponent('date,train_no,origine,destination,heure_depart,heure_arrivee')}&where=${encodeURIComponent(where)}`;
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`SNCF open data ${r.status} : ${(await r.text()).slice(0, 300)}`);
  return r.json();
}

const current = [], fresh = [];
for (const [i, a] of cfg.alerts.entries()) {
  for (const r of await rows(a)) {
    const date = String(r.date).slice(0, 10), dep = String(r.heure_depart).slice(0, 5), h = +dep.slice(0, 2) + +dep.slice(3) / 60;
    if (date < today || !a.days.includes(new Date(date + 'T12:00:00Z').getUTCDay()) || h < a.t0 || h > a.t1) continue;
    const key = [a.name, date, r.train_no, r.origine, r.destination, dep].join('|');
    if (current.some(c => c.key === key)) continue;
    const item = { key, date, dep, arr: String(r.heure_arrivee).slice(0, 5), o: r.origine, d: r.destination, no: r.train_no, name: a.name };
    current.push(item);
    if (!seen.has(key)) fresh.push(item);
  }
}
fresh.sort((x, y) => (x.date + x.dep).localeCompare(y.date + y.dep));
console.log(`${cfg.alerts.length} alerte(s), ${current.length} place(s) MAX correspondante(s), ${fresh.length} nouvelle(s).`);

let title = '', body = '';
const lines = fresh.map(f => `${fday(f.date)} ${f.dep}→${f.arr} ${pretty(f.o)} → ${pretty(f.d)} (n° ${f.no})`);
if (firstRun) {
  title = `MaxFinder : ${cfg.alerts.length} alerte(s) enregistrée(s)`;
  body = lines.length ? `${lines.length} place(s) MAX déjà disponible(s) :\n` + lines.slice(0, 25).join('\n') + (lines.length > 25 ? `\n… et ${lines.length - 25} autres` : '')
    : 'Aucune place MAX pour l’instant. Vous serez prévenu dès qu’une place apparaît dans les données SNCF.';
} else if (lines.length) {
  title = `🚄 ${lines.length} nouvelle(s) place(s) MAX`;
  body = lines.slice(0, 25).join('\n') + (lines.length > 25 ? `\n… et ${lines.length - 25} autres` : '');
}
if (title) {
  if (process.env.DRY) console.log('--- notification ---\n' + title + '\n' + body);
  else {
    const r = await fetch('https://ntfy.sh/', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: cfg.topic, title, message: body, click: cfg.app || undefined, tags: ['bullettrain_side'] }) });
    if (!r.ok) throw new Error(`ntfy ${r.status} : ${(await r.text()).slice(0, 200)}`);
    console.log('Notification envoyée.');
  }
}
if (!process.env.DRY) {
  fs.mkdirSync('state', { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify({ cfg: cfgFile, seen: current.map(c => c.key).sort() }, null, 1));
}
