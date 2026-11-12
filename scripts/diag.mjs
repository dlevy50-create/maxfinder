// Diagnostic ponctuel : de quand datent les données du jeu « tgvmax » de l'open data SNCF ?
import fs from 'node:fs';
const B = 'https://ressources.data.sncf.com/api/explore/v2.1/catalog/datasets/tgvmax';
const out = { checked_at: new Date().toISOString() };
try {
  const d = (await (await fetch(B)).json()).metas?.default || {};
  out.data_processed = d.data_processed; out.modified = d.modified; out.metadata_processed = d.metadata_processed;
  const q = "origine=\"PARIS (intramuros)\" and date=date'2026-11-14' and (train_no=\"12347\" or train_no=\"6613\" or train_no=\"6619\")";
  out.sample = (await (await fetch(`${B}/records?limit=40&order_by=heure_depart&select=train_no,destination,heure_depart,heure_arrivee,od_happy_card&where=${encodeURIComponent(q)}`)).json()).results;
  out.range = (await (await fetch(`${B}/records?limit=1&select=max(date) as dmax, min(date) as dmin`)).json()).results;
} catch (e) { out.error = String(e); }
fs.writeFileSync('diag/out.json', JSON.stringify(out, null, 1));
