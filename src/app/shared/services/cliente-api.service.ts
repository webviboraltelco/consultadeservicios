import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { ApiResponse, Cliente, DatosGenericos } from '../models/cliente.models';

@Injectable({ providedIn: 'root' })
export class ClienteApiService {
  private readonly baseUrl = `${environment.API_URL}/api/v1`;
  private readonly http = inject(HttpClient);

  // Headers reutilizables con el token de autorización
  private get headers(): HttpHeaders {
    return new HttpHeaders({
      accept: 'application/json',
      Authorization: environment.API_KEY,
    });
  }

  // Centraliza el manejo de errores HTTP para todos los métodos
  private handleError(err: any): Observable<never> {
    const msg =
      err?.error?.mensaje ??
      err?.error?.message ??
      err?.message ??
      'Error al conectar con el servidor';
    return throwError(() => new Error(msg));
  }

  // GET /api/v1/cliente/:cedula
  getCliente(cedula: string): Observable<ApiResponse<Cliente | Cliente[]>> {
    return this.http
      .get<ApiResponse<Cliente | Cliente[]>>(
        `${this.baseUrl}/cliente/${cedula}`,
        { headers: this.headers }
      )
      .pipe(catchError((err) => this.handleError(err)));
  }

  // GET /api/v1/cliente/:cedula/servicios
  getServicios(cedula: string): Observable<ApiResponse<DatosGenericos[]>> {
    return this.http
      .get<ApiResponse<DatosGenericos[]>>(
        `${this.baseUrl}/cliente/${cedula}/servicios`,
        { headers: this.headers }
      )
      .pipe(catchError((err) => this.handleError(err)));
  }

  // GET /api/v1/cliente/:cedula/atenciones
  getAtenciones(cedula: string): Observable<ApiResponse<DatosGenericos[]>> {
    return this.http
      .get<ApiResponse<DatosGenericos[]>>(
        `${this.baseUrl}/cliente/${cedula}/atenciones`,
        { headers: this.headers }
      )
      .pipe(catchError((err) => this.handleError(err)));
  }

  // GET /api/v1/cliente/:cedula/facturas
  getFacturas(cedula: string): Observable<ApiResponse<DatosGenericos[]>> {
    return this.http
      .get<ApiResponse<DatosGenericos[]>>(
        `${this.baseUrl}/cliente/${cedula}/facturas`,
        { headers: this.headers }
      )
      .pipe(catchError((err) => this.handleError(err)));
  }

  // GET /api/v1/factura/:id
  getFacturaDetalle(id: string): Observable<ApiResponse<DatosGenericos>> {
    return this.http
      .get<ApiResponse<DatosGenericos>>(
        `${this.baseUrl}/factura/${id}`,
        { headers: this.headers }
      )
      .pipe(catchError((err) => this.handleError(err)));
  }
}
