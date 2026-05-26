const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
    origin: '*'
})); // Allows your frontend to communicate with this API

// 1. Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/managruha')
    .then(() => console.log('✅ Connected to MongoDB Database'))
    .catch(err => console.error('❌ Database connection error:', err));

// 2. Define the Booking Schema & Model
const BookingSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    message: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Booking = mongoose.model('Booking', BookingSchema);

// 3. Setup Email Transporter (Nodemailer)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // Your business gmail
        pass: process.env.EMAIL_PASS // Your Gmail App Password
    }
});

// 4. API Endpoints
// POST: Submit a new inquiry
app.post('/api/bookings', async (req, res) => {
    try {
        const {
            name,
            phone,
            email,
            address,
            message
        } = req.body;

        // Basic server-side validation
        if (!name || !phone || !email || !address) {
            return res.status(400).json({
                success: false,
                message: 'Please fill all required fields.'
            });
        }

        // Save entry to MongoDB
        const newBooking = new Booking({
            name,
            phone,
            email,
            address,
            message
        });
        await newBooking.save();

        // Send Email Notification to MANA GRUHA team
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: 'support.managruha@gmail.com', // Where you want to receive notifications
            subject: `🚨 New Inspection Inquiry from ${name}`,
            html: `
                <h3>New Inspection Booking Details</h3>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Phone:</strong> ${phone}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Address:</strong> ${address}</p>
                <p><strong>Message:</strong> ${message || 'N/A'}</p>
                <br>
                <p><em>This inquiry has been logged in your database.</em></p>
            `
        };

        // Fire email asynchronously so user doesn't wait on slow SMTP servers
        transporter.sendMail(mailOptions, (err, info) => {
            if (err) console.error('📬 Email failed to send:', err);
            else console.log('📬 Notification email sent:', info.response);
        });

        // Respond with success
        res.status(201).json({
            success: true,
            message: 'Inquiry submitted successfully!'
        });

    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        });
    }
});

// GET: Fetch all bookings (Optional, for an admin portal down the line)
app.get('/api/bookings', async (req, res) => {
    try {
        const bookings = await Booking.find().sort({
            createdAt: -1
        });
        res.json(bookings);
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running smoothly on port ${PORT}`);
});