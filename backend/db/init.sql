

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    login TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE festivals (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(255) UNIQUE NOT NULL,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    est_actif BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des zones tarifaires 
CREATE TABLE zones_tarifaires (
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
CREATE TABLE editeurs (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des contacts des éditeurs
CREATE TABLE contacts_editeurs (
    id SERIAL PRIMARY KEY,
    editeur_id INTEGER NOT NULL REFERENCES editeurs(id) ON DELETE CASCADE,
    nom VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    telephone VARCHAR(20),
    role VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des jeux (catalogue général)
CREATE TABLE jeux (
    id SERIAL PRIMARY KEY,
    editeur_id INTEGER NOT NULL REFERENCES editeurs(id) ON DELETE CASCADE,
    nom VARCHAR(255) NOT NULL,
    auteur VARCHAR(255),
    type_jeu VARCHAR(100),
    age_mini INTEGER CHECK (age_mini >= 0),
    age_maxi INTEGER CHECK (age_maxi >= 0),
    duree_moyenne INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- WORKFLOW ET RÉSERVATIONS
-- =============================================

-- Table des réservations principales
CREATE TABLE reservations (
    id SERIAL PRIMARY KEY,
    festival_id INTEGER NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
    editeur_id INTEGER NOT NULL REFERENCES editeurs(id) ON DELETE CASCADE,
    etat_reservation VARCHAR(50) NOT NULL DEFAULT 'pas_contact',
    date_dernier_contact TIMESTAMP,
    remise_tables INTEGER DEFAULT 0 CHECK (remise_tables >= 0),
    remise_montant DECIMAL(10,2) DEFAULT 0 CHECK (remise_montant >= 0),
    type_participation VARCHAR(50) DEFAULT 'presente_jeux',
    liste_jeux_demandee BOOLEAN DEFAULT false,
    liste_jeux_recue BOOLEAN DEFAULT false,
    jeux_recus BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(festival_id, editeur_id)
);

-- Table des contacts/relances
CREATE TABLE contacts_reservations (
    id SERIAL PRIMARY KEY,
    reservation_id INTEGER NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    date_contact TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    type_contact VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Détail des tables réservées par zone tarifaire
CREATE TABLE reservations_zones (
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
CREATE TABLE zones_plan (
    id SERIAL PRIMARY KEY,
    festival_id INTEGER NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
    zone_tarifaire_id INTEGER NOT NULL REFERENCES zones_tarifaires(id) ON DELETE CASCADE,
    nom VARCHAR(100) NOT NULL,
    nombre_tables_total INTEGER NOT NULL CHECK (nombre_tables_total >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(festival_id, nom)
);

-- Table des jeux présentés au festival
CREATE TABLE jeux_festival (
    id SERIAL PRIMARY KEY,
    reservation_id INTEGER NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    jeu_id INTEGER NOT NULL REFERENCES jeux(id) ON DELETE CASCADE,
    zone_plan_id INTEGER REFERENCES zones_plan(id),
    nombre_exemplaires INTEGER DEFAULT 1 CHECK (nombre_exemplaires >= 1),
    tables_allouees DECIMAL(5,2) DEFAULT 1 CHECK (tables_allouees > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(reservation_id, jeu_id)
);

-- =============================================
-- FACTURATION
-- =============================================

-- Table des factures
CREATE TABLE factures (
    id SERIAL PRIMARY KEY,
    reservation_id INTEGER NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    numero_facture VARCHAR(100) UNIQUE NOT NULL,
    date_facture DATE NOT NULL DEFAULT CURRENT_DATE,
    montant_total DECIMAL(10,2) NOT NULL CHECK (montant_total >= 0),
    montant_remise DECIMAL(10,2) DEFAULT 0 CHECK (montant_remise >= 0),
    statut_paiement VARCHAR(50) DEFAULT 'non_paye',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lignes de facture détaillées
CREATE TABLE lignes_facture (
    id SERIAL PRIMARY KEY,
    facture_id INTEGER NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantite INTEGER NOT NULL CHECK (quantite > 0),
    prix_unitaire DECIMAL(10,2) NOT NULL CHECK (prix_unitaire >= 0),
    montant_ligne DECIMAL(10,2) NOT NULL CHECK (montant_ligne >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Paiements reçus
CREATE TABLE paiements (
    id SERIAL PRIMARY KEY,
    facture_id INTEGER NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
    montant DECIMAL(10,2) NOT NULL CHECK (montant > 0),
    date_paiement DATE NOT NULL DEFAULT CURRENT_DATE,
    mode_paiement VARCHAR(50),
    reference VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- INDEX POUR LES PERFORMANCES
-- =============================================

CREATE INDEX idx_festivals_nom ON festivals(nom);
CREATE INDEX idx_festivals_actif ON festivals(est_actif);
CREATE INDEX idx_editeurs_nom ON editeurs(nom);
CREATE INDEX idx_jeux_nom ON jeux(nom);
CREATE INDEX idx_jeux_editeur ON jeux(editeur_id);
CREATE INDEX idx_reservations_festival ON reservations(festival_id);
CREATE INDEX idx_reservations_editeur ON reservations(editeur_id);
CREATE INDEX idx_reservations_etat ON reservations(etat_reservation);
CREATE INDEX idx_zones_tarifaires_festival ON zones_tarifaires(festival_id);
CREATE INDEX idx_zones_plan_festival ON zones_plan(festival_id);
CREATE INDEX idx_factures_reservation ON factures(reservation_id);
CREATE INDEX idx_contacts_editeur ON contacts_editeurs(editeur_id);

-- =============================================
-- VUES UTILES 
-- =============================================

-- Vue : Tables disponibles par zone tarifaire (CALCUL AUTOMATIQUE)
CREATE VIEW vue_tables_disponibles AS
SELECT 
    zt.id,
    zt.festival_id,
    zt.nom,
    zt.nombre_tables_total,
    zt.nombre_tables_total - COALESCE(SUM(rz.nombre_tables), 0) as tables_disponibles,
    COALESCE(SUM(rz.nombre_tables), 0) as tables_reservees
FROM zones_tarifaires zt
LEFT JOIN reservations_zones rz ON zt.id = rz.zone_tarifaire_id
LEFT JOIN reservations r ON rz.reservation_id = r.id
WHERE r.etat_reservation IS NULL 
   OR r.etat_reservation NOT IN ('sera_absent', 'considere_absent')
GROUP BY zt.id, zt.festival_id, zt.nom, zt.nombre_tables_total;

-- Vue : Dashboard des festivals
CREATE VIEW vue_festivals_dashboard AS
SELECT 
    f.id,
    f.nom,
    f.est_actif,
    COUNT(DISTINCT zt.id) as nombre_zones,
    COALESCE(SUM(zt.nombre_tables_total), 0) as tables_totales,
    COALESCE(SUM(vtd.tables_disponibles), 0) as tables_disponibles,
    COUNT(DISTINCT r.id) as nombre_reservations,
    COUNT(DISTINCT CASE WHEN r.etat_reservation = 'present' THEN r.id END) as reservations_confirmees
FROM festivals f
LEFT JOIN zones_tarifaires zt ON f.id = zt.festival_id
LEFT JOIN vue_tables_disponibles vtd ON zt.id = vtd.id
LEFT JOIN reservations r ON f.id = r.festival_id
GROUP BY f.id, f.nom, f.est_actif;

-- Vue : Détail des réservations (CORRIGÉ : avec remise_tables)
CREATE VIEW vue_reservations_detail AS
SELECT 
    r.id,
    r.festival_id,
    r.editeur_id,
    r.etat_reservation,
    r.date_dernier_contact,
    r.remise_tables,
    r.remise_montant,
    e.nom as editeur_nom,
    f.nom as festival_nom,
    COUNT(DISTINCT cr.id) as nombre_contacts,
    COALESCE(SUM(rz.nombre_tables), 0) as tables_totales_reservees,
    COALESCE(SUM(rz.nombre_tables * rz.prix_unitaire), 0) as montant_brut,
    COALESCE(
        SUM(rz.nombre_tables * rz.prix_unitaire) 
        - r.remise_montant
        - (r.remise_tables * CASE 
            WHEN COUNT(rz.id) > 0 THEN AVG(rz.prix_unitaire) 
            ELSE 0 
        END),
        0
    ) as montant_net,
    COALESCE(SUM(rz.nombre_tables), 0) - r.remise_tables as tables_facturees
FROM reservations r
JOIN editeurs e ON r.editeur_id = e.id
JOIN festivals f ON r.festival_id = f.id
LEFT JOIN contacts_reservations cr ON r.id = cr.reservation_id
LEFT JOIN reservations_zones rz ON r.id = rz.reservation_id
GROUP BY r.id, r.festival_id, r.editeur_id, r.etat_reservation, 
         r.date_dernier_contact, r.remise_tables, r.remise_montant, 
         e.nom, f.nom;

-- Vue : Tables disponibles par zone du plan
CREATE VIEW vue_tables_plan_disponibles AS
SELECT 
    zp.id,
    zp.festival_id,
    zp.nom,
    zp.nombre_tables_total,
    zp.nombre_tables_total - COALESCE(SUM(jf.tables_allouees), 0) as tables_disponibles,
    COALESCE(SUM(jf.tables_allouees), 0) as tables_utilisees
FROM zones_plan zp
LEFT JOIN jeux_festival jf ON zp.id = jf.zone_plan_id
GROUP BY zp.id, zp.festival_id, zp.nom, zp.nombre_tables_total;

-- =============================================
-- FONCTIONS UTILES
-- =============================================

-- Fonction : Vérifier si assez de tables disponibles
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
    FROM vue_tables_disponibles
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

-- Fonction : Calculer le prix d'une réservation
CREATE OR REPLACE FUNCTION calculer_prix_reservation(p_reservation_id INTEGER)
RETURNS TABLE(
    montant_brut DECIMAL(10,2),
    remise_tables_montant DECIMAL(10,2),
    remise_montant DECIMAL(10,2),
    montant_net DECIMAL(10,2)
) AS $$
DECLARE
    v_montant_brut DECIMAL(10,2);
    v_remise_montant DECIMAL(10,2);
    v_remise_tables INTEGER;
    v_prix_table_moyen DECIMAL(10,2);
    v_remise_tables_montant DECIMAL(10,2);
BEGIN
    -- Montant brut
    SELECT COALESCE(SUM(rz.nombre_tables * rz.prix_unitaire), 0)
    INTO v_montant_brut
    FROM reservations_zones rz
    WHERE rz.reservation_id = p_reservation_id;
    
    -- Remises
    SELECT r.remise_montant, r.remise_tables
    INTO v_remise_montant, v_remise_tables
    FROM reservations r
    WHERE r.id = p_reservation_id;
    
    -- Prix moyen d'une table (pour calculer la remise en tables)
    IF v_remise_tables > 0 THEN
        SELECT COALESCE(AVG(rz.prix_unitaire), 0)
        INTO v_prix_table_moyen
        FROM reservations_zones rz
        WHERE rz.reservation_id = p_reservation_id;
        
        v_remise_tables_montant := v_remise_tables * v_prix_table_moyen;
    ELSE
        v_remise_tables_montant := 0;
    END IF;
    
    RETURN QUERY SELECT 
        v_montant_brut,
        v_remise_tables_montant,
        v_remise_montant,
        GREATEST(v_montant_brut - v_remise_tables_montant - v_remise_montant, 0);
END;
$$ LANGUAGE plpgsql;

-- Fonction : Vérifier que les jeux ne dépassent pas les tables réservées
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
$$ language 'plpgsql';

-- Application des triggers
CREATE TRIGGER update_festivals_updated_at BEFORE UPDATE ON festivals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_zones_tarifaires_updated_at BEFORE UPDATE ON zones_tarifaires FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_editeurs_updated_at BEFORE UPDATE ON editeurs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_jeux_updated_at BEFORE UPDATE ON jeux FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON reservations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_zones_plan_updated_at BEFORE UPDATE ON zones_plan FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_factures_updated_at BEFORE UPDATE ON factures FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();