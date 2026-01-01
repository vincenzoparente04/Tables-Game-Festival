export type TypeReservant = 'editeur' | 'prestataire' | 'association' | 'animation' | 'boutique' | 'autre';

export interface ContactReservant {
  id?: number;
  reservant_id?: number;
  nom: string;
  email?: string;
  telephone?: string;
  role_profession?: string;
  created_at?: string;
}

export interface ReservantSummary {
  id: number;
  nom: string;
  type_reservant: TypeReservant;
  editeur_id?: number;
  editeur_nom?: string;
  nb_contacts: number;
  nb_reservations: number;
  created_at: string;
  updated_at: string;
}

export interface HistoriqueReservation {
  id: number;
  festival_id: number;
  festival_nom: string;
  date_debut?: string;
  date_fin?: string;
  etat_contact: string;
  etat_presence: string;
  nb_tables: number;
  montant_total: number;
  created_at: string;
}

export interface ReservantDetail extends ReservantSummary {
  contacts: ContactReservant[];
  historique: HistoriqueReservation[];
}

export interface CreateReservantPayload {
  nom: string;
  type_reservant: TypeReservant;
  editeur_id?: number;
  contacts?: ContactReservant[];
}

export interface UpdateReservantPayload {
  nom: string;
  type_reservant: TypeReservant;
  editeur_id?: number;
  contacts?: ContactReservant[];
}