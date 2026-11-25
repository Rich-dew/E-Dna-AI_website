import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { AlphaDiversityMetrics, SampleMetadata } from '../types/edna';
import { EmptyState } from './StateBlocks';

interface SiteMapProps {
  samples: SampleMetadata[];
  alphaMetrics: AlphaDiversityMetrics[];
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getMarkerColor(shannon: number, novelCount: number): string {
  if (novelCount >= 2) return '#E8725A'; // coral highlight for novel taxa hotspot
  if (shannon >= 1.6) return '#0F4C4A'; // deep teal high diversity
  if (shannon >= 1.2) return '#1F8A72'; // mid teal moderate-high
  return '#5BB6E8'; // sky baseline
}

export function SiteMap({ samples, alphaMetrics }: SiteMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  const validSamples = samples.filter(
    (s) =>
      Number.isFinite(s.latitude) &&
      Number.isFinite(s.longitude) &&
      Math.abs(s.latitude) <= 90 &&
      Math.abs(s.longitude) <= 180,
  );

  useEffect(() => {
    if (!containerRef.current || validSamples.length === 0) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const alphaMap = new Map(alphaMetrics.map((m) => [m.sampleId, m]));
    const first = validSamples[0];

    const map = L.map(containerRef.current, {
      center: [first.latitude, first.longitude],
      zoom: 9,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    const bounds: L.LatLngExpression[] = [];

    for (const s of validSamples) {
      const m = alphaMap.get(s.id);
      const richness = m?.richness ?? 0;
      const shannon = m?.shannon ?? 0;
      const simpson = m?.simpson ?? 0;
      const novelCount = m?.novelTaxaCount ?? 0;
      const color = getMarkerColor(shannon, novelCount);
      const radius = Math.min(22, Math.max(9, 8 + richness * 1.4));

      bounds.push([s.latitude, s.longitude]);

      const marker = L.circleMarker([s.latitude, s.longitude], {
        radius,
        fillColor: color,
        color: '#FAF9F5',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.85,
      }).addTo(map);

      const popupHtml = `
        <div style="min-width:210px;font-family:Inter,sans-serif;line-height:1.45;">
          <div style="font-weight:700;font-size:13px;margin-bottom:2px;">${escapeHtml(s.siteName)}</div>
          <div style="font-size:11px;opacity:0.75;margin-bottom:8px;">${escapeHtml(s.habitat)} · ${escapeHtml(s.markerGene)} · ${s.depthMeters}m depth</div>
          <div style="font-family:JetBrains Mono,monospace;font-size:11px;display:grid;grid-template-columns:1fr 1fr;gap:4px 10px;">
            <span>Richness: <strong>${richness}</strong></span>
            <span>Shannon H': <strong>${shannon.toFixed(2)}</strong></span>
            <span>Simpson: <strong>${simpson.toFixed(2)}</strong></span>
            <span>Novel flags: <strong>${novelCount}</strong></span>
          </div>
          <div style="font-size:10px;opacity:0.65;margin-top:7px;">
            ${s.latitude.toFixed(4)}, ${s.longitude.toFixed(4)} · Collected ${escapeHtml(s.collectionDate)}
          </div>
        </div>
      `;
      marker.bindPopup(popupHtml);
    }

    if (bounds.length > 1) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [42, 42], maxZoom: 11 });
    }

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [validSamples, alphaMetrics]);

  if (validSamples.length === 0) {
    return (
      <EmptyState
        title="No georeferenced sampling sites yet"
        description="Add latitude and longitude coordinates to your project samples to plot diversity markers across the Leaflet map."
      />
    );
  }

  return (
    <div className="rounded-xl border border-[#E3E1D8] dark:border-[#1C3432] bg-white dark:bg-[#0F1F1E] overflow-hidden">
      <div className="px-5 py-4 border-b border-[#E3E1D8] dark:border-[#1C3432] flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-semibold">Spatial Diversity Site Map</h3>
          <p className="text-xs text-[#4A6361] dark:text-[#9DB6B3] mt-0.5">
            Marker radius scales with taxonomic richness. Click any site for Shannon, Simpson, and
            novel-taxon metrics.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs text-[#4A6361] dark:text-[#9DB6B3]">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0F4C4A]" />
            High H&apos; (&ge;1.6)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1F8A72]" />
            Moderate H&apos;
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E8725A]" />
            Novel Taxa Hotspot
          </span>
        </div>
      </div>

      <div
        ref={containerRef}
        data-testid="leaflet-site-map"
        className="w-full h-[420px] bg-[#E8EFEA] dark:bg-[#0A1615]"
      />
    </div>
  );
}
