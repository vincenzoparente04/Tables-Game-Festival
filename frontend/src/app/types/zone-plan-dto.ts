export interface ZonePlanDto {
  id: number;
  festival_id: number;
  nom: string;
  nombre_tables_total: number;
  tables_disponibles?: number;    
  tables_utilisees?: number;      
  nb_jeux_places?: number;        
  created_at: string;
  updated_at: string;
}

export interface JeuFestivalDto {
  id: number;
  reservation_id: number;
  jeu_id: number;
  jeu_nom?: string;
  editeur_nom?: string;
  reservant_nom?: string;
  type_reservant?: string;
  zone_plan_id: number | null;
  zone_plan_nom?: string;
  nombre_exemplaires: number;
  tables_allouees: number;
  nb_tables_std: number;
  nb_tables_gde: number;
  nb_tables_mairie: number;
  jeu_recu: boolean;
  est_place: boolean;
  created_at: string;
  updated_at: string;
}