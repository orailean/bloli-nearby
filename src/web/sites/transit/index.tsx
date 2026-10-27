import {
  TrainFront,
  BusFront,
  TramFront,
  Ship,
  Car,
  Navigation,
  Route,
} from "lucide-react";
import {
  TRANSIT_MODES,
  type TransitMode,
} from "../../../shared/transit-modes.js";
import type { Content, FilterProps, ItemProps } from "../types.js";
export const Icon = TrainFront;
const icons = {
  train: TrainFront,
  suburban_rail: TrainFront,
  subway: TrainFront,
  tram: TramFront,
  light_rail: TramFront,
  bus: BusFront,
  trolleybus: BusFront,
  taxi: Car,
  ferry: Ship,
  cable: Navigation,
  funicular: TrainFront,
  other_rail: TrainFront,
  other: Route,
};
const label = (mode: TransitMode, t: Content) => t[`mode_${mode}`];
export function Artwork({ t }: { t: Content }) {
  return (
    <div className="hero-art transit-art" aria-hidden="true">
      <svg className="transit-scene" viewBox="0 0 400 320" fill="none">
        <path
          d="M25 267h128q30 0 30-30V69q0-22 22-22h170"
          stroke="#007b7f"
          strokeWidth="13"
          strokeLinecap="round"
        />
        <path
          d="M55 96h68q24 0 24 24v125q0 22 24 22h190"
          stroke="#d94a16"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <g fill="#fff" stroke="#172d35" strokeWidth="5">
          <circle cx="55" cy="96" r="11" />
          <circle cx="183" cy="180" r="11" />
          <circle cx="350" cy="47" r="11" />
          <circle cx="340" cy="267" r="11" />
        </g>
        <g className="transit-vehicle">
          <rect
            x="217"
            y="99"
            width="126"
            height="133"
            rx="25"
            fill="#fff"
            stroke="#172d35"
            strokeWidth="5"
          />
          <rect x="230" y="112" width="100" height="23" rx="6" fill="#172d35" />
          <text
            x="280"
            y="129"
            textAnchor="middle"
            fill="#fff"
            fontSize="15"
            fontFamily="sans-serif"
          >
            transit
          </text>
          <path d="M230 148h100v43H230z" fill="#c9ecec" />
          <path d="M280 148v43" stroke="#172d35" strokeWidth="4" />
          <path
            d="M220 201h120v15q0 13-15 13h-90q-15 0-15-13z"
            fill="#d94a16"
          />
          <circle cx="240" cy="210" r="7" fill="#ffe7a8" />
          <circle cx="320" cy="210" r="7" fill="#ffe7a8" />
          <path
            d="M248 236l-9 16m73-16 9 16"
            stroke="#172d35"
            strokeWidth="6"
            strokeLinecap="round"
          />
        </g>
        <path d="M68 28h59v31H68z" fill="#ffe7a8" />
        <path
          d="M81 43h32"
          stroke="#172d35"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>
      <span className="art-caption">{t.sticker}</span>
    </div>
  );
}
export function Filters({ t, mode, onMode }: FilterProps) {
  return (
    <label className="transit-mode-control">
      <Route size={19} />
      <span>{t.mode}</span>
      <select
        value={mode ?? "all"}
        onChange={(e) => onMode?.(e.target.value as TransitMode | "all")}
        aria-label={t.mode}
      >
        <option value="all">{t.all}</option>
        {TRANSIT_MODES.map((m) => (
          <option key={m} value={m}>
            {label(m, t)}
          </option>
        ))}
      </select>
    </label>
  );
}
export function Summary({ item, t }: ItemProps) {
  return (
    <span className="transit-badges">
      {(item.transit?.modes || []).map((mode) => {
        const ModeIcon = icons[mode];
        return (
          <span className={`transit-badge mode-${mode}`} key={mode}>
            <ModeIcon size={13} />
            {label(mode, t)}
          </span>
        );
      })}
    </span>
  );
}
export function DetailFields({ item, t }: ItemProps) {
  const d = item.transit;
  if (!d) return null;
  return (
    <>
      <div>
        <dt>{t.network}</dt>
        <dd>{d.network || t.unknown}</dd>
      </div>
      {d.routes.length > 0 && (
        <div>
          <dt>{t.mappedLines}</dt>
          <dd className="transit-lines">
            {d.routes
              .filter((r) => r.ref)
              .map((r) => (
                <span key={r.id}>
                  {r.ref}
                  {r.network ? ` (${r.network})` : ""}
                </span>
              ))}
            {d.linesTruncated && <span>{t.moreLines}</span>}
          </dd>
        </div>
      )}
      <div>
        <dt>{t.chosenAccess}</dt>
        <dd>{d.localRef || d.componentId || item.id}</dd>
      </div>
      {d.components && d.components.length > 1 && (
        <div>
          <dt>{t.platforms}</dt>
          <dd className="transit-components">
            {d.components.map((c) => (
              <span key={c.id}>
                {c.ref || c.name || c.id} ·{" "}
                {c.modes.map((m) => label(m, t)).join(", ")}
              </span>
            ))}
            {d.componentCount && d.componentCount > d.components.length ? (
              <span>+{d.componentCount - d.components.length}</span>
            ) : null}
          </dd>
        </div>
      )}
      {d.groupId && (
        <div>
          <dt>{t.groupSource}</dt>
          <dd>
            <a
              href={`https://www.openstreetmap.org/${d.groupId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {d.groupName || d.groupId}
            </a>
          </dd>
        </div>
      )}
      {d.approximate && (
        <div className="transit-approximate">
          <dd>
            {d.directionsAvailable === false
              ? t.referenceOnly
              : t.approximateTarget}
          </dd>
        </div>
      )}
    </>
  );
}
