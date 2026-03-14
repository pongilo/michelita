import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/../generated/prisma/client";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});