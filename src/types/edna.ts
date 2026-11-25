export type UserRole = 'user' | 'admin';

export type ResearcherProfession =
  | 'Student'
  | 'Researcher'
  | 'Ecologist'
  | 'Bioinformatician'
  | 'Government'
  | 'Other';

export type MarkerGene = '12S' | '16S' | '18S' | 'COI' | 'ITS' | 'rbcL';

export type HabitatType =
  | 'Marine Coastal'
  | 'Estuary'
  | 'Freshwater River'
  | 'Freshwater Lake'
  | 'Coral Reef'
  | 'Kelp Forest'
  | 'Wetland'
  | 'Soil / Terrestrial'
  | 'Deep Sea';

export type ProjectStatus = 'draft' | 'processing' | 'completed' | 'error';

export type JobStage =
  | 'queued'
  | 'uploading'
  | 'quality_filter'
  | 'deduplicating'
  | 'chimera_check'
  | 'clustering'
  | 'taxonomy_assignment'
  | 'diversity_metrics'
  | 'completed'
  | 'failed';

export type AssignmentStatus =
  | 'Assigned'
  | 'Low confidence'
  | 'Unclassified, possible novel taxon';

export type ClassifierMode = 'demo_kmer' | 'online_blast_bold';

export type ClusteringMode = 'otu_97' | 'asv';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  institution: string;
  profession: ResearcherProfession;
  role: UserRole;
  country: string;
  createdAt: string;
  disabled: boolean;
  emailVerified: boolean;
}

export interface ProjectRecord {
  id: string;
  ownerUid: string;
  ownerName?: string;
  name: string;
  description: string;
  markerGene: MarkerGene;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  storageBytes: number;
  aiSummary?: EcologicalAiSummary;
}

export interface JobRecord {
  id: string;
  projectId: string;
  projectName: string;
  ownerUid: string;
  stage: JobStage;
  progress: number;
  status: 'running' | 'completed' | 'failed';
  classifierMode: ClassifierMode;
  clusteringMode: ClusteringMode;
  readsInput: number;
  readsPassed: number;
  chimerasFlagged: number;
  clustersGenerated: number;
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface AuditLogEntry {
  id: string;
  actorUid: string;
  actorEmail: string;
  action: string;
  target: string;
  details?: string;
  ts: string;
}

export interface AnnouncementBanner {
  id: string;
  message: string;
  severity: 'info' | 'warning' | 'maintenance';
  active: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface SampleMetadata {
  id: string;
  projectId: string;
  ownerUid: string;
  siteName: string;
  latitude: number;
  longitude: number;
  depthMeters: number;
  collectionDate: string;
  habitat: HabitatType;
  markerGene: MarkerGene;
  fileName?: string;
  fileSizeBytes?: number;
  readCount: number;
}

export interface RawSequenceRead {
  id: string;
  header: string;
  sequence: string;
  meanPhred?: number;
  abundance: number;
  sampleId?: string;
}

export interface SequenceRecord {
  id: string;
  projectId: string;
  sampleId: string;
  ownerUid: string;
  header: string;
  sequence: string;
  length: number;
  meanPhred: number;
  abundance: number;
  isChimera: boolean;
  clusterId: string;
  clusteringMode: ClusteringMode;
}

export interface TaxonReference {
  id: string;
  ownerUid?: string;
  markerGene: MarkerGene;
  kingdom: string;
  phylum: string;
  className: string;
  orderName: string;
  family: string;
  genus: string;
  species: string;
  commonName: string;
  habitat: string;
  accessionId: string;
  referenceSequence: string;
}

export interface TaxonomicAssignment {
  id: string;
  projectId: string;
  sampleId: string;
  sequenceId: string;
  ownerUid: string;
  clusterId: string;
  abundance: number;
  kingdom: string;
  phylum: string;
  className: string;
  orderName: string;
  family: string;
  genus: string;
  species: string;
  percentIdentity: number;
  confidence: number;
  status: AssignmentStatus;
  classifierUsed: ClassifierMode;
  referenceAccession?: string;
  caveatNote?: string;
}

export interface AlphaDiversityMetrics {
  sampleId: string;
  siteName: string;
  totalReads: number;
  richness: number;
  shannon: number;
  simpson: number;
  pielouEvenness: number;
  chao1: number;
  novelTaxaCount: number;
}

export interface PCoAPoint {
  sampleId: string;
  siteName: string;
  habitat: string;
  pc1: number;
  pc2: number;
}

export interface BetaDiversityResult {
  metric: 'bray_curtis' | 'jaccard';
  sampleIds: string[];
  siteNames: string[];
  matrix: number[][];
  pcoa: PCoAPoint[];
  varianceExplained: [number, number];
}

export interface RarefactionPoint {
  depth: number;
  [sampleKey: string]: number;
}

export interface EcologicalAiSummary {
  generatedAt: string;
  model: string;
  executiveOverview: string;
  communityStructure: string;
  novelTaxaInterpretation: string;
  caveats: string[];
  recommendedNextSteps: string[];
}
