const User = require("../models/User");
const bcrypt = require("bcryptjs"); // Secure password hashing
const jwt = require("jsonwebtoken"); // JWT for authentication

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret"; // Replace with your actual secret

// 🟢 User Registration (Signup)
const registerUser = async (req, res) => {
    const { name, email, password } = req.body;

    try {
        // ✅ Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        // ✅ Hash password before storing it
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // ✅ Create a new user
        const newUser = new User({ name, email, password: hashedPassword });
        await newUser.save();

        res.json({ message: "✅ User registered successfully!" });

    } catch (error) {
        console.error("❌ Error registering user:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// 🟢 User Login (Signin)
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        // ✅ Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // ✅ Compare passwords
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // ✅ Generate JWT Token
        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "1h" });

        res.json({ message: "✅ Login successful!", token, user });

    } catch (error) {
        console.error("❌ Error logging in:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// 🟢 Get Logged-in User Data
const getUser = async (req, res) => {
    try {
        // ✅ Get token from header
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({ error: "Unauthorized: No token provided" });
        }

        // ✅ Verify token
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id).select("-password"); // Exclude password from response

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({ user });
    } catch (error) {
        console.error("Error fetching user:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};


module.exports = { registerUser, loginUser, getUser };
