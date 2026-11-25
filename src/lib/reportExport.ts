import { jsPDF } from 'jspdf';
import type {
  AlphaDiversityMetrics,
  EcologicalAiSummary,
  ProjectRecord,
  SampleMetadata,
  TaxonomicAssignment,
} from '../types/edna';

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function csvEscape(value: string | number | boolean | undefined): string {
  const str = String(value ?? '');
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportAssignmentsCsv(
  project: ProjectRecord,
  samples: SampleMetadata[],
  assignments: TaxonomicAssignment[],
) {
  const sampleMap = new Map(samples.map((s) => [s.id, s]));
  const headers = [
    'Project',
    'MarkerGene',
    'SiteName',
    'Habitat',
    'Latitude',
    'Longitude',
    'DepthM',
    'ClusterID',
    'Abundance',
    'Kingdom',
    'Phylum',
    'Class',
    'Order',
    'Family',
    'Genus',
    'Species',
    'PercentIdentity',
    'Confidence',
    'Status',
    'Classifier',
    'Accession',
  ];

  const rows = assignments.map((a) => {
    const smp = sampleMap.get(a.sampleId);
    return [
      project.name,
      project.markerGene,
      smp?.siteName ?? a.sampleId,
      smp?.habitat ?? '',
      smp?.latitude ?? '',
      smp?.longitude ?? '',
      smp?.depthMeters ?? '',
      a.clusterId,
      a.abundance,
      a.kingdom,
      a.phylum,
      a.className,
      a.orderName,
      a.family,
      a.genus,
      a.species,
      a.percentIdentity,
      a.confidence,
      a.status,
      a.classifierUsed,
      a.referenceAccession ?? '',
    ]
      .map(csvEscape)
      .join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  const slug = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
  triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `taxatrace-${slug}-taxonomy.csv`);
}

export function exportProjectJson(
  project: ProjectRecord,
  samples: SampleMetadata[],
  assignments: TaxonomicAssignment[],
  alphaMetrics: AlphaDiversityMetrics[],
  aiSummary?: EcologicalAiSummary,
) {
  const payload = {
    exportedAt: new Date().toISOString(),
    platform: 'TaxaTrace eDNA Platform',
    project,
    samples,
    alphaDiversity: alphaMetrics,
    taxonomicAssignments: assignments,
    ecologicalSummary: aiSummary ?? null,
  };
  const slug = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
  triggerDownload(
    new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' }),
    `taxatrace-${slug}-report.json`,
  );
}

export function exportGenericCsv(filename: string, headers: string[], rows: Array<Array<string | number | boolean | undefined>>) {
  const csv = [headers.map(csvEscape).join(','), ...rows.map((r) => r.map(csvEscape).join(','))].join('\n');
  triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8' }), filename);
}

export function exportProjectPdfReport(
  project: ProjectRecord,
  samples: SampleMetadata[],
  assignments: TaxonomicAssignment[],
  alphaMetrics: AlphaDiversityMetrics[],
  aiSummary?: EcologicalAiSummary,
) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 44;
  let y = 48;

  // Header band
  doc.setFillColor(15, 76, 74); // #0F4C4A
  doc.rect(0, 0, pageWidth, 84, 'F');
  doc.setTextColor(250, 249, 245);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('TaxaTrace', margin, 38);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(126, 214, 181);
  doc.text('eDNA · TAXONOMY · BIODIVERSITY REPORT', margin, 56);
  doc.setTextColor(250, 249, 245);
  doc.text(`Generated ${new Date().toLocaleDateString()}`, pageWidth - margin, 38, { align: 'right' });

  y = 112;
  doc.setTextColor(15, 36, 35);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(project.name, margin, y);
  y += 18;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(75, 95, 93);
  doc.text(
    `Marker Gene: ${project.markerGene}   ·   Samples: ${samples.length}   ·   Clusters/ASVs: ${assignments.length}`,
    margin,
    y,
  );
  y += 24;

  // Alpha Diversity Table
  doc.setTextColor(15, 76, 74);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('1. Site Alpha Diversity Metrics', margin, y);
  y += 14;

  doc.setFillColor(242, 245, 243);
  doc.rect(margin, y, pageWidth - margin * 2, 20, 'F');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 36, 35);
  const cols = [margin + 6, margin + 175, margin + 235, margin + 290, margin + 350, margin + 408, margin + 462];
  doc.text('Site', cols[0], y + 13);
  doc.text('Reads', cols[1], y + 13);
  doc.text('Richness', cols[2], y + 13);
  doc.text("Shannon H'", cols[3], y + 13);
  doc.text('Simpson', cols[4], y + 13);
  doc.text('Pielou', cols[5], y + 13);
  doc.text('Chao1', cols[6], y + 13);
  y += 24;

  doc.setFont('helvetica', 'normal');
  for (const m of alphaMetrics) {
    if (y > 740) {
      doc.addPage();
      y = 48;
    }
    doc.text(m.siteName.slice(0, 28), cols[0], y + 10);
    doc.text(String(m.totalReads), cols[1], y + 10);
    doc.text(String(m.richness), cols[2], y + 10);
    doc.text(m.shannon.toFixed(3), cols[3], y + 10);
    doc.text(m.simpson.toFixed(3), cols[4], y + 10);
    doc.text(m.pielouEvenness.toFixed(3), cols[5], y + 10);
    doc.text(m.chao1.toFixed(1), cols[6], y + 10);
    doc.setDrawColor(230, 232, 228);
    doc.line(margin, y + 15, pageWidth - margin, y + 15);
    y += 18;
  }

  y += 18;
  // Vector Bar Chart: Top Taxa Abundance
  doc.setTextColor(15, 76, 74);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('2. Top Taxonomic Abundance Chart', margin, y);
  y += 16;

  const taxaTotals = new Map<string, { reads: number; status: string }>();
  for (const a of assignments) {
    const label = a.status === 'Unclassified, possible novel taxon' ? `Novel (${a.clusterId})` : a.species;
    const prev = taxaTotals.get(label);
    taxaTotals.set(label, { reads: (prev?.reads ?? 0) + a.abundance, status: a.status });
  }
  const topTaxa = Array.from(taxaTotals.entries())
    .sort((a, b) => b[1].reads - a[1].reads)
    .slice(0, 8);
  const maxReads = Math.max(1, ...topTaxa.map((t) => t[1].reads));

  const barMaxWidth = pageWidth - margin * 2 - 210;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  for (const [name, info] of topTaxa) {
    if (y > 750) {
      doc.addPage();
      y = 48;
    }
    doc.setTextColor(15, 36, 35);
    doc.text(name.slice(0, 28), margin, y + 9);
    const barW = Math.max(4, (info.reads / maxReads) * barMaxWidth);
    if (info.status === 'Assigned') doc.setFillColor(31, 138, 114);
    else if (info.status === 'Low confidence') doc.setFillColor(242, 184, 75);
    else doc.setFillColor(232, 114, 90);
    doc.roundedRect(margin + 155, y, barW, 11, 2, 2, 'F');
    doc.setTextColor(75, 95, 93);
    doc.text(`${info.reads} reads`, margin + 162 + barW, y + 9);
    y += 18;
  }

  y += 16;
  // Ecological AI Summary
  if (y > 620) {
    doc.addPage();
    y = 48;
  }
  doc.setTextColor(15, 76, 74);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('3. Ecological Summary & Methodological Caveats', margin, y);
  y += 16;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(35, 50, 48);
  const summaryText = aiSummary
    ? `${aiSummary.executiveOverview}\n\nCommunity Structure: ${aiSummary.communityStructure}\n\nNovel Taxa Signals: ${aiSummary.novelTaxaInterpretation}`
    : 'Generate an AI ecological summary inside the TaxaTrace workspace before exporting to include Gemini-authored interpretations in this PDF.';
  const wrapped = doc.splitTextToSize(summaryText, pageWidth - margin * 2);
  doc.text(wrapped, margin, y);
  y += wrapped.length * 13 + 12;

  if (aiSummary?.caveats?.length) {
    if (y > 680) {
      doc.addPage();
      y = 48;
    }
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 76, 74);
    doc.text('Key Caveats:', margin, y);
    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(55, 70, 68);
    for (const caveat of aiSummary.caveats) {
      const lines = doc.splitTextToSize(`• ${caveat}`, pageWidth - margin * 2);
      if (y + lines.length * 12 > 780) {
        doc.addPage();
        y = 48;
      }
      doc.text(lines, margin, y);
      y += lines.length * 12 + 4;
    }
  }

  const slug = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
  doc.save(`taxatrace-${slug}-report.pdf`);
}
