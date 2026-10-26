import { readFile, writeFile } from "node:fs/promises";
const template = await readFile(
  new URL("../dist/index.html", import.meta.url),
  "utf8",
);
const profiles = {
  loo: {
    title: "Find a Loo · A little relief, nearby.",
    description:
      "Find public toilets across Germany. Search nearby, filter free and paid toilets, and check mapped opening hours.",
    color: "#123f3b",
  },
  kippe: {
    title: "Kippe · Tobacco sellers around the corner.",
    description:
      "Find cigarette machines, tobacco shops and explicitly mapped tobacco sellers across Germany. Check seller types, mapped hours and payment details.",
    color: "#b52d3b",
  },
};
for (const [id, profile] of Object.entries(profiles)) {
  const canonical = `https://${id}.bloli.com/`;
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
