import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FestivalsDto } from '../types/festivals-dto';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FestivalsService {
  private API = `${environment.apiUrl}/festivals`;

  constructor(private http: HttpClient) {}

  // Récupérer tous les festivals
  getAllFestivals(): Observable<FestivalsDto[]> {
      return this.http.get<FestivalsDto[]>(this.API);
  }

  // Récupérer le festival courant
  getCurrent(): Observable<FestivalsDto> {
    return this.http.get<FestivalsDto>(`${this.API}/courant`);
  }

  // Récupérer un festival par id
  getFestivalById(id: number): Observable<FestivalsDto> {
      return this.http.get<FestivalsDto>(`${this.API}/${id}`);
  }

  // Créer un festival
  createFestival(festival: Partial<FestivalsDto>): Observable<FestivalsDto> {
      return this.http.post<FestivalsDto>(this.API, festival);
  }

  // Mettre à jour un festival
  update(id: number, updates: Partial<FestivalsDto>): Observable<FestivalsDto> {
    return this.http.patch<FestivalsDto>(`${this.API}/${id}`, updates);
  }

  setCourant(id: number): Observable<FestivalsDto> {
    return this.http.patch<FestivalsDto>(`${this.API}/${id}/set-courant`, {});
  }

  // Supprimer un festival
  deleteFestival(id: number): Observable<any> {
        return this.http.delete(`${this.API}/${id}`);
  }

  // Vérifier si un festival peut être supprimé (pas de zones plan, réservations, zones tarifaires)
  canDeleteFestival(id: number): Observable<{ canDelete: boolean; reason?: string }> {
    return this.http.get<{ canDelete: boolean; reason?: string }>(`${this.API}/${id}/can-delete`);
  }
}
