import { db, usersTable, coursesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "mcq-salt-2024").digest("hex");
}

async function seed() {
  console.log("Seeding database...");

  // Admin user
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, "admin@mcqapp.com")).limit(1);
  if (existing.length === 0) {
    await db.insert(usersTable).values({
      name: "Admin User",
      email: "admin@mcqapp.com",
      passwordHash: hashPassword("admin123"),
      role: "admin",
      whatsappVerified: true,
    });
    console.log("✓ Admin user created: admin@mcqapp.com / admin123");
  } else {
    console.log("✓ Admin user already exists");
  }

  // Sample courses
  const courses = [
    { name: "Association of Chartered Certified Accountants", code: "ACCA", description: "Globally recognised professional accountancy qualification", orderNumber: 1 },
    { name: "Chartered Accountancy", code: "CA", description: "Pakistan's premier accountancy qualification by ICAP", orderNumber: 2 },
    { name: "Pakistan Institute of Public Finance Accountants", code: "PIPFA", description: "Public finance and accounting qualification", orderNumber: 3 },
    { name: "Bachelor of Commerce", code: "BCOM", description: "Undergraduate commerce degree programme", orderNumber: 4 },
    { name: "Master of Business Administration", code: "MBA", description: "Postgraduate business administration qualification", orderNumber: 5 },
  ];

  for (const course of courses) {
    const exists = await db.select().from(coursesTable).where(eq(coursesTable.code, course.code)).limit(1);
    if (exists.length === 0) {
      await db.insert(coursesTable).values(course);
      console.log(`✓ Course created: ${course.code}`);
    } else {
      console.log(`✓ Course already exists: ${course.code}`);
    }
  }

  console.log("\nSeeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
