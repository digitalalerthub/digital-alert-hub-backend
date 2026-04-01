# Modulo de Reportes

## 1. Objetivo

El modulo de reportes entrega una vista consolidada de alertas, con filtros y visualizaciones construidas sobre la base real de datos del proyecto.

La implementacion evita depender de una herramienta externa tipo BI y mantiene el control dentro del stack actual.

## 2. Stack Involucrado

- Backend: Express + Sequelize + PostgreSQL.
- Frontend: React + Vite + TypeScript.
- Graficas: Recharts.
- Infraestructura: Render, Vercel y Neon.

## 3. Endpoint Principal

Ruta:

- `GET /api/reports/alerts`

Proteccion:

- `verifyToken`
- validacion de rol dentro del controlador

Roles actualmente autorizados:

- `administrador`
- `ciudadano`
- `jac`

## 4. Filtros Soportados

Query params disponibles:

- `id_estado`
- `id_comuna`
- `id_barrio`
- `year`
- `months`
- `category`

Ejemplo:

```http
GET /api/reports/alerts?id_estado=3&id_comuna=4&year=2026&months=2026-01,2026-02&category=Seguridad%20y%20Convivencia
```

Validaciones relevantes:

- `year` debe ser un anio valido.
- `months` debe usar formato `YYYY-MM`.
- si se combinan `year` y `months`, todos los meses deben pertenecer al mismo anio filtrado.
- `category` se resuelve contra el catalogo actual de categorias.

## 5. Payload Devuelto

El backend devuelve una estructura lista para la UI:

- `filters`
- `kpis`
- `charts.alertasPorEstado`
- `charts.alertasPorBarrio`
- `charts.alertasPorCategoria`
- `charts.tendenciaMensual`
- `catalogos.estados`
- `catalogos.comunas`
- `catalogos.barrios`
- `catalogos.categorias`
- `catalogos.years`
- `generated_at`

## 6. KPIs Actuales

- `porAtender`
- `enProceso`
- `resueltas`
- `falsasAlertas`
- `total`

Los estados se resuelven contra el workflow configurado en la base de datos, no por valores hardcodeados en frontend.

## 7. Implementacion Backend

Archivos principales:

- `src/routes/reports/reportRoutes.ts`
- `src/controllers/reports/reportController.ts`
- `src/services/reports/reportService.ts`

Responsabilidades:

- validar acceso,
- parsear filtros,
- consultar alertas y catalogos,
- construir agregaciones,
- ordenar y devolver datos listos para graficar.

## 8. Implementacion Frontend

Archivos principales del repositorio hermano:

- `../digital-alert-hub-frontend/src/pages/Reportes/ReportesPage.tsx`
- `../digital-alert-hub-frontend/src/services/reportsService.ts`
- `../digital-alert-hub-frontend/src/types/Report.ts`
- `../digital-alert-hub-frontend/src/pages/Reportes/reportes.utils.ts`

La vista actual incluye:

- filtros por estado, comuna, barrio, anio, meses y categoria,
- KPIs,
- grafica de tendencia de resueltas,
- grafica por barrio,
- grafica por estado,
- grafica por categoria,
- y un mapa con alertas acorde a filtros.

## 9. Refresco de Datos

La vista se actualiza automaticamente en intervalos definidos por `AUTO_REFRESH_MS`.

Esto evita recargar manualmente la pagina y mantiene una complejidad tecnica moderada frente a alternativas como SSE o WebSockets.

## 10. Dependencias y Catalogos

El modulo depende de:

- workflow valido en tabla `estados`,
- categorias coherentes en el catalogo,
- comunas y barrios cargados en base de datos,
- y permisos correctos en las rutas protegidas.

Si el workflow no esta configurado, el backend devuelve error controlado.

## 11. Estado Documental

La version previa de este documento era util como memoria historica, pero quedo desalineada en:

- nombres de archivos,
- permisos por rol,
- filtros soportados,
- y alcance funcional del dashboard.

Esta version reemplaza esa descripcion antigua.

## 12. Validacion Recomendada

Backend:

```bash
npm run build
```

Frontend:

```bash
npm run build
```

Pruebas funcionales sugeridas:

- acceso con rol permitido,
- rechazo con rol no permitido,
- filtros por estado y territorio,
- combinacion `year + months`,
- categoria valida e invalida,
- y actualizacion automatica del dashboard.
