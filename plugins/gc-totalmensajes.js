import fs from "fs";
import path from "path";

const handler = async (msg, { conn }) => {
  try {
    const chatId = msg.key.remoteJid;
    if (!chatId.endsWith("@g.us")) return;
    const senderJid = msg.key.participant || msg.key.remoteJid;

    const rawID = conn.user?.id || "";
    const botNumber = rawID.split(":")[0].replace(/[^0-9]/g, "");

    // Leer prefijo
    const prefixPath = path.resolve("prefixes.json");
    let prefixes = {};
    if (fs.existsSync(prefixPath)) {
      prefixes = JSON.parse(fs.readFileSync(prefixPath, "utf-8"));
    }
    const usedPrefix = prefixes[rawID.split(":")[0] + "@s.whatsapp.net"] || ".";

    const body = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || "").toLowerCase();

    // --- CONTAR TODOS los mensajes en grupos
    if (!global.db) global.db = {};
    if (!global.db.data) global.db.data = {};
    if (!global.db.data.groupChats) global.db.data.groupChats = {};
    if (!global.db.data.groupChats[chatId] == null) global.db.data.groupChats[chatId] = {};
    if (!global.db.data.groupChats[chatId][senderJid] == null) global.db.data.groupChats[chatId][senderJid] = { chat: 0 };

    // **Aquí el conteo independiente de si es comando o no**
    global.db.data.groupChats[chatId][senderJid].chat += 1;

    // --- SOLO responder si es comando
    if (!body.startsWith(usedPrefix)) return;
    const command = body.slice(usedPrefix.length).trim().split(/\s+/)[0];

    const metadata = await conn.groupMetadata(chatId);
    const participants = metadata.participants;

    if (command === "totalmensajes") {
      let usuariosMensajes = participants
        .filter(user => !user.id.includes(botNumber))
        .map(user => ({
          id: user.id,
          mensajes: global.db.data.groupChats[chatId]?.[user.id]?.chat || 0,
        }));
      usuariosMensajes.sort((a, b) => b.mensajes - a.mensajes);

      let texto = `📊 *Total de Mensajes por Usuario en este Grupo* 📊\n\n` + 
        usuariosMensajes.map((u, i) => `${i + 1}. @${u.id.split("@")[0]} - *${u.mensajes}* mensajes`).join("\n");

      return await conn.sendMessage(
        chatId,
        { text: texto, mentions: usuariosMensajes.map(u => u.id) },
        { quoted: msg }
      );
    }

    if (command === "resetmensaje") {
      const sender = participants.find(p => p.id === senderJid);
      const isAdmin = sender?.admin === "admin" || sender?.admin === "superadmin";
      const isBot = botNumber === senderJid.replace(/[^0-9]/g, "");

      if (!isAdmin && !isBot) {
        return await conn.sendMessage(
          chatId,
          { text: "❌ Solo administradores o el bot pueden usar este comando." },
          { quoted: msg }
        );
      }

      participants.forEach(user => {
        if (!global.db.data.groupChats[chatId]) global.db.data.groupChats[chatId] = {};
        global.db.data.groupChats[chatId][user.id] = { chat: 0 };
      });

      return await conn.sendMessage(
        chatId,
        { text: "✅ Contador de mensajes reiniciado para todos los participantes." },
        { quoted: msg }
      );
    }
  } catch (error) {
    console.error("Error en handler totalmensajes:", error);
  }
};

// No poner handler.command para que el handler se ejecute en todos los mensajes
export default handler;
