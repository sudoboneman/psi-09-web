import express from 'express';
import { Client } from 'whatsapp-web.js';
import pkg from 'whatsapp-web.js';
const { LocalAuth } = pkg;
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const app = express();
const port = process.env.PORT || 10000;

app.get('/', (_, res) => res.send('✅ PSI-09 WhatsApp bot is running.'));
app.get('/ping', (_, res) => res.sendStatus(200));

app.listen(port, () => {
  console.log(`🌐 Listening on port ${port}`);
});

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox'],
  },
});

client.on('ready', () => {
  console.log('✅ WhatsApp bot is ready');
});

client.on('message', async (msg) => {
  try {
    // 🛑 Ignore bot’s own messages to prevent roast loops
    if (msg.fromMe) return;

    // 🛑 Ignore empty/system messages
    if (!msg.body || msg.body.trim() === '') return;

    const chat = await msg.getChat();
    const contact = await msg.getContact();

    const isGroup = chat.isGroup;
    const senderName =
      contact.pushname || contact.name || contact.number || chat.name;

    const groupName = isGroup ? chat.name : null;

    console.log(
      `📩 ${isGroup ? 'Group' : 'Personal'} message from ${senderName}: ${msg.body}`
    );

    // ✅ Now safe to call PSI-09 API
    const { data } = await axios.post(process.env.PSI09_API_URL, {
      message: msg.body,
      sender: senderName || 'Unknown',
      group_name: groupName,
    });

    const reply = String(data.reply || '').trim();

    if (!reply) {
      console.log('🛑 Empty reply from PSI-09. Skipping response.');
      return;
    }

    console.log(`🤖 PSI-09 reply: ${reply}`);
    await msg.reply(reply);
  } catch (error) {
    console.error('❌ Error handling message:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
  }
});

client.initialize();
