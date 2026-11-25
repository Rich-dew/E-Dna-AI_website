import React, { useRef, useState } from 'react';
import { CheckCircle2, FileUp, Play, UploadCloud } from 'lucide-react';
import { parseEdnaFile } from '../lib/ednaEngine';
import { SAMPLE_UPLOAD_FASTA } from '../lib/seedData';
import { uploadEdnaFileToSupabase } from '../lib/supabase';
import { validateUploadFile } from '../lib/validation';
import type {
  ClassifierMode,
  ClusteringMode,
  HabitatType,
  JobRecord,
  MarkerGene,
  ProjectRecord,
  SampleMetadata,
} from '../types/edna';
import { useToast } from '../context/ToastContext';

const MARKER_GENES: MarkerGene[] = ['12S', '16S', '18S', 'COI', 'ITS', 'rbcL'];
const HABITATS: HabitatType[] = [
  'Kelp Forest',
  'Marine Coastal',
  'Estuary',
  'Freshwater River',
  'Freshwater Lake',
  'Coral Reef',
  'Wetland',
  'Soil / Terrestrial',
  'Deep Sea',
];

const PIPELINE_STEPS: Array<{ key: JobRecord['stage']; label: string }> = [
  { key: 'quality_filter', label: '01. Quality Filter (Phred & Length)' },
  { key: 'deduplicating', label: '02. Dereplication / Deduplicate' },
  { key: 'chimera_check', label: '03. Chimera Detection & Flagging' },
  { key: 'clustering', label: '04. OTU 97% Clustering / ASV Call' },
  { key: 'taxonomy_assignment', label: '05. Taxonomy Assignment' },
  { key: 'diversity_metrics', label: '06. Diversity Metrics & Indexing' },
];

interface UploadPipelinePanelProps {
  project: ProjectRecord;
  samples: SampleMetadata[];
  ownerUid: string;
  onAddSample: (input: {
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
  }) => SampleMetadata;
  onRunPipeline: (params: {
    projectId: string;
    sampleId: string;
    ownerUid: string;
    markerGene: MarkerGene;
    rawReads: ReturnType<typeof parseEdnaFile>;
    clusteringMode: ClusteringMode;
    classifierMode: ClassifierMode;
    fileName?: string;
    fileSizeBytes?: number;
    onProgress?: (stage: JobRecord['stage'], progress: number) => void;
  }) => Promise<{ job: JobRecord }>;
  onCompleteNavigate?: () => void;
}

export function UploadPipelinePanel({
  project,
  samples,
  ownerUid,
  onAddSample,
  onRunPipeline,
  onCompleteNavigate,
}: UploadPipelinePanelProps) {
  const { pushToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [siteName, setSiteName] = useState('Asilomar Reef Transect');
  const [latitude, setLatitude] = useState('36.6182');
  const [longitude, setLongitude] = useState('-121.9415');
  const [depthMeters, setDepthMeters] = useState('8.5');
  const [collectionDate, setCollectionDate] = useState('2026-11-20');
  const [habitat, setHabitat] = useState<HabitatType>('Kelp Forest');
  const [markerGene, setMarkerGene] = useState<MarkerGene>(project.markerGene);
  const [targetSampleId, setTargetSampleId] = useState<string>('__new__');

  const [clusteringMode, setClusteringMode] = useState<ClusteringMode>('otu_97');
  const [classifierMode, setClassifierMode] = useState<ClassifierMode>('demo_kmer');

  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    size: number;
    content: string;
    format: string;
    readPreviewCount: number;
  } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const [running, setRunning] = useState(false);
  const [currentStage, setCurrentStage] = useState<JobRecord['stage'] | null>(null);
  const [progressPct, setProgressPct] = useState(0);
  const [lastJob, setLastJob] = useState<JobRecord | null>(null);

  const processFileObject = async (file: File) => {
    setFileError(null);
    const check = validateUploadFile(file.name, file.size);
    if (!check.valid) {
      setFileError(check.error || 'Invalid file.');
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseEdnaFile(text, check.sanitizedFileName);
      if (parsed.length === 0) {
        setFileError(
          'No valid DNA sequences were detected. Verify FASTA (>header), FASTQ (@header), or CSV/TSV sequence columns.',
        );
        return;
      }
      setSelectedFile({
        name: check.sanitizedFileName,
        size: file.size,
        content: text,
        format: check.format || 'fasta',
        readPreviewCount: parsed.length,
      });
      pushToast({
        type: 'success',
        title: `Loaded ${check.sanitizedFileName}`,
        description: `${parsed.length} sequence records validated with sanitized headers.`,
      });
    } catch {
      setFileError('Could not read file text. Check file permissions and encoding.');
    }
  };

  const handleLoadSampleFasta = () => {
    setFileError(null);
    const parsed = parseEdnaFile(SAMPLE_UPLOAD_FASTA, 'asilomar_kelp_12s_sample.fasta');
    setSelectedFile({
      name: 'asilomar_kelp_12s_sample.fasta',
      size: new Blob([SAMPLE_UPLOAD_FASTA]).size,
      content: SAMPLE_UPLOAD_FASTA,
      format: 'fasta',
      readPreviewCount: parsed.length,
    });
    pushToast({
      type: 'info',
      title: 'Sample FASTA loaded',
      description: 'Includes known species, a divergent variant, a novel taxon, a chimera, and a low-quality read.',
    });
  };

  const handleExecutePipeline = async () => {
    setFileError(null);
    if (!selectedFile) {
      setFileError('Upload a FASTA, FASTQ, CSV, or TSV file (or load the sample FASTA) first.');
      return;
    }

    let sampleId = targetSampleId;
    if (targetSampleId === '__new__') {
      const lat = Number(latitude);
      const lon = Number(longitude);
      const depth = Number(depthMeters);
      if (!siteName.trim() || !Number.isFinite(lat) || !Number.isFinite(lon)) {
        setFileError('Enter a valid site name, latitude, and longitude for the new sample.');
        return;
      }
      const created = onAddSample({
        projectId: project.id,
        ownerUid,
        siteName,
        latitude: lat,
        longitude: lon,
        depthMeters: Number.isFinite(depth) ? depth : 0,
        collectionDate,
        habitat,
        markerGene,
        fileName: selectedFile.name,
        fileSizeBytes: selectedFile.size,
      });
      sampleId = created.id;
    }

    setRunning(true);
    setProgressPct(5);
    setCurrentStage('uploading');

    try {
      await uploadEdnaFileToSupabase(
        ownerUid,
        project.id,
        selectedFile.name,
        new Blob([selectedFile.content], { type: 'text/plain' }),
      );
      const rawReads = parseEdnaFile(selectedFile.content, selectedFile.name);
      const { job } = await onRunPipeline({
        projectId: project.id,
        sampleId,
        ownerUid,
        markerGene,
        rawReads,
        clusteringMode,
        classifierMode,
        fileName: selectedFile.name,
        fileSizeBytes: selectedFile.size,
        onProgress: (stage, pct) => {
          setCurrentStage(stage);
          setProgressPct(pct);
        },
      });
      setLastJob(job);
      pushToast({
        type: 'success',
        title: 'eDNA pipeline complete',
        description: `${job.readsPassed} reads passed QC · ${job.chimerasFlagged} chimera(s) flagged · ${job.clustersGenerated} clusters classified.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Pipeline execution failed.';
      setFileError(msg);
      pushToast({ type: 'error', title: 'Pipeline failed', description: msg });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sample Metadata Column */}
        <div className="lg:col-span-5 rounded-xl border border-[#E3E1D8] dark:border-[#1C3432] bg-white dark:bg-[#0F1F1E] p-5 space-y-4">
          <div>
            <h3 className="font-display text-base font-semibold">1. Sample Metadata</h3>
            <p className="text-xs text-[#4A6361] dark:text-[#9DB6B3] mt-0.5">
              Attach geospatial and ecological context or select an existing site in this project.
            </p>
          </div>

          <div>
            <label htmlFor="target-sample" className="block text-xs font-medium mb-1">
              Target Sample
            </label>
            <select
              id="target-sample"
              value={targetSampleId}
              onChange={(e) => setTargetSampleId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[#D4D1C7] dark:border-[#244240] bg-[#FAF9F5] dark:bg-[#0A1615]"
            >
              <option value="__new__">+ Create new sampling site</option>
              {samples.map((s) => (
                <option key={s.id} value={s.id}>
                  Replace reads in: {s.siteName} ({s.markerGene})
                </option>
              ))}
            </select>
          </div>

          {targetSampleId === '__new__' && (
            <div className="space-y-3 pt-1">
              <div>
                <label htmlFor="site-name" className="block text-xs font-medium mb-1">
                  Site Name
                </label>
                <input
                  id="site-name"
                  type="text"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#D4D1C7] dark:border-[#244240] bg-[#FAF9F5] dark:bg-[#0A1615]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="site-lat" className="block text-xs font-medium mb-1">
                    Latitude
                  </label>
                  <input
                    id="site-lat"
                    type="number"
                    step="0.0001"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-[#D4D1C7] dark:border-[#244240] bg-[#FAF9F5] dark:bg-[#0A1615]"
                  />
                </div>
                <div>
                  <label htmlFor="site-lon" className="block text-xs font-medium mb-1">
                    Longitude
                  </label>
                  <input
                    id="site-lon"
                    type="number"
                    step="0.0001"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-[#D4D1C7] dark:border-[#244240] bg-[#FAF9F5] dark:bg-[#0A1615]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="site-depth" className="block text-xs font-medium mb-1">
                    Depth (m)
                  </label>
                  <input
                    id="site-depth"
                    type="number"
                    step="0.1"
                    value={depthMeters}
                    onChange={(e) => setDepthMeters(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-[#D4D1C7] dark:border-[#244240] bg-[#FAF9F5] dark:bg-[#0A1615]"
                  />
                </div>
                <div>
                  <label htmlFor="site-date" className="block text-xs font-medium mb-1">
                    Collection Date
                  </label>
                  <input
                    id="site-date"
                    type="date"
                    value={collectionDate}
                    onChange={(e) => setCollectionDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#D4D1C7] dark:border-[#244240] bg-[#FAF9F5] dark:bg-[#0A1615]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="site-habitat" className="block text-xs font-medium mb-1">
                    Habitat
                  </label>
                  <select
                    id="site-habitat"
                    value={habitat}
                    onChange={(e) => setHabitat(e.target.value as HabitatType)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#D4D1C7] dark:border-[#244240] bg-[#FAF9F5] dark:bg-[#0A1615]"
                  >
                    {HABITATS.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="site-marker" className="block text-xs font-medium mb-1">
                    Marker Gene
                  </label>
                  <select
                    id="site-marker"
                    value={markerGene}
                    onChange={(e) => setMarkerGene(e.target.value as MarkerGene)}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-[#D4D1C7] dark:border-[#244240] bg-[#FAF9F5] dark:bg-[#0A1615]"
                  >
                    {MARKER_GENES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* File Dropzone & Pipeline Config Column */}
        <div className="lg:col-span-7 rounded-xl border border-[#E3E1D8] dark:border-[#1C3432] bg-white dark:bg-[#0F1F1E] p-5 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-base font-semibold">
                  2. Sequence Upload &amp; Pipeline Parameters
                </h3>
                <p className="text-xs text-[#4A6361] dark:text-[#9DB6B3] mt-0.5">
                  FASTA, FASTQ, or CSV/TSV OTU/ASV tables · Max 50 MB · Automatic header
                  sanitization
                </p>
              </div>
              <button
                type="button"
                onClick={handleLoadSampleFasta}
                className="text-xs font-medium text-[#1F8A72] dark:text-[#7ED6B5] hover:underline whitespace-nowrap"
              >
                Load sample 12S FASTA
              </button>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                const file = e.dataTransfer.files?.[0];
                if (file) processFileObject(file);
              }}
              className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                dragActive
                  ? 'border-[#1F8A72] bg-[#7ED6B5]/10'
                  : 'border-[#D4D1C7] dark:border-[#244240] bg-[#FAF9F5] dark:bg-[#0A1615]'
              }`}
            >
              <UploadCloud className="w-8 h-8 mx-auto text-[#0F4C4A] dark:text-[#7ED6B5]" />
              <p className="text-sm font-medium mt-2">
                Drag and drop an eDNA dataset here, or select a file
              </p>
              <p className="text-xs text-[#4A6361] dark:text-[#9DB6B3] mt-1">
                .fasta · .fa · .fna · .fastq · .fq · .csv · .tsv (up to 50 MB)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".fasta,.fa,.fna,.fastq,.fq,.csv,.tsv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) processFileObject(file);
                }}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border border-[#0F4C4A] dark:border-[#7ED6B5] text-[#0F4C4A] dark:text-[#7ED6B5] hover:bg-[#0F4C4A]/10 transition-colors"
              >
                <FileUp className="w-3.5 h-3.5" />
                Choose File
              </button>

              {selectedFile && (
                <div className="mt-4 pt-3 border-t border-[#E3E1D8] dark:border-[#1C3432] text-xs font-mono text-[#0F4C4A] dark:text-[#7ED6B5]">
                  Ready: {selectedFile.name} · {(selectedFile.size / 1024).toFixed(1)} KB ·{' '}
                  {selectedFile.readPreviewCount} sequence entries ({selectedFile.format.toUpperCase()})
                </div>
              )}
            </div>

            {fileError && (
              <p role="alert" className="text-xs text-[#C84B31] dark:text-[#E8725A]">
                {fileError}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="block text-xs font-medium mb-1.5">Clustering Strategy</span>
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-[#F2F1EA] dark:bg-[#0A1615]">
                  <button
                    type="button"
                    onClick={() => setClusteringMode('otu_97')}
                    className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors ${
                      clusteringMode === 'otu_97'
                        ? 'bg-white dark:bg-[#16302E] text-[#0F4C4A] dark:text-[#FAF9F5] shadow-xs'
                        : 'text-[#4A6361] dark:text-[#9DB6B3]'
                    }`}
                  >
                    OTU (97%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setClusteringMode('asv')}
                    className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors ${
                      clusteringMode === 'asv'
                        ? 'bg-white dark:bg-[#16302E] text-[#0F4C4A] dark:text-[#FAF9F5] shadow-xs'
                        : 'text-[#4A6361] dark:text-[#9DB6B3]'
                    }`}
                  >
                    Exact ASVs
                  </button>
                </div>
              </div>

              <div>
                <span className="block text-xs font-medium mb-1.5">Taxonomy Classifier</span>
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-[#F2F1EA] dark:bg-[#0A1615]">
                  <button
                    type="button"
                    onClick={() => setClassifierMode('demo_kmer')}
                    className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors ${
                      classifierMode === 'demo_kmer'
                        ? 'bg-white dark:bg-[#16302E] text-[#0F4C4A] dark:text-[#FAF9F5] shadow-xs'
                        : 'text-[#4A6361] dark:text-[#9DB6B3]'
                    }`}
                  >
                    Demo k-mer
                  </button>
                  <button
                    type="button"
                    onClick={() => setClassifierMode('online_blast_bold')}
                    className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors ${
                      classifierMode === 'online_blast_bold'
                        ? 'bg-white dark:bg-[#16302E] text-[#0F4C4A] dark:text-[#FAF9F5] shadow-xs'
                        : 'text-[#4A6361] dark:text-[#9DB6B3]'
                    }`}
                  >
                    NCBI / BOLD
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={running}
            onClick={handleExecutePipeline}
            className="w-full py-2.5 px-4 text-sm font-semibold rounded-lg bg-[#0F4C4A] text-[#FAF9F5] hover:bg-[#16605D] dark:bg-[#1F8A72] dark:hover:bg-[#27A085] disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" />
            {running ? `Running pipeline (${progressPct}%)...` : 'Run Bioinformatics Pipeline'}
          </button>
        </div>
      </div>

      {/* Step-by-Step Progress Bar & Pipeline Summary */}
      {(running || lastJob) && (
        <section className="rounded-xl border border-[#E3E1D8] dark:border-[#1C3432] bg-white dark:bg-[#0F1F1E] p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="font-display text-sm font-semibold">Pipeline Execution Trace</h3>
            <span className="font-mono tabular-nums text-xs text-[#1F8A72] dark:text-[#7ED6B5]">
              {progressPct}% complete
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#ECEAE2] dark:bg-[#152928] overflow-hidden mb-5">
            <div
              className="h-full bg-[#1F8A72] transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {PIPELINE_STEPS.map((step, idx) => {
              const currentIdx = PIPELINE_STEPS.findIndex((s) => s.key === currentStage);
              const done = currentStage === 'completed' || (currentIdx > idx);
              const active = currentStage === step.key && running;
              return (
                <div
                  key={step.key}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-xs ${
                    done
                      ? 'border-[#1F8A72]/40 bg-[#7ED6B5]/10 text-[#0F4C4A] dark:text-[#7ED6B5]'
                      : active
                        ? 'border-[#F2B84B] bg-[#F2B84B]/10 text-[#0F2423] dark:text-[#FAF9F5]'
                        : 'border-[#E3E1D8] dark:border-[#1C3432] text-[#5A7370] dark:text-[#86A19E]'
                  }`}
                >
                  <CheckCircle2
                    className={`w-4 h-4 shrink-0 ${
                      done ? 'text-[#1F8A72] dark:text-[#7ED6B5]' : 'opacity-40'
                    }`}
                  />
                  <span className="truncate font-medium">{step.label}</span>
                </div>
              );
            })}
          </div>

          {lastJob && !running && (
            <div className="mt-5 pt-4 border-t border-[#ECEAE2] dark:border-[#182E2C] flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-6 text-xs font-mono tabular-nums">
                <span>
                  Input Reads: <strong>{lastJob.readsInput}</strong>
                </span>
                <span>
                  Passed QC: <strong>{lastJob.readsPassed}</strong>
                </span>
                <span>
                  Chimeras Flagged: <strong>{lastJob.chimerasFlagged}</strong>
                </span>
                <span>
                  Clusters/ASVs: <strong>{lastJob.clustersGenerated}</strong>
                </span>
              </div>
              {onCompleteNavigate && (
                <button
                  type="button"
                  onClick={onCompleteNavigate}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#0F4C4A] text-[#FAF9F5] hover:bg-[#16605D] dark:bg-[#1F8A72]"
                >
                  Inspect Taxonomic Assignments
                </button>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
