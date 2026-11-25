import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Moon, Sun, Menu, X } from 'lucide-react';
import { Logo } from '../components/Logo';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const HERO_IMG = '/src/assets/images/hero_edna_sampling_1795608772472.jpg';
const LAB_IMG = '/src/assets/images/lab_sequencing_bench_1795608769363.jpg';

export function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const { user, loginDemoResearcher } = useAuth();
  const { pushToast } = useToast();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [labImgFailed, setLabImgFailed] = useState(false);

  const handleDemoAccess = async () => {
    try {
      await loginDemoResearcher();
      pushToast({
        type: 'info',
        title: 'Demo workspace loaded',
        description: 'Exploring Pacific Kelp & Estuary 12S and COI datasets.',
      });
      navigate('/dashboard');
    } catch {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] dark:bg-[#061111] text-[#0F2423] dark:text-[#EEF4F2]">
      {/* Strict 3-zone Top Navigation Bar — zero admin hints */}
      <header className="sticky top-0 z-30 bg-[#FAF9F5]/85 dark:bg-[#061111]/85 backdrop-blur-md border-b border-[#E3E0D5]/90 dark:border-[#193331]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 md:gap-8">
          <Link to="/" aria-label="TaxaTrace Home" className="shrink-0">
            <Logo size="sm" showWordmark showTagline={false} />
          </Link>

          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-[#3B5755] dark:text-[#9DBAB6]"
          >
            <a
              href="#capabilities"
              className="hover:text-[#0F4C4A] dark:hover:text-[#7ED6B5] underline-offset-8 hover:underline decoration-[#1F8A72] decoration-2 whitespace-nowrap shrink-0"
            >
              Capabilities
            </a>
            <a
              href="#pipeline"
              className="hover:text-[#0F4C4A] dark:hover:text-[#7ED6B5] underline-offset-8 hover:underline decoration-[#1F8A72] decoration-2 whitespace-nowrap shrink-0"
            >
              Pipeline
            </a>
            <a
              href="#biodiversity"
              className="hover:text-[#0F4C4A] dark:hover:text-[#7ED6B5] underline-offset-8 hover:underline decoration-[#1F8A72] decoration-2 whitespace-nowrap shrink-0"
            >
              Biodiversity
            </a>
            <a
              href="#reporting"
              className="hover:text-[#0F4C4A] dark:hover:text-[#7ED6B5] underline-offset-8 hover:underline decoration-[#1F8A72] decoration-2 whitespace-nowrap shrink-0"
            >
              Reporting
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              className="p-2 rounded-lg text-[#3B5755] dark:text-[#9DBAB6] hover:bg-[#ECE9DE] dark:hover:bg-[#122927] hover:text-[#0F4C4A] dark:hover:text-[#7ED6B5] shrink-0"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {user ? (
              <Link
                to={user.emailVerified ? '/dashboard' : '/verify-email'}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-gradient-to-r from-[#0F4C4A] to-[#176961] text-[#FAF9F5] shadow-sm shadow-[#0F4C4A]/20 hover:from-[#145E5B] hover:to-[#1F8A72] dark:from-[#1F8A72] dark:to-[#27A085] whitespace-nowrap shrink-0"
              >
                <span className="sm:hidden">Workspace</span>
                <span className="hidden sm:inline">Open Workspace</span>
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden sm:inline-flex px-3.5 py-2 text-sm font-medium text-[#0F4C4A] dark:text-[#DCEAE7] hover:text-[#1F8A72] dark:hover:text-[#7ED6B5] whitespace-nowrap shrink-0"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-gradient-to-r from-[#0F4C4A] to-[#176961] text-[#FAF9F5] shadow-sm shadow-[#0F4C4A]/20 hover:from-[#145E5B] hover:to-[#1F8A72] dark:from-[#1F8A72] dark:to-[#27A085] whitespace-nowrap shrink-0"
                >
                  Register
                </Link>
              </>
            )}

            <button
              type="button"
              aria-label={mobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
              onClick={() => setMobileNavOpen((v) => !v)}
              className="md:hidden p-2 rounded-lg text-[#3B5755] dark:text-[#9DBAB6] hover:bg-[#ECE9DE] dark:hover:bg-[#122927] shrink-0"
            >
              {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileNavOpen && (
          <div className="md:hidden border-t border-[#E3E0D5] dark:border-[#193331] bg-[#FAF9F5] dark:bg-[#061111] px-4 py-4 space-y-3">
            <a
              href="#capabilities"
              onClick={() => setMobileNavOpen(false)}
              className="block text-sm font-medium py-1.5"
            >
              Capabilities
            </a>
            <a
              href="#pipeline"
              onClick={() => setMobileNavOpen(false)}
              className="block text-sm font-medium py-1.5"
            >
              Pipeline
            </a>
            <a
              href="#biodiversity"
              onClick={() => setMobileNavOpen(false)}
              className="block text-sm font-medium py-1.5"
            >
              Biodiversity
            </a>
            <a
              href="#reporting"
              onClick={() => setMobileNavOpen(false)}
              className="block text-sm font-medium py-1.5"
            >
              Reporting
            </a>
            {!user && (
              <div className="pt-2 flex gap-3 border-t border-[#E3E0D5] dark:border-[#193331]">
                <Link
                  to="/login"
                  className="flex-1 text-center py-2 text-sm font-medium rounded-lg border border-[#0F4C4A] text-[#0F4C4A] dark:border-[#7ED6B5] dark:text-[#7ED6B5]"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="flex-1 text-center py-2 text-sm font-semibold rounded-lg bg-[#0F4C4A] text-[#FAF9F5]"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        )}
      </header>

      <main>
        {/* Hero Split with Oceanic Atmospheric Wash */}
        <section className="relative overflow-hidden bg-ocean-wash">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-bio-grid opacity-70" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 lg:pt-20 lg:pb-24">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
              <div className="lg:col-span-6 flex flex-col justify-center">
                <div className="flex items-center gap-3 text-xs font-semibold tracking-[0.14em] text-[#1F8A72] dark:text-[#7ED6B5] mb-4">
                  <span aria-hidden="true" className="h-[2px] w-7 bg-gradient-to-r from-[#0F4C4A] to-[#7ED6B5] rounded-full" />
                  <span>eDNA · TAXONOMY · BIODIVERSITY</span>
                </div>
                <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-[#0B2322] dark:text-[#FAF9F5] leading-[1.07] [text-wrap:balance]">
                  Calibrated taxonomy and biodiversity analytics from{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0F4C4A] via-[#1F8A72] to-[#2B9A86] dark:from-[#7ED6B5] dark:via-[#5BB6E8] dark:to-[#7ED6B5]">
                    environmental DNA.
                  </span>
                </h1>
                <p className="mt-5 text-base sm:text-lg text-[#3B5755] dark:text-[#A9C5C1] leading-relaxed max-w-xl">
                  Upload FASTA, FASTQ, or OTU/ASV tables from water, sediment, or soil samples. Run
                  quality filtering, chimera flagging, taxonomic classification with novel-taxon
                  detection, and spatial biodiversity analysis in one reproducible workspace.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-3.5">
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-lg bg-gradient-to-r from-[#0F4C4A] to-[#176961] text-[#FAF9F5] shadow-md shadow-[#0F4C4A]/20 hover:from-[#145E5B] hover:to-[#1F8A72] hover:-translate-y-px dark:from-[#1F8A72] dark:to-[#27A085] whitespace-nowrap"
                  >
                    Create Researcher Account
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/login"
                    className="inline-flex items-center px-5 py-3 text-sm font-semibold rounded-lg border border-[#C5C2B6] dark:border-[#244643] bg-white/75 dark:bg-[#0B1B1A]/75 text-[#0F2423] dark:text-[#FAF9F5] hover:bg-white dark:hover:bg-[#122927] hover:border-[#0F4C4A]/40 dark:hover:border-[#7ED6B5]/40 whitespace-nowrap"
                  >
                    Sign In
                  </Link>
                  <button
                    type="button"
                    onClick={handleDemoAccess}
                    className="inline-flex items-center px-3 py-3 text-sm font-semibold text-[#1F8A72] dark:text-[#7ED6B5] hover:text-[#0F4C4A] dark:hover:text-[#A7E6CE] hover:underline underline-offset-4 whitespace-nowrap"
                  >
                    Explore sample dataset
                  </button>
                </div>

                <p className="mt-6 text-xs text-[#4F6B68] dark:text-[#86A7A3]">
                  Supports 12S · 16S · 18S · COI · ITS · rbcL marker panels · Up to 50 MB per sample
                </p>
              </div>

              <div className="lg:col-span-6">
                <div className="group relative h-full min-h-[300px] lg:min-h-[430px] rounded-2xl overflow-hidden border border-[#D8D5C8] dark:border-[#1E3B38] bg-[#0F4C4A] surface-card">
                  {!heroImgFailed ? (
                    <img
                      src={HERO_IMG}
                      alt="Marine ecologist filtering coastal estuary water for environmental DNA sampling"
                      referrerPolicy="no-referrer"
                      onError={() => setHeroImgFailed(true)}
                      className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8 text-[#FAF9F5]">
                      <Logo size="lg" showWordmark showTagline />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#051111]/95 via-[#071918]/72 to-transparent pt-16 px-6 pb-5 text-[#FAF9F5]">
                    <p className="text-xs font-mono tabular-nums text-[#7ED6B5]">
                      36.5214° N, 121.9472° W · Kelp Canopy Transect · 12S MiFish
                    </p>
                    <p className="text-sm font-medium mt-1 text-[#FAF9F5]">
                      Field filtration to species-level lineage and beta ordination
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Full-width 4-column quantitative anchor strip with subtle brand-spectrum top hairlines */}
            <div className="mt-14 pt-8 grid grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="pt-4 border-t-2 border-[#0F4C4A] dark:border-[#7ED6B5]">
                <div className="font-mono tabular-nums text-2xl sm:text-3xl font-semibold text-[#0F4C4A] dark:text-[#7ED6B5]">
                  6 Markers
                </div>
                <p className="text-sm text-[#435E5B] dark:text-[#9DBAB6] mt-1.5 leading-snug">
                  12S, 16S, 18S, COI, ITS, and rbcL barcode workflows
                </p>
              </div>
              <div className="pt-4 border-t-2 border-[#1F8A72]">
                <div className="font-mono tabular-nums text-2xl sm:text-3xl font-semibold text-[#176E5B] dark:text-[#7ED6B5]">
                  97% OTU / ASV
                </div>
                <p className="text-sm text-[#435E5B] dark:text-[#9DBAB6] mt-1.5 leading-snug">
                  Quality filtering, dereplication, and chimera screening
                </p>
              </div>
              <div className="pt-4 border-t-2 border-[#5BB6E8]">
                <div className="font-mono tabular-nums text-2xl sm:text-3xl font-semibold text-[#1E6C96] dark:text-[#5BB6E8]">
                  5 Alpha Indices
                </div>
                <p className="text-sm text-[#435E5B] dark:text-[#9DBAB6] mt-1.5 leading-snug">
                  Richness, Shannon H&apos;, Simpson 1-D, Pielou J&apos;, and Chao1
                </p>
              </div>
              <div className="pt-4 border-t-2 border-[#E8725A]">
                <div className="font-mono tabular-nums text-2xl sm:text-3xl font-semibold text-[#C24C34] dark:text-[#E8725A]">
                  Novel Flagging
                </div>
                <p className="text-sm text-[#435E5B] dark:text-[#9DBAB6] mt-1.5 leading-snug">
                  Calibrated thresholds separate confident calls from unknown taxa
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Capabilities & Pipeline */}
        <section
          id="capabilities"
          className="border-t border-[#E3E0D5] dark:border-[#193331] bg-white dark:bg-[#0A1817] py-16 lg:py-24"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <div className="text-xs font-semibold tracking-[0.12em] text-[#1F8A72] dark:text-[#7ED6B5] mb-2.5">
                Workflow Architecture
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0B2322] dark:text-[#FAF9F5] [text-wrap:balance]">
                Built for transparent ecological inference
              </h2>
              <p className="mt-3 text-base text-[#435E5B] dark:text-[#9DBAB6] leading-relaxed">
                Every classification reports percent identity, confidence score, and reference gaps
                so teams never over-claim species presence from sparse markers.
              </p>
            </div>

            <div
              id="pipeline"
              className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch"
            >
              <div className="lg:col-span-5">
                <div className="group relative h-full min-h-[280px] rounded-2xl overflow-hidden border border-[#E3E0D5] dark:border-[#1D3A37] bg-[#FAF9F5] dark:bg-[#102422] surface-card">
                  {!labImgFailed ? (
                    <img
                      src={LAB_IMG}
                      alt="Laboratory filtration membranes, vials, and pipettes prepared for eDNA sequencing"
                      referrerPolicy="no-referrer"
                      onError={() => setLabImgFailed(true)}
                      className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-6 text-sm text-[#435E5B]">
                      Sterile eDNA membrane filtration bench
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#051111]/90 via-[#071918]/55 to-transparent pt-12 px-5 pb-4 text-[#FAF9F5]">
                    <p className="text-xs font-mono text-[#7ED6B5]">
                      QC Phred · Dereplication · Chimera Screening
                    </p>
                    <p className="text-xs text-[#DCEAE7] mt-0.5">
                      Sterile membrane extraction through calibrated taxonomic assignment
                    </p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="p-6 rounded-xl border border-[#E3E0D5] dark:border-[#1D3A37] border-t-2 border-t-[#0F4C4A] dark:border-t-[#7ED6B5] bg-[#FAF9F5] dark:bg-[#0D1E1D] surface-card hover:-translate-y-0.5">
                  <h3 className="font-display text-base font-semibold text-[#0F4C4A] dark:text-[#7ED6B5]">
                    01. Structured Metadata &amp; Upload
                  </h3>
                  <p className="mt-2.5 text-sm text-[#435E5B] dark:text-[#9DBAB6] leading-relaxed">
                    Attach latitude, longitude, depth, habitat, collection date, and marker gene to
                    every sample. Drag-and-drop FASTA, FASTQ, CSV, or TSV tables with header
                    sanitization.
                  </p>
                </div>

                <div className="p-6 rounded-xl border border-[#E3E0D5] dark:border-[#1D3A37] border-t-2 border-t-[#1F8A72] bg-[#FAF9F5] dark:bg-[#0D1E1D] surface-card hover:-translate-y-0.5">
                  <h3 className="font-display text-base font-semibold text-[#0F4C4A] dark:text-[#7ED6B5]">
                    02. Step-by-Step Sequence Pipeline
                  </h3>
                  <p className="mt-2.5 text-sm text-[#435E5B] dark:text-[#9DBAB6] leading-relaxed">
                    Filter low-Phred and N-rich reads, dereplicate identical amplicons, flag
                    chimeric hybrids, and cluster OTUs at 97% similarity or retain exact ASVs.
                  </p>
                </div>

                <div className="p-6 rounded-xl border border-[#E3E0D5] dark:border-[#1D3A37] border-t-2 border-t-[#F2B84B] bg-[#FAF9F5] dark:bg-[#0D1E1D] surface-card hover:-translate-y-0.5">
                  <h3 className="font-display text-base font-semibold text-[#0F4C4A] dark:text-[#F2B84B]">
                    03. Pluggable Taxonomy Classifier
                  </h3>
                  <p className="mt-2.5 text-sm text-[#435E5B] dark:text-[#9DBAB6] leading-relaxed">
                    Match locally with k-mer similarity against curated reference panels or query
                    NCBI BLAST and BOLD ID online, flagging unclassified potential novel lineages.
                  </p>
                </div>

                <div
                  id="biodiversity"
                  className="p-6 rounded-xl border border-[#E3E0D5] dark:border-[#1D3A37] border-t-2 border-t-[#5BB6E8] bg-[#FAF9F5] dark:bg-[#0D1E1D] surface-card hover:-translate-y-0.5"
                >
                  <h3 className="font-display text-base font-semibold text-[#0F4C4A] dark:text-[#5BB6E8]">
                    04. Alpha, Beta &amp; Spatial Visuals
                  </h3>
                  <p className="mt-2.5 text-sm text-[#435E5B] dark:text-[#9DBAB6] leading-relaxed">
                    Inspect Bray-Curtis and Jaccard PCoA ordinations, Hurlbert rarefaction curves,
                    taxonomic treemaps, sample abundance heatmaps, and Leaflet site maps.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Reporting & AI Synthesis — Deep Reef Editorial Feature Band */}
        <section
          id="reporting"
          className="border-t border-[#E3E0D5] dark:border-[#193331] py-14 lg:py-20 bg-[#FAF9F5] dark:bg-[#061111]"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl bg-deep-reef border border-[#1E6B64]/50 px-6 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-14 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 text-[#FAF9F5] surface-card">
              <div className="max-w-2xl">
                <div className="text-xs font-semibold tracking-[0.12em] text-[#7ED6B5] mb-2.5">
                  Ecological Synthesis &amp; Publication Exports
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#FAF9F5] [text-wrap:balance]">
                  From sequence tables to ecological summaries and publication exports
                </h2>
                <p className="mt-3 text-base text-[#D3E7E3] leading-relaxed">
                  Generate plain-language ecological summaries that highlight community turnover,
                  reference-database gaps, and primer bias, then export full CSV, JSON, or PDF
                  reports for collaborators and field regulators.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 shrink-0">
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-lg bg-[#FAF9F5] text-[#0F4C4A] hover:bg-[#EAF6F1] shadow-sm whitespace-nowrap"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/login"
                  className="px-5 py-3 text-sm font-semibold rounded-lg border border-[#7ED6B5]/50 text-[#FAF9F5] hover:bg-white/10 whitespace-nowrap"
                >
                  Researcher Login
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#E3E0D5] dark:border-[#193331] bg-white dark:bg-[#0A1817] py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <Logo size="sm" showWordmark showTagline />
          <div className="flex flex-wrap items-center gap-6 text-xs text-[#435E5B] dark:text-[#9DBAB6]">
            <Link to="/login" className="hover:text-[#0F4C4A] dark:hover:text-[#7ED6B5]">
              Login
            </Link>
            <Link to="/register" className="hover:text-[#0F4C4A] dark:hover:text-[#7ED6B5]">
              Register
            </Link>
            <span>© {new Date().getFullYear()} TaxaTrace · Environmental DNA Analytics</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
