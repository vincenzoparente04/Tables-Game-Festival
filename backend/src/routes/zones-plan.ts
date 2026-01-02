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

    if (nombre_tables_total <= 0) {
      return res.status(400).json({ 
        error: 'Le nombre de tables doit être supérieur à 0' 
      });
    }

    try {
      // Vérifier que le festival existe et récupérer son nombre total de tables
      const festivalCheck = await pool.query(
        'SELECT espace_tables_total FROM festivals WHERE id = $1',
        [festivalId]
      );
      
      if (festivalCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Festival introuvable' });
      }

      const festivalTablesTotal = festivalCheck.rows[0].espace_tables_total;

      // Vérifier que le total des zones n'excède pas le total du festival
      const existingZonesCheck = await pool.query(
        'SELECT COALESCE(SUM(nombre_tables_total), 0) as tables_utilisees FROM zones_plan WHERE festival_id = $1',
        [festivalId]
      );

      const tablesUtilisees = parseInt(existingZonesCheck.rows[0].tables_utilisees, 10);
      const tablesDisponibles = festivalTablesTotal - tablesUtilisees;

      if (nombre_tables_total > tablesDisponibles) {
        return res.status(400).json({ 
          error: `Nombre de tables invalide. Disponible: ${tablesDisponibles}/${festivalTablesTotal}. Vous avez demandé: ${nombre_tables_total}` 
        });
      }

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

    // Si on modifie nombre_tables_total, valider
    if (updates.nombre_tables_total !== undefined) {
      if (updates.nombre_tables_total <= 0) {
        return res.status(400).json({ 
          error: 'Le nombre de tables doit être supérieur à 0' 
        });
      }

      try {
        // Récupérer la zone actuelle pour connaître le festival et l'ancienne valeur
        const zoneCheck = await pool.query(
          'SELECT festival_id, nombre_tables_total FROM zones_plan WHERE id = $1',
          [id]
        );

        if (zoneCheck.rows.length === 0) {
          return res.status(404).json({ error: 'Zone plan non trouvée' });
        }

        const { festival_id, nombre_tables_total: oldValue } = zoneCheck.rows[0];
        const newValue = updates.nombre_tables_total;
        const difference = newValue - oldValue;

        // Si on augmente, vérifier qu'il y a assez de place
        if (difference > 0) {
          const festivalCheck = await pool.query(
            'SELECT espace_tables_total FROM festivals WHERE id = $1',
            [festival_id]
          );

          const festivalTablesTotal = festivalCheck.rows[0].espace_tables_total;

          // Calculer les tables utilisées par les autres zones
          const otherZonesCheck = await pool.query(
            'SELECT COALESCE(SUM(nombre_tables_total), 0) as tables_utilisees FROM zones_plan WHERE festival_id = $1 AND id != $2',
            [festival_id, id]
          );

          const tablesUtiliseesByOthers = parseInt(otherZonesCheck.rows[0].tables_utilisees, 10);
          const tablesDisponibles = festivalTablesTotal - tablesUtiliseesByOthers;

          if (newValue > tablesDisponibles) {
            return res.status(400).json({ 
              error: `Nombre de tables invalide. Disponible: ${tablesDisponibles}/${festivalTablesTotal}. Vous avez demandé: ${newValue}` 
            });
          }
        }
      } catch (error) {
        console.error('Erreur validation zone plan:', error);
        return res.status(500).json({ error: 'Erreur serveur' });
      }
    }

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
          r.reservant_id,
          res.nom as reservant_nom,
          res.type_reservant,
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
        JOIN reservations r ON jf.reservation_id = r.id
        JOIN reservants res ON r.reservant_id = res.id
        LEFT JOIN zones_plan zp ON jf.zone_plan_id = zp.id
        WHERE jf.zone_plan_id = $1
        ORDER BY r.reservant_id, j.nom
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
          res.nom as reservant_nom,
          res.type_reservant,
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
        JOIN reservants res ON r.reservant_id = res.id
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
          jf.reservation_id,
          jf.nb_tables_std as old_std,
          jf.nb_tables_gde as old_gde,
          jf.nb_tables_mairie as old_mairie,
          jf.zone_plan_id as old_zone_id,
          jf.tables_allouees,
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
      
      const jeuData = checkResult.rows[0];
      if (jeuData.jeu_festival_id !== jeuData.zone_festival_id) {
        return res.status(400).json({ 
          error: 'Le jeu et la zone doivent appartenir au même festival' 
        });
      }

      // Calculer la différence de tables pour le décompte
      const newStd = nb_tables_std || 0;
      const newGde = nb_tables_gde || 0;
      const newMairie = nb_tables_mairie || 0;
      
      const oldStd = jeuData.old_std || 0;
      const oldGde = jeuData.old_gde || 0;
      const oldMairie = jeuData.old_mairie || 0;

      // Vérifier que le total de la réservation ne dépasse pas le budget réservé
      const budgetReservationCheck = await pool.query(`
        SELECT COALESCE(SUM(nombre_tables), 0) as budget_reservation
        FROM reservations_zones
        WHERE reservation_id = $1
      `, [jeuData.reservation_id]);

      const budgetReservation = parseInt(budgetReservationCheck.rows[0].budget_reservation) || 0;

      // Vérifier que le total des tables placées ne dépasse pas le budget
      const reservationCheck = await pool.query(`
        SELECT COALESCE(SUM(jf.nb_tables_std + jf.nb_tables_gde + jf.nb_tables_mairie), 0) as tables_utilisees_reservation
        FROM jeux_festival jf
        WHERE jf.reservation_id = $1 AND jf.id != $2
      `, [jeuData.reservation_id, jeuFestivalId]);

      const tablesUtiliseesReservation = parseInt(reservationCheck.rows[0].tables_utilisees_reservation) || 0;
      const nouvelleTotalReservation = tablesUtiliseesReservation + (newStd + newGde + newMairie);

      if (nouvelleTotalReservation > budgetReservation) {
        return res.status(400).json({ 
          error: `Dépassement du budget tables de la réservation. Budget: ${budgetReservation} tables, utilisées + demandées: ${nouvelleTotalReservation} tables` 
        });
      }

      // Vérifier que la zone peut accueillir ces tables
      const zoneCheck = await pool.query(`
        SELECT 
          zp.nombre_tables_total,
          COALESCE(SUM(jf.nb_tables_std + jf.nb_tables_gde + jf.nb_tables_mairie), 0) as tables_utilisees
        FROM zones_plan zp
        LEFT JOIN jeux_festival jf ON jf.zone_plan_id = zp.id AND jf.id != $1
        WHERE zp.id = $2
        GROUP BY zp.id, zp.nombre_tables_total
      `, [jeuFestivalId, zone_plan_id]);

      if (zoneCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Zone introuvable' });
      }

      const { nombre_tables_total, tables_utilisees } = zoneCheck.rows[0];
      const nouvelleTotalTables = (newStd + newGde + newMairie);
      const totalApresPlacement = parseInt(tables_utilisees) + nouvelleTotalTables;

      if (totalApresPlacement > nombre_tables_total) {
        return res.status(400).json({ 
          error: `Espace insuffisant dans la zone. Capacité: ${nombre_tables_total} tables, demandé: ${totalApresPlacement} tables` 
        });
      }
      // Mettre à jour le jeu_festival (ne pas modifier tables_allouees - c'est l'estimation originale)
      const result = await pool.query(
        `UPDATE jeux_festival 
         SET zone_plan_id = $1,
             nb_tables_std = $2,
             nb_tables_gde = $3,
             nb_tables_mairie = $4,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $5
         RETURNING *`,
        [zone_plan_id, newStd, newGde, newMairie, jeuFestivalId]
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
      // Récupérer le jeu et ses infos avant suppression
      const jeuCheck = await pool.query(
        `SELECT 
          jf.nb_tables_std,
          jf.nb_tables_gde,
          jf.nb_tables_mairie,
          r.festival_id
        FROM jeux_festival jf
        JOIN reservations r ON jf.reservation_id = r.id
        WHERE jf.id = $1`,
        [jeuFestivalId]
      );

      if (jeuCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Jeu introuvable' });
      }

      // Retirer le jeu
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

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Erreur retrait jeu:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);





export default router;