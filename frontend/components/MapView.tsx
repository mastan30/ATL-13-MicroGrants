'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { CircleMarker, LayerGroup, Map as LeafletMap } from 'leaflet';
import { AnchorPoint, BusinessDecision } from '@/types/scenario';
import { formatInt } from '@/lib/format';

type Leaflet = typeof import('leaflet');

interface MapViewProps {
  anchor: AnchorPoint;
  businesses: BusinessDecision[];
  /** Business whose cascade is drawn: the hovered one, else the selected one. */
  highlightId: string | null;
  selectedId: string | null;
  onHoverBusiness: (biz: BusinessDecision | null, pos: { x: number; y: number } | null) => void;
  onSelectBusiness: (biz: BusinessDecision) => void;
}

const COLORS = {
  funded: '#1f6f6b',
  exposed: '#d98c1c',
  idle: '#9aa8ab',
  footfall: '#c2364b',
  supply: '#12343b',
};

function markerStyle(biz: BusinessDecision, state: 'normal' | 'focus' | 'dim') {
  const base =
    biz.status === 'funded'
      ? { radius: Math.max(9, Math.min(17, 6 + biz.amount / 1500)), color: '#ffffff', fillColor: COLORS.funded, fillOpacity: 0.95, weight: 2 }
      : biz.status === 'exposed_not_funded'
        ? { radius: 8, color: '#ffffff', fillColor: COLORS.exposed, fillOpacity: 0.95, weight: 2 }
        : { radius: 5, color: '#ffffff', fillColor: COLORS.idle, fillOpacity: 0.9, weight: 1.5 };
  if (state === 'focus') return { ...base, radius: base.radius + 3, weight: 3, color: COLORS.supply };
  if (state === 'dim') return { ...base, fillOpacity: 0.35, opacity: 0.5 };
  return { ...base, opacity: 1 };
}

export const MapView: React.FC<MapViewProps> = ({
  anchor,
  businesses,
  highlightId,
  selectedId,
  onHoverBusiness,
  onSelectBusiness,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<Leaflet | null>(null);
  const markersRef = useRef<Map<string, CircleMarker>>(new Map());
  const baseLayerRef = useRef<LayerGroup | null>(null);
  const pathLayerRef = useRef<LayerGroup | null>(null);
  const [ready, setReady] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);

  // Callbacks live in refs so marker handlers stay current without rebuilding the map.
  const hoverRef = useRef(onHoverBusiness);
  const selectRef = useRef(onSelectBusiness);
  useEffect(() => {
    hoverRef.current = onHoverBusiness;
    selectRef.current = onSelectBusiness;
  });

  // 1. Create the map once.
  useEffect(() => {
    let cancelled = false;
    let observer: ResizeObserver | null = null;
    const markers = markersRef.current;

    import('leaflet').then((mod) => {
      const L = mod.default ?? mod;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: true,
        scrollWheelZoom: false,
      });
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        { attribution: 'Tiles &copy; Esri', maxZoom: 16 }
      ).addTo(map);
      // Street names sit above the base tiles but below the markers.
      const labels = map.createPane('labels');
      labels.style.zIndex = '350';
      labels.style.pointerEvents = 'none';
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 16, pane: 'labels' }
      ).addTo(map);
      L.control.zoom({ position: 'bottomright' }).addTo(map);
      map.on('click', () => map.scrollWheelZoom.enable());
      map.on('mouseout', () => map.scrollWheelZoom.disable());

      baseLayerRef.current = L.layerGroup().addTo(map);
      pathLayerRef.current = L.layerGroup().addTo(map);
      leafletRef.current = L;
      mapRef.current = map;

      observer = new ResizeObserver(() => map.invalidateSize());
      observer.observe(containerRef.current);
      setReady(true);
    });

    return () => {
      cancelled = true;
      observer?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      markers.clear();
      setReady(false);
    };
  }, []);

  // 2. Draw the anchor and business markers whenever the data changes.
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const layer = baseLayerRef.current;
    if (!ready || !L || !map || !layer) return;

    layer.clearLayers();
    markersRef.current.clear();

    L.marker([anchor.lat, anchor.lon], {
      icon: L.divIcon({
        className: '',
        iconSize: [0, 0],
        html: `<div class="anchor-pin"><span class="anchor-pin__pulse"></span><span class="anchor-pin__label"><span class="anchor-pin__dot"></span>${formatInt(anchor.jobs)} jobs leaving</span></div>`,
      }),
      keyboard: false,
      zIndexOffset: 1000,
    })
      .bindTooltip(`Closing employer · block ${anchor.block_id}`, { direction: 'top', offset: [0, -16], className: 'map-tooltip' })
      .addTo(layer);

    // Draw small markers first so funded circles sit on top.
    const ordered = [...businesses].sort((a, b) => a.amount - b.amount || a.exposure - b.exposure);
    for (const biz of ordered) {
      const marker = L.circleMarker([biz.lat, biz.lon], { ...markerStyle(biz, 'normal'), bubblingMouseEvents: false });
      const point = (e: { originalEvent?: MouseEvent }) =>
        e.originalEvent ? { x: e.originalEvent.clientX, y: e.originalEvent.clientY } : null;
      marker.on('mouseover', (e) => hoverRef.current(biz, point(e)));
      marker.on('mousemove', (e) => hoverRef.current(biz, point(e)));
      marker.on('mouseout', () => hoverRef.current(null, null));
      marker.on('click', () => selectRef.current(biz));
      marker.addTo(layer);
      markersRef.current.set(biz.business_id, marker);
    }

    const bounds = L.latLngBounds([[anchor.lat, anchor.lon]]);
    businesses.forEach((b) => bounds.extend([b.lat, b.lon]));
    const pad = map.getSize().x < 640 ? 20 : 56;
    map.fitBounds(bounds, { padding: [pad, pad], maxZoom: 16 });
  }, [ready, anchor, businesses]);

  // 3. Emphasize the focused business and draw its cascade paths.
  const focusId = highlightId ?? selectedId;
  useEffect(() => {
    const L = leafletRef.current;
    const layer = pathLayerRef.current;
    if (!ready || !L || !layer) return;

    layer.clearLayers();
    const focus = focusId ? businesses.find((b) => b.business_id === focusId) ?? null : null;
    const related = new Set<string>();
    focus?.paths.forEach((p) => {
      related.add(p.from.id);
      related.add(p.to.id);
    });

    for (const biz of businesses) {
      const marker = markersRef.current.get(biz.business_id);
      if (!marker) continue;
      const state = !focus ? 'normal' : biz.business_id === focus.business_id ? 'focus' : related.has(biz.business_id) ? 'normal' : 'dim';
      marker.setStyle(markerStyle(biz, state));
      if (state === 'focus') marker.bringToFront();
    }

    focus?.paths.forEach((p) => {
      const isFootfall = p.relationship === 'DrawsFootfall';
      L.polyline(
        [
          [p.from.lat, p.from.lon],
          [p.to.lat, p.to.lon],
        ],
        {
          color: isFootfall ? COLORS.footfall : COLORS.supply,
          weight: isFootfall ? 2.5 : 3,
          opacity: 0.9,
          dashArray: isFootfall ? '6 6' : undefined,
          interactive: false,
        }
      ).addTo(layer);

      const share = isFootfall ? p.worker_share ?? 0 : p.intensity ?? 0;
      const label = isFootfall ? `footfall ${Math.round(share * 100)}%` : `supplies ${Math.round(share * 100)}%`;
      L.marker([(p.from.lat + p.to.lat) / 2, (p.from.lon + p.to.lon) / 2], {
        icon: L.divIcon({ className: '', iconSize: [0, 0], html: `<div class="edge-label">${label}</div>` }),
        interactive: false,
        keyboard: false,
      }).addTo(layer);
    });
  }, [ready, focusId, businesses]);

  // Keep the selected business in view.
  useEffect(() => {
    if (!ready || !selectedId) return;
    const biz = businesses.find((b) => b.business_id === selectedId);
    if (biz && mapRef.current && !mapRef.current.getBounds().pad(-0.15).contains([biz.lat, biz.lon])) {
      mapRef.current.panTo([biz.lat, biz.lon], { animate: true, duration: 0.5 });
    }
  }, [ready, selectedId, businesses]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#eef1f0]">
      <div ref={containerRef} className="absolute inset-0" aria-label="Map of the closing employer and exposed businesses" />

      {!ready && (
        <div className="absolute inset-0 grid place-items-center text-sm text-ink-3">Loading map…</div>
      )}

      <div className="pointer-events-none absolute top-3 left-3 z-[500] hidden rounded-lg bg-surface/90 px-3 py-1.5 text-xs text-ink-2 shadow-sm ring-1 ring-line backdrop-blur sm:block">
        Hover a business to trace its cascade · click for the full case
      </div>

      <div className="absolute bottom-3 left-3 z-[500] rounded-xl bg-surface/95 text-xs text-ink-2 shadow-sm ring-1 ring-line backdrop-blur">
        {/* On phones the legend starts collapsed so it does not cover the markers. */}
        <button
          type="button"
          onClick={() => setLegendOpen((o) => !o)}
          aria-expanded={legendOpen}
          className="flex items-center gap-2 px-3 py-2 font-medium text-ink sm:hidden"
        >
          <span className="flex -space-x-1">
            <span className="size-2.5 rounded-full bg-anchor ring-2 ring-white" />
            <span className="size-2.5 rounded-full bg-funded ring-2 ring-white" />
            <span className="size-2.5 rounded-full bg-exposed-dot ring-2 ring-white" />
          </span>
          {legendOpen ? 'Hide legend' : 'Legend'}
        </button>
        <div className={legendOpen ? 'block px-3 pb-3 sm:p-3' : 'hidden sm:block sm:p-3'}>
        <div className="grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-1.5">
          <span className="size-2.5 rounded-full bg-anchor ring-2 ring-white" />
          <span>Closing employer</span>
          <span className="size-3 rounded-full bg-funded ring-2 ring-white" />
          <span>Funded · sized by grant</span>
          <span className="size-2.5 rounded-full bg-exposed-dot ring-2 ring-white" />
          <span>Exposed, not funded</span>
          <span className="ml-0.5 size-1.5 rounded-full bg-idle" />
          <span>Not affected</span>
        </div>
        <div className="mt-2.5 grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-1.5 border-t border-line pt-2.5">
          <svg width="18" height="4" aria-hidden className="text-anchor">
            <line x1="0" y1="2" x2="18" y2="2" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" />
          </svg>
          <span>Footfall the closure removes</span>
          <svg width="18" height="4" aria-hidden className="text-brand">
            <line x1="0" y1="2" x2="18" y2="2" stroke="currentColor" strokeWidth="2.5" />
          </svg>
          <span>Supply link the harm travels back along</span>
        </div>
        </div>
      </div>
    </div>
  );
};
