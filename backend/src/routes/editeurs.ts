import { Router } from 'express';
import pool from '../db/database.js';
import { requireRole, requireActivatedAccount, requirePermission } from '../middleware/roles.js';

const router = Router();

// GET /api/editeurs    Returns the list of editors with id, name, number of games, number of contacts
router.get('/', requireActivatedAccount(), requirePermission('festivals', 'viewAll'), async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        e.id,
        e.nom,
        COUNT(DISTINCT j.id) AS nb_jeux,
        COUNT(DISTINCT c.id) AS nb_contacts
      FROM editeurs e
      LEFT JOIN jeux j ON j.editeur_id = e.id
      LEFT JOIN reservants r ON r.editeur_id = e.id
      LEFT JOIN contacts_reservants c ON c.reservant_id = r.id
      GROUP BY e.id, e.nom
      ORDER BY e.nom;`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Erreur récupération éditeurs:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/editeurs/:id/jeux   Returns all games of an author
router.get('/:id/jeux', requireActivatedAccount(), requirePermission('festivals', 'viewAll'), async (req, res) => {
  const editeurId = req.params.id;
  try {
    const result = await pool.query(`
      SELECT * 
      FROM jeux j
      WHERE j.editeur_id = $1
      ORDER BY j.nom;`,
      [editeurId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Erreur récupération jeux éditeur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/editeurs/:id/contacts   Returns contacts linked to an editor
router.get('/:id/contacts', requireActivatedAccount(), requirePermission('festivals', 'viewAll'), async (req, res) => {
  const editeurId = req.params.id;
  try {
    const result = await pool.query(`
      SELECT
        c.id,
        c.nom,
        c.email,
        c.telephone,
        c.role_profession,
        r.id AS reservant_id,
        r.nom AS reservant_nom,
        r.type_reservant
      FROM reservants r
      LEFT JOIN contacts_reservants c ON c.reservant_id = r.id
      WHERE r.editeur_id = $1
      ORDER BY c.nom;`,
      [editeurId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Erreur récupération contacts éditeur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/*
 POST /api/editeurs    Create a new editor: 
    - insert a row in 'editeurs'
    - create a 'reservant' of type 'editeurs' linked to this editor
    - create one or more contacts in 'contacts_ reservants'
    good strategy to create a standard reservant for this new editor for future bookings

    - BEGIN
    - INSERT editeur
    - INSERT reservant
    - INSERT contatti
    - COMMIT
    ROLLBACK if something goes wrong
*/
router.post('/', requireActivatedAccount(), requirePermission('festivals', 'viewAll'), async (req, res) => {
  const { nom, contacts } = req.body as {
    nom?: string;
    contacts?: {
      nom: string;
      email?: string;
      telephone?: string;
      role_profession?: string;
    }[];
  };

  // name required
  if (!nom || nom.trim() === '') {
    return res.status(400).json({ error: "Le nom de l'éditeur est requis" });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Create the editor
    const editeurResult = await client.query(
      `INSERT INTO editeurs (nom)
      VALUES ($1)
      RETURNING id, nom;`,
      [nom.trim()]
    );
    const editeur = editeurResult.rows[0];

    // Create the reservant connected to this editor (type 'editeur')
    const reservantResult = await client.query(
      `INSERT INTO reservants (nom, type_reservant, editeur_id)
      VALUES ($1, 'editeur', $2)
      RETURNING id;`,
      [editeur.nom, editeur.id]
    );
    const reservantId = reservantResult.rows[0].id as number;

    // Contacts
    if (Array.isArray(contacts)) {
      for (const c of contacts) {
        // se il contatto non ha nome, lo ignoriamo
        if (!c || !c.nom || c.nom.trim() === '') continue;

        await client.query(
          `INSERT INTO contacts_reservants
            (reservant_id, nom, email, telephone, role_profession)
          VALUES ($1, $2, $3, $4, $5);`,
          [
            reservantId,
            c.nom.trim(),
            c.email || null,
            c.telephone || null,
            c.role_profession || null,
          ]
        );
      }
    }

    // Wait for complete process
    await client.query('COMMIT');

    // Returns info created
    res.status(201).json({
      editeur,
      reservant_id: reservantId,
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Erreur création éditeur:', error);

    // Name already used
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Un éditeur avec ce nom existe déjà' });
    }

    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    client.release();
  }
});

// PUT /api/editeurs/:id   Update editor
router.put('/:id', requireActivatedAccount(), requirePermission('festivals', 'viewAll'), async (req, res) => {
  const editeurId = req.params.id;
  const { nom, contacts } = req.body as {
    nom?: string;
    contacts?: {
      id?: number;
      nom: string;
      email?: string;
      telephone?: string;
      role_profession?: string;
    }[];
  };

  if (!nom || nom.trim() === '') {
    return res.status(400).json({ error: "Le nom de l'éditeur est requis" });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Update editor name
    const editeurResult = await client.query(
      `UPDATE editeurs SET nom = $1 WHERE id = $2 RETURNING id, nom;`,
      [nom.trim(), editeurId]
    );

    if (editeurResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "Éditeur non trouvé" });
    }

    const editeur = editeurResult.rows[0];

    // Get the reservant of this editor
    const reservantResult = await client.query(
      `SELECT id FROM reservants WHERE editeur_id = $1 AND type_reservant = 'editeur';`,
      [editeurId]
    );

    if (reservantResult.rows.length > 0) {
      const reservantId = reservantResult.rows[0].id;

      // Delete old contacts
      await client.query(
        `DELETE FROM contacts_reservants WHERE reservant_id = $1;`,
        [reservantId]
      );

      // Insert new contacts
      if (Array.isArray(contacts)) {
        for (const c of contacts) {
          if (!c || !c.nom || c.nom.trim() === '') continue;

          await client.query(
            `INSERT INTO contacts_reservants
              (reservant_id, nom, email, telephone, role_profession)
            VALUES ($1, $2, $3, $4, $5);`,
            [
              reservantId,
              c.nom.trim(),
              c.email || null,
              c.telephone || null,
              c.role_profession || null,
            ]
          );
        }
      }
    }

    await client.query('COMMIT');
    res.json(editeur);
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Erreur modification éditeur:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Un éditeur avec ce nom existe déjà' });
    }
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    client.release();
  }
});

// DELETE /api/editeurs/:id   Delete editor
router.delete('/:id', requireActivatedAccount(), requirePermission('festivals', 'viewAll'), async (req, res) => {
  const editeurId = req.params.id;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Delete all contacts linked to reservants of this editor
    await client.query(
      `DELETE FROM contacts_reservants WHERE reservant_id IN (
        SELECT id FROM reservants WHERE editeur_id = $1
      );`,
      [editeurId]
    );

    // Delete all reservants linked to this editor
    await client.query(
      `DELETE FROM reservants WHERE editeur_id = $1;`,
      [editeurId]
    );

    // Delete the editor
    const result = await client.query(
      `DELETE FROM editeurs WHERE id = $1 RETURNING id;`,
      [editeurId]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "Éditeur non trouvé" });
    }

    await client.query('COMMIT');
    res.status(200).json({ message: 'Éditeur supprimé avec succès' });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Erreur suppression éditeur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    client.release();
  }
});

export default router;
