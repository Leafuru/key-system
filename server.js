const express = require("express");
const https = require("https");
const crypto = require("crypto");
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let scriptUrl = "https://pastebin.com/raw/YOURPASTEBINID";
let keys = {};

function generateKey() {
    const seg = () => crypto.randomBytes(3).toString("hex").toUpperCase();
    return `${seg()}-${seg()}-${seg()}`;
}

// ---- PING (for UptimeRobot) ----
app.get("/", (req, res) => res.send("ok"));

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
            <td style="font-family:monospace">${k}</td>
            <td>${d.roblox || "-"}</td>
            <td style="font-size:11px;font-family:monospace">${d.hwid ? d.hwid.substring(0,24)+"..." : "-"}</td>
            <td>${new Date(d.expires).toLocaleDateString()}</td>
            <td>${status}</td>
            <td style="display:flex;gap:6px;flex-wrap:wrap">
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
                    <button type="submit" style="color:#f87171">Delete</button>
                </form>
            </td>
        </tr>`;
    }

    res.send(`<!DOCTYPE html>
<html>
<head>
<title>Key Dashboard</title>
<style>
  * { box-sizing: border-box; margin:0; padding:0; }
  body { font-family: sans-serif; background:#0a0a0a; color:#eee; padding:32px; }
  h1 { color:#4ade80; font-size:20px; margin-bottom:4px; }
  .sub { color:#444; font-size:12px; margin-bottom:24px; }
  table { border-collapse:collapse; width:100%; margin-bottom:8px; }
  th, td { border:1px solid #1f1f1f; padding:9px 12px; text-align:left; font-size:13px; }
  th { background:#111; color:#888; font-weight:500; }
  tr:hover td { background:#111; }
  button { background:#1f1f1f; color:#ccc; border:none; padding:4px 10px; cursor:pointer; border-radius:4px; font-size:12px; }
  button:hover { background:#2a2a2a; }
  input[type=text] { background:#111; color:#eee; border:1px solid #2a2a2a; padding:7px 10px; border-radius:4px; font-size:13px; }
  select { background:#111; color:#eee; border:1px solid #2a2a2a; padding:7px 10px; border-radius:4px; font-size:13px; }
  .section { margin-top:28px; background:#0f0f0f; border:1px solid #1a1a1a; padding:20px; border-radius:8px; }
  .section h2 { font-size:14px; color:#aaa; margin-bottom:14px; font-weight:500; }
  .green { background:#16a34a !important; color:#fff !important; }
  .green:hover { background:#15803d !important; }
  .blue { background:#1d4ed8 !important; color:#fff !important; }
  .blue:hover { background:#1e40af !important; }
  .row { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
  .hint { color:#333; font-size:11px; margin-top:10px; font-family:monospace; }
  .toolbar { display:flex; gap:8px; margin-bottom:16px; }
</style>
</head>
<body>
<h1>🔑 Key Dashboard</h1>
<p class="sub">Manage your license keys</p>

<div class="toolbar">
  <a href="/export" style="text-decoration:none">
    <button class="blue">⬇ Export Keys</button>
  </a>
  <form method="POST" action="/import" enctype="multipart/form-data" style="display:inline;position:relative">
    <label style="cursor:pointer">
      <button type="button" class="blue" onclick="this.parentElement.querySelector('input').click()">⬆ Import Keys</button>
      <input type="file" name="file" accept=".json" style="display:none" onchange="this.parentElement.submit()">
    </label>
  </form>
</div>

<table>
  <tr><th>Key</th><th>Roblox</th><th>HWID</th><th>Expires</th><th>Status</th><th>Actions</th></tr>
  ${rows || `<tr><td colspan="6" style="color:#333;text-align:center;padding:20px">No keys yet — generate one below</td></tr>`}
</table>

<div class="section">
  <h2>⚡ Generate Key</h2>
  <form method="POST" action="/generate-key">
    <div class="row">
      <select name="days">
        <option value="1">1 Day</option>
        <option value="7" selected>7 Days</option>
        <option value="30">30 Days</option>
        <option value="365">1 Year</option>
      </select>
      <button type="submit" class="green">Generate Key</button>
    </div>
  </form>
</div>

<div class="section">
  <h2>✏️ Add Custom Key</h2>
  <form method="POST" action="/add-key">
    <div class="row">
      <input type="text" name="key" placeholder="e.g. MYKEY-001" required>
      <select name="days">
        <option value="1">1 Day</option>
        <option value="7" selected>7 Days</option>
        <option value="30">30 Days</option>
        <option value="365">1 Year</option>
      </select>
      <button type="submit" class="green">Add Key</button>
    </div>
  </form>
</div>

<div class="section">
  <h2>📦 Script URL</h2>
  <p style="color:#555;font-size:12px;margin-bottom:12px">Raw script URL to load for all valid keys. Update anytime without touching the Lua loader.</p>
  <form method="POST" action="/set-script">
    <div class="row">
      <input type="text" name="url" value="${scriptUrl}" style="width:420px" placeholder="https://pastebin.com/raw/...">
      <button type="submit" class="green">Update</button>
    </div>
  </form>
  <p class="hint">current → ${scriptUrl}</p>
</div>

</body>
</html>`);
});

// ---- GENERATE KEY ----
app.post("/generate-key", (req, res) => {
    const { days } = req.body;
    const key = generateKey();
    keys[key] = { hwid: null, roblox: null, expires: Date.now() + 1000*60*60*24 * parseInt(days || 7) };
    res.redirect("/dashboard");
});

// ---- ADD CUSTOM KEY ----
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

// ---- SET SCRIPT URL ----
app.post("/set-script", (req, res) => {
    const { url } = req.body;
    if (url) scriptUrl = url;
    res.redirect("/dashboard");
});

// ---- EXPORT KEYS ----
app.get("/export", (req, res) => {
    res.setHeader("Content-Disposition", "attachment; filename=keys.json");
    res.setHeader("Content-Type", "application/json");
    res.send(JSON.stringify(keys, null, 2));
});

// ---- IMPORT KEYS ----
app.post("/import", express.raw({ type: "*/*", limit: "1mb" }), (req, res) => {
    try {
        const text = req.body.toString();
        const start = text.indexOf("{");
        const end = text.lastIndexOf("}");
        const json = text.substring(start, end + 1);
        const imported = JSON.parse(json);
        keys = { ...keys, ...imported };
    } catch(e) {
        console.error("Import failed:", e);
    }
    res.redirect("/dashboard");
});

app.listen(3000, () => console.log("Server running"));
