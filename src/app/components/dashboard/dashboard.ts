// src/app/components/dashboard/dashboard.ts
import {
  Component,
  computed,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ClienteApiService } from '../../shared/services/cliente-api.service';
import {
  ActiveTab,
  Cliente,
  DatosGenericos,
  Servicio,
} from '../../shared/models/cliente.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './dashboard.html',
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(ClienteApiService);

  clientes = input.required<Cliente[]>();
  cedula = input.required<string>();

  cuentaSeleccionada = signal<Cliente | null>(null);
  activeTab = signal<ActiveTab>('servicios');

  // ✅ Tipado correcto para servicios
  servicios = signal<Servicio[]>([]);
  atenciones = signal<DatosGenericos[]>([]);
  facturas = signal<DatosGenericos[]>([]);
  facturaDetalle = signal<DatosGenericos | null>(null);

  loadingServicios = signal(false);
  loadingAtenciones = signal(false);
  loadingFacturas = signal(false);
  loadingDetalle = signal(false);

  errorServicios = signal<string | null>(null);
  errorAtenciones = signal<string | null>(null);
  errorFacturas = signal<string | null>(null);
  errorDetalle = signal<string | null>(null);

  readonly tabs: { id: ActiveTab; label: string; icon: string }[] = [
    { id: 'servicios', label: 'Servicios', icon: '📡' },
    { id: 'atenciones', label: 'Atenciones', icon: '🛠️' },
    { id: 'facturas', label: 'Facturas', icon: '🧾' },
  ];

  clientePrincipal = computed(() => this.clientes()[0] ?? null);

  deudaTotal = computed(() =>
    this.clientes().reduce((sum, c) => sum + (c.deuda_total ?? 0), 0)
  );

  estadoGeneral = computed(() =>
    this.clientes().some((c) => c.estado === 'ACTIVO') ? 'ACTIVO' : 'INACTIVO'
  );

  atencionesColumns = computed(() =>
    this.atenciones().length > 0 ? Object.keys(this.atenciones()[0]) : []
  );
  facturasColumns = computed(() =>
    this.facturas().length > 0 ? Object.keys(this.facturas()[0]) : []
  );

  facturaDetalleEntries = computed(() => {
    const d = this.facturaDetalle();
    if (!d) return [];
    return Object.entries(d).filter(
      ([, v]) => v !== null && v !== undefined && typeof v !== 'object'
    );
  });

  // Contadores por estado para el resumen
  serviciosActivos = computed(() =>
    this.servicios().filter((s) => s.Estado === 'ACTIVO').length
  );
  serviciosRetirados = computed(() =>
    this.servicios().filter((s) => s.Estado === 'RETIRADO').length
  );

  ngOnInit(): void {
    const primera = this.clientes()[0];
    if (primera) {
      this.cuentaSeleccionada.set(primera);
      this.cargarServicios(primera.codigo);
    }
  }

  seleccionarCuenta(cuenta: Cliente): void {
    if (this.cuentaSeleccionada()?.codigo === cuenta.codigo) return;
    this.cuentaSeleccionada.set(cuenta);
    this.resetDatos();
    this.activeTab.set('servicios');
    this.cargarServicios(cuenta.codigo);
  }

  setTab(tab: ActiveTab): void {
    this.activeTab.set(tab);
    this.facturaDetalle.set(null);
    this.errorDetalle.set(null);

    const codigo = this.cuentaSeleccionada()?.codigo;
    if (!codigo) return;

    if (tab === 'atenciones' && this.atenciones().length === 0 && !this.loadingAtenciones()) {
      this.cargarAtenciones(codigo);
    }
    if (tab === 'facturas' && this.facturas().length === 0 && !this.loadingFacturas()) {
      this.cargarFacturas(codigo);
    }
  }

  verDetalle(factura: DatosGenericos): void {
    const id =
      factura['codigo'] ?? factura['id'] ??
      factura['numero_factura'] ?? factura['numero'];

    if (!id) {
      this.errorDetalle.set('No se pudo obtener el ID de esta factura.');
      return;
    }
    this.loadingDetalle.set(true);
    this.facturaDetalle.set(null);
    this.errorDetalle.set(null);

    this.api.getFacturaDetalle(String(id)).subscribe({
      next: (res) => {
        const data = Array.isArray(res.resultado) ? res.resultado[0] : res.resultado;
        this.facturaDetalle.set(data);
        this.loadingDetalle.set(false);
      },
      error: (err: Error) => {
        this.errorDetalle.set(err.message);
        this.loadingDetalle.set(false);
      },
    });
  }

  cerrarDetalle(): void {
    this.facturaDetalle.set(null);
    this.errorDetalle.set(null);
  }

  // ─── Carga de datos ──────────────────────────────────────────────────────────

  private cargarServicios(codigoCuenta: string): void {
    this.loadingServicios.set(true);
    this.errorServicios.set(null);

    this.api.getServicios(codigoCuenta).subscribe({
      next: (res) => {
        // ✅ Lee res.servicios, no res.resultado
        const lista = Array.isArray(res.servicios)
          ? res.servicios.filter(Boolean)
          : [];
        this.servicios.set(lista);
        this.loadingServicios.set(false);
      },
      error: (err: Error) => {
        this.errorServicios.set(err.message);
        this.loadingServicios.set(false);
      },
    });
  }

  private cargarAtenciones(codigoCuenta: string): void {
    this.loadingAtenciones.set(true);
    this.errorAtenciones.set(null);

    this.api.getAtenciones(codigoCuenta).subscribe({
      next: (res) => {
        this.atenciones.set(this.toArray(res.resultado));
        this.loadingAtenciones.set(false);
      },
      error: (err: Error) => {
        this.errorAtenciones.set(err.message);
        this.loadingAtenciones.set(false);
      },
    });
  }

  private cargarFacturas(codigoCuenta: string): void {
    this.loadingFacturas.set(true);
    this.errorFacturas.set(null);

    this.api.getFacturas(codigoCuenta).subscribe({
      next: (res) => {
        this.facturas.set(this.toArray(res.resultado));
        this.loadingFacturas.set(false);
      },
      error: (err: Error) => {
        this.errorFacturas.set(err.message);
        this.loadingFacturas.set(false);
      },
    });
  }

  private resetDatos(): void {
    this.servicios.set([]);
    this.atenciones.set([]);
    this.facturas.set([]);
    this.facturaDetalle.set(null);
    this.errorServicios.set(null);
    this.errorAtenciones.set(null);
    this.errorFacturas.set(null);
    this.errorDetalle.set(null);
  }

  private toArray(resultado: any): DatosGenericos[] {
    if (!resultado) return [];
    if (Array.isArray(resultado)) return resultado.filter(Boolean);
    return [resultado];
  }

  formatLabel(key: string): string {
    return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  formatValue(value: any): string {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    if (typeof value === 'object') {
      try { return JSON.stringify(value); } catch { return '—'; }
    }
    return String(value);
  }
}