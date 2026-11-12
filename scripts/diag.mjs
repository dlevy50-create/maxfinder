// Diagnostic ponctuel sur l'open data SNCF (jeu « tgvmax »)
import fs from 'node:fs';
const B = 'https://ressources.data.sncf.com/api/explore/v2.1/catalog/datasets/tgvmax';
const out = { checked_at: new Date().toISOString() };
const get = async w => (await fetch(`${B}/exports/json?limit=-1&select=${encodeURIComponent('train_no,origine,destination,heure_depart,heure_arrivee,od_happy_card')}&where=${encodeURIComponent(w)}`)).json();
try {
  const m = await (await fetch(B)).json(); out.data_processed = m.metas?.default?.data_processed;
  const D = "date=date'2026-11-14'";
  out.paris_1152_1500 = await get(`origine="PARIS (intramuros)" and ${D} and (heure_depart="11:52" or heure_depart="15:00")`);
  out.to_mtp = (await get(`(destination="MONTPELLIER SAINT ROCH" or destination="MONTPELLIER SUD DE FRANCE") and ${D}`)).filter(r => r.heure_arrivee >= '14:30' && r.heure_arrivee <= '19:30');
} catch (e) { out.error = String(e); }
fs.writeFileSync('diag/out.json', JSON.stringify(out));
