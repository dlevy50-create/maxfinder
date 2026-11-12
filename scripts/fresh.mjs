// Détecte quand la SNCF renouvelle réellement le jeu « tgvmax » (son horodatage officiel n'est pas fiable) :
// on compare une empreinte des disponibilités à celle du passage précédent.
import fs from 'node:fs';
import crypto from 'node:crypto';
const B = 'https://ressources.data.sncf.com/api/explore/v2.1/catalog/datasets/tgvmax';
const r = await fetch(`${B}/records?limit=100&select=${encodeURIComponent('date,count(*) as n')}&where=${encodeURIComponent('od_happy_card="OUI"')}&group_by=date&order_by=date`);
if (!r.ok) throw new Error(`SNCF open data ${r.status}`);
const rows = (await r.json()).results;
const fp = crypto.createHash('sha1').update(JSON.stringify(rows)).digest('hex').slice(0, 16);
const path = 'state/fresh.json';
let prev = null; try { prev = JSON.parse(fs.readFileSync(path, 'utf8')); } catch {}
if (prev?.fp === fp) { console.log('Données inchangées depuis', prev.changed_at); process.exit(0); }
fs.mkdirSync('state', { recursive: true });
fs.writeFileSync(path, JSON.stringify({ fp, changed_at: new Date().toISOString(), approx: !prev }, null, 1));
console.log(prev ? 'Nouvelle mise à jour SNCF détectée.' : 'Suivi démarré.');
