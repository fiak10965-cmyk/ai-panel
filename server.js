const express = require("express");
const fetch = require("node-fetch");

const app = express();

let state = {
period: "-",
signal: "-",
result: "-",
number: "-",
color: "-",

totalSignal: 0,
win: 0,
loss: 0,
winStreak: 0,
lossStreak: 0,
maxWinStreak: 0,
maxLossStreak: 0,
accuracy: "0%",

history: []
};

let lastPeriod = null;
let currentSignal = null;

async function runAI(){

const API="https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json"

try{

let res = await fetch(API);
let data = await res.json();
let list = data.data.list;

/* NEXT PERIOD */
let next = parseInt(list[0].issueNumber) + 1;
state.period = next;

/* HISTORY */
state.history = list.slice(0,10).map(r=>{
let number = r.number;
return {
period: r.issueNumber,
number: number,
size: number>=5?"BIG":"SMALL",
color: number%2==0?"RED":"GREEN"
}
});

/* RESULT */
let resultNumber = list[0].number;
let resultSize = resultNumber>=5?"BIG":"SMALL";
let resultColor = resultNumber%2==0?"RED":"GREEN";

state.number = resultNumber;
state.color = resultColor;

/* AI SIGNAL */
let numbers = list.slice(0,10).map(x=>x.number);

let big = numbers.filter(n=>n>=5).length;
let small = numbers.filter(n=>n<5).length;

let signal = big>small?"SMALL":"BIG";
state.signal = signal;

/* RESULT CHECK */
if(lastPeriod !== list[0].issueNumber){

state.totalSignal++;

if(currentSignal === resultSize){

state.win++;
state.winStreak++;
state.lossStreak = 0;
state.result = "WIN";

if(state.winStreak > state.maxWinStreak){
state.maxWinStreak = state.winStreak;
}

}else{

state.loss++;
state.lossStreak++;
state.winStreak = 0;
state.result = "LOSS";

if(state.lossStreak > state.maxLossStreak){
state.maxLossStreak = state.lossStreak;
}

}

lastPeriod = list[0].issueNumber;
}

/* SAVE SIGNAL */
currentSignal = signal;

/* ACCURACY */
let total = state.win + state.loss;
let acc = total>0 ? ((state.win/total)*100).toFixed(1) : 0;
state.accuracy = acc+"%";

}catch(e){
console.log(e);
}

}

setInterval(runAI,5000);

app.get("/", (req,res)=>{
res.json(state);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log("Server running"));
