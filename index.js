const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const axios = require("axios");
const express = require("express");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

// Create client with local auth
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

// QR Login
client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
  console.log("Scan the QR code above with your phone.");
});

client.on("ready", () => {
  console.log("✅ WhatsApp Bot is ready!");
});

// Message handler
client.on("message", async (msg) => {
  try {
    const messageText = msg.body;
    const senderName = msg._data.notifyName || msg.from;
    const isGroup = msg.from.includes("@g.us");
    const groupName = isGroup ? msg._data.notifyName : "DirectChat";

    if (!messageText) return;

    // Ping handling
    if (messageText.trim().toLowerCase() === "ping") {
      await msg.reply("pong");
      return;
    }

    // Send to PSI-09 backend
    const response = await axios.post(process.env.PSI09_API, {
      message: messageText,
      sender: senderName,
      group_name: groupName,
    });

    const replyText = response.data.reply || "No response from PSI-09.";
    await msg.reply(replyText);
  } catch (err) {
    console.error("❌ Error handling message:", err.message);
    await msg.reply("PSI-09 bot encountered an error.");
  }
});

client.initialize();

// Keepalive endpoint (useful for Render)
app.get("/", (req, res) => res.send("WhatsApp bot is alive!"));

app.listen(port, () => {
  console.log(`🌐 Express server listening at http://localhost:${port}`);
});
