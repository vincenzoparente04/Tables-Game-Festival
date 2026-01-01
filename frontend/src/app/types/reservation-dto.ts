export type EtatContact = 
  | 'pas_contacte'
  | 'contacte'
  | 'en_discussion'
  | 'reserve'
  | 'liste_jeux_demandee'
  | 'liste_jeux_obtenue'
  | 'jeux_recus';

export type EtatPresence = 
  | 'non_defini'
  | 'present'
  | 'considere_absent'
  | 'absent';

export interface ContactReservation {
  id?: number;
  reservation_id?: number;
  date_contact: string;
  type_contact?: string;
  notes?: string;
  created_at?: string;
}

export interface ReservationZone {
  id?: number;
  reservation_id?: number;
  zone_tarifaire_id: number;
  zone_tarifaire_nom?: string;
  nombre_tables: number;
  prix_unitaire: number;
  created_at?: string;
}

export interface JeuReservation {
  id?: number;
  reservation_id?: number;
  jeu_id: number;
  jeu_nom?: string;
  editeur_nom?: string;
  zone_plan_id?: number;
  zone_plan_nom?: string;
  nombre_exemplaires: number;
  tables_allouees: number;
  nb_tables_std: number;
  nb_tables_gde: number;
  nb_tables_mairie: number;
  jeu_recu: boolean;
  est_place?: boolean;
}

export interface ReservationSummary {
  id: number;
  festival_id: number;
  festival_nom?: string;
  reservant_id: number;
  reservant_nom: string;
  type_reservant?: string;
  etat_contact: EtatContact;
  etat_presence: EtatPresence;
  date_dernier_contact?: string;
  nb_prises_electriques: number;
  remise_tables: number;
  remise_montant: number;
  viendra_animer: boolean;
  notes?: string;
  nb_contacts?: number;
  nb_tables_reservees?: number;
  montant_tables?: number;
  montant_prises?: number;
  montant_brut?: number;
  nb_jeux?: number;
  nb_jeux_places?: number;
  nb_jeux_recus?: number;
  created_at: string;
  updated_at: string;
}

export interface ReservationDetail extends ReservationSummary {
  contacts: ContactReservation[];
  zones_reservees: ReservationZone[];
  jeux: JeuReservation[];
}

export interface CreateReservationPayload {
  reservant_id: number;
  etat_contact?: EtatContact;
  etat_presence?: EtatPresence;
  nb_prises_electriques?: number;
  notes?: string;
  viendra_animer?: boolean;
  zones_reservees?: {
    zone_tarifaire_id: number;
    nombre_tables: number;
    prix_unitaire: number;
  }[];
}

export interface UpdateReservationPayload {
  etat_contact?: EtatContact;
  etat_presence?: EtatPresence;
  nb_prises_electriques?: number;
  remise_tables?: number;
  remise_montant?: number;
  notes?: string;
  viendra_animer?: boolean;
}

export interface AddJeuToReservationPayload {
  jeu_id: number;
  nombre_exemplaires: number;
  tables_allouees: number;
}

export interface RecapitulatifReservation {
  reservation_id: number;
  festival_id: number;
  festival_nom: string;
  reservant_nom: string;
  type_reservant: string;
  etat_contact: EtatContact;
  etat_presence: EtatPresence;
  montant_tables: number;
  montant_prises: number;
  montant_brut: number;
  remise_tables: number;
  remise_montant: number;
  remise_tables_montant: number;
  montant_net: number;
  numero_facture?: string;
  statut_paiement?: string;
  date_facture?: string;
}