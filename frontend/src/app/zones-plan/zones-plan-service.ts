import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ZonePlanDto, JeuFestivalDto } from '../types/zone-plan-dto';

@Injectable({
  providedIn: 'root',
})
export class ZonesPlanService {

  private readonly API = `${environment.apiUrl}/zones-plan` ;
  constructor(private http : HttpClient) {}

  // Récupérer toutes les zones plan d'un festival
  getByFestival(festivalId: number): Observable<ZonePlanDto[]> {
    return this.http.get<ZonePlanDto[]>(`${this.API}/festival/${festivalId}`);
  }

  // Récupérer une zone plan par id (pour les details )
  getById(id: number): Observable<ZonePlanDto> {
    return this.http.get<ZonePlanDto>(`${this.API}/${id}`);
  }

  // Créer une zone plan
  create(festivalId: number, zone: Partial<ZonePlanDto>): Observable<ZonePlanDto> {
    return this.http.post<ZonePlanDto>(`${this.API}/festival/${festivalId}`, zone);
  }

  // Mettre à jour une zone plan
  update(id: number, updates: Partial<ZonePlanDto>): Observable<ZonePlanDto> {
    return this.http.patch<ZonePlanDto>(`${this.API}/${id}`, updates);
  }

  // Supprimer une zone plan
  delete(id: number): Observable<any> {
    return this.http.delete(`${this.API}/${id}`);
  }

  // Récupérer les jeux d'une zone plan
  getJeuxByZone(zoneId: number): Observable<JeuFestivalDto[]> {
    return this.http.get<JeuFestivalDto[]>(`${this.API}/${zoneId}/jeux`);
  }

  // Récupérer les jeux non placés d'un festival
  getJeuxNonPlaces(festivalId: number): Observable<JeuFestivalDto[]> {
    return this.http.get<JeuFestivalDto[]>(`${this.API}/festival/${festivalId}/jeux-non-places`);
  }

  // Placer un jeu dans une zone
  placerJeu(jeuFestivalId: number, zonePlanId: number, details: {
    nb_tables_std: number;
    nb_tables_gde: number;
    nb_tables_mairie: number;
  }): Observable<JeuFestivalDto> {
    return this.http.patch<JeuFestivalDto>(`${this.API}/jeux/${jeuFestivalId}/placer`, {
      zone_plan_id: zonePlanId,
      ...details
    });
  }

  // Retirer un jeu d'une zone
  retirerJeu(jeuFestivalId: number): Observable<JeuFestivalDto> {
    return this.http.patch<JeuFestivalDto>(`${this.API}/jeux/${jeuFestivalId}/retirer`, {});
  }
}
