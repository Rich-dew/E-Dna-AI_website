import type {
  AlphaDiversityMetrics,
  AssignmentStatus,
  BetaDiversityResult,
  ClassifierMode,
  ClusteringMode,
  MarkerGene,
  PCoAPoint,
  RarefactionPoint,
  RawSequenceRead,
  SampleMetadata,
  SequenceRecord,
  TaxonReference,
  TaxonomicAssignment,
} from '../types/edna';

export function sanitizeHeader(raw: string): string {
  return raw
    .replace(/^[>@]+/, '')
    .replace(/[<>"'`$;\\]/g, '')
    .replace(/\s+/g, '_')
    .trim()
    .slice(0, 96) || 'unnamed_read';
}

function parseAbundanceFromHeader(header: string): number {
  const match = header.match(/(?:size|count|abundance)[=:](\d+)/i);
  if (match) {
    const val = Number(match[1]);
    if (Number.isFinite(val) && val > 0) return val;
  }
  return 1;
}

function computeMeanPhred(qualityLine: string): number {
  if (!qualityLine) return 35;
  let sum = 0;
  for (let i = 0; i < qualityLine.length; i++) {
    sum += Math.max(0, qualityLine.charCodeAt(i) - 33);
  }
  return Number((sum / qualityLine.length).toFixed(2));
}

export function parseEdnaFile(content: string, filename: string): RawSequenceRead[] {
  const trimmed = content.trim();
  if (!trimmed) return [];

  const lower = filename.toLowerCase();
  const lines = trimmed.split(/\r?\n/);

  // FASTQ parser
  if (lower.endsWith('.fastq') || lower.endsWith('.fq') || trimmed.startsWith('@')) {
    const reads: RawSequenceRead[] = [];
    for (let i = 0; i + 3 < lines.length; i += 4) {
      const headerLine = lines[i].trim();
      const seqLine = lines[i + 1].trim().toUpperCase().replace(/[^ACGTN]/g, '');
      const qualLine = lines[i + 3].trim();
      if (!headerLine.startsWith('@') || !seqLine) continue;
      const cleanHeader = sanitizeHeader(headerLine);
      reads.push({
        id: `raw-${reads.length + 1}`,
        header: cleanHeader,
        sequence: seqLine,
        meanPhred: computeMeanPhred(qualLine),
        abundance: parseAbundanceFromHeader(headerLine),
      });
    }
    return reads;
  }

  // CSV / TSV OTU or ASV table parser
  if (lower.endsWith('.csv') || lower.endsWith('.tsv')) {
    const delimiter = lower.endsWith('.tsv') ? '\t' : ',';
    if (lines.length < 2) return [];
    const headerCols = lines[0].split(delimiter).map((c) => c.trim().toLowerCase());
    const idIdx = headerCols.findIndex((c) => c.includes('id') || c.includes('otu') || c.includes('asv') || c.includes('name'));
    const seqIdx = headerCols.findIndex((c) => c.includes('seq'));
    const countIdx = headerCols.findIndex((c) => c.includes('count') || c.includes('abund') || c.includes('reads'));

    const reads: RawSequenceRead[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(delimiter).map((c) => c.trim());
      if (cols.length < 2) continue;
      const rawId = cols[idIdx >= 0 ? idIdx : 0] || `OTU_${i}`;
      const rawSeq = (cols[seqIdx >= 0 ? seqIdx : 1] || '').toUpperCase().replace(/[^ACGTN]/g, '');
      const rawCount = Number(cols[countIdx >= 0 ? countIdx : 2] ?? '1');
      if (rawSeq.length < 20) continue;
      reads.push({
        id: `raw-${reads.length + 1}`,
        header: sanitizeHeader(rawId),
        sequence: rawSeq,
        meanPhred: 36,
        abundance: Number.isFinite(rawCount) && rawCount > 0 ? Math.round(rawCount) : 1,
      });
    }
    return reads;
  }

  // FASTA parser
  const reads: RawSequenceRead[] = [];
  let currentHeader = '';
  let currentSeq = '';

  const flush = () => {
    if (!currentHeader || !currentSeq) return;
    const cleaned = currentSeq.toUpperCase().replace(/[^ACGTN]/g, '');
    if (!cleaned) return;
    reads.push({
      id: `raw-${reads.length + 1}`,
      header: sanitizeHeader(currentHeader),
      sequence: cleaned,
      meanPhred: 35,
      abundance: parseAbundanceFromHeader(currentHeader),
    });
  };

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (t.startsWith('>')) {
      flush();
      currentHeader = t;
      currentSeq = '';
    } else {
      currentSeq += t;
    }
  }
  flush();
  return reads;
}

export function extractKmers(sequence: string, k: number = 6): Set<string> {
  const clean = sequence.toUpperCase();
  const kmers = new Set<string>();
  for (let i = 0; i <= clean.length - k; i++) {
    const sub = clean.slice(i, i + k);
    if (!sub.includes('N')) {
      kmers.add(sub);
    }
  }
  return kmers;
}

export function computeKmerSimilarity(seqA: string, seqB: string, k: number = 6): number {
  const setA = extractKmers(seqA, k);
  const setB = extractKmers(seqB, k);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const mer of setA) {
    if (setB.has(mer)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Estimates nucleotide % identity from 6-mer Jaccard similarity.
 * Under single-base substitution rate p, Jaccard ≈ (1-p)^k / (2 - (1-p)^k).
 * Solving for (1-p) gives calibrated biological % identity.
 */
export function kmerJaccardToIdentity(jaccard: number, k: number = 6): number {
  if (jaccard <= 0) return 0;
  if (jaccard >= 1) return 100;
  const s = (2 * jaccard) / (1 + jaccard);
  const identity = Math.pow(s, 1 / k) * 100;
  return Number(Math.min(100, Math.max(0, identity)).toFixed(2));
}

export interface PipelineOptions {
  minLength?: number;
  minPhred?: number;
  maxAmbiguousFrac?: number;
  clusteringMode: ClusteringMode;
  projectId: string;
  sampleId: string;
  ownerUid: string;
}

export interface PipelineOutput {
  readsInput: number;
  readsPassedQuality: number;
  uniqueBeforeCluster: number;
  chimerasFlagged: number;
  sequences: SequenceRecord[];
}

export function runBioinformaticsPipeline(
  rawReads: RawSequenceRead[],
  options: PipelineOptions,
): PipelineOutput {
  const minLength = options.minLength ?? 80;
  const minPhred = options.minPhred ?? 20;
  const maxAmbiguousFrac = options.maxAmbiguousFrac ?? 0.05;

  const readsInput = rawReads.reduce((acc, r) => acc + r.abundance, 0);

  // Stage 1: Quality filtering
  const passed = rawReads.filter((r) => {
    if (r.sequence.length < minLength) return false;
    const phred = r.meanPhred ?? 35;
    if (phred < minPhred) return false;
    const nCount = (r.sequence.match(/N/g) || []).length;
    if (nCount / r.sequence.length > maxAmbiguousFrac) return false;
    return true;
  });

  const readsPassedQuality = passed.reduce((acc, r) => acc + r.abundance, 0);

  // Stage 2: Exact Deduplication (Dereplication)
  const dedupMap = new Map<string, { header: string; sequence: string; abundance: number; phredSum: number; phredCount: number }>();
  for (const read of passed) {
    const existing = dedupMap.get(read.sequence);
    const phred = read.meanPhred ?? 35;
    if (existing) {
      existing.abundance += read.abundance;
      existing.phredSum += phred * read.abundance;
      existing.phredCount += read.abundance;
    } else {
      dedupMap.set(read.sequence, {
        header: read.header,
        sequence: read.sequence,
        abundance: read.abundance,
        phredSum: phred * read.abundance,
        phredCount: read.abundance,
      });
    }
  }

  // Sort by descending abundance
  const dereplicated = Array.from(dedupMap.values()).sort((a, b) => b.abundance - a.abundance);

  // Stage 3: Bipartite Chimera Detection (checks if left half matches parent A and right half matches parent B)
  let chimerasFlagged = 0;
  const annotated = dereplicated.map((entry, idx) => {
    let isChimera = false;
    if (idx >= 2) {
      const mid = Math.floor(entry.sequence.length / 2);
      const leftHalf = entry.sequence.slice(0, mid);
      const rightHalf = entry.sequence.slice(mid);
      const parents = dereplicated.slice(0, idx).filter((p) => p.abundance >= entry.abundance * 2);

      let bestLeftParent = -1;
      let bestLeftSim = 0;
      let bestRightParent = -1;
      let bestRightSim = 0;
      let bestWholeSim = 0;

      parents.forEach((p, pIdx) => {
        const wholeSim = computeKmerSimilarity(entry.sequence, p.sequence, 6);
        if (wholeSim > bestWholeSim) bestWholeSim = wholeSim;
        const pMid = Math.floor(p.sequence.length / 2);
        const lSim = computeKmerSimilarity(leftHalf, p.sequence.slice(0, pMid), 6);
        const rSim = computeKmerSimilarity(rightHalf, p.sequence.slice(pMid), 6);
        if (lSim > bestLeftSim) {
          bestLeftSim = lSim;
          bestLeftParent = pIdx;
        }
        if (rSim > bestRightSim) {
          bestRightSim = rSim;
          bestRightParent = pIdx;
        }
      });

      if (
        bestLeftParent !== -1 &&
        bestRightParent !== -1 &&
        bestLeftParent !== bestRightParent &&
        bestLeftSim >= 0.72 &&
        bestRightSim >= 0.72 &&
        bestWholeSim < Math.min(bestLeftSim, bestRightSim) - 0.1
      ) {
        isChimera = true;
        chimerasFlagged++;
      }
    }
    return {
      ...entry,
      meanPhred: Number((entry.phredSum / Math.max(1, entry.phredCount)).toFixed(2)),
      isChimera,
    };
  });

  // Stage 4: OTU Clustering at 97% OR ASV passthrough
  const records: SequenceRecord[] = [];
  if (options.clusteringMode === 'asv') {
    annotated.forEach((entry, idx) => {
      records.push({
        id: `${options.sampleId}-asv-${idx + 1}`,
        projectId: options.projectId,
        sampleId: options.sampleId,
        ownerUid: options.ownerUid,
        header: entry.header,
        sequence: entry.sequence,
        length: entry.sequence.length,
        meanPhred: entry.meanPhred,
        abundance: entry.abundance,
        isChimera: entry.isChimera,
        clusterId: `ASV_${String(idx + 1).padStart(3, '0')}`,
        clusteringMode: 'asv',
      });
    });
  } else {
    // Greedy 97% centroid clustering (non-chimeras)
    const centroids: Array<{
      clusterId: string;
      header: string;
      sequence: string;
      abundance: number;
      meanPhred: number;
      isChimera: boolean;
    }> = [];

    for (const entry of annotated) {
      if (entry.isChimera) {
        centroids.push({
          clusterId: `CHIM_${String(centroids.length + 1).padStart(3, '0')}`,
          header: entry.header,
          sequence: entry.sequence,
          abundance: entry.abundance,
          meanPhred: entry.meanPhred,
          isChimera: true,
        });
        continue;
      }

      let merged = false;
      for (const centroid of centroids) {
        if (centroid.isChimera) continue;
        const idPct = kmerJaccardToIdentity(computeKmerSimilarity(entry.sequence, centroid.sequence, 6));
        if (idPct >= 97) {
          centroid.abundance += entry.abundance;
          merged = true;
          break;
        }
      }

      if (!merged) {
        centroids.push({
          clusterId: `OTU_${String(centroids.length + 1).padStart(3, '0')}`,
          header: entry.header,
          sequence: entry.sequence,
          abundance: entry.abundance,
          meanPhred: entry.meanPhred,
          isChimera: false,
        });
      }
    }

    centroids.forEach((c, idx) => {
      records.push({
        id: `${options.sampleId}-otu-${idx + 1}`,
        projectId: options.projectId,
        sampleId: options.sampleId,
        ownerUid: options.ownerUid,
        header: c.header,
        sequence: c.sequence,
        length: c.sequence.length,
        meanPhred: c.meanPhred,
        abundance: c.abundance,
        isChimera: c.isChimera,
        clusterId: c.clusterId,
        clusteringMode: 'otu_97',
      });
    });
  }

  return {
    readsInput,
    readsPassedQuality,
    uniqueBeforeCluster: dereplicated.length,
    chimerasFlagged,
    sequences: records,
  };
}

export function classifySequenceKmer(
  seq: SequenceRecord,
  markerGene: MarkerGene,
  referenceDb: TaxonReference[],
  classifierUsed: ClassifierMode = 'demo_kmer',
): TaxonomicAssignment {
  // Prioritize matching marker gene references, then fallback to full reference table
  const sameMarker = referenceDb.filter((ref) => ref.markerGene === markerGene);
  const candidates = sameMarker.length > 0 ? sameMarker : referenceDb;

  let bestRef: TaxonReference | null = null;
  let bestJaccard = 0;

  for (const ref of candidates) {
    const sim = computeKmerSimilarity(seq.sequence, ref.referenceSequence, 6);
    if (sim > bestJaccard) {
      bestJaccard = sim;
      bestRef = ref;
    }
  }

  const percentIdentity = kmerJaccardToIdentity(bestJaccard, 6);
  const confidence = Number(Math.min(0.99, Math.max(0.05, percentIdentity / 100)).toFixed(2));

  if (bestRef && percentIdentity >= 97) {
    return {
      id: `asg-${seq.id}`,
      projectId: seq.projectId,
      sampleId: seq.sampleId,
      sequenceId: seq.id,
      ownerUid: seq.ownerUid,
      clusterId: seq.clusterId,
      abundance: seq.abundance,
      kingdom: bestRef.kingdom,
      phylum: bestRef.phylum,
      className: bestRef.className,
      orderName: bestRef.orderName,
      family: bestRef.family,
      genus: bestRef.genus,
      species: bestRef.species,
      percentIdentity,
      confidence,
      status: 'Assigned',
      classifierUsed,
      referenceAccession: bestRef.accessionId,
    };
  }

  if (bestRef && percentIdentity >= 90) {
    return {
      id: `asg-${seq.id}`,
      projectId: seq.projectId,
      sampleId: seq.sampleId,
      sequenceId: seq.id,
      ownerUid: seq.ownerUid,
      clusterId: seq.clusterId,
      abundance: seq.abundance,
      kingdom: bestRef.kingdom,
      phylum: bestRef.phylum,
      className: bestRef.className,
      orderName: bestRef.orderName,
      family: bestRef.family,
      genus: bestRef.genus,
      species: `${bestRef.genus} sp. (unresolved)`,
      percentIdentity,
      confidence: Number((confidence * 0.85).toFixed(2)),
      status: 'Low confidence',
      classifierUsed,
      referenceAccession: bestRef.accessionId,
      caveatNote:
        'Sequence identity is between 90% and 96.9%; species-level call withheld to prevent over-claiming.',
    };
  }

  const status: AssignmentStatus = 'Unclassified, possible novel taxon';
  return {
    id: `asg-${seq.id}`,
    projectId: seq.projectId,
    sampleId: seq.sampleId,
    sequenceId: seq.id,
    ownerUid: seq.ownerUid,
    clusterId: seq.clusterId,
    abundance: seq.abundance,
    kingdom: bestRef && percentIdentity >= 78 ? bestRef.kingdom : 'Unclassified',
    phylum: 'Unclassified',
    className: 'Unclassified',
    orderName: 'Unclassified',
    family: 'Unclassified',
    genus: 'Unclassified',
    species: 'Unclassified taxon',
    percentIdentity,
    confidence: Number(Math.min(0.45, confidence * 0.5).toFixed(2)),
    status,
    classifierUsed,
    caveatNote:
      'Below 90% reference similarity; may represent a novel lineage, underrepresented regional taxon, or sequencing artifact.',
  };
}

export function computeAlphaDiversity(
  counts: number[],
  sampleId: string = 'sample',
  siteName: string = 'Site',
  novelTaxaCount: number = 0,
): AlphaDiversityMetrics {
  const positive = counts.filter((c) => c > 0);
  const richness = positive.length;
  const totalReads = positive.reduce((a, b) => a + b, 0);

  if (richness === 0 || totalReads === 0) {
    return {
      sampleId,
      siteName,
      totalReads: 0,
      richness: 0,
      shannon: 0,
      simpson: 0,
      pielouEvenness: 0,
      chao1: 0,
      novelTaxaCount,
    };
  }

  let shannon = 0;
  let simpsonSum = 0;
  let f1 = 0;
  let f2 = 0;

  for (const count of positive) {
    const p = count / totalReads;
    shannon -= p * Math.log(p);
    simpsonSum += p * p;
    if (count === 1) f1++;
    if (count === 2) f2++;
  }

  const simpson = 1 - simpsonSum;
  const pielouEvenness = richness > 1 ? shannon / Math.log(richness) : 1;
  // Bias-corrected Chao1 estimator when f2 == 0
  const chao1 =
    f2 > 0
      ? richness + (f1 * f1) / (2 * f2)
      : richness + (f1 * Math.max(0, f1 - 1)) / 2;

  return {
    sampleId,
    siteName,
    totalReads,
    richness,
    shannon: Number(shannon.toFixed(3)),
    simpson: Number(simpson.toFixed(3)),
    pielouEvenness: Number(pielouEvenness.toFixed(3)),
    chao1: Number(chao1.toFixed(2)),
    novelTaxaCount,
  };
}

export function brayCurtisDissimilarity(vecA: number[], vecB: number[]): number {
  let num = 0;
  let den = 0;
  for (let i = 0; i < vecA.length; i++) {
    num += Math.abs(vecA[i] - vecB[i]);
    den += vecA[i] + vecB[i];
  }
  return den === 0 ? 0 : Number((num / den).toFixed(4));
}

export function jaccardDistance(vecA: number[], vecB: number[]): number {
  let shared = 0;
  let union = 0;
  for (let i = 0; i < vecA.length; i++) {
    const a = vecA[i] > 0;
    const b = vecB[i] > 0;
    if (a && b) shared++;
    if (a || b) union++;
  }
  return union === 0 ? 0 : Number((1 - shared / union).toFixed(4));
}

// Power iteration for top 2 eigenvectors of symmetric positive-semidefinite matrix B
function topTwoEigen(B: number[][]): { values: [number, number]; vectors: [number[], number[]] } {
  const n = B.length;
  if (n === 0) return { values: [0, 0], vectors: [[], []] };
  if (n === 1) return { values: [0, 0], vectors: [[0], [0]] };

  const matVec = (M: number[][], v: number[]) =>
    M.map((row) => row.reduce((sum, val, j) => sum + val * v[j], 0));

  const norm = (v: number[]) => Math.sqrt(v.reduce((s, x) => s + x * x, 0));

  const iterate = (M: number[][], seedShift: number) => {
    let v = Array.from({ length: n }, (_, i) => Math.sin((i + 1) * (seedShift + 1.37)) + 0.5);
    const nv = norm(v) || 1;
    v = v.map((x) => x / nv);
    let eigenvalue = 0;

    for (let iter = 0; iter < 60; iter++) {
      const w = matVec(M, v);
      eigenvalue = v.reduce((s, x, i) => s + x * w[i], 0);
      const wn = norm(w);
      if (wn < 1e-10) break;
      v = w.map((x) => x / wn);
    }
    return { value: Math.max(0, eigenvalue), vector: v };
  };

  const first = iterate(B, 1);
  // Deflate matrix B -> B2 = B - lambda1 * v1 * v1^T
  const B2 = B.map((row, i) =>
    row.map((val, j) => val - first.value * first.vector[i] * first.vector[j]),
  );
  const second = iterate(B2, 2);

  return {
    values: [first.value, second.value],
    vectors: [first.vector, second.vector],
  };
}

export function computeBetaDiversity(
  samples: SampleMetadata[],
  assignments: TaxonomicAssignment[],
  metric: 'bray_curtis' | 'jaccard',
): BetaDiversityResult {
  const sampleIds = samples.map((s) => s.id);
  const siteNames = samples.map((s) => s.siteName);
  const n = samples.length;

  // Build taxa abundance matrix (sample x taxon key)
  const taxonKeys = Array.from(
    new Set(
      assignments.map((a) =>
        a.status === 'Unclassified, possible novel taxon'
          ? `Novel:${a.clusterId}`
          : `${a.genus}_${a.species}`,
      ),
    ),
  );

  const vectors: number[][] = samples.map((s) => {
    const sampleAssignments = assignments.filter((a) => a.sampleId === s.id);
    const map = new Map<string, number>();
    for (const a of sampleAssignments) {
      const key =
        a.status === 'Unclassified, possible novel taxon'
          ? `Novel:${a.clusterId}`
          : `${a.genus}_${a.species}`;
      map.set(key, (map.get(key) ?? 0) + a.abundance);
    }
    return taxonKeys.map((k) => map.get(k) ?? 0);
  });

  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d =
        metric === 'bray_curtis'
          ? brayCurtisDissimilarity(vectors[i], vectors[j])
          : jaccardDistance(vectors[i], vectors[j]);
      matrix[i][j] = d;
      matrix[j][i] = d;
    }
  }

  // Classical MDS (PCoA): B = -0.5 * J * D^2 * J
  const D2 = matrix.map((row) => row.map((d) => d * d));
  const rowMeans = D2.map((row) => row.reduce((a, b) => a + b, 0) / Math.max(1, n));
  const grandMean = rowMeans.reduce((a, b) => a + b, 0) / Math.max(1, n);

  const B: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => -0.5 * (D2[i][j] - rowMeans[i] - rowMeans[j] + grandMean)),
  );

  const { values, vectors: eigVecs } = topTwoEigen(B);
  const trace = B.reduce((sum, row, i) => sum + Math.max(0, row[i]), 0);
  const var1 = trace > 1e-9 ? Math.min(100, Number(((values[0] / trace) * 100).toFixed(1))) : 0;
  const var2 = trace > 1e-9 ? Math.min(100 - var1, Number(((values[1] / trace) * 100).toFixed(1))) : 0;

  const pcoa: PCoAPoint[] = samples.map((s, idx) => ({
    sampleId: s.id,
    siteName: s.siteName,
    habitat: s.habitat,
    pc1: Number((Math.sqrt(values[0]) * (eigVecs[0][idx] ?? 0)).toFixed(3)),
    pc2: Number((Math.sqrt(values[1]) * (eigVecs[1][idx] ?? 0)).toFixed(3)),
  }));

  return {
    metric,
    sampleIds,
    siteNames,
    matrix,
    pcoa,
    varianceExplained: [var1, var2],
  };
}

/**
 * Analytic Hurlbert rarefaction E[S_n] = sum_i (1 - C(N - N_i, n) / C(N, n))
 * computed stably in log-space via log-gamma / iterative product.
 */
export function hurlbertExpectedRichness(counts: number[], subsampleDepth: number): number {
  const positive = counts.filter((c) => c > 0);
  const N = positive.reduce((a, b) => a + b, 0);
  if (N === 0 || subsampleDepth <= 0) return 0;
  const n = Math.min(subsampleDepth, N);
  let expected = 0;

  for (const ni of positive) {
    if (N - ni < n) {
      expected += 1;
      continue;
    }
    let probAbsent = 1;
    for (let k = 0; k < n; k++) {
      probAbsent *= (N - ni - k) / (N - k);
    }
    expected += 1 - probAbsent;
  }
  return Number(expected.toFixed(2));
}

export function computeRarefactionCurves(
  samples: SampleMetadata[],
  assignments: TaxonomicAssignment[],
  steps: number = 10,
): RarefactionPoint[] {
  const sampleCounts = samples.map((s) => {
    const counts = assignments
      .filter((a) => a.sampleId === s.id)
      .map((a) => a.abundance);
    return {
      siteName: s.siteName,
      counts,
      total: counts.reduce((a, b) => a + b, 0),
    };
  });

  const maxDepth = Math.max(50, ...sampleCounts.map((sc) => sc.total));
  const points: RarefactionPoint[] = [];

  for (let step = 0; step <= steps; step++) {
    const depth = Math.round((maxDepth / steps) * step);
    const pt: RarefactionPoint = { depth };
    for (const sc of sampleCounts) {
      if (depth <= sc.total) {
        pt[sc.siteName] = hurlbertExpectedRichness(sc.counts, depth);
      }
    }
    points.push(pt);
  }
  return points;
}
