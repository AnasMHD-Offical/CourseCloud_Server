//Importing essential modules using ES modules 
//* ^|-> NB: Gives proirity to import modules for readability and perfromance.
import "dotenv/config"
import express from "express"
import cors from "cors"
import path from "path"
import session from "express-session"
import cookieParser from "cookie-parser"
import passport from "passport"
import { fileURLToPath } from "url"
import student_route from "./routes/student_routes.js"
import instructor_route from "./routes/instructor_routes.js"
import admin_route from "./routes/admin_routes.js"
import connect_db from "./config/connet_DB.js"

//Connecting mongodb atlas 
connect_db() 


// configuring __dirname in Es module
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
 
//Initialise app from express
const app = express()

//configure the parsers for cookie and json data
app.use(express.json())
app.use(cookieParser())

//configure the cross origin resourse sharing with the client
app.use(cors({
    origin : process.env.CORS_ORIGIN_CLIENT,
    credentials: true
}))

//configure the routes of student,instructor,admin roles
app.use("/",student_route)
app.use("/instructor",instructor_route)
app.use("/admin",admin_route)

// listerning to the port in env file
const PORT = process.env.PORT || 3000
app.listen(PORT,()=>{
    console.log(`Server running on http://localhost:${PORT}`);
})    