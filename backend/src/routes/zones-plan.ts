import { Router } from 'express'
import pool from '../db/database.js';
import { requireActivatedAccount, requirePermission } from '../middleware/roles.js';

const router = Router()

// Liste des zones plan d'un festival
router.get('/festival/:festivalId', requireActivatedAccount(), requirePermission('zonesPlan','view'), 
    async(req, res) => {
        const {festivalId} = req.params;
        try {
            const result = await pool.query(`
                SELECT * FROM vue_tables_disponibles_plan 
                WHERE festival_id = $1
                ORDER BY nom
            `, [festivalId]);
      
            res.json(result.rows);
        } catch (error) {
            console.error('Erreur récupération zones plan:', error);
            res.status(500).json({ error: 'Erreur serveur' });
        }

    }
);

// Détail d'une zone plan
router.get('/:id', requireActivatedAccount(), requirePermission('zonesPlan', 'view'),
  async (req, res) => {
    const { id } = req.params;
    try {
      const result = await pool.query(
        'SELECT * FROM zones_plan WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Zone plan introuvable' });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Erreur récupération zone plan:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// Créer une zone plan
router.post('/festival/:festivalId', requireActivatedAccount(), requirePermission('zonesPlan', 'create'),
  async (req, res) => {
    const { festivalId } = req.params;
    const { nom, nombre_tables_total } = req.body;
    
    if (!nom || nombre_tables_total === undefined) {
      return res.status(400).json({ 
        error: 'nom et nombre_tables_total sont requis' 
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

    try {
      const result = await pool.query(
        `INSERT INTO zones_plan 
         (festival_id, nom, nombre_tables_total)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [festivalId, nom, nombre_tables_total]
      );
      
      res.status(201).json(result.rows[0]);
    } catch (error: any) {
      if (error.code === '23505') {
        return res.status(400).json({ 
          error: 'Une zone avec ce nom existe déjà pour ce festival' 
        });
      }
      console.error('Erreur création zone plan:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// Modifier une zone plan
router.patch('/:id', requireActivatedAccount(), requirePermission('zonesPlan', 'update'),
  async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    delete updates.festival_id;
    delete updates.id;
    delete updates.created_at;

    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

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
        `UPDATE zones_plan 
         SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $${paramCount} 
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Zone plan non trouvée' });
      }

      res.json(result.rows[0]);
    } catch (error: any) {
      if (error.code === '23505') {
        return res.status(400).json({ 
          error: 'Une zone avec ce nom existe déjà pour ce festival' 
        });
      }
      console.error('Erreur modification zone plan:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// Supprimer une zone plan
router.delete('/:id', requireActivatedAccount(), requirePermission('zonesPlan', 'delete'),
  async (req, res) => {
    const { id } = req.params;
    
    try {
      // Vérifier si des jeux sont placés dans cette zone
      const jeuxCheck = await pool.query(
        'SELECT COUNT(*) FROM jeux_festival WHERE zone_plan_id = $1',
        [id]
      );
      
      if (parseInt(jeuxCheck.rows[0].count) > 0) {
        return res.status(400).json({ 
          error: 'Impossible de supprimer : des jeux sont placés dans cette zone' 
        });
      }
      
      const result = await pool.query(
        'DELETE FROM zones_plan WHERE id = $1 RETURNING *',
        [id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Zone plan introuvable' });
      }
      
      res.json({ 
        message: 'Zone plan supprimée', 
        zone: result.rows[0] 
      });
    } catch (error) {
      console.error('Erreur suppression zone plan:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// ============================================
// JEUX ET PLACEMENT
// ============================================

// Récupérer les jeux d'une zone plan
router.get('/:zoneId/jeux', requireActivatedAccount(), requirePermission('zonesPlan', 'view'),
  async (req, res) => {
    const { zoneId } = req.params;
    try {
      const result = await pool.query(`
        SELECT 
          jf.id,
          jf.reservation_id,
          jf.jeu_id,
          j.nom as jeu_nom,
          e.nom as editeur_nom,
          jf.zone_plan_id,
          zp.nom as zone_plan_nom,
          jf.nombre_exemplaires,
          jf.tables_allouees,
          jf.nb_tables_std,
          jf.nb_tables_gde,
          jf.nb_tables_mairie,
          jf.jeu_recu,
          jf.est_place
        FROM jeux_festival jf
        JOIN jeux j ON jf.jeu_id = j.id
        JOIN editeurs e ON j.editeur_id = e.id
        LEFT JOIN zones_plan zp ON jf.zone_plan_id = zp.id
        WHERE jf.zone_plan_id = $1
        ORDER BY j.nom
      `, [zoneId]);
      
      res.json(result.rows);
    } catch (error) {
      console.error('Erreur récupération jeux zone:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// Récupérer les jeux non placés d'un festival
router.get('/festival/:festivalId/jeux-non-places', requireActivatedAccount(), requirePermission('jeux', 'place'),
  async (req, res) => {
    const { festivalId } = req.params;
    try {
      const result = await pool.query(`
        SELECT 
          jf.id,
          jf.reservation_id,
          jf.jeu_id,
          j.nom as jeu_nom,
          e.nom as editeur_nom,
          jf.zone_plan_id,
          jf.nombre_exemplaires,
          jf.tables_allouees,
          jf.nb_tables_std,
          jf.nb_tables_gde,
          jf.nb_tables_mairie,
          jf.jeu_recu,
          jf.est_place
        FROM jeux_festival jf
        JOIN reservations r ON jf.reservation_id = r.id
        JOIN jeux j ON jf.jeu_id = j.id
        JOIN editeurs e ON j.editeur_id = e.id
        WHERE r.festival_id = $1
          AND jf.est_place = false
        ORDER BY j.nom
      `, [festivalId]);
      
      res.json(result.rows);
    } catch (error) {
      console.error('Erreur récupération jeux non placés:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// Placer un jeu dans une zone
router.patch('/jeux/:jeuFestivalId/placer', requireActivatedAccount(), requirePermission('jeux', 'place'),
  async (req, res) => {
    const { jeuFestivalId } = req.params;
    const { zone_plan_id, nb_tables_std, nb_tables_gde, nb_tables_mairie } = req.body;
    
    if (!zone_plan_id) {
      return res.status(400).json({ error: 'zone_plan_id est requis' });
    }

    try {
      // Vérifier que le jeu et la zone appartiennent au même festival
      const checkResult = await pool.query(`
        SELECT 
          jf.id,
          r.festival_id as jeu_festival_id,
          zp.festival_id as zone_festival_id
        FROM jeux_festival jf
        JOIN reservations r ON jf.reservation_id = r.id
        CROSS JOIN zones_plan zp
        WHERE jf.id = $1 AND zp.id = $2
      `, [jeuFestivalId, zone_plan_id]);
      
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Jeu ou zone introuvable' });
      }
      
      if (checkResult.rows[0].jeu_festival_id !== checkResult.rows[0].zone_festival_id) {
        return res.status(400).json({ 
          error: 'Le jeu et la zone doivent appartenir au même festival' 
        });
      }

      const result = await pool.query(
        `UPDATE jeux_festival 
         SET zone_plan_id = $1,
             nb_tables_std = $2,
             nb_tables_gde = $3,
             nb_tables_mairie = $4,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $5
         RETURNING *`,
        [zone_plan_id, nb_tables_std || 0, nb_tables_gde || 0, nb_tables_mairie || 0, jeuFestivalId]
      );

      res.json(result.rows[0]);
    } catch (error: any) {
      if (error.message && error.message.includes('dépassent')) {
        return res.status(400).json({ error: error.message });
      }
      console.error('Erreur placement jeu:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// Retirer un jeu d'une zone
router.patch('/jeux/:jeuFestivalId/retirer', requireActivatedAccount(), requirePermission('jeux', 'place'),
  async (req, res) => {
    const { jeuFestivalId } = req.params;
    
    try {
      const result = await pool.query(
        `UPDATE jeux_festival 
         SET zone_plan_id = NULL,
             nb_tables_std = 0,
             nb_tables_gde = 0,
             nb_tables_mairie = 0,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [jeuFestivalId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Jeu introuvable' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Erreur retrait jeu:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);





























export default router;