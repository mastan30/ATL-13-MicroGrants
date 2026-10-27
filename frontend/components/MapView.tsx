'use strict';
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { BusinessDecision, AnchorPoint, PathSegment } from '@/types/scenario';

interface MapViewProps {
  anchor: AnchorPoint;
  businesses: BusinessDecision[];
  activeBusiness: BusinessDecision | null;
  selectedBusiness: BusinessDecision | null;
  onHoverBusiness: (biz: BusinessDecision | null, pos: { x: number; y: number } | null) => void;
  onSelectBusiness: (biz: BusinessDecision) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  anchor,
  businesses,
  activeBusiness,
  selectedBusiness,
  onHoverBusiness,
  onSelectBusiness,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const layersRef = useRef<{
    markers: any[];
    cascadeLines: any[];
    anchorMarker: any | null;
  }>({
    markers: [],
    cascadeLines: [],
    anchorMarker: null,
  });

  // Focus business is either hovered or clicked
  const highlightedBiz = activeBusiness || selectedBusiness;

  /* -------------------------------------------------------------------------- */
  /* LEAFLET INITIALIZATION & UPDATES                                          */
  /* -------------------------------------------------------------------------- */
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    let isMounted = true;

    async function initLeaflet() {
      try {
        const L = (await import('leaflet')).default;

        if (!isMounted || !mapContainerRef.current) return;

        // Clean stale leaflet ID if element was re-used
        if ((mapContainerRef.current as any)._leaflet_id && !leafletMapRef.current) {
          delete (mapContainerRef.current as any)._leaflet_id;
        }

        if (!leafletMapRef.current) {
          // Create Leaflet instance centered at Central Market SF
          const map = L.map(mapContainerRef.current, {
            center: [anchor.lat, anchor.lon],
            zoom: 16,
            zoomControl: false,
            attributionControl: true,
          });

          // Use dark Esri canvas tiles (no API key required, crisp dark basemap)
          L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
            attribution: '&copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
            maxZoom: 17,
          }).addTo(map);

          L.control.zoom({ position: 'bottomright' }).addTo(map);

          leafletMapRef.current = map;
        }

        const map = leafletMapRef.current;

        // Auto-fit bounds to enclose anchor and all businesses with padding
        const bounds = L.latLngBounds([[anchor.lat, anchor.lon]]);
        businesses.forEach((b) => bounds.extend([b.lat, b.lon]));
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });

        // Force size recalculation
        map.invalidateSize();
        setTimeout(() => {
          if (isMounted && leafletMapRef.current) {
            leafletMapRef.current.invalidateSize();
            leafletMapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
          }
        }, 150);

        // Clean existing markers
        layersRef.current.markers.forEach((m) => map.removeLayer(m));
        layersRef.current.cascadeLines.forEach((l) => map.removeLayer(l));
        if (layersRef.current.anchorMarker) {
          map.removeLayer(layersRef.current.anchorMarker);
        }
        layersRef.current.markers = [];
        layersRef.current.cascadeLines = [];

        // 1. Draw Anchor Point
        const anchorIcon = L.divIcon({
          className: 'custom-anchor-marker',
          html: `
            <div style="position: relative; display: flex; align-items: center; justify-content: center; transform: translate(-50%, -50%); cursor: pointer;">
              <div style="position: absolute; width: 56px; height: 56px; border-radius: 50%; background: rgba(244, 63, 94, 0.25); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              <div style="position: relative; display: flex; align-items: center; gap: 6px; background: #e11d48; color: #ffffff; font-weight: 800; font-size: 11px; padding: 6px 12px; border-radius: 9999px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5); border: 2px solid #ffffff;">
                <span style="font-size: 14px;">🏢</span>
                <span>1,400 Jobs</span>
              </div>
            </div>
          `,
          iconSize: [0, 0],
        });

        const anchorMarker = L.marker([anchor.lat, anchor.lon], { icon: anchorIcon })
          .addTo(map)
          .bindTooltip(`<b>${anchor.name}</b><br/>Closing Workplace Anchor (1,400 Jobs)`, {
            direction: 'top',
            offset: [0, -18],
            className: 'custom-leaflet-tooltip',
          });

        layersRef.current.anchorMarker = anchorMarker;

        // 2. Draw Business Markers
        businesses.forEach((biz) => {
          const isFunded = biz.status === 'funded';
          const isExposed = biz.status === 'exposed_not_funded';

          // Size circles by status and funding amount
          let radius = 8;
          let color = '#64748b'; // slate grey for unaffected
          let fillColor = '#475569';
          let fillOpacity = 0.7;
          let weight = 2;

          if (isFunded) {
            // strong emerald color, sized by amount ($8k -> 14, $14k -> 22)
            radius = Math.max(13, Math.min(24, 11 + (biz.amount / 1000)));
            color = '#10b981'; // emerald-500
            fillColor = '#059669';
            fillOpacity = 0.9;
            weight = 3;
          } else if (isExposed) {
            // muted amber color
            radius = 11;
            color = '#f59e0b'; // amber-500
            fillColor = '#d97706';
            fillOpacity = 0.65;
            weight = 2.5;
          }

          const circle = L.circleMarker([biz.lat, biz.lon], {
            radius,
            color,
            fillColor,
            fillOpacity,
            weight,
          }).addTo(map);

          // Add native tooltip for guaranteed accessibility
          const tooltipContent = `
            <div style="font-family: system-ui, sans-serif;">
              <strong style="color: #ffffff; font-size: 12px;">${biz.name}</strong><br/>
              <span style="color: ${isFunded ? '#34d399' : isExposed ? '#fbbf24' : '#94a3b8'}; font-weight: 700;">
                ${isFunded ? '$' + biz.amount.toLocaleString() + ' (FUNDED)' : isExposed ? 'EXPOSED (' + (biz.exposure * 100).toFixed(0) + '%)' : 'UNAFFECTED'}
              </span>
            </div>
          `;
          circle.bindTooltip(tooltipContent, {
            direction: 'top',
            offset: [0, -8],
            className: 'custom-leaflet-tooltip',
          });

          // Hover events for React floating card
          circle.on('mouseover', (e: any) => {
            const containerPoint = e.containerPoint;
            onHoverBusiness(biz, { x: containerPoint.x, y: containerPoint.y });
          });

          circle.on('mousemove', (e: any) => {
            const containerPoint = e.containerPoint;
            onHoverBusiness(biz, { x: containerPoint.x, y: containerPoint.y });
          });

          circle.on('mouseout', () => {
            onHoverBusiness(null, null);
          });

          circle.on('click', () => {
            onSelectBusiness(biz);
          });

          layersRef.current.markers.push(circle);
        });
      } catch (err) {
        console.error('Failed to render Leaflet map:', err);
      }
    }

    initLeaflet();

    return () => {
      isMounted = false;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [anchor, businesses]);

  /* -------------------------------------------------------------------------- */
  /* DRAW CASCADE LINES FOR HIGHLIGHTED BUSINESS                                */
  /* -------------------------------------------------------------------------- */
  useEffect(() => {
    if (!leafletMapRef.current) return;

    import('leaflet').then((L) => {
      const map = leafletMapRef.current;
      if (!map) return;

      // Clear existing lines
      layersRef.current.cascadeLines.forEach((l) => map.removeLayer(l));
      layersRef.current.cascadeLines = [];

      if (!highlightedBiz || !highlightedBiz.paths || highlightedBiz.paths.length === 0) {
        return;
      }

      // Draw cascade polylines for the active business
      highlightedBiz.paths.forEach((p: PathSegment) => {
        const isFootfall = p.relationship === 'DrawsFootfall';

        // Anchor -> Cafe (footfall, dashed cyan)
        // Cafe <- Roaster (backward supply line, solid emerald)
        const polyline = L.polyline(
          [
            [p.from.lat, p.from.lon],
            [p.to.lat, p.to.lon],
          ],
          {
            color: isFootfall ? '#38bdf8' : '#10b981',
            weight: isFootfall ? 3.5 : 4.5,
            opacity: 0.95,
            dashArray: isFootfall ? '8, 8' : undefined,
          }
        ).addTo(map);

        // Add middle arrow/indicator marker
        const midLat = (p.from.lat + p.to.lat) / 2;
        const midLon = (p.from.lon + p.to.lon) / 2;

        const labelText = isFootfall
          ? `Footfall: -[:DrawsFootfall]-> (${((p.worker_share || 0) * 100).toFixed(0)}%)`
          : `Backward Supply: <-[:Supplies]- (${((p.intensity || 0) * 100).toFixed(0)}%)`;

        const badge = L.marker([midLat, midLon], {
          icon: L.divIcon({
            className: 'cascade-edge-label',
            html: `
              <div style="background: ${isFootfall ? 'rgba(8, 47, 73, 0.95)' : 'rgba(6, 78, 59, 0.95)'}; color: ${isFootfall ? '#7dd3fc' : '#6ee7b7'}; border: 1px solid ${isFootfall ? '#0284c7' : '#059669'}; font-size: 10px; font-weight: 700; font-family: ui-monospace, monospace; padding: 2px 8px; border-radius: 6px; white-space: nowrap; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5); transform: translate(-50%, -50%);">
                ${labelText}
              </div>
            `,
            iconSize: [0, 0],
          }),
        }).addTo(map);

        layersRef.current.cascadeLines.push(polyline, badge);
      });
    });
  }, [highlightedBiz]);

  return (
    <div
      style={{ width: '100%', height: '620px', minHeight: '620px', position: 'relative' }}
      className="w-full h-[620px] min-h-[620px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950"
    >
      {/* Map DOM Element with explicit style */}
      <div
        ref={mapContainerRef}
        style={{ width: '100%', height: '100%', minHeight: '620px', position: 'relative' }}
        className="w-full h-full min-h-[620px]"
      />

      {/* Map Legend Overlay */}
      <div className="absolute bottom-5 left-5 z-[400] bg-slate-900/95 border border-slate-800 rounded-xl p-3.5 shadow-2xl backdrop-blur-md text-slate-200 text-xs pointer-events-auto">
        <h5 className="font-bold text-[11px] uppercase tracking-wider text-slate-400 mb-2">
          Map Legend · Central Market
        </h5>
        <div className="space-y-1.5 font-medium">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-rose-600 border border-white ring-2 ring-rose-500/30"></span>
            <span>Anchor Block (1,400 Workers Closing)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 border border-emerald-300 ring-2 ring-emerald-500/40"></span>
            <span>Funded (Sized by grant amount)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500 border border-amber-300"></span>
            <span>Exposed, Not Funded (Muted)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
            <span>Unaffected / Leaf node (Grey dot)</span>
          </div>
        </div>

        <div className="mt-2.5 pt-2 border-t border-slate-800 text-[10px] text-slate-400 space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 border-t-2 border-dashed border-sky-400"></span>
            <span>Footfall loss (Anchor → Store)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-emerald-400"></span>
            <span>Backward supply line (Store ← Supplier)</span>
          </div>
        </div>
      </div>

      {/* Platform & Source Badge */}
      <div className="absolute top-4 right-4 z-[400] flex items-center gap-2 pointer-events-none">
        <div className="bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg shadow-lg text-[11px] text-slate-300 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>BigQuery GQL Property Graph Live</span>
        </div>
      </div>
    </div>
  );
};
