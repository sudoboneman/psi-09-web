import { chromium } from 'playwright';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { readdirSync } from 'fs';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PSI09_API = process.env.PSI09_API_URL;

// 🔍 Auto-detect installed Chromium executable

function getChromiumPath() {
  const shellPath = '/opt/render/.cache/ms-playwright/chromium_headless_shell-1181/headless_shell';

  if (existsSync(shellPath)) {
    return shellPath;
  }

  throw new Error(`❌ Chromium executable not found at expected path: ${shellPath}`);
}

(async () => {
  console.log("🔁 Launching Playwright with saved session...");

  const storageState = JSON.parse(await fs.readFile(path.join(__dirname, 'whatsapp-session.json')));
  const executablePath = getChromiumPath();
  if (!executablePath) throw new Error("Chromium executable path not found");

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox'],
    executablePath
  });

  const context = await browser.newContext({ storageState });
  const page = await context.newPage();
  await page.goto('https://web.whatsapp.com');

  console.log("⏳ Waiting for chats to load...");
  await page.waitForSelector('[data-testid="chat-list"]', { timeout: 180000 });
  console.log("✅ Logged into WhatsApp Web");

  while (true) {
    try {
      const unreadMessages = await page.$$('span[aria-label="Unread message"]');
      for (const unread of unreadMessages) {
        const chat = await unread.evaluateHandle(el => el.closest('._2aBzC') || el.closest('[role="row"]'));
        if (chat) {
          await chat.click();
          await page.waitForTimeout(1000);

          const messages = await page.$$eval('div.selectable-text span[dir="ltr"]', spans =>
            spans.map(el => el.textContent).slice(-1)
          );

          const lastMessage = messages[messages.length - 1];
          console.log("📩 Incoming:", lastMessage);

          const chatTitle = await page.$eval('header span[title]', el => el.textContent);
          const isGroupChat = await page.$('header span[data-testid="default-group"]') !== null;

          let senderName = "Unknown Sender";
          let groupName = isGroupChat ? chatTitle : null;

          if (!isGroupChat) {
            senderName = chatTitle;
          }

          if (isGroupChat && lastMessage.includes("@Supratim_H")) {
            const senderElement = await page.$('div.message-in span[dir="auto"] strong');
            if (senderElement) {
              senderName = await senderElement.textContent();
            }

            console.log("📨 Sender:", senderName);
            console.log("👥 Group:", groupName);

            const response = await axios.post(PSI09_API, {
              message: lastMessage,
              sender: senderName,
              group_name: groupName
            });

            const reply = response.data.reply || "[No reply]";
            console.log("🤖 PSI-09:", reply);

            const messageBox = await page.$('div[title="Type a message"]');
            await messageBox.click();
            await messageBox.type(reply);
            await messageBox.press('Enter');
          } else if (!isGroupChat) {
            console.log("📨 Sender:", senderName);

            const response = await axios.post(PSI09_API, {
              message: lastMessage,
              sender: senderName,
              group_name: null
            });

            const reply = response.data.reply || "[No reply]";
            console.log("🤖 PSI-09:", reply);

            const messageBox = await page.$('div[title="Type a message"]');
            await messageBox.click();
            await messageBox.type(reply);
            await messageBox.press('Enter');
          } else {
            console.log("⏭️ Skipped: PSI-09 not pinged in group chat.");
          }
        }
      }
    } catch (err) {
      console.error("❌ Error in loop:", err.message);
    }

    await page.waitForTimeout(5000);
  }
})();
