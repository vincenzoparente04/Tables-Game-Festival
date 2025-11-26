export interface FestivalsDto {
    id: number;
    nom: string;
    espace_tables_total: number;
    description: string;
    date_debut: string;
    date_fin: string;
    stock_tables_standard: number;
    stock_tables_grandes: number;
    stock_tables_mairie: number;
    stock_chaises_standard: number;
    stock_chaises_mairie: number;
    prix_prise_electrique: number;
    est_actif: boolean;
    est_courant: boolean;
    created_at: string;
    updated_at: string;
    // for the views 
    nb_zones_tarifaires: number;
    tables_totales_tarifaires: number;
    nb_reservations_totales: number;
    nb_reservations_confirmees: number;
    montant_total_factures: number;
}
