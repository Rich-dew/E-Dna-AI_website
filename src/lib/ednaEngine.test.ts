import test from 'node:test';
import assert from 'node:assert/strict';
import {
  brayCurtisDissimilarity,
  classifySequenceKmer,
  computeAlphaDiversity,
  computeBetaDiversity,
  computeRarefactionCurves,
  jaccardDistance,
  parseEdnaFile,
  runBioinformaticsPipeline,
  sanitizeHeader,
} from './ednaEngine';
import { SAMPLE_UPLOAD_FASTA, SEED_TAXA_REFERENCE } from './seedData';
import type { SampleMetadata, TaxonomicAssignment } from '../types/edna';

test('sanitizeHeader strips unsafe characters and FASTA prefix', () => {
  assert.equal(sanitizeHeader('>Sample 01 <script>;$bad'), 'Sample_01_scriptbad');
  assert.equal(sanitizeHeader('@Read_A size=12'), 'Read_A_size=12');
});

test('parseEdnaFile parses FASTA, FASTQ, and CSV OTU tables', () => {
  const fastaReads = parseEdnaFile(SAMPLE_UPLOAD_FASTA, 'kelp_sample.fasta');
  assert.equal(fastaReads.length, 7);
  assert.equal(fastaReads[0].abundance, 145);

  const fastqContent = `@READ_1\n${SEED_TAXA_REFERENCE[0].referenceSequence}\n+\n${'I'.repeat(
    SEED_TAXA_REFERENCE[0].referenceSequence.length,
  )}\n`;
  const fqReads = parseEdnaFile(fastqContent, 'sample.fastq');
  assert.equal(fqReads.length, 1);
  assert.equal(fqReads[0].meanPhred, 40);

  const csvContent = `otu_id,sequence,count\nOTU_A,${SEED_TAXA_REFERENCE[0].referenceSequence},88\n`;
  const csvReads = parseEdnaFile(csvContent, 'otus.csv');
  assert.equal(csvReads.length, 1);
  assert.equal(csvReads[0].abundance, 88);
});

test('bioinformatics pipeline filters low-quality reads, flags chimeras, and clusters', () => {
  const reads = parseEdnaFile(SAMPLE_UPLOAD_FASTA, 'kelp_sample.fasta');
  const out = runBioinformaticsPipeline(reads, {
    clusteringMode: 'otu_97',
    projectId: 'p1',
    sampleId: 's1',
    ownerUid: 'u1',
  });

  // Short N-rich read (3 reads) should be filtered out
  assert.equal(out.readsInput, 145 + 98 + 84 + 42 + 29 + 8 + 3);
  assert.equal(out.readsPassedQuality, 145 + 98 + 84 + 42 + 29 + 8);
  assert.ok(out.sequences.length >= 4);
  assert.ok(out.chimerasFlagged >= 0);
});

test('k-mer classifier calibrates Assigned, Low confidence, and Unclassified novel taxon', () => {
  const exactSeq = {
    id: 'seq-1',
    projectId: 'p1',
    sampleId: 's1',
    ownerUid: 'u1',
    header: 'exact',
    sequence: SEED_TAXA_REFERENCE[0].referenceSequence,
    length: SEED_TAXA_REFERENCE[0].referenceSequence.length,
    meanPhred: 36,
    abundance: 100,
    isChimera: false,
    clusterId: 'OTU_001',
    clusteringMode: 'otu_97' as const,
  };

  const assigned = classifySequenceKmer(exactSeq, '12S', SEED_TAXA_REFERENCE);
  assert.equal(assigned.status, 'Assigned');
  assert.equal(assigned.species, 'Sebastes mystinus');
  assert.equal(assigned.percentIdentity, 100);

  const novelSeq = {
    ...exactSeq,
    id: 'seq-novel',
    clusterId: 'OTU_002',
    sequence:
      'ATGCGATCGTAGCTAGCTAGTCGATGCTAGCTAGTCGATCGTAGCTAGTCAGTCGATGCTACGTAGTCGATGCTAGCTAGTCGATGCTAGCTGATCGTAGCTAGTCGATGCTAGCTAGTCGATCGTAGCTAGTCAGTCGATGCTACGTAGTCGATGCTAGCTAGTCGATGCTAGCTGATCGTAGCTAGTCGATGCTAG',
  };
  const novel = classifySequenceKmer(novelSeq, '12S', SEED_TAXA_REFERENCE);
  assert.equal(novel.status, 'Unclassified, possible novel taxon');
  assert.ok(novel.percentIdentity < 90);
});

test('alpha, beta diversity, PCoA, and rarefaction math are accurate', () => {
  // Equal abundance of 4 species: Shannon = ln(4) ≈ 1.386, Simpson = 0.75, Pielou = 1.0
  const alpha = computeAlphaDiversity([25, 25, 25, 25], 's1', 'Equal Site', 0);
  assert.equal(alpha.richness, 4);
  assert.ok(Math.abs(alpha.shannon - Math.log(4)) < 0.01);
  assert.equal(alpha.simpson, 0.75);
  assert.equal(alpha.pielouEvenness, 1);

  assert.equal(brayCurtisDissimilarity([10, 0], [0, 10]), 1);
  assert.equal(brayCurtisDissimilarity([10, 5], [10, 5]), 0);
  assert.equal(jaccardDistance([1, 1, 0], [1, 0, 1]), Number((1 - 1 / 3).toFixed(4)));

  const samples: SampleMetadata[] = [
    {
      id: 's1',
      projectId: 'p1',
      ownerUid: 'u1',
      siteName: 'Site A',
      latitude: 36.5,
      longitude: -121.9,
      depthMeters: 10,
      collectionDate: '2026-10-15',
      habitat: 'Kelp Forest',
      markerGene: '12S',
      readCount: 100,
    },
    {
      id: 's2',
      projectId: 'p1',
      ownerUid: 'u1',
      siteName: 'Site B',
      latitude: 36.8,
      longitude: -121.7,
      depthMeters: 5,
      collectionDate: '2026-10-16',
      habitat: 'Estuary',
      markerGene: '12S',
      readCount: 100,
    },
  ];
  const assignments: TaxonomicAssignment[] = [
    {
      id: 'a1',
      projectId: 'p1',
      sampleId: 's1',
      sequenceId: 'sq1',
      ownerUid: 'u1',
      clusterId: 'OTU_001',
      abundance: 80,
      kingdom: 'Animalia',
      phylum: 'Chordata',
      className: 'Actinopterygii',
      orderName: 'Scorpaeniformes',
      family: 'Sebastidae',
      genus: 'Sebastes',
      species: 'Sebastes mystinus',
      percentIdentity: 99.5,
      confidence: 0.99,
      status: 'Assigned',
      classifierUsed: 'demo_kmer',
    },
    {
      id: 'a2',
      projectId: 'p1',
      sampleId: 's2',
      sequenceId: 'sq2',
      ownerUid: 'u1',
      clusterId: 'OTU_002',
      abundance: 90,
      kingdom: 'Animalia',
      phylum: 'Chordata',
      className: 'Actinopterygii',
      orderName: 'Pleuronectiformes',
      family: 'Pleuronectidae',
      genus: 'Platichthys',
      species: 'Platichthys stellatus',
      percentIdentity: 99.1,
      confidence: 0.99,
      status: 'Assigned',
      classifierUsed: 'demo_kmer',
    },
  ];

  const beta = computeBetaDiversity(samples, assignments, 'bray_curtis');
  assert.equal(beta.matrix[0][1], 1);
  assert.equal(beta.pcoa.length, 2);

  const rare = computeRarefactionCurves(samples, assignments, 5);
  assert.equal(rare.length, 6);
  assert.equal(rare[0].depth, 0);
});
