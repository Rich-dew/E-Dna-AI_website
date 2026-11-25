import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Database,
  Download,
  FolderKanban,
  KeyRound,
  LogOut,
  Megaphone,
  ScrollText,
  ShieldAlert,
  Trash2,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { exportGenericCsv } from '../lib/reportExport';
import type { AnnouncementBanner, MarkerGene, UserRole } from '../types/edna';
import { NotFoundPage } from './NotFoundPage';

type AdminTab =
  | 'stats'
  | 'users'
  | 'projects'
  | 'reference'
  | 'jobs'
  | 'audit'
  | 'announcement';

const MARKER_GENES: MarkerGene[] = ['12S', '16S', '18S', 'COI', 'ITS', 'rbcL'];

export default function AdminPortalPage() {
  const {
    user,
    hasAdminClaim,
    isLiveFirebase,
    adminStep2Token,
    setAdminStep2Token,
    loginAdminCredentials,
    logout,
  } = useAuth();
  const {
    users,
    projects,
    samples,
    jobs,
    taxaReference,
    auditLogs,
    announcement,
    adminToggleUserDisabled,
    adminChangeUserRole,
    adminDeleteUser,
    adminAddTaxonReference,
    adminDeleteTaxonReference,
    adminUpdateAnnouncement,
    logAdminAudit,
  } = useData();
  const { pushToast } = useToast();

  // Gate states
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [step1Error, setStep1Error] = useState<string | null>(null);
  const [step1Submitting, setStep1Submitting] = useState(false);
  const [deniedTo404, setDeniedTo404] = useState(false);

  // Step 2 passcode states
  const [passcodeMode, setPasscodeMode] = useState<'loading' | 'env' | 'claimed' | 'unclaimed'>(
    'loading',
  );
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeConfirm, setPasscodeConfirm] = useState('');
  const [step2Error, setStep2Error] = useState<string | null>(null);
  const [step2Submitting, setStep2Submitting] = useState(false);

  // Admin Console states
  const [activeTab, setActiveTab] = useState<AdminTab>('stats');
  const [userSearch, setUserSearch] = useState('');
  const [refSearch, setRefSearch] = useState('');

  // New Taxon Reference form
  const [newRef, setNewRef] = useState({
    markerGene: '12S' as MarkerGene,
    kingdom: 'Animalia',
    phylum: 'Chordata',
    className: 'Actinopterygii',
    orderName: '',
    family: '',
    genus: '',
    species: '',
    commonName: '',
    habitat: 'Marine Coastal',
    accessionId: '',
    referenceSequence: '',
  });

  // Announcement form
  const [bannerMsg, setBannerMsg] = useState(announcement.message);
  const [bannerSeverity, setBannerSeverity] = useState<AnnouncementBanner['severity']>(
    announcement.severity,
  );
  const [bannerActive, setBannerActive] = useState(announcement.active);

  const isVerifiedAdminIdentity = Boolean(user && user.role === 'admin' && hasAdminClaim);

  useEffect(() => {
    // Any signed-in non-admin user sees normal 404 immediately
    if (user && !isVerifiedAdminIdentity) {
      setDeniedTo404(true);
    }
  }, [user, isVerifiedAdminIdentity]);

  useEffect(() => {
    if (!isVerifiedAdminIdentity) return;
    fetch('/api/admin/passcode-status')
      .then((r) => r.json())
      .then((data) => {
        if (data?.mode === 'env' || data?.mode === 'claimed' || data?.mode === 'unclaimed') {
          setPasscodeMode(data.mode);
        } else {
          setPasscodeMode('unclaimed');
        }
      })
      .catch(() => setPasscodeMode('unclaimed'));
  }, [isVerifiedAdminIdentity]);

  const totalStorageMb = useMemo(() => {
    const bytes = projects.reduce((sum, p) => sum + p.storageBytes, 0);
    return (bytes / (1024 * 1024)).toFixed(2);
  }, [projects]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.institution.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q),
    );
  }, [users, userSearch]);

  const filteredRefs = useMemo(() => {
    const q = refSearch.trim().toLowerCase();
    if (!q) return taxaReference;
    return taxaReference.filter(
      (r) =>
        r.species.toLowerCase().includes(q) ||
        r.markerGene.toLowerCase().includes(q) ||
        r.family.toLowerCase().includes(q) ||
        r.accessionId.toLowerCase().includes(q),
    );
  }, [taxaReference, refSearch]);

  // Unauthorized non-admin users receive the normal 404 page
  if (deniedTo404) {
    return <NotFoundPage />;
  }

  const handleStep1Login = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep1Error(null);
    setStep1Submitting(true);
    try {
      const res = await loginAdminCredentials(adminEmail, adminPassword);
      if (!res.hasClaim || !res.hasFirestoreRole) {
        // Non-admin attempting entry immediately sees normal 404
        setDeniedTo404(true);
        return;
      }
      pushToast({
        type: 'info',
        title: 'Identity verified (Step 1 of 2)',
        description: 'Complete second-step server passcode verification.',
      });
    } catch (err: unknown) {
      setStep1Error(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setStep1Submitting(false);
    }
  };

  const handleClaimPasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep2Error(null);
    if (passcodeInput.trim().length < 8) {
      setStep2Error('Passcode must be at least 8 characters.');
      return;
    }
    if (passcodeInput !== passcodeConfirm) {
      setStep2Error('Passcodes do not match.');
      return;
    }
    setStep2Submitting(true);
    try {
      const resp = await fetch('/api/admin/claim-passcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: passcodeInput.trim(), uid: user?.uid }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Could not claim admin passcode.');
      }
      setAdminStep2Token(data.token);
      setPasscodeMode('claimed');
      if (user) {
        logAdminAudit(user, 'ADMIN_PASSCODE_CLAIMED', 'server/admin-gate', 'First-run passcode claimed');
      }
      pushToast({ type: 'success', title: 'Admin passcode configured and unlocked' });
    } catch (err: unknown) {
      setStep2Error(err instanceof Error ? err.message : 'Claim failed.');
    } finally {
      setStep2Submitting(false);
    }
  };

  const handleVerifyPasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep2Error(null);
    setStep2Submitting(true);
    try {
      const resp = await fetch('/api/admin/verify-passcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: passcodeInput.trim(), uid: user?.uid }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Invalid passcode.');
      }
      setAdminStep2Token(data.token);
      if (user) {
        logAdminAudit(user, 'ADMIN_SESSION_UNLOCKED', 'admin-console', 'Verified custom claim + Firestore role + passcode');
      }
      pushToast({ type: 'success', title: 'Governance console unlocked' });
    } catch (err: unknown) {
      setStep2Error(err instanceof Error ? err.message : 'Passcode verification failed.');
    } finally {
      setStep2Submitting(false);
    }
  };

  // Distinctly styled dark obsidian governance login (completely separate visual grammar from public app)
  if (!isVerifiedAdminIdentity || !adminStep2Token) {
    return (
      <div className="min-h-screen bg-[#070B0D] text-[#E6ECEB] flex items-center justify-center px-4 py-12 font-sans">
        <div className="w-full max-w-md rounded-xl border border-[#1E2B30] bg-[#0D1417] p-7">
          <div className="flex items-center gap-3 pb-5 border-b border-[#1E2B30]">
            <div className="w-10 h-10 rounded-lg bg-[#162328] border border-[#273B42] flex items-center justify-center text-[#F2B84B]">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold tracking-tight text-white">
                Restricted Control Plane
              </h1>
              <p className="text-xs font-mono text-[#7F979E]">
                Claim admin=true · Firestore role · Step-2 Passcode
              </p>
            </div>
          </div>

          {!isVerifiedAdminIdentity ? (
            <form onSubmit={handleStep1Login} className="mt-6 space-y-4">
              {step1Error && (
                <div
                  role="alert"
                  className="p-3 rounded-lg border border-[#E8725A]/50 bg-[#E8725A]/10 text-xs text-[#F5B0A2]"
                >
                  {step1Error}
                </div>
              )}

              <div>
                <label htmlFor="adm-email" className="block text-xs font-mono text-[#9CB2B8] mb-1.5">
                  Operator Email
                </label>
                <input
                  id="adm-email"
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@taxatrace.org"
                  className="w-full px-3.5 py-2.5 text-sm font-mono rounded-lg border border-[#23343A] bg-[#080E10] text-white focus:outline-none focus:ring-2 focus:ring-[#F2B84B]"
                />
              </div>

              <div>
                <label htmlFor="adm-pw" className="block text-xs font-mono text-[#9CB2B8] mb-1.5">
                  Operator Password
                </label>
                <input
                  id="adm-pw"
                  type="password"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm font-mono rounded-lg border border-[#23343A] bg-[#080E10] text-white focus:outline-none focus:ring-2 focus:ring-[#F2B84B]"
                />
              </div>

              <button
                type="submit"
                disabled={step1Submitting}
                className="w-full py-2.5 px-4 text-sm font-semibold rounded-lg bg-[#F2B84B] text-[#070B0D] hover:bg-[#F5C569] disabled:opacity-50 transition-colors"
              >
                {step1Submitting ? 'Verifying claim...' : 'Verify Admin Identity (Step 1)'}
              </button>

              {!isLiveFirebase && (
                <p className="text-[11px] font-mono text-[#6F868C] leading-relaxed pt-2 border-t border-[#1E2B30]">
                  Local preview seed operator: admin@taxatrace.org / AdminTrace#2026
                </p>
              )}
            </form>
          ) : passcodeMode === 'unclaimed' ? (
            <form onSubmit={handleClaimPasscode} className="mt-6 space-y-4">
              <div className="p-3 rounded-lg border border-[#F2B84B]/40 bg-[#F2B84B]/10 text-xs text-[#F7DFA8]">
                First-run setup: <code className="font-mono">ADMIN_PASSCODE</code> is not set in
                server environment variables. Set a one-time server-hashed passcode below (or define{' '}
                <code className="font-mono">ADMIN_PASSCODE</code> in Secrets before deployment).
              </div>

              {step2Error && (
                <div
                  role="alert"
                  className="p-3 rounded-lg border border-[#E8725A]/50 bg-[#E8725A]/10 text-xs text-[#F5B0A2]"
                >
                  {step2Error}
                </div>
              )}

              <div>
                <label htmlFor="claim-pc" className="block text-xs font-mono text-[#9CB2B8] mb-1.5">
                  New Admin Passcode (min 8 characters)
                </label>
                <input
                  id="claim-pc"
                  type="password"
                  required
                  value={passcodeInput}
                  onChange={(e) => setPasscodeInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm font-mono rounded-lg border border-[#23343A] bg-[#080E10] text-white"
                />
              </div>

              <div>
                <label htmlFor="claim-pc2" className="block text-xs font-mono text-[#9CB2B8] mb-1.5">
                  Confirm Passcode
                </label>
                <input
                  id="claim-pc2"
                  type="password"
                  required
                  value={passcodeConfirm}
                  onChange={(e) => setPasscodeConfirm(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm font-mono rounded-lg border border-[#23343A] bg-[#080E10] text-white"
                />
              </div>

              <button
                type="submit"
                disabled={step2Submitting}
                className="w-full py-2.5 px-4 text-sm font-semibold rounded-lg bg-[#F2B84B] text-[#070B0D] hover:bg-[#F5C569] disabled:opacity-50"
              >
                {step2Submitting ? 'Hashing & locking...' : 'Claim Passcode & Unlock'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyPasscode} className="mt-6 space-y-4">
              <div className="p-3 rounded-lg border border-[#1E2B30] bg-[#080E10] text-xs font-mono text-[#7ED6B5]">
                Step 1 Verified: {user?.email} (admin=true)
              </div>

              {step2Error && (
                <div
                  role="alert"
                  className="p-3 rounded-lg border border-[#E8725A]/50 bg-[#E8725A]/10 text-xs text-[#F5B0A2]"
                >
                  {step2Error}
                </div>
              )}

              <div>
                <label htmlFor="verify-pc" className="block text-xs font-mono text-[#9CB2B8] mb-1.5">
                  Second-Step Admin Passcode
                </label>
                <input
                  id="verify-pc"
                  type="password"
                  required
                  value={passcodeInput}
                  onChange={(e) => setPasscodeInput(e.target.value)}
                  placeholder="Enter server-verified passcode"
                  className="w-full px-3.5 py-2.5 text-sm font-mono rounded-lg border border-[#23343A] bg-[#080E10] text-white"
                />
              </div>

              <button
                type="submit"
                disabled={step2Submitting}
                className="w-full py-2.5 px-4 text-sm font-semibold rounded-lg bg-[#F2B84B] text-[#070B0D] hover:bg-[#F5C569] disabled:opacity-50"
              >
                {step2Submitting ? 'Verifying...' : 'Unlock Governance Console'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  const actor = user!;

  const handleAddTaxon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRef.species.trim() || newRef.referenceSequence.trim().length < 40) {
      pushToast({
        type: 'error',
        title: 'Provide species name and a DNA reference sequence (>= 40 bp).',
      });
      return;
    }
    adminAddTaxonReference(actor, {
      ...newRef,
      species: newRef.species.trim(),
      genus: newRef.genus.trim() || newRef.species.trim().split(' ')[0],
      referenceSequence: newRef.referenceSequence.toUpperCase().replace(/[^ACGTN]/g, ''),
    });
    setNewRef({
      ...newRef,
      orderName: '',
      family: '',
      genus: '',
      species: '',
      commonName: '',
      accessionId: '',
      referenceSequence: '',
    });
    pushToast({ type: 'success', title: 'Reference taxon added & logged to auditLogs' });
  };

  const handleSaveBanner = (e: React.FormEvent) => {
    e.preventDefault();
    adminUpdateAnnouncement(actor, {
      message: bannerMsg.trim(),
      severity: bannerSeverity,
      active: bannerActive,
    });
    pushToast({ type: 'success', title: 'Announcement banner updated & audited' });
  };

  const tabs: Array<{ id: AdminTab; label: string; icon: React.ReactNode }> = [
    { id: 'stats', label: 'Stats Overview', icon: <Activity className="w-4 h-4" /> },
    { id: 'users', label: 'Users', icon: <Users className="w-4 h-4" /> },
    { id: 'projects', label: 'Projects & Datasets', icon: <FolderKanban className="w-4 h-4" /> },
    { id: 'reference', label: 'Reference Taxonomy', icon: <Database className="w-4 h-4" /> },
    { id: 'jobs', label: 'Job Monitor', icon: <ShieldAlert className="w-4 h-4" /> },
    { id: 'audit', label: 'Audit Logs', icon: <ScrollText className="w-4 h-4" /> },
    { id: 'announcement', label: 'Announcement Banner', icon: <Megaphone className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#070B0D] text-[#E6ECEB] flex flex-col">
      <header className="h-16 px-4 sm:px-6 border-b border-[#1E2B30] bg-[#0D1417] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <KeyRound className="w-5 h-5 text-[#F2B84B]" />
          <div>
            <span className="font-display font-bold text-base text-white">
              TaxaTrace Governance Console
            </span>
            <span className="ml-3 text-xs font-mono text-[#7F979E] hidden sm:inline">
              Operator: {actor.email}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={async () => {
            logAdminAudit(actor, 'ADMIN_LOGOUT', 'admin-console');
            setAdminStep2Token(null);
            await logout();
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#273B42] hover:bg-[#162328]"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row">
        <aside className="lg:w-60 border-b lg:border-b-0 lg:border-r border-[#1E2B30] bg-[#0A1012] p-3 flex lg:flex-col gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === t.id
                  ? 'bg-[#F2B84B] text-[#070B0D] font-semibold'
                  : 'text-[#9CB2B8] hover:bg-[#141F24] hover:text-white'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </aside>

        <main className="flex-1 p-5 sm:p-7 max-w-6xl w-full space-y-6">
          {activeTab === 'stats' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-xl font-bold text-white">Platform Telemetry</h2>
                <button
                  type="button"
                  onClick={() => {
                    exportGenericCsv(
                      'taxatrace-admin-summary.csv',
                      ['Metric', 'Value'],
                      [
                        ['Total Users', users.length],
                        ['Active Projects', projects.length],
                        ['Uploaded Samples', samples.length],
                        ['Pipeline Jobs', jobs.length],
                        ['Reference Taxa', taxaReference.length],
                        ['Storage MB', totalStorageMb],
                      ],
                    );
                    logAdminAudit(actor, 'CSV_EXPORT', 'platform-stats');
                    pushToast({ type: 'success', title: 'Exported platform metrics CSV' });
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#273B42] hover:bg-[#162328]"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export Summary CSV
                </button>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Users', value: users.length },
                  { label: 'Uploaded Samples', value: samples.length },
                  { label: 'Pipeline Jobs', value: jobs.length },
                  { label: 'Bucket Storage', value: `${totalStorageMb} MB` },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="p-5 rounded-xl border border-[#1E2B30] bg-[#0D1417]"
                  >
                    <p className="text-xs text-[#7F979E]">{stat.label}</p>
                    <p className="font-mono tabular-nums text-2xl font-bold text-[#F2B84B] mt-1">
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <section className="rounded-xl border border-[#1E2B30] bg-[#0D1417] overflow-hidden">
              <div className="p-4 border-b border-[#1E2B30] flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-base font-bold text-white">User Management</h2>
                <div className="flex items-center gap-2">
                  <input
                    type="search"
                    aria-label="Search users"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search name, email, institution..."
                    className="px-3 py-1.5 text-xs rounded-lg border border-[#23343A] bg-[#080E10] text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      exportGenericCsv(
                        'taxatrace-users.csv',
                        ['UID', 'Name', 'Email', 'Institution', 'Role', 'Country', 'Disabled'],
                        users.map((u) => [
                          u.uid,
                          u.name,
                          u.email,
                          u.institution,
                          u.role,
                          u.country,
                          u.disabled,
                        ]),
                      );
                      logAdminAudit(actor, 'CSV_EXPORT', 'users');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-[#273B42] hover:bg-[#162328]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    CSV
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#1E2B30] text-[#7F979E] bg-[#0A1012]">
                      <th className="py-3 px-4">Researcher</th>
                      <th className="py-3 px-3">Institution</th>
                      <th className="py-3 px-3">Role</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#182328]">
                    {filteredUsers.map((u) => (
                      <tr key={u.uid}>
                        <td className="py-3 px-4">
                          <div className="font-medium text-white">{u.name}</div>
                          <div className="font-mono text-[11px] text-[#7F979E]">{u.email}</div>
                        </td>
                        <td className="py-3 px-3 text-[#B8C7CC]">
                          {u.institution} · {u.country}
                        </td>
                        <td className="py-3 px-3">
                          <select
                            aria-label={`Change role for ${u.email}`}
                            value={u.role}
                            disabled={u.uid === actor.uid}
                            onChange={(e) => {
                              adminChangeUserRole(actor, u.uid, e.target.value as UserRole);
                              pushToast({ type: 'success', title: `Updated role for ${u.email}` });
                            }}
                            className="px-2 py-1 text-xs rounded border border-[#23343A] bg-[#080E10] text-white"
                          >
                            <option value="user">user</option>
                            <option value="admin">admin</option>
                          </select>
                        </td>
                        <td className="py-3 px-3 font-mono">
                          {u.disabled ? (
                            <span className="text-[#E8725A]">Disabled</span>
                          ) : (
                            <span className="text-[#7ED6B5]">Active</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                          <button
                            type="button"
                            disabled={u.uid === actor.uid}
                            onClick={() => {
                              adminToggleUserDisabled(actor, u.uid);
                              pushToast({
                                type: 'info',
                                title: u.disabled ? `Enabled ${u.email}` : `Disabled ${u.email}`,
                              });
                            }}
                            className="px-2.5 py-1 rounded border border-[#273B42] hover:bg-[#162328] disabled:opacity-40"
                          >
                            {u.disabled ? 'Enable' : 'Disable'}
                          </button>
                          <button
                            type="button"
                            disabled={u.uid === actor.uid}
                            aria-label={`Delete user ${u.email}`}
                            onClick={() => {
                              adminDeleteUser(actor, u.uid);
                              pushToast({ type: 'info', title: `Deleted ${u.email}` });
                            }}
                            className="p-1.5 rounded text-[#E8725A] hover:bg-[#E8725A]/15 disabled:opacity-40 align-middle"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeTab === 'projects' && (
            <section className="rounded-xl border border-[#1E2B30] bg-[#0D1417] overflow-hidden">
              <div className="p-4 border-b border-[#1E2B30] flex items-center justify-between">
                <h2 className="font-display text-base font-bold text-white">
                  All Projects &amp; Datasets ({projects.length})
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    exportGenericCsv(
                      'taxatrace-projects.csv',
                      ['ProjectID', 'Name', 'OwnerUID', 'Marker', 'Status', 'StorageBytes'],
                      projects.map((p) => [
                        p.id,
                        p.name,
                        p.ownerUid,
                        p.markerGene,
                        p.status,
                        p.storageBytes,
                      ]),
                    );
                    logAdminAudit(actor, 'CSV_EXPORT', 'projects');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-[#273B42] hover:bg-[#162328]"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#1E2B30] text-[#7F979E] bg-[#0A1012]">
                      <th className="py-3 px-4">Project</th>
                      <th className="py-3 px-3">Owner</th>
                      <th className="py-3 px-3">Marker</th>
                      <th className="py-3 px-3 text-right">Samples</th>
                      <th className="py-3 px-3 text-right">Storage</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#182328]">
                    {projects.map((p) => (
                      <tr key={p.id}>
                        <td className="py-3 px-4 font-medium text-white">{p.name}</td>
                        <td className="py-3 px-3 font-mono text-[#9CB2B8]">{p.ownerUid}</td>
                        <td className="py-3 px-3 font-mono">{p.markerGene}</td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums">
                          {samples.filter((s) => s.projectId === p.id).length}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums">
                          {(p.storageBytes / (1024 * 1024)).toFixed(2)} MB
                        </td>
                        <td className="py-3 px-4 font-mono text-[#7ED6B5]">{p.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeTab === 'reference' && (
            <div className="space-y-6">
              <form
                onSubmit={handleAddTaxon}
                className="rounded-xl border border-[#1E2B30] bg-[#0D1417] p-5 space-y-4"
              >
                <h2 className="font-display text-base font-bold text-white">
                  Add Reference Taxon Voucher
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <select
                    aria-label="Marker gene"
                    value={newRef.markerGene}
                    onChange={(e) =>
                      setNewRef({ ...newRef, markerGene: e.target.value as MarkerGene })
                    }
                    className="px-3 py-2 text-xs font-mono rounded-lg border border-[#23343A] bg-[#080E10] text-white"
                  >
                    {MARKER_GENES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Species (e.g. Sebastes caurinus)"
                    value={newRef.species}
                    onChange={(e) => setNewRef({ ...newRef, species: e.target.value })}
                    className="px-3 py-2 text-xs rounded-lg border border-[#23343A] bg-[#080E10] text-white"
                  />
                  <input
                    type="text"
                    placeholder="Family (e.g. Sebastidae)"
                    value={newRef.family}
                    onChange={(e) => setNewRef({ ...newRef, family: e.target.value })}
                    className="px-3 py-2 text-xs rounded-lg border border-[#23343A] bg-[#080E10] text-white"
                  />
                  <input
                    type="text"
                    placeholder="Accession ID (e.g. NC_099112.1)"
                    value={newRef.accessionId}
                    onChange={(e) => setNewRef({ ...newRef, accessionId: e.target.value })}
                    className="px-3 py-2 text-xs font-mono rounded-lg border border-[#23343A] bg-[#080E10] text-white"
                  />
                  <input
                    type="text"
                    placeholder="Common Name"
                    value={newRef.commonName}
                    onChange={(e) => setNewRef({ ...newRef, commonName: e.target.value })}
                    className="px-3 py-2 text-xs rounded-lg border border-[#23343A] bg-[#080E10] text-white"
                  />
                  <input
                    type="text"
                    placeholder="Habitat"
                    value={newRef.habitat}
                    onChange={(e) => setNewRef({ ...newRef, habitat: e.target.value })}
                    className="px-3 py-2 text-xs rounded-lg border border-[#23343A] bg-[#080E10] text-white"
                  />
                </div>
                <textarea
                  rows={2}
                  placeholder="Reference DNA sequence (ACGT..., min 40 bp)"
                  value={newRef.referenceSequence}
                  onChange={(e) => setNewRef({ ...newRef, referenceSequence: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-[#23343A] bg-[#080E10] text-white"
                />
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#F2B84B] text-[#070B0D] hover:bg-[#F5C569]"
                >
                  Add Reference Taxon
                </button>
              </form>

              <section className="rounded-xl border border-[#1E2B30] bg-[#0D1417] overflow-hidden">
                <div className="p-4 border-b border-[#1E2B30] flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-display text-sm font-bold text-white">
                    Seeded Reference Taxonomy Table ({filteredRefs.length})
                  </h3>
                  <input
                    type="search"
                    value={refSearch}
                    onChange={(e) => setRefSearch(e.target.value)}
                    placeholder="Filter species, marker, accession..."
                    className="px-3 py-1.5 text-xs rounded-lg border border-[#23343A] bg-[#080E10] text-white"
                  />
                </div>
                <div className="overflow-x-auto max-h-[380px]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#1E2B30] text-[#7F979E] bg-[#0A1012]">
                        <th className="py-2.5 px-4">Marker</th>
                        <th className="py-2.5 px-3">Species</th>
                        <th className="py-2.5 px-3">Lineage</th>
                        <th className="py-2.5 px-3">Accession</th>
                        <th className="py-2.5 px-4 text-right">Remove</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#182328]">
                      {filteredRefs.map((r) => (
                        <tr key={r.id}>
                          <td className="py-2.5 px-4 font-mono text-[#F2B84B]">{r.markerGene}</td>
                          <td className="py-2.5 px-3 italic font-medium text-white">{r.species}</td>
                          <td className="py-2.5 px-3 text-[#9CB2B8]">
                            {r.kingdom} · {r.phylum} · {r.family}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[#7ED6B5]">{r.accessionId}</td>
                          <td className="py-2.5 px-4 text-right">
                            <button
                              type="button"
                              aria-label={`Remove reference ${r.species}`}
                              onClick={() => adminDeleteTaxonReference(actor, r.id)}
                              className="p-1 text-[#E8725A] hover:bg-[#E8725A]/15 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'jobs' && (
            <section className="rounded-xl border border-[#1E2B30] bg-[#0D1417] overflow-hidden">
              <div className="p-4 border-b border-[#1E2B30]">
                <h2 className="font-display text-base font-bold text-white">
                  Bioinformatics Job Monitor ({jobs.length})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#1E2B30] text-[#7F979E] bg-[#0A1012]">
                      <th className="py-3 px-4">Job ID</th>
                      <th className="py-3 px-3">Project</th>
                      <th className="py-3 px-3">Mode</th>
                      <th className="py-3 px-3 text-right">Passed / Input</th>
                      <th className="py-3 px-3 text-right">Chimeras</th>
                      <th className="py-3 px-4">Stage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#182328]">
                    {jobs.map((j) => (
                      <tr key={j.id}>
                        <td className="py-3 px-4 font-mono">{j.id}</td>
                        <td className="py-3 px-3 text-white">{j.projectName}</td>
                        <td className="py-3 px-3 font-mono text-[#9CB2B8]">
                          {j.clusteringMode} / {j.classifierMode}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums">
                          {j.readsPassed} / {j.readsInput}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums">
                          {j.chimerasFlagged}
                        </td>
                        <td className="py-3 px-4 font-mono text-[#7ED6B5]">
                          {j.stage} ({j.progress}%)
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeTab === 'audit' && (
            <section className="rounded-xl border border-[#1E2B30] bg-[#0D1417] overflow-hidden">
              <div className="p-4 border-b border-[#1E2B30] flex items-center justify-between">
                <h2 className="font-display text-base font-bold text-white">
                  Immutable Admin Audit Log ({auditLogs.length})
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    exportGenericCsv(
                      'taxatrace-audit-logs.csv',
                      ['Timestamp', 'ActorEmail', 'Action', 'Target', 'Details'],
                      auditLogs.map((l) => [l.ts, l.actorEmail, l.action, l.target, l.details]),
                    );
                    logAdminAudit(actor, 'CSV_EXPORT', 'auditLogs');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-[#273B42] hover:bg-[#162328]"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export Audit CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#1E2B30] text-[#7F979E] bg-[#0A1012]">
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-3">Actor</th>
                      <th className="py-3 px-3">Action</th>
                      <th className="py-3 px-3">Target</th>
                      <th className="py-3 px-4">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#182328]">
                    {auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="py-3 px-4 font-mono tabular-nums text-[#7F979E] whitespace-nowrap">
                          {new Date(log.ts).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 font-mono">{log.actorEmail}</td>
                        <td className="py-3 px-3 font-mono text-[#F2B84B]">{log.action}</td>
                        <td className="py-3 px-3 font-mono text-white">{log.target}</td>
                        <td className="py-3 px-4 text-[#9CB2B8]">{log.details || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeTab === 'announcement' && (
            <form
              onSubmit={handleSaveBanner}
              className="rounded-xl border border-[#1E2B30] bg-[#0D1417] p-6 space-y-4 max-w-2xl"
            >
              <h2 className="font-display text-base font-bold text-white">
                Global Workspace Announcement Banner
              </h2>
              <p className="text-xs text-[#9CB2B8]">
                Displayed across the top of the researcher workspace (stored at{' '}
                <code className="font-mono">settings/announcement</code>).
              </p>

              <div>
                <label htmlFor="ann-msg" className="block text-xs font-mono text-[#9CB2B8] mb-1.5">
                  Announcement Message
                </label>
                <textarea
                  id="ann-msg"
                  rows={3}
                  value={bannerMsg}
                  onChange={(e) => setBannerMsg(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#23343A] bg-[#080E10] text-white"
                />
              </div>

              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <label
                    htmlFor="ann-sev"
                    className="block text-xs font-mono text-[#9CB2B8] mb-1.5"
                  >
                    Severity
                  </label>
                  <select
                    id="ann-sev"
                    value={bannerSeverity}
                    onChange={(e) =>
                      setBannerSeverity(e.target.value as AnnouncementBanner['severity'])
                    }
                    className="px-3 py-2 text-xs rounded-lg border border-[#23343A] bg-[#080E10] text-white"
                  >
                    <option value="info">Info (Deep Teal)</option>
                    <option value="warning">Warning (Amber)</option>
                    <option value="maintenance">Maintenance (Coral)</option>
                  </select>
                </div>

                <label className="inline-flex items-center gap-2 text-xs font-mono text-white pt-5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bannerActive}
                    onChange={(e) => setBannerActive(e.target.checked)}
                    className="w-4 h-4 accent-[#F2B84B]"
                  />
                  Banner visible to researchers
                </label>
              </div>

              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#F2B84B] text-[#070B0D] hover:bg-[#F5C569]"
              >
                Publish Announcement
              </button>
            </form>
          )}
        </main>
      </div>
    </div>
  );
}
