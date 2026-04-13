# ViboralTelevisión — Portal del Cliente

Portal web para que los clientes de ViboralTelevisión consulten el estado
de su cuenta, servicios activos, atenciones e historial de facturas.

---

## Requisitos previos

- Node.js `>= 20.19.0`
- npm `>= 10`

---

## Instalación y ejecución

```bash
# 1. Instala las dependencias
npm install

# 2. Inicia el servidor de desarrollo (con proxy al API)
npm start
```

Abre tu navegador en **http://localhost:4200**

---

## Estructura del proyecto

```
src/
├── app/
│   ├── components/
│   │   └── dashboard/
│   │       ├── dashboard.ts       ← Lógica de tabs, carga de datos y detalle
│   │       └── dashboard.html     ← Template con tabs, tablas y panel de detalle
│   ├── shared/
│   │   ├── models/
│   │   │   └── cliente.models.ts  ← Interfaces TypeScript del dominio
│   │   └── services/
│   │       └── cliente-api.service.ts ← Servicio centralizado de llamadas HTTP
│   ├── app.ts                     ← Componente raíz con el buscador
│   ├── app.html                   ← Template del buscador y layout principal
│   ├── app.config.ts              ← Configuración de providers (HTTP, Router)
│   └── app.routes.ts              ← Rutas de la aplicación
├── environments/
│   ├── environment.development.ts ← Config desarrollo (usa proxy)
│   └── environment.ts             ← Config producción
└── styles.css                     ← Tailwind CSS global
```

---

## APIs integradas

| Endpoint | Descripción |
|---|---|
| `GET /api/v1/cliente/:cedula` | Datos del cliente |
| `GET /api/v1/cliente/:cedula/servicios` | Servicios activos |
| `GET /api/v1/cliente/:cedula/atenciones` | Historial de atenciones |
| `GET /api/v1/cliente/:cedula/facturas` | Listado de facturas |
| `GET /api/v1/factura/:id` | Detalle de una factura |

El proxy en `proxy.conf.json` redirige `/api` →
`https://apigestion-viboraltv.scordsoft.net` en desarrollo.

---

## Variables de entorno

Edita `src/environments/environment.development.ts` para cambiar el token:

```ts
export const environment = {
  production: false,
  API_URL: '',          // vacío porque usa el proxy
  API_KEY: 'TU_TOKEN',
};
```

---

## Cédulas de prueba

- `43466173`
- `0100047048`
- `0100047053`
## Configuración inicial

1. Clona el repositorio
2. Instala dependencias: `npm install`
3. Crea los archivos de entorno a partir de la plantilla:

```bash
cp src/environments/environment.template.ts src/environments/environment.development.ts
cp src/environments/environment.template.ts src/environments/environment.ts
```

4. Edita ambos archivos con los valores reales (pide el token al líder del proyecto)
5. Corre el proyecto: `npm start`

> ⚠️ Los archivos `environment.development.ts` y `environment.ts` están en `.gitignore`.
> Nunca los subas al repositorio.