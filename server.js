const express = require("express");
const axios = require("axios");
const mongoose = require("mongoose");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

/* ================= DATABASE ================= */

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.log("❌ MongoDB Error:", err));

/* ================= MODEL ================= */

const SignalSchema = new mongoose.Schema({
  period: String,
  result: String,
  actual: String,
  time: { type: Date, default: Date.now }
});

const Signal = mongoose.model("Signal", SignalSchema);

/* ================= STATIC FILE ================= */

app.use(express.static(path.join(__dirname, "public")));

/* ================= API FETCH SAFE ================= */

const API_URL = "https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json";

async function getData() {
  try {
    const res = await axios.get(API_URL, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 10000
    });

    if (!res.data || !res.data.data || !res.data.data.list) {
      console.log("❌ API BLOCKED");
      return [];
    }

    return res.data.data.list;

  } catch (err) {
    console.log("❌ API ERROR:", err.message);
    return [];
  }
}

/* ================= LOGIC ================= */

let lastPeriod = null;

async function processSignal() {
  try {
    const list = await getData();

    if (!list.length) return;

    const current = list[0];
    const period = current.issueNumber;
    const number = current.number;

    const actual = number >= 5 ? "BIG" : "SMALL";

    const numbers = list.slice(0, 10).map(x => x.number);
    const big = numbers.filter(n => n >= 5).length;
    const small = numbers.filter(n => n < 5).length;

    const signal = big > small ? "SMALL" : "BIG";

    if (lastPeriod !== period) {
      lastPeriod = period;

      await Signal.create({
        period,
        result: signal,
        actual
      });

      console.log("✅ Saved:", period);
    }

  } catch (e) {
    console.log("❌ PROCESS ERROR");
  }
}

/* ================= ROUTES ================= */

app.get("/api/stats", async (req, res) => {
  const data = await Signal.find().sort({ time: -1 }).limit(50);

  let total = data.length;
  let win = 0;
  let loss = 0;

  let winStreak = 0;
  let lossStreak = 0;
  let maxWinStreak = 0;
  let maxLossStreak = 0;

  data.forEach(d => {
    if (d.result === d.actual) {
      win++;
      winStreak++;
      lossStreak = 0;
    } else {
      loss++;
      lossStreak++;
      winStreak = 0;
    }

    if (winStreak > maxWinStreak) maxWinStreak = winStreak;
    if (lossStreak > maxLossStreak) maxLossStreak = lossStreak;
  });

  const accuracy = total ? ((win / total) * 100).toFixed(1) : 0;

  res.json({
    total,
    win,
    loss,
    winStreak,
    lossStreak,
    maxWinStreak,
    maxLossStreak,
    accuracy,
    history: data
  });
});

/* ================= ROOT FIX ================= */

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* ================= LOOP ================= */

setInterval(processSignal, 7000);

/* ================= START ================= */

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
