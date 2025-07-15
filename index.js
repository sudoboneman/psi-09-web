require("dotenv").config();
const { RemoteAuth } = require("whatsapp-web.js");
const { MongoStore } = require("wwebjs-mongo");
const mongoose = require("mongoose");
const { Client } = require("whatsapp-web.js");
const axios = require("axios");

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const store = new MongoStore({ mongoose });

  const client = new Client({
    authStrategy: new RemoteAuth({
      store,
      backupSyncIntervalMs: 300000,
      clientId: "psi09-client"
    }),
    puppeteer: {
      headless: true,
      args: ["--no-sandbox"]
    }
  });

  client.on("ready", () => {
    console.log("✅ WhatsApp Bot is ready!");
  });

  client.on("message", async (message) => {
    if (message.fromMe) return;

    const contact = await message.getContact();
    const chat = await message.getChat();

    const sender = contact.pushname || contact.number;
    const group = chat.isGroup ? chat.name : "DirectChat";

    try {
      const response = await axios.post(process.env.PSI09_API_URL, {
        message: message.body,
        sender: sender,
        group_name: group
      });

      await message.reply(response.data.reply);
    } catch (error) {
      console.error("❌ Error contacting PSI-09:", error.message);
      await message.reply("PSI-09 encountered an error.");
    }
  });

  client.initialize();
})();

