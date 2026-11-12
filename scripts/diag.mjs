// Diagnostic ponctuel : les données « tgvmax » ont-elles changé depuis hier soir ?
import fs from 'node:fs';
const B = 'https://ressources.data.sncf.com/api/explore/v2.1/catalog/datasets/tgvmax';
const out = { checked_at: new Date().toISOString() };
try {
  const d = (await (await fetch(B)).json()).metas?.default || {};
  out.data_processed = d.data_processed; out.metadata_processed = d.metadata_processed;
  const rows = await (await fetch(`${B}/exports/json?limit=-1&select=${encodeURIComponent('train_no,destination,heure_depart')}&where=${encodeURIComponent("origine=\"PARIS (intramuros)\" and date=date'2026-11-14' and od_happy_card=\"OUI\"")}`)).json();
  out.paris_sat_rows = rows.length; out.paris_sat_dest = new Set(rows.map(r => r.destination)).size;
  out.paris_sat_trains = new Set(rows.map(r => r.train_no + r.heure_depart + r.destination)).size;
  out.mtp = rows.filter(r => /MONTPELLIER|MONTBARD/.test(r.destination)).map(r => r.destination + ' ' + r.heure_depart).sort();
  out.per_day = (await (await fetch(`${B}/records?limit=40&select=date,count(*) as n&group_by=date&order_by=date`)).json()).results;
} catch (e) { out.error = String(e); }
fs.writeFileSync('diag/out.json', JSON.stringify(out, null, 1));
