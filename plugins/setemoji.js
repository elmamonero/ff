import fs from "fs";
import path from "path";

const emojisPath = path.resolve("./emojigrupo.js");

async function leerEmojisGrupo() {
  try {
    const datos = await import(emojisPath + "?update=" + Date.now());
    return datos.default || {};
  } catch {
    return {};
  }
}

function guardarEmojisGrupo(data) {
  const contenido = "export default " + JSON.stringify(data, null, 2) + ";\n";
  fs.writeFileSync(emojisPath, contenido);
}

const handler = async (msg, { conn, args }) => {
  const chatId = msg.key.remoteJid;
  const senderJid = msg.key.participant || msg.key.remoteJid;

  if (!chatId.endsWith("@g.us")) {
    return await conn.sendMessage(
      chatId,
      { text: "❌ Este comando solo puede usarse en grupos." },
      { quoted: msg }
    );
  }

  // Verificar si el usuario es admin
  const metadata = await conn.groupMetadata(chatId);
  const participant = metadata.participants.find(p => p.id === senderJid);
  const isAdmin = participant?.admin === "admin" || participant?.admin === "superadmin";

  if (!isAdmin) {
    return await conn.sendMessage(
      chatId,
      { text: "❌ Solo los administradores pueden cambiar el emoji del grupo." },
      { quoted: msg }
    );
  }

  if (!args.length) {
    return await conn.sendMessage(
      chatId,
      { text: "❗️ Usa el comando seguido del emoji para el grupo. Ejemplo: `.setemoji 😎`" },
      { quoted: msg }
    );
  }

  const emoji = args[0];

  let datos = await leerEmojisGrupo();
  datos[chatId] = emoji;
  guardarEmojisGrupo(datos);

  await conn.sendMessage(
    chatId,
    { text: `✅ Emoji del grupo cambiado a: ${emoji}` },
    { quoted: msg }
  );
};

handler.command = /^setemoji$/i;

export default handler;
