const express = require('express');
const router = express.Router();
const { getUser } = require("../controllers/authController");

const { registerUser, loginUser } = require('../controllers/authController');
router.get("/me", getUser);

router.post('/register', registerUser);
router.post('/login', loginUser);

module.exports = router;