import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'

const app=express()


//setting up middlewares
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit: '16kb'}))
app.use(express.urlencoded({extended:true, limit: '16kb'}))
app.use(express.static('public'))
app.use(cookieParser())

//import routes
import userRoute from './routes/user.routes.js'
//routes declaration
app.use("/api/v1/users", userRoute)   // http://localhost:8000/api/v1/users/register




export { app }