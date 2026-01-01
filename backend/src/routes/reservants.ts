import { Router } from 'express';
import pool from '../db/database.js';
import { requireActivatedAccount, requirePermission } from '../middleware/roles.js';

const router = Router();

// ============================================
//  Liste tous les réservants
// ============================================
router.get('/', requireActivatedAccount(), requirePermission('reservants', 'view'), 
  async (_req, res) => {
    try {
      const result = await pool.query(`
        SELECT 
          r.id,
          r.nom,
          r.type_reservant,
          r.editeur_id,
          e.nom as editeur_nom,
          COUNT(DISTINCT cr.id) as nb_contacts,
          COUNT(DISTINCT res.id) as nb_reservations,
          r.created_at,
          r.updated_at
        FROM reservants r
        LEFT JOIN editeurs e ON r.editeur_id = e.id
        LEFT JOIN contacts_reservants cr ON r.id = cr.reservant_id
        LEFT JOIN reservations res ON r.id = res.reservant_id
        GROUP BY r.id, r.nom, r.type_reservant, r.editeur_id, e.nom, r.created_at, r.updated_at
        ORDER BY r.nom
      `);

      res.json(result.rows);
    } catch (error) {
      console.error('Erreur récupération réservants:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// ============================================
//  Détail d'un réservant
// ============================================
router.get('/:id', requireActivatedAccount(), requirePermission('reservants', 'view'), 
  async (req, res) => {
    const { id } = req.params;
    
    try {
      const reservantResult = await pool.query(`
        SELECT 
          r.id,
          r.nom,
          r.type_reservant,
          r.editeur_id,
          e.nom as editeur_nom,
          r.created_at,
          r.updated_at
        FROM reservants r
        LEFT JOIN editeurs e ON r.editeur_id = e.id
        WHERE r.id = $1
      `, [id]);

      if (reservantResult.rows.length === 0) {
        return res.status(404).json({ error: 'Réservant non trouvé' });
      }

      const reservant = reservantResult.rows[0];

      // Contacts
      const contactsResult = await pool.query(`
        SELECT id, nom, email, telephone, role_profession, created_at
        FROM contacts_reservants
        WHERE reservant_id = $1
        ORDER BY nom
      `, [id]);

      // Historique des réservations
      const historiqueResult = await pool.query(`
        SELECT 
          res.id,
          f.id as festival_id,
          f.nom as festival_nom,
          f.date_debut,
          f.date_fin,
          res.etat_contact,
          res.etat_presence,
          COALESCE(SUM(rz.nombre_tables), 0) as nb_tables,
          COALESCE(SUM(rz.nombre_tables * rz.prix_unitaire), 0) as montant_total,
          res.created_at
        FROM reservations res
        JOIN festivals f ON res.festival_id = f.id
        LEFT JOIN reservations_zones rz ON res.id = rz.reservation_id
        WHERE res.reservant_id = $1
        GROUP BY res.id, f.id, f.nom, f.date_debut, f.date_fin, res.etat_contact, res.etat_presence, res.created_at
        ORDER BY f.date_debut DESC, res.created_at DESC
      `, [id]);

      res.json({
        ...reservant,
        contacts: contactsResult.rows,
        historique: historiqueResult.rows
      });
    } catch (error) {
      console.error('Erreur récupération détail réservant:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// ============================================
//  Contacts d'un réservant
// ============================================
router.get('/:id/contacts', requireActivatedAccount(), requirePermission('reservants', 'view'), 
  async (req, res) => {
    const { id } = req.params;
    
    try {
      const result = await pool.query(`
        SELECT id, nom, email, telephone, role_profession, created_at
        FROM contacts_reservants
        WHERE reservant_id = $1
        ORDER BY nom
      `, [id]);

      res.json(result.rows);
    } catch (error) {
      console.error('Erreur récupération contacts:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// ============================================
//  Créer un réservant
// ============================================
router.post('/', requireActivatedAccount(), requirePermission('reservants', 'create'), 
  async (req, res) => {
    const { nom, type_reservant, editeur_id, contacts } = req.body as {
      nom?: string;
      type_reservant?: string;
      editeur_id?: number;
      contacts?: Array<{
        nom: string;
        email?: string;
        telephone?: string;
        role_profession?: string;
      }>;
    };

    // Validations
    if (!nom || nom.trim() === '') {
      return res.status(400).json({ error: 'Le nom du réservant est requis' });
    }

    if (!type_reservant) {
      return res.status(400).json({ error: 'Le type de réservant est requis' });
    }

    const typesValides = ['editeur', 'prestataire', 'association', 'animation', 'boutique', 'autre'];
    if (!typesValides.includes(type_reservant)) {
      return res.status(400).json({ 
        error: 'Type de réservant invalide', 
        types_valides: typesValides 
      });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Si type = editeur, vérifier que l'éditeur existe
      if (type_reservant === 'editeur' && editeur_id) {
        const editeurCheck = await client.query(
          'SELECT id FROM editeurs WHERE id = $1',
          [editeur_id]
        );
        
        if (editeurCheck.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Éditeur non trouvé' });
        }
      }

      // Créer le réservant
      const reservantResult = await client.query(
        `INSERT INTO reservants (nom, type_reservant, editeur_id)
         VALUES ($1, $2, $3)
         RETURNING id, nom, type_reservant, editeur_id, created_at, updated_at`,
        [nom.trim(), type_reservant, editeur_id || null]
      );

      const reservant = reservantResult.rows[0];

      // Créer les contacts
      const contactsCreated = [];
      if (Array.isArray(contacts)) {
        for (const contact of contacts) {
          if (!contact || !contact.nom || contact.nom.trim() === '') continue;

          const contactResult = await client.query(
            `INSERT INTO contacts_reservants (reservant_id, nom, email, telephone, role_profession)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, nom, email, telephone, role_profession, created_at`,
            [
              reservant.id,
              contact.nom.trim(),
              contact.email || null,
              contact.telephone || null,
              contact.role_profession || null
            ]
          );
          contactsCreated.push(contactResult.rows[0]);
        }
      }

      await client.query('COMMIT');

      res.status(201).json({
        ...reservant,
        contacts: contactsCreated
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Erreur création réservant:', error);
      
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Un réservant avec ce nom existe déjà' });
      }

      res.status(500).json({ error: 'Erreur serveur' });
    } finally {
      client.release();
    }
  }
);

// ============================================
//  Mettre à jour un réservant
// ============================================
router.put('/:id', requireActivatedAccount(), requirePermission('reservants', 'update'), 
  async (req, res) => {
    const { id } = req.params;
    const { nom, type_reservant, editeur_id, contacts } = req.body as {
      nom?: string;
      type_reservant?: string;
      editeur_id?: number;
      contacts?: Array<{
        id?: number;
        nom: string;
        email?: string;
        telephone?: string;
        role_profession?: string;
      }>;
    };

    if (!nom || nom.trim() === '') {
      return res.status(400).json({ error: 'Le nom du réservant est requis' });
    }

    if (!type_reservant) {
      return res.status(400).json({ error: 'Le type de réservant est requis' });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Vérifier que le réservant existe
      const checkResult = await client.query(
        'SELECT id FROM reservants WHERE id = $1',
        [id]
      );

      if (checkResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Réservant non trouvé' });
      }

      // Si type = editeur, vérifier que l'éditeur existe
      if (type_reservant === 'editeur' && editeur_id) {
        const editeurCheck = await client.query(
          'SELECT id FROM editeurs WHERE id = $1',
          [editeur_id]
        );
        
        if (editeurCheck.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Éditeur non trouvé' });
        }
      }

      // Mettre à jour le réservant
      const reservantResult = await client.query(
        `UPDATE reservants 
         SET nom = $1, type_reservant = $2, editeur_id = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING id, nom, type_reservant, editeur_id, created_at, updated_at`,
        [nom.trim(), type_reservant, editeur_id || null, id]
      );

      const reservant = reservantResult.rows[0];

      // Supprimer les anciens contacts
      await client.query(
        'DELETE FROM contacts_reservants WHERE reservant_id = $1',
        [id]
      );

      // Créer les nouveaux contacts
      const contactsCreated = [];
      if (Array.isArray(contacts)) {
        for (const contact of contacts) {
          if (!contact || !contact.nom || contact.nom.trim() === '') continue;

          const contactResult = await client.query(
            `INSERT INTO contacts_reservants (reservant_id, nom, email, telephone, role_profession)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, nom, email, telephone, role_profession, created_at`,
            [
              id,
              contact.nom.trim(),
              contact.email || null,
              contact.telephone || null,
              contact.role_profession || null
            ]
          );
          contactsCreated.push(contactResult.rows[0]);
        }
      }

      await client.query('COMMIT');

      res.json({
        ...reservant,
        contacts: contactsCreated
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Erreur modification réservant:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    } finally {
      client.release();
    }
  }
);

// ============================================
//  Supprimer un réservant
// ============================================
router.delete('/:id', requireActivatedAccount(), requirePermission('reservants', 'delete'), 
  async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Vérifier s'il y a des réservations
      const reservationsCheck = await client.query(
        'SELECT COUNT(*) as count FROM reservations WHERE reservant_id = $1',
        [id]
      );

      if (parseInt(reservationsCheck.rows[0].count) > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: 'Impossible de supprimer : ce réservant a des réservations' 
        });
      }

      // Supprimer les contacts
      await client.query(
        'DELETE FROM contacts_reservants WHERE reservant_id = $1',
        [id]
      );

      // Supprimer le réservant
      const result = await client.query(
        'DELETE FROM reservants WHERE id = $1 RETURNING id, nom',
        [id]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Réservant non trouvé' });
      }

      await client.query('COMMIT');

      res.json({ 
        message: 'Réservant supprimé avec succès',
        reservant: result.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Erreur suppression réservant:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    } finally {
      client.release();
    }
  }
);

export default router;