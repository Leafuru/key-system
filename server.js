const express = require("express");
const https = require("https");
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---- SCRIPT URL (change this from dashboard) ----
let scriptUrl = "https://pastebin.com/raw/YOURPASTEBINID";

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

// ---- SCRIPT (fetches from your stored URL) ----
app.get("/script", (req, res) => {
    const { key, hwid } = req.query;
    if (!keys[key] || keys[key].hwid !== hwid || keys[key].revoked) return res.send("NO");

    https.get(scriptUrl, (r) => {
        let data = "";
        r.on("data", chunk => data += chunk);
        r.on("end", () => res.send(data));
    }).on("error", () => res.send("-- script load error"));
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
  .section { margin-top:28px; }
  .green { background:#16a34a; }
  .row { display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-top:10px; }
  .row input { width:400px; }
</style>
</head>
<body>
<h1>🔑 Key Dashboard</h1>

<table>
  <tr><th>Key</th><th>Roblox</th><th>HWID</th><th>Expires</th><th>Status</th><th>Actions</th></tr>
  ${rows}
</table>

<div class="section">
  <h2>➕ Add Key</h2>
  <form method="POST" action="/add-key">
    <div class="row">
      <input type="text" name="key" placeholder="Key name e.g. KEY-001" required>
      <select name="days" style="background:#222;color:#eee;border:1px solid #444;padding:6px;border-radius:4px">
        <option value="1">1 Day</option>
        <option value="7">7 Days</option>
        <option value="30">30 Days</option>
        <option value="365">1 Year</option>
      </select>
      <button type="submit" class="green">+ Add Key</button>
    </div>
  </form>
</div>

<div class="section">
  <h2>📦 Script URL</h2>
  <p style="color:#aaa;font-size:13px">This is the raw script URL your loader fetches. Change it here anytime to update what script runs — no need to touch the Lua loader.</p>
  <form method="POST" action="/set-script">
    <div class="row">
      <input type="text" name="url" value="${scriptUrl}" placeholder="https://pastebin.com/raw/...">
      <button type="submit" class="green">Update Script</button>
    </div>
  </form>
  <p style="color:#555;font-size:12px;margin-top:6px">Current: ${scriptUrl}</p>
</div>

</body>
</html>`);
});

// ---- SET SCRIPT URL ----
app.post("/set-script", (req, res) => {
    const { url } = req.body;
    if (url) scriptUrl = url;
    res.redirect("/dashboard");
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
