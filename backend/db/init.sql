

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(50) ,
    prenom VARCHAR(50),
    email VARCHAR(100) UNIQUE ,
    login TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS festivals (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(255) UNIQUE NOT NULL,
    espace_tables_total INTEGER NOT NULL CHECK (espace_tables_total > 0),
    -- Si on veut ajouter :
    description TEXT,
    date_debut DATE,
    date_fin DATE,
    
    -- STOCKS DIRECTEMENT DANS LA TABLE 
    stock_tables_standard INTEGER DEFAULT 0 CHECK (stock_tables_standard >= 0),
    stock_tables_grandes INTEGER DEFAULT 0 CHECK (stock_tables_grandes >= 0),
    stock_tables_mairie INTEGER DEFAULT 0 CHECK (stock_tables_mairie >= 0),
    stock_chaises_standard INTEGER DEFAULT 0 CHECK (stock_chaises_standard >= 0),
    stock_chaises_mairie INTEGER DEFAULT 0 CHECK (stock_chaises_mairie >= 0),

    prix_prise_electrique DECIMAL(10,2) DEFAULT 0 CHECK (prix_prise_electrique >= 0),
    est_actif BOOLEAN DEFAULT true,
    est_courant BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Table des zones tarifaires 
CREATE TABLE IF NOT EXISTS zones_tarifaires (
    id SERIAL PRIMARY KEY,
    festival_id INTEGER NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
    nom VARCHAR(100) NOT NULL,
    nombre_tables_total INTEGER NOT NULL CHECK (nombre_tables_total >= 0),
    prix_table DECIMAL(10,2) NOT NULL CHECK (prix_table >= 0),
    prix_m2 DECIMAL(10,2) NOT NULL CHECK (prix_m2 >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(festival_id, nom)
);

-- Table des éditeurs
CREATE TABLE IF NOT EXISTS editeurs (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

--tables des reservants (éditeurs ou autres)
CREATE TABLE IF NOT EXISTS reservants (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    type_reservant VARCHAR(50) NOT NULL CHECK (type_reservant IN ('editeur', 'prestataire', 'association', 'animation', 'boutique', 'autre')),
    editeur_id INTEGER REFERENCES editeurs(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



-- Table des contacts des éditeurs
CREATE TABLE IF NOT EXISTS contacts_reservants (
    id SERIAL PRIMARY KEY,
    reservant_id INTEGER NOT NULL REFERENCES reservants(id) ON DELETE CASCADE,
    nom VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    telephone VARCHAR(20),
    role_profession VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Table des auteurs de jeux
CREATE TABLE IF NOT EXISTS auteurs (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des jeux 
CREATE TABLE IF NOT EXISTS jeux (
    id SERIAL PRIMARY KEY,
    editeur_id INTEGER NOT NULL REFERENCES editeurs(id) ON DELETE CASCADE,
    nom VARCHAR(255) NOT NULL,
    type_jeu VARCHAR(100),
    age_mini INTEGER CHECK (age_mini >= 0),
    age_maxi INTEGER CHECK (age_maxi >= 0), 
    joueurs_mini INTEGER CHECK (joueurs_mini >= 1),
    joueurs_maxi INTEGER CHECK (joueurs_maxi >= joueurs_mini),
    taille_table VARCHAR(20) CHECK (taille_table IN ('petite', 'grande')), 
    duree_moyenne INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table de liaison jeux - auteurs
CREATE TABLE IF NOT EXISTS jeux_auteurs (
    jeu_id INTEGER NOT NULL REFERENCES jeux(id) ON DELETE CASCADE,
    auteur_id INTEGER NOT NULL REFERENCES auteurs(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (jeu_id, auteur_id)
);

-- =============================================
-- WORKFLOW ET RÉSERVATIONS
-- =============================================

-- Table des réservations principales
CREATE TABLE IF NOT EXISTS reservations (
    id SERIAL PRIMARY KEY,
    festival_id INTEGER NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
    reservant_id INTEGER NOT NULL REFERENCES reservants(id) ON DELETE CASCADE,
    etat_contact VARCHAR(50) NOT NULL DEFAULT 'pas_contacte' CHECK (etat_contact IN (
        'pas_contacte',
        'contacte',
        'en_discussion',
        'reserve',
        'liste_jeux_demandee',
        'liste_jeux_obtenue',
        'jeux_recus'
    )),
    etat_presence VARCHAR(50) DEFAULT 'non_defini' CHECK (etat_presence IN (
        'non_defini',
        'present',
        'considere_absent',
        'absent'
    )),
    date_dernier_contact TIMESTAMP,
    nb_prises_electriques INTEGER DEFAULT 0 CHECK (nb_prises_electriques >= 0),
    remise_tables INTEGER DEFAULT 0 CHECK (remise_tables >= 0),
    remise_montant DECIMAL(10,2) DEFAULT 0 CHECK (remise_montant >= 0),
    type_participation VARCHAR(50) DEFAULT 'presente_jeux',
    notes TEXT,
    viendra_animer BOOLEAN DEFAULT true, --je sais pas si on le garde
    --jeux_recus BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(festival_id, reservant_id)
);

-- Table des contacts/relances
CREATE TABLE IF NOT EXISTS contacts_reservations (
    id SERIAL PRIMARY KEY,
    reservation_id INTEGER NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    date_contact TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    type_contact VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Détail des tables réservées par zone tarifaire
CREATE TABLE IF NOT EXISTS reservations_zones (
    id SERIAL PRIMARY KEY,
    reservation_id INTEGER NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    zone_tarifaire_id INTEGER NOT NULL REFERENCES zones_tarifaires(id) ON DELETE CASCADE,
    nombre_tables INTEGER NOT NULL CHECK (nombre_tables > 0),
    prix_unitaire DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(reservation_id, zone_tarifaire_id)
);

-- =============================================
-- PLANIFICATION ET ZONES PHYSIQUES
-- =============================================

-- Table des zones du plan 
CREATE TABLE IF NOT EXISTS zones_plan (
    id SERIAL PRIMARY KEY,
    festival_id INTEGER NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
    nom VARCHAR(100) NOT NULL,
    nombre_tables_total INTEGER NOT NULL CHECK (nombre_tables_total >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(festival_id, nom)
);

-- Table des jeux présentés au festival
CREATE TABLE IF NOT EXISTS jeux_festival (
    id SERIAL PRIMARY KEY,
    reservation_id INTEGER NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    jeu_id INTEGER NOT NULL REFERENCES jeux(id) ON DELETE RESTRICT,
    zone_plan_id INTEGER REFERENCES zones_plan(id) ON DELETE SET NULL,
    nombre_exemplaires INTEGER DEFAULT 1 CHECK (nombre_exemplaires >= 1),
    tables_allouees DECIMAL(5,2) DEFAULT 1 CHECK (tables_allouees > 0),
    nb_tables_std INTEGER DEFAULT 0 CHECK (nb_tables_std >= 0),
    nb_tables_gde INTEGER DEFAULT 0 CHECK (nb_tables_gde >= 0),
    nb_tables_mairie INTEGER DEFAULT 0 CHECK (nb_tables_mairie >= 0),
    jeu_recu BOOLEAN DEFAULT false,
    est_place BOOLEAN GENERATED ALWAYS AS (zone_plan_id IS NOT NULL) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(reservation_id, jeu_id, zone_plan_id)
); 



-- =============================================
-- FACTURATION
-- =============================================

-- Table des factures
CREATE TABLE IF NOT EXISTS factures (
    id SERIAL PRIMARY KEY,
    reservation_id INTEGER NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    numero_facture VARCHAR(100) UNIQUE NOT NULL,
    date_facture DATE NOT NULL DEFAULT CURRENT_DATE,
    
    montant_tables DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (montant_tables >= 0),
    montant_prises DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (montant_prises >= 0),
    montant_brut DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (montant_brut >= 0),
    montant_remise DECIMAL(10,2) DEFAULT 0 CHECK (montant_remise >= 0),
    montant_total DECIMAL(10,2) NOT NULL CHECK (montant_total >= 0),

    statut_paiement VARCHAR(50) DEFAULT 'non_paye',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lignes de facture détaillées
CREATE TABLE IF NOT EXISTS lignes_facture (
    id SERIAL PRIMARY KEY,
    facture_id INTEGER NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantite INTEGER NOT NULL CHECK (quantite > 0),
    prix_unitaire DECIMAL(10,2) NOT NULL CHECK (prix_unitaire >= 0),
    montant_ligne DECIMAL(10,2) NOT NULL CHECK (montant_ligne >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Paiements reçus
/*
CREATE TABLE paiements (
    id SERIAL PRIMARY KEY,
    facture_id INTEGER NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
    montant DECIMAL(10,2) NOT NULL CHECK (montant > 0),
    date_paiement DATE NOT NULL DEFAULT CURRENT_DATE,
    mode_paiement VARCHAR(50),
    reference VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
**/
-- =============================================
-- INDEX POUR LES PERFORMANCES
-- =============================================

-- Festivals
CREATE INDEX idx_festivals_nom ON festivals(nom);
CREATE INDEX idx_festivals_est_actif ON festivals(est_actif);
CREATE INDEX idx_festivals_est_courant ON festivals(est_courant);

-- Zones tarifaires
CREATE INDEX idx_zones_tarifaires_festival ON zones_tarifaires(festival_id);

-- Zones du plan
CREATE INDEX idx_zones_plan_festival ON zones_plan(festival_id);

-- Éditeurs
CREATE INDEX idx_editeurs_nom ON editeurs(nom);

-- Réservants
CREATE INDEX idx_reservants_type ON reservants(type_reservant);
CREATE INDEX idx_reservants_editeur ON reservants(editeur_id);
CREATE INDEX idx_reservants_nom ON reservants(nom);

-- Contacts
CREATE INDEX idx_contacts_reservant ON contacts_reservants(reservant_id);

-- Auteurs
CREATE INDEX idx_auteurs_nom ON auteurs(nom);

-- Jeux
CREATE INDEX idx_jeux_nom ON jeux(nom);
CREATE INDEX idx_jeux_editeur ON jeux(editeur_id);
CREATE INDEX idx_jeux_type ON jeux(type_jeu);

-- Jeux-Auteurs
CREATE INDEX idx_jeux_auteurs_jeu ON jeux_auteurs(jeu_id);
CREATE INDEX idx_jeux_auteurs_auteur ON jeux_auteurs(auteur_id);

-- Réservations
CREATE INDEX idx_reservations_festival ON reservations(festival_id);
CREATE INDEX idx_reservations_reservant ON reservations(reservant_id);
CREATE INDEX idx_reservations_etat_contact ON reservations(etat_contact);
CREATE INDEX idx_reservations_etat_presence ON reservations(etat_presence);

-- Contacts réservations
CREATE INDEX idx_contacts_reservations_reservation ON contacts_reservations(reservation_id);
CREATE INDEX idx_contacts_reservations_date ON contacts_reservations(date_contact);

-- Réservations zones
CREATE INDEX idx_reservations_zones_reservation ON reservations_zones(reservation_id);
CREATE INDEX idx_reservations_zones_zone_tarifaire ON reservations_zones(zone_tarifaire_id);

-- Jeux festival
CREATE INDEX idx_jeux_festival_reservation ON jeux_festival(reservation_id);
CREATE INDEX idx_jeux_festival_jeu ON jeux_festival(jeu_id);
CREATE INDEX idx_jeux_festival_zone_plan ON jeux_festival(zone_plan_id);
CREATE INDEX idx_jeux_festival_est_place ON jeux_festival(est_place);
CREATE INDEX idx_jeux_festival_jeu_recu ON jeux_festival(jeu_recu);

-- Factures
CREATE INDEX idx_factures_reservation ON factures(reservation_id);
CREATE INDEX idx_factures_numero ON factures(numero_facture);
CREATE INDEX idx_factures_statut ON factures(statut_paiement);

-- Lignes facture
CREATE INDEX idx_lignes_facture_facture ON lignes_facture(facture_id);

-- =============================================
-- VUES UTILES 
-- =============================================

-- Vue : Tables disponibles par zone tarifaire
CREATE OR REPLACE VIEW vue_tables_disponibles_tarifaire AS
SELECT 
    zt.id,
    zt.festival_id,
    zt.nom,
    zt.nombre_tables_total as tables_totales,
    zt.nombre_tables_total - COALESCE(SUM(rz.nombre_tables), 0) as tables_disponibles,
    COALESCE(SUM(rz.nombre_tables), 0) as tables_reservees,
    zt.prix_table,
    zt.prix_m2
FROM zones_tarifaires zt
LEFT JOIN reservations_zones rz ON zt.id = rz.zone_tarifaire_id
LEFT JOIN reservations r ON rz.reservation_id = r.id
WHERE r.etat_contact IS NULL 
   OR r.etat_contact NOT IN ('absent', 'considere_absent')
GROUP BY zt.id, zt.festival_id, zt.nom, zt.nombre_tables_total, zt.prix_table, zt.prix_m2;

-- Vue : Tables disponibles par zone du plan
CREATE OR REPLACE VIEW vue_tables_disponibles_plan AS
SELECT 
    zp.id,
    zp.festival_id,
    zp.nom,
    zp.nombre_tables_total as tables_totales,
    zp.nombre_tables_total - COALESCE(SUM(jf.tables_allouees), 0) as tables_disponibles,
    COALESCE(SUM(jf.tables_allouees), 0) as tables_utilisees,
    COUNT(DISTINCT jf.jeu_id) as nb_jeux_places
FROM zones_plan zp
LEFT JOIN jeux_festival jf ON zp.id = jf.zone_plan_id
GROUP BY zp.id, zp.festival_id, zp.nom, zp.nombre_tables_total;

-- Vue : Stocks de tables par festival (décompte)
CREATE OR REPLACE VIEW vue_stocks_tables AS
SELECT 
    f.id as festival_id,
    f.nom as festival_nom,
    f.stock_tables_standard,
    f.stock_tables_grandes,
    f.stock_tables_mairie,
    COALESCE(SUM(jf.nb_tables_std), 0) as tables_std_utilisees,
    COALESCE(SUM(jf.nb_tables_gde), 0) as tables_gde_utilisees,
    COALESCE(SUM(jf.nb_tables_mairie), 0) as tables_mairie_utilisees,
    f.stock_tables_standard - COALESCE(SUM(jf.nb_tables_std), 0) as stock_std_restant,
    f.stock_tables_grandes - COALESCE(SUM(jf.nb_tables_gde), 0) as stock_gde_restant,
    f.stock_tables_mairie - COALESCE(SUM(jf.nb_tables_mairie), 0) as stock_mairie_restant
FROM festivals f
LEFT JOIN reservations r ON f.id = r.festival_id
LEFT JOIN jeux_festival jf ON r.id = jf.reservation_id
GROUP BY f.id, f.nom, f.stock_tables_standard, f.stock_tables_grandes, f.stock_tables_mairie;

-- Vue : Stocks de chaises par festival (avec calcul automatique selon type de table)
CREATE OR REPLACE VIEW vue_stocks_chaises AS
SELECT 
    f.id as festival_id,
    f.nom as festival_nom,
    f.stock_chaises_standard,
    f.stock_chaises_mairie,
    -- Calcul des chaises utilisées : std=4, gde=6, mairie=6
    COALESCE(SUM(jf.nb_tables_std * 4 + jf.nb_tables_gde * 6), 0) as chaises_std_utilisees,
    COALESCE(SUM(jf.nb_tables_mairie * 6), 0) as chaises_mairie_utilisees,
    f.stock_chaises_standard - COALESCE(SUM(jf.nb_tables_std * 4 + jf.nb_tables_gde * 6), 0) as stock_chaises_std_restant,
    f.stock_chaises_mairie - COALESCE(SUM(jf.nb_tables_mairie * 6), 0) as stock_chaises_mairie_restant
FROM festivals f
LEFT JOIN reservations r ON f.id = r.festival_id
LEFT JOIN jeux_festival jf ON r.id = jf.reservation_id
GROUP BY f.id, f.nom, f.stock_chaises_standard, f.stock_chaises_mairie;

-- Vue : Dashboard des festivals
CREATE OR REPLACE VIEW vue_festivals_dashboard AS
SELECT 
    f.id,
    f.nom,
    f.est_actif,
    f.est_courant,
    f.espace_tables_total,
    f.date_debut,
    f.date_fin,
    COUNT(DISTINCT zt.id) as nb_zones_tarifaires,
    COUNT(DISTINCT zp.id) as nb_zones_plan,
    COALESCE(SUM(zt.nombre_tables_total), 0) as tables_totales_tarifaires,
    COUNT(DISTINCT r.id) as nb_reservations_totales,
    COUNT(DISTINCT CASE WHEN r.etat_contact = 'reserve' THEN r.id END) as nb_reservations_confirmees,
    COUNT(DISTINCT CASE WHEN r.etat_contact IN ('liste_jeux_demandee', 'liste_jeux_obtenue', 'jeux_recus') THEN r.id END) as nb_reservations_avancees,
    COUNT(DISTINCT CASE WHEN r.etat_presence = 'present' THEN r.id END) as nb_presents,
    COUNT(DISTINCT CASE WHEN r.etat_presence = 'absent' THEN r.id END) as nb_absents,
    COUNT(DISTINCT fac.id) as nb_factures,
    COALESCE(SUM(fac.montant_total), 0) as montant_total_factures,
    COUNT(DISTINCT CASE WHEN fac.statut_paiement = 'paye' THEN fac.id END) as nb_factures_payees,
    COALESCE(SUM(CASE WHEN fac.statut_paiement = 'paye' THEN fac.montant_total ELSE 0 END), 0) as montant_paye
FROM festivals f
LEFT JOIN zones_tarifaires zt ON f.id = zt.festival_id
LEFT JOIN zones_plan zp ON f.id = zp.festival_id
LEFT JOIN reservations r ON f.id = r.festival_id
LEFT JOIN factures fac ON r.id = fac.reservation_id
GROUP BY f.id, f.nom, f.est_actif, f.est_courant, f.espace_tables_total, f.date_debut, f.date_fin;

-- Vue : Détail complet des réservations
CREATE OR REPLACE VIEW vue_reservations_detail AS
SELECT 
    r.id,
    r.festival_id,
    f.nom as festival_nom,
    r.reservant_id,
    res.nom as reservant_nom,
    res.type_reservant,
    res.editeur_id,
    e.nom as editeur_nom,
    r.etat_contact,
    r.etat_presence,
    r.date_dernier_contact,
    r.nb_prises_electriques,
    r.viendra_animer,
    r.remise_tables,
    r.remise_montant,
    r.notes,
    COUNT(DISTINCT cr.id) as nb_contacts,
    COALESCE(SUM(rz.nombre_tables), 0) as nb_tables_reservees,
    COALESCE(SUM(rz.nombre_tables * rz.prix_unitaire), 0) as montant_tables,
    (r.nb_prises_electriques * f.prix_prise_electrique) as montant_prises,
    COALESCE(SUM(rz.nombre_tables * rz.prix_unitaire), 0) + (r.nb_prises_electriques * f.prix_prise_electrique) as montant_brut,
    COUNT(DISTINCT jf.id) as nb_jeux,
    COUNT(DISTINCT CASE WHEN jf.est_place = true THEN jf.id END) as nb_jeux_places,
    COUNT(DISTINCT CASE WHEN jf.jeu_recu = true THEN jf.id END) as nb_jeux_recus
FROM reservations r
JOIN festivals f ON r.festival_id = f.id
JOIN reservants res ON r.reservant_id = res.id
LEFT JOIN editeurs e ON res.editeur_id = e.id
LEFT JOIN contacts_reservations cr ON r.id = cr.reservation_id
LEFT JOIN reservations_zones rz ON r.id = rz.reservation_id
LEFT JOIN jeux_festival jf ON r.id = jf.reservation_id
GROUP BY r.id, r.festival_id, f.nom, f.prix_prise_electrique,
         r.reservant_id, res.nom, res.type_reservant, res.editeur_id, e.nom,
         r.etat_contact, r.etat_presence, r.date_dernier_contact,
         r.nb_prises_electriques, r.viendra_animer, r.remise_tables, r.remise_montant, r.notes;

-- Vue : Récapitulatif pour facturation
CREATE OR REPLACE VIEW vue_recapitulatif_factures AS
SELECT 
    r.id as reservation_id,
    r.festival_id,
    f.nom as festival_nom,
    res.nom as reservant_nom,
    res.type_reservant,
    r.etat_contact,
    r.etat_presence,
    vrd.montant_tables,
    vrd.montant_prises,
    vrd.montant_brut,
    r.remise_tables,
    r.remise_montant,
    -- Calcul de la remise en tables (prix moyen)
    CASE 
        WHEN r.remise_tables > 0 AND vrd.nb_tables_reservees > 0 THEN 
            (vrd.montant_tables / vrd.nb_tables_reservees) * r.remise_tables
        ELSE 0 
    END as remise_tables_montant,
    vrd.montant_brut - r.remise_montant - 
        CASE 
            WHEN r.remise_tables > 0 AND vrd.nb_tables_reservees > 0 THEN 
                (vrd.montant_tables / vrd.nb_tables_reservees) * r.remise_tables
            ELSE 0 
        END as montant_net,
    fac.numero_facture,
    fac.montant_tables as facture_montant_tables,
    fac.montant_prises as facture_montant_prises,
    fac.montant_brut as facture_montant_brut,
    fac.montant_remise as facture_montant_remise,
    fac.montant_total as facture_montant_total,
    fac.statut_paiement,
    fac.date_facture
FROM reservations r
JOIN festivals f ON r.festival_id = f.id
JOIN reservants res ON r.reservant_id = res.id
JOIN vue_reservations_detail vrd ON r.id = vrd.id
LEFT JOIN factures fac ON r.id = fac.reservation_id
WHERE r.etat_contact IN ('reserve', 'liste_jeux_demandee', 'liste_jeux_obtenue', 'jeux_recus');

-- Vue : Jeux publics (pour visiteurs)
CREATE OR REPLACE VIEW vue_jeux_publics AS
SELECT DISTINCT
    j.id as jeu_id,
    j.nom as jeu_nom,
    j.type_jeu,
    j.age_mini,
    j.age_maxi,
    j.joueurs_mini,
    j.joueurs_maxi,
    j.duree_moyenne,
    j.taille_table,
    e.id as editeur_id,
    e.nom as editeur_nom,
    STRING_AGG(DISTINCT a.nom || COALESCE(' ' || a.prenom, ''), ', ' ORDER BY a.nom) as auteurs,
    f.id as festival_id,
    f.nom as festival_nom,
    zp.id as zone_plan_id,
    zp.nom as zone_plan_nom,
    res.nom as presente_par,
    jf.nombre_exemplaires
FROM jeux j
JOIN editeurs e ON j.editeur_id = e.id
LEFT JOIN jeux_auteurs ja ON j.id = ja.jeu_id
LEFT JOIN auteurs a ON ja.auteur_id = a.id
JOIN jeux_festival jf ON j.id = jf.jeu_id
JOIN reservations r ON jf.reservation_id = r.id
JOIN festivals f ON r.festival_id = f.id
JOIN reservants res ON r.reservant_id = res.id
LEFT JOIN zones_plan zp ON jf.zone_plan_id = zp.id
WHERE jf.est_place = true
GROUP BY j.id, j.nom, j.type_jeu, j.age_mini, j.age_maxi, j.joueurs_mini, j.joueurs_maxi,
         j.duree_moyenne, j.taille_table, e.id, e.nom,
         f.id, f.nom, zp.id, zp.nom, res.nom, jf.nombre_exemplaires;

-- Vue : Liste des éditeurs représentés au festival (avec leurs jeux)
CREATE OR REPLACE VIEW vue_editeurs_festival AS
SELECT DISTINCT
    f.id as festival_id,
    f.nom as festival_nom,
    e.id as editeur_id,
    e.nom as editeur_nom,
    COUNT(DISTINCT jf.jeu_id) as nb_jeux_presentes,
    COUNT(DISTINCT res.id) as nb_reservants_pour_editeur
FROM festivals f
JOIN reservations r ON f.id = r.festival_id
JOIN jeux_festival jf ON r.id = jf.reservation_id
JOIN jeux j ON jf.jeu_id = j.id
JOIN editeurs e ON j.editeur_id = e.id
JOIN reservants res ON r.reservant_id = res.id
GROUP BY f.id, f.nom, e.id, e.nom;

-- Vue : Jeux non placés (pour suivi du placement)
CREATE OR REPLACE VIEW vue_jeux_non_places AS
SELECT 
    jf.id,
    jf.reservation_id,
    r.festival_id,
    f.nom as festival_nom,
    res.nom as reservant_nom,
    j.nom as jeu_nom,
    j.editeur_id,
    e.nom as editeur_nom,
    jf.nombre_exemplaires,
    jf.tables_allouees,
    jf.jeu_recu
FROM jeux_festival jf
JOIN reservations r ON jf.reservation_id = r.id
JOIN festivals f ON r.festival_id = f.id
JOIN reservants res ON r.reservant_id = res.id
JOIN jeux j ON jf.jeu_id = j.id
JOIN editeurs e ON j.editeur_id = e.id
WHERE jf.est_place = false
ORDER BY f.nom, res.nom, j.nom;

-- =============================================
-- FONCTIONS UTILES
-- =============================================

-- Fonction : Calculer le prix d'une réservation
CREATE OR REPLACE FUNCTION calculer_prix_reservation(p_reservation_id INTEGER)
RETURNS TABLE(
    montant_tables DECIMAL(10,2),
    montant_prises DECIMAL(10,2),
    montant_brut DECIMAL(10,2),
    remise_tables_montant DECIMAL(10,2),
    remise_montant DECIMAL(10,2),
    montant_net DECIMAL(10,2)
) AS $$
DECLARE
    v_montant_tables DECIMAL(10,2);
    v_montant_prises DECIMAL(10,2);
    v_remise_montant DECIMAL(10,2);
    v_remise_tables INTEGER;
    v_prix_table_moyen DECIMAL(10,2);
    v_remise_tables_montant DECIMAL(10,2);
    v_nb_tables INTEGER;
BEGIN
    -- Montant des tables
    SELECT COALESCE(SUM(rz.nombre_tables * rz.prix_unitaire), 0),
           COALESCE(SUM(rz.nombre_tables), 0)
    INTO v_montant_tables, v_nb_tables
    FROM reservations_zones rz
    WHERE rz.reservation_id = p_reservation_id;
    
    -- Montant des prises électriques
    SELECT r.nb_prises_electriques * f.prix_prise_electrique
    INTO v_montant_prises
    FROM reservations r
    JOIN festivals f ON r.festival_id = f.id
    WHERE r.id = p_reservation_id;
    
    -- Remises
    SELECT r.remise_montant, r.remise_tables
    INTO v_remise_montant, v_remise_tables
    FROM reservations r
    WHERE r.id = p_reservation_id;
    
    -- Prix moyen d'une table (pour calculer la remise en tables)
    IF v_remise_tables > 0 AND v_nb_tables > 0 THEN
        v_prix_table_moyen := v_montant_tables / v_nb_tables;
        v_remise_tables_montant := v_remise_tables * v_prix_table_moyen;
    ELSE
        v_remise_tables_montant := 0;
    END IF;
    
    RETURN QUERY SELECT 
        v_montant_tables,
        v_montant_prises,
        v_montant_tables + v_montant_prises,
        v_remise_tables_montant,
        v_remise_montant,
        GREATEST(v_montant_tables + v_montant_prises - v_remise_tables_montant - v_remise_montant, 0);
END;
$$ LANGUAGE plpgsql;

-- Fonction : Vérifier si assez de tables disponibles dans une zone tarifaire
CREATE OR REPLACE FUNCTION verifier_disponibilite_tables(
    p_zone_tarifaire_id INTEGER,
    p_nombre_tables INTEGER,
    p_reservation_id INTEGER DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_tables_disponibles INTEGER;
BEGIN
    SELECT tables_disponibles INTO v_tables_disponibles
    FROM vue_tables_disponibles_tarifaire
    WHERE id = p_zone_tarifaire_id;
    
    -- Si modification d'une réservation existante, rajouter les tables actuelles
    IF p_reservation_id IS NOT NULL THEN
        v_tables_disponibles := v_tables_disponibles + COALESCE(
            (SELECT nombre_tables FROM reservations_zones 
             WHERE reservation_id = p_reservation_id 
             AND zone_tarifaire_id = p_zone_tarifaire_id),
            0
        );
    END IF;
    
    RETURN v_tables_disponibles >= p_nombre_tables;
END;
$$ LANGUAGE plpgsql;

-- Fonction : Vérifier que les jeux placés ne dépassent pas les tables réservées
CREATE OR REPLACE FUNCTION verifier_allocation_jeux(p_reservation_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    v_tables_reservees INTEGER;
    v_tables_allouees DECIMAL;
BEGIN
    -- Tables réservées
    SELECT COALESCE(SUM(nombre_tables), 0) INTO v_tables_reservees
    FROM reservations_zones WHERE reservation_id = p_reservation_id;
    
    -- Tables allouées aux jeux
    SELECT COALESCE(SUM(tables_allouees), 0) INTO v_tables_allouees
    FROM jeux_festival WHERE reservation_id = p_reservation_id;
    
    RETURN v_tables_allouees <= v_tables_reservees;
END;
$$ LANGUAGE plpgsql;

-- Fonction : Créer ou mettre à jour une facture automatiquement
CREATE OR REPLACE FUNCTION upsert_facture(p_reservation_id INTEGER)
RETURNS INTEGER AS $
DECLARE
    v_facture_id INTEGER;
    v_numero_facture VARCHAR(100);
    v_prix RECORD;
BEGIN
    -- Calculer les montants
    SELECT * INTO v_prix FROM calculer_prix_reservation(p_reservation_id);
    
    -- Vérifier si facture existe
    SELECT id INTO v_facture_id FROM factures WHERE reservation_id = p_reservation_id;
    
    IF v_facture_id IS NULL THEN
        -- Générer numéro de facture
        SELECT 'FAC-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || 
               LPAD(NEXTVAL('factures_id_seq')::TEXT, 6, '0')
        INTO v_numero_facture;
        
        -- Créer la facture
        INSERT INTO factures (
            reservation_id, 
            numero_facture, 
            montant_tables, 
            montant_prises,
            montant_brut,
            montant_remise,
            montant_total
        ) VALUES (
            p_reservation_id, 
            v_numero_facture, 
            v_prix.montant_tables,
            v_prix.montant_prises,
            v_prix.montant_brut,
            v_prix.remise_tables_montant + v_prix.remise_montant,
            v_prix.montant_net
        ) RETURNING id INTO v_facture_id;
    ELSE
        -- Mettre à jour la facture
        UPDATE factures SET
            montant_tables = v_prix.montant_tables,
            montant_prises = v_prix.montant_prises,
            montant_brut = v_prix.montant_brut,
            montant_remise = v_prix.remise_tables_montant + v_prix.remise_montant,
            montant_total = v_prix.montant_net,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = v_facture_id;
    END IF;
    
    RETURN v_facture_id;
END;
$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS
-- =============================================

-- Fonction pour mettre à jour les timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger : S'assurer qu'un seul festival est courant
CREATE OR REPLACE FUNCTION ensure_single_festival_courant()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.est_courant = true THEN
        UPDATE festivals SET est_courant = false WHERE id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_single_festival_courant
BEFORE INSERT OR UPDATE ON festivals
FOR EACH ROW
WHEN (NEW.est_courant = true)
EXECUTE FUNCTION ensure_single_festival_courant();

-- Trigger : Vérifier stock de tables (avertissement seulement, pas de blocage)
CREATE OR REPLACE FUNCTION check_stock_tables()
RETURNS TRIGGER AS $$
DECLARE
    v_stock_std INTEGER;
    v_stock_gde INTEGER;
    v_stock_mairie INTEGER;
    v_total_std INTEGER;
    v_total_gde INTEGER;
    v_total_mairie INTEGER;
BEGIN
    -- Récupérer les stocks du festival
    SELECT stock_tables_standard, stock_tables_grandes, stock_tables_mairie
    INTO v_stock_std, v_stock_gde, v_stock_mairie
    FROM festivals f
    JOIN reservations r ON f.id = r.festival_id
    WHERE r.id = NEW.reservation_id;
    
    -- Calculer le total utilisé
    SELECT 
        COALESCE(SUM(nb_tables_std), 0),
        COALESCE(SUM(nb_tables_gde), 0),
        COALESCE(SUM(nb_tables_mairie), 0)
    INTO v_total_std, v_total_gde, v_total_mairie
    FROM jeux_festival
    WHERE reservation_id IN (
        SELECT id FROM reservations WHERE festival_id = (
            SELECT festival_id FROM reservations WHERE id = NEW.reservation_id
        )
    );
    
    -- Ajouter les nouvelles tables (si INSERT, sinon soustraire les anciennes)
    IF TG_OP = 'INSERT' THEN
        v_total_std := v_total_std + NEW.nb_tables_std;
        v_total_gde := v_total_gde + NEW.nb_tables_gde;
        v_total_mairie := v_total_mairie + NEW.nb_tables_mairie;
    ELSE
        v_total_std := v_total_std - OLD.nb_tables_std + NEW.nb_tables_std;
        v_total_gde := v_total_gde - OLD.nb_tables_gde + NEW.nb_tables_gde;
        v_total_mairie := v_total_mairie - OLD.nb_tables_mairie + NEW.nb_tables_mairie;
    END IF;
    
    -- Autoriser les stocks négatifs mais avertir
    IF v_total_std > v_stock_std THEN
        RAISE NOTICE 'ATTENTION: Stock de tables standard dépassé (utilisées: %, stock: %)', 
            v_total_std, v_stock_std;
    END IF;
    
    IF v_total_gde > v_stock_gde THEN
        RAISE NOTICE 'ATTENTION: Stock de grandes tables dépassé (utilisées: %, stock: %)', 
            v_total_gde, v_stock_gde;
    END IF;
    
    IF v_total_mairie > v_stock_mairie THEN
        RAISE NOTICE 'ATTENTION: Stock de tables mairie dépassé (utilisées: %, stock: %)', 
            v_total_mairie, v_stock_mairie;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_stock_tables
BEFORE INSERT OR UPDATE ON jeux_festival
FOR EACH ROW
WHEN (NEW.nb_tables_std > 0 OR NEW.nb_tables_gde > 0 OR NEW.nb_tables_mairie > 0)
EXECUTE FUNCTION check_stock_tables();

-- Trigger : Vérifier que les jeux placés ne dépassent pas l'espace réservé
CREATE OR REPLACE FUNCTION trigger_check_tables_allouees()
RETURNS TRIGGER AS $$
DECLARE
    v_tables_reservees INTEGER;
    v_tables_allouees DECIMAL;
BEGIN
    -- Tables réservées pour cette réservation
    SELECT COALESCE(SUM(nombre_tables), 0) INTO v_tables_reservees
    FROM reservations_zones WHERE reservation_id = NEW.reservation_id;
    
    -- Tables déjà allouées aux jeux (sauf le jeu actuel si UPDATE)
    SELECT COALESCE(SUM(tables_allouees), 0) INTO v_tables_allouees
    FROM jeux_festival 
    WHERE reservation_id = NEW.reservation_id
    AND (TG_OP = 'INSERT' OR id != NEW.id);
    
    -- Ajouter les nouvelles tables
    v_tables_allouees := v_tables_allouees + NEW.tables_allouees;
    
    -- Vérifier
    IF v_tables_allouees > v_tables_reservees THEN
        RAISE EXCEPTION 'Les tables allouées aux jeux (%) dépassent les tables réservées (%) pour cette réservation', 
            v_tables_allouees, v_tables_reservees;
    END IF;
    
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_tables_allouees
BEFORE INSERT OR UPDATE ON jeux_festival
FOR EACH ROW
EXECUTE FUNCTION trigger_check_tables_allouees();

-- Trigger : Vérifier que la zone du plan appartient au bon festival
CREATE OR REPLACE FUNCTION trigger_check_zone_plan_festival()
RETURNS TRIGGER AS $
DECLARE
    v_festival_id_reservation INTEGER;
    v_festival_id_zone_plan INTEGER;
BEGIN
    IF NEW.zone_plan_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Récupérer le festival de la réservation
    SELECT festival_id INTO v_festival_id_reservation
    FROM reservations WHERE id = NEW.reservation_id;
    
    -- Récupérer le festival de la zone du plan
    SELECT festival_id INTO v_festival_id_zone_plan
    FROM zones_plan WHERE id = NEW.zone_plan_id;
    
    -- Vérifier la correspondance
    IF v_festival_id_reservation != v_festival_id_zone_plan THEN
        RAISE EXCEPTION 'La zone du plan doit appartenir au même festival que la réservation';
    END IF;
    
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_zone_plan_festival
BEFORE INSERT OR UPDATE ON jeux_festival
FOR EACH ROW
EXECUTE FUNCTION trigger_check_zone_plan_festival();

-- Trigger : Empêcher la suppression d'un éditeur qui a déjà présenté des jeux
CREATE OR REPLACE FUNCTION trigger_prevent_editeur_deletion()
RETURNS TRIGGER AS $
DECLARE
    v_count INTEGER;
BEGIN
    -- Vérifier si l'éditeur a déjà des jeux dans des festivals
    SELECT COUNT(*) INTO v_count
    FROM jeux_festival jf
    JOIN jeux j ON jf.jeu_id = j.id
    WHERE j.editeur_id = OLD.id;
    
    IF v_count > 0 THEN
        RAISE EXCEPTION 'Impossible de supprimer cet éditeur : % jeu(x) ont déjà été présenté(s) dans des festivals', v_count;
    END IF;
    
    RETURN OLD;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_editeur_deletion
BEFORE DELETE ON editeurs
FOR EACH ROW
EXECUTE FUNCTION trigger_prevent_editeur_deletion();

-- Trigger : Empêcher la suppression d'une zone tarifaire avec des réservations
CREATE OR REPLACE FUNCTION trigger_prevent_zone_tarifaire_deletion()
RETURNS TRIGGER AS $
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM reservations_zones WHERE zone_tarifaire_id = OLD.id;
    
    IF v_count > 0 THEN
        RAISE EXCEPTION 'Impossible de supprimer cette zone tarifaire : % réservation(s) existe(nt)', v_count;
    END IF;
    
    RETURN OLD;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_zone_tarifaire_deletion
BEFORE DELETE ON zones_tarifaires
FOR EACH ROW
EXECUTE FUNCTION trigger_prevent_zone_tarifaire_deletion();

-- Trigger : Mettre à jour la date de dernier contact automatiquement
CREATE OR REPLACE FUNCTION trigger_update_dernier_contact()
RETURNS TRIGGER AS $
BEGIN
    UPDATE reservations 
    SET date_dernier_contact = NEW.date_contact,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.reservation_id;
    
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_dernier_contact
AFTER INSERT ON contacts_reservations
FOR EACH ROW
EXECUTE FUNCTION trigger_update_dernier_contact();

-- Application des triggers de mise à jour des timestamps
CREATE TRIGGER update_festivals_updated_at 
BEFORE UPDATE ON festivals 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_zones_tarifaires_updated_at 
BEFORE UPDATE ON zones_tarifaires 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_zones_plan_updated_at 
BEFORE UPDATE ON zones_plan 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservants_updated_at 
BEFORE UPDATE ON reservants 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_editeurs_updated_at 
BEFORE UPDATE ON editeurs 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jeux_updated_at 
BEFORE UPDATE ON jeux 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at 
BEFORE UPDATE ON reservations 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jeux_festival_updated_at 
BEFORE UPDATE ON jeux_festival 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_factures_updated_at 
BEFORE UPDATE ON factures 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at 
BEFORE UPDATE ON users 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_reservants_updated_at 
BEFORE UPDATE ON contacts_reservants 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();
