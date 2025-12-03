import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EditeurDto } from '../types/editeur-dto';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EditeursService {
  private APIediteurs = `${environment.apiUrl}/editeurs`;
  private APIcefestival = `${environment.apiUrl}/editeurs/festival`;
  
    constructor(private http: HttpClient) {}
  
    // Récupérer tous les Editeurs
    getAllEditeurs(): Observable<EditeurDto[]> {
        return this.http.get<EditeurDto[]>(this.APIediteurs);
    }

    // Récupérer tous les Editeurs de ce festival
    getAllEditeursFromCurrent(idf : number): Observable<EditeurDto[]> {
        return this.http.get<EditeurDto[]>(`${this.APIcefestival}/${idf}`);
    }
  
    // Récupérer un Editeur par id
    getEditeurById(id: number): Observable<EditeurDto> {
        return this.http.get<EditeurDto>(`${this.APIediteurs}/${id}`);
    }
  
    // Créer un Editeur
    createEditeur(Editeur: Partial<EditeurDto>): Observable<EditeurDto> {
        return this.http.post<EditeurDto>(this.APIediteurs, Editeur);
    }
  
    // Mettre à jour un Editeur
    update(id: number, updates: Partial<EditeurDto>): Observable<EditeurDto> {
      return this.http.patch<EditeurDto>(`${this.APIediteurs}/${id}`, updates);
    }
  
    //voir les jeux d'un éditeur
    voirJeux(id: number): Observable<EditeurDto> {
      return this.http.patch<EditeurDto>(`${this.APIediteurs}/${id}/jeux`, {});
    }

    //maybe this route isn't here and needs to be in vins' part
    //voir les jeux d'un éditeur présents sur le festival
    voirJeuxPresents(idf: number,ide:number): Observable<EditeurDto> {
      return this.http.patch<EditeurDto>(`${this.APIcefestival}/${idf}/jeux/${ide}`, {});
    }
  
    // Supprimer un Editeur
    deleteEditeur(id: number): Observable<any> {
          return this.http.delete(`${this.APIediteurs}/${id}`);
    }
}
