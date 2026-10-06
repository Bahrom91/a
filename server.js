const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

// Birinchi ishga tushirishdagi parol.
// Keyin parol sayt ichidan o'zgartiriladi.
const INITIAL_PASSWORD = "B2008U2011";

const DATA_DIR = path.join(__dirname, "data");
const PASSWORD_FILE = path.join(DATA_DIR, "password.hash");
const VAULT_FILE = path.join(DATA_DIR, "vault.enc");
const SESSION_SECRET_FILE = path.join(DATA_DIR, "session.secret");

fs.mkdirSync(DATA_DIR, { recursive: true });

function getSessionSecret() {
  if (!fs.existsSync(SESSION_SECRET_FILE)) {
    fs.writeFileSync(SESSION_SECRET_FILE, crypto.randomBytes(48).toString("hex"));
  }
  return fs.readFileSync(SESSION_SECRET_FILE, "utf8").trim();
}

function getPasswordHash() {
  if (!fs.existsSync(PASSWORD_FILE)) {
    const hash = bcrypt.hashSync(INITIAL_PASSWORD, 12);
    fs.writeFileSync(PASSWORD_FILE, hash);
  }
  return fs.readFileSync(PASSWORD_FILE, "utf8").trim();
}

function deriveKey(password) {
  return crypto.scryptSync(password, "private-vault-salt-v1", 32);
}

function encrypt(data, password) {
  const iv = crypto.randomBytes(12);
  const key = deriveKey(password);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(data), "utf8"),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();

  return JSON.stringify({
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: encrypted.toString("base64")
  });
}

function decrypt(raw, password) {
  const obj = JSON.parse(raw);
  const key = deriveKey(password);
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(obj.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(obj.tag, "base64"));

  const plain = Buffer.concat([
    decipher.update(Buffer.from(obj.data, "base64")),
    decipher.final()
  ]);

  return JSON.parse(plain.toString("utf8"));
}

function readVault(password) {
  if (!fs.existsSync(VAULT_FILE)) return { logins: [], phones: [] };
  return decrypt(fs.readFileSync(VAULT_FILE, "utf8"), password);
}

function writeVault(vault, password) {
  fs.writeFileSync(VAULT_FILE, encrypt(vault, password));
}

app.use(express.json({ limit: "1mb" }));

app.use(session({
  secret: getSessionSecret(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 12
  }
}));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false
});

function auth(req, res, next) {
  if (!req.session.authenticated) {
    return res.status(401).json({ error: "Kirish kerak" });
  }
  next();
}

app.post("/api/login", loginLimiter, (req, res) => {
  const password = String(req.body.password || "");
  const ok = bcrypt.compareSync(password, getPasswordHash());

  if (!ok) return res.status(401).json({ error: "Parol noto'g'ri" });

  req.session.authenticated = true;
  req.session.vaultPassword = password;
  res.json({ ok: true });
});

app.get("/api/session", (req, res) => {
  res.json({ authenticated: !!req.session.authenticated });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get("/api/vault", auth, (req, res) => {
  try {
    res.json(readVault(req.session.vaultPassword));
  } catch {
    res.status(500).json({ error: "Ma'lumotlarni ochib bo'lmadi" });
  }
});

app.put("/api/vault", auth, (req, res) => {
  try {
    const vault = {
      logins: Array.isArray(req.body.logins) ? req.body.logins : [],
      phones: Array.isArray(req.body.phones) ? req.body.phones : []
    };
    writeVault(vault, req.session.vaultPassword);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Saqlashda xatolik" });
  }
});

app.post("/api/change-password", auth, (req, res) => {
  const oldPassword = String(req.body.oldPassword || "");
  const newPassword = String(req.body.newPassword || "");

  if (newPassword.length < 6) {
    return res.status(400).json({ error: "Yangi parol kamida 6 ta belgi bo'lsin" });
  }

  if (!bcrypt.compareSync(oldPassword, getPasswordHash())) {
    return res.status(401).json({ error: "Eski parol noto'g'ri" });
  }

  try {
    const vault = readVault(oldPassword);
    writeVault(vault, newPassword);
    fs.writeFileSync(PASSWORD_FILE, bcrypt.hashSync(newPassword, 12));

    req.session.vaultPassword = newPassword;
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Parolni almashtirib bo'lmadi" });
  }
});

app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
  console.log(`Private Vault: http://localhost:${PORT}`);
});
