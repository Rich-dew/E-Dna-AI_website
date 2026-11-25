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
    <div className="min-h-screen bg-[#FAF9F5] dark:bg-[#091414] text-[#0F2423] dark:text-[#F2F5F3]">
      {/* Strict 3-zone Top Navigation Bar — zero admin hints */}
      <header className="sticky top-0 z-30 bg-[#FAF9F5]/95 dark:bg-[#091414]/95 backdrop-blur-sm border-b border-[#E3E1D8] dark:border-[#1C3432]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 md:gap-8">
          <Link to="/" aria-label="TaxaTrace Home" className="shrink-0">
            <Logo size="sm" showWordmark showTagline={false} />
          </Link>

          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-[#3F5957] dark:text-[#9DB6B3]"
          >
            <a
              href="#capabilities"
              className="hover:text-[#0F4C4A] dark:hover:text-[#FAF9F5] transition-colors whitespace-nowrap shrink-0"
            >
              Capabilities
            </a>
            <a
              href="#pipeline"
              className="hover:text-[#0F4C4A] dark:hover:text-[#FAF9F5] transition-colors whitespace-nowrap shrink-0"
            >
              Pipeline
            </a>
            <a
              href="#biodiversity"
              className="hover:text-[#0F4C4A] dark:hover:text-[#FAF9F5] transition-colors whitespace-nowrap shrink-0"
            >
              Biodiversity
            </a>
            <a
              href="#reporting"
              className="hover:text-[#0F4C4A] dark:hover:text-[#FAF9F5] transition-colors whitespace-nowrap shrink-0"
            >
              Reporting
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              className="p-2 rounded-lg text-[#3F5957] dark:text-[#9DB6B3] hover:bg-[#ECEAE2] dark:hover:bg-[#142625] transition-colors shrink-0"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {user ? (
              <Link
                to={user.emailVerified ? '/dashboard' : '/verify-email'}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg bg-[#0F4C4A] text-[#FAF9F5] hover:bg-[#16605D] dark:bg-[#1F8A72] dark:hover:bg-[#27A085] transition-colors whitespace-nowrap shrink-0"
              >
                <span className="sm:hidden">Workspace</span>
                <span className="hidden sm:inline">Open Workspace</span>
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden sm:inline-flex px-3.5 py-2 text-sm font-medium text-[#0F4C4A] dark:text-[#FAF9F5] hover:text-[#1F8A72] transition-colors whitespace-nowrap shrink-0"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg bg-[#0F4C4A] text-[#FAF9F5] hover:bg-[#16605D] dark:bg-[#1F8A72] dark:hover:bg-[#27A085] transition-colors whitespace-nowrap shrink-0"
                >
                  Register
                </Link>
              </>
            )}

            <button
              type="button"
              aria-label={mobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
              onClick={() => setMobileNavOpen((v) => !v)}
              className="md:hidden p-2 rounded-lg text-[#3F5957] dark:text-[#9DB6B3] hover:bg-[#ECEAE2] dark:hover:bg-[#142625] shrink-0"
            >
              {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileNavOpen && (
          <div className="md:hidden border-t border-[#E3E1D8] dark:border-[#1C3432] bg-[#FAF9F5] dark:bg-[#091414] px-4 py-4 space-y-3">
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
              <div className="pt-2 flex gap-3 border-t border-[#E3E1D8] dark:border-[#1C3432]">
                <Link
                  to="/login"
                  className="flex-1 text-center py-2 text-sm font-medium rounded-lg border border-[#0F4C4A] text-[#0F4C4A] dark:border-[#7ED6B5] dark:text-[#7ED6B5]"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="flex-1 text-center py-2 text-sm font-medium rounded-lg bg-[#0F4C4A] text-[#FAF9F5]"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        )}
      </header>

      <main>
        {/* Hero Split */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 lg:pt-20 lg:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center">
              <div className="text-xs font-medium tracking-[0.14em] text-[#1F8A72] dark:text-[#7ED6B5] mb-4">
                eDNA · TAXONOMY · BIODIVERSITY
              </div>
              <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-[#0F2423] dark:text-[#FAF9F5] leading-[1.08] [text-wrap:balance]">
                Calibrated taxonomy and biodiversity analytics from environmental DNA.
              </h1>
              <p className="mt-5 text-base sm:text-lg text-[#3F5957] dark:text-[#A9C2BF] leading-relaxed max-w-xl">
                Upload FASTA, FASTQ, or OTU/ASV tables from water, sediment, or soil samples. Run
                quality filtering, chimera flagging, taxonomic classification with novel-taxon
                detection, and spatial biodiversity analysis in one reproducible workspace.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3.5">
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-lg bg-[#0F4C4A] text-[#FAF9F5] hover:bg-[#16605D] dark:bg-[#1F8A72] dark:hover:bg-[#27A085] transition-colors whitespace-nowrap"
                >
                  Create Researcher Account
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center px-5 py-3 text-sm font-semibold rounded-lg border border-[#C9C6BA] dark:border-[#244240] text-[#0F2423] dark:text-[#FAF9F5] hover:bg-[#EFECE3] dark:hover:bg-[#132625] transition-colors whitespace-nowrap"
                >
                  Sign In
                </Link>
                <button
                  type="button"
                  onClick={handleDemoAccess}
                  className="inline-flex items-center px-3 py-3 text-sm font-medium text-[#1F8A72] dark:text-[#7ED6B5] hover:underline underline-offset-4 whitespace-nowrap"
                >
                  Explore sample dataset
                </button>
              </div>

              <p className="mt-6 text-xs text-[#5A7370] dark:text-[#86A19E]">
                Supports 12S · 16S · 18S · COI · ITS · rbcL marker panels · Up to 50 MB per sample
              </p>
            </div>

            <div className="lg:col-span-6">
              <div className="relative h-full min-h-[300px] lg:min-h-[420px] rounded-xl overflow-hidden border border-[#E3E1D8] dark:border-[#1C3432] bg-[#0F4C4A]">
                {!heroImgFailed ? (
                  <img
                    src={HERO_IMG}
                    alt="Marine ecologist filtering coastal estuary water for environmental DNA sampling"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-8 text-[#FAF9F5]">
                    <Logo size="lg" showWordmark showTagline />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#071111]/95 via-[#071111]/70 to-transparent pt-14 px-5 pb-5 text-[#FAF9F5]">
                  <p className="text-xs font-mono tabular-nums text-[#7ED6B5]">
                    36.5214° N, 121.9472° W · Kelp Canopy Transect · 12S MiFish
                  </p>
                  <p className="text-sm font-medium mt-1">
                    Field filtration to species-level lineage and beta ordination
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Full-width 4-column quantitative anchor strip below hero */}
          <div className="mt-14 pt-10 border-t border-[#E3E1D8] dark:border-[#1C3432] grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <div className="font-mono tabular-nums text-2xl sm:text-3xl font-semibold text-[#0F4C4A] dark:text-[#7ED6B5]">
                6 Markers
              </div>
              <p className="text-sm text-[#4A6361] dark:text-[#9DB6B3] mt-1">
                12S, 16S, 18S, COI, ITS, and rbcL barcode workflows
              </p>
            </div>
            <div>
              <div className="font-mono tabular-nums text-2xl sm:text-3xl font-semibold text-[#0F4C4A] dark:text-[#7ED6B5]">
                97% OTU / ASV
              </div>
              <p className="text-sm text-[#4A6361] dark:text-[#9DB6B3] mt-1">
                Quality filtering, dereplication, and chimera screening
              </p>
            </div>
            <div>
              <div className="font-mono tabular-nums text-2xl sm:text-3xl font-semibold text-[#0F4C4A] dark:text-[#7ED6B5]">
                5 Alpha Indices
              </div>
              <p className="text-sm text-[#4A6361] dark:text-[#9DB6B3] mt-1">
                Richness, Shannon H&apos;, Simpson 1-D, Pielou J&apos;, and Chao1
              </p>
            </div>
            <div>
              <div className="font-mono tabular-nums text-2xl sm:text-3xl font-semibold text-[#0F4C4A] dark:text-[#7ED6B5]">
                Novel Flagging
              </div>
              <p className="text-sm text-[#4A6361] dark:text-[#9DB6B3] mt-1">
                Calibrated thresholds separate confident calls from unknown taxa
              </p>
            </div>
          </div>
        </section>

        {/* Capabilities & Pipeline */}
        <section
          id="capabilities"
          className="border-t border-[#E3E1D8] dark:border-[#1C3432] bg-white dark:bg-[#0C1918] py-16 lg:py-24"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0F2423] dark:text-[#FAF9F5]">
                Built for transparent ecological inference
              </h2>
              <p className="mt-3 text-base text-[#4A6361] dark:text-[#9DB6B3] leading-relaxed">
                Every classification reports percent identity, confidence score, and reference gaps
                so teams never over-claim species presence from sparse markers.
              </p>
            </div>

            <div
              id="pipeline"
              className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch"
            >
              <div className="lg:col-span-5">
                <div className="h-full min-h-[260px] rounded-xl overflow-hidden border border-[#E3E1D8] dark:border-[#1C3432] bg-[#FAF9F5] dark:bg-[#132625]">
                  {!labImgFailed ? (
                    <img
                      src={LAB_IMG}
                      alt="Laboratory filtration membranes, vials, and pipettes prepared for eDNA sequencing"
                      referrerPolicy="no-referrer"
                      onError={() => setLabImgFailed(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-6 text-sm text-[#4A6361]">
                      Sterile eDNA membrane filtration bench
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="p-5 rounded-xl border border-[#E3E1D8] dark:border-[#1C3432] bg-[#FAF9F5] dark:bg-[#0F1F1E]">
                  <h3 className="font-display text-base font-semibold text-[#0F4C4A] dark:text-[#7ED6B5]">
                    01. Structured Metadata &amp; Upload
                  </h3>
                  <p className="mt-2 text-sm text-[#4A6361] dark:text-[#9DB6B3] leading-relaxed">
                    Attach latitude, longitude, depth, habitat, collection date, and marker gene to
                    every sample. Drag-and-drop FASTA, FASTQ, CSV, or TSV tables with header
                    sanitization.
                  </p>
                </div>

                <div className="p-5 rounded-xl border border-[#E3E1D8] dark:border-[#1C3432] bg-[#FAF9F5] dark:bg-[#0F1F1E]">
                  <h3 className="font-display text-base font-semibold text-[#0F4C4A] dark:text-[#7ED6B5]">
                    02. Step-by-Step Sequence Pipeline
                  </h3>
                  <p className="mt-2 text-sm text-[#4A6361] dark:text-[#9DB6B3] leading-relaxed">
                    Filter low-Phred and N-rich reads, dereplicate identical amplicons, flag
                    chimeric hybrids, and cluster OTUs at 97% similarity or retain exact ASVs.
                  </p>
                </div>

                <div className="p-5 rounded-xl border border-[#E3E1D8] dark:border-[#1C3432] bg-[#FAF9F5] dark:bg-[#0F1F1E]">
                  <h3 className="font-display text-base font-semibold text-[#0F4C4A] dark:text-[#7ED6B5]">
                    03. Pluggable Taxonomy Classifier
                  </h3>
                  <p className="mt-2 text-sm text-[#4A6361] dark:text-[#9DB6B3] leading-relaxed">
                    Match locally with k-mer similarity against curated reference panels or query
                    NCBI BLAST and BOLD ID online, flagging unclassified potential novel lineages.
                  </p>
                </div>

                <div
                  id="biodiversity"
                  className="p-5 rounded-xl border border-[#E3E1D8] dark:border-[#1C3432] bg-[#FAF9F5] dark:bg-[#0F1F1E]"
                >
                  <h3 className="font-display text-base font-semibold text-[#0F4C4A] dark:text-[#7ED6B5]">
                    04. Alpha, Beta &amp; Spatial Visuals
                  </h3>
                  <p className="mt-2 text-sm text-[#4A6361] dark:text-[#9DB6B3] leading-relaxed">
                    Inspect Bray-Curtis and Jaccard PCoA ordinations, Hurlbert rarefaction curves,
                    taxonomic treemaps, sample abundance heatmaps, and Leaflet site maps.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Reporting & AI Synthesis */}
        <section
          id="reporting"
          className="border-t border-[#E3E1D8] dark:border-[#1C3432] py-16 lg:py-20"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="max-w-2xl">
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0F2423] dark:text-[#FAF9F5]">
                From sequence tables to ecological summaries and publication exports
              </h2>
              <p className="mt-3 text-base text-[#4A6361] dark:text-[#9DB6B3] leading-relaxed">
                Generate plain-language ecological summaries that highlight community turnover,
                reference-database gaps, and primer bias, then export full CSV, JSON, or PDF
                reports for collaborators and field regulators.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 shrink-0">
              <Link
                to="/register"
                className="px-5 py-3 text-sm font-semibold rounded-lg bg-[#0F4C4A] text-[#FAF9F5] hover:bg-[#16605D] dark:bg-[#1F8A72] dark:hover:bg-[#27A085] transition-colors whitespace-nowrap"
              >
                Get Started
              </Link>
              <Link
                to="/login"
                className="px-5 py-3 text-sm font-semibold rounded-lg border border-[#C9C6BA] dark:border-[#244240] text-[#0F2423] dark:text-[#FAF9F5] hover:bg-[#EFECE3] dark:hover:bg-[#132625] transition-colors whitespace-nowrap"
              >
                Researcher Login
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#E3E1D8] dark:border-[#1C3432] bg-white dark:bg-[#0C1918] py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <Logo size="sm" showWordmark showTagline />
          <div className="flex flex-wrap items-center gap-6 text-xs text-[#4A6361] dark:text-[#9DB6B3]">
            <Link to="/login" className="hover:text-[#0F4C4A] dark:hover:text-[#FAF9F5]">
              Login
            </Link>
            <Link to="/register" className="hover:text-[#0F4C4A] dark:hover:text-[#FAF9F5]">
              Register
            </Link>
            <span>© {new Date().getFullYear()} TaxaTrace · Environmental DNA Analytics</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
