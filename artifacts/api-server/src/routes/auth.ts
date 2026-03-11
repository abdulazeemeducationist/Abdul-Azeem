import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const router: IRouter = Router();

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "mcq-salt-2024").digest("hex");
}

function generateToken(userId: number, email: string): string {
  const payload = { userId, email, ts: Date.now() };
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: "Bad Request", message: "Name, email and password are required" });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "Bad Request", message: "Password must be at least 6 characters" });
      return;
    }
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "Conflict", message: "An account with this email already exists" });
      return;
    }
    const [user] = await db.insert(usersTable).values({
      name,
      email: email.toLowerCase(),
      passwordHash: hashPassword(password),
      role: "student",
    }).returning();
    const token = generateToken(user.id, user.email);
    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to create account" });
  }
});

router.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Bad Request", message: "Email and password are required" });
      return;
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
    if (!user || user.passwordHash !== hashPassword(password)) {
      res.status(401).json({ error: "Unauthorized", message: "Invalid email or password" });
      return;
    }
    const token = generateToken(user.id, user.email);
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to sign in" });
  }
});

router.post("/reset-password", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: "Bad Request", message: "Email is required" });
    return;
  }
  res.json({ message: "If an account with that email exists, a reset link has been sent." });
});

export default router;
