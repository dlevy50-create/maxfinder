// Sonde ponctuelle : le simulateur MAX de la SNCF répond-il depuis GitHub Actions ?
import fs from 'node:fs';
const B = 'https://www.maxjeune-tgvinoui.sncf/api/public/refdata';
const day = process.argv[2] || '2026-11-14';
const urls = [
  `${B}/freeplaces-stations?label=montpellier`,
  `${B}/freeplaces-stations?label=paris`,
  `${B}/search-freeplaces-proposals?destination=FRMPL&origin=FRPLY&departureDateTime=${day}T00:00:00`,
  `${B}/search-freeplaces-proposals?destination=FRPLY&origin=FRMPL&departureDateTime=${day}T00:00:00`,
];
const out = [];
for (const url of urls) {
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json', 'Accept-Language': 'fr-FR', 'User-Agent': 'MaxFinder (appli personnelle, github.com/dlevy50-create/maxfinder)' } });
    const t = await r.text();
    out.push({ url, status: r.status, type: r.headers.get('content-type'), body: t.slice(0, 6000) });
  } catch (e) { out.push({ url, error: String(e), cause: String(e.cause || '') }); }
}
fs.writeFileSync('probe/out.json', JSON.stringify(out, null, 1));
console.log(out.map(o => `${o.status || o.error} ${o.url}`).join('\n'));
