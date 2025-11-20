console.log("Backend INICIADO desde:", __filename);

import express, { Application, Request, Response } from "express"
import cors from "cors"
import authRoutes from "./routes/authRoutes"
import alertRoutes from "./routes/alertRoutes"
import statsRoutes from "./routes/statsRoutes";


const app: Application = express()

app.use(cors())
app.use(express.json())


// rutas
app.use("/api/auth", authRoutes)
app.use("/api/alerts", alertRoutes)
app.use("/api/stats", statsRoutes)
console.log("Stats route MONTADA");




// endpoint raíz
app.get("/", (req: Request, res: Response) => {
  res.send(" API DigitalAlertHub activa")
  
})

export default app