# Modulo De Reportes

## Objetivo

Se reemplazo la idea de integrar Power BI por un modulo de reportes propio dentro del stack actual del proyecto:

- `Backend`: `Node.js + Express + Sequelize + PostgreSQL`
- `Frontend`: `React + Vite + TypeScript`
- `Base de datos`: PostgreSQL en Neon
- `Hosting`: Render para backend y vercel para frontend

La meta fue construir una vista de reportes que:

- consulte la base de datos real,
- muestre metricas y graficas actualizadas,
- permita filtrar por `estado`, `comuna`, `barrio` y `mes`,
- no dependa de licencias de terceros.

---

### Libreria elegida

Se uso `Recharts` en el frontend porque:

- encaja bien con React,
- soporta `LineChart`, `BarChart`, `PieChart`, `ResponsiveContainer`,
- permite construir graficas sin meter una solucion pesada tipo BI.

No se opto por graficas en `SVG` puro porque era mas costoso en tiempo y mantenimiento.

---

## Flujo General

1. El usuario entra a la ruta `/reportes`.
2. El frontend carga comunas y barrios para poblar filtros.
3. El frontend llama al endpoint `GET /api/reports/alerts`.
4. El backend consulta `alertas`, agrupa por estado, barrio, categoria y mes.
5. El backend devuelve un payload listo para el dashboard.
6. El frontend pinta:
   - KPIs,
   - linea por barrio,
   - barras de resueltas,
   - distribucion por estado,
   - distribucion por categoria.
7. La vista se refresca automaticamente cada 60 segundos.

---

## Implementacion Backend

### 1. Nuevo endpoint de reportes

Se creo un nuevo controlador en:

- `src/controllers/reportController.ts`

Responsabilidad:

- validar filtros,
- validar acceso por rol,
- consultar alertas,
- transformar datos,
- devolver estructuras listas para graficar.

### 2. Nueva ruta

Se agrego:

- `src/routes/reportRoutes.ts`

Ruta expuesta:

- `GET /api/reports/alerts`

### 3. Registro en la app

Se conecto la ruta en:

- `src/app.ts`

con:

```ts
app.use("/api/reports", reportRoutes);
```

### 4. Seguridad

El endpoint usa `verifyToken` y adicionalmente valida el rol dentro del controlador:

- `1 = admin`
- `3 = JAC`

Los demas usuarios reciben `403`.

### 5. Filtros soportados

Query params:

- `id_estado`
- `id_comuna`
- `id_barrio`
- `month` en formato `YYYY-MM`

Ejemplo:

```http
GET /api/reports/alerts?id_estado=3&id_comuna=4&month=2026-03
```

### 6. Payload devuelto

El endpoint devuelve:

- `filters`: filtros aplicados,
- `kpis`: totales principales,
- `charts.alertasPorEstado`,
- `charts.alertasPorBarrio`,
- `charts.alertasPorCategoria`,
- `charts.tendenciaMensual`,
- `catalogos.estados`,
- `catalogos.comunas`,
- `catalogos.barrios`,
- `generated_at`: fecha/hora de generacion.

Ejemplo simplificado:

```json
{
  "kpis": {
    "total": 42,
    "porAtender": 10,
    "enProceso": 12,
    "resueltas": 15,
    "falsasAlertas": 5
  },
  "charts": {
    "alertasPorEstado": [],
    "alertasPorBarrio": [],
    "alertasPorCategoria": [],
    "tendenciaMensual": []
  },
  "generated_at": "2026-03-11T03:20:00.000Z"
}
```

### 7. Correccion semantica en estadisticas

En:

- `src/controllers/statsController.ts`

se corrigio la inconsistencia original:

- antes `alertasAtendidas` contaba `id_estado = 1`,
- ahora `alertasResueltas` cuenta `id_estado = 3`.

Para no romper compatibilidad con el frontend existente, se dejo:

- `alertasAtendidas: alertasResueltas`
- `alertasResueltas`

---

## Implementacion Frontend

Nota: el frontend vive en un repositorio hermano:

- `../digital-alert-hub-frontend`

### 1. Nueva vista de reportes

Archivo principal:

- `src/pages/Reportes/ReportesPage.tsx`

Responsabilidad:

- manejar filtros,
- cargar datos,
- refrescar automaticamente,
- renderizar tarjetas y graficas.

### 2. Tipos del modulo

Se creo:

- `src/types/Report.ts`

Con los tipos:

- `ReportFilters`
- `ReportFilterState`
- `AlertReportResponse`
- items de series y catalogos

### 3. Servicio HTTP

Se creo:

- `src/services/reportsService.ts`

Responsabilidad:

- consumir `/reports/alerts`,
- enviar query params,
- tipar la respuesta.

### 4. Libreria agregada

Se instalo:

```bash
npm install recharts
```

Se uso para:

- `LineChart`
- `BarChart`
- `PieChart`
- `Tooltip`
- `Legend`
- `ResponsiveContainer`

### 5. Integracion con rutas protegidas

En:

- `src/App.tsx`

la ruta `/reportes` se dejo protegida bajo `RoleRoute` para:

- `admin`
- `JAC`

### 6. Auto refresh

La vista recarga el reporte cada `60s` usando `setInterval`.

No requiere recargar la pagina manualmente.

Ventaja:

- simple de mantener,
- suficiente para un dashboard administrativo,
- evita complejidad inicial de WebSockets o SSE.

### 7. Filtros dinamicos

La vista usa:

- `locationsService.listComunas()`
- `locationsService.listBarriosByComuna(idComuna)`

Comportamiento:

- si cambia comuna, se reinicia barrio,
- si no hay comuna, barrio se deshabilita.

### 8. Ajustes de UI

La vista tuvo varias iteraciones visuales:

1. version inicial tipo dashboard nativo,
2. ajuste para parecerse mas al mockup,
3. conservacion del fondo existente,
4. alineacion con el patron visual de `Usuarios` y `Roles`,
5. titulo en blanco para no perder contraste,
6. color adicional en las graficas.

Estado final:

- mismo patron de contenedor grande que `Usuarios` y `Roles`,
- breadcrumb con casa,
- encabezado centrado,
- tarjeta blanca principal,
- filtros arriba,
- KPIs al centro,
- 4 graficas compactas.

---

## Archivos Backend Tocados

- `src/app.ts`
- `src/controllers/statsController.ts`
- `src/controllers/reportController.ts`
- `src/routes/reportRoutes.ts`

## Archivos Frontend Tocados

- `src/App.tsx`
- `src/pages/Reportes/ReportesPage.tsx`
- `src/pages/Reportes/ReportesPage.css`
- `src/services/reportsService.ts`
- `src/types/Report.ts`
- `package.json`
- `package-lock.json`

---

## Herramientas Utilizadas

### Backend

- `Express`
- `Sequelize`
- `PostgreSQL`
- `Neon`
- `TypeScript`

### Frontend

- `React`
- `Vite`
- `TypeScript`
- `Axios`
- `Recharts`

### Infraestructura

- `Neon` para base de datos PostgreSQL
- `Render` para despliegue del backend/frontend

---

## Neon Y Render

### Neon

Se valido que Neon era adecuado para este escenario porque:

- las consultas son agregaciones SQL relativamente livianas,
- las evidencias no se guardan en la base, sino en Cloudinary,
- el volumen principal es texto y metadatos, no binarios pesados.

Se reviso que el uso de storage estaba bajo:

- aproximadamente `0.03 / 0.5 GB`

Eso significa que habia margen suficiente para seguir trabajando.

### Render

Render tambien es adecuado para este dashboard porque:

- el backend expone endpoints REST normales,
- el frontend solo consume JSON,
- no depende de software externo tipo BI server.

---

## Validacion Tecnica

### Backend

Se valido con:

```bash
npx tsc --noEmit
```

### Frontend

Se valido con:

```bash
npm run build
```

El frontend compilo correctamente.

Se observaron advertencias no bloqueantes:

- chunks grandes del bundle,
- referencia a `Fondo_Formularios.png` en runtime.

---

## Como Funciona El Reporte

### KPI 1

- `Alertas por atender`
- cuenta `id_estado = 1`

### KPI 2

- `Alertas solucionadas`
- cuenta `id_estado = 3`

### KPI 3

- `Alertas en Proceso`
- cuenta `id_estado = 2`

### KPI 4

- `Alertas Falsas`
- cuenta `id_estado = 4`

### Grafica 1

- `Alertas por Barrio`
- linea con top de barrios segun cantidad

### Grafica 2

- `Alertas Resueltas`
- barras usando la serie mensual de resueltas

### Grafica 3

- `Alertas por Estado`
- dona/pie con distribucion actual

### Grafica 4

- `Alertas por Categoria`
- pie con categorias mas reportadas

---

## Ventajas Del Enfoque Elegido

- sin costo adicional por licencias BI
- control total sobre UI y permisos
- integracion directa con autenticacion existente
- filtros ajustados al modelo real de datos
- facil de extender

---

## Posibles Mejoras Futuras

1. Exportar a `CSV` o `PDF`.
2. Agregar mas graficas:
   - por prioridad,
   - por usuario informante,
   - por comuna.
3. Agregar cache para consultas de reportes si crece el trafico.
4. Implementar `SSE` o `WebSockets` si alguna vez se requiere tiempo real mas agresivo.
5. Hacer carga diferida del modulo de reportes para bajar el tamaño del bundle.
6. Crear datos demo controlados para visualizar mejor la distribucion de las graficas.

---

## Resumen Ejecutivo

Se construyo un modulo de reportes propio, conectado a la base de datos real, con filtros y graficas interactivas, sin usar Power BI. El backend calcula agregaciones y el frontend las muestra con `Recharts`, protegido por rol y con refresco automatico.

En terminos funcionales, ya existe una base util para:

- mostrar indicadores,
- explorar alertas por zona,
- revisar distribucion por estado,
- seguir tendencia mensual,
- extender el dashboard segun nuevas necesidades.
