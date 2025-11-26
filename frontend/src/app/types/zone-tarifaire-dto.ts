export interface ZoneTarifaireDto {
  id: number;  
  nom: string;
  tables_totales: number;
  tables_disponibles: number;
  tables_reservees: number;
  prix_table: number;
  prix_m2: number;
}
