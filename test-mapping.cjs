const https = require('https');

function supabaseRequest(endpoint, method = 'GET', body = null) {
  const SUPABASE_URL = 'https://yvtciknrhytkwcvjtojf.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_Td0srhv2Lgs49Q_DQ9wfog_JHmgHqT9';
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${endpoint}`);
    const req = https.request({
      method, hostname: url.hostname, path: url.pathname + url.search,
      headers: {
        'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json', 'Prefer': 'return=representation'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : null);
        } catch (e) { resolve(data); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function fetchAll(endpoint) {
  let all = [];
  let offset = 0;
  const limit = 1000;
  while (true) {
    const batch = await supabaseRequest(
      `${endpoint}${endpoint.includes('?') ? '&' : '?'}limit=${limit}&offset=${offset}`
    );
    if (!Array.isArray(batch) || batch.length === 0) break;
    all = all.concat(batch);
    if (batch.length < limit) break;
    offset += limit;
  }
  return all;
}

async function run() {
  const [placements, divisions, tournaments, players] = await Promise.all([
    fetchAll('placements?glassware_awarded=eq.true'),
    fetchAll('tournament_divisions'),
    fetchAll('tournaments'),
    fetchAll('players?select=id,name'),
  ]);

  const divById = new Map(divisions.map((d) => [d.id, d]));
  const tourById = new Map(tournaments.map((t) => [t.id, t]));
  const playerById = new Map(players.map((p) => [p.id, p.name]));

  const winners = placements
    .map((p) => {
      const div = divById.get(p.division_id);
      const tour = div ? tourById.get(div.tournament_id) : null;
      if (!tour) return null;

      return {
        id: p.id,
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
    .filter(Boolean)
    .sort((a, b) => {
      if (a.date_won && b.date_won) {
        const dateDiff = b.date_won.localeCompare(a.date_won);
        if (dateDiff !== 0) return dateDiff;
      }
      return a.place - b.place;
    });
    
  console.log('winners:', winners.length);
  if (winners.length > 0) console.log(winners[0]);
}
run();
