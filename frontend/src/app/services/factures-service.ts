import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';



@Injectable({
  providedIn: 'root',
})
export class FacturesService {
  private API = `${environment.apiUrl}/factures`;

  constructor(private http: HttpClient) {}

  
}
