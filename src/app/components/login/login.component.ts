// src/app/components/login/login.component.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  private readonly router = inject(Router);

  private readonly STORAGE_KEY = 'vt_remember';

  usuario   = signal('');
  password  = signal('');
  mostrarPw = signal(false);
  cargando  = signal(false);
  error     = signal('');
  recordarme = signal(false);

  // ─── Al abrir la página, carga el usuario guardado ──────
  ngOnInit(): void {
    const guardado = localStorage.getItem(this.STORAGE_KEY);
    if (guardado) {
      this.usuario.set(guardado);
      this.recordarme.set(true);
    }
  }

  togglePw(): void {
    this.mostrarPw.update(v => !v);
  }

  async onSubmit(): Promise<void> {
    if (!this.usuario() || !this.password()) {
      this.error.set('Por favor completa todos los campos.');
      return;
    }

    this.cargando.set(true);
    this.error.set('');

    // ✅ Guarda o elimina el usuario según el checkbox
    if (this.recordarme()) {
      localStorage.setItem(this.STORAGE_KEY, this.usuario());
    } else {
      localStorage.removeItem(this.STORAGE_KEY);
    }

    // Fase 2: reemplaza esto con la llamada real a la API
    await new Promise(r => setTimeout(r, 1200));

    if (this.usuario().trim() !== '' && this.password().trim() !== '') {
      sessionStorage.setItem('vt_auth', '1');
      this.router.navigate(['/consulta']);
    } else {
      this.error.set('Usuario o contraseña incorrectos.');
      this.cargando.set(false);
    }
  }

  olvidoContrasena(): void {
    alert('Para recuperar tu contraseña comunícate al 314 7258728 o escribe a servicioasociado@viboral.tv');
  }

  irARegistro(): void {
    this.router.navigate(['/registro']);
  }
}