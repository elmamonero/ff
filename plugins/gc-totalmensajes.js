import path from "path";
import fs from "fs";

const conteoPath = path.resolve("./conteo.js");

// Función para leer datos desde el archivo .js como módulo
async function leerConteo() {
  // Para evitar cache:
  const datos = await import(conteoPath + "?update=" + Date.now());
  return datos.default || {};
}

// Función para guardar datos en el archivo .js
function guardarConteo(data) {
  const contenido = "export default " + JSON.stringify(data, null, 2) + ";\n";
  fs.writeFileSync(conteoPath, contenido);
}

const handler = async (msg, { conn, args }) => {
  const rawID = conn.user?.id || "";
  const botNumber = rawID.split(":")[0].replace(/[^0-9]/g, "");
  const chatId = msg.key.remoteJid;
  const senderJid = msg.key.participant || msg.key.remoteJid;
  const senderNum = senderJid.replace(/[^0-9]/g, "");

  // Solo en grupos
  if (!chatId.endsWith("@g.us")) {
    return await conn.sendMessage(chatId, { text: "❌ Este comando solo puede usarse en grupos." }, { quoted: msg });
  }

  const metadata = await conn.groupMetadata(chatId);
  const participants = metadata.participants || [];

  const participant = participants.find((p) => p.id.includes(senderNum));
  const isAdmin = participant?.admin === "admin" || participant?.admin === "superadmin";
  const isBot = botNumber === senderNum;

  if (!isAdmin && !isBot) {
    return await conn.sendMessage(chatId, { text: "❌ Solo los administradores o el bot pueden usar este comando." }, { quoted: msg });
  }

  const accion = (args[0] || "").toLowerCase();

  // Leer conteo (usando la función con import dinámico)
  const conteoData = await leerConteo();

  if (accion === "resetmensaje") {
    if (conteoData[chatId]) {
      delete conteoData[chatId];
      guardarConteo(conteoData);
      return await conn.sendMessage(chatId, { text: "♻️ *Conteo de mensajes reiniciado para este grupo.*" }, { quoted: msg });
    } else {
      return await conn.sendMessage(chatId, { text: "⚠️ No hay conteo para reiniciar en este grupo." }, { quoted: msg });
    }
  }

  const groupData = conteoData[chatId];
  if (!groupData || Object.keys(groupData).length === 0) {
    return await conn.sendMessage(chatId, { text: "⚠️ No hay datos de mensajes todavía en este grupo." }, { quoted: msg });
  }

  const usuariosOrdenados = Object.entries(groupData)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  let texto = `🏆 *Top 10 usuarios más activos en ${metadata.subject || "este grupo"}:*\n\n`;
  const menciones = [];

  usuariosOrdenados.forEach(([userId, total], index) => {
    const num = userId.split("@")[0];
    texto += `${index + 1}.- @${num} ➤ ${total} mensajes\n`;
    if (!menciones.includes(userId)) menciones.push(userId);
  });

  await conn.sendMessage(chatId, { text: texto, mentions: menciones }, { quoted: msg });
};

handler.command = /^totalmensaje|resetmensaje$/i;
export default handler;
