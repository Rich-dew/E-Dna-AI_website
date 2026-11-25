import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { classifySequenceKmer, runBioinformaticsPipeline } from '../lib/ednaEngine';
import {
  DEMO_ANNOUNCEMENT,
  DEMO_AUDIT_LOGS,
  DEMO_JOBS,
  DEMO_PROJECTS,
  DEMO_RAW_BUNDLES,
  DEMO_SAMPLES,
  DEMO_USERS,
  SEED_TAXA_REFERENCE,
} from '../lib/seedData';
import type {
  AnnouncementBanner,
  AuditLogEntry,
  ClassifierMode,
  ClusteringMode,
  EcologicalAiSummary,
  HabitatType,
  JobRecord,
  MarkerGene,
  ProjectRecord,
  RawSequenceRead,
  SampleMetadata,
  SequenceRecord,
  TaxonReference,
  TaxonomicAssignment,
  UserProfile,
  UserRole,
} from '../types/edna';

interface DataContextValue {
  projects: ProjectRecord[];
  samples: SampleMetadata[];
  sequences: SequenceRecord[];
  assignments: TaxonomicAssignment[];
  taxaReference: TaxonReference[];
  jobs: JobRecord[];
  users: UserProfile[];
  auditLogs: AuditLogEntry[];
  announcement: AnnouncementBanner;
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
  createProject: (input: {
    ownerUid: string;
    ownerName: string;
    name: string;
    description: string;
    markerGene: MarkerGene;
  }) => ProjectRecord;
  deleteProject: (projectId: string) => void;
  addSample: (input: {
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
  processSampleReads: (params: {
    projectId: string;
    sampleId: string;
    ownerUid: string;
    markerGene: MarkerGene;
    rawReads: RawSequenceRead[];
    clusteringMode: ClusteringMode;
    classifierMode: ClassifierMode;
    fileName?: string;
    fileSizeBytes?: number;
    onProgress?: (stage: JobRecord['stage'], progress: number) => void;
  }) => Promise<{ job: JobRecord; newAssignments: TaxonomicAssignment[] }>;
  saveAiSummary: (projectId: string, summary: EcologicalAiSummary) => void;
  // Admin mutations (every admin action appends to auditLogs)
  adminToggleUserDisabled: (actor: UserProfile, targetUid: string) => void;
  adminChangeUserRole: (actor: UserProfile, targetUid: string, nextRole: UserRole) => void;
  adminDeleteUser: (actor: UserProfile, targetUid: string) => void;
  adminAddTaxonReference: (actor: UserProfile, ref: Omit<TaxonReference, 'id'>) => void;
  adminDeleteTaxonReference: (actor: UserProfile, refId: string) => void;
  adminUpdateAnnouncement: (
    actor: UserProfile,
    patch: { message: string; severity: AnnouncementBanner['severity']; active: boolean },
  ) => void;
  logAdminAudit: (actor: UserProfile, action: string, target: string, details?: string) => void;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

function buildInitialSequencesAndAssignments(): {
  sequences: SequenceRecord[];
  assignments: TaxonomicAssignment[];
} {
  const sequences: SequenceRecord[] = [];
  const assignments: TaxonomicAssignment[] = [];

  for (const bundle of DEMO_RAW_BUNDLES) {
    const project = DEMO_PROJECTS.find((p) => p.id === bundle.projectId);
    const markerGene: MarkerGene = project?.markerGene ?? '12S';
    const rawReads: RawSequenceRead[] = bundle.reads.map((r, i) => ({
      id: `${bundle.sampleId}-r-${i}`,
      header: r.header,
      sequence: r.sequence,
      abundance: r.abundance,
      meanPhred: r.meanPhred,
    }));
    const pipe = runBioinformaticsPipeline(rawReads, {
      clusteringMode: markerGene === 'COI' ? 'asv' : 'otu_97',
      projectId: bundle.projectId,
      sampleId: bundle.sampleId,
      ownerUid: project?.ownerUid ?? 'demo-researcher-01',
    });
    for (const seq of pipe.sequences) {
      sequences.push(seq);
      if (!seq.isChimera) {
        assignments.push(classifySequenceKmer(seq, markerGene, SEED_TAXA_REFERENCE, 'demo_kmer'));
      }
    }
  }
  return { sequences, assignments };
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const initialData = useMemo(() => buildInitialSequencesAndAssignments(), []);

  const [projects, setProjects] = useState<ProjectRecord[]>(DEMO_PROJECTS);
  const [samples, setSamples] = useState<SampleMetadata[]>(DEMO_SAMPLES);
  const [sequences, setSequences] = useState<SequenceRecord[]>(initialData.sequences);
  const [assignments, setAssignments] = useState<TaxonomicAssignment[]>(initialData.assignments);
  const [taxaReference, setTaxaReference] = useState<TaxonReference[]>(SEED_TAXA_REFERENCE);
  const [jobs, setJobs] = useState<JobRecord[]>(DEMO_JOBS);
  const [users, setUsers] = useState<UserProfile[]>(DEMO_USERS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(DEMO_AUDIT_LOGS);
  const [announcement, setAnnouncement] = useState<AnnouncementBanner>(DEMO_ANNOUNCEMENT);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(DEMO_PROJECTS[0]?.id ?? null);

  const logAdminAudit = useCallback(
    (actor: UserProfile, action: string, target: string, details?: string) => {
      const entry: AuditLogEntry = {
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        actorUid: actor.uid,
        actorEmail: actor.email,
        action,
        target,
        details,
        ts: new Date().toISOString(),
      };
      setAuditLogs((prev) => [entry, ...prev]);
    },
    [],
  );

  const createProject = useCallback(
    (input: {
      ownerUid: string;
      ownerName: string;
      name: string;
      description: string;
      markerGene: MarkerGene;
    }): ProjectRecord => {
      const now = new Date().toISOString();
      const created: ProjectRecord = {
        id: `proj-${Date.now()}`,
        ownerUid: input.ownerUid,
        ownerName: input.ownerName,
        name: input.name.trim(),
        description: input.description.trim(),
        markerGene: input.markerGene,
        status: 'draft',
        createdAt: now,
        updatedAt: now,
        storageBytes: 0,
      };
      setProjects((prev) => [created, ...prev]);
      setActiveProjectId(created.id);
      return created;
    },
    [],
  );

  const deleteProject = useCallback((projectId: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    setSamples((prev) => prev.filter((s) => s.projectId !== projectId));
    setSequences((prev) => prev.filter((sq) => sq.projectId !== projectId));
    setAssignments((prev) => prev.filter((a) => a.projectId !== projectId));
    setActiveProjectId((curr) => (curr === projectId ? null : curr));
  }, []);

  const addSample = useCallback(
    (input: {
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
    }): SampleMetadata => {
      const created: SampleMetadata = {
        id: `smp-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        projectId: input.projectId,
        ownerUid: input.ownerUid,
        siteName: input.siteName.trim(),
        latitude: input.latitude,
        longitude: input.longitude,
        depthMeters: input.depthMeters,
        collectionDate: input.collectionDate,
        habitat: input.habitat,
        markerGene: input.markerGene,
        fileName: input.fileName,
        fileSizeBytes: input.fileSizeBytes ?? 0,
        readCount: 0,
      };
      setSamples((prev) => [...prev, created]);
      return created;
    },
    [],
  );

  const processSampleReads = useCallback(
    async (params: {
      projectId: string;
      sampleId: string;
      ownerUid: string;
      markerGene: MarkerGene;
      rawReads: RawSequenceRead[];
      clusteringMode: ClusteringMode;
      classifierMode: ClassifierMode;
      fileName?: string;
      fileSizeBytes?: number;
      onProgress?: (stage: JobRecord['stage'], progress: number) => void;
    }): Promise<{ job: JobRecord; newAssignments: TaxonomicAssignment[] }> => {
      const project = projects.find((p) => p.id === params.projectId);
      const jobId = `job-${Date.now()}`;
      const startedAt = new Date().toISOString();

      const stages: Array<{ stage: JobRecord['stage']; progress: number; delayMs: number }> = [
        { stage: 'quality_filter', progress: 20, delayMs: 180 },
        { stage: 'deduplicating', progress: 40, delayMs: 180 },
        { stage: 'chimera_check', progress: 60, delayMs: 180 },
        { stage: 'clustering', progress: 78, delayMs: 180 },
        { stage: 'taxonomy_assignment', progress: 92, delayMs: 220 },
      ];

      for (const s of stages) {
        params.onProgress?.(s.stage, s.progress);
        await new Promise((resolve) => setTimeout(resolve, s.delayMs));
      }

      const pipeOut = runBioinformaticsPipeline(params.rawReads, {
        clusteringMode: params.clusteringMode,
        projectId: params.projectId,
        sampleId: params.sampleId,
        ownerUid: params.ownerUid,
      });

      let onlineOverrides = new Map<
        string,
        { taxon?: string; percentIdentity?: number; accession?: string; note?: string }
      >();

      if (params.classifierMode === 'online_blast_bold') {
        try {
          const resp = await fetch('/api/taxonomy/online', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              provider: params.markerGene === 'COI' ? 'bold_id' : 'ncbi_blast',
              markerGene: params.markerGene,
              sequences: pipeOut.sequences
                .filter((s) => !s.isChimera)
                .slice(0, 6)
                .map((s) => ({ id: s.id, sequence: s.sequence })),
            }),
          });
          if (resp.ok) {
            const data = await resp.json();
            if (Array.isArray(data.results)) {
              for (const item of data.results) {
                onlineOverrides.set(item.id, item);
              }
            }
          }
        } catch {
          // Graceful fallback to calibrated k-mer classifier
        }
      }

      const newAssignments: TaxonomicAssignment[] = pipeOut.sequences
        .filter((s) => !s.isChimera)
        .map((seq) => {
          const base = classifySequenceKmer(seq, params.markerGene, taxaReference, params.classifierMode);
          const remote = onlineOverrides.get(seq.id);
          if (remote?.taxon && remote.percentIdentity) {
            const parts = remote.taxon.split(' ');
            return {
              ...base,
              genus: parts[0] || base.genus,
              species: remote.taxon,
              percentIdentity: remote.percentIdentity,
              confidence: Number(Math.min(0.99, remote.percentIdentity / 100).toFixed(2)),
              status:
                remote.percentIdentity >= 97
                  ? 'Assigned'
                  : remote.percentIdentity >= 90
                    ? 'Low confidence'
                    : 'Unclassified, possible novel taxon',
              referenceAccession: remote.accession || base.referenceAccession,
              caveatNote: remote.note,
            };
          }
          if (remote?.note) {
            return { ...base, caveatNote: remote.note };
          }
          return base;
        });

      params.onProgress?.('diversity_metrics', 96);
      await new Promise((resolve) => setTimeout(resolve, 120));
      params.onProgress?.('completed', 100);

      // Update sample & project records
      setSequences((prev) => [
        ...prev.filter((sq) => sq.sampleId !== params.sampleId),
        ...pipeOut.sequences,
      ]);
      setAssignments((prev) => [
        ...prev.filter((a) => a.sampleId !== params.sampleId),
        ...newAssignments,
      ]);
      setSamples((prev) =>
        prev.map((s) =>
          s.id === params.sampleId
            ? {
                ...s,
                readCount: pipeOut.readsPassedQuality,
                fileName: params.fileName || s.fileName,
                fileSizeBytes: params.fileSizeBytes ?? s.fileSizeBytes,
              }
            : s,
        ),
      );
      setProjects((prev) =>
        prev.map((p) =>
          p.id === params.projectId
            ? {
                ...p,
                status: 'completed',
                updatedAt: new Date().toISOString(),
                storageBytes: p.storageBytes + (params.fileSizeBytes ?? 0),
              }
            : p,
        ),
      );

      const job: JobRecord = {
        id: jobId,
        projectId: params.projectId,
        projectName: project?.name ?? 'Untitled Project',
        ownerUid: params.ownerUid,
        stage: 'completed',
        progress: 100,
        status: 'completed',
        classifierMode: params.classifierMode,
        clusteringMode: params.clusteringMode,
        readsInput: pipeOut.readsInput,
        readsPassed: pipeOut.readsPassedQuality,
        chimerasFlagged: pipeOut.chimerasFlagged,
        clustersGenerated: pipeOut.sequences.length,
        startedAt,
        completedAt: new Date().toISOString(),
      };
      setJobs((prev) => [job, ...prev]);
      return { job, newAssignments };
    },
    [projects, taxaReference],
  );

  const saveAiSummary = useCallback((projectId: string, summary: EcologicalAiSummary) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId ? { ...p, aiSummary: summary, updatedAt: new Date().toISOString() } : p,
      ),
    );
  }, []);

  const adminToggleUserDisabled = useCallback(
    (actor: UserProfile, targetUid: string) => {
      let targetEmail = targetUid;
      let nextDisabled = false;
      setUsers((prev) =>
        prev.map((u) => {
          if (u.uid === targetUid) {
            targetEmail = u.email;
            nextDisabled = !u.disabled;
            return { ...u, disabled: nextDisabled };
          }
          return u;
        }),
      );
      logAdminAudit(
        actor,
        nextDisabled ? 'USER_DISABLED' : 'USER_ENABLED',
        targetEmail,
        `Updated disabled flag to ${nextDisabled}`,
      );
    },
    [logAdminAudit],
  );

  const adminChangeUserRole = useCallback(
    (actor: UserProfile, targetUid: string, nextRole: UserRole) => {
      let targetEmail = targetUid;
      setUsers((prev) =>
        prev.map((u) => {
          if (u.uid === targetUid) {
            targetEmail = u.email;
            return { ...u, role: nextRole };
          }
          return u;
        }),
      );
      logAdminAudit(actor, 'USER_ROLE_CHANGED', targetEmail, `Assigned role "${nextRole}"`);
    },
    [logAdminAudit],
  );

  const adminDeleteUser = useCallback(
    (actor: UserProfile, targetUid: string) => {
      const target = users.find((u) => u.uid === targetUid);
      setUsers((prev) => prev.filter((u) => u.uid !== targetUid));
      logAdminAudit(
        actor,
        'USER_DELETED',
        target?.email ?? targetUid,
        'Removed user account record.',
      );
    },
    [logAdminAudit, users],
  );

  const adminAddTaxonReference = useCallback(
    (actor: UserProfile, ref: Omit<TaxonReference, 'id'>) => {
      const created: TaxonReference = {
        ...ref,
        id: `ref-${Date.now()}`,
      };
      setTaxaReference((prev) => [created, ...prev]);
      logAdminAudit(
        actor,
        'TAXON_REFERENCE_ADDED',
        `${created.species} (${created.markerGene})`,
        `Accession ${created.accessionId}`,
      );
    },
    [logAdminAudit],
  );

  const adminDeleteTaxonReference = useCallback(
    (actor: UserProfile, refId: string) => {
      const target = taxaReference.find((t) => t.id === refId);
      setTaxaReference((prev) => prev.filter((t) => t.id !== refId));
      logAdminAudit(
        actor,
        'TAXON_REFERENCE_REMOVED',
        target ? `${target.species} (${target.markerGene})` : refId,
      );
    },
    [logAdminAudit, taxaReference],
  );

  const adminUpdateAnnouncement = useCallback(
    (
      actor: UserProfile,
      patch: { message: string; severity: AnnouncementBanner['severity']; active: boolean },
    ) => {
      setAnnouncement({
        id: 'announcement',
        message: patch.message,
        severity: patch.severity,
        active: patch.active,
        updatedAt: new Date().toISOString(),
        updatedBy: actor.email,
      });
      logAdminAudit(
        actor,
        'ANNOUNCEMENT_UPDATED',
        'settings/announcement',
        `Active=${patch.active}, severity=${patch.severity}`,
      );
    },
    [logAdminAudit],
  );

  return (
    <DataContext.Provider
      value={{
        projects,
        samples,
        sequences,
        assignments,
        taxaReference,
        jobs,
        users,
        auditLogs,
        announcement,
        activeProjectId,
        setActiveProjectId,
        createProject,
        deleteProject,
        addSample,
        processSampleReads,
        saveAiSummary,
        adminToggleUserDisabled,
        adminChangeUserRole,
        adminDeleteUser,
        adminAddTaxonReference,
        adminDeleteTaxonReference,
        adminUpdateAnnouncement,
        logAdminAudit,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataContext');
  return ctx;
}
