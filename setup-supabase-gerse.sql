-- ─────────────────────────────────────────────────────────────────────────────
-- Script Supabase – Formation GERSE juin 2025
-- À exécuter dans : Supabase > SQL Editor > New Query
-- ─────────────────────────────────────────────────────────────────────────────

-- Création de la table
CREATE TABLE IF NOT EXISTS formation_gerse_2606 (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  email       text        NOT NULL UNIQUE,
  session_id  text        NOT NULL CHECK (session_id IN ('s1', 's2', 's3', 's4')),
  registered_at timestamptz DEFAULT now()
);

-- Index pour accélérer les requêtes par créneau (comptage des places)
CREATE INDEX IF NOT EXISTS idx_gerse_session ON formation_gerse_2606 (session_id);

-- ── Sécurité : Row Level Security ────────────────────────────────────────────
-- La table n'est accessible qu'avec la clé service_role (jamais exposée au public)
ALTER TABLE formation_gerse_2606 ENABLE ROW LEVEL SECURITY;

-- Aucune politique publique : seul le service_role (clé serveur) peut lire/écrire
-- Le frontend n'a pas accès direct à cette table.

-- ── Commentaires ─────────────────────────────────────────────────────────────
COMMENT ON TABLE  formation_gerse_2606              IS 'Inscriptions formation RSE GERSE – juin/juillet 2025';
COMMENT ON COLUMN formation_gerse_2606.email        IS 'Email professionnel (domaines autorisés : guyotenvironnement.com, guyotenergies.com, ycompris.com)';
COMMENT ON COLUMN formation_gerse_2606.session_id   IS 's1=16/06 10h, s2=23/06 14h, s3=26/06 10h, s4=02/07 10h';
COMMENT ON COLUMN formation_gerse_2606.registered_at IS 'Horodatage de l inscription (UTC)';

-- ── Requêtes utiles pour consulter les inscriptions ──────────────────────────
-- Liste complète :
-- SELECT email, session_id, registered_at AT TIME ZONE 'Europe/Paris' AS "inscrit le"
-- FROM formation_gerse_2606 ORDER BY session_id, registered_at;

-- Comptage par créneau :
-- SELECT session_id, COUNT(*) AS inscrits FROM formation_gerse_2606 GROUP BY session_id ORDER BY session_id;
