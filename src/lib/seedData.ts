import type {
  AnnouncementBanner,
  AuditLogEntry,
  JobRecord,
  ProjectRecord,
  SampleMetadata,
  TaxonReference,
  UserProfile,
} from '../types/edna';

/**
 * Deterministic curated reference sequences for k-mer taxonomy matching across
 * 12S, 16S, 18S, COI, ITS, and rbcL markers.
 */
export const SEED_TAXA_REFERENCE: TaxonReference[] = [
  // 12S Vertebrate / Marine Fish eDNA (MiFish)
  {
    id: 'ref-12s-01',
    markerGene: '12S',
    kingdom: 'Animalia',
    phylum: 'Chordata',
    className: 'Actinopterygii',
    orderName: 'Scorpaeniformes',
    family: 'Sebastidae',
    genus: 'Sebastes',
    species: 'Sebastes mystinus',
    commonName: 'Blue Rockfish',
    habitat: 'Kelp Forest',
    accessionId: 'NC_029245.1',
    referenceSequence:
      'GTCGGTAAAACTCGTGCCAGCCACCGCGGTTATACGAGAGGCCCAAGTTGATAGCCATCGGCGTAAAGAGTGGTTAGGAATTACTTTACTAAAGCCGAACGCCTTCAAAGCTGTTATACGCACCCGAAAGTAAGAAGCCCAACCACGAAAGTGGCTTTACACTCCTGAACCCACGAAAGCTAGGAAACAAACTGGGATTAGATACCCCACTATGCCT',
  },
  {
    id: 'ref-12s-02',
    markerGene: '12S',
    kingdom: 'Animalia',
    phylum: 'Chordata',
    className: 'Actinopterygii',
    orderName: 'Clupeiformes',
    family: 'Engraulidae',
    genus: 'Engraulis',
    species: 'Engraulis mordax',
    commonName: 'Northern Anchovy',
    habitat: 'Marine Coastal',
    accessionId: 'NC_009581.1',
    referenceSequence:
      'GTCGGTAAAACTCGTGCCAGCCACCGCGGTTATACGAGAGACCCAAGTTGATAGACATCGGCGTAAAGGGTGGTTAGGAATTACGCAACTAAAGCCGAACACCTTCAGAGCTGTTATACGCACCCGAAGGCAGGAAGCCCAGCCACGAAAGTGGCTTTAATACCCCTGAACCCACGAAAGCTAAGAAACAAACTGGGATTAGATACCCCACTATGCTT',
  },
  {
    id: 'ref-12s-03',
    markerGene: '12S',
    kingdom: 'Animalia',
    phylum: 'Chordata',
    className: 'Actinopterygii',
    orderName: 'Perciformes',
    family: 'Embiotocidae',
    genus: 'Embiotoca',
    species: 'Embiotoca lateralis',
    commonName: 'Striped Seaperch',
    habitat: 'Kelp Forest',
    accessionId: 'KY856912.1',
    referenceSequence:
      'GTCGGTAAAACTCGTGCCAGCCACCGCGGTTATACGAGAGGCTCAAGTTGACAAACATCGGCGTAAAGAGTGGTTAGGAATTACTAGACTAAAGCCAAACGCCCTCAAAGCTGTTATACGCACCCGAAAGTAGGAAGCCCAACTACGAAAGTGACTTTATACTCCTGAACCCACGAAAGCTAGGAAACAAACTGGGATTAGATACCCCACTATGCCT',
  },
  {
    id: 'ref-12s-04',
    markerGene: '12S',
    kingdom: 'Animalia',
    phylum: 'Chordata',
    className: 'Actinopterygii',
    orderName: 'Pleuronectiformes',
    family: 'Pleuronectidae',
    genus: 'Platichthys',
    species: 'Platichthys stellatus',
    commonName: 'Starry Flounder',
    habitat: 'Estuary',
    accessionId: 'NC_022726.1',
    referenceSequence:
      'GTCGGTAAAACTCGTGCCAGCCACCGCGGTTATACGAGAGACTCAAGTTGATAAATGTCGGCGTAAAGAGTGGTTAGGAAATACTTTACTAAAGCCAAACACCTTCAAAGCTGTTATACGCACCCGAAGGTAGGAAGCCCGACTACGAAAGTGACTTTACTATCCTGAACCCACGAAAGCTAGGAAACAAACTGGGATTAGATACCCCACTATGCCT',
  },
  {
    id: 'ref-12s-05',
    markerGene: '12S',
    kingdom: 'Animalia',
    phylum: 'Chordata',
    className: 'Actinopterygii',
    orderName: 'Salmoniformes',
    family: 'Salmonidae',
    genus: 'Oncorhynchus',
    species: 'Oncorhynchus mykiss',
    commonName: 'Steelhead Trout',
    habitat: 'Estuary',
    accessionId: 'NC_001717.1',
    referenceSequence:
      'GTCGGTAAAACTCGTGCCAGCCACCGCGGTTATACGAGAGGCCCTAGTTGATAACTACCGGCGTAAAGAGTGGTTACGGAAAAAAATCAATAAAGCCAAACGCCCTCAAGGCTGTTATACGCACCCGAAAGCAAGAAACCCAACCACGAAAGTGGCTTTAATATCCCTGAACCCACGAAAGCTAAGAAACAAACTGGGATTAGATACCCCACTATGCTT',
  },
  {
    id: 'ref-12s-06',
    markerGene: '12S',
    kingdom: 'Animalia',
    phylum: 'Chordata',
    className: 'Chondrichthyes',
    orderName: 'Carcharhiniformes',
    family: 'Triakidae',
    genus: 'Triakis',
    species: 'Triakis semifasciata',
    commonName: 'Leopard Shark',
    habitat: 'Estuary',
    accessionId: 'NC_023521.1',
    referenceSequence:
      'GTCGGTAAAACTCGTGCCAGCCACCGCGGTTATACGATTAACCCAAGTTAATAGAACACGGCGTAAAGAGTGGTTAAGAAATTTACACAATAAAGTCAAACTTCCTCAAAGCTGTTATACGCACCTGAAGAAGGAAACCTAACCACGAAAGTGGCTTTACTTCCTCTGATCCCACGAAAGCTAGGAAACAAACTGGGATTAGATACCCCACTATGCCT',
  },
  {
    id: 'ref-12s-07',
    markerGene: '12S',
    kingdom: 'Animalia',
    phylum: 'Chordata',
    className: 'Mammalia',
    orderName: 'Carnivora',
    family: 'Mustelidae',
    genus: 'Enhydra',
    species: 'Enhydra lutris',
    commonName: 'Southern Sea Otter',
    habitat: 'Kelp Forest',
    accessionId: 'NC_009692.1',
    referenceSequence:
      'GTCGGTAAAACTCGTGCCAGCCACCGCGGTCATACGATTAACCCAAATTAATAGGCACCGGCGTAAAGCGTGTTTAAGATTCACATTCAATAAAGTTAAACTTAACTAAGCTGTAAAAAGCCCTAGTTAAAATAAAATAAACTACGAAAGTGGCTTTAACACTTCTGAACACACGATAGCTAAGACCCAAACTGGGATTAGATACCCCACTATGCTTAGC',
  },
  {
    id: 'ref-12s-08',
    markerGene: '12S',
    kingdom: 'Animalia',
    phylum: 'Chordata',
    className: 'Actinopterygii',
    orderName: 'Atheriniformes',
    family: 'Atherinopsidae',
    genus: 'Atherinops',
    species: 'Atherinops affinis',
    commonName: 'Topsmelt Silverside',
    habitat: 'Estuary',
    accessionId: 'MH428815.1',
    referenceSequence:
      'GTCGGTAAAACTCGTGCCAGCCACCGCGGTTATACGAGAGACTCAAGTTGATAGGCACCGGCGTAAAGAGTGGTTAGGAACCACCTTACTAAAGCCAAACGCCCTCAGAGCTGTTATACGCACCCGAAAGTAGGAAGCCCGACCACGAAAGTGGCTTTAACATCCTGAACCCACGAAAGCTAGGAAACAAACTGGGATTAGATACCCCACTATGCCTAG',
  },
  {
    id: 'ref-12s-09',
    markerGene: '12S',
    kingdom: 'Animalia',
    phylum: 'Chordata',
    className: 'Actinopterygii',
    orderName: 'Scorpaeniformes',
    family: 'Hexagrammidae',
    genus: 'Ophiodon',
    species: 'Ophiodon elongatus',
    commonName: 'Lingcod',
    habitat: 'Marine Coastal',
    accessionId: 'NC_028287.1',
    referenceSequence:
      'GTCGGTAAAACTCGTGCCAGCCACCGCGGTTATACGAGAGGCCCAAGTTGATAAACATCGGCGTAAAGAGTGGTTAGGAATTACTTTAATAAAGCCGAACGCCTTCAAAGCTGTTATACGCACCCGAAAGTAGGAAGCCCAACTACGAAAGTGGCTTTACACTCCTGAACCCACGAAAGCTAGGAAACAAACTGGGATTAGATACCCCACTATGCCTAC',
  },
  {
    id: 'ref-12s-10',
    markerGene: '12S',
    kingdom: 'Animalia',
    phylum: 'Chordata',
    className: 'Actinopterygii',
    orderName: 'Perciformes',
    family: 'Labridae',
    genus: 'Oxyjulis',
    species: 'Oxyjulis californica',
    commonName: 'Senorita Wrasse',
    habitat: 'Kelp Forest',
    accessionId: 'KJ768214.1',
    referenceSequence:
      'GTCGGTAAAACTCGTGCCAGCCACCGCGGTTATACGAGAGGCTCAAGTTGACAAATGTCGGCGTAAAGAGTGGTTAGGAACTACCTTACTAAAGCCAAACGCCCTCAAAGCTGTTATACGCACCCGAAAGTAGGAAGCCCAACTACGAAAGTGGCTTTACCATCCTGAACCCACGAAAGCTAGGAAACAAACTGGGATTAGATACCCCACTATGCCTAT',
  },

  // 16S Bacterial / Microbial Markers
  {
    id: 'ref-16s-01',
    markerGene: '16S',
    kingdom: 'Bacteria',
    phylum: 'Pseudomonadota',
    className: 'Alphaproteobacteria',
    orderName: 'Pelagibacterales',
    family: 'Pelagibacteraceae',
    genus: 'Pelagibacter',
    species: 'Pelagibacter ubique',
    commonName: 'SAR11 Marine Bacterium',
    habitat: 'Marine Coastal',
    accessionId: 'CP000084.1',
    referenceSequence:
      'GTGCCAGCMGCCGCGGTAATACGGAGGGTGCAAGCGTTAATCGGAATTACTGGGCGTAAAGCGCACGCAGGCGGTTTGTTAAGTCAGATGTGAAATCCCCGGGCTCAACCTGGGAACTGCATCTGATACTGGCAAGCTTGAGTCTCGTAGAGGGGGGTAGAATTCCAGGTGTAGCGGTGAAATGCGTAGAGATCTGGAGGAATACCGGTGGCGAAGGCGG',
  },
  {
    id: 'ref-16s-02',
    markerGene: '16S',
    kingdom: 'Bacteria',
    phylum: 'Cyanobacteria',
    className: 'Cyanophyceae',
    orderName: 'Synechococcales',
    family: 'Synechococcaceae',
    genus: 'Synechococcus',
    species: 'Synechococcus elongatus',
    commonName: 'Marine Picocyanobacterium',
    habitat: 'Marine Coastal',
    accessionId: 'CP000100.1',
    referenceSequence:
      'GTGCCAGCAGCCGCGGTAATACGGGAGGGGCAAGCGTTATCCGGAATTATTGGGCGTAAAGCGTCCGCAGGTGGTCAGCCAAGTCTGCTGTCAAAGCTCAAGGCTCAACCTTGGATCGGCAGTGGAAACTGGCTGACTTGAGTGCAGTAGGGGCAGAGGGAATTCCCGGTGTAGCGGTGAAATGCGTAGAGATCGGGAAGAACACCGGTGGCGAAAGCG',
  },
  {
    id: 'ref-16s-03',
    markerGene: '16S',
    kingdom: 'Bacteria',
    phylum: 'Bacteroidota',
    className: 'Flavobacteriia',
    orderName: 'Flavobacteriales',
    family: 'Flavobacteriaceae',
    genus: 'Polaribacter',
    species: 'Polaribacter irgensii',
    commonName: 'Marine Flavobacterium',
    habitat: 'Kelp Forest',
    accessionId: 'NR_025870.1',
    referenceSequence:
      'GTGCCAGCAGCCGCGGTAATACGGAGGATCCGAGCGTTATCCGGATTTATTGGGTTTAAAGGGAGCGTAGGCGGATTGTTAAGTCAGCTGTGAAAGTTTGCGGCTCAACCGTAAAATTGCAGTTGATACTGGCAATCTTGAGTGCAGTAGAGGTGGGCGGAATTCGTGGTGTAGCGGTGAAATGCTTAGATATCACGAAGAACTCCGATTGCGAAGGCAG',
  },
  {
    id: 'ref-16s-04',
    markerGene: '16S',
    kingdom: 'Bacteria',
    phylum: 'Pseudomonadota',
    className: 'Gammaproteobacteria',
    orderName: 'Vibrionales',
    family: 'Vibrionaceae',
    genus: 'Vibrio',
    species: 'Vibrio fischeri',
    commonName: 'Bioluminescent Vibrio',
    habitat: 'Estuary',
    accessionId: 'CP000020.2',
    referenceSequence:
      'GTGCCAGCAGCCGCGGTAATACGGAGGGTGCGAGCGTTAATCGGAATTACTGGGCGTAAAGCGCATGCAGGTGGTTCGTTAAGTCAGATGTGAAAGCCCGGGGCTCAACCTCGGAACTGCATTTGAAACTGGCGAGCTAGAGTACTGTAGAGGGGGGTAGAATTTCAGGTGTAGCGGTGAAATGCGTAGAGATCTGAAGGAATACCGGTGGCGAAGGCG',
  },

  // COI Marine & Freshwater Invertebrates
  {
    id: 'ref-coi-01',
    markerGene: 'COI',
    kingdom: 'Animalia',
    phylum: 'Echinodermata',
    className: 'Echinoidea',
    orderName: 'Camarodonta',
    family: 'Strongylocentrotidae',
    genus: 'Strongylocentrotus',
    species: 'Strongylocentrotus purpuratus',
    commonName: 'Purple Sea Urchin',
    habitat: 'Kelp Forest',
    accessionId: 'NC_001453.1',
    referenceSequence:
      'GGTCAACAAATCATAAAGATATTGGAACCTTATATTTTATTTTTGGAGCATGAGCAGGAATGGTAGGAACAGCTTTAAGTCTACTAATTCGTGCTGAACTAGGTCAACCTGGTTCTTTAATTGGAGATGATCAAATTTATAATGTAATTGTTACTGCTCATGCATTTGTTATAATTTTTTTTATAGTTATACCTATTATAATTGGAGGATTTGGAAATTG',
  },
  {
    id: 'ref-coi-02',
    markerGene: 'COI',
    kingdom: 'Animalia',
    phylum: 'Mollusca',
    className: 'Bivalvia',
    orderName: 'Mytilida',
    family: 'Mytilidae',
    genus: 'Mytilus',
    species: 'Mytilus californianus',
    commonName: 'California Mussel',
    habitat: 'Marine Coastal',
    accessionId: 'JX486124.1',
    referenceSequence:
      'GGTCAACAAATCATAAAGATATTGGTACTTTATATTTTCTTTTTGGTATTTGAGCAGGTATAGTAGGTACATCAATAAGTATAGTAATTCGTCTAGAATTAGGGCAACCTGGTTCTTTTTTAGGAAATGATCAACTTTATAATGTAGTTGTAACAGCTCATGCTTTTGTAATAATTTTTTTTATAGTTATACCAATTATAATTGGTGGTTTTGGTAATTG',
  },
  {
    id: 'ref-coi-03',
    markerGene: 'COI',
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    className: 'Malacostraca',
    orderName: 'Decapoda',
    family: 'Cancridae',
    genus: 'Metacarcinus',
    species: 'Metacarcinus magister',
    commonName: 'Dungeness Crab',
    habitat: 'Estuary',
    accessionId: 'MK035812.1',
    referenceSequence:
      'GGTCAACAAATCATAAAGATATTGGAACTTTATATTTCATTTTTGGAGCATGAGCTGGAATGGTAGGGACTTCTCTAAGTTTATTAATTCGAGCTGAATTAGGACAACCAGGTACTTTATTAGGAGATGATCAAATTTATAATGTTGTAGTAACTGCCCATGCTTTTGTGATAATTTTCTTTATAGTAATACCTATTATAATCGGAGGATTTGGAAACTG',
  },
  {
    id: 'ref-coi-04',
    markerGene: 'COI',
    kingdom: 'Animalia',
    phylum: 'Cnidaria',
    className: 'Anthozoa',
    orderName: 'Actiniaria',
    family: 'Actiniidae',
    genus: 'Anthopleura',
    species: 'Anthopleura xanthogrammica',
    commonName: 'Giant Green Anemone',
    habitat: 'Marine Coastal',
    accessionId: 'GQ849102.1',
    referenceSequence:
      'GGTCAACAAATCATAAAGATATTGGGACCTTATATTTAGTATTTGGAATTTGAGCAGGAATAGTAGGTACAGCAATAAGCATGATAATTCGGGTAGAATTAGGCCAACCTGGAAGTTTAATTGGGGATGATCAGTTGTATAATGTAATAGTAACGGCTCATGCTTTTATTATAATTTTTTTTATGGTTATGCCAGTTATGATTGGAGGATTTGGAAATTG',
  },

  // 18S Eukaryotic Plankton / Protists
  {
    id: 'ref-18s-01',
    markerGene: '18S',
    kingdom: 'Chromista',
    phylum: 'Ochrophyta',
    className: 'Phaeophyceae',
    orderName: 'Laminariales',
    family: 'Laminariaceae',
    genus: 'Macrocystis',
    species: 'Macrocystis pyrifera',
    commonName: 'Giant Kelp',
    habitat: 'Kelp Forest',
    accessionId: 'AB013012.1',
    referenceSequence:
      'CGGTAATTCCAGCTCCAATAGCGTATATTAAAGTTGTTGCAGTTAAAAAGCTCGTAGTTGGATTTCGGGGTGGGCCGGCCGGTCCGCCGTTGGTGCGCACTGGCCGGCCTCCTTCTCGTTGGGACGCTGGTCCGGCCGCTTTGGTGACTCTGGATAACTTTGGGTCGATCGCACGGCCTTGTGCCGGCGACGTTTCATTCAAATATCTGCCCTATCAAC',
  },
  {
    id: 'ref-18s-02',
    markerGene: '18S',
    kingdom: 'Chromista',
    phylum: 'Bacillariophyta',
    className: 'Bacillariophyceae',
    orderName: 'Bacillariales',
    family: 'Bacillariaceae',
    genus: 'Pseudo-nitzschia',
    species: 'Pseudo-nitzschia australis',
    commonName: 'Marine Diatom',
    habitat: 'Marine Coastal',
    accessionId: 'U18241.1',
    referenceSequence:
      'CGGTAATTCCAGCTCCAATAGCGTATATTAAAGTTGTTGCAGTTAAAAAGCTCGTAGTTGGATTTCGGGGCGGGTCGGCCGGTCCGCCGTTGGTGTGTACTGGTCGGCCCGCTTCTCATGGGGACGCTGGCCCTACTGCTTTGGTGACTCTGGATAACCTCAGGCCGATCGCATGGCCTAGCGCCGGCGACGTTTCATTCAAATTTCTGCCCTATCAAC',
  },

  // ITS Fungi
  {
    id: 'ref-its-01',
    markerGene: 'ITS',
    kingdom: 'Fungi',
    phylum: 'Ascomycota',
    className: 'Sordariomycetes',
    orderName: 'Hypocreales',
    family: 'Nectriaceae',
    genus: 'Fusarium',
    species: 'Fusarium oxysporum',
    commonName: 'Estuarine Sediment Fungus',
    habitat: 'Wetland',
    accessionId: 'MT560378.1',
    referenceSequence:
      'CTTGGTCATTTAGAGGAAGTAAAAGTCGTAACAAGGTCTCCGTTGGTGAACCAGCGGAGGGATCATTACCGAGTTTACAACTCCCAAACCCCTGTGAACATACCACTTGTTGCCTCGGCGGATCAGCCCGCTCCCGGTAAAACGGGACGGCCCGCCAGAGGACCCCTAAACTCTGTTTCTATATGTAACTTCTGAGTAAAACCATAAATAAATCAAAAC',
  },
  {
    id: 'ref-its-02',
    markerGene: 'ITS',
    kingdom: 'Fungi',
    phylum: 'Basidiomycota',
    className: 'Agaricomycetes',
    orderName: 'Agaricales',
    family: 'Tricholomataceae',
    genus: 'Laccaria',
    species: 'Laccaria bicolor',
    commonName: 'Ectomycorrhizal Fungus',
    habitat: 'Soil / Terrestrial',
    accessionId: 'NR_119555.1',
    referenceSequence:
      'CTTGGTCATTTAGAGGAAGTAAAAGTCGTAACAAGGTTTCCGTAGGTGAACCTGCGGAAGGATCATTAATGAATAAACTTGAGTTGTTGCTGGCTCTCTAGGGAGCATGTGCACGCTTGTTGTCTTTATCTCTCCACCTGTGCACCTTTTGTAGACCTGGATCCTCTCTTCGGAAGGAGGACCCGATTGGCTTTGGTGTTGAGGTTGCCTCTTCAGCG',
  },

  // rbcL Aquatic Plants & Macroalgae
  {
    id: 'ref-rbcl-01',
    markerGene: 'rbcL',
    kingdom: 'Plantae',
    phylum: 'Tracheophyta',
    className: 'Liliopsida',
    orderName: 'Alismatales',
    family: 'Zosteraceae',
    genus: 'Zostera',
    species: 'Zostera marina',
    commonName: 'Common Eelgrass',
    habitat: 'Estuary',
    accessionId: 'AB125354.1',
    referenceSequence:
      'ATGTCACCACAAACAGAGACTAAAGCAAGTGTTGGATTCAAAGCTGGTGTTAAAGATTATAAATTGACTTATTATACTCCTGAGTATGAAACCAAAGATACTGATATCTTGGCAGCATTCCGAGTAACTCCTCAACCTGGAGTTCCACCTGAAGAAGCAGGGGCTGCGGTAGCTGCTGAATCTTCTACTGGTACATGGACAACTGTGTGGACCGATGG',
  },
  {
    id: 'ref-rbcl-02',
    markerGene: 'rbcL',
    kingdom: 'Plantae',
    phylum: 'Chlorophyta',
    className: 'Ulvophyceae',
    orderName: 'Ulvales',
    family: 'Ulvaceae',
    genus: 'Ulva',
    species: 'Ulva lactuca',
    commonName: 'Sea Lettuce',
    habitat: 'Marine Coastal',
    accessionId: 'EF110299.1',
    referenceSequence:
      'ATGTCACCACAAACAGAGACTAAAGCAGGTGCTGGATTCAAAGCAGGTGTTAAAGACTACAGATTAACATATTACACTCCAGACTACGTAGTAAAAGACACTGATATTTTAGCAGCTTTCAGAATGACACCACAACCTGGTGTTCCACCAGAAGAAGCTGGTGCAGCTGTTGCTGCTGAATCTTCAACTGGTACATGGACAACAGTTTGGACTGATGG',
  },
];

// Deterministic mutation helper to create realistic eDNA reads (exact matches, low-confidence variants, novel taxa)
function mutateSequence(seq: string, substitutions: number, seed: number): string {
  const bases = ['A', 'C', 'G', 'T'];
  const chars = seq.split('');
  let s = seed;
  for (let i = 0; i < substitutions; i++) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const pos = 12 + (s % (chars.length - 24));
    const current = chars[pos];
    const nextIdx = (bases.indexOf(current) + 1 + (s % 3)) % 4;
    chars[pos] = bases[nextIdx];
  }
  return chars.join('');
}

export const DEMO_USERS: UserProfile[] = [
  {
    uid: 'demo-researcher-01',
    name: 'Dr. Maya Lin-Vargas',
    email: 'maya.vargas@montereybio.org',
    institution: 'Monterey Coastal Genomics Lab',
    profession: 'Ecologist',
    role: 'user',
    country: 'United States',
    createdAt: '2026-09-12T14:20:00Z',
    disabled: false,
    emailVerified: true,
  },
  {
    uid: 'demo-user-02',
    name: 'Dr. Henrik Solberg',
    email: 'h.solberg@nordicmarine.no',
    institution: 'Bergen Marine Institute',
    profession: 'Bioinformatician',
    role: 'user',
    country: 'Norway',
    createdAt: '2026-10-03T09:15:00Z',
    disabled: false,
    emailVerified: true,
  },
  {
    uid: 'demo-user-03',
    name: 'Amina Osei',
    email: 'a.osei@capeestuary.ac.za',
    institution: 'University of Cape Town',
    profession: 'Student',
    role: 'user',
    country: 'South Africa',
    createdAt: '2026-10-21T16:40:00Z',
    disabled: false,
    emailVerified: true,
  },
  {
    uid: 'demo-admin-01',
    name: 'Dr. Julian Chen',
    email: 'admin@taxatrace.org',
    institution: 'TaxaTrace Core Governance',
    profession: 'Bioinformatician',
    role: 'admin',
    country: 'United States',
    createdAt: '2026-08-01T08:00:00Z',
    disabled: false,
    emailVerified: true,
  },
];

export const DEMO_PROJECTS: ProjectRecord[] = [
  {
    id: 'proj-monterey-12s',
    ownerUid: 'demo-researcher-01',
    ownerName: 'Dr. Maya Lin-Vargas',
    name: 'Pacific Kelp & Estuary 12S Vertebrate Survey',
    description:
      'Autumn metabarcoding transect across Monterey Bay kelp forests, Elkhorn Slough estuary, and Big Sur rocky reefs using MiFish-U 12S primers.',
    markerGene: '12S',
    status: 'completed',
    createdAt: '2026-10-14T11:30:00Z',
    updatedAt: '2026-11-18T15:10:00Z',
    storageBytes: 4_820_410,
  },
  {
    id: 'proj-intertidal-coi',
    ownerUid: 'demo-researcher-01',
    ownerName: 'Dr. Maya Lin-Vargas',
    name: 'Rocky Intertidal Invertebrate COI Baseline',
    description:
      'Benthic eDNA filter replicates profiling echinoderms, bivalves, crustaceans, and cryptic invertebrates along upwelling zones.',
    markerGene: 'COI',
    status: 'completed',
    createdAt: '2026-11-02T09:45:00Z',
    updatedAt: '2026-11-19T10:22:00Z',
    storageBytes: 2_310_920,
  },
];

export const DEMO_SAMPLES: SampleMetadata[] = [
  {
    id: 'smp-pt-lobos',
    projectId: 'proj-monterey-12s',
    ownerUid: 'demo-researcher-01',
    siteName: 'Point Lobos Kelp Canopy',
    latitude: 36.5214,
    longitude: -121.9472,
    depthMeters: 12.5,
    collectionDate: '2026-10-15',
    habitat: 'Kelp Forest',
    markerGene: '12S',
    fileName: 'pt_lobos_12s_r1.fastq',
    fileSizeBytes: 1_450_000,
    readCount: 1420,
  },
  {
    id: 'smp-elkhorn',
    projectId: 'proj-monterey-12s',
    ownerUid: 'demo-researcher-01',
    siteName: 'Elkhorn Slough Tidal Channel',
    latitude: 36.8124,
    longitude: -121.7518,
    depthMeters: 3.2,
    collectionDate: '2026-10-16',
    habitat: 'Estuary',
    markerGene: '12S',
    fileName: 'elkhorn_slough_12s.fastq',
    fileSizeBytes: 1_210_000,
    readCount: 1285,
  },
  {
    id: 'smp-pacific-grove',
    projectId: 'proj-monterey-12s',
    ownerUid: 'demo-researcher-01',
    siteName: 'Hopkins Marine Reserve Shelf',
    latitude: 36.6219,
    longitude: -121.9044,
    depthMeters: 18.0,
    collectionDate: '2026-10-17',
    habitat: 'Marine Coastal',
    markerGene: '12S',
    fileName: 'hopkins_shelf_12s.fastq',
    fileSizeBytes: 1_190_000,
    readCount: 1190,
  },
  {
    id: 'smp-big-sur',
    projectId: 'proj-monterey-12s',
    ownerUid: 'demo-researcher-01',
    siteName: 'Big Sur Deep Upwelling Canyon',
    latitude: 36.2704,
    longitude: -121.8491,
    depthMeters: 42.0,
    collectionDate: '2026-10-18',
    habitat: 'Deep Sea',
    markerGene: '12S',
    fileName: 'big_sur_canyon_12s.fastq',
    fileSizeBytes: 970_410,
    readCount: 980,
  },
  {
    id: 'smp-carmel-coi',
    projectId: 'proj-intertidal-coi',
    ownerUid: 'demo-researcher-01',
    siteName: 'Carmel Bay Intertidal Pool',
    latitude: 36.5552,
    longitude: -121.9331,
    depthMeters: 1.5,
    collectionDate: '2026-11-04',
    habitat: 'Marine Coastal',
    markerGene: 'COI',
    fileName: 'carmel_coi_otus.csv',
    fileSizeBytes: 1_155_000,
    readCount: 840,
  },
  {
    id: 'smp-moss-coi',
    projectId: 'proj-intertidal-coi',
    ownerUid: 'demo-researcher-01',
    siteName: 'Moss Landing Mudflat',
    latitude: 36.8041,
    longitude: -121.7869,
    depthMeters: 2.1,
    collectionDate: '2026-11-05',
    habitat: 'Estuary',
    markerGene: 'COI',
    fileName: 'moss_landing_coi.csv',
    fileSizeBytes: 1_155_920,
    readCount: 790,
  },
];

export interface SeedRawSampleBundle {
  sampleId: string;
  projectId: string;
  reads: Array<{ header: string; sequence: string; abundance: number; meanPhred: number }>;
}

const r12 = (idx: number) => SEED_TAXA_REFERENCE[idx].referenceSequence;
const rCoi = (idx: number) => SEED_TAXA_REFERENCE[14 + idx].referenceSequence;

// Divergent unknown/novel eDNA sequences (not matching reference DB closely)
const NOVEL_SEQ_1 =
  'GTCGGTAAAACTAGTGCGACTAGTCATACGCTAGTCATGCATCGGCTAGTCATGCTGATCGTACGTAGCTAGTCCAGTACTGACGTAGCTAGCTGATCGATCGATGCTAGCTGATCGTAGCTAGTCATGCTAGCTGATCGTAGCTAGCTAGTCGATCGATGCTAGCTAGTCGATCGATGCTAGCTGATCGTAGCTAGCTGATCGATGCTAGCTGATCG';
const NOVEL_SEQ_2 =
  'GTCGGTAAAACTCATGCTTAGCTAGTCGATCGTAGCTGCTAGTCAGTCTAGTCGATGCTACGTACGTACGTTAGCTAGTCATCGATGCTAGTCGATCATGCTACGTAGCTAGCTAGCATGCTAGTCGATCGTAGCTAGCATGCTAGTCGATGCTAGTCAGTCGTACGATCGTAGCTGATCGATGCTACGTAGCTGATCGTAGCTGATCGATGCTAGTCG';
const NOVEL_SEQ_3 =
  'GGTCAACAAATCGTAGCTAGTCGTACGATGCTAGTCGATCATGCTACGTCGATCGTAGCTAGCATCGATCGTAGCTAGTCAGTCGATGCTACGTAGCTAGTCGATGCTACGTAGTCAGTCGATCGTAGCTAGCATGCTAGTCAGTCGATGCTACGTAGCTAGTCGATGCTACGTAGCTAGTCGATGCTAGTCGATCGTAGCTAGCATGCTAGTCGATC';

export const DEMO_RAW_BUNDLES: SeedRawSampleBundle[] = [
  {
    sampleId: 'smp-pt-lobos',
    projectId: 'proj-monterey-12s',
    reads: [
      { header: 'PTL_001_Sebastes', sequence: r12(0), abundance: 420, meanPhred: 36.4 },
      { header: 'PTL_002_Embiotoca', sequence: r12(2), abundance: 310, meanPhred: 35.8 },
      { header: 'PTL_003_Oxyjulis', sequence: r12(9), abundance: 245, meanPhred: 37.1 },
      { header: 'PTL_004_Enhydra', sequence: r12(6), abundance: 135, meanPhred: 35.2 },
      { header: 'PTL_005_Ophiodon', sequence: r12(8), abundance: 168, meanPhred: 34.9 },
      { header: 'PTL_006_Engraulis', sequence: r12(1), abundance: 92, meanPhred: 36.0 },
      { header: 'PTL_007_Sebastes_var', sequence: mutateSequence(r12(0), 6, 101), abundance: 34, meanPhred: 33.2 },
      { header: 'PTL_008_Unknown_Kelp', sequence: NOVEL_SEQ_1, abundance: 16, meanPhred: 34.5 },
    ],
  },
  {
    sampleId: 'smp-elkhorn',
    projectId: 'proj-monterey-12s',
    reads: [
      { header: 'ELK_001_Platichthys', sequence: r12(3), abundance: 390, meanPhred: 36.1 },
      { header: 'ELK_002_Atherinops', sequence: r12(7), abundance: 340, meanPhred: 35.5 },
      { header: 'ELK_003_Triakis', sequence: r12(5), abundance: 215, meanPhred: 36.8 },
      { header: 'ELK_004_Oncorhynchus', sequence: r12(4), abundance: 160, meanPhred: 35.9 },
      { header: 'ELK_005_Engraulis', sequence: r12(1), abundance: 112, meanPhred: 34.4 },
      { header: 'ELK_006_Enhydra', sequence: r12(6), abundance: 42, meanPhred: 35.1 },
      { header: 'ELK_007_Flounder_var', sequence: mutateSequence(r12(3), 7, 204), abundance: 26, meanPhred: 32.8 },
    ],
  },
  {
    sampleId: 'smp-pacific-grove',
    projectId: 'proj-monterey-12s',
    reads: [
      { header: 'HOP_001_Engraulis', sequence: r12(1), abundance: 360, meanPhred: 37.0 },
      { header: 'HOP_002_Sebastes', sequence: r12(0), abundance: 295, meanPhred: 36.2 },
      { header: 'HOP_003_Ophiodon', sequence: r12(8), abundance: 220, meanPhred: 35.4 },
      { header: 'HOP_004_Embiotoca', sequence: r12(2), abundance: 165, meanPhred: 35.7 },
      { header: 'HOP_005_Oxyjulis', sequence: r12(9), abundance: 95, meanPhred: 36.5 },
      { header: 'HOP_006_Unknown_Shelf', sequence: NOVEL_SEQ_2, abundance: 55, meanPhred: 34.1 },
    ],
  },
  {
    sampleId: 'smp-big-sur',
    projectId: 'proj-monterey-12s',
    reads: [
      { header: 'BSR_001_Sebastes', sequence: r12(0), abundance: 310, meanPhred: 36.0 },
      { header: 'BSR_002_Ophiodon', sequence: r12(8), abundance: 270, meanPhred: 35.6 },
      { header: 'BSR_003_Engraulis', sequence: r12(1), abundance: 195, meanPhred: 35.9 },
      { header: 'BSR_004_Deep_Rockfish_var', sequence: mutateSequence(r12(8), 7, 309), abundance: 88, meanPhred: 33.7 },
      { header: 'BSR_005_Canyon_Novel_A', sequence: NOVEL_SEQ_1, abundance: 72, meanPhred: 34.8 },
      { header: 'BSR_006_Canyon_Novel_B', sequence: NOVEL_SEQ_2, abundance: 45, meanPhred: 34.2 },
    ],
  },
  {
    sampleId: 'smp-carmel-coi',
    projectId: 'proj-intertidal-coi',
    reads: [
      { header: 'CRM_001_Urchin', sequence: rCoi(0), abundance: 320, meanPhred: 36.5 },
      { header: 'CRM_002_Mussel', sequence: rCoi(1), abundance: 250, meanPhred: 36.0 },
      { header: 'CRM_003_Anemone', sequence: rCoi(3), abundance: 185, meanPhred: 35.3 },
      { header: 'CRM_004_Crab', sequence: rCoi(2), abundance: 58, meanPhred: 34.9 },
      { header: 'CRM_005_Unknown_Benthic', sequence: NOVEL_SEQ_3, abundance: 27, meanPhred: 33.8 },
    ],
  },
  {
    sampleId: 'smp-moss-coi',
    projectId: 'proj-intertidal-coi',
    reads: [
      { header: 'MOS_001_Crab', sequence: rCoi(2), abundance: 350, meanPhred: 35.8 },
      { header: 'MOS_002_Mussel', sequence: rCoi(1), abundance: 230, meanPhred: 36.1 },
      { header: 'MOS_003_Urchin_var', sequence: mutateSequence(rCoi(0), 6, 412), abundance: 120, meanPhred: 33.4 },
      { header: 'MOS_004_Anemone', sequence: rCoi(3), abundance: 62, meanPhred: 35.0 },
      { header: 'MOS_005_Mudflat_Novel', sequence: NOVEL_SEQ_3, abundance: 28, meanPhred: 34.0 },
    ],
  },
];

export const DEMO_JOBS: JobRecord[] = [
  {
    id: 'job-1001',
    projectId: 'proj-monterey-12s',
    projectName: 'Pacific Kelp & Estuary 12S Vertebrate Survey',
    ownerUid: 'demo-researcher-01',
    stage: 'completed',
    progress: 100,
    status: 'completed',
    classifierMode: 'demo_kmer',
    clusteringMode: 'otu_97',
    readsInput: 4875,
    readsPassed: 4875,
    chimerasFlagged: 2,
    clustersGenerated: 27,
    startedAt: '2026-11-18T15:08:10Z',
    completedAt: '2026-11-18T15:10:02Z',
  },
  {
    id: 'job-1002',
    projectId: 'proj-intertidal-coi',
    projectName: 'Rocky Intertidal Invertebrate COI Baseline',
    ownerUid: 'demo-researcher-01',
    stage: 'completed',
    progress: 100,
    status: 'completed',
    classifierMode: 'demo_kmer',
    clusteringMode: 'asv',
    readsInput: 1630,
    readsPassed: 1630,
    chimerasFlagged: 0,
    clustersGenerated: 10,
    startedAt: '2026-11-19T10:20:45Z',
    completedAt: '2026-11-19T10:22:05Z',
  },
];

export const DEMO_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'audit-001',
    actorUid: 'demo-admin-01',
    actorEmail: 'admin@taxatrace.org',
    action: 'REFERENCE_DB_SEED',
    target: 'taxa_reference (24 entries)',
    details: 'Initialized curated MiFish 12S, 16S, 18S, COI, ITS, and rbcL reference panel.',
    ts: '2026-11-10T09:00:00Z',
  },
  {
    id: 'audit-002',
    actorUid: 'demo-admin-01',
    actorEmail: 'admin@taxatrace.org',
    action: 'ANNOUNCEMENT_UPDATED',
    target: 'settings/announcement',
    details: 'Published reference taxonomy v2.4 update notice.',
    ts: '2026-11-17T14:30:00Z',
  },
];

export const DEMO_ANNOUNCEMENT: AnnouncementBanner = {
  id: 'announcement',
  message:
    'Reference panel updated with curated 12S MiFish and COI marine invertebrate vouchers. Remember to note marker bias in published reports.',
  severity: 'info',
  active: true,
  updatedAt: '2026-11-17T14:30:00Z',
  updatedBy: 'admin@taxatrace.org',
};

export const SAMPLE_UPLOAD_FASTA = `>KelpSite_Read01_size=145
${r12(0)}
>KelpSite_Read02_size=98
${r12(2)}
>KelpSite_Read03_size=84
${r12(6)}
>KelpSite_Read04_Divergent_size=42
${mutateSequence(r12(9), 6, 777)}
>KelpSite_Read05_NovelCandidate_size=29
${NOVEL_SEQ_1}
>KelpSite_Read06_ChimeraCandidate_size=8
${r12(0).slice(0, 109)}${r12(6).slice(109)}
>KelpSite_Read07_LowQualShort_size=3
ACGTACGTNNNNNNNNN
`;
