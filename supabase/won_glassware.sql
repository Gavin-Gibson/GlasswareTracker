-- ===========================================================================
-- Supabase View: won_glassware
-- Description: Selects and sorts won glassware from oldest to newest by the date won.
-- ===========================================================================

-- 1. Create or replace the view
CREATE OR REPLACE VIEW won_glassware AS
SELECT
  p.id AS placement_id,
  t.name AS tournament_name,
  t.event_date AS date_won,
  t.circuit AS circuit,
  td.division_name AS division_name,
  p.place AS place,
  p.team_name AS team_name,
  pl1.name AS player1_name,
  pl2.name AS player2_name,
  p.glassware_type AS glassware_type,
  p.notes AS award_notes
FROM placements p
JOIN tournament_divisions td ON p.division_id = td.id
JOIN tournaments t ON td.tournament_id = t.id
LEFT JOIN players pl1 ON p.player1_id = pl1.id
LEFT JOIN players pl2 ON p.player2_id = pl2.id
WHERE p.glassware_awarded = TRUE
   OR (p.glassware_type IS NOT NULL AND p.glassware_type <> 'None')
ORDER BY t.event_date ASC;

-- 2. Sample query to select from the view
-- SELECT * FROM won_glassware;
