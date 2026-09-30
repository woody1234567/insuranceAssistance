import { env } from "./config/env.js";
import { pool } from "./db/index.js";
import app from "./app.js";

const server = app.listen(env.PORT, () => {
  console.log(`🚀 [Backend] AP Server is running on port ${env.PORT}`);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`Received ${signal}, shutting down`);
  const forceExitTimer = setTimeout(() => {
    console.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
  server.close(async (error) => {
    clearTimeout(forceExitTimer);
    if (error) {
      console.error("Failed to close HTTP server", error);
      process.exit(1);
    }
    try {
      await pool.end();
      process.exit(0);
    } catch (closeError) {
      console.error("Failed to close database pool", closeError);
      process.exit(1);
    }
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
