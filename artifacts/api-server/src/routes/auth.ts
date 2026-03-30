import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, otpVerificationsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

const router: IRouter = Router();

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "mcq-salt-2024").digest("hex");
}

function generateToken(userId: number, email: string): string {
  const payload = { userId, email, ts: Date.now() };
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

function generatePhoneToken(phoneNumber: string): string {
  const payload = { phoneNumber, ts: Date.now(), purpose: "signup" };
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

function verifyPhoneToken(token: string, expectedPhone: string): boolean {
  try {
    const { phoneNumber, ts } = JSON.parse(Buffer.from(token, "base64").toString());
    if (phoneNumber !== expectedPhone) return false;
    if (Date.now() - ts > 30 * 60 * 1000) return false;
    return true;
  } catch {
    return false;
  }
}

router.post("/send-otp", async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      res.status(400).json({ error: "Bad Request", message: "phoneNumber is required" });
      return;
    }
    const cleaned = phoneNumber.replace(/\D/g, "");
    if (cleaned.length < 10 || cleaned.length > 15) {
      res.status(400).json({ error: "Bad Request", message: "Invalid phone number format" });
      return;
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await db.update(otpVerificationsTable)
      .set({ used: true })
      .where(eq(otpVerificationsTable.phoneNumber, cleaned));
    await db.insert(otpVerificationsTable).values({ phoneNumber: cleaned, code, expiresAt });
    console.log(`[OTP] Verification code for ${cleaned}: ${code}`);
    res.json({ message: "Verification code sent", devCode: code });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to send code" });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    const { phoneNumber, code } = req.body;
    if (!phoneNumber || !code) {
      res.status(400).json({ error: "Bad Request", message: "phoneNumber and code are required" });
      return;
    }
    const cleaned = phoneNumber.replace(/\D/g, "");
    const [otp] = await db.select().from(otpVerificationsTable)
      .where(and(
        eq(otpVerificationsTable.phoneNumber, cleaned),
        eq(otpVerificationsTable.code, code),
        eq(otpVerificationsTable.used, false),
      )).limit(1);
    if (!otp) {
      res.status(400).json({ error: "Invalid Code", message: "The code is incorrect. Please try again." });
      return;
    }
    if (new Date() > otp.expiresAt) {
      res.status(400).json({ error: "Expired Code", message: "Code has expired. Please request a new one." });
      return;
    }
    await db.update(otpVerificationsTable).set({ used: true }).where(eq(otpVerificationsTable.id, otp.id));
    const phoneToken = generatePhoneToken(cleaned);
    res.json({ verified: true, phoneToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to verify code" });
  }
});

router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, whatsappNumber, phoneToken } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: "Bad Request", message: "Name, email and password are required" });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "Bad Request", message: "Password must be at least 6 characters" });
      return;
    }
    if (!whatsappNumber || !phoneToken) {
      res.status(400).json({ error: "Bad Request", message: "WhatsApp number verification is required" });
      return;
    }
    const cleanedPhone = whatsappNumber.replace(/\D/g, "");
    if (!verifyPhoneToken(phoneToken, cleanedPhone)) {
      res.status(400).json({ error: "Bad Request", message: "WhatsApp verification expired or invalid. Please verify again." });
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
      whatsappNumber: cleanedPhone,
      whatsappVerified: true,
    }).returning();
    const token = generateToken(user.id, user.email);
    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, whatsappNumber: user.whatsappNumber ?? null, profilePicture: user.profilePicture ?? null, createdAt: user.createdAt },
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
    if (user.isBlocked) {
      res.status(403).json({ error: "Forbidden", message: "Your account has been blocked. Please contact support." });
      return;
    }
    const token = generateToken(user.id, user.email);
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, whatsappNumber: user.whatsappNumber ?? null, profilePicture: user.profilePicture ?? null, createdAt: user.createdAt },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to sign in" });
  }
});

router.put("/profile", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) { res.status(401).json({ error: "Unauthorized" }); return; }
    const token = authHeader.replace("Bearer ", "");
    const { userId } = JSON.parse(Buffer.from(token, "base64").toString());
    const { name, whatsappNumber } = req.body;
    if (!name?.trim()) { res.status(400).json({ error: "Bad Request", message: "Name is required" }); return; }
    const [user] = await db.update(usersTable)
      .set({ name: name.trim(), whatsappNumber: whatsappNumber ? whatsappNumber.replace(/\D/g, "") : null })
      .where(eq(usersTable.id, userId))
      .returning();
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, whatsappNumber: user.whatsappNumber, profilePicture: user.profilePicture, createdAt: user.createdAt } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to update profile" });
  }
});

router.put("/profile/password", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) { res.status(401).json({ error: "Unauthorized" }); return; }
    const token = authHeader.replace("Bearer ", "");
    const { userId } = JSON.parse(Buffer.from(token, "base64").toString());
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) { res.status(400).json({ error: "Bad Request", message: "Current and new password are required" }); return; }
    if (newPassword.length < 6) { res.status(400).json({ error: "Bad Request", message: "New password must be at least 6 characters" }); return; }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user || user.passwordHash !== hashPassword(currentPassword)) {
      res.status(400).json({ error: "Bad Request", message: "Current password is incorrect" }); return;
    }
    await db.update(usersTable).set({ passwordHash: hashPassword(newPassword) }).where(eq(usersTable.id, userId));
    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to update password" });
  }
});

router.put("/profile/picture", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) { res.status(401).json({ error: "Unauthorized" }); return; }
    const token = authHeader.replace("Bearer ", "");
    const { userId } = JSON.parse(Buffer.from(token, "base64").toString());
    const { picture } = req.body;
    if (picture === undefined) { res.status(400).json({ error: "Bad Request", message: "picture is required" }); return; }
    const [user] = await db.update(usersTable).set({ profilePicture: picture === "" ? null : picture }).where(eq(usersTable.id, userId)).returning();
    res.json({ profilePicture: user.profilePicture });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to update picture" });
  }
});

router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) { res.status(401).json({ error: "Unauthorized" }); return; }
    const token = authHeader.replace("Bearer ", "");
    const { userId } = JSON.parse(Buffer.from(token, "base64").toString());
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) { res.status(404).json({ error: "Not Found" }); return; }
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role, whatsappNumber: user.whatsappNumber, profilePicture: user.profilePicture, createdAt: user.createdAt });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
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
