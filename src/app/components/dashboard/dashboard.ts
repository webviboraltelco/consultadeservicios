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
  Atencion,
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
  cedula   = input.required<string>();

  cuentaSeleccionada = signal<Cliente | null>(null);
  activeTab          = signal<ActiveTab>('servicios');

  servicios      = signal<Servicio[]>([]);
  atenciones     = signal<Atencion[]>([]);
  facturas       = signal<DatosGenericos[]>([]);
  facturaDetalle = signal<DatosGenericos | null>(null);

  loadingServicios  = signal(false);
  loadingAtenciones = signal(false);
  loadingFacturas   = signal(false);

  errorServicios  = signal<string | null>(null);
  errorAtenciones = signal<string | null>(null);
  errorFacturas   = signal<string | null>(null);
  errorDetalle    = signal<string | null>(null);

  descargandoFactura = signal<string | null>(null);
  errorDescarga      = signal<string | null>(null);
  descargaExitosa    = signal<string | null>(null);

  readonly tabs: { id: ActiveTab; label: string; icon: string }[] = [
    { id: 'servicios',  label: 'Servicios',  icon: '📡' },
    { id: 'atenciones', label: 'Atenciones', icon: '🛠️' },
    { id: 'facturas',   label: 'Facturas',   icon: '🧾' },
  ];

  // ─── Computeds ──────────────────────────────────────────────────────────────

  clientePrincipal = computed(() => this.clientes()[0] ?? null);

  deudaTotal = computed(() =>
    this.clientes().reduce((sum, c) => sum + (c.deuda_total ?? 0), 0)
  );

  estadoGeneral = computed(() =>
    this.clientes().some((c) => c.estado === 'ACTIVO') ? 'ACTIVO' : 'INACTIVO'
  );

  facturasColumns = computed(() =>
    this.facturas().length > 0 ? Object.keys(this.facturas()[0]) : []
  );

  facturaDetalleEntries = computed(() => {
    const d = this.facturaDetalle();
    if (!d) return [];
    return Object.entries(d).filter(
      ([, v]) => v !== null && v !== undefined && typeof v !== 'object' && String(v).trim() !== ''
    );
  });

  serviciosActivos   = computed(() => this.servicios().filter((s) => s.Estado === 'ACTIVO').length);
  serviciosRetirados = computed(() => this.servicios().filter((s) => s.Estado === 'RETIRADO').length);

  atencionesAbiertas = computed(() =>
    this.atenciones().filter((a) =>
      ['EN PROCESO', 'EN_PROCESO', 'REGISTRADA', 'PENDIENTE', 'ABIERTO', 'ABIERTA']
        .includes(this.getAtencionEstado(a))
    ).length
  );

  atencionesCerradas = computed(() =>
    this.atenciones().filter((a) =>
      ['CERRADO', 'CERRADA', 'RESUELTO', 'RESUELTA', 'FINALIZADO', 'FINALIZADA']
        .includes(this.getAtencionEstado(a))
    ).length
  );

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit(): void {
    const primera = this.clientes()[0];
    if (primera) {
      this.cuentaSeleccionada.set(primera);
      this.cargarServicios(primera.codigo);
    }
  }

  // ─── Acciones públicas ──────────────────────────────────────────────────────

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
    this.facturaDetalle.set(factura);
    this.errorDetalle.set(null);
  }

  cerrarDetalle(): void {
    this.facturaDetalle.set(null);
    this.errorDetalle.set(null);
  }

  // ─── Acciones privadas ──────────────────────────────────────────────────────


descargarFactura(factura: any): void {
  const id = this.getFacturaId(factura);
  if (!id) {
    this.errorDescarga.set('No se pudo identificar la factura.');
    return;
  }

  this.descargandoFactura.set(id);
  this.errorDescarga.set(null);
  this.descargaExitosa.set(null);

  // El endpoint devuelve el PDF directamente como blob
  this.api.descargarFacturaPdf(id).subscribe({
    next: (blob) => {
      const url      = URL.createObjectURL(blob);
      const numero   = this.getFacturaNumero(factura);
      const link     = document.createElement('a');
      link.href      = url;
      link.download  = `Factura_${numero}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      this.finalizarDescarga(id);
    },
    error: () => {
      // Si falla el PDF → fallback con recibo HTML
      this.generarReciboHtml(factura, {});
      this.finalizarDescarga(id);
    },
  });
}

  // ─── Helpers — Atenciones ───────────────────────────────────────────────────

  getAtencionNumero(a: Atencion): string {
    const val = a['idAtencion'] ?? a['numero_atencion'] ?? a['numero'] ?? a['id'];
    return val != null ? String(val) : '—';
  }

  getAtencionFecha(a: Atencion): string {
    return this.formatearFecha(a['FechaRegistro'] ?? a['fecha'] ?? a['fecha_creacion']);
  }

  getAtencionFechaProgramacion(a: Atencion): string {
    const val = a['FechaProgramacion'];
    return val ? this.formatearFecha(val) : '';
  }

  getAtencionTipo(a: Atencion): string {
    const val = a['TipoAtencion'] ?? a['tipo'] ?? a['tipo_atencion'];
    return val != null ? String(val) : 'Atención';
  }

  getAtencionEstado(a: Atencion): string {
    const estado  = String(a['EstadoAtencion'] ?? a['estado'] ?? a['Estado'] ?? '').toUpperCase();
    const tecnico = String(a['TecnicoAsignado'] ?? a['tecnico'] ?? '').trim();
    if (estado === 'REGISTRADA' && tecnico !== '') return 'EN PROCESO';
    return estado || 'SIN ESTADO';
  }

  getAtencionEstadoColor(estado: string): { bg: string; text: string; border: string } {
    switch (estado.toUpperCase()) {
      case 'EN PROCESO':
      case 'EN_PROCESO':
        return { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' };
      case 'REGISTRADA':
      case 'ABIERTO':
      case 'ABIERTA':
      case 'PENDIENTE':
        return { bg: '#fef9c3', text: '#854d0e', border: '#fde047' };
      case 'CERRADO':
      case 'CERRADA':
      case 'RESUELTO':
      case 'RESUELTA':
      case 'FINALIZADO':
      case 'FINALIZADA':
        return { bg: '#dcfce7', text: '#15803d', border: '#86efac' };
      default:
        return { bg: '#f3f4f6', text: '#6b7280', border: '#d1d5db' };
    }
  }

  getAtencionDescripcion(a: Atencion): string {
    const val = a['Observacion'] ?? a['descripcion'] ?? a['observaciones'];
    return val != null ? String(val) : '';
  }

  getAtencionMotivo(a: Atencion): string {
    const val = a['Motivo'] ?? a['motivo'];
    return val != null ? String(val) : '';
  }

  getAtencionTecnico(a: Atencion): string {
    const val = a['TecnicoAsignado'] ?? a['tecnico'] ?? a['ejecutivo'] ?? a['responsable'];
    return val != null && String(val).trim() !== '' ? String(val) : '';
  }

  getAtencionExtras(a: Atencion): { label: string; value: string }[] {
    const ignorados = new Set([
      'idAtencion', 'TipoAtencion', 'EstadoAtencion', 'FechaRegistro',
      'FechaProgramacion', 'TecnicoAsignado', 'Observacion', 'Motivo',
      'numero_atencion', 'numero', 'id', 'codigo', 'fecha', 'fecha_creacion',
      'tipo', 'tipo_atencion', 'estado', 'Estado', 'descripcion', 'motivo',
      'observaciones', 'detalle', 'tecnico', 'ejecutivo', 'responsable',
    ]);
    return Object.entries(a)
      .filter(([key, val]) =>
        !ignorados.has(key) && val !== null && val !== undefined && typeof val !== 'object'
      )
      .map(([key, val]) => ({ label: this.formatLabel(key), value: this.formatValue(val) }));
  }

  // ─── Helpers — Facturas ─────────────────────────────────────────────────────

  getFacturaNumero(f: any): string {
    const val = f['NumeroFactura'] ?? f['idFactura'] ?? f['numero'] ?? f['id'];
    return val != null ? String(val) : '—';
  }

 // ✅ Prioriza idFactura que es el ID real del endpoint PDF
getFacturaId(f: any): string {
  const val = f['idFactura'] ?? f['IdFactura'] ?? f['NumeroFactura'] ?? f['id'];
  return val != null ? String(val) : '';
}

  getFacturaFecha(f: any): string {
    return this.formatearFecha(f['FechaEmision'] ?? f['FechaFactura'] ?? f['fecha']);
  }

  getFacturaVencimiento(f: any): string {
    return this.formatearFecha(f['FechaVencimiento'] ?? f['fecha_vencimiento']);
  }

  getFacturaPeriodo(f: any): string {
    const val = f['Periodo'] ?? f['periodo'] ?? f['Mes'] ?? f['mes'];
    return val != null ? String(val) : '';
  }

  getFacturaTotal(f: any): number {
    const val = f['Importe'] ?? f['ValorTotal'] ?? f['Total'] ?? f['valor'];
    return Number(val) || 0;
  }

  getFacturaEstado(f: any): string {
    const val = f['Estado'] ?? f['estado'];
    return val != null ? String(val).toUpperCase() : 'EMITIDA';
  }

  getFacturaEstadoColor(estado: string): { bg: string; text: string; border: string; dot: string } {
    switch (estado.toUpperCase()) {
      case 'PAGADA':
      case 'PAGADO':
      case 'CANCELADA':
      case 'CANCELADO':
        return { bg: '#dcfce7', text: '#15803d', border: '#86efac', dot: '#22c55e' };
      case 'VENCIDA':
      case 'VENCIDO':
      case 'MORA':
        return { bg: '#fef2f2', text: '#b91c1c', border: '#fca5a5', dot: '#ef4444' };
      case 'PENDIENTE':
      case 'EMITIDA':
      case 'ADEUDADA':
      case 'POR PAGAR':
        return { bg: '#fef9c3', text: '#854d0e', border: '#fde047', dot: '#f59e0b' };
      default:
        return { bg: '#f3f4f6', text: '#6b7280', border: '#d1d5db', dot: '#9ca3af' };
    }
  }

  getPdfUrl(detalle: any): string | null {
    const url = detalle['UrlPdf'] ?? detalle['url_pdf'] ?? detalle['Url'] ?? detalle['url'];
    if (url && String(url).startsWith('http')) return String(url);

    const b64 = detalle['Pdf'] ?? detalle['pdf'] ?? detalle['Base64'] ??
                detalle['base64'] ?? detalle['Archivo'];
    if (b64 && String(b64).length > 100) {
      try {
        const byteChars  = atob(String(b64));
        const byteArrays: BlobPart[] = [];
        for (let i = 0; i < byteChars.length; i += 512) {
          const slice = byteChars.slice(i, i + 512);
          const bytes = new Uint8Array(slice.length);
          for (let j = 0; j < slice.length; j++) bytes[j] = slice.charCodeAt(j);
          byteArrays.push(bytes);
        }
        return URL.createObjectURL(new Blob(byteArrays, { type: 'application/pdf' }));
      } catch {
        return null;
      }
    }
    return null;
  }

  // ─── Helpers — Formato ──────────────────────────────────────────────────────

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

  // ─── Métodos privados ────────────────────────────────────────────────────────

  private formatearFecha(val: any): string {
    if (!val) return '—';
    try {
      const d = new Date(val);
      return isNaN(d.getTime())
        ? String(val)
        : d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return String(val);
    }
  }

  private finalizarDescarga(id: string): void {
    this.descargandoFactura.set(null);
    this.descargaExitosa.set(id);
    setTimeout(() => this.descargaExitosa.set(null), 3000);
  }

  private triggerDownload(url: string, filename: string): void {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  }

  private generarReciboHtml(factura: any, detalle: any): void {
    const datos      = { ...factura, ...(detalle ?? {}) };
    const numero     = this.getFacturaNumero(datos);
    const fecha      = this.getFacturaFecha(datos);
    const vence      = this.getFacturaVencimiento(datos);
    const total      = this.getFacturaTotal(datos);
    const estado     = this.getFacturaEstado(datos);
    const cliente    = this.clientePrincipal();
    const codPago    = datos['CodPago']   ?? datos['codPago']   ?? '';
    const periodo    = datos['Periodo']   ?? datos['periodo']   ?? '';
    const telefono   = datos['Telefono']  ?? datos['telefono']  ?? '';
    const direccion  = datos['Direccion'] ?? datos['direccion'] ?? this.cuentaSeleccionada()?.direccion ?? '';
    const deuda      = Number(datos['Deuda'] ?? datos['deuda'] ?? total);

    let fechaConRecargo = '';
    try {
      const d = new Date(datos['FechaVencimiento'] ?? datos['fecha_vencimiento'] ?? '');
      if (!isNaN(d.getTime())) {
        d.setDate(d.getDate() + 4);
        fechaConRecargo = d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
      }
    } catch { /* silencioso */ }

    const fmtCOP      = (v: number) => v.toLocaleString('es-CO', { minimumFractionDigits: 2 });
    const barcodeValue = `(415)${codPago.padStart(13, '0')}(8020)${numero}(3900)${String(total).padStart(12, '0')}`;

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Factura N° ${numero}</title>
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
  <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"><\/script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:10px;color:#000;background:#fff}
    .page{max-width:800px;margin:0 auto;padding:8px;background:#fff}
    .header{display:grid;grid-template-columns:200px 1fr 180px;gap:8px;border:2px solid #000;padding:8px;margin-bottom:4px}
    .logo-section{display:flex;flex-direction:column;gap:4px}
    .logo-title{font-size:9px;color:#666;line-height:1.4}
    .nit{font-size:8px;color:#666}
    .center-section{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;border-left:1px solid #ccc;border-right:1px solid #ccc;padding:0 8px}
    .contacto{font-size:8px;text-align:center;line-height:1.6}
    .right-section{display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:4px}
    .factura-box{border:2px solid #007b3b;padding:6px 10px;text-align:center;width:100%}
    .factura-box .label{font-size:8px;font-weight:700;color:#007b3b;text-transform:uppercase}
    .factura-box .numero{font-size:16px;font-weight:700;color:#007b3b}
    .servicio-tecnico{font-size:7.5px;color:#007b3b;text-align:center;margin-top:4px;line-height:1.4}
    .periodos{display:grid;grid-template-columns:1fr 1fr 1fr;border:1px solid #000;margin-bottom:4px}
    .periodo-cell{padding:4px 8px;text-align:center;border-right:1px solid #ccc}
    .periodo-cell:last-child{border-right:none}
    .periodo-cell .lbl{font-size:8px;font-weight:700;text-transform:uppercase;color:#555}
    .periodo-cell .val{font-size:12px;font-weight:700;color:#000}
    .suscriptor{border:1px solid #000;margin-bottom:4px}
    .suscriptor-header{display:grid;grid-template-columns:1fr 1fr;background:#f0f0f0;padding:3px 8px;font-size:8px;font-weight:700;text-transform:uppercase;border-bottom:1px solid #ccc}
    .s-label{font-size:8px;font-weight:700;color:#555;padding-right:6px;white-space:nowrap}
    .s-val{font-size:9px;color:#000;padding-right:12px}
    .conceptos{border:1px solid #000;margin-bottom:4px}
    .conceptos-header{background:#007b3b;color:#fff;display:grid;grid-template-columns:1fr 100px;padding:4px 8px;font-size:8px;font-weight:700;text-transform:uppercase}
    .concepto-row{display:grid;grid-template-columns:1fr 100px;padding:6px 8px;border-bottom:1px solid #eee;min-height:40px}
    .concepto-desc{font-size:9px;font-weight:700}
    .concepto-val{font-size:9px;text-align:right;font-weight:700}
    .cufe{font-size:7px;color:#333;padding:4px 8px;border-top:1px solid #eee;word-break:break-all}
    .legal{font-size:7px;color:#333;padding:4px 8px;border-top:1px solid #eee;line-height:1.4;background:#fffbe6}
    .totales{display:grid;grid-template-columns:1fr 200px;gap:0;border:1px solid #000;margin-bottom:4px}
    .totales-left{padding:6px 8px;border-right:1px solid #ccc}
    .totales-left .resolucion{font-size:7.5px;line-height:1.5}
    .totales-right{display:flex;flex-direction:column}
    .total-row{display:flex;justify-content:space-between;padding:4px 8px;border-bottom:1px solid #eee;font-size:9px}
    .total-row.destacado{background:#f0f7f0;font-weight:700}
    .total-final{display:flex;align-items:center;justify-content:space-between;padding:6px 8px;background:#007b3b;color:#fff}
    .total-final .label{font-size:9px;font-weight:700;text-transform:uppercase}
    .total-final .amount{font-size:14px;font-weight:700}
    .barcode-section{border:1px solid #000;padding:6px 8px;margin-bottom:4px;display:flex;flex-direction:column;align-items:center}
    .barcode-section svg{max-width:100%}
    .stub-divider{border-top:2px dashed #000;margin:8px 0;text-align:center;font-size:8px;color:#666;padding-top:4px}
    .stub{border:1px solid #000;display:grid;grid-template-columns:1fr auto;gap:0}
    .stub-left{padding:6px 8px}
    .stub-grid{display:grid;grid-template-columns:auto 1fr auto 1fr;gap:2px 8px;font-size:8px}
    .stub-label{font-weight:700;color:#555;white-space:nowrap}
    .stub-right{border-left:1px solid #ccc;background:#007b3b;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px 16px;min-width:160px}
    .footer-note{font-size:7.5px;color:#666;text-align:center;margin-top:6px}
    @media print{body{background:#fff}.page{padding:0;max-width:100%}@page{margin:8mm}}
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="logo-section">
      <div style="font-size:20px;font-weight:900;color:#e65c00;letter-spacing:-1px">Viboral</div>
      <div style="font-size:8px;color:#e65c00;font-weight:600;letter-spacing:1px;margin-top:-4px">TELECOMUNICACIONES</div>
      <div class="logo-title">Cooperativa Multiactiva de<br>Telecomunicaciones y Telemáticos<br>"Viboral Television"</div>
      <div class="nit">NIT. 811.013.014-1<br>www.viboral.tv</div>
    </div>
    <div class="center-section">
      <div style="font-size:9px;color:#666;text-align:center">Operador de</div>
      <div style="font-size:18px;font-weight:700;color:#e65c00;text-align:center">TVColombia<br><span style="font-size:12px">digital</span></div>
      <div class="contacto">Quejas y reclamos<br>TEL: 314 7258728, WSP: 314 7258728<br>servicioasociado@viboral.tv<br>Carrera 30 # 29 – 24 EL CARMEN DE<br>VIBORAL TV (ANT).</div>
      <canvas id="qr" width="70" height="70"></canvas>
    </div>
    <div class="right-section">
      <div class="factura-box">
        <div class="label">Factura Electrónica de Venta</div>
        <div class="numero">N° 05-${numero}</div>
      </div>
      <div class="servicio-tecnico">Servicio Técnico Domingos<br>de 8 am. a 2 pm.<br>en el cel. 3147258728</div>
    </div>
  </div>

  <div class="periodos">
    <div class="periodo-cell"><div class="lbl">Período</div><div class="val">${periodo || '—'}</div></div>
    <div class="periodo-cell"><div class="lbl">Pago sin recargo</div><div class="val">${vence}</div></div>
    <div class="periodo-cell"><div class="lbl">Pago con recargo</div><div class="val">${fechaConRecargo || '—'}</div></div>
  </div>

  <div class="suscriptor">
    <div class="suscriptor-header">
      <span>Datos del suscriptor</span>
      <span>Fecha Emisión: ${fecha}</span>
    </div>
    <div style="display:grid;grid-template-columns:auto 1fr auto 1fr;padding:4px 8px;gap:0 8px">
      <span class="s-label">C.C</span><span class="s-val">${cliente?.documento_identidad ?? ''}</span>
      <span class="s-label">Suscriptor</span><span class="s-val" style="font-weight:700">${cliente?.nombres ?? ''}</span>
    </div>
    <div style="display:grid;grid-template-columns:auto 1fr auto 1fr;padding:2px 8px 4px;gap:0 8px">
      <span class="s-label">Dirección</span><span class="s-val">${direccion}</span>
      <span class="s-label">Código</span><span class="s-val">${codPago}</span>
    </div>
    <div style="display:grid;grid-template-columns:auto 1fr auto 1fr;padding:2px 8px 4px;gap:0 8px">
      <span class="s-label">Fecha Validación</span><span class="s-val">${fecha}</span>
      <span class="s-label">Teléfono</span><span class="s-val">${telefono}</span>
    </div>
  </div>

  <div class="conceptos">
    <div class="conceptos-header">
      <span>Descripción del servicio</span>
      <span style="text-align:right">Valor</span>
    </div>
    <div class="concepto-row">
      <div class="concepto-desc">
        TELECOMUNICACIONES Y TELEMÁTICOS<br>
        <span style="font-weight:400;font-size:8px">Período: ${periodo || '—'} &nbsp;|&nbsp; Código: ${codPago}</span>
      </div>
      <div class="concepto-val">${fmtCOP(total)}</div>
    </div>
    <div class="cufe">
      <strong>Estado:</strong> ${estado} &nbsp;&nbsp;
      <strong>Factura N°:</strong> ${numero} &nbsp;&nbsp;
      <strong>ID Factura:</strong> ${datos['idFactura'] ?? datos['IdFactura'] ?? '—'}
    </div>
    <div class="legal">
      Esta Factura se asimila en todos sus efectos legales a una letra de Cambio según Artículo 621 – 774 del Código de
      comercio. Después de su vencimiento se causará intereses de mora del ___% mensual (Art. 1617 C. Civil)
    </div>
  </div>

  <div class="totales">
    <div class="totales-left">
      <div class="resolucion">
        <strong>Resolución DIAN</strong> según normativa vigente de facturación electrónica.<br>
        <strong>CUFE:</strong> ${datos['idFactura'] ?? numero}
      </div>
    </div>
    <div class="totales-right">
      <div class="total-row"><span>Sub Total</span><span>${fmtCOP(total)}</span></div>
      <div class="total-row destacado"><span>Total del Mes</span><span>${fmtCOP(total)}</span></div>
      <div class="total-final">
        <div>
          <div style="display:flex;align-items:center;gap:6px">
            <span style="font-size:18px">➡</span>
            <span class="label">Total a pagar</span>
          </div>
          <div style="font-size:8px;opacity:0.8">Suscriptor</div>
        </div>
        <span class="amount">${fmtCOP(deuda)}</span>
      </div>
    </div>
  </div>

  <div class="barcode-section">
    <svg id="barcode"></svg>
  </div>

  <div class="stub-divider">✂ &nbsp; Talón desprendible &nbsp; ✂</div>
  <div class="stub">
    <div class="stub-left">
      <div class="stub-grid">
        <span class="stub-label">C.C</span><span>${cliente?.documento_identidad ?? ''}</span>
        <span class="stub-label">Suscriptor</span><span style="font-weight:700">${cliente?.nombres ?? ''}</span>
        <span class="stub-label">Dirección</span><span>${direccion}</span>
        <span class="stub-label">Período</span><span>${periodo || '—'}</span>
        <span class="stub-label">Código</span><span>${codPago}</span>
        <span class="stub-label">P. Sin Recargo</span><span>${vence}</span>
        <span class="stub-label">Teléfono</span><span>${telefono}</span>
        <span class="stub-label">P. Con Recargo</span><span>${fechaConRecargo || '—'}</span>
      </div>
      <div style="margin-top:6px"><svg id="barcode2" style="max-width:100%"></svg></div>
    </div>
    <div class="stub-right">
      <div style="font-size:8px;font-weight:700;text-transform:uppercase;opacity:0.9;margin-bottom:4px">
        Factura Electrónica de Venta<br>
        <span style="font-size:11px">N° 05-${numero}</span>
      </div>
      <div style="font-size:8px;opacity:0.8;margin-bottom:6px">Total a pagar</div>
      <div style="font-size:20px;font-weight:700">${fmtCOP(deuda)}</div>
      <div style="font-size:8px;margin-top:6px;opacity:0.8">SISTEMA</div>
    </div>
  </div>

  <div class="footer-note">
    Documento generado el ${new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })} —
    Este documento es un comprobante de su factura de servicios electrónica.
  </div>
</div>

<script>
  JsBarcode("#barcode", "${barcodeValue}", { format:"CODE128", width:1.8, height:50, displayValue:true, fontSize:9, margin:4 });
  JsBarcode("#barcode2", "${barcodeValue}", { format:"CODE128", width:1.5, height:35, displayValue:false, margin:2 });
  QRCode.toCanvas(document.getElementById('qr'),
    'Factura:${numero} Total:${total} CC:${cliente?.documento_identidad ?? ''} Cod:${codPago}',
    { width:70, margin:1 }
  );
  window.onload = () => window.print();
<\/script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  }

  private cargarServicios(codigoCuenta: string): void {
    this.loadingServicios.set(true);
    this.errorServicios.set(null);
    this.api.getServicios(codigoCuenta).subscribe({
      next: (res) => {
        this.servicios.set(Array.isArray(res.servicios) ? res.servicios.filter(Boolean) : []);
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
        this.atenciones.set(this.extraerAtenciones(res));
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
        this.facturas.set(this.extraerFacturas(res));
        this.loadingFacturas.set(false);
      },
      error: (err: Error) => {
        this.errorFacturas.set(err.message);
        this.loadingFacturas.set(false);
      },
    });
  }

  private extraerAtenciones(res: any): Atencion[] {
    const candidatos = ['resultado', 'atenciones', 'data', 'items', 'registros', 'lista', 'response', 'detalle', 'historial'];
    for (const key of candidatos) {
      if (res[key] != null) {
        const val = res[key];
        if (Array.isArray(val) && val.length > 0) return val;
        if (typeof val === 'object' && !Array.isArray(val)) return [val];
      }
    }
    return Array.isArray(res) ? res : [];
  }

  private extraerFacturas(res: any): DatosGenericos[] {
    if (Array.isArray(res) && res.length > 0) return res;
    const candidatos = ['resultado', 'facturas', 'data', 'items', 'registros', 'lista'];
    for (const key of candidatos) {
      if (res[key] != null) {
        const val = res[key];
        if (Array.isArray(val) && val.length > 0) return val;
        if (typeof val === 'object' && !Array.isArray(val)) return [val];
      }
    }
    return [];
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
    this.errorDescarga.set(null);
    this.descargaExitosa.set(null);
  }

  private toArray(resultado: any): DatosGenericos[] {
    if (!resultado) return [];
    if (Array.isArray(resultado)) return resultado.filter(Boolean);
    return [resultado];
  }

} // ← único cierre de clase