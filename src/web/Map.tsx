import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { AppConfig, Facility, Locale } from "../shared/types.js";
import { dictionaries } from "./i18n.js";
interface Props {
  config: AppConfig;
  items: Facility[];
  origin: { lat: number; lon: number } | null;
  selected: string | null;
  locale: Locale;
  onSelect: (id: string) => void;
  onPoint: (lat: number, lon: number) => void;
  onMove: (lat: number, lon: number) => void;
  onError: (failed: boolean) => void;
}
export default function MapView({
  config,
  items,
  origin,
  selected,
  locale,
  onSelect,
  onPoint,
  onMove,
  onError,
}: Props) {
  const element = useRef<HTMLDivElement>(null),
    map = useRef<L.Map | null>(null),
    markers = useRef<L.LayerGroup | null>(null),
    originMarker = useRef<L.CircleMarker | null>(null);
  const callbacks = useRef({ onSelect, onPoint, onMove, onError });
  callbacks.current = { onSelect, onPoint, onMove, onError };
  const previousSelection = useRef<string | null>(null);
  const t = dictionaries[locale];
  useEffect(() => {
    if (!element.current) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const m = L.map(element.current, {
      zoomAnimation: !reduce,
      fadeAnimation: !reduce,
      markerZoomAnimation: !reduce,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
    }).setView([51.15, 10.45], 6);
    map.current = m;
    const keyboardPan = (event: KeyboardEvent) => {
      if (
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        event.target !== m.getContainer()
      )
        return;
      const offsets: Record<string, [number, number]> = {
        ArrowLeft: [-80, 0],
        ArrowRight: [80, 0],
        ArrowUp: [0, -80],
        ArrowDown: [0, 80],
      };
      const offset = offsets[event.key];
      if (!offset || event.ctrlKey || event.metaKey || event.altKey) return;
      event.preventDefault();
      event.stopPropagation();
      m.panBy(
        [
          offset[0] * (event.shiftKey ? 3 : 1),
          offset[1] * (event.shiftKey ? 3 : 1),
        ],
        { animate: false },
      );
    };
    m.getContainer().addEventListener("keydown", keyboardPan);
    L.control.zoom({ position: "bottomright" }).addTo(m);
    m.on("click", (e) => callbacks.current.onPoint(e.latlng.lat, e.latlng.lng));
    m.on("moveend", () => {
      const c = m.getCenter();
      callbacks.current.onMove(c.lat, c.lng);
    });
    markers.current = L.layerGroup().addTo(m);
    const resize = new ResizeObserver(() => m.invalidateSize());
    resize.observe(element.current);
    return () => {
      resize.disconnect();
      m.getContainer().removeEventListener("keydown", keyboardPan);
      m.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    // Attribution uses text nodes, not operator-supplied HTML.
    const attribution = L.control
      .attribution({ prefix: false, position: "bottomleft" })
      .addTo(m);
    const link = document.createElement("a");
    link.href = "https://www.openstreetmap.org/copyright";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = config.tileAttribution;
    attribution.getContainer()!.append(link);
    const tiles = L.tileLayer(config.tileUrl, {
      maxZoom: config.tileMaxZoom,
      updateWhenIdle: true,
      updateWhenZooming: false,
      keepBuffer: 0,
      noWrap: true,
      referrerPolicy: "strict-origin-when-cross-origin",
    }).addTo(m);
    let errors = false;
    tiles.on("loading", () => {
      errors = false;
    });
    tiles.on("tileerror", () => {
      errors = true;
      callbacks.current.onError(true);
    });
    tiles.on("load", () => {
      if (!errors) callbacks.current.onError(false);
    });
    return () => {
      tiles.remove();
      attribution.remove();
    };
  }, [config.tileUrl, config.tileMaxZoom, config.tileAttribution]);
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const buttons = element.current?.querySelectorAll<HTMLAnchorElement>(
      ".leaflet-control-zoom a",
    );
    buttons?.[0]?.setAttribute("aria-label", t.zoomIn);
    buttons?.[1]?.setAttribute("aria-label", t.zoomOut);
  }, [t]);
  useEffect(() => {
    if (!map.current || !origin) return;
    const m = map.current;
    originMarker.current?.remove();
    originMarker.current = L.circleMarker([origin.lat, origin.lon], {
      radius: 8,
      color: "#fff",
      weight: 3,
      fillColor: "#287aab",
      fillOpacity: 1,
    }).addTo(m);
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    m.setView([origin.lat, origin.lon], Math.max(m.getZoom(), 14), {
      animate: !reduce,
      duration: 0.35,
    });
  }, [origin?.lat, origin?.lon]);
  useEffect(() => {
    const group = markers.current,
      m = map.current;
    if (!group || !m) return;
    const focusedId = element.current?.querySelector<HTMLElement>(
      ".leaflet-marker-icon:focus",
    )?.dataset.facilityId;
    const selectionChanged = previousSelection.current !== selected;
    previousSelection.current = selected;
    group.clearLayers();
    items.forEach((item, index) => {
      const pin = document.createElement("span");
      pin.className = `map-pin ${item.fee} ${item.id === selected ? "active" : ""}`;
      pin.textContent = String(index + 1);
      const marker = L.marker([item.lat, item.lon], {
        icon: L.divIcon({
          html: pin,
          className: "pin-wrapper",
          iconSize: [34, 42],
          iconAnchor: [17, 40],
        }),
        title: item.names[locale] || item.name || t.fallbackName,
        alt: item.names[locale] || item.name || t.fallbackName,
        keyboard: true,
        zIndexOffset: item.id === selected ? 1000 : 0,
      });
      marker.on("click", () => callbacks.current.onSelect(item.id));
      marker.addTo(group);
      const markerElement = marker.getElement();
      if (markerElement) {
        markerElement.dataset.facilityId = item.id;
        markerElement.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            event.stopPropagation();
            callbacks.current.onSelect(item.id);
          }
        });
        if (focusedId === item.id) markerElement.focus({ preventScroll: true });
      }
      if (item.id === selected) {
        const icon = marker.getElement();
        icon?.setAttribute(
          "aria-label",
          `${t.selected}: ${item.names[locale] || item.name || t.fallbackName}`,
        );
        if (selectionChanged && !m.getBounds().contains(marker.getLatLng()))
          m.panTo(marker.getLatLng(), {
            animate: !window.matchMedia("(prefers-reduced-motion: reduce)")
              .matches,
          });
      }
    });
  }, [items, selected, locale, t]);
  return (
    <div
      ref={element}
      className="leaflet-map"
      role="region"
      aria-label={t.map}
    />
  );
}
