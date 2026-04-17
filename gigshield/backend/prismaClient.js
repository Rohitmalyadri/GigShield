// ─────────────────────────────────────────────────────────
//  prismaClient.js — Singleton Prisma instance
//  Import this everywhere instead of calling `new PrismaClient()`
//  multiple times. Having one shared instance prevents
//  connection pool exhaustion in development.
// ─────────────────────────────────────────────────────────
const { PrismaClient } = require('@prisma/client');

let prisma;
if (!global.__prisma) {
  global.__prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}
prisma = global.__prisma;

module.exports = prisma;
