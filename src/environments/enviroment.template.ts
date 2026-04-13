// src/environments/environment.template.ts
// ─────────────────────────────────────────────────────────────────
// INSTRUCCIONES:
// 1. Copia este archivo y renómbralo a:
//      - environment.development.ts  (para desarrollo local)
//      - environment.ts              (para producción)
// 2. Rellena los valores reales
// 3. NUNCA subas los archivos con datos reales al repositorio
// ─────────────────────────────────────────────────────────────────

export const environment = {
  production: false,             // true en environment.ts
  API_URL: '',                   // '' en dev (usa proxy), URL completa en prod
  API_KEY: 'TU_TOKEN_AQUI',     // Token real — NO commitear
};