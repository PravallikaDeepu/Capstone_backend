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
  origin: "http://localhost:3000", 
  credentials: true            
}))
app.use(Bodyparser.json())
app.set("view engine", "ejs")
app.use(Express.static("public"))
app.use(cookieParser())

require("dotenv").config()
Mongoose.connect("mongodb://localhost:27017/Ecommerce_database")

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

const ratingSchema = new Mongoose.Schema({
    review: String,
    rating: String
})

const ratingModel = Mongoose.model("ratingdata", ratingSchema)

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

// app.get("/signup", function(req,res)
// {
//     res.render("SignupForm.ejs")
// })

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
    const readEmail = await registerModel.findOne({email:myEmail})
    if(readUser)
    {
res.send("Username already Present")
    }
    if(readEmail)
    {
        res.send("Email already present")
        res.redirect("/signup")
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
    maxAge: 36000
   })
   console.log(token)


    res.json({ message: "Signup successful" });

    //  res.redirect("/login")
    }
    //   else
    // {
    //     res.redirect("/signup")
    // }
    }  
})

app.get("/login", function(req,res)
{
    res.render("LoginPage.ejs")

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
            maxAge: 360000,
            httpOnly: true
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
app.get("/book/form", function(req,res)
{

    res.render("BookForm.ejs")
})

app.post("/book/form", function(req,res)
{
    // console.log(req.body)
    const bookNo = req.body.myNo
    const title = req.body.myTitle
    const author = req.body.myAuthor
    const category = req.body.category
    const price = req.body.myPrice
    const image = req.body.myImage
    const description = req.body.description

    const data = new ecommerceModel({
        title: title,
        author: author,
        category: category,
        price: price,
        image: image,
        bookNo: bookNo,
        description: description
    })

    data.save()
    res.render("SavedBooks.ejs")
})



app.get("/display/books", async function(req,res)
{
    const readData = await ecommerceModel.find()
    
    // console.log(readData)
    // res.render("displayBook.ejs", {info: readData})
    // res.send("Hi everyone")
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
app.get("/logout", function(req,res)
{
    res.clearCookie("jwt")
    res.json({message: "Logout successfully!"})
})

// app.get("/rating", function(req,res)
// {
//    res.render("Rating.ejs")
// })

app.get("/profile/:id", async function(req,res)
{
    const user = req.params.id
    const readUser = await registerModel.findOne({userName: user})
    res.json({message: "User Data found", readData:readUser})
})


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});


