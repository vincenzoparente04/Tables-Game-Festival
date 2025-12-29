import { Router } from 'express';
import pool from '../db/database.js';
import { requireRole, requireActivatedAccount, requirePermission } from '../middleware/roles.js';

const router = Router();

// GET /api/jeux - Get all games with authors
router.get('/', requireActivatedAccount(), requirePermission('festivals', 'viewAll'), async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        j.id,
        j.nom,
        j.editeur_id,
        e.nom as editeur_nom,
        j.type_jeu,
        j.age_mini,
        j.age_maxi,
        j.joueurs_mini,
        j.joueurs_maxi,
        j.taille_table,
        j.duree_moyenne,
        array_agg(json_build_object(
          'id', a.id,
          'nom', a.nom,
          'prenom', a.prenom
        )) FILTER (WHERE a.id IS NOT NULL) as auteurs
      FROM jeux j
      LEFT JOIN editeurs e ON j.editeur_id = e.id
      LEFT JOIN jeux_auteurs ja ON j.id = ja.jeu_id
      LEFT JOIN auteurs a ON ja.auteur_id = a.id
      GROUP BY j.id, j.nom, j.editeur_id, e.nom, j.type_jeu, j.age_mini, j.age_maxi, j.joueurs_mini, j.joueurs_maxi, j.taille_table, j.duree_moyenne
      ORDER BY j.nom;
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Erreur récupération jeux:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/jeux/:id - Get a specific game with authors
router.get('/:id', requireActivatedAccount(), requirePermission('festivals', 'viewAll'), async (req, res) => {
  const jeuId = req.params.id;
  try {
    const result = await pool.query(`
      SELECT
        j.id,
        j.nom,
        j.editeur_id,
        e.nom as editeur_nom,
        j.type_jeu,
        j.age_mini,
        j.age_maxi,
        j.joueurs_mini,
        j.joueurs_maxi,
        j.taille_table,
        j.duree_moyenne,
        array_agg(json_build_object(
          'id', a.id,
          'nom', a.nom,
          'prenom', a.prenom
        )) FILTER (WHERE a.id IS NOT NULL) as auteurs
      FROM jeux j
      LEFT JOIN editeurs e ON j.editeur_id = e.id
      LEFT JOIN jeux_auteurs ja ON j.id = ja.jeu_id
      LEFT JOIN auteurs a ON ja.auteur_id = a.id
      WHERE j.id = $1
      GROUP BY j.id, j.nom, j.editeur_id, e.nom, j.type_jeu, j.age_mini, j.age_maxi, j.joueurs_mini, j.joueurs_maxi, j.taille_table, j.duree_moyenne;
    `, [jeuId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Jeu non trouvé' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erreur récupération jeu:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/jeux - Create a new game
router.post('/', requireActivatedAccount(), requirePermission('festivals', 'viewAll'), async (req, res) => {
  const {
    nom,
    editeur_id,
    type_jeu,
    age_mini,
    age_maxi,
    joueurs_mini,
    joueurs_maxi,
    taille_table,
    duree_moyenne,
    auteurs,
  } = req.body as {
    nom?: string;
    editeur_id?: number;
    type_jeu?: string;
    age_mini?: number;
    age_maxi?: number;
    joueurs_mini?: number;
    joueurs_maxi?: number;
    taille_table?: string;
    duree_moyenne?: number;
    auteurs?: Array<{
      id?: number;
      nom: string;
      prenom?: string;
    }>;
  };

  // Validations
  if (!nom || nom.trim() === '') {
    return res.status(400).json({ error: 'Le nom du jeu est requis' });
  }

  if (!editeur_id) {
    return res.status(400).json({ error: 'L\'éditeur est requis' });
  }

  if (!Array.isArray(auteurs) || auteurs.length === 0) {
    return res.status(400).json({ error: 'Au moins un auteur est requis' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if editor exists
    const editeurCheck = await client.query(
      'SELECT id FROM editeurs WHERE id = $1',
      [editeur_id]
    );

    if (editeurCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Éditeur non trouvé' });
    }

    // Create the game
    const jeuResult = await client.query(
      `INSERT INTO jeux (nom, editeur_id, type_jeu, age_mini, age_maxi, joueurs_mini, joueurs_maxi, taille_table, duree_moyenne)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, nom, editeur_id, type_jeu, age_mini, age_maxi, joueurs_mini, joueurs_maxi, taille_table, duree_moyenne;`,
      [
        nom.trim(),
        editeur_id,
        type_jeu || null,
        age_mini || null,
        age_maxi || null,
        joueurs_mini || null,
        joueurs_maxi || null,
        taille_table || null,
        duree_moyenne || null,
      ]
    );

    const jeu = jeuResult.rows[0];
    const auteurIds: number[] = [];

    // Create or link authors
    for (const auteur of auteurs) {
      if (!auteur || !auteur.nom || auteur.nom.trim() === '') continue;

      let auteurId: number;

      // Check if author exists
      if (auteur.id) {
        auteurId = auteur.id;
      } else {
        // Create new author
        const auteurResult = await client.query(
          `INSERT INTO auteurs (nom, prenom)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING
           RETURNING id;`,
          [auteur.nom.trim(), auteur.prenom || null]
        );

        if (auteurResult.rows.length === 0) {
          // Author already exists, find it
          const existingAuteur = await client.query(
            'SELECT id FROM auteurs WHERE nom = $1 AND prenom = $2',
            [auteur.nom.trim(), auteur.prenom || null]
          );
          if (existingAuteur.rows.length > 0) {
            auteurId = existingAuteur.rows[0].id;
          } else {
            continue;
          }
        } else {
          auteurId = auteurResult.rows[0].id;
        }
      }

      auteurIds.push(auteurId);

      // Link author to game
      await client.query(
        `INSERT INTO jeux_auteurs (jeu_id, auteur_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING;`,
        [jeu.id, auteurId]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      jeu,
      auteur_ids: auteurIds,
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Erreur création jeu:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    client.release();
  }
});

// PUT /api/jeux/:id - Update a game
router.put('/:id', requireActivatedAccount(), requirePermission('festivals', 'viewAll'), async (req, res) => {
  const jeuId = req.params.id;
  const {
    nom,
    editeur_id,
    type_jeu,
    age_mini,
    age_maxi,
    joueurs_mini,
    joueurs_maxi,
    taille_table,
    duree_moyenne,
    auteurs,
  } = req.body as {
    nom?: string;
    editeur_id?: number;
    type_jeu?: string;
    age_mini?: number;
    age_maxi?: number;
    joueurs_mini?: number;
    joueurs_maxi?: number;
    taille_table?: string;
    duree_moyenne?: number;
    auteurs?: Array<{
      id?: number;
      nom: string;
      prenom?: string;
    }>;
  };

  if (!nom || nom.trim() === '') {
    return res.status(400).json({ error: 'Le nom du jeu est requis' });
  }

  if (!editeur_id) {
    return res.status(400).json({ error: 'L\'éditeur est requis' });
  }

  if (!Array.isArray(auteurs) || auteurs.length === 0) {
    return res.status(400).json({ error: 'Au moins un auteur est requis' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if editor exists
    const editeurCheck = await client.query(
      'SELECT id FROM editeurs WHERE id = $1',
      [editeur_id]
    );

    if (editeurCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Éditeur non trouvé' });
    }

    // Update game
    const jeuResult = await client.query(
      `UPDATE jeux 
       SET nom = $1, editeur_id = $2, type_jeu = $3, age_mini = $4, age_maxi = $5, 
           joueurs_mini = $6, joueurs_maxi = $7, taille_table = $8, duree_moyenne = $9
       WHERE id = $10
       RETURNING id, nom, editeur_id, type_jeu, age_mini, age_maxi, joueurs_mini, joueurs_maxi, taille_table, duree_moyenne;`,
      [
        nom.trim(),
        editeur_id,
        type_jeu || null,
        age_mini || null,
        age_maxi || null,
        joueurs_mini || null,
        joueurs_maxi || null,
        taille_table || null,
        duree_moyenne || null,
        jeuId,
      ]
    );

    if (jeuResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Jeu non trouvé' });
    }

    const jeu = jeuResult.rows[0];

    // Delete old authors
    await client.query('DELETE FROM jeux_auteurs WHERE jeu_id = $1;', [jeuId]);

    const auteurIds: number[] = [];

    // Create or link new authors
    for (const auteur of auteurs) {
      if (!auteur || !auteur.nom || auteur.nom.trim() === '') continue;

      let auteurId: number;

      if (auteur.id) {
        auteurId = auteur.id;
      } else {
        const auteurResult = await client.query(
          `INSERT INTO auteurs (nom, prenom)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING
           RETURNING id;`,
          [auteur.nom.trim(), auteur.prenom || null]
        );

        if (auteurResult.rows.length === 0) {
          const existingAuteur = await client.query(
            'SELECT id FROM auteurs WHERE nom = $1 AND prenom = $2',
            [auteur.nom.trim(), auteur.prenom || null]
          );
          if (existingAuteur.rows.length > 0) {
            auteurId = existingAuteur.rows[0].id;
          } else {
            continue;
          }
        } else {
          auteurId = auteurResult.rows[0].id;
        }
      }

      auteurIds.push(auteurId);

      await client.query(
        `INSERT INTO jeux_auteurs (jeu_id, auteur_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING;`,
        [jeu.id, auteurId]
      );
    }

    await client.query('COMMIT');

    res.json({
      jeu,
      auteur_ids: auteurIds,
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Erreur modification jeu:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    client.release();
  }
});

// DELETE /api/jeux/:id - Delete a game
router.delete('/:id', requireActivatedAccount(), requirePermission('festivals', 'viewAll'), async (req, res) => {
  const jeuId = req.params.id;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Delete authors association
    await client.query('DELETE FROM jeux_auteurs WHERE jeu_id = $1;', [jeuId]);

    // Delete game
    const result = await client.query('DELETE FROM jeux WHERE id = $1 RETURNING id;', [jeuId]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Jeu non trouvé' });
    }

    await client.query('COMMIT');
    res.status(200).json({ message: 'Jeu supprimé avec succès' });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Erreur suppression jeu:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    client.release();
  }
});

export default router;
