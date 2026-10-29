const extraLatin = new Map([
  ["ß", "ss"],
  ["æ", "ae"],
  ["œ", "oe"],
  ["ø", "o"],
  ["ł", "l"],
  ["đ", "d"],
  ["ð", "d"],
  ["þ", "th"],
  ["ħ", "h"],
  ["ı", "i"],
]);

export function normalizeSettlementSearch(value: string) {
  return Array.from(value.normalize("NFKD").toLowerCase())
    .map((character) => extraLatin.get(character) ?? character)
    .join("")
    .replace(/\p{M}/gu, "");
}
