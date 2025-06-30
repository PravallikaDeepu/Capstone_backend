const Express = require("express");
const app = Express();
const Mongoose = require("mongoose");
const Bodyparser = require("body-parser");
const CORS = require("cors");
const Bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

// Load environment variables from .env file in local development
// This line should be at the very top, even before other const declarations if you rely on them immediately
require("dotenv").config();

// --- CRITICAL CHANGES FOR DEPLOYMENT ---

// 1. MongoDB Connection String from Environment Variable
// Use process.env.MONGO_URI for deployment, fallback to local for development
const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/Ecommerce_database";

Mongoose.connect(mongoUri)
  .then(() => console.log("MongoDB Connected Successfully!"))
  .catch(err => console.error("MongoDB connection error:", err));

// 2. CORS Origin from Environment Variable
// Use process.env.CORS_ORIGIN for deployment, fallback to local for development
// This allows you to specify your deployed frontend URL on Render.
// It also handles multiple origins if provided as a comma-separated string.
const allowedOrigins = process.env.CORS_ORIGIN ?
  process.env.CORS_ORIGIN.split(',').map(s => s.trim()) :
  ["http://localhost:3000", "http://localhost:8070"]; // Add your frontend's local dev URL and backend's local port

app.use(CORS({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

// 3. Port from Environment Variable (already good, just confirming)
// Render provides a 'PORT' environment variable for web services.
const port = process.env.PORT || 8070; // Use Render's PORT, fallback to 8070 locally

// --- END CRITICAL CHANGES ---


app.use(Express.urlencoded({ extended: true }));
app.use(Bodyparser.json());
app.set("view engine", "ejs"); // If you're not serving EJS views, you can remove this.
app.use(Express.static("public")); // If you're not serving static files from 'public', you can remove this.
app.use(cookieParser());

// JWT Secret is correctly using process.env.JWT_SECRET, ensure it's set on Render

function verifyToken(req, res, next) {
  const token = req.cookies.jwt;
  console.log(token, "token");
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
  bookNo: Number,
  title: String,
  author: String,
  category: String,
  price: Number,
  image: String,
  description: String,
  originalPrice: Number // Added this field based on your /add/products route
});

const ecommerceModel = Mongoose.model("bookdata", ecommerceSchema);

const registerSchema = new Mongoose.Schema({
  userName: String,
  email: String,
  password: String,
  address: String,
  pincode: Number,
  phoneNo: Number,
  country: String,
  state: String
});

const registerModel = Mongoose.model("registerData", registerSchema);

// Corrected schema definition for customerModel - it needs to be a Mongoose.Schema
const customerSchema = new Mongoose.Schema({
  name: String,
  city: String,
  country: String,
  pincode: Number, // Changed from 'pin' to 'pincode' for consistency with input
  total: Number
});

const customerModel = Mongoose.model("customerData", customerSchema);

app.post("/signup", async function(req, res) {
  console.log(req.body);

  const { user, email, password, confirmpassword, address, pincode, phoneNo, country, state } = req.body;

  try {
    const readUser = await registerModel.findOne({ userName: user });
    if (readUser) {
      return res.status(409).json({ message: "Username already Present" }); // 409 Conflict
    }

    const readEmail = await registerModel.findOne({ email: email });
    if (readEmail) {
      return res.status(409).json({ message: "Email already present" }); // 409 Conflict
    }

    if (password !== confirmpassword) { // Use strict inequality
      return res.status(400).json({ message: "Passwords do not match" }); // 400 Bad Request
    }

    const bcryptPassword = await Bcrypt.hash(password, 15);
    console.log(bcryptPassword);

    const registerData = new registerModel({
      userName: user,
      email: email,
      password: bcryptPassword,
      address: address,
      pincode: pincode,
      phoneNo: phoneNo,
      country: country,
      state: state
    });
    await registerData.save();

    const token = jwt.sign({ email: email }, process.env.JWT_SECRET, { expiresIn: '1h' }); // Add expiresIn
    res.cookie("jwt", token, {
      httpOnly: true,
      maxAge: 3600000, // maxAge is in milliseconds (1 hour = 3600000 ms)
      secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
      sameSite: 'Lax' // Or 'None' if cross-site, but requires secure:true
    });
    console.log("Generated Token:", token);

    res.status(201).json({ message: "Signup successful" }); // 201 Created
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Server error during signup", error: error.message });
  }
});

app.post("/login", async function(req, res) {
  console.log(req.body);
  const { email, password } = req.body;

  try {
    const readData = await registerModel.findOne({ email: email });

    if (!readData) {
      return res.status(404).json({ message: "Email not present in database" }); // 404 Not Found
    }

    const result = await Bcrypt.compare(password, readData.password);
    console.log(result, "Password Comparison Result");

    if (result === true) {
      const token = jwt.sign({ email: email }, process.env.JWT_SECRET, { expiresIn: '1h' }); // Add expiresIn
      res.cookie("jwt", token, {
        maxAge: 3600000, // maxAge in milliseconds
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        sameSite: 'Lax' // Or 'None' if cross-site, but requires secure:true
      });
      res.json({ message: "Login Successful", user: readData.userName });
    } else {
      res.status(401).json({ message: "Incorrect Password" }); // 401 Unauthorized
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login", error: error.message });
  }
});

app.get("/display/books", async function(req, res) {
  try {
    const readData = await ecommerceModel.find();
    res.json(readData);
  } catch (error) {
    console.error("Error fetching books:", error);
    res.status(500).json({ message: "Error fetching books", error: error.message });
  }
});
app.get("/", (req, res) => {
  res.send("Backend is running! 🚀");
});

app.get("/display/books/:id", async function(req, res) {
  const Id = req.params.id;
  try {
    const readData = await ecommerceModel.findOne({ bookNo: Id });
    if (readData) {
      res.json(readData);
    } else {
      res.status(404).json({ message: "Book not found" }); // 404 Not Found
    }
  } catch (error) {
    console.error("Error fetching single book:", error);
    res.status(500).json({ message: "Error fetching book details", error: error.message });
  }
});

app.get("/edit/books/:id", async function(req, res) {
  const Id = parseInt(req.params.id);
  console.log(Id);
  try {
    const readData = await ecommerceModel.findOne({ bookNo: Id });
    if (readData) {
      res.json({ message: "Book Number present in database", readData: readData });
    } else {
      res.status(404).json({ message: "No book found" }); // 404 Not Found
    }
  } catch (error) {
    console.error("Error fetching book for edit:", error);
    res.status(500).json({ message: "Error fetching book for edit", error: error.message });
  }
});

app.post("/edit/books/:id", async function(req, res) {
  console.log(req.body);
  const bookNo = parseInt(req.params.id);
  console.log("book No is", bookNo);
  const updateData = {
    title: req.body.title,
    author: req.body.author,
    category: req.body.category,
    price: req.body.price,
    image: req.body.image,
    description: req.body.description
  };

  try {
    const result = await ecommerceModel.updateOne({ bookNo: bookNo }, { $set: updateData });
    if (result.matchedCount === 0) {
      return res.status(404).json({ message: `Book No ${bookNo} not found for update.` });
    }
    res.json({ message: "Book details saved Successfully💐🌹" });
  } catch (error) {
    console.error("Error saving book details:", error);
    res.status(500).json({ message: "Error saving book details", error: error.message });
  }
});

app.post("/save/customer", async function(req, res) { // Added async
  const { name, city, country, pincode, total } = req.body; // Destructure for cleaner code

  console.log(req.body);
  const data = new customerModel({
    name: name,
    city: city,
    country: country,
    pincode: Number(pincode), // Ensure it's a number
    total: Number(total) // Ensure it's a number
  });

  try {
    await data.save();
    res.status(201).json({ message: "Customer data saved successfully!" }); // 201 Created
  } catch (err) {
    console.error("Error saving customer data:", err);
    res.status(500).json({ message: "Error saving customer data", error: err.message });
  }
});

app.delete("/book/:id", async function(req, res) {
  console.log(req.params.id);
  const Id = req.params.id;

  try {
    const readData = await ecommerceModel.deleteOne({ bookNo: Id });
    if (readData.deletedCount === 0) {
      return res.status(404).json({ message: `Book No ${Id} not found.` });
    }
    res.json({ message: `Book No ${Id} was deleted successfully✅` });
  } catch (error) {
    console.error("Error deleting book:", error);
    res.status(500).json({ message: "Error deleting book", error: error.message });
  }
});

app.post("/add/products", async function(req, res) { // Added async
  console.log(req.body);
  const data = new ecommerceModel({
    title: req.body.bname,
    author: req.body.bAuthor,
    category: req.body.category,
    price: Number(req.body.bprice), // Ensure price is number
    image: req.body.bimage,
    bookNo: Number(req.body.bNo), // Ensure bookNo is number
    description: req.body.bdescription,
    originalPrice: Number(req.body.original) // Ensure originalPrice is number
  });

  try {
    await data.save();
    res.status(201).json({ message: "Book added Successfully!📖" }); // 201 Created
  } catch (err) {
    console.error("Error adding book:", err);
    res.status(500).json({ message: "Error adding book", error: err.message });
  }
});


app.get("/profile/:id", async function(req, res) {
  const user = req.params.id;
  try {
    const readUser = await registerModel.findOne({ userName: user });
    if (readUser) {
      res.json({ message: "User Data found", readData: readUser });
    } else {
      res.status(404).json({ message: "User not found" }); // Added 404 status
    }
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: "Error fetching profile", error: error.message });
  }
});

app.get("/logout", function(req, res) {
  res.clearCookie("jwt", {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax'
  }); // Clear cookie with same options it was set
  res.json({ message: "Logout successfully!" });
});

app.listen(port, '0.0.0.0', () => { // Listen on 0.0.0.0 for Render deployment
  console.log(`Server running on port ${port}`);
});
