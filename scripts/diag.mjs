// Diagnostic ponctuel : de quand datent les données du jeu « tgvmax » de l'open data SNCF ?
import fs from 'node:fs';
const B = 'https://ressources.data.sncf.com/api/explore/v2.1/catalog/datasets/tgvmax';
const out = { checked_at: new Date().toISOString() };
try {
  const m = await (await fetch(B)).json();
  const d = m.metas?.default || {};
  out.data_processed = d.data_processed; out.modified = d.modified; out.metadata_processed = d.metadata_processed; out.records_count = d.records_count;
  const q = "origine=\"PARIS (intramuros)\" and destination=\"MONTPELLIER SUD DE FRANCE\" and date=date'2026-11-14'";
  out.sample = await (await fetch(`${B}/records?limit=20&order_by=heure_depart&select=train_no,heure_depart,od_happy_card&where=${encodeURIComponent(q)}`)).json();
  const mx = await (await fetch(`${B}/records?limit=1&select=max(date) as dmax, min(date) as dmin`)).json(); out.range = mx.results;
} catch (e) { out.error = String(e); }
fs.writeFileSync('diag/out.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
