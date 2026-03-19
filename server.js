const express = require("express");

const app = express();

let state = {
signal: "-"
};

async function runAI(){

const API="https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json"

try{

let res = await fetch(API);
let data = await res.json();

let list = data.data.list;

let numbers = list.slice(0,10).map(x=>x.number);

let big = numbers.filter(n=>n>=5).length;
let small = numbers.filter(n=>n<5).length;

let signal = big>small?"SMALL":"BIG";

state.signal = signal;

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
