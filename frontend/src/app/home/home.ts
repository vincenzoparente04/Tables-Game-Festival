import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../shared/auth/auth-service';
import { PermissionsService } from '../services/permissions-service';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home {
  private auth = inject(AuthService);
  private router = inject(Router);
  private permissions = inject(PermissionsService);

  currentUser = this.auth.currentUser;
  isLoggedIn = this.auth.isLoggedIn;

  constructor() {
    this.auth.whoami();
  }

  userRole = this.permissions.currentRole;
  isPendingUser = this.permissions.isPendingUser;
  canViewFestivals = this.permissions.can('festivals', 'viewAll');
  isAdmin = this.permissions.isAdmin;


}
