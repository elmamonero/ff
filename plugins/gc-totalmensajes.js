import fs from "fs";
import path from "path";

const handler = async (msg, { conn, args }) => {
  const chatId = msg.key.remoteJid;
  const senderJid = msg.key.participant || msg.key.remoteJid;

  const rawID = conn.user?.id || "";
  const subbotID = rawID.split(":")[0] + "@s.whatsapp.net";
  const botNumber = rawID.split(":")[0].replace(/[^0-9]/g, "");
  const senderNum = senderJid.replace(/[^0-9]/g, "");

  // Leer prefijos (por si hay varios bots con distinto prefijo)
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

  // ✅ Conteo automático por usuario y grupo: aplica a TODO tipo de mensaje recibido en grupos
  if (chatId.endsWith("@g.us")) {
    if (!global.db.data.groupChats) global.db.data.groupChats = {};
    if (!global.db.data.groupChats[chatId]) global.db.data.groupChats[chatId] = {};
    if (!global.db.data.groupChats[chatId][senderJid] == null) global.db.data.groupChats[chatId][senderJid] = { chat: 0 };
    global.db.data.groupChats[chatId][senderJid].chat += 1;
  }

  // Si no es comando, no hacer nada más
  if (!command) return;

  // El comando solo funciona en grupos
  if (!chatId.endsWith("@g.us")) {
    return await conn.sendMessage(
      chatId,
      { text: "⚠️ *Este comando solo se puede usar en grupos.*" },
      { quoted: msg }
    );
  }

  const metadata = await conn.groupMetadata(chatId);
  const participants = metadata.participants;

  // Eliminar restricción de admin para ver el total de mensajes
  // Si quieres hacer otros comandos solo para admins, puedes agregar chequeo aquí.

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

  // 🔄 Resetear el contador solo del grupo actual — este comando sigue solo para admins
  if (command === "resetmensaje") {
    // Chequeo que sea admin para resetear
    const participant = participants.find((p) => p.id === senderJid);
    const isAdmin = participant?.admin === "admin" || participant?.admin === "superadmin";
    if (!isAdmin) {
      return await conn.sendMessage(
        chatId,
        { text: "❌ Solo los administradores del grupo pueden usar este comando." },
        { quoted: msg }
      );
    }

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
// Quité handler.admin y handler.botAdmin para que cualquiera pueda usar .totalmensajes
// Pero resetmensaje sigue protegido con chequeo manual en el código

export default handler;
