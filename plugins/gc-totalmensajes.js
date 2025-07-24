import fs from "fs";
import path from "path";

const handler = async (msg, { conn, args }) => {
  const chatId = msg.key.remoteJid;
  const senderJid = msg.key.participant || msg.key.remoteJid;

  const rawID = conn.user?.id || "";
  const subbotID = rawID.split(":")[0] + "@s.whatsapp.net";
  const botNumber = rawID.split(":")[0].replace(/[^0-9]/g, "");
  const senderNum = senderJid.replace(/[^0-9]/g, "");

  const prefixPath = path.resolve("prefixes.json");
  let prefixes = {};
  if (fs.existsSync(prefixPath)) {
    prefixes = JSON.parse(fs.readFileSync(prefixPath, "utf-8"));
  }
  const usedPrefix = prefixes[subbotID] || ".";

  const body = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || "").toLowerCase();
  const prefixEscaped = usedPrefix.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&");
  const commandRegex = new RegExp(`^${prefixEscaped}(\\w+)`);
  const commandMatch = body.match(commandRegex);
  const command = commandMatch ? commandMatch[1] : "";

  // ✅ Conteo automático por usuario y grupo: aplica a todo tipo de mensaje
  if (chatId.endsWith("@g.us")) {
    if (!global.db.data.groupChats) global.db.data.groupChats = {};
    if (!global.db.data.groupChats[chatId]) global.db.data.groupChats[chatId] = {};
    if (!global.db.data.groupChats[chatId][senderJid]) global.db.data.groupChats[chatId][senderJid] = { chat: 0 };
    global.db.data.groupChats[chatId][senderJid].chat += 1;
  }

  // 👇 El resto se ejecuta solo si es comando
  if (!command) return;

  if (!chatId.endsWith("@g.us")) {
    return await conn.sendMessage(
      chatId,
      { text: "⚠️ *Este comando solo se puede usar en grupos.*" },
      { quoted: msg }
    );
  }

  const metadata = await conn.groupMetadata(chatId);
  const participants = metadata.participants;
  const participant = participants.find((p) => p.id.includes(senderNum));
  const isAdmin = participant?.admin === "admin" || participant?.admin === "superadmin";
  const isBot = botNumber === senderNum;

  if (!isAdmin && !isBot) {
    return await conn.sendMessage(
      chatId,
      { text: "❌ Solo los administradores del grupo o el subbot pueden usar este comando." },
      { quoted: msg }
    );
  }

  // 📊 Mostrar total de mensajes por usuario
  if (command === "totalmensajes") {
    let usuariosMensajes = participants
      .filter((user) => !user.id.includes(botNumber))
      .map((user) => ({
        id: user.id,
        mensajes: global.db.data.groupChats[chatId]?.[user.id]?.chat || 0,
      }));

    usuariosMensajes.sort((a, b) => b.mensajes - a.mensajes);

    let texto = `📊 *Total de Mensajes por Usuario en este Grupo* 📊\n\n`;
    texto += usuariosMensajes
      .map((u, i) => `${i + 1}. @${u.id.split("@")[0]} - *${u.mensajes}* mensajes`)
      .join("\n");

    return await conn.sendMessage(
      chatId,
      { text: texto, mentions: usuariosMensajes.map((u) => u.id) },
      { quoted: msg }
    );
  }

  // 🔄 Resetear el contador solo del grupo actual
  if (command === "resetmensaje") {
    participants.forEach((user) => {
      if (!global.db.data.groupChats[chatId]) global.db.data.groupChats[chatId] = {};
      global.db.data.groupChats[chatId][user.id] = { chat: 0 };
    });

    return await conn.sendMessage(
      chatId,
      { text: "✅ Conteo de mensajes reiniciado para todos los participantes de este grupo." },
      { quoted: msg }
    );
  }
};

handler.command = /^(totalmensajes|resetmensaje)$/i;
handler.admin = true;
handler.botAdmin = true;

export default handler;
