const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const handler = async (msg, { conn, command }) => {
  const chatId = msg.key.remoteJid;
  const pref = global.prefixes?.[0] || ".";

  // Obtener mensaje citado
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

  if (!quoted) {
    return conn.sendMessage(chatId, {
      text: `✳️ *Usa:*\n${pref}${command}\n📌 Responde a una imagen, video, sticker o audio para subirlo.`
    }, { quoted: msg });
  }

  // React con nube para mostrar que se inició la subida
  await conn.sendMessage(chatId, {
    react: { text: '☁️', key: msg.key }
  });

  try {
    // Detectar tipo de media en el mensaje citado
    let typeDetected = null;
    let mediaMessage = null;

    if (quoted.imageMessage) {
      typeDetected = 'image';
      mediaMessage = quoted.imageMessage;
    } else if (quoted.videoMessage) {
      typeDetected = 'video';
      mediaMessage = quoted.videoMessage;
    } else if (quoted.stickerMessage) {
      typeDetected = 'sticker';
      mediaMessage = quoted.stickerMessage;
    } else if (quoted.audioMessage) {
      typeDetected = 'audio';
      mediaMessage = quoted.audioMessage;
    } else {
      throw new Error("❌ Solo se permiten imágenes, videos, stickers o audios.");
    }

    // Directorio temporal para almacenar los archivos
    const tmpDir = path.join(__dirname, 'tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

    // Extensión base para guardar archivo
    const rawExt = typeDetected === 'sticker' ? 'webp' :
      mediaMessage.mimetype ? mediaMessage.mimetype.split('/')[1].split(';')[0] : 'bin';

    const rawPath = path.join(tmpDir, `${Date.now()}_input.${rawExt}`);

    // Descargar media y guardar en archivo temporal
    const stream = await downloadContentFromMessage(mediaMessage, typeDetected === 'sticker' ? 'sticker' : typeDetected);
    const writeStream = fs.createWriteStream(rawPath);
    for await (const chunk of stream) writeStream.write(chunk);
    writeStream.end();
    await new Promise(resolve => writeStream.on('finish', resolve));

    // Verificar tamaño máximo de 200MB
    const stats = fs.statSync(rawPath);
    if (stats.size > 200 * 1024 * 1024) {
      fs.unlinkSync(rawPath);
      throw new Error('⚠️ El archivo excede el límite de 200MB.');
    }

    let finalPath = rawPath;

    // Convertir formatos de audio especificados a mp3 para compatibilidad
    if (typeDetected === 'audio' && ['ogg', 'm4a', 'mpeg'].includes(rawExt)) {
      finalPath = path.join(tmpDir, `${Date.now()}_converted.mp3`);
      await new Promise((resolve, reject) => {
        ffmpeg(rawPath)
          .audioCodec('libmp3lame')
          .toFormat('mp3')
          .on('end', resolve)
          .on('error', reject)
          .save(finalPath);
      });
      // Borrar archivo original tras conversión
      fs.unlinkSync(rawPath);
    }

    // Preparar formulario con FormData para axios
    const form = new FormData();
    form.append('file', fs.createReadStream(finalPath));

    // Enviar POST al upload.php
    const res = await axios.post('https://cdn.russellxz.click/upload.php', form, {
      headers: form.getHeaders()
    });

    // Borrar archivo final temporal
    fs.unlinkSync(finalPath);

    // Validar la respuesta: se asume que la API responde con JSON { url: "link" }
    let url = null;
    if (res.data) {
      if (typeof res.data === 'string') {
        // Intentar parsear JSON si es string
        try {
          const json = JSON.parse(res.data);
          url = json.url || res.data;
        } catch {
          url = res.data;
        }
      } else if (res.data.url) {
        url = res.data.url;
      }
    }

    if (!url) throw new Error('❌ No se pudo obtener el link del archivo subido.');

    // Enviar mensaje con link
    await conn.sendMessage(chatId, {
      text: `✅ *Archivo subido exitosamente:*\n${url}`
    }, { quoted: msg });

    // React con check para indicar éxito
    await conn.sendMessage(chatId, {
      react: { text: '✅', key: msg.key }
    });

  } catch (err) {
    console.error("❌ Error en handler de subida:", err);
    await conn.sendMessage(chatId, {
      text: `❌ *Error:* ${err.message}`
    }, { quoted: msg });

    await conn.sendMessage(chatId, {
      react: { text: '❌', key: msg.key }
    });
  }
};

handler.command = ['tourl2'];
handler.help = ['tourl'];
handler.tags = ['herramientas'];
handler.register = true;

module.exports = handler;
