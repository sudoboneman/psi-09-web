import express from 'express';
import fs from 'fs/promises';
import { Client } from 'whatsapp-web.js';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const app = express();
const port = process.env.PORT || 10000;

// Basic Express web server just to keep Render happy
app.get('/', (req, res) => {
  res.send('✅ PSI-09 WhatsApp bot is running.');
});
app.listen(port, () => {
  console.log(`🌐 Listening on port ${port}`);
});

// Load WhatsApp session from whatsapp-session.json
const startBot = async () => {
  console.log("📦 Loading session file...");
  let sessionData;
  try {
    sessionData = JSON.parse(await fs.readFile('./whatsapp-session.json', 'utf8'));
    console.log("✅ Session loaded");
  } catch (err) {
    console.error("❌ Failed to load session:", err.message);
    return;
  }

  console.log("🚀 Initializing WhatsApp client...");
  const client = new Client({
    session: sessionData,
    puppeteer: {
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true,
    },
  });

  client.on('qr', () => {
    console.warn('⚠️ QR Code was requested — session might be expired.');
  });

  client.on('auth_failure', (msg) => {
    console.error('❌ Authentication failed:', msg);
  });

  client.on('disconnected', (reason) => {
    console.warn('⚠️ Client disconnected:', reason);
  });

  client.on('ready', () => {
    console.log('✅ WhatsApp bot is ready');
  });

  client.on('message', async (msg) => {
    // Your original message handling code
  });

  try {
    await client.initialize();
    console.log("🚦 client.initialize() completed.");
  } catch (err) {
    console.error("❌ Error initializing WhatsApp client:", err.message);
  }
};


startBot();
