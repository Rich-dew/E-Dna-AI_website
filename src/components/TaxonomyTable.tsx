import React, { useMemo, useState } from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import type { AssignmentStatus, SampleMetadata, TaxonomicAssignment } from '../types/edna';
import { EmptyState } from './StateBlocks';

interface TaxonomyTableProps {
  samples: SampleMetadata[];
  assignments: TaxonomicAssignment[];
}

export function TaxonomyTable({ samples, assignments }: TaxonomyTableProps) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AssignmentStatus>('all');
  const [sampleFilter, setSampleFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sampleMap = useMemo(() => new Map(samples.map((s) => [s.id, s])), [samples]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assignments.filter((a) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (sampleFilter !== 'all' && a.sampleId !== sampleFilter) return false;
      if (!q) return true;
      const haystack = [
        a.clusterId,
        a.kingdom,
        a.phylum,
        a.className,
        a.orderName,
        a.family,
        a.genus,
        a.species,
        a.status,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [assignments, query, statusFilter, sampleFilter]);

  if (assignments.length === 0) {
    return (
      <EmptyState
        title="No taxonomic assignments yet"
        description="Run the sequence pipeline on an uploaded eDNA file to classify reads from Kingdom through Species and flag potential novel taxa."
      />
    );
  }

  return (
    <section className="rounded-xl border border-[#E3E0D5] dark:border-[#1D3A37] border-t-2 border-t-[#0F4C4A] dark:border-t-[#7ED6B5] bg-white dark:bg-[#0B1B1A] overflow-hidden surface-card">
      <div className="p-4 sm:p-5 border-b border-[#E3E0D5] dark:border-[#1D3A37] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[#EFECE3] dark:bg-[#071312]">
          {(
            [
              { id: 'all', label: `All (${assignments.length})` },
              {
                id: 'Assigned',
                label: `Assigned (${assignments.filter((a) => a.status === 'Assigned').length})`,
              },
              {
                id: 'Low confidence',
                label: `Low confidence (${assignments.filter((a) => a.status === 'Low confidence').length})`,
              },
              {
                id: 'Unclassified, possible novel taxon',
                label: `Novel candidates (${assignments.filter((a) => a.status === 'Unclassified, possible novel taxon').length})`,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-white dark:bg-[#132C2A] text-[#0F4C4A] dark:text-[#FAF9F5] shadow-xs'
                  : 'text-[#435E5B] dark:text-[#9DBAB6] hover:text-[#0F2423] dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            aria-label="Filter by sampling site"
            value={sampleFilter}
            onChange={(e) => setSampleFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-[#D4D1C7] dark:border-[#244643] bg-[#FAF9F5] dark:bg-[#071312]"
          >
            <option value="all">All sites</option>
            {samples.map((s) => (
              <option key={s.id} value={s.id}>
                {s.siteName}
              </option>
            ))}
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#5A7370] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              aria-label="Search taxonomy lineage"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search species, phylum, OTU..."
              className="pl-8 pr-3 py-2 text-xs rounded-lg border border-[#D4D1C7] dark:border-[#244643] bg-[#FAF9F5] dark:bg-[#071312] w-56"
            />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-8 text-center text-sm text-[#4A6361] dark:text-[#9DB6B3]">
          No assignments match the active filters.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E3E0D5] dark:border-[#1D3A37] bg-[#F7F6F0] dark:bg-[#081514] text-[#435E5B] dark:text-[#9DBAB6]">
                <th className="py-3 px-4 font-medium">Cluster</th>
                <th className="py-3 px-3 font-medium">Site</th>
                <th className="py-3 px-3 font-medium">Lineage (Kingdom → Family)</th>
                <th className="py-3 px-3 font-medium">Genus &amp; Species</th>
                <th className="py-3 px-3 font-medium text-right">Reads</th>
                <th className="py-3 px-3 font-medium text-right">% Identity</th>
                <th className="py-3 px-3 font-medium text-right">Conf.</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-3 font-medium text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECEAE2] dark:divide-[#152D2B]">
              {filtered.map((a) => {
                const site = sampleMap.get(a.sampleId)?.siteName ?? a.sampleId;
                const expanded = expandedId === a.id;
                const statusColor =
                  a.status === 'Assigned'
                    ? 'text-[#0F4C4A] dark:text-[#7ED6B5]'
                    : a.status === 'Low confidence'
                      ? 'text-[#A66A08] dark:text-[#F2B84B]'
                      : 'text-[#C84B31] dark:text-[#E8725A]';
                const statusGlyph =
                  a.status === 'Assigned' ? '●' : a.status === 'Low confidence' ? '▲' : '◆';

                return (
                  <React.Fragment key={a.id}>
                    <tr className="hover:bg-[#F7F6F0] dark:hover:bg-[#102423] transition-colors">
                      <td className="py-3 px-4 font-mono tabular-nums font-medium">{a.clusterId}</td>
                      <td className="py-3 px-3 max-w-[140px] truncate">{site}</td>
                      <td className="py-3 px-3 text-[#4A6361] dark:text-[#9DB6B3]">
                        {a.kingdom} · {a.phylum} · {a.className} · {a.orderName} · {a.family}
                      </td>
                      <td className="py-3 px-3 font-medium italic">{a.species}</td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        {a.abundance.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        {a.percentIdentity.toFixed(1)}%
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        {(a.confidence * 100).toFixed(0)}%
                      </td>
                      <td className={`py-3 px-4 font-medium whitespace-nowrap ${statusColor}`}>
                        <span aria-hidden="true" className="mr-1.5">
                          {statusGlyph}
                        </span>
                        {a.status}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          aria-label={`Toggle details for ${a.clusterId}`}
                          onClick={() => setExpandedId(expanded ? null : a.id)}
                          className="p-1 rounded hover:bg-[#ECEAE2] dark:hover:bg-[#1A3331]"
                        >
                          {expanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="bg-[#FAF9F5] dark:bg-[#0B1716]">
                        <td colSpan={9} className="px-5 py-3.5 text-xs space-y-1.5">
                          <div className="flex flex-wrap gap-6 text-[#4A6361] dark:text-[#9DB6B3]">
                            <span>
                              Classifier:{' '}
                              <strong className="text-[#0F2423] dark:text-[#FAF9F5]">
                                {a.classifierUsed === 'online_blast_bold'
                                  ? 'Online NCBI BLAST / BOLD ID'
                                  : 'Calibrated 6-mer Reference Similarity'}
                              </strong>
                            </span>
                            {a.referenceAccession && (
                              <span className="font-mono">
                                Reference Accession: <strong>{a.referenceAccession}</strong>
                              </span>
                            )}
                            <span>
                              Full Taxonomy: {a.kingdom} &gt; {a.phylum} &gt; {a.className} &gt;{' '}
                              {a.orderName} &gt; {a.family} &gt; {a.genus} &gt; {a.species}
                            </span>
                          </div>
                          {a.caveatNote && (
                            <p className="text-[#A66A08] dark:text-[#F2B84B]">{a.caveatNote}</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
