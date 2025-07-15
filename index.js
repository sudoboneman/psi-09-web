const express = require("express");
const { Client, RemoteAuth } = require("whatsapp-web.js");
const { MongoStore } = require("wwebjs-mongo");
const mongoose = require("mongoose");
const setupBot = require("./bot");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ 1. /ping route for cron-job.org
app.get("/ping", (req, res) => {
  res.send("pong");
});

// ✅ 2. Start Express server
app.listen(PORT, () => {
  console.log(`✅ Express server running on port ${PORT}`);
});

// ✅ 3. Connect to MongoDB and setup WhatsApp client
async function startBot() {
  try {
    console.log("⏳ Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const store = new MongoStore({ mongoose });

    const client = new Client({
      authStrategy: new RemoteAuth({
        store,
        backupSyncIntervalMs: 300000 // 5 minutes
      }),
      puppeteer: {
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
      }
    });

    setupBot(client);
    client.initialize();
  } catch (err) {
    console.error("❌ Error starting bot:", err);
  }
}

startBot();

