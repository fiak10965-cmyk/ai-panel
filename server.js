const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;

// 🔥 Mongo Connect
mongoose.connect(process.env.MONGO_URI)
.then(()=> console.log("✅ MongoDB Connected"))
.catch(err=> console.log("❌ Mongo Error:", err));

// 🔥 Schema
const StatsSchema = new mongoose.Schema({
  total: { type: Number, default: 0 },
  win: { type: Number, default: 0 },
  loss: { type: Number, default: 0 },
  winstreak: { type: Number, default: 0 },
  lossstreak: { type: Number, default: 0 },
  maxwin: { type: Number, default: 0 },
  maxloss: { type: Number, default: 0 }
});

const Stats = mongoose.model("Stats", StatsSchema);

let currentSignal = null;
let lastPeriod = null;

// 🔥 INIT DB
async function initDB() {
  let stats = await Stats.findOne();
  if (!stats) {
    await Stats.create({});
    console.log("📊 Initial Stats Created");
  }
}
initDB();

// 🔥 API fetch
async function fetchGame() {
  try {
    const res = await axios.get(
      "https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json",
      {
        timeout: 5000,
        headers: { "User-Agent": "Mozilla/5.0" }
      }
    );

    const list = res.data.data.list;
    const latest = list[0];

    let resultSize = latest.number >= 5 ? "BIG" : "SMALL";
    let period = latest.issueNumber;

    // 🔥 NEW PERIOD DETECT
    if (lastPeriod !== period) {
      let stats = await Stats.findOne();

      if (currentSignal) {
        stats.total++;

        if (currentSignal === resultSize) {
          stats.win++;
          stats.winstreak++;
          stats.lossstreak = 0;

          if (stats.winstreak > stats.maxwin)
            stats.maxwin = stats.winstreak;

          console.log("✅ WIN");
        } else {
          stats.loss++;
          stats.lossstreak++;
          stats.winstreak = 0;

          if (stats.lossstreak > stats.maxloss)
            stats.maxloss = stats.lossstreak;

          console.log("❌ LOSS");
        }

        await stats.save(); // 🔥 SAVE DB
      }

      // 🔥 AI SIGNAL (reverse trend)
      let last10 = list.slice(0, 10).map(x => x.number);
      let bigCount = last10.filter(n => n >= 5).length;

      currentSignal = bigCount >= 5 ? "SMALL" : "BIG";

      console.log("🎯 New Signal:", currentSignal);

      lastPeriod = period;
    }

  } catch (err) {
    console.log("❌ API ERROR:", err.message);
  }
}

// 🔥 LOOP (5 sec)
setInterval(fetchGame, 5000);

// 🔥 API: Stats
app.get("/api/stats", async (req, res) => {
  const stats = await Stats.findOne();
  res.json(stats);
});

// 🔥 ROOT
app.get("/", (req, res) => {
  res.send("🔥 AI PANEL RUNNING");
});

app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});
