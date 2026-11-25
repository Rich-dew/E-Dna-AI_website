-- =============================================================================
-- TaxaTrace Supabase PostgreSQL Schema, Indexes, RLS Policies, Storage & Seeds
-- Third-Party Auth: Firebase ID Token passed via supabase-js accessToken option
-- Owner claim: auth.jwt()->>'sub'  |  Admin claim: (auth.jwt()->>'admin')::boolean
-- =============================================================================

create extension if not exists "pgcrypto";

-- Helper functions for clean RLS policies
create or replace function public.current_firebase_uid()
returns text
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'sub', '');
$$;

create or replace function public.is_firebase_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() ->> 'admin')::boolean, false);
$$;

-- -----------------------------------------------------------------------------
-- 1. Core Tables (Every table has owner_uid, indexed)
-- -----------------------------------------------------------------------------

create table if not exists public.samples (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  owner_uid text not null,
  site_name text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  depth_meters numeric(8,2) not null default 0,
  collection_date date not null,
  habitat text not null,
  marker_gene text not null check (marker_gene in ('12S', '16S', '18S', 'COI', 'ITS', 'rbcL')),
  file_name text,
  file_size_bytes bigint not null default 0 check (file_size_bytes <= 52428800),
  storage_path text,
  read_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_samples_owner_uid on public.samples (owner_uid);
create index if not exists idx_samples_project_id on public.samples (project_id);

create table if not exists public.sequences (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  sample_id uuid not null references public.samples(id) on delete cascade,
  owner_uid text not null,
  header text not null,
  sequence text not null,
  seq_length integer not null,
  mean_phred numeric(5,2) not null default 35.0,
  abundance integer not null default 1 check (abundance >= 1),
  is_chimera boolean not null default false,
  cluster_id text not null,
  clustering_mode text not null check (clustering_mode in ('otu_97', 'asv')),
  created_at timestamptz not null default now()
);

create index if not exists idx_sequences_owner_uid on public.sequences (owner_uid);
create index if not exists idx_sequences_sample_id on public.sequences (sample_id);

create table if not exists public.taxa_reference (
  id uuid primary key default gen_random_uuid(),
  owner_uid text not null default 'system',
  marker_gene text not null check (marker_gene in ('12S', '16S', '18S', 'COI', 'ITS', 'rbcL')),
  kingdom text not null,
  phylum text not null,
  class_name text not null,
  order_name text not null,
  family text not null,
  genus text not null,
  species text not null,
  common_name text,
  habitat text,
  accession_id text not null unique,
  reference_sequence text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_taxa_reference_owner_uid on public.taxa_reference (owner_uid);
create index if not exists idx_taxa_reference_marker on public.taxa_reference (marker_gene);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  sample_id uuid not null references public.samples(id) on delete cascade,
  sequence_id uuid not null references public.sequences(id) on delete cascade,
  owner_uid text not null,
  cluster_id text not null,
  abundance integer not null default 1,
  kingdom text not null,
  phylum text not null,
  class_name text not null,
  order_name text not null,
  family text not null,
  genus text not null,
  species text not null,
  percent_identity numeric(5,2) not null check (percent_identity between 0 and 100),
  confidence numeric(4,2) not null check (confidence between 0 and 1),
  status text not null check (
    status in ('Assigned', 'Low confidence', 'Unclassified, possible novel taxon')
  ),
  classifier_used text not null check (classifier_used in ('demo_kmer', 'online_blast_bold')),
  reference_accession text,
  caveat_note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_assignments_owner_uid on public.assignments (owner_uid);
create index if not exists idx_assignments_sample_id on public.assignments (sample_id);
create index if not exists idx_assignments_status on public.assignments (status);

create table if not exists public.diversity_metrics (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  sample_id uuid not null references public.samples(id) on delete cascade,
  owner_uid text not null,
  total_reads integer not null default 0,
  richness integer not null default 0,
  shannon numeric(6,3) not null default 0,
  simpson numeric(6,3) not null default 0,
  pielou_evenness numeric(6,3) not null default 0,
  chao1 numeric(8,2) not null default 0,
  novel_taxa_count integer not null default 0,
  computed_at timestamptz not null default now(),
  unique (sample_id)
);

create index if not exists idx_diversity_metrics_owner_uid on public.diversity_metrics (owner_uid);
create index if not exists idx_diversity_metrics_project_id on public.diversity_metrics (project_id);

-- -----------------------------------------------------------------------------
-- 2. Row Level Security (RLS)
-- -----------------------------------------------------------------------------

alter table public.samples enable row level security;
alter table public.sequences enable row level security;
alter table public.taxa_reference enable row level security;
alter table public.assignments enable row level security;
alter table public.diversity_metrics enable row level security;

-- samples policies
create policy "samples_owner_or_admin_select" on public.samples
  for select using (owner_uid = public.current_firebase_uid() or public.is_firebase_admin());
create policy "samples_owner_insert" on public.samples
  for insert with check (owner_uid = public.current_firebase_uid());
create policy "samples_owner_update" on public.samples
  for update using (owner_uid = public.current_firebase_uid())
  with check (owner_uid = public.current_firebase_uid());
create policy "samples_owner_or_admin_delete" on public.samples
  for delete using (owner_uid = public.current_firebase_uid() or public.is_firebase_admin());

-- sequences policies
create policy "sequences_owner_or_admin_select" on public.sequences
  for select using (owner_uid = public.current_firebase_uid() or public.is_firebase_admin());
create policy "sequences_owner_insert" on public.sequences
  for insert with check (owner_uid = public.current_firebase_uid());
create policy "sequences_owner_update" on public.sequences
  for update using (owner_uid = public.current_firebase_uid())
  with check (owner_uid = public.current_firebase_uid());
create policy "sequences_owner_or_admin_delete" on public.sequences
  for delete using (owner_uid = public.current_firebase_uid() or public.is_firebase_admin());

-- taxa_reference policies (readable by all signed-in researchers; writable by admins or owner)
create policy "taxa_reference_authenticated_select" on public.taxa_reference
  for select using (public.current_firebase_uid() is not null);
create policy "taxa_reference_admin_or_owner_insert" on public.taxa_reference
  for insert with check (public.is_firebase_admin() or owner_uid = public.current_firebase_uid());
create policy "taxa_reference_admin_or_owner_update" on public.taxa_reference
  for update using (public.is_firebase_admin() or owner_uid = public.current_firebase_uid());
create policy "taxa_reference_admin_delete" on public.taxa_reference
  for delete using (public.is_firebase_admin());

-- assignments policies
create policy "assignments_owner_or_admin_select" on public.assignments
  for select using (owner_uid = public.current_firebase_uid() or public.is_firebase_admin());
create policy "assignments_owner_insert" on public.assignments
  for insert with check (owner_uid = public.current_firebase_uid());
create policy "assignments_owner_update" on public.assignments
  for update using (owner_uid = public.current_firebase_uid())
  with check (owner_uid = public.current_firebase_uid());
create policy "assignments_owner_or_admin_delete" on public.assignments
  for delete using (owner_uid = public.current_firebase_uid() or public.is_firebase_admin());

-- diversity_metrics policies
create policy "diversity_owner_or_admin_select" on public.diversity_metrics
  for select using (owner_uid = public.current_firebase_uid() or public.is_firebase_admin());
create policy "diversity_owner_insert" on public.diversity_metrics
  for insert with check (owner_uid = public.current_firebase_uid());
create policy "diversity_owner_update" on public.diversity_metrics
  for update using (owner_uid = public.current_firebase_uid())
  with check (owner_uid = public.current_firebase_uid());
create policy "diversity_owner_or_admin_delete" on public.diversity_metrics
  for delete using (owner_uid = public.current_firebase_uid() or public.is_firebase_admin());

-- -----------------------------------------------------------------------------
-- 3. Private Storage Bucket: edna-uploads (per-user folder policies)
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit)
values ('edna-uploads', 'edna-uploads', false, 52428800)
on conflict (id) do nothing;

create policy "edna_uploads_user_read" on storage.objects
  for select using (
    bucket_id = 'edna-uploads'
    and (
      (storage.foldername(name))[1] = public.current_firebase_uid()
      or public.is_firebase_admin()
    )
  );

create policy "edna_uploads_user_insert" on storage.objects
  for insert with check (
    bucket_id = 'edna-uploads'
    and (storage.foldername(name))[1] = public.current_firebase_uid()
  );

create policy "edna_uploads_user_delete" on storage.objects
  for delete using (
    bucket_id = 'edna-uploads'
    and (
      (storage.foldername(name))[1] = public.current_firebase_uid()
      or public.is_firebase_admin()
    )
  );

-- -----------------------------------------------------------------------------
-- 4. Seed Reference Taxa (12S, 16S, 18S, COI, ITS, rbcL)
-- -----------------------------------------------------------------------------

insert into public.taxa_reference
  (owner_uid, marker_gene, kingdom, phylum, class_name, order_name, family, genus, species, common_name, habitat, accession_id, reference_sequence)
values
  ('system', '12S', 'Animalia', 'Chordata', 'Actinopterygii', 'Scorpaeniformes', 'Sebastidae', 'Sebastes', 'Sebastes mystinus', 'Blue Rockfish', 'Kelp Forest', 'NC_029245.1', 'GTCGGTAAAACTCGTGCCAGCCACCGCGGTTATACGAGAGGCCCAAGTTGATAGCCATCGGCGTAAAGAGTGGTTAGGAATTACTTTACTAAAGCCGAACGCCTTCAAAGCTGTTATACGCACCCGAAAGTAAGAAGCCCAACCACGAAAGTGGCTTTACACTCCTGAACCCACGAAAGCTAGGAAACAAACTGGGATTAGATACCCCACTATGCCT'),
  ('system', '12S', 'Animalia', 'Chordata', 'Actinopterygii', 'Clupeiformes', 'Engraulidae', 'Engraulis', 'Engraulis mordax', 'Northern Anchovy', 'Marine Coastal', 'NC_009581.1', 'GTCGGTAAAACTCGTGCCAGCCACCGCGGTTATACGAGAGACCCAAGTTGATAGACATCGGCGTAAAGGGTGGTTAGGAATTACGCAACTAAAGCCGAACACCTTCAGAGCTGTTATACGCACCCGAAGGCAGGAAGCCCAGCCACGAAAGTGGCTTTAATACCCCTGAACCCACGAAAGCTAAGAAACAAACTGGGATTAGATACCCCACTATGCTT'),
  ('system', '12S', 'Animalia', 'Chordata', 'Actinopterygii', 'Perciformes', 'Embiotocidae', 'Embiotoca', 'Embiotoca lateralis', 'Striped Seaperch', 'Kelp Forest', 'KY856912.1', 'GTCGGTAAAACTCGTGCCAGCCACCGCGGTTATACGAGAGGCTCAAGTTGACAAACATCGGCGTAAAGAGTGGTTAGGAATTACTAGACTAAAGCCAAACGCCCTCAAAGCTGTTATACGCACCCGAAAGTAGGAAGCCCAACTACGAAAGTGACTTTATACTCCTGAACCCACGAAAGCTAGGAAACAAACTGGGATTAGATACCCCACTATGCCT'),
  ('system', '12S', 'Animalia', 'Chordata', 'Actinopterygii', 'Pleuronectiformes', 'Pleuronectidae', 'Platichthys', 'Platichthys stellatus', 'Starry Flounder', 'Estuary', 'NC_022726.1', 'GTCGGTAAAACTCGTGCCAGCCACCGCGGTTATACGAGAGACTCAAGTTGATAAATGTCGGCGTAAAGAGTGGTTAGGAAATACTTTACTAAAGCCAAACACCTTCAAAGCTGTTATACGCACCCGAAGGTAGGAAGCCCGACTACGAAAGTGACTTTACTATCCTGAACCCACGAAAGCTAGGAAACAAACTGGGATTAGATACCCCACTATGCCT'),
  ('system', '12S', 'Animalia', 'Chordata', 'Actinopterygii', 'Salmoniformes', 'Salmonidae', 'Oncorhynchus', 'Oncorhynchus mykiss', 'Steelhead Trout', 'Estuary', 'NC_001717.1', 'GTCGGTAAAACTCGTGCCAGCCACCGCGGTTATACGAGAGGCCCTAGTTGATAACTACCGGCGTAAAGAGTGGTTACGGAAAAAAATCAATAAAGCCAAACGCCCTCAAGGCTGTTATACGCACCCGAAAGCAAGAAACCCAACCACGAAAGTGGCTTTAATATCCCTGAACCCACGAAAGCTAAGAAACAAACTGGGATTAGATACCCCACTATGCTT'),
  ('system', '12S', 'Animalia', 'Chordata', 'Chondrichthyes', 'Carcharhiniformes', 'Triakidae', 'Triakis', 'Triakis semifasciata', 'Leopard Shark', 'Estuary', 'NC_023521.1', 'GTCGGTAAAACTCGTGCCAGCCACCGCGGTTATACGATTAACCCAAGTTAATAGAACACGGCGTAAAGAGTGGTTAAGAAATTTACACAATAAAGTCAAACTTCCTCAAAGCTGTTATACGCACCTGAAGAAGGAAACCTAACCACGAAAGTGGCTTTACTTCCTCTGATCCCACGAAAGCTAGGAAACAAACTGGGATTAGATACCCCACTATGCCT'),
  ('system', '12S', 'Animalia', 'Chordata', 'Mammalia', 'Carnivora', 'Mustelidae', 'Enhydra', 'Enhydra lutris', 'Southern Sea Otter', 'Kelp Forest', 'NC_009692.1', 'GTCGGTAAAACTCGTGCCAGCCACCGCGGTCATACGATTAACCCAAATTAATAGGCACCGGCGTAAAGCGTGTTTAAGATTCACATTCAATAAAGTTAAACTTAACTAAGCTGTAAAAAGCCCTAGTTAAAATAAAATAAACTACGAAAGTGGCTTTAACACTTCTGAACACACGATAGCTAAGACCCAAACTGGGATTAGATACCCCACTATGCTTAGC'),
  ('system', '16S', 'Bacteria', 'Pseudomonadota', 'Alphaproteobacteria', 'Pelagibacterales', 'Pelagibacteraceae', 'Pelagibacter', 'Pelagibacter ubique', 'SAR11 Marine Bacterium', 'Marine Coastal', 'CP000084.1', 'GTGCCAGCMGCCGCGGTAATACGGAGGGTGCAAGCGTTAATCGGAATTACTGGGCGTAAAGCGCACGCAGGCGGTTTGTTAAGTCAGATGTGAAATCCCCGGGCTCAACCTGGGAACTGCATCTGATACTGGCAAGCTTGAGTCTCGTAGAGGGGGGTAGAATTCCAGGTGTAGCGGTGAAATGCGTAGAGATCTGGAGGAATACCGGTGGCGAAGGCGG'),
  ('system', 'COI', 'Animalia', 'Echinodermata', 'Echinoidea', 'Camarodonta', 'Strongylocentrotidae', 'Strongylocentrotus', 'Strongylocentrotus purpuratus', 'Purple Sea Urchin', 'Kelp Forest', 'NC_001453.1', 'GGTCAACAAATCATAAAGATATTGGAACCTTATATTTTATTTTTGGAGCATGAGCAGGAATGGTAGGAACAGCTTTAAGTCTACTAATTCGTGCTGAACTAGGTCAACCTGGTTCTTTAATTGGAGATGATCAAATTTATAATGTAATTGTTACTGCTCATGCATTTGTTATAATTTTTTTTATAGTTATACCTATTATAATTGGAGGATTTGGAAATTG'),
  ('system', 'COI', 'Animalia', 'Mollusca', 'Bivalvia', 'Mytilida', 'Mytilidae', 'Mytilus', 'Mytilus californianus', 'California Mussel', 'Marine Coastal', 'JX486124.1', 'GGTCAACAAATCATAAAGATATTGGTACTTTATATTTTCTTTTTGGTATTTGAGCAGGTATAGTAGGTACATCAATAAGTATAGTAATTCGTCTAGAATTAGGGCAACCTGGTTCTTTTTTAGGAAATGATCAACTTTATAATGTAGTTGTAACAGCTCATGCTTTTGTAATAATTTTTTTTATAGTTATACCAATTATAATTGGTGGTTTTGGTAATTG'),
  ('system', '18S', 'Chromista', 'Ochrophyta', 'Phaeophyceae', 'Laminariales', 'Laminariaceae', 'Macrocystis', 'Macrocystis pyrifera', 'Giant Kelp', 'Kelp Forest', 'AB013012.1', 'CGGTAATTCCAGCTCCAATAGCGTATATTAAAGTTGTTGCAGTTAAAAAGCTCGTAGTTGGATTTCGGGGTGGGCCGGCCGGTCCGCCGTTGGTGCGCACTGGCCGGCCTCCTTCTCGTTGGGACGCTGGTCCGGCCGCTTTGGTGACTCTGGATAACTTTGGGTCGATCGCACGGCCTTGTGCCGGCGACGTTTCATTCAAATATCTGCCCTATCAAC'),
  ('system', 'ITS', 'Fungi', 'Ascomycota', 'Sordariomycetes', 'Hypocreales', 'Nectriaceae', 'Fusarium', 'Fusarium oxysporum', 'Estuarine Sediment Fungus', 'Wetland', 'MT560378.1', 'CTTGGTCATTTAGAGGAAGTAAAAGTCGTAACAAGGTCTCCGTTGGTGAACCAGCGGAGGGATCATTACCGAGTTTACAACTCCCAAACCCCTGTGAACATACCACTTGTTGCCTCGGCGGATCAGCCCGCTCCCGGTAAAACGGGACGGCCCGCCAGAGGACCCCTAAACTCTGTTTCTATATGTAACTTCTGAGTAAAACCATAAATAAATCAAAAC'),
  ('system', 'rbcL', 'Plantae', 'Tracheophyta', 'Liliopsida', 'Alismatales', 'Zosteraceae', 'Zostera', 'Zostera marina', 'Common Eelgrass', 'Estuary', 'AB125354.1', 'ATGTCACCACAAACAGAGACTAAAGCAAGTGTTGGATTCAAAGCTGGTGTTAAAGATTATAAATTGACTTATTATACTCCTGAGTATGAAACCAAAGATACTGATATCTTGGCAGCATTCCGAGTAACTCCTCAACCTGGAGTTCCACCTGAAGAAGCAGGGGCTGCGGTAGCTGCTGAATCTTCTACTGGTACATGGACAACTGTGTGGACCGATGG')
on conflict (accession_id) do nothing;

-- -----------------------------------------------------------------------------
-- 5. Seed Demo Dataset (Pacific Kelp & Estuary 12S Survey)
-- Replace 'demo-researcher-01' with your Firebase UID to own the demo rows.
-- -----------------------------------------------------------------------------

with inserted_sample as (
  insert into public.samples
    (project_id, owner_uid, site_name, latitude, longitude, depth_meters, collection_date, habitat, marker_gene, file_name, file_size_bytes, read_count)
  values
    ('proj-monterey-12s', 'demo-researcher-01', 'Point Lobos Kelp Canopy', 36.5214, -121.9472, 12.5, '2026-10-15', 'Kelp Forest', '12S', 'pt_lobos_12s_r1.fastq', 1450000, 1420)
  returning id
),
inserted_seq as (
  insert into public.sequences
    (project_id, sample_id, owner_uid, header, sequence, seq_length, mean_phred, abundance, is_chimera, cluster_id, clustering_mode)
  select
    'proj-monterey-12s',
    id,
    'demo-researcher-01',
    'PTL_001_Sebastes',
    'GTCGGTAAAACTCGTGCCAGCCACCGCGGTTATACGAGAGGCCCAAGTTGATAGCCATCGGCGTAAAGAGTGGTTAGGAATTACTTTACTAAAGCCGAACGCCTTCAAAGCTGTTATACGCACCCGAAAGTAAGAAGCCCAACCACGAAAGTGGCTTTACACTCCTGAACCCACGAAAGCTAGGAAACAAACTGGGATTAGATACCCCACTATGCCT',
    218,
    36.4,
    420,
    false,
    'OTU_001',
    'otu_97'
  from inserted_sample
  returning id, sample_id
)
insert into public.assignments
  (project_id, sample_id, sequence_id, owner_uid, cluster_id, abundance, kingdom, phylum, class_name, order_name, family, genus, species, percent_identity, confidence, status, classifier_used, reference_accession)
select
  'proj-monterey-12s',
  sample_id,
  id,
  'demo-researcher-01',
  'OTU_001',
  420,
  'Animalia',
  'Chordata',
  'Actinopterygii',
  'Scorpaeniformes',
  'Sebastidae',
  'Sebastes',
  'Sebastes mystinus',
  100.00,
  0.99,
  'Assigned',
  'demo_kmer',
  'NC_029245.1'
from inserted_seq;
