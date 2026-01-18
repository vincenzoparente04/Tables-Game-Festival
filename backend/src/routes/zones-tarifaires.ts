import { Router } from 'express'
import pool from '../db/database.js';
import { requireActivatedAccount, requirePermission } from '../middleware/roles.js';

const router = Router()

// ----------------------------------------
// Liste des zones tarifaires d'un festival
// ----------------------------------------
router.get('/festival/:festivalId', requireActivatedAccount(), requirePermission('zonesTarifaires', 'view'),
    async (req, res) => {
      const { festivalId } = req.params;
      try {
        // on utilise la vue qui calcule déjà tables_disponibles, tables_reservees
        // La vue filtre automatiquement les reservations absentes/considerees absentes
        const result = await pool.query(`
          SELECT 
            id,
            festival_id,
            nom,
            tables_totales as nombre_tables_total,
            tables_disponibles,
            tables_reservees,
            prix_table,
            prix_m2
          FROM vue_tables_disponibles_tarifaire 
          WHERE festival_id = $1
          ORDER BY nom
        `, [festivalId]);
        
        res.json(result.rows);
      } catch (error) {
        console.error('Erreur récupération zones tarifaires:', error);
        res.status(500).json({ error: 'Erreur serveur' });
      }
    }
)

// -----------------------------
// Détail d'une zone tarifaire
// -----------------------------
router.get('/:id',requireActivatedAccount(), requirePermission('zonesTarifaires', 'view'),
    async (req, res) => {
      const { id } = req.params;
      try {
        const result = await pool.query(
          'SELECT * FROM zones_tarifaires WHERE id = $1',
          [id]
        );
        
        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Zone tarifaire introuvable' });
        }
        
        res.json(result.rows[0]);
      } catch (error) {
        console.error('Erreur récupération zone tarifaire:', error);
        res.status(500).json({ error: 'Erreur serveur' });
      }
    }
);

// ------------------------------------------------
// POST : Créer une zone tarifaire pour un festival
// ------------------------------------------------
router.post('/festival/:festivalId', requireActivatedAccount(), requirePermission('zonesTarifaires', 'create'),
    async (req, res) => {
      const { festivalId } = req.params;
      const { nom, nombre_tables_total, prix_table, prix_m2 } = req.body;
      
      if (!nom || nombre_tables_total === undefined || prix_table === undefined) {
        return res.status(400).json({ 
          error: 'nom, nombre_tables_total et prix_table sont requis' 
        });
      }

      // Vérifier que le festival existe
      const festivalCheck = await pool.query(
        'SELECT id FROM festivals WHERE id = $1',
        [festivalId]
      );
      
      if (festivalCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Festival introuvable' });
      }

      const calculatedPrixM2 = prix_m2 !== undefined ? prix_m2 : (prix_table / 4.5);

      try {
        const result = await pool.query(
          `INSERT INTO zones_tarifaires 
           (festival_id, nom, nombre_tables_total, prix_table, prix_m2)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [festivalId, nom, nombre_tables_total, prix_table, calculatedPrixM2]
        );
        
        res.status(201).json(result.rows[0]);
      } catch (error: any) {
        if (error.code === '23505') { 
          return res.status(400).json({ 
            error: 'Une zone tarifaire avec ce nom existe déjà pour ce festival' 
          });
        }
        console.error('Erreur création zone tarifaire:', error);
        res.status(500).json({ error: 'Erreur serveur' });
      }
    }
);

// -----------------------------------
// PATCH : Modifier une zone tarifaire
// -----------------------------------
router.patch('/:id', requireActivatedAccount(), requirePermission('zonesTarifaires', 'update'),
    async (req, res) => {
      const { id } = req.params;
      const updates = req.body;

      delete updates.festival_id;
      delete updates.id;
      delete updates.created_at;

      // Vérifier si la zone a des réservations
      try {
        const reservationCheck = await pool.query(
          `SELECT COUNT(*) as count FROM reservations_zones WHERE zone_tarifaire_id = $1`,
          [id]
        );

        if (parseInt(reservationCheck.rows[0].count) > 0) {
          return res.status(400).json({ 
            error: 'Cette zone tarifaire est utilisée par des réservations existantes. Impossible de la modifier. Créez une nouvelle zone tarifaire avec les tarifs souhaités.' 
          });
        }
      } catch (error) {
        console.error('Erreur vérification réservations:', error);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      const fields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      // pour generer automatiquement la requete sql (cf en dessous)
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
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
        const result = await pool.query(
          `UPDATE zones_tarifaires 
           SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $${paramCount} 
           RETURNING *`,
          values
        );

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Zone tarifaire non trouvée' });
        }

        res.json(result.rows[0]);
      } catch (error: any) {
        if (error.code === '23505') {
          return res.status(400).json({ 
            error: 'Une zone tarifaire avec ce nom existe déjà pour ce festival' 
          });
        }
        console.error('Erreur modification zone tarifaire:', error);
        res.status(500).json({ error: 'Erreur serveur' });
      }
    }
);

// -------------------------------------
// DELETE : Supprimer une zone tarifaire
// -------------------------------------
router.delete('/:id', requireActivatedAccount(), requirePermission('zonesTarifaires', 'delete'),
    async (req, res) => {
      const { id } = req.params;
      
      try {
        // Le trigger prevent_zone_tarifaire_deletion empêche la suppression si des réservations existent
        const result = await pool.query(
          'DELETE FROM zones_tarifaires WHERE id = $1 RETURNING *',
          [id]
        );
        
        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Zone tarifaire introuvable' });
        }
        
        res.json({ 
          message: 'Zone tarifaire supprimée', 
          zone: result.rows[0] 
        });
      } catch (error: any) {
        // Le trigger lance une exception si des réservations existent
        if (error.message && error.message.includes('réservation')) {
          return res.status(400).json({ 
            error: 'Impossible de supprimer : des réservations existent pour cette zone' 
          });
        }
        console.error('Erreur suppression zone tarifaire:', error);
        res.status(500).json({ error: 'Erreur serveur' });
      }
    }
);

export default router;



