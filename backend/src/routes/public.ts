import { Router } from 'express'
import pool from '../db/database.js'
import { requireActivatedAccount } from '../middleware/roles.js'
import { requirePermission } from '../middleware/roles.js'

const router = Router()

router.get('/', (_req, res) => {
    res.json({ message: 'Bienvenue sur l’API publique (accès libre)' })
})
/*
 * -----------------------------
 *  Jeux du festival courant (vue publique) - GET /public/jeux/festival-courant
 * ---------------------------- 
 */
router.get('/jeux/festival-courant', requireActivatedAccount(),requirePermission('jeux', 'viewPublic'), async (req, res) => {
  try {
    const query = `
        SELECT *
        FROM vue_jeux_publics v
        WHERE v.festival_id = (
            SELECT id FROM festivals WHERE est_courant = true LIMIT 1
        )
        ORDER BY v.jeu_nom;
    `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur jeux festival courant (public):', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/editeurs/festival-courant', requireActivatedAccount(), requirePermission('jeux', 'viewPublic'), async (_req, res) => {
    try {
      const query = `
        SELECT *
        FROM vue_editeurs_festival v
        WHERE v.festival_id = (
          SELECT id FROM festivals WHERE est_courant = true LIMIT 1
        )
        ORDER BY v.editeur_nom;
      `;

      const result = await pool.query(query);
      res.json(result.rows);
    } catch (error) {
      console.error('Erreur éditeurs festival courant (public):', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

export default router

