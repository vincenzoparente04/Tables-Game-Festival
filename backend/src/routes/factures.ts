import { Router } from 'express';
import pool from '../db/database.js';
import { requireActivatedAccount, requirePermission } from '../middleware/roles.js';

const router = Router();

// Interfaces TypeScript
interface CreateFactureRequest {
  reservation_id: number;
  montant_tables: number;
  montant_prises: number;
  montant_brut: number;
  montant_remise: number;
  montant_total: number;
  lignes_facture?: {
    description: string;
    quantite: number;
    prix_unitaire: number;
    montant_ligne: number;
  }[];
}

// Generate unique invoice number
function generateNumeroFacture(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const timestamp = Date.now();
  return `FAC-${year}${month}${day}-${timestamp}`;
}

// POST: Créer una nouvelle facture
router.post('/', requireActivatedAccount(), requirePermission('reservations', 'update'),
  async (req, res) => {
    try {
      const payload: CreateFactureRequest = req.body;

      // Vérifier que la réservation existe
      const reservationResult = await pool.query(
        'SELECT id FROM reservations WHERE id = $1',
        [payload.reservation_id]
      );

      if (reservationResult.rows.length === 0) {
        return res.status(404).json({ error: 'Réservation introuvable' });
      }

      // Vérifier qu'une facture n'existe pas déjà
      const existingFacture = await pool.query(
        'SELECT id FROM factures WHERE reservation_id = $1',
        [payload.reservation_id]
      );

      if (existingFacture.rows.length > 0) {
        return res.status(400).json({ error: 'Une facture existe déjà pour cette réservation' });
      }

      // Créer la facture
      const numeroFacture = generateNumeroFacture();
      const factureResult = await pool.query(
        `INSERT INTO factures (
          reservation_id, numero_facture, date_facture, 
          montant_tables, montant_prises, montant_brut, 
          montant_remise, montant_total, statut_paiement
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          payload.reservation_id,
          numeroFacture,
          new Date().toISOString().split('T')[0],
          payload.montant_tables,
          payload.montant_prises,
          payload.montant_brut,
          payload.montant_remise,
          payload.montant_total,
          'non_paye'
        ]
      );

      const facture = factureResult.rows[0];

      // Créer les lignes de facture si fournies
      const lignes = [];
      if (payload.lignes_facture && payload.lignes_facture.length > 0) {
        for (const ligne of payload.lignes_facture) {
          const ligneResult = await pool.query(
            `INSERT INTO lignes_facture (
              facture_id, description, quantite, prix_unitaire, montant_ligne
            ) VALUES ($1, $2, $3, $4, $5)
            RETURNING *`,
            [
              facture.id,
              ligne.description,
              ligne.quantite,
              ligne.prix_unitaire,
              ligne.montant_ligne
            ]
          );
          lignes.push(ligneResult.rows[0]);
        }
      }

      res.status(201).json({
        ...facture,
        lignes
      });
    } catch (error) {
      console.error('Errore creazione fattura:', error);
      res.status(500).json({ error: 'Errore serveur' });
    }
  }
);

// GET: Récupérer une facture par ID réservation
router.get('/by-reservation/:reservationId', requireActivatedAccount(), requirePermission('reservations', 'view'),
  async (req, res) => {
    try {
      const { reservationId } = req.params;

      const result = await pool.query(
        `SELECT f.*, 
                COALESCE(json_agg(json_build_object(
                  'id', lf.id,
                  'facture_id', lf.facture_id,
                  'description', lf.description,
                  'quantite', lf.quantite,
                  'prix_unitaire', lf.prix_unitaire,
                  'montant_ligne', lf.montant_ligne,
                  'created_at', lf.created_at
                )) FILTER (WHERE lf.id IS NOT NULL), '[]') as lignes
         FROM factures f
         LEFT JOIN lignes_facture lf ON f.id = lf.facture_id
         WHERE f.reservation_id = $1
         GROUP BY f.id`,
        [reservationId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Facture introuvable' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Errore recuperazione fattura:', error);
      res.status(500).json({ error: 'Errore serveur' });
    }
  }
);

// GET: Récupérer toutes les factures
router.get('/', requireActivatedAccount(), requirePermission('reservations', 'view'),
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT f.*, 
                COALESCE(json_agg(json_build_object(
                  'id', lf.id,
                  'facture_id', lf.facture_id,
                  'description', lf.description,
                  'quantite', lf.quantite,
                  'prix_unitaire', lf.prix_unitaire,
                  'montant_ligne', lf.montant_ligne,
                  'created_at', lf.created_at
                )) FILTER (WHERE lf.id IS NOT NULL), '[]') as lignes
         FROM factures f
         LEFT JOIN lignes_facture lf ON f.id = lf.facture_id
         GROUP BY f.id
         ORDER BY f.created_at DESC`
      );

      res.json(result.rows);
    } catch (error) {
      console.error('Errore recuperazione fatture:', error);
      res.status(500).json({ error: 'Errore serveur' });
    }
  }
);

// PUT: Modifier une facture complète (avec lignes)
router.put('/:id', requireActivatedAccount(), requirePermission('reservations', 'update'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { 
        montant_tables, 
        montant_prises, 
        montant_brut, 
        montant_remise, 
        montant_total,
        lignes_facture 
      } = req.body;

      // Vérifier facture existe
      const factureExistante = await pool.query(
        'SELECT * FROM factures WHERE id = $1',
        [id]
      );

      if (factureExistante.rows.length === 0) {
        return res.status(404).json({ error: 'Facture introuvable' });
      }

      // Protection: pas de modif si payée
      if (factureExistante.rows[0].statut_paiement === 'paye') {
        return res.status(400).json({ 
          error: 'Impossible de modifier une facture payée' 
        });
      }

      // Mettre à jour la facture
      const result = await pool.query(
        `UPDATE factures SET 
          montant_tables = $1,
          montant_prises = $2,
          montant_brut = $3,
          montant_remise = $4,
          montant_total = $5,
          updated_at = NOW()
        WHERE id = $6
        RETURNING *`,
        [montant_tables, montant_prises, montant_brut, montant_remise, montant_total, id]
      );

      // Supprimer anciennes lignes
      await pool.query('DELETE FROM lignes_facture WHERE facture_id = $1', [id]);

      // Créer nouvelles lignes
      const lignes = [];
      if (lignes_facture && lignes_facture.length > 0) {
        for (const ligne of lignes_facture) {
          const ligneResult = await pool.query(
            `INSERT INTO lignes_facture 
              (facture_id, description, quantite, prix_unitaire, montant_ligne)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *`,
            [id, ligne.description, ligne.quantite, ligne.prix_unitaire, ligne.montant_ligne]
          );
          lignes.push(ligneResult.rows[0]);
        }
      }

      res.json({ ...result.rows[0], lignes });
    } catch (error) {
      console.error('Errore modification factura:', error);
      res.status(500).json({ error: 'Errore serveur' });
    }
  }
);

// PUT: Mettre à jour le statut de paiement
router.put('/:id/statut', requireActivatedAccount(), requirePermission('reservations', 'update'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { statut_paiement } = req.body;

      if (!['non_paye', 'partiel', 'paye'].includes(statut_paiement)) {
        return res.status(400).json({ error: 'Statut de paiement invalide' });
      }

      const result = await pool.query(
        'UPDATE factures SET statut_paiement = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [statut_paiement, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Facture introuvable' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Errore aggiornamento fattura:', error);
      res.status(500).json({ error: 'Errore serveur' });
    }
  }
);

// DELETE: Supprimer une facture (seulement si non payée)
router.delete('/:id', requireActivatedAccount(), requirePermission('reservations', 'update'),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Vérifier que la facture existe
      const factureExistante = await pool.query(
        'SELECT * FROM factures WHERE id = $1',
        [id]
      );

      if (factureExistante.rows.length === 0) {
        return res.status(404).json({ error: 'Facture introuvable' });
      }

      // Protection: pas de suppression si payée
      if (factureExistante.rows[0].statut_paiement === 'paye') {
        return res.status(400).json({ 
          error: 'Impossible de supprimer une facture payée' 
        });
      }

      // Supprimer les lignes de facture
      await pool.query('DELETE FROM lignes_facture WHERE facture_id = $1', [id]);

      // Supprimer la facture
      await pool.query('DELETE FROM factures WHERE id = $1', [id]);

      res.json({ message: 'Facture supprimée avec succès' });
    } catch (error) {
      console.error('Errore suppression factura:', error);
      res.status(500).json({ error: 'Errore serveur' });
    }
  }
);

export default router;
