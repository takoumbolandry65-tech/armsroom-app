const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// CONNECT TO DATABASE
mongoose.connect("mongodb+srv://takoumbolandry65_db_user:1234@cluster0.70cqnhp.mongodb.net/armsroom?retryWrites=true&w=majority")
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));
// CREATE MODEL
const Transaction = mongoose.model("Transaction", {
    name: String,
    rank: String,
    weapon: String,
    action: String,
    timestamp: String,
    signature: String,
    status: { type: String, default: "PENDING" }
});

// ROUTES

// SAVE REQUEST
app.post("/api/request", async (req, res) => {
    const { weapon, action } = req.body;

    // FIND LAST TRANSACTION FOR THIS WEAPON
    const lastTransaction = await Transaction.findOne({ weapon }).sort({ _id: -1 });

    //  BLOCK DOUBLE CHECK-OUT
    if (action === "OUT" && lastTransaction && lastTransaction.action === "OUT" && lastTransaction.status === "APPROVED") {
        return res.json({ error: "Weapon already checked out!" });
    }

    //  BLOCK RETURN IF NOT CHECKED OUT
    if (action === "IN" && (!lastTransaction || lastTransaction.action === "IN")) {
        return res.json({ error: "Weapon is already IN!" });
    }

    // SAVE REQUEST
    const newRequest = new Transaction(req.body);
    await newRequest.save();

    res.json({ message: "Saved" });
});

// GET ALL REQUESTS
app.get("/api/requests", async (req, res) => {
    const data = await Transaction.find().sort({ _id: -1 });
    res.json(data);
});

// APPROVE REQUEST
app.put("/api/approve/:id", async (req, res) => {
    await Transaction.findByIdAndUpdate(req.params.id, {
        status: "APPROVED"
    });
    res.send("Approved");
});

// START SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running"));

// USER MODEL
const User = mongoose.model("User", {
    username: String,
    password: String,
    role: String // soldier or armorer
});
// LOGIN
app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;

    const user = await User.findOne({ username, password });

    if(user){
        res.json({ success: true, role: user.role });
    } else {
        res.json({ success: false });
    }
});

// CREATE DEFAULT USERS (RUN ONCE)
async function createUsers(){
    const existing = await User.find();

    if(existing.length === 0){
        await User.create([
            { username: "soldier1", password: "1234", role: "soldier" },
            { username: "armorer1", password: "1234", role: "armorer" }
        ]);
        console.log("Users created");
    }
}

createUsers();

// GET WEAPON STATUS
app.get("/api/weapons/status", async (req, res) => {
    const transactions = await Transaction.find();

    const weaponStatus = {};

    transactions.forEach(t => {
        // Only consider APPROVED transactions
        if(t.status === "APPROVED"){
            weaponStatus[t.weapon] = t.action;
        }
    });

    res.json(weaponStatus);
});