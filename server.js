require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const xss = require('xss-clean');
const moment = require('moment');

const app = express();
const PORT = process.env.PORT || 3000;

// --- KONFIGURASI KUNCI RAHASIA ---
const JWT_SECRET = process.env.JWT_SECRET || "kunci_rahasia_relative_rp_2026_sangat_aman"; 

// --- SECURITY MIDDLEWARE ---
app.use(helmet()); 
app.use(xss()); 
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '/')));

// Limiter
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 1000, // Diperbesar untuk fitur Chat Polling
    message: 'Terlalu banyak request.'
});
app.use('/api/', limiter);

// --- KONEKSI DATABASE ---
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 's191_relative_samp'
});

db.connect(err => {
    if (err) {
        console.error('❌ DB ERROR:', err.message);
        return;
    }
    console.log('✅ TERHUBUNG: Database Relative RP Siap!');
});

// --- AUTH MIDDLEWARE ---
const verifyToken = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ success: false, message: 'Akses Ditolak' });

    try {
        const verified = jwt.verify(token.replace("Bearer ", ""), JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        res.status(400).json({ success: false, message: 'Sesi Kadaluarsa' });
    }
};

// --- API AUTH & CHARACTERS (SAMA SEPERTI SEBELUMNYA) ---
app.post('/api/register', async (req, res) => {
    const { ucp_name, discordid, email, password } = req.body;
    if (!ucp_name || !password) return res.status(400).json({ success: false, message: 'Data tidak lengkap!' });

    try {
        const hashedPassword = await bcrypt.hash(password, 12);
        const pinCode = Math.floor(10000 + Math.random() * 90000); 
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const regDate = moment().format('YYYY-MM-DD HH:mm:ss');

        const sql = `INSERT INTO ucp (ucp_name, discordid, password, pin_code, ip, reg_date, register) VALUES (?, ?, ?, ?, ?, ?, 1)`;
        db.query(sql, [ucp_name, discordid, hashedPassword, pinCode, ip, regDate], (err, result) => {
            if (err) {
                if(err.code === 'ER_DUP_ENTRY') return res.status(400).json({ success: false, message: 'Nama UCP sudah digunakan!' });
                return res.status(500).json({ success: false, message: 'Database Error' });
            }
            res.json({ success: true, message: "Registrasi Berhasil!" });
        });
    } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
});

app.post('/api/login', (req, res) => {
    const { ucp_name, password } = req.body;
    db.query("SELECT * FROM ucp WHERE ucp_name = ? LIMIT 1", [ucp_name], async (err, results) => {
        if (err || results.length === 0) return res.status(401).json({ success: false, message: 'UCP tidak ditemukan' });
        
        const user = results[0];
        let isMatch = false;
        try { isMatch = await bcrypt.compare(password, user.password); } catch (e) {}
        if (!isMatch && password === user.password) isMatch = true;
        
        if (!isMatch) return res.status(401).json({ success: false, message: 'Password salah!' });

        const token = jwt.sign({ ucp: user.ucp_name, id: user.reg_id }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ success: true, token, user: { ucp: user.ucp_name, discord: user.discordid } });
    });
});

app.get('/api/characters', verifyToken, (req, res) => {
    const sql = "SELECT * FROM players WHERE ucp_name = ?";
    db.query(sql, [req.user.ucp], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: "Gagal ambil data" });
        res.json({ success: true, data: results });
    });
});

// --- FITUR BARU: CHAT SYSTEM ---

// 1. Ambil Pesan Terakhir (Limit 50)
app.get('/api/chat', verifyToken, (req, res) => {
    const sql = "SELECT * FROM (SELECT * FROM ucp_chat ORDER BY id DESC LIMIT 50) sub ORDER BY id ASC";
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ success: false, message: "Chat Error" });
        res.json({ success: true, data: results });
    });
});

// 2. Kirim Pesan
app.post('/api/chat', verifyToken, (req, res) => {
    const { message } = req.body;
    if(!message || message.trim() === "") return res.status(400).json({success: false});

    const sql = "INSERT INTO ucp_chat (ucp_sender, message) VALUES (?, ?)";
    db.query(sql, [req.user.ucp, message], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: "Gagal kirim" });
        res.json({ success: true, message: "Terkirim" });
    });
});

app.listen(PORT, () => {
    console.log(`🛡️  RELATIVE RP UCP BERJALAN DI PORT: ${PORT}`);
});