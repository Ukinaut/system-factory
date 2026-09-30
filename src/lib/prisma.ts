import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

globalForPrisma.prisma = prisma;

// Asegurar que SQLite use modo WAL y timeout de espera en conexiones de Prisma
prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 10000;").catch(() => {});

