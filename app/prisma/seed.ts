import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import * as bcrypt from "bcrypt";

const db_url = new URL(process.env.DATABASE_URL!);

const adapter = new PrismaMariaDb({
  host: db_url.hostname,
  port: Number(db_url.port || 3306),
  user: decodeURIComponent(db_url.username),
  password: decodeURIComponent(db_url.password),
  database: db_url.pathname.replace("/", ""),
  connectionLimit: 5,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const rooms = [
    {
      name: "Standard Room 101",
      description: "Standard room with garden view",
      capacity: 2,
      price_per_night: 1800,
      image_url: "/images/room101.jpg",
      is_active: true,
    },
    {
      name: "Deluxe Room 201",
      description: "Deluxe room with city view and balcony",
      capacity: 2,
      price_per_night: 2800,
      image_url: "/images/room201.jpg",
      is_active: true,
    },
    {
      name: "Family Room 301",
      description: "Large family room suitable for 4 guests",
      capacity: 4,
      price_per_night: 4200,
      image_url: "/images/room301.jpg",
      is_active: true,
    },
    {
      name: "Suite Room 401",
      description: "Luxury suite with living area and sea view",
      capacity: 3,
      price_per_night: 6500,
      image_url: "/images/room401.jpg",
      is_active: true,
    },
    {
      name: "Economy Room 102",
      description: "Small economy room for budget travelers",
      capacity: 1,
      price_per_night: 1200,
      image_url: "/images/room102.jpg",
      is_active: false,
    },
  ];

  for (const room of rooms) {
    await prisma.rooms.upsert({
      where: { name: room.name },
      update: room,
      create: room,
    });
  }

  // Seed admin account
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.warn(
      "WARNING: ADMIN_PASSWORD environment variable is not set. Skipping admin account creation."
    );
  } else {
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    await prisma.users.upsert({
      where: { username: "admin" },
      update: {},
      create: {
        username: "admin",
        email: process.env.ADMIN_EMAIL || "admin@hotel-booking.com",
        full_name: "System Administrator",
        password_hash: hashedPassword,
        role: "admin",
      },
    });
    console.log("Admin account created/verified");
  }

  console.log("Seed data inserted/updated");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });