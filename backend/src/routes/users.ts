import { Router } from 'express'
import pool from '../db/database.js'
import bcrypt from 'bcryptjs'
import { requireAdmin } from '../middleware/auth-admin.js'
import { requireRole, requireActivatedAccount, requirePermission } from '../middleware/roles.js';
import { Role } from '../config/roles.config.js';

const router = Router()


// ========================================
// LISTE DES UTILISATEURS
// ========================================
router.get('/', requireActivatedAccount(), requirePermission('users', 'view'), async (_req, res) => {
    try {
      const result = await pool.query(`
        SELECT id, nom, prenom, email, login, role, created_at, updated_at 
        FROM users 
        ORDER BY 
          CASE role
            WHEN 'admin' THEN 1
            WHEN 'super organisateur' THEN 2
            WHEN 'organisateur' THEN 3
            WHEN 'benevole' THEN 4
            WHEN 'visiteur' THEN 5
            WHEN 'user' THEN 6
          END,
          created_at DESC
      `);
      res.json(result.rows);
    } catch (error) {
      console.error('Erreur récupération utilisateurs:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
})

// Récupérer uniquement les comptes en attente (USER)
router.get('/pending', requireActivatedAccount(), requirePermission('users', 'validatePending'), async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT id, nom, prenom, email, login, created_at 
        FROM users 
        WHERE role = 'user' 
        ORDER BY created_at DESC
      `);
      res.json(result.rows);
    } catch (error) {
      console.error('Erreur récupération comptes en attente:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// ========================================
// MODIFICATION DES RÔLES
// ========================================

// Changer le rôle d'un utilisateur
router.patch('/:id/role', requireActivatedAccount(), requirePermission('users', 'changeRole'), async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;

    // Valider que le rôle existe
    const validRoles = Object.values(Role);
    if (!validRoles.includes(role as Role)) {
      return res.status(400).json({ 
        error: 'Rôle invalide',
        validRoles 
      });
    }

    try {
      const result = await pool.query(
        `UPDATE users 
         SET role = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2 
         RETURNING id, nom, prenom, email, login, role, updated_at`,
        [role, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      res.json({
        message: 'Rôle mis à jour avec succès',
        user: result.rows[0]
      });
    } catch (error) {
      console.error('Erreur modification rôle:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// Valider un compte en attente (passer de USER à un autre rôle)
router.patch('/:id/validate', requireActivatedAccount(), requirePermission('users', 'validatePending'), async (req, res) => {
    const { id } = req.params;
    const { role } = req.body; // le nouveau rôle qu’on veut lui donner

    // Valider que le rôle n'est pas USER
    if (role === Role.USER) {
      return res.status(400).json({ 
        error: 'Le rôle USER est réservé aux comptes en attente' 
      });
    }

    const validRoles = Object.values(Role).filter(r => r !== Role.USER) as Role[];
    if (!validRoles.includes(role as Role)) {
      return res.status(400).json({ 
        error: 'Rôle invalide',
        validRoles 
      });
    }

    try {
      // Vérifier que l'utilisateur est bien en attente
      const checkResult = await pool.query(
        'SELECT role FROM users WHERE id = $1',
        [id]
      );

      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      if (checkResult.rows[0].role !== Role.USER) {
        return res.status(400).json({ 
          error: 'Cet utilisateur n\'est pas en attente de validation' 
        });
      }

      // Mettre à jour le rôle
      const result = await pool.query(
        `UPDATE users 
         SET role = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2 
         RETURNING id, nom, prenom, email, login, role, updated_at`,
        [role, id]
      );

      res.json({
        message: 'Compte validé avec succès',
        user: result.rows[0]
      });
    } catch (error) {
      console.error('Erreur validation compte:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// ========================================
// SUPPRESSION
// ========================================

// Supprimer un utilisateur
router.delete('/:id', requireActivatedAccount(), requirePermission('users', 'delete'), async (req, res) => {
    const { id } = req.params;
    try {
      const result = await pool.query(
        'DELETE FROM users WHERE id = $1 RETURNING id, login, email',
        [id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }
      res.json({
        message: 'Utilisateur supprimé avec succès',
        user: result.rows[0]
      });
    } catch (error) {
      console.error('Erreur suppression utilisateur:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);


// Création d'un utilisateur
router.post('/',requireActivatedAccount(), requirePermission('users', 'create'), async (req, res) => {
    const { nom, prenom, email, login, password, role } = req.body;
    if (!login || !password || !email) {
      return res.status(400).json({ 
        error: 'Login, email et mot de passe sont requis' 
      });
    }
    // Valider que le rôle existe
    const validRoles = Object.values(Role);
    if (!validRoles.includes(role as Role)) {
      return res.status(400).json({ 
        error: 'Rôle invalide',
        validRoles 
      });
    }
    try {
        // Vérifier si le login ou l'email existe déjà
      const checkExisting = await pool.query(
        'SELECT id FROM users WHERE login = $1 OR email = $2',
        [login, email]
      );

      if (checkExisting.rows.length > 0) {
        return res.status(400).json({ 
          error: 'Ce login ou cet email existe déjà' 
        });
      }
      const hashed = await bcrypt.hash(password, 10)
      const result = await pool.query(
         `INSERT INTO users (nom, prenom, email, login, password_hash, role)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, nom, prenom, email, login, role, created_at`,
        [nom, prenom , email, login, hashed, role]
      );
      res.status(201).json({
        message: 'Utilisateur créé avec succès',
        user: result.rows[0]
      });
    } catch (error) {
      console.error('Erreur création utilisateur:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
})

// Obtenir les rôles disponibles (pour les dropdowns)  ( à voir si on la supprime ) *******
router.get('/roles/available',
  requireActivatedAccount(),
  requirePermission('users', 'view'),
  async (req, res) => {
    res.json({
      roles: Object.values(Role),
      descriptions: {
        'admin': 'Accès complet à toutes les fonctionnalités',
        'super organisateur': 'Gestion complète des festivals, zones, réservations',
        'organisateur': 'Modification des jeux et placement',
        'benevole': 'Consultation des informations du festival',
        'visiteur': 'Consultation publique (jeux, éditeurs, plan)',
        'user': 'Compte en attente de validation'
      }
    });
  }
);





// tout ce qui est en dessous etait dans le tp , a voir si on les garde ou pas 

router.get('/:id', async (req, res) => {
  const { id } = req.params
  try {
    const { rows } = await pool.query(
      'SELECT id, login, role FROM users WHERE id = $1',
      [id]
    )
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' })
    }
    res.json(rows[0])
  } catch (err: any) {
    console.error(err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.get('/me', async (req, res) => {
  const user = req.user
  const { rows } = await pool.query(
    'SELECT id, login, role FROM users WHERE id=$1',
    [user?.id]
  )
  res.json(rows[0]);
})

router.get('/', requireAdmin, async (_req, res) => {
  const { rows } = await pool.query(
    'SELECT id, login, role FROM users ORDER BY id'
  )
  res.json(rows)
})

export default router