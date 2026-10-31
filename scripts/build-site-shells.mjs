import { readFile, writeFile } from "node:fs/promises";
const template = await readFile(
  new URL("../dist/index.html", import.meta.url),
  "utf8",
);
const profiles = {
  vend: {
    domain: "vend.bloli.com",
    title: "Vend · Kleine Pause. Frischer Schwung.",
    description:
      "Finde Verkaufsautomaten für Getränke, Snacks und Alltagsbedarf. Mit erfassten Produkten, Zahlungsarten und Öffnungszeiten aus OpenStreetMap.",
    color: "#993e26",
    analyticsToken: null,
  },
  view: {
    domain: "view.bloli.com",
    title: "View · Die nächste Aussicht wartet.",
    description:
      "Entdecke erfasste Aussichtspunkte und Aussichtstürme in den freigeschalteten Ländern. Mit Zugangsdetails und Höhenangaben aus OpenStreetMap.",
    color: "#244c5a",
    analyticsToken: "66e9fa7dd6aa48dea133dfb9a1611a12",
  },
  sights: {
    domain: "sights.bloli.com",
    title: "Sights · Gleich um die Ecke: Geschichte.",
    description:
      "Finde erfasste Sehenswürdigkeiten, Museen, Burgen und Denkmäler in den freigeschalteten Ländern. Mit Öffnungszeiten und Besuchsdetails aus OpenStreetMap.",
    color: "#383b75",
    analyticsToken: null,
  },
  atm: {
    domain: "atm.bloli.com",
    analyticsToken: "19d2b3ccec7048d5a752c81573edef0b",
    title: "ATM · Bargeld in deiner Nähe.",
    description:
      "Finde erfasste Geldautomaten in den freigeschalteten Ländern. Prüfe Zugang, Betreiber, erfasste Währungen und Gebührenangaben aus OpenStreetMap.",
    color: "#162c45",
  },
  stay: {
    domain: "stay.bloli.com",
    analyticsToken: "4f5af3ea8f3642c4a6904f61fafe2018",
    title: "Stay · Die nächste Unterkunft ist nah.",
    description:
      "Finde erfasste Hotels, Pensionen, Hostels und weitere Unterkünfte in den freigeschalteten Ländern. Mit Unterkunftsarten und Details aus OpenStreetMap, ohne Live-Verfügbarkeit oder Buchungspreise.",
    color: "#344963",
  },
  transit: {
    domain: "transit.bloli.com",
    analyticsToken: "f7546bb7f5844f3a8e881c5860103442",
    title: "Transit · Der nächste Halt. Dein nächster Schritt.",
    description:
      "Finde Bahnhöfe, U-Bahn, S-Bahn, Tram, Bus, Taxi, Fähren und Seilbahnen in Deutschland und den freigeschalteten Ländern. Erfasste Haltestellen und Zugänge aus OpenStreetMap.",
    color: "#007b7f",
  },
  water: {
    domain: "water.bloli.com",
    analyticsToken: "a851083a4af84e56a8a4ddbf1952ffaf",
    title: "Water · Kurz auffüllen. Weiter geht’s.",
    description:
      "Finde erfasste Trinkwasserstellen und Refill-Partner in Deutschland und den freigeschalteten Ländern. Mit Gebühren, saisonalen Angaben und Öffnungszeiten aus OpenStreetMap.",
    color: "#1459d9",
  },
  loo: {
    domain: "loo.bloli.com",
    analyticsToken: "e801fcd3a63d4dab89cdf795c0c065df",
    title: "Find a Loo · A little relief, nearby.",
    description:
      "Find public toilets in Germany and other active countries. Search nearby, filter free and paid toilets, and check mapped opening hours.",
    color: "#123f3b",
  },
  kebab: {
    domain: "kebab.bloli.com",
    analyticsToken: "8c9c02f97f134755a37d8e278a57fa17",
    title: "Kebab · Mit allem. Ganz in deiner Nähe.",
    description:
      "Finde Döner- und Kebab-Läden in Deutschland und den freigeschalteten Ländern. Mit erfassten Öffnungszeiten, Mitnahme, Lieferung und Menülinks aus OpenStreetMap.",
    color: "#402b52",
  },
  kippe: {
    domain: "kippe.bloli.com",
    analyticsToken: "a88104d9b5474836b0b83c7c3040667a",
    title: "Kippe · Tobacco sellers around the corner.",
    description:
      "Find cigarette machines, tobacco shops and mapped tobacco sellers in Germany and other active countries. Check seller types, mapped hours and payment details.",
    color: "#b52d3b",
  },
  charge: {
    domain: "charge.bloli.com",
    analyticsToken: "6d0915767d0c4e79ade418897dcc12ff",
    title: "Charge · Find your next plug stop.",
    description:
      "Find mapped car charging stations in Germany and other active countries. Filter by connector, power, access and mapped charging fees.",
    color: "#2448d8",
  },
};
for (const [id, profile] of Object.entries(profiles)) {
  const canonical = `https://${profile.domain}/`;
  const html = template
    .replace(/<html\b[^>]*>/, `<html lang="de" data-site="${id}">`)
    .replace(/<title>[^<]*<\/title>/, `<title>${profile.title}</title>`)
    .replace(
      /<meta name="description"[^>]*>/,
      `<meta name="description" content="${profile.description}"/>`,
    )
    .replace(
      /<meta name="theme-color"[^>]*>/,
      `<meta name="theme-color" content="${profile.color}"/>`,
    )
    .replace(/href="\/favicon.svg"/, `href="/favicon-${id}.svg"`)
    .replace(
      "</head>",
      `<link rel="canonical" href="${canonical}"/><meta property="og:type" content="website"/><meta property="og:title" content="${profile.title}"/><meta property="og:description" content="${profile.description}"/><meta property="og:url" content="${canonical}"/><meta name="twitter:card" content="summary"/></head>`,
    )
    .replace(
      "</body>",
      profile.analyticsToken
        ? `<!-- Cloudflare Web Analytics --><script type='module' src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='${JSON.stringify({ token: profile.analyticsToken })}'></script><!-- End Cloudflare Web Analytics --></body>`
        : "</body>",
    );
  await writeFile(new URL(`../dist/index-${id}.html`, import.meta.url), html);
}
