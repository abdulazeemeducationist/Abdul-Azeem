import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "mcq-salt-2024").digest("hex");
}

const existing = await db
  .select({ id: usersTable.id })
  .from(usersTable)
  .where(eq(usersTable.email, "admin@mcqapp.com"))
  .limit(1);

if (existing.length > 0) {
  console.log(`Admin user already exists (id=${existing[0]!.id}), skipping.`);
} else {
  const [user] = await db
    .insert(usersTable)
    .values({
      name: "Admin",
      email: "admin@mcqapp.com",
      passwordHash: hashPassword("admin123"),
      role: "admin",
      whatsappVerified: true,
      isBlocked: false,
    })
    .returning({ id: usersTable.id, email: usersTable.email, role: usersTable.role });

  console.log(`Admin user created (id=${user!.id}): ${user!.email} [${user!.role}]`);
}

process.exit(0);
