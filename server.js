const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 3000;
const MONGO_URI = "mongodb+srv://aipanel:<db_password>@cluster0.xesi9zv.mongodb.net/?appName=Cluster0"; // Railway Environment Variable এ রাখলে ভালো

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
mongoose.connect(MONGO_URI).then(() => console.log("MongoDB Connected"));

const API = "https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json";

// ব্যাকগ্রাউন্ড লজিক (২৪/৭ চলবে)
setInterval(async () => {
    try {
        const res = await axios.get(API);
        const list = res.data.data.list;
        const lastRes = list[0];
        const currentFinishPeriod = lastRes.issueNumber;

        let db = await Stats.findOne();
        if (!db) db = await Stats.create({});

        if (db.lastPeriod !== currentFinishPeriod) {
            // রেজাল্ট ক্যালকুলেশন
            if (db.prediction) {
                const actualSize = lastRes.number >= 5 ? "BIG" : "SMALL";
                db.total++;
                if (db.prediction === actualSize) {
                    db.win++; db.streak++; db.lStreak = 0;
                    if (db.streak > db.maxW) db.maxW = db.streak;
                } else {
                    db.loss++; db.lStreak++; db.streak = 0;
                    if (db.lStreak > db.maxL) db.maxL = db.lStreak;
                }
            }
            
            // নতুন প্রেডিকশন (Trend Analysis)
            let bigCount = list.slice(0, 10).filter(n => n.number >= 5).length;
            db.prediction = bigCount >= 5 ? "SMALL" : "BIG";
            db.lastPeriod = currentFinishPeriod;
            
            await db.save();
            console.log(`Updated Period: ${currentFinishPeriod}`);
        }
    } catch (e) { console.error("Loop Error"); }
}, 5000);

app.get('/api/stats', async (req, res) => {
    const db = await Stats.findOne();
    res.json(db || {});
});

app.use(express.static('public'));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
