// Operational events: one JSON line each on stderr, so CLI result lines on
// stdout keep their contract. Callers pass explicit fields; never pass request
// URLs, query parameters, coordinates, headers or raw configuration.
export type LogLevel = "info" | "warn" | "error";
type Value = string | number | boolean | null | undefined;
export type EventFields = Record<
  string,
  Value | Record<string, Value> | SafeError
>;
export interface SafeError {
  name: string;
  code?: string;
  message: string;
  stack?: string[];
}

const MAX_TEXT = 300;
const MAX_FRAMES = 8;
const masks: [
  RegExp,
  string | ((match: string, ...groups: string[]) => string),
][] = [
  // Credentials before URLs so "password=..." inside a query is caught either way.
  [/(bearer\s+)[^\s"',;]+/gi, "$1[redacted]"],
  [
    /((?:authorization|password|passwd|secret|token|api[_-]?key)["']?\s*[:=]\s*["']?)(?:bearer\s+)?[^\s"',;&]+/gi,
    "$1[redacted]",
  ],
  [/\b(?:glc|glsa|gh[pousr])_[A-Za-z0-9_=+/-]+/g, "[redacted]"],
  // Keep scheme, host and path; drop user info, query and fragment.
  [/\b([a-z][a-z0-9+.-]*:\/\/)(?:[^\s/@'"]+@)?([^\s?#'"]*)[^\s'"]*/gi, "$1$2"],
  [/\?[^\s'"]+/g, "?[redacted]"],
  [/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "[ip]"],
  [
    /(?<![\w:])(?:[0-9a-f]{1,4}(?::[0-9a-f]{1,4}){7}|(?:[0-9a-f]{1,4}(?::[0-9a-f]{1,4})*)?::(?:[0-9a-f]{1,4}(?::[0-9a-f]{1,4})*)?)(?![\w:])/gi,
    (match) => (match === "::" ? match : "[ip]"),
  ],
  // Visitor search positions carry many decimals; counts and durations do not.
  [/-?\b\d{1,3}\.\d{4,}\b/g, "[coord]"],
];

export function sanitizeText(text: string, limit = MAX_TEXT) {
  let value = text.replace(/\s*\n\s*/g, " | ");
  for (const [pattern, replacement] of masks)
    value = value.replace(pattern, replacement as string);
  return value.length > limit ? `${value.slice(0, limit)}…` : value;
}

const CODE = /^(?:[0-9A-Z]{5}|[A-Z][A-Z0-9_]{2,63})$/;
export function sanitizeError(error: unknown): SafeError {
  if (!(error instanceof Error))
    return { name: "NonError", message: sanitizeText(String(error)) };
  const code = (error as { code?: unknown }).code;
  const stack = (error.stack || "")
    .split("\n")
    .filter((line) => /^\s+at /.test(line))
    .slice(0, MAX_FRAMES)
    .map((line) => sanitizeText(line.trim(), 200));
  return {
    name: sanitizeText(error.name, 60),
    ...(typeof code === "string" && CODE.test(code) ? { code } : {}),
    message: sanitizeText(error.message),
    ...(stack.length ? { stack } : {}),
  };
}

const REVISION = /^[0-9a-f]{40}$/;
const revision = () =>
  REVISION.test(process.env.BLOLI_REVISION || "")
    ? process.env.BLOLI_REVISION
    : "unknown";
let write = (line: string) => void process.stderr.write(`${line}\n`);

export function logEvent(
  level: LogLevel,
  event: string,
  fields: EventFields = {},
) {
  write(
    JSON.stringify({
      ts: new Date().toISOString(),
      level,
      service: process.env.BLOLI_SERVICE || "app",
      event,
      revision: revision(),
      ...fields,
    }),
  );
}

// Tests read emitted events instead of the process stream.
export function captureEvents() {
  const lines: string[] = [];
  const previous = write;
  write = (line) => void lines.push(line);
  return {
    events: () => lines.map((line) => JSON.parse(line)),
    restore: () => {
      write = previous;
    },
  };
}
