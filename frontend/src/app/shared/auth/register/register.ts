import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth-service';
import { ReactiveFormsModule, FormGroup, FormControl, Validators} from '@angular/forms';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  RegisterForm = new FormGroup({
    nom : new FormControl('', {nonNullable: true}),
    prenom : new FormControl('', {nonNullable: true}),
    email : new FormControl('', {nonNullable: true, validators: [Validators.email]}),
    login: new FormControl('', {nonNullable: true, validators: [Validators.required]}),
    password: new FormControl('', {nonNullable: true, validators: [Validators.required]})
  });

  onSubmit() {
    if (this.RegisterForm.invalid) return;
    this.auth.register(
      this.RegisterForm.value.nom!,
      this.RegisterForm.value.prenom!,
      this.RegisterForm.value.email!,
      this.RegisterForm.value.login!,
      this.RegisterForm.value.password!
    );
  }
  
  get loading() { return this.auth.isLoading(); }
  get error() { return this.auth.error(); }
}
