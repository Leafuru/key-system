const express = require("express");
const app = express();

app.use(express.json());

// 🔑 STORE YOUR KEYS HERE
let keys = {
    "TEST-123": {
        hwid: null,
        expires: Date.now() + 1000 * 60 * 60 * 24 // 1 day
    }
};

// ✅ VERIFY KEY
app.get("/verify", (req, res) => {
    const { key, hwid } = req.query;

    if (!keys[key]) return res.send("INVALID");

    const data = keys[key];

    if (Date.now() > data.expires) {
        return res.send("EXPIRED");
    }

    if (!data.hwid) {
        data.hwid = hwid;
        return res.send("BOUND");
    }

    if (data.hwid !== hwid) {
        return res.send("HWID_MISMATCH");
    }

    return res.send("VALID");
});

// 📦 SCRIPT (LOCKED)
app.get("/script", (req, res) => {
    const { key, hwid } = req.query;

    if (!keys[key]) return res.send("NO");
    if (keys[key].hwid !== hwid) return res.send("NO");

    res.send(`
        print("Secure Script Loaded")
    `);
});

app.listen(3000, () => {
    console.log("Server running");
});
