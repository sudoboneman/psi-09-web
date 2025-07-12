const { Client, RemoteAuth } = require('whatsapp-web.js');
const { MongoStore } = require('wwebjs-mongo');
const mongoose = require('mongoose');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
require('dotenv').config();

const mongoUri = process.env.MONGODB_URI;
const psi09ApiUrl = process.env.PSI09_API_URL;

mongoose.connect(mongoUri).then(() => {
  console.log('✅ MongoDB connected');
});

const store = new MongoStore({ mongoose: mongoose });

const client = new Client({
  authStrategy: new RemoteAuth({
    store,
    backupSyncIntervalMs: 300000,
  }),
  puppeteer: {
    args: ['--no-sandbox'],
    headless: true
  }
});

client.on('qr', (qr) => {
  console.log('🔑 Scan this QR or pair using code in WhatsApp settings');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('🤖 PSI-09 bot is ready on WhatsApp');
});

client.on('message', async (message) => {
  try {
    const contact = await message.getContact();
    const chat = await message.getChat();

    if (!message.body || contact.isMe) return;

    const payload = {
      app: "WhatsApp",
      sender: contact.pushname || contact.number,
      message: message.body,
      group_name: chat.isGroup ? chat.name : "DirectChat",
      phone: contact.number
    };

    const response = await axios.post(psi09ApiUrl, payload);
    const reply = response.data.reply;

    await message.reply(reply);
  } catch (err) {
    console.error('❌ Error handling message:', err.message);
  }
});

client.initialize();
