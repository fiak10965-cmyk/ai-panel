const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

// MongoDB Schema
const StatsSchema = new mongoose.Schema({
    total: { type: Number, default: 0 },
    win: { type: Number, default: 0 },
    loss: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    lStreak: { type: Number, default: 0 },
    maxW: { type: Number, default: 0 },
    maxL: { type: Number, default: 0 },
    lastPeriod: String,
    prediction: String
});
const Stats = mongoose.model('Stats', StatsSchema);

// MongoDB কানেকশন
if (MONGO_URI) {
    mongoose.connect(MONGO_URI).then(() => console.log("✅ MongoDB Connected"));
} else {
    console.error("❌ MONGO_URI is missing in Variables!");
}

const API_URL = "https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json";

// ব্যাকগ্রাউন্ড লজিক
setInterval(async () => {
    try {
        const response = await axios.get(API_URL);
        const list = response.data.data.list;
        const lastResult = list[0];
        const currentFinishPeriod = lastResult.issueNumber;

        let db = await Stats.findOne();
        if (!db) db = await Stats.create({});

        if (db.lastPeriod !== currentFinishPeriod) {
            if (db.prediction) {
                const actualSize = lastResult.number >= 5 ? "BIG" : "SMALL";
                db.total++;
                if (db.prediction === actualSize) {
                    db.win++; db.streak++; db.lStreak = 0;
                    if (db.streak > db.maxW) db.maxW = db.streak;
                } else {
                    db.loss++; db.lStreak++; db.streak = 0;
                    if (db.lStreak > db.maxL) db.maxL = db.lStreak;
                }
            }
            // ট্রেন্ড অনুযায়ী প্রেডিকশন
            let bigCount = list.slice(0, 10).filter(n => n.number >= 5).length;
            db.prediction = bigCount >= 5 ? "SMALL" : "BIG";
            db.lastPeriod = currentFinishPeriod;
            await db.save();
        }
    } catch (e) {
        console.log("Background Task Error:", e.message);
    }
}, 5000);

// API Endpoint
app.get('/api/stats', async (req, res) => {
    try {
        const db = await Stats.findOne();
        res.json(db || {});
    } catch (e) {
        res.status(500).json({ error: "DB Error" });
    }
});

app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
