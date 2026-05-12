-- Run via Supabase dashboard SQL editor or: supabase db reset (which applies seed files)
-- Update the PropHero tenant agent name
UPDATE tenants
SET agent_name = 'PropHero IA Buddy'
WHERE slug = 'prophero';

-- If the row doesn't exist yet, insert it:
-- INSERT INTO tenants (slug, agent_name) VALUES ('prophero', 'PropHero IA Buddy')
-- ON CONFLICT (slug) DO UPDATE SET agent_name = EXCLUDED.agent_name;
