// ---------------- LOGIN & REGISTER ----------------

async function registerUser() {
    const name = document.getElementById("name").value
    const email = document.getElementById("email").value
    const password = document.getElementById("password").value

    const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
    })

    const data = await res.json()
    alert(data.message)
}

async function loginUser() {
    const email = document.getElementById("email").value
    const password = document.getElementById("password").value

    const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    })

    const data = await res.json()

    if (data.token) {
        localStorage.setItem("token", data.token)
        localStorage.setItem("username", data.name)  // store user name
        window.location.href = "dashboard.html"
    } else {
        alert(data.message)
    }
}

// ---------------- DASHBOARD ----------------

function checkLogin() {
    const token = localStorage.getItem("token")
    if (!token) {
        window.location.href = "index.html"
    }
}

function loadUsername() {
    const username = localStorage.getItem("username") || "Student"
    document.getElementById("username").textContent = username
}

function logout() {
    localStorage.removeItem("token")
    localStorage.removeItem("username")
    window.location.href = "index.html"
}

// ---------------- ADMIN PANEL ----------------

async function loadUsers() {
    const token = localStorage.getItem("token")
    const res = await fetch("/api/pending-users", {
        headers: { "authorization": token }
    })
    const users = await res.json()

    const container = document.getElementById("users")
    container.innerHTML = ""

    users.forEach(user => {
        container.innerHTML += `
        <div>
            ${user.name} - ${user.email} 
            <button onclick="approveUser('${user._id}')">Approve</button>
            <button onclick="deleteUser('${user._id}')">Delete</button>
        </div>
        `
    })
}

async function approveUser(id) {
    const token = localStorage.getItem("token")
    await fetch("/api/approve/" + id, {
        method: "POST",
        headers: { "authorization": token }
    })
    alert("User approved")
    loadUsers()
}

async function deleteUser(id) {
    const token = localStorage.getItem("token")
    await fetch("/api/delete-user/" + id, {
        method: "DELETE",
        headers: { "authorization": token }
    })
    alert("User deleted")
    loadUsers()
}

// ---------------- CHAT ----------------

// Make sure socket.io script is included in chat.html before this
const socket = io()

// Send message
function sendMessage() {
    const input = document.getElementById("messageInput")
    const message = input.value
    if (message.trim() === "") return

    const username = localStorage.getItem("username") || "Student"
    const data = {
        user: username,
        text: message,
        time: new Date().toLocaleTimeString()
    }

    socket.emit("chat message", data)
    input.value = ""
}

// Send message on Enter key
document.getElementById("messageInput")?.addEventListener("keypress", function(e) {
    if (e.key === "Enter") sendMessage()
})

// Receive old messages
socket.on("old messages", (messages) => {
    const messagesDiv = document.getElementById("messages")
    messagesDiv.innerHTML = ""

    messages.forEach(data => {
        const div = document.createElement("div")
        const currentUser = localStorage.getItem("username")
        if (data.user === currentUser) div.classList.add("myMessage")
        else div.classList.add("otherMessage")

        div.innerHTML = `
            <strong>${data.user}</strong><br>
            ${data.text}<br>
            <span class="time">${data.time}</span>
        `
        messagesDiv.appendChild(div)
    })
    messagesDiv.scrollTop = messagesDiv.scrollHeight
})

// Receive new messages
socket.on("chat message", (data) => {
    const messagesDiv = document.getElementById("messages")
    const div = document.createElement("div")
    const currentUser = localStorage.getItem("username")
    if (data.user === currentUser) div.classList.add("myMessage")
    else div.classList.add("otherMessage")

    div.innerHTML = `
        <strong>${data.user}</strong><br>
        ${data.text}<br>
        <span class="time">${data.time}</span>
    `
    messagesDiv.appendChild(div)
    messagesDiv.scrollTop = messagesDiv.scrollHeight
})