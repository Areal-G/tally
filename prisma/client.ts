import type { PrismaClient } from "@prisma/client";
import { createMemoryPrismaClient } from "@/lib/demo/memory-prisma";
import { seedDemoDatabase } from "@/lib/demo/seed";

/**
 * Demo branch: there is no database. `prisma` is an in-memory client with the
 * same API as PrismaClient, filled with the Northgate sample store when the
 * server starts (see lib/demo). Changes live only in that server instance's
 * memory and disappear when it restarts.
 *
 * One instance per process, shared through globalThis so every bundle that
 * imports this module (route handlers, server components) sees the same data.
 */

declare global {
  var demoPrisma: PrismaClient | undefined;
}

const isServer = typeof window === "undefined";

export const prisma: PrismaClient = isServer
  ? (globalThis.demoPrisma ??= createMemoryPrismaClient((client) =>
      seedDemoDatabase(client),
    ))
  : ({} as PrismaClient); // Never used in the browser

export default prisma;
