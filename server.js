import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import axios from 'axios';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PSI09_API = process.env.PSI09_API_URL;

(async () => {
  console.log("🔁 Launching Playwright with saved session...");
  const storageState = JSON.parse(await fs.readFile(path.join(__dirname, 'whatsapp-session.json')));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ storageState });
  const page = await context.newPage();

  await page.goto('https://web.whatsapp.com');

  console.log("⏳ Waiting for chats to load...");
  await page.waitForSelector('[data-testid="chat-list"]', { timeout: 180000 });

  console.log("✅ Logged into WhatsApp Web");

  while (true) {
    try {
      // Watch for new unread messages every few seconds
      const unreadMessages = await page.$$('span[aria-label="Unread message"]');
      for (const unread of unreadMessages) {
        const chat = await unread.evaluateHandle(el => el.closest('._2aBzC') || el.closest('[role="row"]'));
        if (chat) {
          await chat.click();
          await page.waitForTimeout(1000); // Wait for chat to load

          const messages = await page.$$eval('div.selectable-text span[dir="ltr"]', spans =>
            spans.map(el => el.textContent).slice(-1)
          );

          const lastMessage = messages[messages.length - 1];
          console.log("📩 Incoming:", lastMessage);

          const response = await axios.post(PSI09_API, {
            message: lastMessage,
            sender: "playwright-bot",
            group_name: "Playwright Group"
          });

          const reply = response.data.reply || "[No reply]";
          console.log("🤖 PSI-09:", reply);

          const messageBox = await page.$('div[title="Type a message"]');
          await messageBox.click();
          await messageBox.type(reply);
          await messageBox.press('Enter');
        }
      }
    } catch (err) {
      console.error("❌ Error in loop:", err.message);
    }

    await page.waitForTimeout(5000);
  }
})();

