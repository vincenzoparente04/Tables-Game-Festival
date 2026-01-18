export interface LigneFacture {
  id?: number;
  facture_id?: number;
  description: string;
  quantite: number;
  prix_unitaire: number;
  montant_ligne: number;
  created_at?: string;
}

export interface Facture {
  id?: number;
  reservation_id: number;
  numero_facture: string;
  date_facture: string;
  montant_tables: number;
  montant_prises: number;
  montant_brut: number;
  montant_remise: number;
  montant_total: number;
  statut_paiement: 'non_paye' | 'partiel' | 'paye';
  lignes?: LigneFacture[];
  created_at?: string;
  updated_at?: string;
}

export interface CreateFacturePayload {
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

export interface RecapFacture {
  reservation_id: number;
  reservant_nom: string;
  montant_tables: number;
  montant_prises: number;
  montant_brut: number;
  remise_montant: number;
  remise_tables_montant: number;
  montant_total: number;
  zones: {
    nom: string;
    nb_tables: number;
    prix_unitaire: number;
    total: number;
  }[];
}
