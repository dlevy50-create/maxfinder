// Diagnostic ponctuel : le 07:42 Paris → Montpellier du vendredi 20 novembre
import fs from 'node:fs';
const B = 'https://ressources.data.sncf.com/api/explore/v2.1/catalog/datasets/tgvmax';
const out = { checked_at: new Date().toISOString() };
const get = async w => (await fetch(`${B}/exports/json?limit=-1&select=${encodeURIComponent('date,train_no,origine,destination,origine_iata,destination_iata,heure_depart,heure_arrivee,od_happy_card')}&where=${encodeURIComponent(w)}`)).json();
try {
  out.data_processed = (await (await fetch(B)).json()).metas?.default?.data_processed;
  out.t0742 = await get(`origine="PARIS (intramuros)" and date=date'2026-11-20' and heure_depart>="07:30" and heure_depart<="07:50"`);
  out.no12347 = await get(`train_no="12347" and date>=date'2026-11-14'`);
  out.fri_mtp = await get(`origine="PARIS (intramuros)" and date=date'2026-11-20' and (destination="MONTPELLIER SUD DE FRANCE" or destination="MONTPELLIER SAINT ROCH")`);
} catch (e) { out.error = String(e); }
fs.writeFileSync('diag/out.json', JSON.stringify(out, null, 1));
