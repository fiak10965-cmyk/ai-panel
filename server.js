const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cors = require('cors');
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
    lastPeriod: { type: String, default: "" },
    prediction: { type: String, default: "WAIT" }
});
const Stats = mongoose.model('Stats', StatsSchema);

// MongoDB কানেকশন ও অটো-সেটআপ
mongoose.connect(MONGO_URI).then(async () => {
    console.log("✅ MongoDB Connected");
    let check = await Stats.findOne();
    if (!check) await Stats.create({}); // প্রথমবার ডাটাবেস তৈরি করবে
}).catch(err => console.log("❌ DB Error:", err));

const API_URL = "https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json";

// ২৪/৭ ব্যাকগ্রাউন্ড লুপ
setInterval(async () => {
    try {
        const res = await axios.get(API_URL);
        const list = res.data.data.list;
        const lastGame = list[0];
        const currentPeriod = lastGame.issueNumber;

        let db = await Stats.findOne();
        if (!db) db = await Stats.create({});

        if (db.lastPeriod !== currentPeriod) {
            // উইন/লস চেক
            if (db.prediction && db.prediction !== "WAIT") {
                const actualSize = lastGame.number >= 5 ? "BIG" : "SMALL";
                db.total++;
                if (db.prediction === actualSize) {
                    db.win++; db.streak++; db.lStreak = 0;
                    if (db.streak > db.maxW) db.maxW = db.streak;
                } else {
                    db.loss++; db.lStreak++; db.streak = 0;
                    if (db.lStreak > db.maxL) db.maxL = db.lStreak;
                }
            }
            // নতুন প্রেডিকশন
            let bigs = list.slice(0, 10).filter(n => n.number >= 5).length;
            db.prediction = bigs >= 5 ? "SMALL" : "BIG";
            db.lastPeriod = currentPeriod;
            await db.save();
            console.log(`✅ Period ${currentPeriod} Updated!`);
        }
    } catch (e) { console.log("Loop Error"); }
}, 5000);

app.get('/api/stats', async (req, res) => {
    const data = await Stats.findOne();
    res.json(data || {});
});

app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
