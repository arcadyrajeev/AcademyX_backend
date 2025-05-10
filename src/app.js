require('dotenv').config()
const express = require("express")
const app = express()
const cors = require("cors")
const cookieParser = require("cookie-parser")
app.use(cors({
    origin : "http://localhost:5173",
    credentials: true 
}))
app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended:true,limit:"16kb"}))
app.use(cookieParser())


const userRouter = require("./routes/user.route.js")
const courseRouter = require("./routes/course.route.js")
const lessonRouter = require("./routes/lesson.route.js")
const enrollmentRouter = require("./routes/enrollment.route.js")
const dashboardRouter = require("./routes/dashboard.route.js")
//const paymentRouter = require("../src/routes/razorpayPayment.route.js")

const likeRouter = require("../src/routes/like.route.js")
app.use("/api/v1/users",userRouter)
app.use("/api/v1/courses",courseRouter)
app.use("/api/v1/lessons",lessonRouter)
app.use("/api/v1/enrollments",enrollmentRouter)
app.use("/api/v1/dashboards",dashboardRouter)
//app.use("/api/v1/payments",paymentRouter)
app.use("/api/v1/likes",likeRouter)
module.exports = app