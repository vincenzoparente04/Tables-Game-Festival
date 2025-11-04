import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { UserDto } from '../types/user-dto';
import { environment } from '../../environments/environment';
import { catchError, of, tap } from 'rxjs';
@Injectable({
  providedIn: 'root'
})
export class User {
  private readonly http = inject(HttpClient);


  readonly users = signal<UserDto[]>([]);

  loadAll() {
    this.http.get<UserDto[]>(`${environment.apiUrl}/users`, { withCredentials: true })
      .pipe(
        tap(users => this.users.set(users)),
        catchError(err => {
          console.error('Erreur chargement users', err);
          this.users.set([]);
          return of([]);
        })
      ).subscribe();
  }
}
