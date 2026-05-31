import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "mcq-salt-2024").digest("hex");
}

const existing = await db.select().from(usersTable).where(eq(usersTable.email, "admin@mcqapp.com")).limit(1);

if (existing.length > 0) {
  await db.update(usersTable)
    .set({ passwordHash: hashPassword("admin123"), role: "admin", name: "Admin" })
    .where(eq(usersTable.email, "admin@mcqapp.com"));
  console.log("Updated existing admin user.");
} else {
  const [user] = await db.insert(usersTable).values({
    name: "Admin",
    email: "admin@mcqapp.com",
    passwordHash: hashPassword("admin123"),
    role: "admin",
  }).returning();
  console.log("Created admin user:", user.id, user.email, user.role);
}

process.exit(0);
