import "dotenv/config";
import {
  initializePool,
  testDatabaseConnection,
  closePool,
} from "./config/db.js";

async function main() {
  try {
    await initializePool();

    const result = await testDatabaseConnection();

    console.log("Oracle connection successful!");
    console.log("Connected user:", result.username);
    console.log("Database server time:", result.serverTime);
  } catch (error) {
    console.error("Oracle connection failed:", error.message);
    process.exitCode = 1;
  } finally {
    await closePool().catch(() => {});
  }
}

main();