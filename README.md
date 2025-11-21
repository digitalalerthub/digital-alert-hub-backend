# DigitalAlertHub_Backend
Backend de aplicación web Digital Alert Hub

Creación del proyecto con: **npm init -y** _(Inicializa un proyecto en Node.js)_

**Instalación Dependencias:**
* **bcrypt:** npm install bcrypt _encripta contraseñas antes de guardarlas en la base de datos (hashing)_
* **cors:** npm install cors _Permite que la API pueda ser consumida desde un frontend en otro dominio (muy usado con React + Node)._
* **dotenv:** npm install dotenv _Carga variables de entorno desde el archivo .env (como claves secretas, puertos, etc.)._
* **express:** npm install express _Framework minimalista para crear servidores y APIs en Node.js._
* **jsonwebtoken (JWT):** npm install jsonwebtoken _Genera y valida tokens de autenticación (muy usado para login seguro)._
* **pg:** npm install pg _Driver de Node para conectarse a PostgreSQL_
* **pg-hstore:** npm install pg-hstore _Sirve para serializar y deserializar datos JSON en PostgreSQL (lo usa Sequelize)._
* **sequelize:** npm install sequelize _ORM para manejar bases de datos SQL (Postgres, MySQL, etc.) con modelos en JS/TS._

**Configuración Archivo .env**

- PORT=4000
- DB_HOST=localhost
- DB_PORT=5432
- DB_NAME=nombre_base_de_datos
- DB_USER=nombre usuario por lo general si es postgresql seria **postgres**
- DB_PASSWORD=contraseña con la que inicia el postgres
- JWT_SECRET=7a3d5e6b1f9c84c92f9e3e1b5f3b0a19d9c42b8275c2a9f5b7a08d9e3d7c1e2f (es un ejemplo)

- _(Este JWT_SECRET puede generarlo entrando a git bash con el comando:_ **node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"** 
generara algo como: **7a3d5e6b1f9c84c92f9e3e1b5f3b0a19d9c42b8275c2a9f5b7a08d9e3d7c1e2f** 



Ejecución del proyecto con: **npm run dev**

