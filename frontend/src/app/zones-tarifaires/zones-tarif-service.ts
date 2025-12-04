import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ZoneTarifaireDto} from '../types/zone-tarifaire-dto';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ZonesTarifService {

  private readonly API = `${environment.apiUrl}/zones-tarifaires` ;
  constructor(private http : HttpClient) {}

  // Récupérer toutes les zones tarifaires d'un festival
  getByFestival(festivalId: number): Observable<ZoneTarifaireDto[]> {
    return this.http.get<ZoneTarifaireDto[]>(`${this.API}/festival/${festivalId}`);
  }

  // Récupérer une zone tarifaire par id 
  getById(id: number): Observable<ZoneTarifaireDto> {
    return this.http.get<ZoneTarifaireDto>(`${this.API}/${id}`);
  }

  // Créer une zone tarifaire 
  create(festivalId: number, zone: Partial<ZoneTarifaireDto>): Observable<ZoneTarifaireDto> {
    return this.http.post<ZoneTarifaireDto>(`${this.API}/festival/${festivalId}`, zone);
  }

  // Mettre à jour une zone tarifaire
  update(id: number, updates: Partial<ZoneTarifaireDto>): Observable<ZoneTarifaireDto> {
    return this.http.patch<ZoneTarifaireDto>(`${this.API}/${id}`, updates);
  }

  // Supprimer une zone tarifaire
  delete(id: number): Observable<any> {
    return this.http.delete(`${this.API}/${id}`);
  }

  
}
