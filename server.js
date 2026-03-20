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

// MongoDB কানেকশন এবং অটো-ইনিশিয়ালাইজেশন
mongoose.connect(MONGO_URI).then(async () => {
    console.log("✅ MongoDB Connected Successfully");
    let check = await Stats.findOne();
    if (!check) {
        await Stats.create({ total: 0, win: 0, loss: 0, prediction: "BIG" });
        console.log("🆕 Initial Stats Created in DB");
    }
}).catch(err => console.log("❌ DB Error:", err));

const API_URL = "https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json";

// ২৪/৭ ব্যাকগ্রাউন্ড লুপ (প্রতি ৫ সেকেন্ডে চেক করবে)
setInterval(async () => {
    try {
        const res = await axios.get(API_URL);
        if (!res.data || !res.data.data || !res.data.data.list) return;

        const list = res.data.data.list;
        const lastGame = list[0]; // সর্বশেষ রেজাল্ট
        const currentPeriod = lastGame.issueNumber;

        let db = await Stats.findOne();
        if (!db) db = await Stats.create({});

        // যখন পিরিয়ড নাম্বার পরিবর্তন হবে (নতুন রেজাল্ট আসবে)
        if (db.lastPeriod !== currentPeriod) {
            
            // ১. উইন না লস তা চেক করা (আগের প্রেডিকশন অনুযায়ী)
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

            // ২. পরবর্তী পিরিয়ডের জন্য নতুন সিগন্যাল তৈরি (Trend Logic)
            let bigCount = list.slice(0, 10).filter(n => n.number >= 5).length;
            db.prediction = bigCount >= 5 ? "SMALL" : "BIG"; // ট্রেন্ডের বিপরীত সিগন্যাল
            
            db.lastPeriod = currentPeriod;
            await db.save();
            console.log(`🚀 Period ${currentPeriod} Updated in DB!`);
        }
    } catch (e) {
        console.log("❌ Background Loop Error:", e.message);
    }
}, 5000);

// API এন্ডপয়েন্ট ফ্রন্টএন্ডের জন্য
app.get('/api/stats', async (req, res) => {
    try {
        const data = await Stats.findOne();
        res.json(data || {});
    } catch (e) {
        res.status(500).json({ error: "Database reading error" });
    }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
