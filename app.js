const Express = require("express")
const app = Express()
const Mongoose = require("mongoose")
const Bodyparser = require("body-parser")
const CORS = require("cors")
const Bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const cookieParser = require("cookie-parser")
const port = process.env.PORT || 7070;
app.use(Express.urlencoded({extended: true}))
app.use(CORS({
//   origin: "http://localhost:3000", 
    
  origin: ["http://localhost:3000", "https://capstone-frontend-5gqe.onrender.com"],
  credentials: true            
}))
app.use(Bodyparser.json())
app.set("view engine", "ejs")
app.use(Express.static("public"))
app.use(cookieParser())

require("dotenv").config()

// Mongoose.connect("mongodb://localhost:27017/Ecommerce_database")
// // Mongoose.connect(process.env.MONGO_URI)
// //   .then(() => console.log("Connected to MongoDB Atlas successfully"))
// //   .catch(err => console.error("Connection error:", err));

// Mongoose.connect("mongodb://localhost:27017/Ecommerce_database")
Mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB Atlas successfully"))
  .catch(err => console.error("Connection error:", err));


function verifyToken(req, res, next) {
    const token = req.cookies.jwt;
    console.log(token,"token")
    if (!token) {
        return res.status(403).send("Access denied. No token provided.");
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).send("Invalid token.");
    }
}

const ecommerceSchema = new Mongoose.Schema({
    bookNo:Number,
    title: String,
    author: String,
    category:String,
    price: Number,
    image: String,
    description: String
})

const ecommerceModel = Mongoose.model("bookdata", ecommerceSchema)

const registerSchema = new Mongoose.Schema({
    userName:String,
    email: String,
    password: String,
    address: String,
    pincode: Number,
    phoneNo: Number,
    country: String,
    state: String
})

const registerModel = Mongoose.model("registerData", registerSchema)

const customerSchema = ({
    name: String,
    city: String,
    country:String,
    pincode:Number,
    total:Number
})

const customerModel = Mongoose.model("customerData", customerSchema)

app.post("/signup", async function(req,res)
{
   console.log(req.body)
    const userName = req.body.user
    const myEmail = req.body.email
    const myPassword = req.body.password
    const confirmPassword = req.body.confirmpassword
    const address = req.body.address
    const pincode = req.body.pincode
    const phoneNo = req.body.phoneNo
    const country = req.body.country
    const state = req.body.state

    
    const readUser = await registerModel.findOne({userName:userName})
    // console.log(await registerModel.findOne({userName:userName}),"UserName")
    const readEmail = await registerModel.findOne({email:myEmail})
    if(readUser)
    {
    return res.send("Username already Present")
    }
    if(readEmail)
    {
      return res.send("Email already present")
     
    }
    else
    {
            if(myPassword == confirmPassword)
    {
        const bcryptPassword = await Bcrypt.hash(myPassword, 15)
    console.log(bcryptPassword)

        const registerData = new registerModel({
        userName: userName,
        email: myEmail,
        password: bcryptPassword,
        address:address,
        pincode:pincode,
        phoneNo:phoneNo,
        country:country,
        state:state
    })
   await registerData.save()
    console.log(process.env.JWT_SECRET)
   const token = jwt.sign({email: req.body.email}, process.env.JWT_SECRET)
   res.cookie("jwt", token,{
    httpOnly: true,
    secure: true,        
  sameSite: "None",    
  maxAge: 360000
   })
   console.log(token)


    res.json({ message: "Signup successful" });
    }
    }  
})

app.post("/login", async function(req,res)
{
    console.log(req.body)
    const myEmail = req.body.email
    const myPassword = req.body.password

   const readData =  await registerModel.findOne({email: myEmail})
   
   if(readData)
   {
    const result = await Bcrypt.compare(myPassword,readData.password)
   console.log(result,"Resulted")
    if(result == true)
    {
         console.log(result)
         const token = jwt.sign({email: myEmail}, process.env.JWT_SECRET)
        res.cookie("jwt", token, {
             httpOnly: true,
            secure: true,       
            sameSite: "None", 
            maxAge: 360000
        })
                res.json({message: "Login Successful", user: readData.userName})

    }
    else
    {
        res.json({message: "Incorrect Password"})
    }
    
   }

   else
   {
    res.json({message: "Email not present in database"})
   } 
})

app.get("/display/books", async function(req,res)
{
    const readData = await ecommerceModel.find()
    res.json(readData)   
})

app.get("/display/books/:id", async function(req,res)
{
    const Id = req.params.id
    const readData = await ecommerceModel.findOne({bookNo: Id})
   res.json(readData)
})

app.get("/edit/books/:id", async function(req,res)
{
   const Id =parseInt(req.params.id)
   console.log(Id)
     const readData = await ecommerceModel.findOne({bookNo: Id})
     if(readData)
     {
        res.json({message: "Book Number present in database", readData: readData})
     }
     else
     {
        res.json({message: "No book found"})
     }
    
})
app.post("/edit/books/:id", async function(req,res)
{
    console.log(req.body)
    const bookNo = parseInt(req.params.id) 
    console.log("book No is", bookNo)
    const updateData = {

 title : req.body.title,
 author : req.body.author,
 category : req.body.category,
 price : req.body.price,
 image : req.body.image,
 description : req.body.description
    }


    await ecommerceModel.updateOne({bookNo: bookNo}, {$set: updateData})
    .then(()=>{
res.json({message: "Book details saved Successfully💐🌹"})
    })
    .catch((error)=>
    {
        console.log(error)
    })
})

app.post("/save/customer", function(req,res)
{
    const customerName = req.body.name
    const customerCity = req.body.city
    const customerCountry = req.body.country
    const customerPin = Number(req.body.pincode) 
    const total = Number(req.body.total)

    console.log(req.body)
    const data = new customerModel({
        name:customerName,
        city:customerCity,
        country: customerCountry,
        pin:customerPin,
        total: total
    })

    data.save()
})

app.delete("/book/:id", async function(req,res)
{
   console.log(req.params.id)
    const Id = req.params.id

  const readData = await  ecommerceModel.deleteOne({bookNo:Id})
    res.json({message: `Book No ${Id} was deleted successfully✅`})
})
app.post("/add/products", function(req,res)
{
    console.log(req.body)
    const data = new ecommerceModel({
          title: req.body.bname,
        author: req.body.bAuthor,
        category: req.body.category,
        price: req.body.bprice,
        image: req.body.bimage,
        bookNo: req.body.bNo,
        description: req.body.bdescription,
        originalPrice: req.body.original
    })

    data.save()
    res.json({message: "Book added Successfully!📖"})
})



app.get("/profile/:id", async function(req,res)
{
    const user = req.params.id
    const readUser = await registerModel.findOne({userName: user})
    res.json({message: "User Data found", readData:readUser})
})

app.get("/logout", function(req,res)
{
    res.clearCookie("jwt")
    res.json({message: "Logout successfully!"})
})

app.listen(7070)

