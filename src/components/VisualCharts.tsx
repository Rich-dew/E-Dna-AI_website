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
  Treemap,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { computeBetaDiversity, computeRarefactionCurves } from '../lib/ednaEngine';
import type { SampleMetadata, TaxonomicAssignment } from '../types/edna';
import { EmptyState } from './StateBlocks';

const CHART_PALETTE = [
  '#0F4C4A',
  '#1F8A72',
  '#5BB6E8',
  '#F2B84B',
  '#E8725A',
  '#7ED6B5',
  '#2E6F95',
  '#B56576',
];

interface VisualChartsProps {
  samples: SampleMetadata[];
  assignments: TaxonomicAssignment[];
}

interface TreemapContentProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  size?: number;
  index?: number;
}

function CustomTreemapCell(props: TreemapContentProps) {
  const { x = 0, y = 0, width = 0, height = 0, name = '', size = 0, index = 0 } = props;
  if (width < 4 || height < 4) return null;
  const fill = CHART_PALETTE[index % CHART_PALETTE.length];
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        stroke="#FAF9F5"
        strokeWidth={1.5}
        rx={3}
      />
      {width > 64 && height > 30 && (
        <>
          <text
            x={x + 8}
            y={y + 18}
            fill="#FAF9F5"
            fontSize={11}
            fontWeight={600}
            fontFamily="Inter, sans-serif"
          >
            {name.length > 18 ? `${name.slice(0, 17)}…` : name}
          </text>
          <text
            x={x + 8}
            y={y + 33}
            fill="#E2F1EC"
            fontSize={10}
            fontFamily="JetBrains Mono, monospace"
          >
            {size} reads
          </text>
        </>
      )}
    </g>
  );
}

export function VisualCharts({ samples, assignments }: VisualChartsProps) {
  const [betaMetric, setBetaMetric] = useState<'bray_curtis' | 'jaccard'>('bray_curtis');
  const [hoveredCell, setHoveredCell] = useState<{
    taxon: string;
    site: string;
    reads: number;
  } | null>(null);

  const treemapData = useMemo(() => {
    const totals = new Map<string, number>();
    for (const a of assignments) {
      const label =
        a.status === 'Unclassified, possible novel taxon'
          ? `Novel · ${a.clusterId}`
          : a.species;
      totals.set(label, (totals.get(label) ?? 0) + a.abundance);
    }
    return Array.from(totals.entries())
      .map(([name, size]) => ({ name, size }))
      .sort((a, b) => b.size - a.size);
  }, [assignments]);

  const { stackedData, topStackedTaxa } = useMemo(() => {
    const globalTotals = new Map<string, number>();
    for (const a of assignments) {
      const label =
        a.status === 'Unclassified, possible novel taxon' ? 'Unclassified / Novel' : a.genus;
      globalTotals.set(label, (globalTotals.get(label) ?? 0) + a.abundance);
    }
    const topTaxa = Array.from(globalTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([t]) => t);

    const rows = samples.map((s) => {
      const row: Record<string, string | number> = {
        site: s.siteName.length > 18 ? `${s.siteName.slice(0, 16)}…` : s.siteName,
      };
      for (const t of topTaxa) row[t] = 0;
      row.Other = 0;

      for (const a of assignments.filter((x) => x.sampleId === s.id)) {
        const label =
          a.status === 'Unclassified, possible novel taxon' ? 'Unclassified / Novel' : a.genus;
        if (topTaxa.includes(label)) {
          row[label] = Number(row[label]) + a.abundance;
        } else {
          row.Other = Number(row.Other) + a.abundance;
        }
      }
      return row;
    });

    return { stackedData: rows, topStackedTaxa: [...topTaxa, 'Other'] };
  }, [samples, assignments]);

  const heatmap = useMemo(() => {
    const taxaTotals = new Map<string, number>();
    for (const a of assignments) {
      const label =
        a.status === 'Unclassified, possible novel taxon'
          ? `Novel (${a.clusterId})`
          : a.species;
      taxaTotals.set(label, (taxaTotals.get(label) ?? 0) + a.abundance);
    }
    const taxa = Array.from(taxaTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name]) => name);

    let maxVal = 1;
    const rows = taxa.map((taxon) => {
      const values = samples.map((s) => {
        const count = assignments
          .filter((a) => {
            const label =
              a.status === 'Unclassified, possible novel taxon'
                ? `Novel (${a.clusterId})`
                : a.species;
            return a.sampleId === s.id && label === taxon;
          })
          .reduce((sum, a) => sum + a.abundance, 0);
        if (count > maxVal) maxVal = count;
        return { siteId: s.id, siteName: s.siteName, count };
      });
      return { taxon, values };
    });

    return { rows, maxVal };
  }, [samples, assignments]);

  const beta = useMemo(
    () => computeBetaDiversity(samples, assignments, betaMetric),
    [samples, assignments, betaMetric],
  );

  const rarefaction = useMemo(
    () => computeRarefactionCurves(samples, assignments, 10),
    [samples, assignments],
  );

  if (samples.length === 0 || assignments.length === 0) {
    return (
      <EmptyState
        title="No taxonomic assignments to visualize"
        description="Upload an eDNA sample and run the bioinformatics pipeline to generate treemaps, stacked community bars, abundance heatmaps, PCoA ordinations, and rarefaction curves."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Row 1: Taxonomy Treemap + Stacked Bar by Sample */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-xl border border-[#E3E1D8] dark:border-[#1C3432] bg-white dark:bg-[#0F1F1E] p-5">
          <div className="mb-4">
            <h3 className="font-display text-sm font-semibold">Taxonomic Composition Treemap</h3>
            <p className="text-xs text-[#4A6361] dark:text-[#9DB6B3]">
              Proportional read abundance across assigned species and flagged novel clusters
            </p>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={treemapData}
                dataKey="size"
                stroke="#FAF9F5"
                content={<CustomTreemapCell />}
              >
                <Tooltip
                  formatter={(value: unknown) => [`${value} reads`, 'Abundance']}
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid #E3E1D8',
                    fontSize: 12,
                  }}
                />
              </Treemap>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-[#E3E1D8] dark:border-[#1C3432] bg-white dark:bg-[#0F1F1E] p-5">
          <div className="mb-4">
            <h3 className="font-display text-sm font-semibold">Genus Abundance by Site</h3>
            <p className="text-xs text-[#4A6361] dark:text-[#9DB6B3]">
              Stacked read counts across dominant genera and unclassified lineages
            </p>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stackedData} margin={{ top: 8, right: 12, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E3E1D8" opacity={0.45} />
                <XAxis dataKey="site" tick={{ fontSize: 11 }} interval={0} angle={-12} textAnchor="end" />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {topStackedTaxa.map((taxon, idx) => (
                  <Bar
                    key={taxon}
                    dataKey={taxon}
                    stackId="a"
                    fill={CHART_PALETTE[idx % CHART_PALETTE.length]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Beta Diversity PCoA + Rarefaction Curves */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-xl border border-[#E3E1D8] dark:border-[#1C3432] bg-white dark:bg-[#0F1F1E] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-display text-sm font-semibold">Beta Diversity Ordination (PCoA)</h3>
              <p className="text-xs text-[#4A6361] dark:text-[#9DB6B3]">
                PC1 ({beta.varianceExplained[0]}%) vs PC2 ({beta.varianceExplained[1]}%) variance
                explained
              </p>
            </div>
            <div className="inline-flex p-1 rounded-lg bg-[#F2F1EA] dark:bg-[#152928]">
              <button
                type="button"
                onClick={() => setBetaMetric('bray_curtis')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  betaMetric === 'bray_curtis'
                    ? 'bg-white dark:bg-[#0F4C4A] text-[#0F2423] dark:text-[#FAF9F5] shadow-sm'
                    : 'text-[#4A6361] dark:text-[#9DB6B3]'
                }`}
              >
                Bray-Curtis
              </button>
              <button
                type="button"
                onClick={() => setBetaMetric('jaccard')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  betaMetric === 'jaccard'
                    ? 'bg-white dark:bg-[#0F4C4A] text-[#0F2423] dark:text-[#FAF9F5] shadow-sm'
                    : 'text-[#4A6361] dark:text-[#9DB6B3]'
                }`}
              >
                Jaccard
              </button>
            </div>
          </div>

          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 20, bottom: 16, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E3E1D8" opacity={0.45} />
                <XAxis
                  type="number"
                  dataKey="pc1"
                  name="PC1"
                  tick={{ fontSize: 11 }}
                  label={{ value: `PC1 (${beta.varianceExplained[0]}%)`, position: 'bottom', fontSize: 11 }}
                />
                <YAxis
                  type="number"
                  dataKey="pc2"
                  name="PC2"
                  tick={{ fontSize: 11 }}
                  label={{ value: `PC2 (${beta.varianceExplained[1]}%)`, angle: -90, position: 'insideLeft', fontSize: 11 }}
                />
                <ZAxis range={[110, 110]} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ payload }) => {
                    if (!payload || payload.length === 0) return null;
                    const pt = payload[0].payload;
                    return (
                      <div className="bg-white dark:bg-[#0F1F1E] border border-[#E3E1D8] dark:border-[#1C3432] rounded-lg px-3 py-2 text-xs shadow-sm">
                        <div className="font-semibold">{pt.siteName}</div>
                        <div className="text-[#4A6361] dark:text-[#9DB6B3]">{pt.habitat}</div>
                        <div className="font-mono tabular-nums mt-1">
                          PC1: {pt.pc1} · PC2: {pt.pc2}
                        </div>
                      </div>
                    );
                  }}
                />
                <Scatter name="Sites" data={beta.pcoa} fill="#1F8A72" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Pairwise Dissimilarity Matrix */}
          {beta.siteNames.length > 1 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs font-mono tabular-nums">
                <thead>
                  <tr className="border-b border-[#E3E1D8] dark:border-[#1C3432] text-[#4A6361] dark:text-[#9DB6B3]">
                    <th className="text-left py-1.5 pr-2 font-sans font-medium">
                      Pairwise {betaMetric === 'bray_curtis' ? 'Bray-Curtis' : 'Jaccard'}
                    </th>
                    {beta.siteNames.map((n) => (
                      <th key={n} className="text-right py-1.5 px-2 font-sans font-medium">
                        {n.slice(0, 11)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {beta.matrix.map((row, i) => (
                    <tr key={beta.sampleIds[i]} className="border-b border-[#E3E1D8]/50 dark:border-[#1C3432]/50">
                      <td className="py-1.5 pr-2 font-sans text-[#0F2423] dark:text-[#FAF9F5]">
                        {beta.siteNames[i].slice(0, 16)}
                      </td>
                      {row.map((val, j) => (
                        <td
                          key={j}
                          className={`text-right py-1.5 px-2 ${
                            i === j
                              ? 'text-[#8B9D9B]'
                              : val > 0.65
                                ? 'text-[#C84B31] dark:text-[#E8725A] font-semibold'
                                : 'text-[#0F4C4A] dark:text-[#7ED6B5]'
                          }`}
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
        </div>

        <div className="rounded-xl border border-[#E3E1D8] dark:border-[#1C3432] bg-white dark:bg-[#0F1F1E] p-5">
          <div className="mb-4">
            <h3 className="font-display text-sm font-semibold">Rarefaction Curves (Hurlbert)</h3>
            <p className="text-xs text-[#4A6361] dark:text-[#9DB6B3]">
              Expected taxon richness E[Sₙ] across sequencing subsample depths
            </p>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rarefaction} margin={{ top: 10, right: 16, left: 0, bottom: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E3E1D8" opacity={0.45} />
                <XAxis
                  dataKey="depth"
                  tick={{ fontSize: 11 }}
                  label={{ value: 'Sequencing Depth (Reads)', position: 'bottom', fontSize: 11 }}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  label={{ value: 'Expected Richness', angle: -90, position: 'insideLeft', fontSize: 11 }}
                />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {samples.map((s, idx) => (
                  <Line
                    key={s.id}
                    type="monotone"
                    dataKey={s.siteName}
                    stroke={CHART_PALETTE[idx % CHART_PALETTE.length]}
                    strokeWidth={2}
                    dot={{ r: 2.5 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Taxon-by-Sample Abundance Heatmap */}
      <div className="rounded-xl border border-[#E3E1D8] dark:border-[#1C3432] bg-white dark:bg-[#0F1F1E] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-display text-sm font-semibold">Taxon × Site Abundance Heatmap</h3>
            <p className="text-xs text-[#4A6361] dark:text-[#9DB6B3]">
              {hoveredCell
                ? `${hoveredCell.taxon} at ${hoveredCell.site}: ${hoveredCell.reads} reads`
                : 'Hover any cell to inspect exact read abundance across sampling sites'}
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono tabular-nums text-[#4A6361] dark:text-[#9DB6B3]">
            <span>0</span>
            <div className="flex h-3 w-24 rounded overflow-hidden border border-[#E3E1D8] dark:border-[#1C3432]">
              <div className="flex-1 bg-[#F2F1EA] dark:bg-[#132625]" />
              <div className="flex-1 bg-[#7ED6B5]/55" />
              <div className="flex-1 bg-[#1F8A72]" />
              <div className="flex-1 bg-[#0F4C4A]" />
              <div className="flex-1 bg-[#F2B84B]" />
            </div>
            <span>{heatmap.maxVal}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-[2px] text-xs">
            <thead>
              <tr>
                <th className="text-left py-1.5 pr-3 font-medium text-[#4A6361] dark:text-[#9DB6B3] min-w-[180px]">
                  Taxon
                </th>
                {samples.map((s) => (
                  <th
                    key={s.id}
                    className="text-center py-1.5 px-2 font-medium text-[#4A6361] dark:text-[#9DB6B3] min-w-[100px]"
                  >
                    {s.siteName.slice(0, 16)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatmap.rows.map((row) => (
                <tr key={row.taxon}>
                  <td className="py-1.5 pr-3 font-medium text-[#0F2423] dark:text-[#FAF9F5] truncate max-w-[220px]">
                    {row.taxon}
                  </td>
                  {row.values.map((cell) => {
                    const ratio = cell.count / heatmap.maxVal;
                    let bg = 'bg-[#F2F1EA] dark:bg-[#132625] text-[#6B8280]';
                    if (ratio > 0.75) bg = 'bg-[#F2B84B] text-[#0F2423] font-semibold';
                    else if (ratio > 0.45) bg = 'bg-[#0F4C4A] text-[#FAF9F5] font-semibold';
                    else if (ratio > 0.2) bg = 'bg-[#1F8A72] text-[#FAF9F5]';
                    else if (ratio > 0) bg = 'bg-[#7ED6B5]/55 text-[#0F2423] dark:text-[#FAF9F5]';

                    return (
                      <td
                        key={cell.siteId}
                        onMouseEnter={() =>
                          setHoveredCell({
                            taxon: row.taxon,
                            site: cell.siteName,
                            reads: cell.count,
                          })
                        }
                        onMouseLeave={() => setHoveredCell(null)}
                        className={`text-center py-2 px-2 rounded-sm font-mono tabular-nums cursor-crosshair transition-opacity ${bg}`}
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
      </div>
    </div>
  );
}
