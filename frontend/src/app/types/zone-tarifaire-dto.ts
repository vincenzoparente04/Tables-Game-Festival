export interface ZoneTarifaireDto {
  id: number;
  festival_id: number;
  nom: string;
  nombre_tables_total: number;
  tables_disponibles?: number;    // calcule par la vue
  tables_reservees?: number;      // calcule par la vue
  prix_table: number;
  prix_m2: number;
  created_at: string;
  updated_at: string;
}

