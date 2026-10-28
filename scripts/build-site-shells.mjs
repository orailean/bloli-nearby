import { readFile, writeFile } from "node:fs/promises";
const template = await readFile(
  new URL("../dist/index.html", import.meta.url),
  "utf8",
);
const profiles = {
  transit: {
    domain: "transit.bloli.com",
    title: "Transit · Der nächste Halt. Dein nächster Schritt.",
    description:
      "Finde Bahnhöfe, U-Bahn, S-Bahn, Tram, Bus, Taxi, Fähren und Seilbahnen in Deutschland und den freigeschalteten Ländern. Erfasste Haltestellen und Zugänge aus OpenStreetMap.",
    color: "#007b7f",
  },
  water: {
    domain: "water.bloli.com",
    title: "Water · Kurz auffüllen. Weiter geht’s.",
    description:
      "Finde erfasste Trinkwasserstellen und Refill-Partner in Deutschland und den freigeschalteten Ländern. Mit Gebühren, saisonalen Angaben und Öffnungszeiten aus OpenStreetMap.",
    color: "#1459d9",
  },
  loo: {
    domain: "loo.bloli.com",
    title: "Find a Loo · A little relief, nearby.",
    description:
      "Find public toilets in Germany and other active countries. Search nearby, filter free and paid toilets, and check mapped opening hours.",
    color: "#123f3b",
  },
  kebab: {
    domain: "kebab.bloli.com",
    title: "Kebab · Mit allem. Ganz in deiner Nähe.",
    description:
      "Finde Döner- und Kebab-Läden in Deutschland und den freigeschalteten Ländern. Mit erfassten Öffnungszeiten, Mitnahme, Lieferung und Menülinks aus OpenStreetMap.",
    color: "#402b52",
  },
  kippe: {
    domain: "kippe.bloli.com",
    title: "Kippe · Tobacco sellers around the corner.",
    description:
      "Find cigarette machines, tobacco shops and mapped tobacco sellers in Germany and other active countries. Check seller types, mapped hours and payment details.",
    color: "#b52d3b",
  },
  charge: {
    domain: "charge.bloli.com",
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
    );
  await writeFile(new URL(`../dist/index-${id}.html`, import.meta.url), html);
}
