import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Dna,
  FileText,
  FolderKanban,
  LogOut,
  MapPin,
  Menu,
  Moon,
  Plus,
  Sun,
  Trash2,
  Upload,
  UserCircle,
  X,
} from 'lucide-react';
import { AiSummaryAndReports } from '../components/AiSummaryAndReports';
import { BiodiversityVisuals } from '../components/BiodiversityVisuals';
import { Logo } from '../components/Logo';
import { SiteMap } from '../components/SiteMap';
import { EmptyState, LoadingState } from '../components/StateBlocks';
import { TaxonomyTable } from '../components/TaxonomyTable';
import { UploadPipelinePanel } from '../components/UploadPipelinePanel';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { computeAlphaDiversity } from '../lib/ednaEngine';
import type { MarkerGene } from '../types/edna';

type WorkspaceTab = 'overview' | 'upload' | 'taxonomy' | 'biodiversity' | 'map' | 'reports';

const MARKER_GENES: MarkerGene[] = ['12S', '16S', '18S', 'COI', 'ITS', 'rbcL'];

export function DashboardPage() {
  const { user, logout } = useAuth();
  const {
    projects,
    samples,
    assignments,
    announcement,
    activeProjectId,
    setActiveProjectId,
    createProject,
    deleteProject,
    addSample,
    processSampleReads,
    saveAiSummary,
  } = useData();
  const { theme, toggleTheme } = useTheme();
  const { pushToast } = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState<WorkspaceTab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [projName, setProjName] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projMarker, setProjMarker] = useState<MarkerGene>('12S');

  // Show owner's projects plus seeded demo projects for immediate usability
  const visibleProjects = useMemo(() => {
    if (!user) return [];
    return projects.filter(
      (p) => p.ownerUid === user.uid || p.ownerUid === 'demo-researcher-01',
    );
  }, [projects, user]);

  const activeProject = useMemo(
    () => visibleProjects.find((p) => p.id === activeProjectId) ?? visibleProjects[0] ?? null,
    [visibleProjects, activeProjectId],
  );

  const projectSamples = useMemo(
    () => (activeProject ? samples.filter((s) => s.projectId === activeProject.id) : []),
    [samples, activeProject],
  );

  const projectAssignments = useMemo(
    () => (activeProject ? assignments.filter((a) => a.projectId === activeProject.id) : []),
    [assignments, activeProject],
  );

  const alphaMetrics = useMemo(() => {
    return projectSamples.map((s) => {
      const sampleAsg = projectAssignments.filter((a) => a.sampleId === s.id);
      const counts = sampleAsg.map((a) => a.abundance);
      const novelCount = sampleAsg.filter(
        (a) => a.status === 'Unclassified, possible novel taxon',
      ).length;
      return computeAlphaDiversity(counts, s.id, s.siteName, novelCount);
    });
  }, [projectSamples, projectAssignments]);

  const kpis = useMemo(() => {
    const totalReads = projectAssignments.reduce((acc, a) => acc + a.abundance, 0);
    const assignedTaxa = new Set(
      projectAssignments.filter((a) => a.status === 'Assigned').map((a) => a.species),
    ).size;
    const novelFlags = projectAssignments.filter(
      (a) => a.status === 'Unclassified, possible novel taxon',
    ).length;
    const meanShannon =
      alphaMetrics.length > 0
        ? alphaMetrics.reduce((acc, m) => acc + m.shannon, 0) / alphaMetrics.length
        : 0;
    return { totalReads, assignedTaxa, novelFlags, meanShannon };
  }, [projectAssignments, alphaMetrics]);

  if (!user) {
    return <LoadingState label="Hydrating workspace session..." />;
  }

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (projName.trim().length < 3) {
      pushToast({ type: 'error', title: 'Project name must be at least 3 characters.' });
      return;
    }
    const created = createProject({
      ownerUid: user.uid,
      ownerName: user.name,
      name: projName,
      description: projDesc || 'Environmental DNA metabarcoding survey.',
      markerGene: projMarker,
    });
    setProjName('');
    setProjDesc('');
    setNewProjectOpen(false);
    setTab('upload');
    pushToast({
      type: 'success',
      title: `Created project "${created.name}"`,
      description: 'Add sampling metadata and upload your FASTA/FASTQ/CSV dataset.',
    });
  };

  const navItems: Array<{ id: WorkspaceTab; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: 'Projects & Sites', icon: <FolderKanban className="w-4 h-4" /> },
    { id: 'upload', label: 'Upload & Pipeline', icon: <Upload className="w-4 h-4" /> },
    { id: 'taxonomy', label: 'Taxonomy Calls', icon: <Dna className="w-4 h-4" /> },
    { id: 'biodiversity', label: 'Biodiversity & Charts', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'map', label: 'Ecological Map', icon: <MapPin className="w-4 h-4" /> },
    { id: 'reports', label: 'AI Summary & Export', icon: <FileText className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#F7F6F0] dark:bg-[#061111] text-[#0F2423] dark:text-[#EEF4F2] flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/45 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Workspace Sidebar — strictly researcher navigation, zero admin hints */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-[#0A1817] border-r border-[#E3E0D5] dark:border-[#193331] flex flex-col transform transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 px-4 border-b border-[#E3E0D5] dark:border-[#193331] flex items-center justify-between">
          <Link to="/" aria-label="TaxaTrace Home">
            <Logo size="sm" showWordmark />
          </Link>
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded text-[#435E5B] dark:text-[#9DBAB6]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Project Selector */}
        <div className="p-4 border-b border-[#E3E0D5] dark:border-[#193331] bg-[#FAF9F5]/60 dark:bg-[#081413]/60 space-y-2.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="active-project-select"
              className="text-xs font-semibold text-[#435E5B] dark:text-[#9DBAB6]"
            >
              Active Project
            </label>
            <button
              type="button"
              onClick={() => setNewProjectOpen(true)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F4C4A] dark:text-[#7ED6B5] hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              New
            </button>
          </div>
          <select
            id="active-project-select"
            value={activeProject?.id ?? ''}
            onChange={(e) => setActiveProjectId(e.target.value)}
            className="w-full px-2.5 py-2 text-xs font-medium rounded-lg border border-[#D4D1C7] dark:border-[#244643] bg-white dark:bg-[#0B1B1A]"
          >
            {visibleProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.markerGene})
              </option>
            ))}
          </select>
        </div>

        {/* Navigation Links */}
        <nav aria-label="Workspace navigation" className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap ${
                  active
                    ? 'bg-gradient-to-r from-[#0F4C4A] to-[#176961] text-[#FAF9F5] shadow-xs dark:from-[#1F8A72] dark:to-[#27A085]'
                    : 'text-[#3B5755] dark:text-[#A9C5C1] hover:bg-[#F1EFE7] dark:hover:bg-[#122927] hover:text-[#0F4C4A] dark:hover:text-[#FAF9F5]'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Account Footer */}
        <div className="p-4 border-t border-[#E3E0D5] dark:border-[#193331] bg-[#FAF9F5]/50 dark:bg-[#081413]/50 space-y-2.5">
          <div className="text-xs">
            <p className="font-semibold truncate">{user.name}</p>
            <p className="text-[#435E5B] dark:text-[#9DBAB6] truncate">
              {user.institution || user.email}
            </p>
          </div>
          <div className="flex items-center gap-2 pt-0.5">
            <Link
              to="/profile"
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-[#D4D1C7] dark:border-[#244643] bg-white dark:bg-[#0B1B1A] hover:bg-[#EFECE3] dark:hover:bg-[#122927]"
            >
              <UserCircle className="w-3.5 h-3.5" />
              Profile
            </Link>
            <button
              type="button"
              onClick={async () => {
                await logout();
                navigate('/');
              }}
              aria-label="Sign out"
              className="inline-flex items-center justify-center px-2.5 py-1.5 text-xs font-medium rounded-lg border border-[#D4D1C7] dark:border-[#244643] bg-white dark:bg-[#0B1B1A] hover:bg-[#EFECE3] dark:hover:bg-[#122927]"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Stage */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Global Announcement Banner (controlled by Admin settings/announcement) */}
        {announcement.active && announcement.message && (
          <div
            role="status"
            className={`px-4 py-2 text-xs text-center border-b ${
              announcement.severity === 'warning'
                ? 'bg-[#F2B84B]/20 border-[#F2B84B]/40 text-[#0F2423] dark:text-[#FAF9F5]'
                : announcement.severity === 'maintenance'
                  ? 'bg-[#E8725A]/15 border-[#E8725A]/40 text-[#0F2423] dark:text-[#FAF9F5]'
                  : 'bg-[#0F4C4A] border-[#0F4C4A] text-[#FAF9F5]'
            }`}
          >
            {announcement.message}
          </div>
        )}

        {/* Top Contextual Header */}
        <header className="sticky top-0 z-20 h-16 px-4 sm:px-6 bg-[#FAF9F5]/88 dark:bg-[#061111]/88 backdrop-blur-md border-b border-[#E3E0D5] dark:border-[#193331] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              aria-label="Open workspace navigation"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-[#3B5755] dark:text-[#9DBAB6] hover:bg-[#ECE9DE] dark:hover:bg-[#122927]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="font-display text-base sm:text-lg font-bold truncate text-[#0B2322] dark:text-[#FAF9F5]">
                {activeProject ? activeProject.name : 'Research Workspace'}
              </h1>
              {activeProject && (
                <p className="text-xs text-[#435E5B] dark:text-[#9DBAB6] truncate">
                  Marker {activeProject.markerGene} · {projectSamples.length} site(s) ·{' '}
                  {projectAssignments.length} classified clusters
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              className="p-2 rounded-lg text-[#3B5755] dark:text-[#9DBAB6] hover:bg-[#ECE9DE] dark:hover:bg-[#122927] hover:text-[#0F4C4A] dark:hover:text-[#7ED6B5]"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => setTab('upload')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-[#0F4C4A] to-[#176961] text-[#FAF9F5] shadow-xs hover:from-[#145E5B] hover:to-[#1F8A72] dark:from-[#1F8A72] dark:to-[#27A085] whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload eDNA
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* KPI Summary Strip — Brand-Spectrum Top Hairlines */}
          {activeProject && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 sm:p-5 rounded-xl border border-[#E3E0D5] dark:border-[#1D3A37] border-t-2 border-t-[#5BB6E8] bg-white dark:bg-[#0B1B1A] surface-card">
                <p className="text-xs font-medium text-[#435E5B] dark:text-[#9DBAB6]">Filtered Reads</p>
                <p className="font-mono tabular-nums text-2xl sm:text-[26px] font-semibold mt-1 text-[#0B2322] dark:text-[#FAF9F5]">
                  {kpis.totalReads.toLocaleString()}
                </p>
                <p className="text-[11px] text-[#55706D] dark:text-[#86A7A3] mt-1">
                  Across {projectSamples.length} site(s)
                </p>
              </div>
              <div className="p-4 sm:p-5 rounded-xl border border-[#E3E0D5] dark:border-[#1D3A37] border-t-2 border-t-[#1F8A72] bg-white dark:bg-[#0B1B1A] surface-card">
                <p className="text-xs font-medium text-[#435E5B] dark:text-[#9DBAB6]">Assigned Species</p>
                <p className="font-mono tabular-nums text-2xl sm:text-[26px] font-semibold text-[#0F4C4A] dark:text-[#7ED6B5] mt-1">
                  {kpis.assignedTaxa}
                </p>
                <p className="text-[11px] text-[#55706D] dark:text-[#86A7A3] mt-1">
                  &ge;97% calibrated identity
                </p>
              </div>
              <div className="p-4 sm:p-5 rounded-xl border border-[#E3E0D5] dark:border-[#1D3A37] border-t-2 border-t-[#F2B84B] bg-white dark:bg-[#0B1B1A] surface-card">
                <p className="text-xs font-medium text-[#435E5B] dark:text-[#9DBAB6]">Mean Shannon H&apos;</p>
                <p className="font-mono tabular-nums text-2xl sm:text-[26px] font-semibold text-[#8A5A08] dark:text-[#F2B84B] mt-1">
                  {kpis.meanShannon.toFixed(3)}
                </p>
                <p className="text-[11px] text-[#55706D] dark:text-[#86A7A3] mt-1">
                  Site alpha entropy
                </p>
              </div>
              <div className="p-4 sm:p-5 rounded-xl border border-[#E3E0D5] dark:border-[#1D3A37] border-t-2 border-t-[#E8725A] bg-white dark:bg-[#0B1B1A] surface-card">
                <p className="text-xs font-medium text-[#435E5B] dark:text-[#9DBAB6]">Novel Taxa Flags</p>
                <p className="font-mono tabular-nums text-2xl sm:text-[26px] font-semibold text-[#C24C34] dark:text-[#E8725A] mt-1">
                  {kpis.novelFlags}
                </p>
                <p className="text-[11px] text-[#55706D] dark:text-[#86A7A3] mt-1">
                  Unclassified &lt;90% identity
                </p>
              </div>
            </div>
          )}

          {!activeProject ? (
            <EmptyState
              title="Create your first eDNA project"
              description="Group sampling sites, marker genes, sequence pipelines, and biodiversity reports inside a project workspace."
              actionLabel="New Project"
              onAction={() => setNewProjectOpen(true)}
            />
          ) : (
            <>
              {tab === 'overview' && (
                <div className="space-y-6">
                  {/* Projects List */}
                  <section className="rounded-xl border border-[#E3E0D5] dark:border-[#1D3A37] bg-white dark:bg-[#0B1B1A] p-5 surface-card">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div>
                        <h2 className="font-display text-base font-semibold">Research Projects</h2>
                        <p className="text-xs text-[#435E5B] dark:text-[#9DBAB6]">
                          Select a project to inspect its samples, taxonomy assignments, and charts.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNewProjectOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#0F4C4A] dark:border-[#7ED6B5] text-[#0F4C4A] dark:text-[#7ED6B5] hover:bg-[#0F4C4A]/10"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        New Project
                      </button>
                    </div>

                    <div className="divide-y divide-[#ECE9DE] dark:divide-[#17302E]">
                      {visibleProjects.map((p) => {
                        const isSelected = p.id === activeProject.id;
                        const count = samples.filter((s) => s.projectId === p.id).length;
                        return (
                          <div
                            key={p.id}
                            className={`py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              isSelected ? 'opacity-100' : 'opacity-85 hover:opacity-100'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => setActiveProjectId(p.id)}
                              className="text-left flex-1 min-w-0"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-display text-sm font-semibold text-[#0B2322] dark:text-[#FAF9F5]">
                                  {p.name}
                                </span>
                                {isSelected && (
                                  <span className="text-[11px] font-semibold text-[#1F8A72] dark:text-[#7ED6B5]">
                                    · Active
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-[#435E5B] dark:text-[#9DBAB6] mt-0.5 line-clamp-1">
                                {p.description}
                              </p>
                              <div className="text-[11px] text-[#55706D] dark:text-[#86A7A3] mt-1 font-mono tabular-nums">
                                Marker {p.markerGene} · {count} sample(s) · Status: {p.status} ·
                                Updated {new Date(p.updatedAt).toLocaleDateString()}
                              </div>
                            </button>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveProjectId(p.id);
                                  setTab('biodiversity');
                                }}
                                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[#D4D1C7] dark:border-[#244643] hover:bg-[#EFECE3] dark:hover:bg-[#122927]"
                              >
                                View Charts
                              </button>
                              {p.ownerUid === user.uid && (
                                <button
                                  type="button"
                                  aria-label={`Delete project ${p.name}`}
                                  onClick={() => {
                                    deleteProject(p.id);
                                    pushToast({ type: 'info', title: `Deleted ${p.name}` });
                                  }}
                                  className="p-1.5 rounded-lg text-[#C24C34] hover:bg-[#E8725A]/10"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  {/* Sampling Sites Table */}
                  <section className="rounded-xl border border-[#E3E0D5] dark:border-[#1D3A37] bg-white dark:bg-[#0B1B1A] overflow-hidden surface-card">
                    <div className="px-5 py-4 border-b border-[#E3E0D5] dark:border-[#1D3A37] flex items-center justify-between gap-3">
                      <div>
                        <h2 className="font-display text-base font-semibold">
                          Sampling Sites in {activeProject.name}
                        </h2>
                        <p className="text-xs text-[#435E5B] dark:text-[#9DBAB6]">
                          Geospatial coordinates, depth, collection date, habitat, and marker gene.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTab('upload')}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-[#0F4C4A] to-[#176961] text-[#FAF9F5] hover:from-[#145E5B] hover:to-[#1F8A72] dark:from-[#1F8A72] dark:to-[#27A085]"
                      >
                        Add Sample &amp; Upload
                      </button>
                    </div>

                    {projectSamples.length === 0 ? (
                      <div className="p-6">
                        <EmptyState
                          title="No samples uploaded to this project yet"
                          description="Add site metadata (coordinates, depth, habitat) and upload a FASTA, FASTQ, or OTU CSV/TSV file."
                          actionLabel="Go to Upload & Pipeline"
                          onAction={() => setTab('upload')}
                        />
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-[#E3E1D8] dark:border-[#1C3432] bg-[#FAF9F5] dark:bg-[#0B1716] text-[#4A6361] dark:text-[#9DB6B3]">
                              <th className="py-3 px-4 font-medium">Site Name</th>
                              <th className="py-3 px-3 font-medium">Coordinates</th>
                              <th className="py-3 px-3 font-medium text-right">Depth</th>
                              <th className="py-3 px-3 font-medium">Date</th>
                              <th className="py-3 px-3 font-medium">Habitat</th>
                              <th className="py-3 px-3 font-medium">Marker</th>
                              <th className="py-3 px-4 font-medium text-right">QC Reads</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#ECEAE2] dark:divide-[#182E2C]">
                            {projectSamples.map((s) => (
                              <tr key={s.id} className="hover:bg-[#FAF9F5] dark:hover:bg-[#132625]/60">
                                <td className="py-3 px-4 font-medium">{s.siteName}</td>
                                <td className="py-3 px-3 font-mono tabular-nums text-[#4A6361] dark:text-[#9DB6B3]">
                                  {s.latitude.toFixed(4)}, {s.longitude.toFixed(4)}
                                </td>
                                <td className="py-3 px-3 text-right font-mono tabular-nums">
                                  {s.depthMeters} m
                                </td>
                                <td className="py-3 px-3 font-mono tabular-nums">
                                  {s.collectionDate}
                                </td>
                                <td className="py-3 px-3">{s.habitat}</td>
                                <td className="py-3 px-3 font-mono">{s.markerGene}</td>
                                <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                                  {s.readCount.toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>
                </div>
              )}

              {tab === 'upload' && (
                <UploadPipelinePanel
                  project={activeProject}
                  samples={projectSamples}
                  ownerUid={user.uid}
                  onAddSample={addSample}
                  onRunPipeline={processSampleReads}
                  onCompleteNavigate={() => setTab('taxonomy')}
                />
              )}

              {tab === 'taxonomy' && (
                <TaxonomyTable samples={projectSamples} assignments={projectAssignments} />
              )}

              {tab === 'biodiversity' && (
                <BiodiversityVisuals
                  samples={projectSamples}
                  assignments={projectAssignments}
                  alphaMetrics={alphaMetrics}
                />
              )}

              {tab === 'map' && (
                <SiteMap samples={projectSamples} alphaMetrics={alphaMetrics} />
              )}

              {tab === 'reports' && (
                <AiSummaryAndReports
                  project={activeProject}
                  samples={projectSamples}
                  assignments={projectAssignments}
                  alphaMetrics={alphaMetrics}
                  onSaveSummary={saveAiSummary}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Create New Project Modal */}
      {newProjectOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-proj-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-md rounded-xl border border-[#E3E1D8] dark:border-[#1C3432] bg-white dark:bg-[#0F1F1E] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 id="new-proj-title" className="font-display text-lg font-bold">
                New eDNA Project
              </h2>
              <button
                type="button"
                aria-label="Close modal"
                onClick={() => setNewProjectOpen(false)}
                className="p-1 text-[#4A6361] dark:text-[#9DB6B3]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label htmlFor="new-proj-name" className="block text-sm font-medium mb-1">
                  Project Name
                </label>
                <input
                  id="new-proj-name"
                  type="text"
                  required
                  value={projName}
                  onChange={(e) => setProjName(e.target.value)}
                  placeholder="Puget Sound Spring 12S Transect"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#D4D1C7] dark:border-[#244240] bg-[#FAF9F5] dark:bg-[#0A1615]"
                />
              </div>

              <div>
                <label htmlFor="new-proj-marker" className="block text-sm font-medium mb-1">
                  Primary Marker Gene
                </label>
                <select
                  id="new-proj-marker"
                  value={projMarker}
                  onChange={(e) => setProjMarker(e.target.value as MarkerGene)}
                  className="w-full px-3.5 py-2 text-sm font-mono rounded-lg border border-[#D4D1C7] dark:border-[#244240] bg-[#FAF9F5] dark:bg-[#0A1615]"
                >
                  {MARKER_GENES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="new-proj-desc" className="block text-sm font-medium mb-1">
                  Study Description
                </label>
                <textarea
                  id="new-proj-desc"
                  rows={3}
                  value={projDesc}
                  onChange={(e) => setProjDesc(e.target.value)}
                  placeholder="Sampling objectives, filtration volume, and primer notes..."
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#D4D1C7] dark:border-[#244240] bg-[#FAF9F5] dark:bg-[#0A1615]"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setNewProjectOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-[#D4D1C7] dark:border-[#244240]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#0F4C4A] text-[#FAF9F5] hover:bg-[#16605D] dark:bg-[#1F8A72]"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
