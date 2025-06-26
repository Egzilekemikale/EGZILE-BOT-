
import makeWASocket, { DisconnectReason, useMultiFileAuthState } from "@whiskeysockets/baileys";
import pino from "pino";
import fs from "fs";

// 💡 Pairing mode toggle
const USE_PAIRING = true; // Change to false to use QR code login

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("session");

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: !USE_PAIRING,
    logger: pino({ level: "silent" }),
    browser: ["EgzileBOT", "Chrome", "1.0"],
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    if (connection === "close") {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        startBot();
      } else {
        console.log("❌ Logged out.");
      }
    } else if (connection === "open") {
      console.log("✅ EgzileBOT is now online!");
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

    // 💬 Basic command replies
    if (text.startsWith(".menu")) {
      await sock.sendMessage(msg.key.remoteJid, {
        text: "*👑 EGZILE BOT MENU 👑*\n\n.menu\n.say\n.sticker\n.quote\n.kick\n.warn\n.save\n.auth\n.unauth\n\n🤖 Powered by Egzile",
      });
    }

    if (text.startsWith(".say ")) {
      const sayText = text.slice(5).trim();
      if (sayText) {
        await sock.sendMessage(msg.key.remoteJid, { text: sayText });
      }
    }

    if (text.startsWith(".quote")) {
      await sock.sendMessage(msg.key.remoteJid, {
        text: "“Sometimes you win, sometimes you learn.” – John Maxwell",
      });
    }

    if (text.startsWith(".sticker") && msg.message.imageMessage) {
      const buffer = await sock.downloadMediaMessage(msg);
      await sock.sendMessage(msg.key.remoteJid, { sticker: buffer }, { quoted: msg });
    }

    if (text.startsWith(".kick") && msg.key.participant) {
      await sock.groupParticipantsUpdate(msg.key.remoteJid, [msg.key.participant], "remove");
    }

    if (text.startsWith(".warn")) {
      await sock.sendMessage(msg.key.remoteJid, {
        text: `⚠️ Warning issued to @${msg.key.participant.split("@")[0]}`,
        mentions: [msg.key.participant],
      });
    }
  });
}

startBot();
