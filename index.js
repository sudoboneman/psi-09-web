const express = require("express");
const { Client, RemoteAuth } = require("whatsapp-web.js");
const { MongoStore } = require("wwebjs-mongo");
const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const PSI09_API = process.env.PSI09_API_URL || "https://psi-09-roastbot.onrender.com/psi09";

// 1. Ping route for uptime services like cron-job.org
app.get("/ping", (req, res) => {
  res.send("pong");
});

// 2. Start Express
app.listen(PORT, () => {
  console.log(`✅ Express server running on port ${PORT}`);
});

// 3. WhatsApp Web setup
console.log("⏳ Connecting to MongoDB...");
mongoose.connect(process.env.MONGODB_URI).then(() => {
  console.log("✅ Connected to MongoDB");

  const store = new MongoStore({ mongoose: mongoose });
  const client = new Client({
    authStrategy: new RemoteAuth({
      store,
      backupSyncIntervalMs: 300000
    }),
    puppeteer: {
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    }
  });

  // 4. Message handler
  client.on("message", async (msg) => {
    try {
      const chat = await msg.getChat();
      const isGroup = chat.isGroup;

      const groupName = isGroup ? chat.name : "DefaultGroup";
      const sender = msg._data.notifyName || msg.from;
      const message = msg.body;

      console.log(`📩 ${sender} in ${groupName}: ${message}`);

      if (message.toLowerCase() === "ping") {
        await msg.reply("pong");
        return;
      }

      const response = await axios.post(PSI09_API, {
        message,
        sender,
        group_name: groupName
      });

      const reply = response.data.reply || "[No reply]";
      await msg.reply(reply);
    } catch (err) {
      console.error("❌ Message handler error:", err.message);
    }
  });

  client.initialize();
});
