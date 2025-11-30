import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { UserDto , UserRole} from '../types/user-dto';
import { environment } from '../../environments/environment';
import { catchError, of, tap, Observable } from 'rxjs';
@Injectable({
  providedIn: 'root'
})
export class User {

  private readonly API = `${environment.apiUrl}/users`;
  constructor(private http: HttpClient ){}

  //recuperer tous les users
  getAllUsers(): Observable<UserDto[]>{
    return this.http.get<UserDto[]>(this.API);
  }

  // Récupérer les comptes en attente
  getPendingUsers(): Observable<UserDto[]> {
    return this.http.get<UserDto[]>(`${this.API}/pending`);
  }

  // Creer un utilisateur , on envoie un objet qui ressemble a UserDto + password
  createUser(userData: Partial<UserDto> & { password: string }): Observable<any> {
    return this.http.post(this.API, userData);
  }

  // Changer le rôle d'un utilisateur
  changeUserRole(userId: number, newRole: UserRole): Observable<any> {
    return this.http.patch(`${this.API}/${userId}/role`, { role: newRole });
  }

  // Valider un compte en attente
  validateUser(userId: number, role: UserRole): Observable<any> {
    return this.http.patch(`${this.API}/${userId}/validate`, { role });
  }

  // Supprimer un utilisateur
  deleteUser(userId: number): Observable<any> {
    return this.http.delete(`${this.API}/${userId}`);
  }

  // Obtenir les rôles disponibles avec descriptions ( à voir si on la supprime ) *******
  getAvailableRoles(): Observable<{ roles: UserRole[]; descriptions: Record<UserRole, string>;}> {
    return this.http.get<any>(`${this.API}/roles/available`);
  }


  static getRoleIcon(role: UserRole): string {
    const icons: Record<UserRole, string> = {
      'admin': 'admin_panel_settings',
      'super organisateur': 'workspace_premium',
      'organisateur': 'manage_accounts',
      'benevole': 'volunteer_activism',
      'visiteur': 'visibility',
      'user': 'hourglass_empty'
    };
    return icons[role];
  }

  // Helper statique pour obtenir la couleur d'un rôle
  static getRoleColor(role: UserRole): 'primary' | 'accent' | 'warn' | '' {
    const colors: Record<UserRole, 'primary' | 'accent' | 'warn' | ''> = {
      'admin': 'warn',
      'super organisateur': 'accent',
      'organisateur': 'primary',
      'benevole': '',
      'visiteur': '',
      'user': 'warn'
    };
    return colors[role];
  }


}
