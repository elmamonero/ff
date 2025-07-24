const commandHandler = async (msg, { conn }) => {
  const chatId = msg.key.remoteJid;
  const senderJid = msg.key.participant || msg.key.remoteJid;
  
  if (!chatId.endsWith("@g.us")) {
    return await conn.sendMessage(chatId, { text: "⚠️ Este comando solo funciona en grupos." }, { quoted: msg });
  }

  const metadata = await conn.groupMetadata(chatId);
  const participants = metadata.participants;

  const rawID = conn.user?.id || "";
  const botNumber = rawID.split(":")[0].replace(/[^0-9]/g, "");

  // Parsear comando como antes (suponiendo prefijo '.')
  const body = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || "").toLowerCase();
  const command = body.startsWith(".") ? body.slice(1).split(" ")[0] : "";

  if (command === "totalmensajes") {
    let usuariosMensajes = participants
      .filter((p) => !p.id.includes(botNumber))
      .map((user) => ({
        id: user.id,
        mensajes: global.db.data.groupChats[chatId]?.[user.id]?.chat || 0,
      }));
    usuariosMensajes.sort((a,b) => b.mensajes - a.mensajes);
    let texto = `📊 *Total de Mensajes por Usuario* 📊\n\n`;
    texto += usuariosMensajes.map((u,i) => `${i+1}. @${u.id.split("@")[0]} - *${u.mensajes}* mensajes`).join("\n");
    return await conn.sendMessage(chatId, { text: texto, mentions: usuariosMensajes.map(u => u.id) }, { quoted: msg });
  }

  if (command === "resetmensaje") {
    const participant = participants.find((p) => p.id === senderJid);
    const isAdmin = participant?.admin === "admin" || participant?.admin === "superadmin";
    if (!isAdmin) {
      return await conn.sendMessage(chatId, { text: "❌ Solo administradores pueden usar este comando." }, { quoted: msg });
    }
    // Resetear
    participants.forEach(user => {
      if (!global.db.data.groupChats[chatId]) global.db.data.groupChats[chatId] = {};
      global.db.data.groupChats[chatId][user.id] = { chat: 0 };
    });
    return await conn.sendMessage(chatId, { text: "✅ Contador reseteado." }, { quoted: msg });
  }
};

commandHandler.command = /^(totalmensajes|resetmensaje)$/i;
export default commandHandler;
