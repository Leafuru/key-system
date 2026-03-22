const express = require("express");
const app = express();

app.use(express.json());

let keys = {
    "TEST-123": { hwid: null, expires: Date.now() + 1000*60*60*24, roblox: null },
    "VIP-999": { hwid: null, expires: Date.now() + 1000*60*60*24*7, roblox: null }
};

// VERIFY KEY
app.get("/verify", (req, res) => {
    const { key, hwid, username } = req.query;

    if (!keys[key]) return res.send("INVALID");

    const data = keys[key];

    if (Date.now() > data.expires) return res.send("EXPIRED");

    // First time binding
    if (!data.hwid) {
        data.hwid = hwid;
        data.roblox = username || "Unknown";
        console.log(`Key ${key} bound to HWID ${hwid} for user ${data.roblox}`);
        return res.send("BOUND");
    }

    if (data.hwid !== hwid) return res.send("HWID_MISMATCH");

    console.log(`Key ${key} used by ${data.roblox}`);
    return res.send("VALID");
});

// SCRIPT (protected)
app.get("/script", (req, res) => {
    const { key, hwid } = req.query;

    if (!keys[key] || keys[key].hwid !== hwid) return res.send("NO");

    res.send(`
        print("Secure Script Loaded")
    `);
});

// SIMPLE DASHBOARD
app.get("/dashboard", (req, res) => {
    let html = "<h1>Key Dashboard</h1><table border='1'><tr><th>Key</th><th>HWID</th><th>Roblox</th><th>Expires</th></tr>";
    for (let k in keys) {
        html += `<tr><td>${k}</td><td>${keys[k].hwid || "-"}</td><td>${keys[k].roblox || "-"}</td><td>${new Date(keys[k].expires)}</td></tr>`;
    }
    html += "</table>";
    res.send(html);
});

app.listen(3000, () => console.log("Server running"));
