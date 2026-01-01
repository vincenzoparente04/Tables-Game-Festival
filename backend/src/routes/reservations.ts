import { Router } from 'express';
import pool from '../db/database.js';
import { requireActivatedAccount, requirePermission } from '../middleware/roles.js';

const router = Router();

// ============================================
//  Liste des réservations d'un festival
// ============================================
router.get('/festival/:festivalId', requireActivatedAccount(), requirePermission('reservations', 'view'),
  async (req, res) => {
    const { festivalId } = req.params;
    
    try {
      const result = await pool.query(`
        SELECT * FROM vue_reservations_detail
        WHERE festival_id = $1
        ORDER BY created_at DESC
      `, [festivalId]);

      res.json(result.rows);
    } catch (error) {
      console.error('Erreur récupération réservations:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// ============================================
//  Détail d'une réservation
// ============================================
router.get('/:id',requireActivatedAccount(),requirePermission('reservations', 'view'),
  async (req, res) => {
    const { id } = req.params;
    
    try {
      // Infos principales
      const resResult = await pool.query(`
        SELECT * FROM vue_reservations_detail WHERE id = $1
      `, [id]);

      if (resResult.rows.length === 0) {
        return res.status(404).json({ error: 'Réservation non trouvée' });
      }

      const reservation = resResult.rows[0];

      // Contacts/relances
      const contactsResult = await pool.query(`
        SELECT * FROM contacts_reservations
        WHERE reservation_id = $1
        ORDER BY date_contact DESC
      `, [id]);

      // Zones réservées
      const zonesResult = await pool.query(`
        SELECT 
          rz.*,
          zt.nom as zone_tarifaire_nom
        FROM reservations_zones rz
        JOIN zones_tarifaires zt ON rz.zone_tarifaire_id = zt.id
        WHERE rz.reservation_id = $1
      `, [id]);

      // Jeux
      const jeuxResult = await pool.query(`
        SELECT 
          jf.*,
          j.nom as jeu_nom,
          e.nom as editeur_nom,
          zp.nom as zone_plan_nom
        FROM jeux_festival jf
        JOIN jeux j ON jf.jeu_id = j.id
        JOIN editeurs e ON j.editeur_id = e.id
        LEFT JOIN zones_plan zp ON jf.zone_plan_id = zp.id
        WHERE jf.reservation_id = $1
        ORDER BY j.nom
      `, [id]);

      res.json({
        ...reservation,
        contacts: contactsResult.rows,
        zones_reservees: zonesResult.rows,
        jeux: jeuxResult.rows
      });
    } catch (error) {
      console.error('Erreur détail réservation:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// ============================================
//  Créer une réservation
// ============================================
router.post('/festival/:festivalId',requireActivatedAccount(),requirePermission('reservations', 'create'),
  async (req, res) => {
    const { festivalId } = req.params;
    const {
      reservant_id,
      etat_contact = 'pas_contacte',
      etat_presence = 'non_defini',
      nb_prises_electriques = 0,
      notes,
      viendra_animer = true,
      zones_reservees = []
    } = req.body;

    if (!reservant_id) {
      return res.status(400).json({ error: 'reservant_id est requis' });
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Vérifier que le réservant existe
      const reservantCheck = await client.query(
        'SELECT id FROM reservants WHERE id = $1',
        [reservant_id]
      );

      if (reservantCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Réservant non trouvé' });
      }

      // Créer la réservation
      const resResult = await client.query(`
        INSERT INTO reservations (
          festival_id, 
          reservant_id, 
          etat_contact, 
          etat_presence,
          nb_prises_electriques,
          notes,
          viendra_animer
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [festivalId, reservant_id, etat_contact, etat_presence, nb_prises_electriques, notes, viendra_animer]);

      const reservation = resResult.rows[0];

      // Ajouter les zones réservées
      for (const zone of zones_reservees) {
        if (!zone.zone_tarifaire_id || !zone.nombre_tables) continue;

        // Récupérer le prix de la zone
        const zoneInfo = await client.query(
          'SELECT prix_table FROM zones_tarifaires WHERE id = $1',
          [zone.zone_tarifaire_id]
        );

        if (zoneInfo.rows.length === 0) continue;

        const prix_unitaire = zone.prix_unitaire || zoneInfo.rows[0].prix_table;

        await client.query(`
          INSERT INTO reservations_zones (
            reservation_id,
            zone_tarifaire_id,
            nombre_tables,
            prix_unitaire
          ) VALUES ($1, $2, $3, $4)
        `, [reservation.id, zone.zone_tarifaire_id, zone.nombre_tables, prix_unitaire]);
      }

      await client.query('COMMIT');

      // Retourner le détail complet
      const detail = await pool.query(`
        SELECT * FROM vue_reservations_detail WHERE id = $1
      `, [reservation.id]);

      res.status(201).json(detail.rows[0]);
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Erreur création réservation:', error);
      
      if (error.code === '23505') {
        return res.status(400).json({ 
          error: 'Une réservation existe déjà pour ce réservant sur ce festival' 
        });
      }

      res.status(500).json({ error: 'Erreur serveur' });
    } finally {
      client.release();
    }
  }
);

// ============================================
//  Mettre à jour une réservation
// ============================================
router.patch('/:id',requireActivatedAccount(),requirePermission('reservations', 'update'),
  async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    const allowedFields = [
      'etat_contact',
      'etat_presence',
      'nb_prises_electriques',
      'remise_tables',
      'remise_montant',
      'notes',
      'viendra_animer'
    ];

    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
    }

    values.push(id);

    try {
      const result = await pool.query(`
        UPDATE reservations
        SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount}
        RETURNING *
      `, values);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Réservation non trouvée' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Erreur modification réservation:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// ============================================
//  Supprimer une réservation
// ============================================
router.delete('/:id',requireActivatedAccount(),requirePermission('reservations', 'delete'),
  async (req, res) => {
    const { id } = req.params;
    
    try {
      const result = await pool.query(
        'DELETE FROM reservations WHERE id = $1 RETURNING id',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Réservation non trouvée' });
      }

      res.json({ message: 'Réservation supprimée' });
    } catch (error) {
      console.error('Erreur suppression réservation:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// ============================================
//  WORKFLOW - Ajouter un contact/relance
// ============================================
router.post('/:id/contacts',requireActivatedAccount(),requirePermission('reservations', 'updateWorkflow'),
  async (req, res) => {
    const { id } = req.params;
    const { date_contact, type_contact, notes } = req.body;

    try {
      const result = await pool.query(`
        INSERT INTO contacts_reservations (
          reservation_id,
          date_contact,
          type_contact,
          notes
        ) VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [id, date_contact || new Date().toISOString(), type_contact, notes]);

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Erreur ajout contact:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// ============================================
//  WORKFLOW - Mettre à jour l'état de contact
// ============================================
router.patch('/:id/workflow/contact',requireActivatedAccount(),requirePermission('reservations', 'updateWorkflow'),
  async (req, res) => {
    const { id } = req.params;
    const { etat_contact } = req.body;

    if (!etat_contact) {
      return res.status(400).json({ error: 'etat_contact requis' });
    }

    try {
      const result = await pool.query(`
        UPDATE reservations
        SET etat_contact = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `, [etat_contact, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Réservation non trouvée' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Erreur mise à jour workflow contact:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// ============================================
//  WORKFLOW - Mettre à jour l'état de présence
// ============================================
router.patch('/:id/workflow/presence',requireActivatedAccount(),requirePermission('reservations', 'updateWorkflow'),
  async (req, res) => {
    const { id } = req.params;
    const { etat_presence } = req.body;

    if (!etat_presence) {
      return res.status(400).json({ error: 'etat_presence requis' });
    }

    try {
      const result = await pool.query(`
        UPDATE reservations
        SET etat_presence = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `, [etat_presence, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Réservation non trouvée' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Erreur mise à jour workflow présence:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// ============================================
//  JEUX - Ajouter un jeu à la réservation
// ============================================
router.post('/:id/jeux',requireActivatedAccount(),requirePermission('reservations', 'update'),
  async (req, res) => {
    const { id } = req.params;
    const { jeu_id, nombre_exemplaires = 1, tables_allouees = 1 } = req.body;

    if (!jeu_id) {
      return res.status(400).json({ error: 'jeu_id requis' });
    }

    try {
      const result = await pool.query(`
        INSERT INTO jeux_festival (
          reservation_id,
          jeu_id,
          nombre_exemplaires,
          tables_allouees
        ) VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [id, jeu_id, nombre_exemplaires, tables_allouees]);

      res.status(201).json(result.rows[0]);
    } catch (error: any) {
      console.error('Erreur ajout jeu:', error);
      
      if (error.message && error.message.includes('dépassent')) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// ============================================
//  JEUX - Retirer un jeu de la réservation
// ============================================
router.delete('/:id/jeux/:jeuFestivalId',requireActivatedAccount(), requirePermission('reservations', 'update'),
  async (req, res) => {
    const { id, jeuFestivalId } = req.params;

    try {
      const result = await pool.query(`
        DELETE FROM jeux_festival
        WHERE id = $1 AND reservation_id = $2
        RETURNING id
      `, [jeuFestivalId, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Jeu non trouvé dans cette réservation' });
      }

      res.json({ message: 'Jeu retiré' });
    } catch (error) {
      console.error('Erreur suppression jeu:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// ============================================
//  JEUX - Marquer comme reçu
// ============================================
router.patch('/:id/jeux/:jeuFestivalId/recu',requireActivatedAccount(),requirePermission('reservations', 'update'),
  async (req, res) => {
    const { id, jeuFestivalId } = req.params;
    const { jeu_recu } = req.body;

    try {
      const result = await pool.query(`
        UPDATE jeux_festival
        SET jeu_recu = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND reservation_id = $3
        RETURNING *
      `, [jeu_recu, jeuFestivalId, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Jeu non trouvé' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Erreur mise à jour jeu reçu:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// ============================================
//  RÉCAPITULATIF pour facturation
// ============================================
router.get('/festival/:festivalId/recapitulatif',requireActivatedAccount(),requirePermission('factures', 'view'),
  async (req, res) => {
    const { festivalId } = req.params;

    try {
      const result = await pool.query(`
        SELECT * FROM vue_recapitulatif_factures
        WHERE festival_id = $1
        ORDER BY reservant_nom
      `, [festivalId]);

      res.json(result.rows);
    } catch (error) {
      console.error('Erreur récapitulatif:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// ============================================
//  GÉNÉRER une facture
// ============================================
router.post('/:id/facture',requireActivatedAccount(),requirePermission('factures', 'create'),
  async (req, res) => {
    const { id } = req.params;

    try {
      const result = await pool.query(
        'SELECT upsert_facture($1) as facture_id',
        [id]
      );

      const factureId = result.rows[0].facture_id;

      const facture = await pool.query(
        'SELECT * FROM factures WHERE id = $1',
        [factureId]
      );

      res.json(facture.rows[0]);
    } catch (error) {
      console.error('Erreur génération facture:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

export default router;