const buildApiServerUrl = (): string => {
  const backendUrl = process.env.BACKEND_URL?.trim();
  if (backendUrl) {
    return backendUrl.replace(/\/+$/, "");
  }

  return "http://localhost:4000";
};

export const buildOpenApiDocument = () => ({
  openapi: "3.0.3",
  info: {
    title: "Digital Alert Hub API",
    version: "1.0.0",
    description:
      "API REST para autenticacion, gestion de alertas comunitarias, usuarios, roles y reportes.",
  },
  servers: [
    {
      url: buildApiServerUrl(),
      description: "Servidor principal",
    },
  ],
  tags: [
    { name: "Auth", description: "Registro, login y recuperacion de acceso" },
    { name: "Alerts", description: "CRUD y flujo principal de alertas" },
    { name: "Users", description: "Administracion de usuarios" },
    { name: "Roles", description: "Administracion de roles" },
    { name: "Reports", description: "Reportes y estadisticas" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          message: { type: "string" },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "contrasena"],
        properties: {
          email: { type: "string", format: "email" },
          contrasena: { type: "string" },
          captchaToken: { type: "string" },
        },
      },
      RegisterRequest: {
        type: "object",
        required: ["nombre", "apellido", "email", "contrasena", "telefono"],
        properties: {
          nombre: { type: "string" },
          apellido: { type: "string" },
          email: { type: "string", format: "email" },
          contrasena: { type: "string" },
          telefono: { type: "string" },
          captchaToken: { type: "string" },
        },
      },
      ForgotPasswordRequest: {
        type: "object",
        required: ["email"],
        properties: {
          email: { type: "string", format: "email" },
          captchaToken: { type: "string" },
        },
      },
      ResetPasswordRequest: {
        type: "object",
        required: ["nuevaContrasena"],
        properties: {
          nuevaContrasena: { type: "string" },
          captchaToken: { type: "string" },
        },
      },
      AdminCreateUserRequest: {
        type: "object",
        required: ["nombre", "apellido", "email"],
        properties: {
          nombre: { type: "string" },
          apellido: { type: "string" },
          email: { type: "string", format: "email" },
          telefono: { type: "string", nullable: true },
          id_rol: { type: "integer" },
          captchaToken: { type: "string" },
        },
      },
      AlertRequest: {
        type: "object",
        required: ["titulo", "descripcion", "ubicacion", "id_comuna", "id_barrio"],
        properties: {
          titulo: { type: "string" },
          descripcion: { type: "string" },
          categoria: { type: "string" },
          id_categoria: { type: "integer" },
          ubicacion: { type: "string" },
          prioridad: { type: "string" },
          id_comuna: { type: "integer" },
          id_barrio: { type: "integer" },
        },
      },
      UserSummary: {
        type: "object",
        properties: {
          id_usuario: { type: "integer" },
          nombre: { type: "string" },
          apellido: { type: "string" },
          email: { type: "string", format: "email" },
          id_rol: { type: "integer" },
          role_name: { type: "string", nullable: true },
        },
      },
      AlertSummary: {
        type: "object",
        properties: {
          id_alerta: { type: "integer" },
          titulo: { type: "string" },
          descripcion: { type: "string" },
          categoria: { type: "string", nullable: true },
          id_estado: { type: "integer" },
          id_usuario: { type: "integer", nullable: true },
        },
      },
    },
  },
  paths: {
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Registrar nuevo usuario",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RegisterRequest" },
            },
          },
        },
        responses: {
          "201": { description: "Usuario registrado" },
          "400": {
            description: "Datos invalidos",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Iniciar sesion con correo y contrasena",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" },
            },
          },
        },
        responses: {
          "200": { description: "Login exitoso" },
          "401": { description: "Credenciales invalidas" },
          "423": { description: "Cuenta bloqueada temporalmente" },
        },
      },
    },
    "/api/auth/forgot-password": {
      post: {
        tags: ["Auth"],
        summary: "Solicitar correo de recuperacion",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ForgotPasswordRequest" },
            },
          },
        },
        responses: {
          "200": { description: "Correo enviado" },
          "404": { description: "Usuario no encontrado" },
        },
      },
    },
    "/api/auth/reset-password/{token}": {
      post: {
        tags: ["Auth"],
        summary: "Restablecer o definir contrasena",
        parameters: [
          {
            name: "token",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ResetPasswordRequest" },
            },
          },
        },
        responses: {
          "200": { description: "Contrasena actualizada" },
          "400": { description: "Token invalido o datos invalidos" },
        },
      },
    },
    "/api/alerts": {
      get: {
        tags: ["Alerts"],
        summary: "Listar alertas",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Listado de alertas" },
        },
      },
      post: {
        tags: ["Alerts"],
        summary: "Crear alerta",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AlertRequest" },
            },
          },
        },
        responses: {
          "201": { description: "Alerta creada" },
          "400": { description: "Datos invalidos" },
        },
      },
    },
    "/api/alerts/{id}": {
      get: {
        tags: ["Alerts"],
        summary: "Obtener detalle de alerta",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          "200": {
            description: "Detalle de alerta",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AlertSummary" },
              },
            },
          },
          "404": { description: "Alerta no encontrada" },
        },
      },
      put: {
        tags: ["Alerts"],
        summary: "Actualizar alerta",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          "200": { description: "Alerta actualizada" },
          "403": { description: "Sin permisos" },
        },
      },
      delete: {
        tags: ["Alerts"],
        summary: "Eliminar alerta",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          "200": { description: "Alerta eliminada" },
          "403": { description: "Sin permisos" },
        },
      },
    },
    "/api/users": {
      get: {
        tags: ["Users"],
        summary: "Listar usuarios para administracion",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Listado de usuarios" },
        },
      },
      post: {
        tags: ["Users"],
        summary: "Crear usuario desde administracion",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AdminCreateUserRequest" },
            },
          },
        },
        responses: {
          "201": { description: "Usuario creado" },
          "403": { description: "Sin permisos" },
        },
      },
    },
    "/api/roles": {
      get: {
        tags: ["Roles"],
        summary: "Listar roles",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Listado de roles" },
        },
      },
    },
    "/api/reports/alerts": {
      get: {
        tags: ["Reports"],
        summary: "Consultar reporte de alertas",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Reporte generado" },
          "403": { description: "Sin permisos" },
        },
      },
    },
  },
});
