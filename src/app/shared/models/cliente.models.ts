// src/app/shared/models/cliente.models.ts

export interface ApiResponse<T> {
  codigo: string;
  mensaje: string;
  resultado: T;
}

export interface ServiciosResponse {
  codigo: string;
  mensaje: string;
  servicios: Servicio[];
}

export interface Servicio {
  idServicio: number;
  NombreServicio: string;
  PrecioTarifa: number;
  Tarifa: string;
  Estado: string;
}

export interface Cliente {
  codigo: string;
  nombres: string;
  direccion: string;
  documento_identidad: string;
  estado: string;
  deuda_total: number;
}

// ✅ Interfaz tipada para atenciones
// Si la API devuelve campos distintos, el DatosGenericos del fallback los captura igual
export interface Atencion {
  numero_atencion?: string | number;
  numero?: string | number;
  id?: string | number;
  fecha?: string;
  fecha_creacion?: string;
  fecha_registro?: string;
  tipo?: string;
  tipo_atencion?: string;
  estado?: string;
  descripcion?: string;
  motivo?: string;
  observaciones?: string;
  tecnico?: string;
  ejecutivo?: string;
  responsable?: string;
  fecha_cierre?: string;
  prioridad?: string;
  // Cualquier campo extra que devuelva la API
  [key: string]: any;
}

export interface AtencionesResponse {
  codigo: string;
  mensaje: string;
  resultado: Atencion[] | Atencion;
}

export type DatosGenericos = Record<string, any>;
export type ActiveTab = 'servicios' | 'atenciones' | 'facturas';
// Agrega estas interfaces al archivo existente

export interface Factura {
  NumeroFactura?: string | number;
  Numero?: string | number;
  numero?: string | number;
  FechaEmision?: string;
  FechaVencimiento?: string;
  FechaFactura?: string;
  Periodo?: string;
  ValorTotal?: number;
  Total?: number;
  valor_total?: number;
  Estado?: string;
  EstadoFactura?: string;
  Descripcion?: string;
  // PDF / descarga
  Pdf?: string;
  pdf?: string;
  UrlPdf?: string;
  url_pdf?: string;
  Archivo?: string;
  Base64?: string;
  [key: string]: any;
}

export interface FacturaDetalle extends Factura {
  // Campos adicionales que trae el detalle
  Direccion?: string;
  NombreCliente?: string;
  Servicios?: any[];
  Conceptos?: any[];
}