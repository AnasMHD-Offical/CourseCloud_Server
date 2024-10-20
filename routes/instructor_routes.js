//Importing Es modules
import express from "express"
import { instructor_login, instructor_register, send_otp, validate_otp ,reset_password } from "../controller/instructor_controller.js"
const instructor_route = express.Router()

//Routes for instructor login
instructor_route.post("/instructor_login", instructor_login)

//Route for instructor registration
instructor_route.post("/instructor_register", instructor_register)

//Route for instructor sent otp
instructor_route.post("/send_otp", send_otp)

//Route for instructor validate otp
instructor_route.post("/validate_otp", validate_otp)

//Route for instructor reset password
instructor_route.put("/reset_password",reset_password)

//Exporting instructor_route module
export default instructor_route