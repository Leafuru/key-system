const express = require("express");
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---- KEY STORE ----
let keys = {
    "TEST-123": { hwid: null, roblox: null, expires: Date.now() + 1000*60*60*24 },
    "VIP-999":  { hwid: null, roblox: null, expires: Date.now() + 1000*60*60*24*7 }
};

// ---- VERIFY ----
app.get("/verify", (req, res) => {
    const { key, hwid, username } = req.query;
    if (!keys[key]) return res.send("INVALID");
    const d = keys[key];
    if (d.revoked) return res.send("INVALID");
    if (Date.now() > d.expires) return res.send("EXPIRED");
    if (!d.hwid) {
        d.hwid = hwid;
        d.roblox = username || "Unknown";
        return res.send("BOUND");
    }
    if (d.hwid !== hwid) return res.send("HWID_MISMATCH");
    return res.send("VALID");
});

// ---- SCRIPT ----
app.get("/script", (req, res) => {
    const { key, hwid } = req.query;
    if (!keys[key] || keys[key].hwid !== hwid || keys[key].revoked) return res.send("NO");
    res.send(`print("Script loaded for " .. game.Players.LocalPlayer.Name)`);
});

// ---- DASHBOARD ----
app.get("/dashboard", (req, res) => {
    let rows = "";
    for (let k in keys) {
        const d = keys[k];
        const expired = Date.now() > d.expires;
        const status = d.revoked ? "🔴 Revoked" : expired ? "🟡 Expired" : "🟢 Active";
        rows += `<tr>
            <td>${k}</td>
            <td>${d.roblox || "-"}</td>
            <td style="font-size:11px">${d.hwid ? d.hwid.substring(0,20)+"..." : "-"}</td>
            <td>${new Date(d.expires).toLocaleDateString()}</td>
            <td>${status}</td>
            <td>
                <form method="POST" action="/revoke" style="display:inline">
                    <input type="hidden" name="key" value="${k}">
                    <button type="submit">Revoke</button>
                </form>
                <form method="POST" action="/reset-hwid" style="display:inline">
                    <input type="hidden" name="key" value="${k}">
                    <button type="submit">Reset HWID</button>
                </form>
                <form method="POST" action="/delete-key" style="display:inline">
                    <input type="hidden" name="key" value="${k}">
                    <button type="submit" style="color:red">Delete</button>
                </form>
            </td>
        </tr>`;
    }

    res.send(`<!DOCTYPE html>
<html>
<head>
<title>Key Dashboard</title>
<style>
  body { font-family: sans-serif; background:#111; color:#eee; padding:30px; }
  h1 { color:#4ade80; }
  table { border-collapse:collapse; width:100%; }
  th, td { border:1px solid #333; padding:8px 12px; text-align:left; }
  th { background:#222; }
  tr:hover { background:#1a1a1a; }
  button { background:#333; color:#eee; border:none; padding:4px 10px; cursor:pointer; border-radius:4px; }
  button:hover { background:#555; }
  input[type=text] { background:#222; color:#eee; border:1px solid #444; padding:6px; border-radius:4px; }
  .add-form { margin-top:24px; display:flex; gap:10px; align-items:center; }
  .add-form input { width:160px; }
  .green { background:#16a34a; }
</style>
</head>
<body>
<h1>🔑 Key Dashboard</h1>
<table>
  <tr><th>Key</th><th>Roblox</th><th>HWID</th><th>Expires</th><th>Status</th><th>Actions</th></tr>
  ${rows}
</table>

<div class="add-form">
  <form method="POST" action="/add-key" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
    <input type="text" name="key" placeholder="Key name e.g. KEY-001" required>
    <select name="days" style="background:#222;color:#eee;border:1px solid #444;padding:6px;border-radius:4px">
      <option value="1">1 Day</option>
      <option value="7">7 Days</option>
      <option value="30">30 Days</option>
      <option value="365">1 Year</option>
    </select>
    <button type="submit" class="green">+ Add Key</button>
  </form>
</div>
</body>
</html>`);
});

// ---- ADD KEY ----
app.post("/add-key", (req, res) => {
    const { key, days } = req.body;
    if (!key) return res.redirect("/dashboard");
    keys[key] = { hwid: null, roblox: null, expires: Date.now() + 1000*60*60*24 * parseInt(days || 7) };
    res.redirect("/dashboard");
});

// ---- REVOKE ----
app.post("/revoke", (req, res) => {
    const { key } = req.body;
    if (keys[key]) keys[key].revoked = true;
    res.redirect("/dashboard");
});

// ---- RESET HWID ----
app.post("/reset-hwid", (req, res) => {
    const { key } = req.body;
    if (keys[key]) { keys[key].hwid = null; keys[key].roblox = null; }
    res.redirect("/dashboard");
});

// ---- DELETE ----
app.post("/delete-key", (req, res) => {
    const { key } = req.body;
    delete keys[key];
    res.redirect("/dashboard");
});

app.listen(3000, () => console.log("Server running"));
