import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../shared/auth/auth-service';


@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home {
  private auth = inject(AuthService);
  private router = inject(Router);

  currentUser = this.auth.currentUser;
  isLoggedIn = this.auth.isLoggedIn;

  constructor() {
    this.auth.whoami();
  }

  logoutHome() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

}
