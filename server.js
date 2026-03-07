// server.js
const express = require("express")
const http = require("http")
const mongoose = require("mongoose")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const cors = require("cors")
const path = require("path")

// Models
const User = require("./models/User")
const Message = require("./models/Message")

const app = express()
const server = http.createServer(app)
const io = require("socket.io")(server)

app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, "public"))) // serve frontend files

// ----------------- MongoDB Connection -----------------
mongoose.connect("mongodb://127.0.0.1:27017/studentCommunity")
.then(() => console.log("MongoDB connected"))
.catch(err => console.error("MongoDB connection error:", err))

// ----------------- Middleware -----------------
function verifyAdmin(req, res, next) {
    const token = req.headers.authorization
    if (!token) return res.status(403).json({ message: "No token" })
    try {
        const decoded = jwt.verify(token, "secretkey")
        if (decoded.role !== "admin") return res.status(403).json({ message: "Admin only" })
        req.user = decoded
        next()
    } catch (err) {
        res.status(403).json({ message: "Invalid token" })
    }
}

function verifyUser(req, res, next) {
    const token = req.headers.authorization
    if (!token) return res.status(403).json({ message: "No token" })
    try {
        const decoded = jwt.verify(token, "secretkey")
        req.user = decoded
        next()
    } catch (err) {
        res.status(403).json({ message: "Invalid token" })
    }
}

// ----------------- Routes -----------------
const router = express.Router()

// Register
router.post("/register", async (req, res) => {
    const { name, email, password } = req.body
    const existingUser = await User.findOne({ email })
    if (existingUser) return res.json({ message: "User already exists" })

    const hashedPassword = await bcrypt.hash(password, 10)
    const user = new User({
        name,
        email,
        password: hashedPassword,
        approved: false,
        role: "student"
    })
    await user.save()
    res.json({ message: "Registration successful. Wait for admin approval." })
})

// Login
router.post("/login", async (req, res) => {
    const { email, password } = req.body
    const user = await User.findOne({ email })
    if (!user) return res.json({ message: "User not found" })

    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) return res.json({ message: "Wrong password" })
    if (!user.approved) return res.json({ message: "Admin approval required" })

    const token = jwt.sign(
        { id: user._id, role: user.role, name: user.name },
        "secretkey"
    )

    res.json({ token: token, name: user.name })
})

// Get pending users (admin only)
router.get("/pending-users", verifyAdmin, async (req, res) => {
    const users = await User.find({ approved: false })
    res.json(users)
})

// Approve user (admin only)
router.post("/approve/:id", verifyAdmin, async (req, res) => {
    await User.findByIdAndUpdate(req.params.id, { approved: true })
    res.json({ message: "User approved" })
})

// Delete user (admin only)
router.delete("/delete-user/:id", verifyAdmin, async (req, res) => {
    await User.findByIdAndDelete(req.params.id)
    res.json({ message: "User deleted" })
})

app.use("/api", router)

// ----------------- Socket.IO Chat -----------------
io.on("connection", (socket) => {
    console.log("User connected")

    // Send all old messages to this user
    Message.find().then(messages => {
        socket.emit("old messages", messages)
    })

    // Receive new chat message
    socket.on("chat message", async (data) => {
        const message = new Message(data)
        await message.save()
        io.emit("chat message", data)
    })

    socket.on("disconnect", () => {
        console.log("User disconnected")
    })
})

// ----------------- Start Server -----------------
const PORT = 3000
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
})