// Diagnostic ponctuel : liste des gares du jeu « tgvmax » + fraîcheur
import fs from 'node:fs';
const B = 'https://ressources.data.sncf.com/api/explore/v2.1/catalog/datasets/tgvmax';
const out = { checked_at: new Date().toISOString() };
try {
  out.data_processed = (await (await fetch(B)).json()).metas?.default?.data_processed;
  const a = await (await fetch(`${B}/exports/json?select=origine,origine_iata&group_by=origine,origine_iata&limit=-1`)).json();
  const b = await (await fetch(`${B}/exports/json?select=destination,destination_iata&group_by=destination,destination_iata&limit=-1`)).json();
  const m = {}; for (const r of a) m[r.origine] = r.origine_iata; for (const r of b) m[r.destination] ??= r.destination_iata;
  out.stations = m;
} catch (e) { out.error = String(e); }
fs.writeFileSync('diag/out.json', JSON.stringify(out, null, 0));
