const express = require("express")
const router = express.Router()
const User = require("../models/User")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")


// REGISTER
router.post("/register", async(req,res)=>{

const {name,email,password} = req.body

const existingUser = await User.findOne({email})

if(existingUser){
return res.json({message:"User already exists"})
}

const hashedPassword = await bcrypt.hash(password,10)

const user = new User({
name,
email,
password:hashedPassword
})

await user.save()

res.json({message:"Registration successful. Wait for admin approval."})

})


// LOGIN
router.post("/login", async(req,res)=>{

const {email,password} = req.body

const user = await User.findOne({email})

if(!user){
return res.json({message:"User not found"})
}

const validPassword = await bcrypt.compare(password,user.password)

if(!validPassword){
return res.json({message:"Wrong password"})
}

if(!user.approved){
return res.json({message:"Admin approval required"})
}

const token = jwt.sign(
{
id:user._id,
role:user.role,
name:user.name
},
"secretkey"
)
console.log(user.name)
res.json({
token:token,
name:user.name
})
})

// GET PENDING USERS
router.get("/pending-users", verifyAdmin, async(req,res)=>{

const users = await User.find({approved:false})

res.json(users)

})


// APPROVE USER
router.post("/approve/:id", async(req,res)=>{

await User.findByIdAndUpdate(req.params.id,{approved:true})

res.json({message:"User approved"})

})



function verifyAdmin(req,res,next){

const token = req.headers.authorization

if(!token){
return res.status(403).json({message:"No token"})
}

const decoded = jwt.verify(token,"secretkey")

if(decoded.role !== "admin"){
return res.status(403).json({message:"Admin only"})
}

next()

}
module.exports = router