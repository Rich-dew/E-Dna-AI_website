import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express, { type Request, type Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

// Ephemeral HMAC key for short-lived admin step-2 verification tokens
const ADMIN_TOKEN_SECRET = crypto.randomBytes(32);

interface ClaimedAdminPasscode {
  salt: string;
  hash: string;
  claimedAt: string;
}

// One-time first-run claimed passcode fallback (overridden whenever process.env.ADMIN_PASSCODE is set)
let claimedPasscode: ClaimedAdminPasscode | null = null;

// Per-IP rate limiting for admin passcode verification
const adminAttempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_ADMIN_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

function getClientIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) {
    return fwd.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function getEnvAdminPasscode(): string {
  return (process.env.ADMIN_PASSCODE || '').trim();
}

function signAdminStep2Token(uid: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      uid,
      exp: Date.now() + 2 * 60 * 60 * 1000, // 2 hours
      nonce: crypto.randomBytes(8).toString('hex'),
    }),
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', ADMIN_TOKEN_SECRET)
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

function verifyAdminStep2Token(token: string): { valid: boolean; uid?: string } {
  const parts = token.split('.');
  if (parts.length !== 2) return { valid: false };
  const [payload, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', ADMIN_TOKEN_SECRET)
    .update(payload)
    .digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return { valid: false };
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!parsed || typeof parsed.exp !== 'number' || parsed.exp < Date.now()) {
      return { valid: false };
    }
    return { valid: true, uid: typeof parsed.uid === 'string' ? parsed.uid : undefined };
  } catch {
    return { valid: false };
  }
}

function constantTimeStringCompare(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

async function createServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '2mb' }));

  // Health endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Admin second-step passcode status (never returns secret or hash)
  app.get('/api/admin/passcode-status', (_req: Request, res: Response) => {
    const envPasscode = getEnvAdminPasscode();
    if (envPasscode.length > 0) {
      res.json({ mode: 'env', configured: true, claimed: true });
      return;
    }
    if (claimedPasscode) {
      res.json({ mode: 'claimed', configured: true, claimed: true });
      return;
    }
    res.json({ mode: 'unclaimed', configured: false, claimed: false });
  });

  // One-time bootstrap claim when ADMIN_PASSCODE env var is not configured
  app.post('/api/admin/claim-passcode', (req: Request, res: Response) => {
    if (getEnvAdminPasscode().length > 0) {
      res.status(409).json({
        error: 'Admin passcode is managed by the server ADMIN_PASSCODE environment variable.',
      });
      return;
    }
    if (claimedPasscode) {
      res.status(409).json({
        error: 'Admin passcode has already been claimed on this server instance.',
      });
      return;
    }
    const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode.trim() : '';
    const uid = typeof req.body?.uid === 'string' ? req.body.uid.slice(0, 128) : 'admin';

    if (passcode.length < 8 || passcode.length > 128) {
      res.status(400).json({ error: 'Passcode must be between 8 and 128 characters.' });
      return;
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const derived = crypto.scryptSync(passcode, salt, 64).toString('hex');
    claimedPasscode = {
      salt,
      hash: derived,
      claimedAt: new Date().toISOString(),
    };

    const token = signAdminStep2Token(uid);
    res.status(201).json({
      verified: true,
      token,
      mode: 'claimed',
    });
  });

  // Verify admin second-step passcode
  app.post('/api/admin/verify-passcode', (req: Request, res: Response) => {
    const ip = getClientIp(req);
    const now = Date.now();
    const record = adminAttempts.get(ip);

    if (record && record.lockedUntil > now) {
      const remainingMin = Math.ceil((record.lockedUntil - now) / 60000);
      res.status(429).json({
        error: `Too many failed passcode attempts. Try again in ${remainingMin} minute(s).`,
        lockedUntil: record.lockedUntil,
      });
      return;
    }

    const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode.trim() : '';
    const uid = typeof req.body?.uid === 'string' ? req.body.uid.slice(0, 128) : 'admin';
    if (!passcode) {
      res.status(400).json({ error: 'Passcode is required.' });
      return;
    }

    const envPasscode = getEnvAdminPasscode();
    let matched = false;

    if (envPasscode.length > 0) {
      matched = constantTimeStringCompare(passcode, envPasscode);
    } else if (claimedPasscode) {
      const derived = crypto.scryptSync(passcode, claimedPasscode.salt, 64);
      const expected = Buffer.from(claimedPasscode.hash, 'hex');
      matched = derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
    } else {
      res.status(412).json({
        error: 'No admin passcode configured yet. Complete first-run passcode setup first.',
      });
      return;
    }

    if (!matched) {
      const nextCount = (record?.count ?? 0) + 1;
      const lockedUntil = nextCount >= MAX_ADMIN_ATTEMPTS ? now + LOCKOUT_MS : 0;
      adminAttempts.set(ip, { count: nextCount, lockedUntil });
      const attemptsLeft = Math.max(0, MAX_ADMIN_ATTEMPTS - nextCount);
      res.status(401).json({
        error:
          attemptsLeft === 0
            ? 'Account locked for 15 minutes after 5 failed passcode attempts.'
            : `Invalid admin passcode. ${attemptsLeft} attempt(s) remaining.`,
        attemptsLeft,
      });
      return;
    }

    adminAttempts.delete(ip);
    const token = signAdminStep2Token(uid);
    res.json({ verified: true, token });
  });

  // Verify Bearer step-2 admin session token
  app.get('/api/admin/verify-session', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!token) {
      res.status(401).json({ valid: false });
      return;
    }
    const result = verifyAdminStep2Token(token);
    if (!result.valid) {
      res.status(401).json({ valid: false });
      return;
    }
    res.json({ valid: true, uid: result.uid });
  });

  // Server-side Gemini ecological summary endpoint
  app.post('/api/gemini/summarize', async (req: Request, res: Response) => {
    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.status(503).json({
        error:
          'GEMINI_API_KEY is not configured on the server. Add GEMINI_API_KEY in your environment secrets to generate AI ecological summaries.',
      });
      return;
    }

    const body = req.body;
    if (!body || typeof body.projectName !== 'string' || !Array.isArray(body.samples)) {
      res.status(400).json({ error: 'Invalid project payload for ecological summary.' });
      return;
    }

    const sanitizedPayload = {
      projectName: String(body.projectName).slice(0, 160),
      markerGene: String(body.markerGene || '12S').slice(0, 20),
      totalSequences: Number(body.totalSequences) || 0,
      assignedCount: Number(body.assignedCount) || 0,
      lowConfidenceCount: Number(body.lowConfidenceCount) || 0,
      novelCandidateCount: Number(body.novelCandidateCount) || 0,
      samples: (body.samples as unknown[]).slice(0, 25),
      topTaxa: Array.isArray(body.topTaxa) ? body.topTaxa.slice(0, 25) : [],
      betaSummary: typeof body.betaSummary === 'string' ? body.betaSummary.slice(0, 400) : '',
    };

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const prompt = `Analyze this environmental DNA (eDNA) biodiversity dataset and produce a clear, scientifically rigorous plain-language ecological summary.
Be conservative and never over-claim species presence from low-identity or unclassified sequences.
Explicitly address reference-database gaps, marker gene / primer amplification bias for ${sanitizedPayload.markerGene}, eDNA transport/persistence, and recommendations for validating novel candidate sequences.

Dataset JSON:
${JSON.stringify(sanitizedPayload, null, 2)}`;

      const generationConfig = {
        systemInstruction:
          'You are a senior molecular ecologist writing plain-language ecological interpretations of eDNA metabarcoding results. Keep prose clear, objective, concise (each paragraph 2-4 sentences), and scientifically accurate.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            executiveOverview: {
              type: Type.STRING,
              description: 'Plain-language ecological overview of biodiversity across sampled sites.',
            },
            communityStructure: {
              type: Type.STRING,
              description:
                'Interpretation of dominant taxonomic groups, alpha diversity indices (Shannon, Simpson, Chao1), and site-to-site beta turnover.',
            },
            novelTaxaInterpretation: {
              type: Type.STRING,
              description:
                'Careful discussion of low-confidence and unclassified/possible novel taxa without over-claiming discovery.',
            },
            caveats: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description:
                '4-5 specific methodological caveats including reference-database gaps, marker gene bias, PCR bias, and eDNA shedding/transport.',
            },
            recommendedNextSteps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3-4 actionable validation or follow-up sampling steps for researchers.',
            },
          },
          required: [
            'executiveOverview',
            'communityStructure',
            'novelTaxaInterpretation',
            'caveats',
            'recommendedNextSteps',
          ],
        },
      };

      const candidateModels = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'] as const;
      let response: Awaited<ReturnType<typeof ai.models.generateContent>> | null = null;
      let usedModel: string = candidateModels[0];
      let lastError: unknown = null;

      for (const modelName of candidateModels) {
        try {
          response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: generationConfig,
          });
          usedModel = modelName;
          break;
        } catch (err: unknown) {
          lastError = err;
          const errText = err instanceof Error ? err.message : String(err);
          const isTransient =
            errText.includes('503') ||
            errText.includes('UNAVAILABLE') ||
            errText.includes('429') ||
            errText.includes('high demand');
          if (!isTransient) {
            throw err;
          }
          console.warn(`Gemini model ${modelName} temporarily unavailable; trying fallback.`);
        }
      }

      if (!response) {
        throw lastError instanceof Error ? lastError : new Error('Gemini service is temporarily busy.');
      }

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        res.status(502).json({ error: 'Gemini returned an empty response. Please retry.' });
        return;
      }

      const parsed = JSON.parse(rawText);
      res.json({
        generatedAt: new Date().toISOString(),
        model: usedModel,
        ...parsed,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unexpected Gemini API failure.';
      console.error('Gemini summarize error:', message);
      const friendly =
        message.includes('503') || message.includes('UNAVAILABLE') || message.includes('high demand')
          ? 'The Gemini AI service is temporarily experiencing high demand. Please retry in a few seconds.'
          : `Failed to generate Gemini ecological summary: ${message}`;
      res.status(502).json({ error: friendly });
    }
  });

  // Online Taxonomy Classification Proxy (BOLD ID Engine / NCBI BLAST allowlisted endpoints)
  app.post('/api/taxonomy/online', async (req: Request, res: Response) => {
    const provider = req.body?.provider === 'ncbi_blast' ? 'ncbi_blast' : 'bold_id';
    const markerGene = typeof req.body?.markerGene === 'string' ? req.body.markerGene : 'COI';
    const sequences = Array.isArray(req.body?.sequences) ? req.body.sequences.slice(0, 10) : [];

    if (sequences.length === 0) {
      res.status(400).json({ error: 'Provide at least one sequence for online classification.' });
      return;
    }

    const results: Array<{
      id: string;
      matched: boolean;
      provider: string;
      taxon?: string;
      percentIdentity?: number;
      accession?: string;
      note: string;
    }> = [];

    for (const item of sequences) {
      const seqId = typeof item?.id === 'string' ? item.id.slice(0, 64) : 'seq';
      const cleanSeq =
        typeof item?.sequence === 'string'
          ? item.sequence.toUpperCase().replace(/[^ACGTN]/g, '').slice(0, 1000)
          : '';

      if (cleanSeq.length < 30) {
        results.push({
          id: seqId,
          matched: false,
          provider,
          note: 'Sequence shorter than 30 bp; skipped online query.',
        });
        continue;
      }

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);

        if (provider === 'bold_id' && markerGene === 'COI') {
          const boldUrl = new URL('https://www.boldsystems.org/index.php/Ids_xml');
          boldUrl.searchParams.set('db', 'COX1_SPECIES_PUBLIC');
          boldUrl.searchParams.set('sequence', cleanSeq);

          const resp = await fetch(boldUrl.toString(), {
            signal: controller.signal,
            headers: { Accept: 'application/xml' },
          });
          clearTimeout(timer);

          if (!resp.ok) {
            throw new Error(`BOLD API responded with HTTP ${resp.status}`);
          }
          const xml = await resp.text();
          const taxonMatch = xml.match(/<taxonomicidentification>([^<]+)<\/taxonomicidentification>/i);
          const simMatch = xml.match(/<similarity>([0-9.]+)<\/similarity>/i);
          const idMatch = xml.match(/<ID>([^<]+)<\/ID>/i);

          if (taxonMatch && simMatch) {
            const pct = Math.min(100, Number(simMatch[1]) * 100);
            results.push({
              id: seqId,
              matched: true,
              provider: 'BOLD ID Engine',
              taxon: taxonMatch[1].trim(),
              percentIdentity: Number(pct.toFixed(2)),
              accession: idMatch ? idMatch[1].trim() : undefined,
              note: 'Matched against BOLD COX1_SPECIES_PUBLIC.',
            });
          } else {
            results.push({
              id: seqId,
              matched: false,
              provider: 'BOLD ID Engine',
              note: 'No match above threshold in BOLD COX1_SPECIES_PUBLIC.',
            });
          }
        } else {
          // NCBI BLAST PUT submission check (allowlisted NCBI endpoint)
          const params = new URLSearchParams({
            CMD: 'Put',
            PROGRAM: 'blastn',
            DATABASE: 'nt',
            QUERY: cleanSeq,
            HITLIST_SIZE: '3',
            FORMAT_TYPE: 'JSON2_S',
          });
          const resp = await fetch('https://blast.ncbi.nlm.nih.gov/blast/Blast.cgi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
            signal: controller.signal,
          });
          clearTimeout(timer);

          if (!resp.ok) {
            throw new Error(`NCBI BLAST responded with HTTP ${resp.status}`);
          }
          const bodyText = await resp.text();
          const ridMatch = bodyText.match(/RID\s*=\s*([A-Z0-9-]+)/);
          results.push({
            id: seqId,
            matched: false,
            provider: 'NCBI BLAST',
            accession: ridMatch ? `RID:${ridMatch[1]}` : undefined,
            note: ridMatch
              ? `Submitted to NCBI BLAST queue (RID ${ridMatch[1]}). Local k-mer reference match used while remote queue completes.`
              : 'NCBI BLAST queued; falling back to calibrated reference k-mer taxonomy.',
          });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Network unavailable';
        results.push({
          id: seqId,
          matched: false,
          provider,
          note: `Online API unreachable (${msg}). Fallback to calibrated local k-mer classifier applied.`,
        });
      }
    }

    res.json({ provider, results });
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      const indexPath = path.join(distDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TaxaTrace server running at http://localhost:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error('Failed to start TaxaTrace server:', err);
  process.exit(1);
});
