// src/app/components/consulta/consulta.component.ts
import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';

// ✅ Rutas correctas — subir DOS niveles desde components/consulta/
import { DashboardComponent } from '../dashboard/dashboard';
import { ClienteApiService } from '../../shared/services/cliente-api.service';
import { Cliente } from '../../shared/models/cliente.models';

@Component({
  selector: 'app-consulta',
  standalone: true,
  imports: [ReactiveFormsModule, DashboardComponent],
  templateUrl: './consulta.component.html',
})
export class ConsultaComponent {
  private readonly api    = inject(ClienteApiService);
  private readonly fb     = inject(FormBuilder);
  private readonly router = inject(Router);

  searchForm = this.fb.group({
    cedula: ['', [Validators.required, Validators.minLength(5)]],
  });

  clientes       = signal<Cliente[]>([]);
  isSearching    = signal(false);
  searchError    = signal('');
  searchedCedula = signal('');

  buscarCliente(): void {
    const cedula = this.searchForm.value.cedula?.trim();
    if (!cedula) return;

    this.isSearching.set(true);
    this.searchError.set('');
    this.clientes.set([]);
    this.searchedCedula.set(cedula);

    this.api.getCliente(cedula).subscribe({
      next: (res) => {
        const lista = Array.isArray(res.resultado)
          ? res.resultado
          : res.resultado
          ? [res.resultado]
          : [];
        if (lista.length === 0) {
          this.searchError.set('No se encontró ningún cliente con ese documento.');
        } else {
          this.clientes.set(lista as Cliente[]);
        }
        this.isSearching.set(false);
      },
      error: (err: Error) => {
        this.searchError.set(err.message);
        this.isSearching.set(false);
      },
    });
  }

  cerrarSesion(): void {
    sessionStorage.removeItem('vt_auth');
    this.router.navigate(['/login']);
  }
}