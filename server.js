const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

let stats = { total: 0, win: 0, loss: 0, streak: 0, maxW: 0, maxL: 0 };
let lastProcessedPeriod = null;
let currentPrediction = null;

const API = "https://draw.ar-lottery01.com";

// ব্যাকগ্রাউন্ড লজিক যা ২৪/৭ চলবে
setInterval(async () => {
    try {
        const res = await axios.get(API);
        const list = res.data.data.list;
        const lastResult = list[0];
        const currentFinishPeriod = lastResult.issueNumber;

        if (lastProcessedPeriod !== currentFinishPeriod) {
            if (currentPrediction !== null) {
                const actualSize = lastResult.number >= 5 ? "BIG" : "SMALL";
                stats.total++;
                if (currentPrediction === actualSize) {
                    stats.win++; stats.streak++;
                    if (stats.streak > stats.maxW) stats.maxW = stats.streak;
                } else {
                    stats.loss++; stats.streak = 0;
                }
            }
            // নতুন প্রেডিকশন
            let bigCount = list.slice(0, 10).filter(n => n.number >= 5).length;
            currentPrediction = bigCount >= 5 ? "SMALL" : "BIG";
            lastProcessedPeriod = currentFinishPeriod;
            console.log(`New Period: ${currentFinishPeriod}, Prediction: ${currentPrediction}`);
        }
    } catch (e) { console.error("API Error"); }
}, 2000);

app.get('/api/data', (req, res) => {
    res.json({ stats, currentPrediction, lastProcessedPeriod });
});

app.use(express.static('public'));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
