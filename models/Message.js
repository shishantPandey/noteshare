const mongoose = require("mongoose")

const MessageSchema = new mongoose.Schema({

user:String,
text:String,
time:String

})

module.exports = mongoose.model("Message",MessageSchema)