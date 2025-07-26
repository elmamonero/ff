import fs from "fs";
import path from "path";

const conteoPath = path.resolve("./conteo.js");

const handler = async (msg, { conn, args }) => {
  const rawID = conn.user?.id || "";
  const subbotID = rawID.split(":")[0] + "@s.whatsapp.net";
  const botNumber = rawID.split(":")[0].replace(/[^0-9]/g, "");

  const chatId = msg.key.remoteJid;
  const senderJid = msg.key.participant || msg.key.remoteJid;
  const senderNum = senderJid.replace(/[^0-9]/g, "");
  const senderTag = `@${senderNum}`;

  if (!chatId.endsWith("@g.us")) {
    return await conn.sendMessage(
      chatId,
      { text: "❌ Este comando solo puede usarse en grupos." },
      { quoted: msg }
    );
  }

  const metadata = await conn.groupMetadata(chatId);
  const participants = metadata.participants;
  const memberCount = participants.length;

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

  // Cargar datos del conteo de mensajes
  const conteoData = fs.existsSync(conteoPath)
    ? JSON.parse(fs.readFileSync(conteoPath, "utf-8"))
    : {};

  // El primer argumento definiráa la acción: resetmensaje o totalmensaje
  const accion = (args[0] || "").toLowerCase();

  if (accion === "resetmensaje") {
    if (conteoData[chatId]) {
      delete conteoData[chatId];
      fs.writeFileSync(conteoPath, JSON.stringify(conteoData, null, 2));
    }
    return await conn.sendMessage(
      chatId,
      { text: "♻️ *Conteo de mensajes reiniciado para este grupo.*" },
      { quoted: msg }
    );
  }

  // Mostrar top 10 usuarios con más mensajes
  const groupData = conteoData[chatId];

  if (!groupData || Object.keys(groupData).length === 0) {
    return await conn.sendMessage(
      chatId,
      { text: "⚠️ No hay datos de mensajes todavía en este grupo." },
      { quoted: msg }
    );
  }

  const usuariosOrdenados = Object.entries(groupData)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  if (usuariosOrdenados.length === 0) {
    return await conn.sendMessage(
      chatId,
      { text: "⚠️ Aún no hay mensajes contados en este grupo." },
      { quoted: msg }
    );
  }

  let texto = `🏆 *Top 10 usuarios más activos en ${metadata.subject || "este grupo"}:*\n\n`;
  const menciones = [];

  usuariosOrdenados.forEach(([userId, total], index) => {
    const num = userId.split("@")[0];
    texto += `${index + 1}.- @${num} ➤ ${total} mensajes\n`;
    if (!menciones.includes(userId)) menciones.push(userId);
  });

  await conn.sendMessage(
    chatId,
    {
      text: texto,
      mentions: menciones
    },
    { quoted: msg }
  );
};

handler.command = /^totalmensaje|resetmensaje$/i;
export default handler;
