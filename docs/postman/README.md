# Coleccion API

Pruebas manuales para el backend:

- Coleccion Postman: `docs/postman/DigitalAlertHub.postman_collection.json`
- Environment local: `docs/postman/DigitalAlertHub.local.postman_environment.json`

## Uso rapido

1. Importa ambos archivos en Postman.
2. Selecciona el environment `Digital Alert Hub Local`.
3. Ajusta `base_url`, credenciales y placeholders (`reset_token`, `verify_token`, `evidence_file`, etc.).
4. Ejecuta `Auth > Login`.
5. Si tu cliente conserva cookies por dominio, las rutas protegidas usaran la sesion automaticamente.
6. Si tu cliente no conserva cookies, copia manualmente el token o configura el header `Authorization: Bearer ...` segun el flujo que estes probando.

## Insomnia

Insomnia puede importar colecciones Postman v2.1, por lo que este mismo archivo sirve como entregable para ambos clientes.

## Cobertura incluida

- Salud del servicio y docs
- Autenticacion local y Google
- Catalogos, comunas, barrios y reacciones
- CRUD de alertas
- Comentarios, reacciones y cambio de estado
- Perfil de usuario
- Administracion de usuarios y roles
- Reportes y estadisticas

## Notas

- Las rutas de creacion y actualizacion de alertas usan `multipart/form-data` y esperan una ruta valida en `evidence_file`.
- `reports/alerts` exige filtros validos. Si no quieres filtrar por comuna o barrio, reemplaza esos valores segun el caso real del backend antes de ejecutar.
- Algunas rutas requieren roles especificos (`admin`, `jac` o propietario de recurso).
