import { Component, effect, inject } from '@angular/core'
import { User } from '../../users/user'
import { AuthService } from '../../shared/auth/auth-service';

@Component({
  selector: 'app-admin',
  imports: [],
  templateUrl: './admin.html',
  styleUrl: './admin.css'
})
export class Admin {
  private readonly user = inject(User);
  private readonly auth = inject(AuthService);
  readonly users = this.user.users;
  constructor() {
    effect(() => this.user.loadAll())
    this.auth.whoami();
  }
}