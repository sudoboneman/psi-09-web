import express from 'express';
import { Client } from 'whatsapp-web.js';
import pkg from 'whatsapp-web.js';
const { LocalAuth } = pkg;
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const app = express();
const port = process.env.PORT || 10000;

app.get('/', (req, res) => {
  res.send('✅ PSI-09 WhatsApp bot is running.');
});

app.get('/ping', (req, res) => {
  console.log('🔁 Ping received from cron-job.org');
  res.sendStatus(200);
});

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
  const chat = await msg.getChat();
  const contact = await msg.getContact();

  const isGroup = chat.isGroup;
  const senderName = isGroup
    ? contact.pushname || contact.name || contact.number
    : chat.name || contact.pushname || contact.name || contact.number;

  const groupName = isGroup ? chat.name : null;

  console.log(`📩 New ${isGroup ? 'group' : 'personal'} message from ${senderName}: ${msg.body}`);

  if (isGroup && !msg.body.includes('@919477853548')) {
    console.log('⏭️ Group message ignored (no @Supratim_H mention).');
    return;
  }

  try {
    const response = await axios.post(process.env.PSI09_API_URL, {
      message: msg.body,
      sender: senderName,
      group_name: groupName,
    });

    const reply = response.data.reply || '[No reply]';

    if (!reply || reply.trim() === "") {
      console.log('🛑 Empty reply from PSI-09. Skipping response.');
      return;
    }

    console.log(`🤖 PSI-09 reply: ${reply}`);
    await msg.reply(reply);
  } catch (error) {
    console.error('❌ Error sending message to PSI-09:', error.message);
  }
});

client.initialize();
