const express = require("express");
const axios = require("axios");
const mongoose = require("mongoose");

const app = express();
app.use(express.static("public"));

/* MongoDB Connect */

mongoose.connect(process.env.MONGO_URL)
.then(()=>console.log("MongoDB Connected"))
.catch(err=>console.log("Mongo Error:",err));

/* Database Schema */

const History = mongoose.model("History",{
period:String,
number:Number,
size:String,
color:String
});

/* WinGo API */

const API="https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json";

/* Collect Game History */

async function collect(){

try{

const res = await axios.get(API);

const list = res.data.data.list;

for(let r of list){

let number=r.number;

let size=number>=5?"BIG":"SMALL";

let color=number%2==0?"RED":"GREEN";

await History.updateOne(
{period:r.issueNumber},
{period:r.issueNumber,number,size,color},
{upsert:true}
);

}

console.log("History Updated");

}catch(err){

console.log("API ERROR",err.message);

}

}

/* Run every 5 seconds */

setInterval(collect,5000);

/* API: Game History */

app.get("/history",async(req,res)=>{

let data=await History.find().sort({period:-1}).limit(50);

res.json(data);

});

/* API: Download CSV */

app.get("/download",async(req,res)=>{

let data=await History.find().sort({period:-1});

let csv="Period,Number,BigSmall,Color\n";

data.forEach(r=>{

csv+=`${r.period},${r.number},${r.size},${r.color}\n`;

});

res.setHeader("Content-Type","text/csv");

res.send(csv);

});

/* Railway Port Fix */

const PORT = process.env.PORT || 3000;

app.listen(PORT,()=>{

console.log("Server Running:",PORT);

});