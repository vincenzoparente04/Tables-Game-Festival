-- =============================================
-- 02_seed.sql
-- Import CSV -> staging -> tables app 
-- =============================================

-- 1) staging
DROP TABLE IF EXISTS stg_editeur;
DROP TABLE IF EXISTS stg_typejeu;
DROP TABLE IF EXISTS stg_jeu;
DROP TABLE IF EXISTS map_editeur;

CREATE TABLE stg_editeur (
  "idEditeur" INTEGER,
  "libelleEditeur" TEXT,
  "exposant" INTEGER,
  "distributeur" INTEGER,
  "logoEditeur" TEXT
);

CREATE TABLE stg_typejeu (
  "idTypeJeu" INTEGER,
  "libelleTypeJeu" TEXT,
  "idZone" TEXT
);

CREATE TABLE stg_jeu (
  "idJeu" INTEGER,
  "libelleJeu" TEXT,
  "auteurJeu" TEXT,
  "nbMinJoueurJeu" INTEGER,
  "nbMaxJoueurJeu" INTEGER,
  "noticeJeu" TEXT,
  "idEditeur" INTEGER,
  "idTypeJeu" INTEGER,
  "agemini" INTEGER,
  "prototype" TEXT,
  "duree" INTEGER,
  "theme" TEXT,
  "description" TEXT,
  "imageJeu" TEXT,
  "videoRegle" TEXT
);

-- 2) COPY (file inside docker-entrypoint-initdb.d/seed)
COPY stg_editeur
FROM '/docker-entrypoint-initdb.d/seed/editeur.csv'
WITH (FORMAT csv, HEADER true, DELIMITER ',', QUOTE '"');

COPY stg_typejeu
FROM '/docker-entrypoint-initdb.d/seed/typeJeu.csv'
WITH (FORMAT csv, HEADER true, DELIMITER ',', QUOTE '"');

COPY stg_jeu
FROM '/docker-entrypoint-initdb.d/seed/jeu.csv'
WITH (FORMAT csv, HEADER true, DELIMITER ',', QUOTE '"');

-- 3) Insert editeurs (avoid duplicates)
INSERT INTO editeurs (nom)
SELECT DISTINCT TRIM(se."libelleEditeur")
FROM stg_editeur se
WHERE se."libelleEditeur" IS NOT NULL
  AND TRIM(se."libelleEditeur") <> ''
  AND NOT EXISTS (
    SELECT 1 FROM editeurs e
    WHERE e.nom = TRIM(se."libelleEditeur")
  );

-- 4) Mapping idEditeur CSV -> editeurs.id
CREATE TABLE map_editeur (
  idEditeurCSV INTEGER PRIMARY KEY,
  editeur_id_db INTEGER NOT NULL REFERENCES editeurs(id)
);

INSERT INTO map_editeur (idEditeurCSV, editeur_id_db)
SELECT
  se."idEditeur",
  e.id
FROM stg_editeur se
JOIN editeurs e ON e.nom = TRIM(se."libelleEditeur")
WHERE se."idEditeur" IS NOT NULL;

-- 5) Insert jeux (with correction min/max)
INSERT INTO jeux (
  editeur_id, nom, type_jeu,
  age_mini, age_maxi,
  joueurs_mini, joueurs_maxi,
  taille_table, duree_moyenne
)
SELECT
  me.editeur_id_db,
  TRIM(sj."libelleJeu"),
  st."libelleTypeJeu",
  sj."agemini",
  NULL::INTEGER,

  CASE
    WHEN sj."nbMinJoueurJeu" IS NULL OR sj."nbMaxJoueurJeu" IS NULL THEN NULL
    WHEN sj."nbMinJoueurJeu" < 1 OR sj."nbMaxJoueurJeu" < 1 THEN NULL
    ELSE LEAST(sj."nbMinJoueurJeu", sj."nbMaxJoueurJeu")
  END,

  CASE
    WHEN sj."nbMinJoueurJeu" IS NULL OR sj."nbMaxJoueurJeu" IS NULL THEN NULL
    WHEN sj."nbMinJoueurJeu" < 1 OR sj."nbMaxJoueurJeu" < 1 THEN NULL
    ELSE GREATEST(sj."nbMinJoueurJeu", sj."nbMaxJoueurJeu")
  END,

  NULL::VARCHAR,
  sj."duree"
FROM stg_jeu sj
JOIN map_editeur me ON me.idEditeurCSV = sj."idEditeur"
LEFT JOIN stg_typejeu st ON st."idTypeJeu" = sj."idTypeJeu"
WHERE sj."libelleJeu" IS NOT NULL
  AND TRIM(sj."libelleJeu") <> '';
