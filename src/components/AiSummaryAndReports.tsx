import React, { useState } from 'react';
import { Download, FileJson, FileSpreadsheet, FileText, Sparkles } from 'lucide-react';
import {
  exportAssignmentsCsv,
  exportProjectJson,
  exportProjectPdfReport,
} from '../lib/reportExport';
import type {
  AlphaDiversityMetrics,
  EcologicalAiSummary,
  ProjectRecord,
  SampleMetadata,
  TaxonomicAssignment,
} from '../types/edna';
import { EmptyState, ErrorState, LoadingState } from './StateBlocks';
import { useToast } from '../context/ToastContext';

interface AiSummaryAndReportsProps {
  project: ProjectRecord;
  samples: SampleMetadata[];
  assignments: TaxonomicAssignment[];
  alphaMetrics: AlphaDiversityMetrics[];
  onSaveSummary: (projectId: string, summary: EcologicalAiSummary) => void;
}

export function AiSummaryAndReports({
  project,
  samples,
  assignments,
  alphaMetrics,
  onSaveSummary,
}: AiSummaryAndReportsProps) {
  const { pushToast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateSummary = async () => {
    setError(null);
    setGenerating(true);

    const assignedCount = assignments.filter((a) => a.status === 'Assigned').length;
    const lowConfidenceCount = assignments.filter((a) => a.status === 'Low confidence').length;
    const novelCandidateCount = assignments.filter(
      (a) => a.status === 'Unclassified, possible novel taxon',
    ).length;

    const taxaMap = new Map<string, number>();
    for (const a of assignments) {
      const lbl =
        a.status === 'Unclassified, possible novel taxon'
          ? `Unclassified (${a.clusterId})`
          : `${a.species} (${a.family})`;
      taxaMap.set(lbl, (taxaMap.get(lbl) ?? 0) + a.abundance);
    }
    const topTaxa = Array.from(taxaMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([taxon, reads]) => ({ taxon, reads }));

    try {
      const resp = await fetch('/api/gemini/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: project.name,
          markerGene: project.markerGene,
          totalSequences: assignments.length,
          assignedCount,
          lowConfidenceCount,
          novelCandidateCount,
          samples: alphaMetrics.map((m) => {
            const meta = samples.find((s) => s.id === m.sampleId);
            return {
              siteName: m.siteName,
              habitat: meta?.habitat,
              depthMeters: meta?.depthMeters,
              richness: m.richness,
              shannon: m.shannon,
              simpson: m.simpson,
              pielouEvenness: m.pielouEvenness,
              chao1: m.chao1,
              novelTaxaCount: m.novelTaxaCount,
            };
          }),
          topTaxa,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || `Server returned HTTP ${resp.status}`);
      }

      onSaveSummary(project.id, data as EcologicalAiSummary);
      pushToast({
        type: 'success',
        title: 'Ecological summary generated',
        description: 'Plain-language findings and methodological caveats updated.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to generate ecological summary.';
      setError(msg);
      pushToast({ type: 'error', title: 'Summary generation failed', description: msg });
    } finally {
      setGenerating(false);
    }
  };

  const summary = project.aiSummary;

  return (
    <div className="space-y-6">
      {/* Export Reports Toolbar */}
      <section className="rounded-xl border border-[#E3E0D5] dark:border-[#1D3A37] border-t-2 border-t-[#5BB6E8] bg-white dark:bg-[#0B1B1A] p-5 surface-card">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="font-display text-base font-semibold">Export Research Deliverables</h3>
            <p className="text-xs text-[#435E5B] dark:text-[#9DBAB6] mt-0.5">
              Download structured taxonomy tables, full JSON datasets, or a publication-ready PDF
              report containing diversity tables and vector abundance charts.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              disabled={assignments.length === 0}
              onClick={() => {
                exportAssignmentsCsv(project, samples, assignments);
                pushToast({ type: 'success', title: 'CSV exported' });
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-[#D4D1C7] dark:border-[#244643] hover:bg-[#EFECE3] dark:hover:bg-[#122927] disabled:opacity-40 whitespace-nowrap transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Export CSV
            </button>
            <button
              type="button"
              disabled={assignments.length === 0}
              onClick={() => {
                exportProjectJson(project, samples, assignments, alphaMetrics, summary);
                pushToast({ type: 'success', title: 'JSON exported' });
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-[#D4D1C7] dark:border-[#244643] hover:bg-[#EFECE3] dark:hover:bg-[#122927] disabled:opacity-40 whitespace-nowrap transition-colors"
            >
              <FileJson className="w-3.5 h-3.5" />
              Export JSON
            </button>
            <button
              type="button"
              disabled={assignments.length === 0}
              onClick={() => {
                exportProjectPdfReport(project, samples, assignments, alphaMetrics, summary);
                pushToast({ type: 'success', title: 'PDF report downloaded' });
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-[#0F4C4A] to-[#1F8A72] text-[#FAF9F5] hover:from-[#125A58] hover:to-[#249A80] shadow-xs disabled:opacity-40 whitespace-nowrap transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Export PDF Report
            </button>
          </div>
        </div>
      </section>

      {/* Gemini Ecological Summary */}
      <section className="rounded-xl border border-[#E3E0D5] dark:border-[#1D3A37] border-t-2 border-t-[#1F8A72] bg-white dark:bg-[#0B1B1A] p-5 sm:p-6 surface-card">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#ECEAE2] dark:border-[#17312E]">
          <div>
            <h3 className="font-display text-base font-semibold">
              Plain-Language Ecological Summary (Gemini)
            </h3>
            <p className="text-xs text-[#435E5B] dark:text-[#9DBAB6] mt-0.5">
              Synthesizes biodiversity trends, novel candidate signals, reference-database gaps, and{' '}
              {project.markerGene} marker bias.
            </p>
          </div>
          <button
            type="button"
            disabled={generating || assignments.length === 0}
            onClick={handleGenerateSummary}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-[#0F4C4A] to-[#1F8A72] text-[#FAF9F5] hover:from-[#125A58] hover:to-[#249A80] shadow-xs disabled:opacity-50 whitespace-nowrap transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {generating
              ? 'Synthesizing...'
              : summary
                ? 'Regenerate Summary'
                : 'Generate Ecological Summary'}
          </button>
        </div>

        <div className="mt-5">
          {generating ? (
            <LoadingState label="Generating ecological summary via Gemini API..." rows={5} />
          ) : error ? (
            <ErrorState
              title="Ecological summary unavailable"
              message={error}
              onRetry={handleGenerateSummary}
            />
          ) : !summary ? (
            <EmptyState
              title="No ecological summary generated for this project"
              description="Click Generate Ecological Summary to produce a plain-language interpretation of community diversity, unclassified sequences, and marker-specific caveats."
              actionLabel={assignments.length > 0 ? 'Generate Ecological Summary' : undefined}
              onAction={assignments.length > 0 ? handleGenerateSummary : undefined}
            />
          ) : (
            <div className="space-y-6 text-sm leading-relaxed">
              <div className="text-xs text-[#4A6361] dark:text-[#9DB6B3] flex flex-wrap items-center gap-2">
                <FileText className="w-3.5 h-3.5" />
                <span>Generated {new Date(summary.generatedAt).toLocaleString()}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{summary.model}</span>
              </div>

              <div>
                <h4 className="font-display text-sm font-semibold text-[#0F4C4A] dark:text-[#7ED6B5] mb-1.5">
                  Executive Ecological Findings
                </h4>
                <p className="text-[#233836] dark:text-[#D9E6E4]">{summary.executiveOverview}</p>
              </div>

              <div>
                <h4 className="font-display text-sm font-semibold text-[#0F4C4A] dark:text-[#7ED6B5] mb-1.5">
                  Community Structure &amp; Diversity Patterns
                </h4>
                <p className="text-[#233836] dark:text-[#D9E6E4]">{summary.communityStructure}</p>
              </div>

              <div>
                <h4 className="font-display text-sm font-semibold text-[#C84B31] dark:text-[#E8725A] mb-1.5">
                  Unclassified &amp; Potential Novel Taxa Assessment
                </h4>
                <p className="text-[#233836] dark:text-[#D9E6E4]">
                  {summary.novelTaxaInterpretation}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                <div className="p-4 rounded-lg border border-[#E3E0D5] dark:border-[#1D3A37] border-t-2 border-t-[#F2B84B] bg-[#FAF9F5] dark:bg-[#071312]">
                  <h4 className="font-display text-xs font-semibold text-[#A66A08] dark:text-[#F2B84B] mb-2">
                    Methodological Caveats &amp; Bias Notes
                  </h4>
                  <ul className="space-y-2 text-xs text-[#3F5957] dark:text-[#B4CCC9] list-disc pl-4">
                    {summary.caveats.map((c, idx) => (
                      <li key={idx}>{c}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-lg border border-[#E3E0D5] dark:border-[#1D3A37] border-t-2 border-t-[#1F8A72] bg-[#FAF9F5] dark:bg-[#071312]">
                  <h4 className="font-display text-xs font-semibold text-[#0F4C4A] dark:text-[#7ED6B5] mb-2">
                    Recommended Validation Steps
                  </h4>
                  <ul className="space-y-2 text-xs text-[#3F5957] dark:text-[#B4CCC9] list-disc pl-4">
                    {summary.recommendedNextSteps.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
