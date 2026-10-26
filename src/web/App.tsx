import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronUp,
  Coins,
  Compass,
  ExternalLink,
  Footprints,
  Globe2,
  Heart,
  LocateFixed,
  MapPin,
  Navigation,
  Search,
  ShieldCheck,
  Smile,
  Toilet,
  Wallet,
  X,
  Accessibility,
  Clock,
  RefreshCw,
} from "lucide-react";
import type {
  AppConfig,
  Dataset,
  Facility,
  FeeFilter,
  Locale,
  SearchResponse,
  Settlement,
} from "../shared/types.js";
import {
  dictionaries,
  chooseLocale,
  formatDistance,
  type TranslationKey,
} from "./i18n.js";
import MapView from "./Map.js";
import Details from "./Details.js";
import "./styles.css";
const quickPlaces = [
  { name: "München", lat: 48.1391, lon: 11.4729 },
  { name: "Berlin", lat: 52.52, lon: 13.405 },
  { name: "Hamburg", lat: 53.5511, lon: 9.9937 },
  { name: "Bremen", lat: 53.0758, lon: 8.8072 },
];
async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  const r = await fetch(path, { signal });
  const body = await r.json();
  if (!r.ok) throw new Error(body.error || "SERVICE_UNAVAILABLE");
  return body;
}
function initialLocale() {
  let saved = null;
  try {
    saved = localStorage.getItem("loo.language");
  } catch {}
  return chooseLocale(saved, navigator.languages);
}
interface Origin {
  lat: number;
  lon: number;
  name: string;
  kind?: "locationName" | "mapLocation";
}
export default function App() {
  const [locale, setLocale] = useState<Locale>(initialLocale),
    [config, setConfig] = useState<AppConfig | null>(null),
    [configError, setConfigError] = useState(false),
    [dataset, setDataset] = useState<Dataset | null>(null);
  const [origin, setOrigin] = useState<Origin | null>(null),
    [fee, setFee] = useState<FeeFilter>("all"),
    [radius, setRadius] = useState(2000),
    [items, setItems] = useState<Facility[]>([]),
    [selected, setSelected] = useState<string | null>(null),
    [truncated, setTruncated] = useState(false);
  const [query, setQuery] = useState(""),
    [places, setPlaces] = useState<Settlement[]>([]),
    [placeLoading, setPlaceLoading] = useState(false),
    [loading, setLoading] = useState(false),
    [feedback, setFeedback] = useState<TranslationKey | null>(null),
    [searchError, setSearchError] = useState<TranslationKey | null>(null),
    [locating, setLocating] = useState(false),
    [tileError, setTileError] = useState(false),
    [sheetOpen, setSheetOpen] = useState(true),
    [retry, setRetry] = useState(0),
    [dialog, setDialog] = useState<"how" | "privacy" | null>(null);
  const locationRequest = useRef(0);
  const mapCenter = useRef({ lat: 51.15, lon: 10.45 }),
    placeRequest = useRef<AbortController | null>(null),
    dialogRef = useRef<HTMLDialogElement>(null),
    searchInput = useRef<HTMLInputElement>(null),
    resultsPane = useRef<HTMLDivElement>(null);
  const t = dictionaries[locale];
  const errorKey = (e: unknown): TranslationKey =>
    e instanceof Error && Object.hasOwn(dictionaries.en, e.message)
      ? (e.message as TranslationKey)
      : "SERVICE_UNAVAILABLE";
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  useEffect(() => {
    const c = new AbortController();
    request<AppConfig>("/api/config", c.signal)
      .then(setConfig)
      .catch((e) => {
        if (e.name !== "AbortError") setConfigError(true);
      });
    request<Dataset>("/api/status", c.signal)
      .then(setDataset)
      .catch((e) => {
        if (e.name !== "AbortError") setFeedback("statusError");
      });
    return () => c.abort();
  }, [retry]);
  useEffect(() => {
    if (!origin) return;
    const c = new AbortController();
    setLoading(true);
    setSearchError(null);
    setItems([]);
    setSelected(null);
    setTruncated(false);
    request<SearchResponse>(
      `/api/toilets?${new URLSearchParams({ lat: String(origin.lat), lon: String(origin.lon), fee, radius: String(radius) })}`,
      c.signal,
    )
      .then((r) => {
        setItems(r.items);
        setDataset((old) => ({
          ...r.dataset,
          latestJob: old?.latestJob ?? null,
        }));
        setTruncated(r.truncated);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setSearchError(errorKey(e));
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [origin?.lat, origin?.lon, fee, radius, retry]);
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (dialog && !d.open) d.showModal();
    if (!dialog && d.open) d.close();
  }, [dialog]);
  useEffect(() => () => placeRequest.current?.abort(), []);
  function choose(next: Origin) {
    locationRequest.current++;
    setLocating(false);
    placeRequest.current?.abort();
    setPlaceLoading(false);
    setOrigin(next);
    setPlaces([]);
    setFeedback(null);
    setSheetOpen(true);
  }
  async function searchPlaces(event: React.FormEvent) {
    event.preventDefault();
    placeRequest.current?.abort();
    if (query.trim().length < 2) {
      setFeedback("INVALID_QUERY");
      searchInput.current?.focus();
      return;
    }
    const c = new AbortController();
    placeRequest.current = c;
    setPlaceLoading(true);
    setFeedback(null);
    setPlaces([]);
    try {
      const r = await request<{ items: Settlement[] }>(
        `/api/settlements?q=${encodeURIComponent(query.trim())}`,
        c.signal,
      );
      setPlaces(r.items);
      if (!r.items.length) setFeedback("noMatches");
    } catch (e) {
      if (!(e instanceof Error && e.name === "AbortError"))
        setFeedback(errorKey(e));
    } finally {
      if (!c.signal.aborted) setPlaceLoading(false);
    }
  }
  function changeLocale(next: Locale) {
    setLocale(next);
    try {
      localStorage.setItem("loo.language", next);
    } catch {}
  }
  function locate() {
    if (!navigator.geolocation) {
      setFeedback("locationDenied");
      return;
    }
    const locationToken = ++locationRequest.current;
    setLocating(true);
    setFeedback(null);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        if (locationToken !== locationRequest.current) return;
        setLocating(false);
        choose({
          lat: p.coords.latitude,
          lon: p.coords.longitude,
          name: "",
          kind: "locationName",
        });
      },
      () => {
        if (locationToken !== locationRequest.current) return;
        setLocating(false);
        setFeedback("locationDenied");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }
  useEffect(() => {
    const pane = resultsPane.current;
    if (!pane || !selected) return;
    const row = pane.querySelector<HTMLElement>(
      `[data-id="${CSS.escape(selected)}"]`,
    );
    if (!row) return;
    const top =
      pane.scrollTop +
      row.getBoundingClientRect().top -
      pane.getBoundingClientRect().top;
    pane.scrollTo({
      top,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }, [selected]);
  function select(id: string) {
    setSelected((old) => (old === id ? null : id));
    setSheetOpen(true);
  }
  const title = origin
    ? origin.kind
      ? t[origin.kind]
      : origin.name
    : t.germany;
  return (
    <>
      <a className="skip-link" href="#finder">
        {t.skip}
      </a>
      <header className="site-header">
        <div className="header-inner">
          <a href="#" className="brand" aria-label="Find a Loo">
            <span className="brand-mark">
              <Toilet size={25} aria-hidden="true" />
            </span>
            <span translate="no">
              find a loo<span className="brand-dot">.</span>
            </span>
          </a>
          <nav aria-label={t.find}>
            <a href="#finder" className="nav-finder">
              {t.find}
            </a>
            <button className="nav-how" onClick={() => setDialog("how")}>
              {t.how}
            </button>
          </nav>
          <div className="language-control">
            <Globe2 size={17} aria-hidden="true" />
            <label className="sr-only" htmlFor="language">
              {t.language}
            </label>
            <select
              id="language"
              value={locale}
              onChange={(e) => changeLocale(e.target.value as Locale)}
            >
              <option value="en">English</option>
              <option value="de">Deutsch</option>
              <option value="ro">Română</option>
            </select>
            <ChevronDown size={14} aria-hidden="true" />
          </div>
        </div>
      </header>
      <main>
        <section className="hero shell" aria-labelledby="hero-title">
          <div className="hero-copy">
            <div className="country-tag">
              <span className="country-dot" />
              {t.germany}
            </div>
            <h1 id="hero-title">{t.hero}</h1>
            <p>{t.intro}</p>
            <div className="hero-assurance">
              <ShieldCheck size={17} aria-hidden="true" />
              {t.noAccount}
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="route-doodle">
              <span />
              <span />
              <span />
            </div>
            <div className="roll-character">
              <div className="roll-end">
                <i />
              </div>
              <div className="roll-front">
                <div className="roll-eyes">
                  <i />
                  <i />
                </div>
                <div className="roll-smile" />
              </div>
              <div className="paper-tail">
                <div className="tear-line" />
                <Toilet size={32} />
              </div>
            </div>
            <span className="art-caption">
              {t.sticker}
              <ArrowDown size={20} />
            </span>
            <span className="little-spark spark-one">✳</span>
            <span className="little-spark spark-two">✳</span>
          </div>
        </section>
        <section id="finder" className="finder shell" aria-label={t.find}>
          <div className="search-dock">
            <form onSubmit={searchPlaces} className="town-search">
              <Search size={22} aria-hidden="true" />
              <div className="input-wrap">
                <label htmlFor="town">{t.searchLabel}</label>
                <input
                  id="town"
                  name="town"
                  ref={searchInput}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPlaces([]);
                    placeRequest.current?.abort();
                    setPlaceLoading(false);
                  }}
                  placeholder={t.searchPlaceholder}
                  autoComplete="off"
                  maxLength={80}
                />
              </div>
              <button
                className="search-submit"
                type="submit"
                disabled={placeLoading}
                aria-label={t.search}
              >
                {placeLoading ? (
                  <RefreshCw size={20} className="busy" />
                ) : (
                  <ArrowUpRight size={22} />
                )}
              </button>
            </form>
            <button
              className={`locate-button ${locating ? "is-locating" : ""}`}
              onClick={locate}
              disabled={locating}
            >
              <LocateFixed size={21} aria-hidden="true" />
              {locating ? t.locating : t.locate}
            </button>
            {places.length > 0 && (
              <div className="place-options">
                {places.map((p) => (
                  <button
                    key={p.id}
                    className="place-option"
                    onClick={() =>
                      choose({
                        lat: p.lat,
                        lon: p.lon,
                        name: p.names[locale] || p.name,
                      })
                    }
                  >
                    <MapPin size={18} aria-hidden="true" />
                    <span>
                      <strong>{p.names[locale] || p.name}</strong>
                      <small>
                        {[
                          p.postcode,
                          p.region ||
                            (p.nearCity
                              ? `${t.nearCity} ${p.nearCity}`
                              : `${p.lat.toFixed(3)}, ${p.lon.toFixed(3)}`),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </small>
                    </span>
                    <ArrowUpRight size={17} aria-hidden="true" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="quick-places">
            <span>{t.choosePoint}</span>
            {quickPlaces.map((p) => (
              <button key={p.name} onClick={() => choose(p)}>
                {p.name}
                <ArrowUpRight size={12} aria-hidden="true" />
              </button>
            ))}
          </div>
          <div
            id="feedback"
            className={`notice ${feedback ? "" : "notice-empty"}`}
            role="status"
          >
            {feedback && t[feedback]}
          </div>
          {dataset && !dataset.ready && (
            <div className="notice warning" aria-live="polite">
              {t.DATA_NOT_READY}
              <button onClick={() => setRetry((n) => n + 1)}>{t.retry}</button>
            </div>
          )}
          {dataset?.stale && <div className="notice warning">{t.stale}</div>}
          {dataset?.latestJob?.status === "failed" && (
            <div className="notice warning">{t.refreshFailed}</div>
          )}
          <div className="workspace">
            <div className="workspace-toolbar">
              <div className="fee-filters" role="group" aria-label={t.fee}>
                {(["all", "free", "paid"] as const).map((f) => (
                  <button
                    key={f}
                    aria-pressed={fee === f}
                    className={fee === f ? "active" : ""}
                    onClick={() => setFee(f)}
                  >
                    {f === "all" ? (
                      <Toilet size={16} />
                    ) : f === "free" ? (
                      <Smile size={16} />
                    ) : (
                      <Coins size={16} />
                    )}
                    <span>{t[f]}</span>
                  </button>
                ))}
              </div>
              <label className="radius-control">
                {t.radius}
                <select
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                >
                  {[2000, 5000, 10000, 25000, 50000].map((r) => (
                    <option key={r} value={r}>
                      {new Intl.NumberFormat(locale).format(r / 1000)} km
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className={`workspace-body ${sheetOpen ? "sheet-open" : ""}`}>
              <aside className="results-pane" aria-label={t.nearby}>
                <button
                  className="sheet-toggle"
                  onClick={() => setSheetOpen(!sheetOpen)}
                  aria-expanded={sheetOpen}
                  aria-label={sheetOpen ? t.hideResults : t.showResults}
                >
                  <span className="sheet-handle" />
                  {sheetOpen ? (
                    <ChevronDown size={18} />
                  ) : (
                    <ChevronUp size={18} />
                  )}
                </button>
                <div className="results-heading">
                  <div>
                    <h2>{t.nearby}</h2>
                    <p>{origin ? title : t.germany}</p>
                  </div>
                  <span className="results-count">
                    {loading ? "…" : items.length}
                  </span>
                </div>
                <div
                  ref={resultsPane}
                  className="results-content"
                  aria-busy={loading}
                >
                  {loading ? (
                    <div className="empty-state loading-state">
                      <Footprints
                        size={40}
                        className="dash-feet"
                        aria-hidden="true"
                      />
                      <p>{t.loading}</p>
                    </div>
                  ) : searchError ? (
                    <div className="empty-state">
                      <Compass size={40} aria-hidden="true" />
                      <h3>{t[searchError]}</h3>
                      <button
                        className="text-button"
                        onClick={() => setRetry((n) => n + 1)}
                      >
                        {t.retry}
                      </button>
                    </div>
                  ) : !origin ? (
                    <div className="empty-state">
                      <div className="empty-icon">
                        <Toilet size={34} aria-hidden="true" />
                      </div>
                      <h3>{t.start}</h3>
                      <p>{t.startHint}</p>
                    </div>
                  ) : items.length === 0 && dataset?.ready ? (
                    <div className="empty-state">
                      <Compass size={42} aria-hidden="true" />
                      <h3>{t.empty}</h3>
                      <p>{t.emptyHint}</p>
                      {radius < 50000 && (
                        <button
                          className="text-button"
                          onClick={() => setRadius(Math.min(50000, radius * 2))}
                        >
                          {t.expand}
                          <ArrowUpRight size={16} />
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      <p className="distance-note">{t.distanceNote}</p>
                      <ol className="result-list">
                        {items.map((item, index) => (
                          <li
                            key={item.id}
                            data-id={item.id}
                            className={`result-row ${selected === item.id ? "selected" : ""}`}
                          >
                            <button
                              className="result-select"
                              aria-expanded={selected === item.id}
                              onClick={() => select(item.id)}
                            >
                              <span className={`result-number ${item.fee}`}>
                                {index + 1}
                              </span>
                              <span className="result-info">
                                <strong>
                                  {item.names[locale] ||
                                    item.name ||
                                    t.fallbackName}
                                </strong>
                                <span className="result-meta">
                                  <span className={`fee-badge ${item.fee}`}>
                                    {
                                      t[
                                        item.fee === "unknown"
                                          ? "feeUnknown"
                                          : item.fee === "free"
                                            ? "freeBadge"
                                            : "paidBadge"
                                      ]
                                    }
                                  </span>
                                  {item.wheelchair === "yes" && (
                                    <Accessibility
                                      size={14}
                                      aria-label={t.wheelchair}
                                    />
                                  )}
                                </span>
                              </span>
                              <span className="result-distance">
                                {formatDistance(item.distance ?? 0, locale)}
                                <ChevronDown size={16} aria-hidden="true" />
                              </span>
                            </button>
                            {selected === item.id && (
                              <Details
                                item={item}
                                locale={locale}
                                datasetAt={dataset?.datasetAt ?? null}
                              />
                            )}
                          </li>
                        ))}
                      </ol>
                      {truncated && <p className="notice">{t.truncated}</p>}
                    </>
                  )}
                </div>
                <div className="dataset-line">
                  <span className="status-dot" />
                  {dataset?.datasetAt
                    ? `${t.dataset} ${new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(new Date(dataset.datasetAt))}`
                    : t.countryOnly}
                </div>
              </aside>
              <div className="map-pane">
                {config ? (
                  <MapView
                    config={config}
                    items={items}
                    origin={origin}
                    selected={selected}
                    locale={locale}
                    onSelect={select}
                    onPoint={(lat, lon) =>
                      choose({ lat, lon, name: "", kind: "mapLocation" })
                    }
                    onMove={(lat, lon) => {
                      mapCenter.current = { lat, lon };
                    }}
                    onError={setTileError}
                  />
                ) : (
                  <div className="map-placeholder">
                    <MapPin size={40} aria-hidden="true" />
                    {configError ? t.mapUnavailable : t.loading}
                  </div>
                )}
                <div className="map-topline">
                  <span>
                    <MapPin size={16} aria-hidden="true" />
                    {title}
                  </span>
                  <button
                    onClick={() =>
                      choose({
                        ...mapCenter.current,
                        name: "",
                        kind: "mapLocation",
                      })
                    }
                  >
                    <Search size={15} aria-hidden="true" />
                    {t.searchHere}
                  </button>
                </div>
                {(tileError || configError) && (
                  <div className="tile-notice" aria-live="polite">
                    {configError ? t.mapUnavailable : t.tileError}
                  </div>
                )}
                <div className="map-help">
                  <span>
                    <Navigation size={13} aria-hidden="true" />
                    {t.mapHint}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="how-strip shell" aria-label={t.how}>
          <div>
            <LocateFixed size={23} aria-hidden="true" />
            <span>{t.how1}</span>
          </div>
          <span className="strip-dots" aria-hidden="true" />
          <div>
            <Toilet size={23} aria-hidden="true" />
            <span>{t.how2}</span>
          </div>
          <span className="strip-dots" aria-hidden="true" />
          <div>
            <Footprints size={23} aria-hidden="true" />
            <span>{t.how3}</span>
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <div className="shell footer-main">
          <div>
            <a href="#" className="brand footer-brand">
              <span className="brand-mark">
                <Toilet size={24} aria-hidden="true" />
              </span>
              <span translate="no">find a loo.</span>
            </a>
            <p>{t.footerText}</p>
          </div>
          <h2>{t.footerTitle}</h2>
          <div className="footer-links">
            <button onClick={() => setDialog("how")}>
              {t.how}
              <ArrowUpRight size={16} />
            </button>
            <button onClick={() => setDialog("privacy")}>
              {t.privacy}
              <ArrowUpRight size={16} />
            </button>
            <a
              href={
                config?.contactEmail
                  ? `mailto:${config.contactEmail}`
                  : "https://github.com/orailean/find-a-loo/issues"
              }
              target={config?.contactEmail ? undefined : "_blank"}
              rel="noopener noreferrer"
            >
              {t.contact}
              <ArrowUpRight size={16} />
            </a>
            <a
              href="https://www.openstreetmap.org/fixthemap"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t.report}
              <ArrowUpRight size={16} />
            </a>
          </div>
        </div>
        <div className="shell footer-bottom">
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.credits}
          </a>
          <span>
            <Heart size={13} aria-hidden="true" />
            {t.comfort}
          </span>
          <span>Deutsch / English / Română</span>
        </div>
      </footer>
      <dialog
        ref={dialogRef}
        className="info-dialog"
        onCancel={() => setDialog(null)}
        onClose={() => setDialog(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setDialog(null);
        }}
        aria-labelledby="dialog-title"
      >
        <div className="dialog-inner">
          <button
            className="dialog-close"
            onClick={() => setDialog(null)}
            aria-label={t.close}
          >
            <X size={22} />
          </button>
          <span className="dialog-symbol">
            {dialog === "how" ? (
              <Toilet size={30} />
            ) : (
              <ShieldCheck size={30} />
            )}
          </span>
          <h2 id="dialog-title">
            {dialog === "how" ? t.howTitle : t.privacyTitle}
          </h2>
          {dialog === "how" ? (
            <ol className="how-steps">
              {[1, 2, 3].map((n) => (
                <li key={n}>
                  <span>{n}</span>
                  <div>
                    <h3>{t[`how${n}` as TranslationKey]}</h3>
                    <p>{t[`how${n}Text` as TranslationKey]}</p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <>
              <p>{t.privacyText}</p>
              <p className="fineprint">{t.dataLicense}</p>
              <a
                href="https://osmfoundation.org/wiki/Privacy_Policy"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t.privacyLink}
                <ExternalLink size={14} />
              </a>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}
