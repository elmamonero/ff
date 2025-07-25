🧩 Código del comando *totalmensaje*:

```js
const fs = require("fs");
const path = require("path");

const conteoPath = path.resolve("./conteo.json");

const handler = async (msg, { conn, command }) => {
  const chatId = msg.key.remoteJid;
  const isGroup = chatId.endsWith("@g.us");

  if (!isGroup) {
    return await conn.sendMessage(chatId, {
      text: "❌ Este comando solo puede usarse en grupos."
    }, { quoted: msg });
  }

  // Si no existe el archivo, lo crea vacío
  const conteoData = fs.existsSync(conteoPath)
    ? JSON.parse(fs.readFileSync(conteoPath, "utf-8"))
    : {};

  // === RESET DE MENSAJES ===
  if (command === "resetmensaje") {
    if (conteoData[chatId]) {
      delete conteoData[chatId];
      fs.writeFileSync(conteoPath, JSON.stringify(conteoData, null, 2));
    }

    return await conn.sendMessage(chatId, {
      text: "♻️ *Conteo de mensajes reiniciado para este grupo.*"
    }, { quoted: msg });
  }

  // === TOTAL MENSAJES / TOP 10 ===
  const groupData = conteoData[chatId];

  if (!groupData || Object.keys(groupData).length === 0) {
    return await conn.sendMessage(chatId, {
      text: "⚠️ No hay datos de mensajes todavía en este grupo."
    }, { quoted: msg });
  }

  const metadata = await conn.groupMetadata(chatId);
  const groupName = metadata.subject || "Grupo";

  const usuariosOrdenados = Object.entries(groupData)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  if (usuariosOrdenados.length === 0) {
    return await conn.sendMessage(chatId, {
      text: "⚠️ Aún no hay mensajes contados en este grupo."
    }, { quoted: msg });
  }

  let texto = `🏆 *Top 10 usuarios más activos en ${groupName}:*\n\n`;
  const menciones = [];

  usuariosOrdenados.forEach(([userId, total], index) => {
    const num = userId.split("@")[0];
    texto += `${index + 1}.- @${num} ➤ ${total} mensajes\n`;
    if (!menciones.includes(userId)) menciones.push(userId);
  });

  await conn.sendMessage(chatId, {
    text: texto,
    mentions: menciones
  }, { quoted: msg });
};

handler.command = ["totalmensaje", "resetmensaje"];
module.exports = handler;
```
