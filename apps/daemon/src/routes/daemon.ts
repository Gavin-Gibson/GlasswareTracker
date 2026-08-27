import path from 'node:path';
import fs from 'node:fs';
import https from 'node:https';
import type { Express, RequestHandler } from 'express';
import { readCurrentAppVersionInfo } from '../app-version.js';
import { getCritiqueMetrics, register } from '../metrics/index.js';
import { readConformanceHistory } from '../critique/conformance-history.js';
import { evaluateRollout } from '../critique/ratchet.js';
import { parseRolloutPhase } from '../critique/rollout.js';
import {
  AgentCompanionSetupError,
  installDeepSeekHarnessCompanion,
} from '../agent-companion-setup.js';

export interface RegisterDaemonRoutesDeps {
  db: any;
  paths: {
    PROJECT_ROOT: string;
    RESOURCE_ROOT: string;
    RUNTIME_DATA_DIR: string;
  };
  http: {
    requireLocalDaemonRequest: RequestHandler;
    sendApiError: (...args: any[]) => any;
  };
  host: string;
  getResolvedPort: () => number;
  getDaemonShuttingDown: () => boolean;
  sandboxRuntime: {
    enabled: boolean;
    roots?: unknown;
  };
  env: NodeJS.ProcessEnv;
}

export function registerDaemonRoutes(app: Express, deps: RegisterDaemonRoutesDeps): void {
  const { db, env, host, http, paths, sandboxRuntime } = deps;
  const { requireLocalDaemonRequest, sendApiError } = http;

  app.get('/api/daemon/status', async (_req, res) => {
    const versionInfo = await readCurrentAppVersionInfo();
    res.json({
      ok: true,
      version: versionInfo.version,
      bindHost: host,
      port: deps.getResolvedPort(),
      dataDir: paths.RUNTIME_DATA_DIR,
      mediaConfigDir: env.OD_MEDIA_CONFIG_DIR ?? null,
      sandboxMode: sandboxRuntime.enabled,
      sandbox: sandboxRuntime.enabled
        ? { enabled: true, roots: sandboxRuntime.roots }
        : { enabled: false },
      pid: process.pid,
      shuttingDown: deps.getDaemonShuttingDown(),
      installedPlugins: (() => {
        try {
          return (db.prepare('SELECT COUNT(*) AS n FROM installed_plugins').get())?.n ?? 0;
        } catch {
          return 0;
        }
      })(),
    });
  });

  app.get('/api/daemon/db', async (_req, res) => {
    try {
      const { inspectSqliteDatabase } = await import('../storage/db-inspect.js');
      const file = path.join(paths.RUNTIME_DATA_DIR, 'app.sqlite');
      const report = await inspectSqliteDatabase({ db, file });
      res.json(report);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.post('/api/agents/:agentId/oauth-launch', requireLocalDaemonRequest, async (req, res) => {
    const agentId = req.params.agentId;
    if (agentId !== 'antigravity') {
      return res.status(400).json({
        ok: false,
        error: `oauth-launch is only supported for antigravity, got ${agentId}`,
      });
    }
    try {
      const { launchAgentInSystemTerminal } = await import('../runtimes/terminal-launch.js');
      const result = await launchAgentInSystemTerminal('agy');
      if (result.ok) {
        return res.json({ ok: true, platform: result.platform, via: result.via });
      }
      return res.status(500).json({
        ok: false,
        platform: result.platform,
        error: result.reason,
      });
    } catch (err) {
      return res.status(500).json({
        ok: false,
        error: String(err),
      });
    }
  });

  app.post('/api/agents/:agentId/companion/install', requireLocalDaemonRequest, async (req, res) => {
    if (req.params.agentId !== 'deepseek-harness') {
      return sendApiError(res, 400, 'BAD_REQUEST', 'This agent has no OpenDesign connection component.');
    }
    try {
      const result = await installDeepSeekHarnessCompanion({
        projectRoot: paths.PROJECT_ROOT,
        resourceRoot: paths.RESOURCE_ROOT,
        runtimeDataDir: paths.RUNTIME_DATA_DIR,
      });
      return res.json(result);
    } catch (error) {
      if (error instanceof AgentCompanionSetupError) {
        const status = error.code === 'AGENT_NOT_INSTALLED' ? 409 : 500;
        return res.status(status).json({
          error: { code: error.code, message: error.message },
        });
      }
      console.warn('[agent-companion-setup] unexpected failure', error);
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'DeepSeek Harness connection setup failed.');
    }
  });

  app.post('/api/daemon/db/verify', requireLocalDaemonRequest, async (req, res) => {
    try {
      const { verifySqliteIntegrity } = await import('../storage/db-inspect.js');
      const quick = String(req.query.quick ?? '').toLowerCase();
      const report = verifySqliteIntegrity({ db, quick: quick === '1' || quick === 'true' });
      res.json(report);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.post('/api/daemon/db/vacuum', requireLocalDaemonRequest, async (_req, res) => {
    try {
      const { inspectSqliteDatabase } = await import('../storage/db-inspect.js');
      const file = path.join(paths.RUNTIME_DATA_DIR, 'app.sqlite');
      const before = await inspectSqliteDatabase({ db, file });
      const startedAt = Date.now();
      db.exec('VACUUM');
      const elapsedMs = Date.now() - startedAt;
      const after = await inspectSqliteDatabase({ db, file });
      res.json({
        ok: true,
        beforeBytes: before.sizeBytes,
        afterBytes:  after.sizeBytes,
        reclaimedBytes: Math.max(0, before.sizeBytes - after.sizeBytes),
        elapsedMs,
      });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.post('/api/daemon/shutdown', requireLocalDaemonRequest, (_req, res) => {
    res.status(202).json({ ok: true, scheduled: true });
    setImmediate(() => {
      try {
        process.emit('SIGTERM');
      } catch {
        // Best-effort; if the listener was removed the kernel SIGTERM fallback remains.
      }
    });
  });

  if (env.OD_METRICS_ENDPOINT !== 'disabled') {
    app.get('/api/metrics', async (_req, res) => {
      res.setHeader('Content-Type', register.contentType);
      res.send(await getCritiqueMetrics());
    });
  }

  const parsePositiveInt = (raw: unknown, fallback: number): number => {
    if (typeof raw !== 'string' || raw.length === 0) return fallback;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
  };
  const parseRate = (raw: unknown, fallback: number): number => {
    if (typeof raw !== 'string' || raw.length === 0) return fallback;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 && n <= 1 ? n : fallback;
  };
  app.get('/api/critique/conformance', async (req, res) => {
    try {
      const windowDays = parsePositiveInt(req.query.windowDays, 14);
      const shippedThreshold = parseRate(req.query.shippedThreshold, 0.90);
      const cleanParseThreshold = parseRate(req.query.cleanParseThreshold, 0.95);
      const history = await readConformanceHistory(paths.RUNTIME_DATA_DIR, windowDays);
      const decision = evaluateRollout({
        current: parseRolloutPhase(env.OD_CRITIQUE_ROLLOUT_PHASE),
        history,
        windowDays,
        shippedThreshold,
        cleanParseThreshold,
      });
      res.json({ window: { days: windowDays, history }, decision });
    } catch (err) {
      sendApiError(res, 500, 'INTERNAL_ERROR', err instanceof Error ? err.message : String(err));
    }
  });

  // Glassware Rules - Get rules list
  app.get('/api/daemon/glassware-rules', requireLocalDaemonRequest, async (_req, res) => {
    try {
      const rulesPath = path.join(paths.PROJECT_ROOT, 'data/glassware-rules.json');
      if (!fs.existsSync(rulesPath)) {
        return res.json([]);
      }
      const data = fs.readFileSync(rulesPath, 'utf8');
      res.json(JSON.parse(data));
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // Glassware Rules - Save rules list
  app.post('/api/daemon/glassware-rules', requireLocalDaemonRequest, async (req, res) => {
    try {
      const rules = req.body;
      if (!Array.isArray(rules)) {
        return res.status(400).json({ ok: false, error: 'Expected an array of rules' });
      }
      const rulesPath = path.join(paths.PROJECT_ROOT, 'data/glassware-rules.json');
      fs.writeFileSync(rulesPath, JSON.stringify(rules, null, 2), 'utf8');
      res.json({ ok: true, message: 'Glassware rules saved successfully' });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // Tournament Data Entry - Save locally
  app.post('/api/daemon/tournaments/save', requireLocalDaemonRequest, async (req, res) => {
    try {
      const tournament = req.body;
      if (!tournament || !tournament.name) {
        return res.status(400).json({ ok: false, error: 'Invalid tournament payload' });
      }
      
      const outputPath = path.join(paths.PROJECT_ROOT, 'data/historical-manual-entry.json');
      
      // Ensure data directory exists
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      let existingData: any[] = [];
      if (fs.existsSync(outputPath)) {
        try {
          existingData = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
        } catch (e) {
          existingData = [];
        }
      }
      
      existingData.push(tournament);
      fs.writeFileSync(outputPath, JSON.stringify(existingData, null, 2));
      
      res.json({ ok: true, message: 'Tournament saved locally successfully' });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // Helper helper functions for Supabase syncing
  function getTournamentCircuit(slug: string, name: string) {
    const s = `${slug || ''} ${name || ''}`;
    
    const matches = (pattern: string) => new RegExp(`\\b${pattern}\\b`, 'i').test(s);
    const hasStr = (str: string) => s.toLowerCase().includes(str.toLowerCase());
    
    if (hasStr('azr spring challenger') || hasStr('husky')) return 'LOCAL';

    // STS & Challenger tour stops
    if (matches('sts') || hasStr('challenger') || hasStr('spikeball tour series')) {
      return 'STS';
    }

    // Regional circuit prefixes take precedence
    if (matches('ers') || hasStr('east roundnet series')) return 'ERS';
    if (matches('tasr') || hasStr('texas')) return 'TASR';
    if (matches('casr') || hasStr('california')) return 'CASR';
    if (matches('mrs') || hasStr('midwest')) return 'MRS';
    if (matches('pra') || hasStr('players roundnet association') || hasStr('players roundnet')) return 'PRA';
    if (matches('ilr') || hasStr('illinois')) return 'ILR';
    if (matches('gwr') || hasStr('greater washington')) return 'GWR';
    if (matches('utr') || hasStr('utah roundnet')) return 'UTR';
    if (matches('mra')) return 'MRA'; // e.g. MRA Chicago
    if (matches('mnr')) return 'MNR'; // e.g. MNR @ Como Park

    const hasUsaOrUs = matches('usa') || matches('us') || hasStr('u.s.') || hasStr('usar') || hasStr('usa-') || hasStr('u.s. roundnet') || hasStr('usa roundnet');
    const hasNational = matches('national') || matches('nationals') || matches('natty') || matches('natties') || hasStr('national') || hasStr('nationals') || hasStr('championship') || hasStr('championships');

    // True Nationals must have USA/US/U.S. AND National (or be a US National Team tryout)
    if ((hasNational || hasStr('team tryout') || hasStr('team qualifier') || hasStr('nationals2024')) && hasUsaOrUs) {
      return 'NATIONALS';
    }

    if (matches('nats') || hasStr('north american tour series')) return 'NATS';
    if (hasUsaOrUs || hasStr('usar') || hasStr('usa roundnet') || hasStr('u.s. roundnet')) return 'USAR';
    
    if (matches('local') || matches('open')) return 'LOCAL';
    
    return 'LOCAL'; // Default fallback
  }

  function supabaseRequest(endpoint: string, method = 'GET', body: any = null) {
    const SUPABASE_URL = 'https://yvtciknrhytkwcvjtojf.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_Td0srhv2Lgs49Q_DQ9wfog_JHmgHqT9';

    return new Promise((resolve, reject) => {
      const url = new URL(`${SUPABASE_URL}/rest/v1/${endpoint}`);
      const options = {
        method,
        hostname: url.hostname,
        path: url.pathname + url.search,
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = data ? JSON.parse(data) : null;
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(parsed)}`));
            }
          } catch (e) {
            resolve(data);
          }
        });
      });

      req.on('error', reject);
      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }

  // Fetch all required data with pagination bypassing the default 1000 limit
  async function fetchAll(endpoint: string): Promise<any[]> {
    let all: any[] = [];
    let offset = 0;
    const limit = 1000;
    while (true) {
      const batch: any = await supabaseRequest(
        `${endpoint}${endpoint.includes('?') ? '&' : '?'}limit=${limit}&offset=${offset}`
      );
      if (!Array.isArray(batch) || batch.length === 0) break;
      all = all.concat(batch);
      if (batch.length < limit) break;
      offset += limit;
    }
    return all;
  }

  // Tournament Data Entry - Sync to Supabase
  app.post('/api/daemon/tournaments/sync', requireLocalDaemonRequest, async (req, res) => {
    try {
      const t = req.body;
      if (!t || !t.name) {
        return res.status(400).json({ ok: false, error: 'Invalid tournament payload' });
      }

      // Collect all player names in the tournament
      const playerNames: string[] = [];
      if (t.divisions && Array.isArray(t.divisions)) {
        for (const div of t.divisions) {
          if (div.placements && Array.isArray(div.placements)) {
            for (const p of div.placements) {
              if (p.players && Array.isArray(p.players)) {
                for (const plName of p.players) {
                  const trimmed = plName?.trim();
                  if (trimmed && trimmed !== 'Unknown Player' && !playerNames.includes(trimmed)) {
                    playerNames.push(trimmed);
                  }
                }
              }
            }
          }
        }
      }

      // Sync players with Supabase
      const playerMap = new Map<string, string>(); // Name -> UUID
      if (playerNames.length > 0) {
        const existingPlayers: any = await fetchAll('players?select=id,name');
        if (Array.isArray(existingPlayers)) {
          for (const ep of existingPlayers) {
            if (playerNames.includes(ep.name)) {
              playerMap.set(ep.name, ep.id);
            }
          }
        }

        const playersToInsert = playerNames
          .filter(name => !playerMap.has(name))
          .map(name => ({ name }));

        if (playersToInsert.length > 0) {
          const inserted: any = await supabaseRequest('players', 'POST', playersToInsert);
          if (Array.isArray(inserted)) {
            for (const p of inserted) {
              playerMap.set(p.name, p.id);
            }
          }
        }
      }

      // Insert Tournament
      const year = t.date ? parseInt(t.date.slice(0, 4), 10) : new Date().getFullYear();
      const circuit = t.circuit || getTournamentCircuit(t.slug || '', t.name);

      const tourneyPayload = [{
        name: t.name,
        year: year,
        event_date: t.date || null,
        location: t.location || 'USA',
        tier: t.tier || 'Major',
        circuit: circuit,
        era: t.era || 'Modern',
        notes: t.notes || ''
      }];

      const tourneyRecordResult: any = await supabaseRequest('tournaments', 'POST', tourneyPayload);
      if (!Array.isArray(tourneyRecordResult) || tourneyRecordResult.length === 0) {
        throw new Error('Failed to create tournament record in Supabase');
      }
      const tournamentId = tourneyRecordResult[0].id;

      // Insert Divisions and Placements
      if (t.divisions && Array.isArray(t.divisions)) {
        for (const div of t.divisions) {
          const divPayload = [{
            tournament_id: tournamentId,
            division_name: div.name,
            awards_glassware: !!div.awards_glassware
          }];

          const divRecordResult: any = await supabaseRequest('tournament_divisions', 'POST', divPayload);
          if (!Array.isArray(divRecordResult) || divRecordResult.length === 0) {
            continue;
          }
          const divisionId = divRecordResult[0].id;

          if (div.placements && Array.isArray(div.placements)) {
            const placementsPayload = div.placements.map((p: any) => {
              const p1Name = p.players[0]?.trim();
              const p2Name = p.players[1]?.trim();

              const p1Id = p1Name ? playerMap.get(p1Name) : null;
              const p2Id = p2Name ? playerMap.get(p2Name) : null;

              return {
                division_id: divisionId,
                place: p.place,
                team_name: p.team_name,
                player1_id: p1Id || null,
                player2_id: p2Id || null,
                trophy_awarded: !!p.trophy_awarded,
                glassware_awarded: !!p.glassware_awarded || (p.glassware_type && p.glassware_type !== 'None'),
                glassware_type: p.glassware_type || 'None',
                notes: p.notes || ''
              };
            });

            if (placementsPayload.length > 0) {
              await supabaseRequest('placements', 'POST', placementsPayload);
            }
          }
        }
      }

      res.json({ ok: true, message: 'Tournament and related records successfully synced to Supabase!' });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  app.get('/api/daemon/tournaments', requireLocalDaemonRequest, async (req, res) => {
    try {
      const data = await fetchAll('tournaments?order=event_date.desc');
      res.json({ ok: true, tournaments: Array.isArray(data) ? data : [] });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // --- Inline Edit: Tournament ---
  app.patch('/api/daemon/tournaments/:id', requireLocalDaemonRequest, async (req, res) => {
    try {
      const { id } = req.params;
      const allowed = ['name', 'event_date', 'location', 'Circuit', 'tier', 'era', 'notes'];
      const patch: Record<string, any> = {};
      for (const key of allowed) {
        if (key in req.body) patch[key] = req.body[key];
      }
      if (Object.keys(patch).length === 0) {
        return res.status(400).json({ ok: false, error: 'No valid fields to update' });
      }
      await supabaseRequest(`tournaments?id=eq.${id}`, 'PATCH', patch);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // --- Inline Edit: Division ---
  app.patch('/api/daemon/divisions/:id', requireLocalDaemonRequest, async (req, res) => {
    try {
      const { id } = req.params;
      const allowed = ['division_name', 'awards_glassware'];
      const patch: Record<string, any> = {};
      for (const key of allowed) {
        if (key in req.body) patch[key] = req.body[key];
      }
      if (Object.keys(patch).length === 0) {
        return res.status(400).json({ ok: false, error: 'No valid fields to update' });
      }
      await supabaseRequest(`tournament_divisions?id=eq.${id}`, 'PATCH', patch);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // --- Inline Edit: Placement ---
  app.patch('/api/daemon/placements/:id', requireLocalDaemonRequest, async (req, res) => {
    try {
      const { id } = req.params;
      const patch: Record<string, any> = {};

      // Direct fields
      for (const key of ['team_name', 'glassware_awarded', 'glassware_type', 'notes', 'place']) {
        if (key in req.body) patch[key] = req.body[key];
      }

      // Player name resolution: look up or create player by name
      for (const slot of ['player1', 'player2'] as const) {
        const nameKey = `${slot}_name`;
        if (nameKey in req.body) {
          const name = (req.body[nameKey] || '').trim();
          if (!name) {
            patch[`${slot}_id`] = null;
          } else {
            // Look up existing player
            const existing: any = await supabaseRequest(
              `players?name=eq.${encodeURIComponent(name)}&select=id,name&limit=1`
            );
            if (Array.isArray(existing) && existing.length > 0) {
              patch[`${slot}_id`] = existing[0].id;
            } else {
              // Create new player
              const created: any = await supabaseRequest('players', 'POST', [{ name }]);
              if (Array.isArray(created) && created.length > 0) {
                patch[`${slot}_id`] = created[0].id;
              }
            }
          }
        }
      }

      if (Object.keys(patch).length === 0) {
        return res.status(400).json({ ok: false, error: 'No valid fields to update' });
      }
      await supabaseRequest(`placements?id=eq.${id}`, 'PATCH', patch);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });


  app.get('/api/daemon/tournaments/:id/details', requireLocalDaemonRequest, async (req, res) => {
    try {
      const { id } = req.params;
      const divisions: any = await supabaseRequest(`tournament_divisions?tournament_id=eq.${id}`);
      if (!Array.isArray(divisions) || divisions.length === 0) {
        return res.json({ ok: true, divisions: [] });
      }
      
      const divisionIds = divisions.map(d => d.id);
      const placements: any = await supabaseRequest(`placements?division_id=in.(${divisionIds.join(',')})`);
      const players: any = await fetchAll('players?select=id,name');
      const playerMap = new Map();
      if (Array.isArray(players)) {
        for (const p of players) {
          playerMap.set(p.id, p.name);
        }
      }
      
      const formattedDivisions = divisions.map(d => {
        const divPlacements = Array.isArray(placements)
          ? placements
              .filter((p: any) => p.division_id === d.id)
              .map((p: any) => ({
                ...p,
                player1_name: playerMap.get(p.player1_id) || null,
                player2_name: playerMap.get(p.player2_id) || null
              }))
              .sort((a: any, b: any) => a.place - b.place)
          : [];
        
        return {
          id: d.id,
          name: d.division_name,
          awards_glassware: d.awards_glassware,
          placements: divPlacements
        };
      });
      
      res.json({ ok: true, divisions: formattedDivisions });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  app.get('/api/daemon/glassware-winners', requireLocalDaemonRequest, async (_req, res) => {
    try {
      const [placements, divisions, tournaments, players] = await Promise.all([
        fetchAll('placements?glassware_awarded=eq.true'),
        fetchAll('tournament_divisions'),
        fetchAll('tournaments'),
        fetchAll('players?select=id,name'),
      ]);

      const divById = new Map(divisions.map((d: any) => [d.id, d]));
      const tourById = new Map(tournaments.map((t: any) => [t.id, t]));
      const playerById = new Map(players.map((p: any) => [p.id, p.name]));

      const winners = placements
        .filter((p: any) => {
          const div = divById.get(p.division_id);
          const tour = div ? tourById.get(div.tournament_id) : null;
          const circuit = (tour?.Circuit || tour?.circuit || '').toUpperCase();
          const isSectionalMrs = circuit === 'MRS' && ((tour?.name || '').toLowerCase().includes('sectional') || (tour?.tier || '').toLowerCase().includes('sectional'));
          const isAllowedCircuit = circuit !== 'LOCAL' && circuit !== 'ILR' && (circuit !== 'MRS' || isSectionalMrs);
          return div && div.awards_glassware === true && isAllowedCircuit;
        })
        .map((p: any) => {
          const div = divById.get(p.division_id);
          const tour = div ? tourById.get(div.tournament_id) : null;
          if (!tour) return null;

          return {
            id: p.id,
            division_id: div.id,
            tournament_id: tour.id,
            tournament_name: tour.name,
            division_name: div.division_name,
            circuit: tour.Circuit || tour.circuit || 'NATS',
            place: p.place,
            team_name: p.team_name || null,
            player1_name: p.player1_id ? (playerById.get(p.player1_id) || null) : null,
            player2_name: p.player2_id ? (playerById.get(p.player2_id) || null) : null,
            glassware_type: p.glassware_type,
            trophy_awarded: p.trophy_awarded,
            award_notes: p.notes,
            date_won: tour.event_date,
          };
        })
        .filter(Boolean);

      const getDivisionSortPriority = (divisionName?: string): number => {
        const d = (divisionName || '').toLowerCase();
        if (d.includes('women') || d.includes('female') || d.includes('girl')) return 1;
        if (d.includes('mixed') || d.includes('co-ed') || d.includes('coed') || d.includes('squad')) return 3;
        return 2;
      };

      // Sort chronologically with Division Priority (Women -> Men/Open -> Mixed/Squad)
      winners.sort((a: any, b: any) => {
        const da = a.date_won ? new Date(a.date_won).getTime() : 0;
        const db = b.date_won ? new Date(b.date_won).getTime() : 0;
        if (da !== db) return da - db;
        const tourDiff = (a.tournament_name || '').localeCompare(b.tournament_name || '');
        if (tourDiff !== 0) return tourDiff;

        const prioA = getDivisionSortPriority(a.division_name);
        const prioB = getDivisionSortPriority(b.division_name);
        if (prioA !== prioB) return prioA - prioB;

        if ((a.place || 99) !== (b.place || 99)) return (a.place || 99) - (b.place || 99);
        const divDiff = (a.division_name || '').localeCompare(b.division_name || '');
        if (divDiff !== 0) return divDiff;
        return (a.id || '').localeCompare(b.id || '');
      });

      // Group placements by division to compute tied A/B suffixes
      const divPlacements = new Map<string, any[]>();
      winners.forEach((w: any) => {
        if (!divPlacements.has(w.division_id)) divPlacements.set(w.division_id, []);
        divPlacements.get(w.division_id)!.push(w);
      });

      let pitcherCounter = 1;
      let tankardCounter = 1;
      let glassCounter = 1;
      let overallCounter = 1;

      const processedDivisions = new Set<string>();
      const numberedWinners: any[] = [];

      winners.forEach((w: any) => {
        if (processedDivisions.has(w.division_id)) return;
        processedDivisions.add(w.division_id);

        const divWinners = divPlacements.get(w.division_id) || [];
        const firsts = divWinners.filter((p: any) => p.place === 1);
        const seconds = divWinners.filter((p: any) => p.place === 2);
        const thirds = divWinners.filter((p: any) => p.place === 3 || (p.place !== 1 && p.place !== 2));

        // 1st place (Pitchers)
        firsts.forEach((p: any, idx: number) => {
          const suffix = firsts.length > 1 ? String.fromCharCode(65 + idx) : '';
          numberedWinners.push({
            ...p,
            type_number: pitcherCounter,
            type_suffix: suffix,
            type_label: `Pitcher #${pitcherCounter}${suffix}`,
            type_category: 'Pitcher',
            overall_number: overallCounter++
          });
        });
        if (firsts.length > 0) pitcherCounter++;

        // 2nd place (Tankards)
        seconds.forEach((p: any, idx: number) => {
          const suffix = seconds.length > 1 ? String.fromCharCode(65 + idx) : '';
          numberedWinners.push({
            ...p,
            type_number: tankardCounter,
            type_suffix: suffix,
            type_label: `Tankard #${tankardCounter}${suffix}`,
            type_category: 'Tankard',
            overall_number: overallCounter++
          });
        });
        if (seconds.length > 0) tankardCounter++;

        // 3rd place (Glasses)
        thirds.forEach((p: any, idx: number) => {
          const suffix = thirds.length > 1 ? String.fromCharCode(65 + idx) : '';
          numberedWinners.push({
            ...p,
            type_number: glassCounter,
            type_suffix: suffix,
            type_label: `Glass #${glassCounter}${suffix}`,
            type_category: 'Glass',
            overall_number: overallCounter++
          });
        });
        if (thirds.length > 0) glassCounter++;
      });

      res.json({ ok: true, winners: numberedWinners });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });
}
