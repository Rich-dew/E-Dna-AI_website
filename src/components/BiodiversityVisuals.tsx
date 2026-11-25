import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { computeBetaDiversity, computeRarefactionCurves } from '../lib/ednaEngine';
import type {
  AlphaDiversityMetrics,
  SampleMetadata,
  TaxonomicAssignment,
} from '../types/edna';
import { EmptyState } from './StateBlocks';
import { useTheme } from '../context/ThemeContext';

const CHART_PALETTE_LIGHT = [
  '#0F4C4A',
  '#1F8A72',
  '#5BB6E8',
  '#F2B84B',
  '#E8725A',
  '#3D9B84',
  '#2D6A8E',
  '#B5654D',
];

const CHART_PALETTE_DARK = [
  '#7ED6B5',
  '#28A387',
  '#5BB6E8',
  '#F2B84B',
  '#E8725A',
  '#4CC4A4',
  '#7CC4EE',
  '#D9896C',
];

const LIGHT_FILLS = new Set(['#7ED6B5', '#F2B84B', '#7CC4EE']);

interface BiodiversityVisualsProps {
  samples: SampleMetadata[];
  assignments: TaxonomicAssignment[];
  alphaMetrics: AlphaDiversityMetrics[];
}

interface TreemapRect {
  name: string;
  size: number;
  pct: number;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

function buildProportionalTreemap(
  items: Array<{ name: string; size: number }>,
  x: number,
  y: number,
  w: number,
  h: number,
  total: number,
  palette: string[],
  startIdx: number = 0,
): TreemapRect[] {
  if (items.length === 0 || w <= 0 || h <= 0) return [];
  if (items.length === 1) {
    return [
      {
        name: items[0].name,
        size: items[0].size,
        pct: total > 0 ? (items[0].size / total) * 100 : 0,
        x,
        y,
        w,
        h,
        color: palette[startIdx % palette.length],
      },
    ];
  }
  const sum = items.reduce((acc, it) => acc + it.size, 0);
  let running = 0;
  let splitIdx = 1;
  for (let i = 0; i < items.length - 1; i++) {
    running += items[i].size;
    splitIdx = i + 1;
    if (running >= sum / 2) break;
  }
  const leftItems = items.slice(0, splitIdx);
  const rightItems = items.slice(splitIdx);
  const leftRatio = sum > 0 ? leftItems.reduce((a, b) => a + b.size, 0) / sum : 0.5;

  if (w >= h) {
    const leftW = w * leftRatio;
    return [
      ...buildProportionalTreemap(leftItems, x, y, leftW, h, total, palette, startIdx),
      ...buildProportionalTreemap(rightItems, x + leftW, y, w - leftW, h, total, palette, startIdx + splitIdx),
    ];
  }
  const topH = h * leftRatio;
  return [
    ...buildProportionalTreemap(leftItems, x, y, w, topH, total, palette, startIdx),
    ...buildProportionalTreemap(rightItems, x, y + topH, w, h - topH, total, palette, startIdx + splitIdx),
  ];
}

function shortSiteLabel(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length <= 2) return name;
  return `${words[0]} ${words[1]}`;
}

export function BiodiversityVisuals({
  samples,
  assignments,
  alphaMetrics,
}: BiodiversityVisualsProps) {
  const { theme } = useTheme();
  const palette = theme === 'dark' ? CHART_PALETTE_DARK : CHART_PALETTE_LIGHT;
  const [betaMetric, setBetaMetric] = useState<'bray_curtis' | 'jaccard'>('bray_curtis');

  const betaResult = useMemo(
    () => computeBetaDiversity(samples, assignments, betaMetric),
    [samples, assignments, betaMetric],
  );

  const rarefactionData = useMemo(
    () => computeRarefactionCurves(samples, assignments, 10),
    [samples, assignments],
  );

  // Stacked Bar by Sample (Top 6 Taxa + Other)
  const { stackedData, topTaxonLabels } = useMemo(() => {
    const totals = new Map<string, number>();
    for (const a of assignments) {
      const label =
        a.status === 'Unclassified, possible novel taxon'
          ? 'Unclassified / Novel'
          : a.species;
      totals.set(label, (totals.get(label) ?? 0) + a.abundance);
    }
    const sorted = Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => k);
    const top = sorted.slice(0, 6);
    const hasOther = sorted.length > 6;
    const labels = hasOther ? [...top, 'Other taxa'] : top;

    const rows = samples.map((s) => {
      const row: Record<string, string | number> = { site: shortSiteLabel(s.siteName) };
      for (const lbl of labels) row[lbl] = 0;
      const sampleAsg = assignments.filter((a) => a.sampleId === s.id);
      for (const a of sampleAsg) {
        const label =
          a.status === 'Unclassified, possible novel taxon'
            ? 'Unclassified / Novel'
            : a.species;
        if (top.includes(label)) {
          row[label] = Number(row[label]) + a.abundance;
        } else if (hasOther) {
          row['Other taxa'] = Number(row['Other taxa']) + a.abundance;
        }
      }
      return row;
    });
    return { stackedData: rows, topTaxonLabels: labels };
  }, [samples, assignments]);

  // Taxonomy Treemap Rects (full-width proportional SVG)
  const treemapRects = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of assignments) {
      const key =
        a.status === 'Unclassified, possible novel taxon'
          ? `Novel (${a.clusterId})`
          : `${a.species}`;
      map.set(key, (map.get(key) ?? 0) + a.abundance);
    }
    const items = Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([name, size]) => ({ name, size }));
    const total = items.reduce((sum, it) => sum + it.size, 0);
    return buildProportionalTreemap(items, 0, 0, 600, 290, total, palette);
  }, [assignments, palette]);
  const [hoveredTile, setHoveredTile] = useState<TreemapRect | null>(null);

  // Abundance Heatmap (Top 10 taxa x samples)
  const heatmap = useMemo(() => {
    const taxaMap = new Map<string, number>();
    for (const a of assignments) {
      const key =
        a.status === 'Unclassified, possible novel taxon'
          ? `Novel (${a.clusterId})`
          : a.species;
      taxaMap.set(key, (taxaMap.get(key) ?? 0) + a.abundance);
    }
    const topTaxa = Array.from(taxaMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([k]) => k);

    let maxVal = 1;
    const rows = topTaxa.map((taxon) => {
      const cells = samples.map((s) => {
        const count = assignments
          .filter((a) => {
            const key =
              a.status === 'Unclassified, possible novel taxon'
                ? `Novel (${a.clusterId})`
                : a.species;
            return a.sampleId === s.id && key === taxon;
          })
          .reduce((sum, a) => sum + a.abundance, 0);
        if (count > maxVal) maxVal = count;
        return { sampleId: s.id, siteName: s.siteName, count };
      });
      return { taxon, cells };
    });
    return { rows, maxVal };
  }, [samples, assignments]);

  if (samples.length === 0 || assignments.length === 0) {
    return (
      <EmptyState
        title="No biodiversity metrics computed yet"
        description="Upload at least one eDNA sample and run the sequence pipeline to compute Shannon, Simpson, Pielou, Chao1, PCoA ordination, rarefaction curves, and heatmaps."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Alpha Diversity Site Comparison Table */}
      <section className="rounded-xl border border-[#E3E0D5] dark:border-[#1D3A37] border-t-2 border-t-[#0F4C4A] dark:border-t-[#7ED6B5] bg-white dark:bg-[#0B1B1A] overflow-hidden surface-card">
        <div className="px-5 py-4 border-b border-[#E3E0D5] dark:border-[#1D3A37]">
          <h3 className="font-display text-base font-semibold">
            Alpha Diversity Site Comparison
          </h3>
          <p className="text-xs text-[#435E5B] dark:text-[#9DBAB6] mt-0.5">
            Observed richness (S), Shannon entropy (H&apos;), Simpson diversity (1-D), Pielou
            evenness (J&apos;), and bias-corrected Chao1 estimator.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#E3E0D5] dark:border-[#1D3A37] text-xs text-[#435E5B] dark:text-[#9DBAB6] bg-[#F7F6F0] dark:bg-[#081514]">
                <th className="py-3 px-4 font-medium">Sampling Site</th>
                <th className="py-3 px-4 font-medium text-right">Reads</th>
                <th className="py-3 px-4 font-medium text-right">Richness (S)</th>
                <th className="py-3 px-4 font-medium text-right">Shannon (H&apos;)</th>
                <th className="py-3 px-4 font-medium text-right">Simpson (1-D)</th>
                <th className="py-3 px-4 font-medium text-right">Pielou (J&apos;)</th>
                <th className="py-3 px-4 font-medium text-right">Chao1</th>
                <th className="py-3 px-4 font-medium text-right">Novel Flags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECEAE2] dark:divide-[#152D2B]">
              {alphaMetrics.map((m) => (
                <tr key={m.sampleId} className="hover:bg-[#F7F6F0] dark:hover:bg-[#102423] transition-colors">
                  <td className="py-3 px-4 font-medium">{m.siteName}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    {m.totalReads.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">{m.richness}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-[#0F4C4A] dark:text-[#7ED6B5]">
                    {m.shannon.toFixed(3)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    {m.simpson.toFixed(3)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    {m.pielouEvenness.toFixed(3)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    {m.chao1.toFixed(1)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    <span
                      className={
                        m.novelTaxaCount > 0
                          ? 'text-[#C84B31] dark:text-[#E8725A] font-semibold'
                          : 'text-[#4A6361] dark:text-[#9DB6B3]'
                      }
                    >
                      {m.novelTaxaCount}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 2. Taxonomy Treemap & Stacked Bar by Sample */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="rounded-xl border border-[#E3E0D5] dark:border-[#1D3A37] border-t-2 border-t-[#1F8A72] bg-white dark:bg-[#0B1B1A] p-5 surface-card">
          <div className="flex items-start justify-between gap-2 mb-4">
            <div>
              <h3 className="font-display text-base font-semibold">Taxonomic Composition Treemap</h3>
              <p className="text-xs text-[#435E5B] dark:text-[#9DBAB6] mt-0.5">
                Relative read proportion across detected species and unclassified novel candidates.
              </p>
            </div>
            {hoveredTile && (
              <div className="text-right font-mono tabular-nums text-xs shrink-0">
                <div className="font-sans font-semibold text-[#0F4C4A] dark:text-[#7ED6B5]">
                  {hoveredTile.name}
                </div>
                <div className="text-[#4A6361] dark:text-[#9DB6B3]">
                  {hoveredTile.size.toLocaleString()} reads ({hoveredTile.pct.toFixed(1)}%)
                </div>
              </div>
            )}
          </div>
          <div className="h-[300px] w-full">
            <svg
              viewBox="0 0 600 290"
              preserveAspectRatio="none"
              className="w-full h-full rounded-lg overflow-hidden"
              role="img"
              aria-label="Taxonomic composition treemap"
            >
              {treemapRects.map((rect) => (
                <g
                  key={rect.name}
                  onMouseEnter={() => setHoveredTile(rect)}
                  onMouseLeave={() => setHoveredTile(null)}
                  className="cursor-pointer transition-opacity hover:opacity-90"
                >
                  <rect
                    x={rect.x + 1}
                    y={rect.y + 1}
                    width={Math.max(0, rect.w - 2)}
                    height={Math.max(0, rect.h - 2)}
                    rx={4}
                    fill={rect.color}
                  />
                  {rect.w > 78 && rect.h > 34 && (
                    <>
                      <text
                        x={rect.x + 10}
                        y={rect.y + 20}
                        fill={LIGHT_FILLS.has(rect.color) ? '#0B201F' : '#FAF9F5'}
                        fontSize={12}
                        fontWeight={600}
                        fontFamily="Inter, sans-serif"
                      >
                        {rect.name.length > Math.floor(rect.w / 7.2)
                          ? `${rect.name.slice(0, Math.max(5, Math.floor(rect.w / 7.2) - 1))}…`
                          : rect.name}
                      </text>
                      <text
                        x={rect.x + 10}
                        y={rect.y + 36}
                        fill={
                          LIGHT_FILLS.has(rect.color)
                            ? 'rgba(11,32,31,0.78)'
                            : 'rgba(250,249,245,0.85)'
                        }
                        fontSize={11}
                        fontFamily="JetBrains Mono, monospace"
                      >
                        {rect.pct.toFixed(1)}% · {rect.size}
                      </text>
                    </>
                  )}
                </g>
              ))}
            </svg>
          </div>
        </section>

        <section className="rounded-xl border border-[#E3E0D5] dark:border-[#1D3A37] border-t-2 border-t-[#5BB6E8] bg-white dark:bg-[#0B1B1A] p-5 surface-card">
          <h3 className="font-display text-base font-semibold">Stacked Abundance by Sample</h3>
          <p className="text-xs text-[#435E5B] dark:text-[#9DBAB6] mt-0.5 mb-4">
            Distribution of top detected taxa and novel candidates across sites.
          </p>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stackedData} margin={{ top: 8, right: 12, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E3E1D8" opacity={0.45} />
                <XAxis dataKey="site" interval={0} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F1F1E',
                    borderColor: '#1C3432',
                    color: '#FAF9F5',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                {topTaxonLabels.map((lbl, idx) => (
                  <Bar
                    key={lbl}
                    dataKey={lbl}
                    stackId="a"
                    fill={palette[idx % palette.length]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* 3. Beta Diversity PCoA & Rarefaction Curves */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="rounded-xl border border-[#E3E0D5] dark:border-[#1D3A37] border-t-2 border-t-[#F2B84B] bg-white dark:bg-[#0B1B1A] p-5 surface-card">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-display text-base font-semibold">
                Beta Diversity Ordination (PCoA)
              </h3>
              <p className="text-xs text-[#435E5B] dark:text-[#9DBAB6] mt-0.5">
                PC1 ({betaResult.varianceExplained[0]}%) vs PC2 ({betaResult.varianceExplained[1]}%)
              </p>
            </div>
            <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-[#EFECE3] dark:bg-[#071312]">
              <button
                type="button"
                onClick={() => setBetaMetric('bray_curtis')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  betaMetric === 'bray_curtis'
                    ? 'bg-white dark:bg-[#132C2A] text-[#0F4C4A] dark:text-[#FAF9F5] shadow-xs'
                    : 'text-[#435E5B] dark:text-[#9DBAB6]'
                }`}
              >
                Bray-Curtis
              </button>
              <button
                type="button"
                onClick={() => setBetaMetric('jaccard')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  betaMetric === 'jaccard'
                    ? 'bg-white dark:bg-[#16302E] text-[#0F4C4A] dark:text-[#FAF9F5] shadow-xs'
                    : 'text-[#4A6361] dark:text-[#9DB6B3]'
                }`}
              >
                Jaccard
              </button>
            </div>
          </div>

          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 18, bottom: 16, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E3E1D8" opacity={0.45} />
                <XAxis
                  type="number"
                  dataKey="pc1"
                  name="PC1"
                  tick={{ fontSize: 11 }}
                  label={{
                    value: `PC1 (${betaResult.varianceExplained[0]}%)`,
                    position: 'insideBottom',
                    offset: -8,
                    fontSize: 11,
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="pc2"
                  name="PC2"
                  tick={{ fontSize: 11 }}
                  label={{
                    value: `PC2 (${betaResult.varianceExplained[1]}%)`,
                    angle: -90,
                    position: 'insideLeft',
                    fontSize: 11,
                  }}
                />
                <ZAxis range={[90, 90]} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ payload }) => {
                    if (!payload || payload.length === 0) return null;
                    const pt = payload[0].payload as {
                      siteName: string;
                      habitat: string;
                      pc1: number;
                      pc2: number;
                    };
                    return (
                      <div className="rounded-lg border border-[#1C3432] bg-[#0F1F1E] text-[#FAF9F5] px-3 py-2 text-xs">
                        <div className="font-semibold">{pt.siteName}</div>
                        <div className="text-[#7ED6B5]">{pt.habitat}</div>
                        <div className="font-mono mt-1">
                          PC1: {pt.pc1} · PC2: {pt.pc2}
                        </div>
                      </div>
                    );
                  }}
                />
                <Scatter name="Sites" data={betaResult.pcoa} fill="#1F8A72" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Pairwise Dissimilarity Mini-Matrix */}
          {betaResult.siteNames.length > 1 && (
            <div className="mt-4 pt-3 border-t border-[#ECEAE2] dark:border-[#182E2C] overflow-x-auto">
              <p className="text-xs font-medium text-[#4A6361] dark:text-[#9DB6B3] mb-2">
                Pairwise {betaMetric === 'bray_curtis' ? 'Bray-Curtis' : 'Jaccard'} Dissimilarity
                Matrix (0 = identical, 1 = completely distinct)
              </p>
              <table className="w-full text-[11px] font-mono tabular-nums">
                <thead>
                  <tr>
                    <th className="py-1 pr-2 text-left font-sans text-[#4A6361] dark:text-[#9DB6B3]">
                      Site
                    </th>
                    {betaResult.siteNames.map((name, i) => (
                      <th key={i} className="py-1 px-1.5 text-right font-sans text-[#4A6361] dark:text-[#9DB6B3]">
                        S{i + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {betaResult.matrix.map((row, rIdx) => (
                    <tr key={rIdx}>
                      <td className="py-1 pr-2 font-sans text-xs truncate max-w-[140px]">
                        S{rIdx + 1}: {betaResult.siteNames[rIdx]}
                      </td>
                      {row.map((val, cIdx) => (
                        <td
                          key={cIdx}
                          className="py-1 px-1.5 text-right"
                          style={{
                            backgroundColor:
                              rIdx === cIdx
                                ? 'transparent'
                                : `rgba(31, 138, 114, ${(val * 0.35).toFixed(2)})`,
                          }}
                        >
                          {val.toFixed(2)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-[#E3E0D5] dark:border-[#1D3A37] border-t-2 border-t-[#1F8A72] bg-white dark:bg-[#0B1B1A] p-5 surface-card">
          <h3 className="font-display text-base font-semibold">Rarefaction Curves</h3>
          <p className="text-xs text-[#435E5B] dark:text-[#9DBAB6] mt-0.5 mb-4">
            Analytic Hurlbert expected richness E[S_n] across subsampling read depths to evaluate
            sampling completeness.
          </p>
          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rarefactionData} margin={{ top: 8, right: 16, left: 4, bottom: 28 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E3E1D8" opacity={0.45} />
                <XAxis
                  dataKey="depth"
                  tick={{ fontSize: 11 }}
                  label={{
                    value: 'Subsampled Read Depth',
                    position: 'insideBottom',
                    offset: -10,
                    fontSize: 11,
                  }}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  label={{
                    value: 'Expected Taxa',
                    angle: -90,
                    position: 'insideLeft',
                    fontSize: 11,
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0B1B1A',
                    borderColor: '#1D3A37',
                    color: '#FAF9F5',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend verticalAlign="top" wrapperStyle={{ fontSize: '11px', paddingBottom: '12px' }} />
                {samples.map((s, idx) => (
                  <Line
                    key={s.id}
                    type="monotone"
                    dataKey={s.siteName}
                    stroke={palette[idx % palette.length]}
                    strokeWidth={2.25}
                    dot={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* 4. Abundance Heatmap */}
      <section className="rounded-xl border border-[#E3E0D5] dark:border-[#1D3A37] border-t-2 border-t-[#E8725A] bg-white dark:bg-[#0B1B1A] p-5 surface-card">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-display text-base font-semibold">Taxon × Site Abundance Heatmap</h3>
            <p className="text-xs text-[#435E5B] dark:text-[#9DBAB6] mt-0.5">
              Discrete intensity scale calibrated to maximum site read abundance (0 to{' '}
              {heatmap.maxVal.toLocaleString()} reads).
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-[#4A6361] dark:text-[#9DB6B3]">
            <span>0</span>
            <div className="flex gap-0.5">
              {[0.08, 0.25, 0.5, 0.75, 1].map((step) => (
                <span
                  key={step}
                  className="w-4 h-3 rounded-xs"
                  style={{ backgroundColor: `rgba(15, 76, 74, ${step})` }}
                />
              ))}
            </div>
            <span>{heatmap.maxVal}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-[2px] text-xs">
            <thead>
              <tr>
                <th className="text-left py-2 pr-3 font-medium text-[#4A6361] dark:text-[#9DB6B3]">
                  Taxon
                </th>
                {samples.map((s) => (
                  <th
                    key={s.id}
                    className="text-center py-2 px-2 font-medium text-[#4A6361] dark:text-[#9DB6B3] min-w-[100px]"
                  >
                    {s.siteName.slice(0, 18)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatmap.rows.map((row) => (
                <tr key={row.taxon}>
                  <td className="py-1.5 pr-3 font-medium whitespace-nowrap">{row.taxon}</td>
                  {row.cells.map((cell) => {
                    const ratio = cell.count / heatmap.maxVal;
                    const bg =
                      cell.count === 0
                        ? 'rgba(128, 145, 142, 0.08)'
                        : ratio > 0.7
                          ? 'rgba(15, 76, 74, 0.92)'
                          : ratio > 0.4
                            ? 'rgba(31, 138, 114, 0.78)'
                            : ratio > 0.15
                              ? 'rgba(126, 214, 181, 0.55)'
                              : 'rgba(242, 184, 75, 0.4)';
                    const textColor = ratio > 0.4 ? '#FAF9F5' : 'inherit';
                    return (
                      <td
                        key={cell.sampleId}
                        title={`${row.taxon} at ${cell.siteName}: ${cell.count} reads`}
                        className="text-center py-2 px-2 rounded-xs font-mono tabular-nums"
                        style={{ backgroundColor: bg, color: textColor }}
                      >
                        {cell.count}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
