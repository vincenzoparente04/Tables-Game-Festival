import { Router } from 'express'
import pool from '../db/database.js';
import { requireActivatedAccount, requirePermission } from '../middleware/roles.js';

const router = Router()

// -----------------------------
// Liste des festivals (dashboard)
// -----------------------------
router.get('/',requireActivatedAccount(), requirePermission('festivals', 'viewAll'),
    async (req, res) => {
      try {
        const result = await pool.query(`
          SELECT * FROM vue_festivals_dashboard 
          ORDER BY est_courant DESC, created_at DESC
        `);
        res.json(result.rows);
      } catch (error) {
        console.error('Erreur recuperation festivals:', error);
        res.status(500).json({ error: 'Erreur serveur' });
      }
    }
  );


router.get('/courant',requireActivatedAccount(), requirePermission('festivals', 'viewCurrent'),
    async (req, res) => {
      try {
        const result = await pool.query(
          'SELECT * FROM vue_festivals_dashboard WHERE est_courant = true LIMIT 1'
        );
        
        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Aucun festival courant défini' });
        }

        res.json(result.rows[0]);
      } catch (error) {
        console.error('Erreur récupération festival courant:', error);
        res.status(500).json({ error: 'Erreur serveur' });
      }
    }
);


// -----------------------------
// Détail d’un festival
// -----------------------------
router.get('/:id', requireActivatedAccount(), requirePermission('festivals', 'viewCurrent'), async (req, res) => {
    const festivalId = req.params.id;
    try {
        const result = await pool.query(`
            SELECT * FROM festivals WHERE id = $1
        `, [festivalId]);

        if (result.rows.length === 0) return res.status(404).json({ error: 'Festival introuvable' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur', details: (err as Error).message });
    }
});


// -----------------------------
// POST : Créer un festival
// -----------------------------
router.post('/', requireActivatedAccount(), requirePermission('festivals', 'create'), async (req, res) => {
    const { nom, espace_tables_total, date_debut, date_fin, description,
            stock_tables_standard, stock_tables_grandes, stock_tables_mairie,
            stock_chaises_standard, stock_chaises_mairie, prix_prise_electrique,
            est_actif, est_courant } = req.body;
    
    if (!nom || !espace_tables_total) {
        return res.status(400).json({ 
          error: 'Nom et espace_tables_total sont requis' 
        });
    }

    if (espace_tables_total < 1) {
        return res.status(400).json({ 
          error: 'espace_tables_total doit être supérieur à 0' 
        });
    }

    try {
        const result = await pool.query(
            `INSERT INTO festivals 
             (nom, espace_tables_total, date_debut, date_fin, description,
              stock_tables_standard, stock_tables_grandes, stock_tables_mairie,
              stock_chaises_standard, stock_chaises_mairie, prix_prise_electrique,
              est_actif, est_courant)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
             RETURNING *`,
            [nom, espace_tables_total, date_debut, date_fin, description || null,
             stock_tables_standard || 0, stock_tables_grandes || 0, stock_tables_mairie || 0,
             stock_chaises_standard || 0, stock_chaises_mairie || 0, prix_prise_electrique || 0,
             est_actif ?? true, est_courant ?? true]
        );
        res.status(201).json(result.rows[0]);
    } catch (error: any) {
        if (error.code === '23505') { 
          return res.status(400).json({ error: 'Ce nom de festival existe déjà' });
        }
        console.error('Erreur création festival:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }  
});

// -----------------------------
// PATCH : Modifier un festival
// -----------------------------
router.patch('/:id',requireActivatedAccount(), requirePermission('festivals', 'update'),
    async (req, res) => {
      const { id } = req.params;
      const updates = req.body;

      // Ne pas permettre de modifier directement est_courant via cette route
      delete updates.est_courant;
      delete updates.id;
      delete updates.created_at;

      // Construire la requête dynamiquement
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
          `UPDATE festivals 
           SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $${paramCount} 
           RETURNING *`,
          values
        );

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Festival non trouvé' });
        }

        // Retourner les données complètes de la vue dashboard
        const dashboardResult = await pool.query(
          `SELECT * FROM vue_festivals_dashboard WHERE id = $1`,
          [id]
        );

        res.json(dashboardResult.rows[0] || result.rows[0]);
      } catch (error: any) {
        if (error.code === '23505') {
          return res.status(400).json({ error: 'Ce nom de festival existe déjà' });
        }
        console.error('Erreur modification festival:', error);
        res.status(500).json({ error: 'Erreur serveur' });
      }
    }
  );

  // -------------------------------
  //  Définir comme festival courant
  // -------------------------------
  router.patch('/:id/set-courant',requireActivatedAccount(), requirePermission('festivals', 'setCourant'),
    async (req, res) => {
      const { id } = req.params;

      try {
        // Le trigger ensure_single_festival_courant gère l'unicité automatiquement
        const result = await pool.query(
          'UPDATE festivals SET est_courant = true WHERE id = $1 RETURNING *',
          [id]
        );

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Festival non trouvé' });
        }

        res.json(result.rows[0]);
      } catch (error) {
        console.error('Erreur définition festival courant:', error);
        res.status(500).json({ error: 'Erreur serveur' });
      }
    }
  );

// -----------------------------
// DELETE : Supprimer un festival
// -----------------------------
router.delete('/:id', requireActivatedAccount(), requirePermission('festivals', 'delete'), async (req, res) => {
    const festivalId = req.params.id;
    try {
        const result = await pool.query(
            `DELETE FROM festivals WHERE id = $1 RETURNING *`,
            [festivalId]
        );
        if (result.rowCount === 0) return res.status(404).json({ error: 'Festival introuvable' });
        res.json({ message: 'Festival supprimé', festival: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur', details: (err as Error).message });
    }
});

export default router;
