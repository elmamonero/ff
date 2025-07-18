import axios from 'axios';
import fs from 'fs';
import path from 'path';

const handler = async (m, { conn, args }) => {
  if (!args[0]) return m.reply('Por favor, ingresa una URL de un video o audio de YouTube');
  const url = args[0];

  if (!/(youtube\.com|youtu\.be)/.test(url))
    return m.reply("⚠️ Ingresa un link válido de YouTube.");

  try {
    await m.react('🕒');
    // 1. Pedir los datos a la API de Vreden
    const { data } = await axios.get(`https://api.vreden.my.id/api/ytmp3?url=${encodeURIComponent(url)}`);

    if (!data.result?.download?.status) {
      await m.react('✖️');
      return m.reply("*✖️ Error:* No se pudo obtener el mp3");
    }

    // 2. Extraer información relevante
    const title = data.result.metadata.title || "audio";
    const audioUrl = data.result.download.url;
    const fileName = data.result.download.filename || `${title}.mp3`;
    const thumbnail = data.result.metadata.thumbnail || data.result.metadata.image;

    // 3. Descargar el archivo MP3 a un archivo temporal
    const dest = path.join('/tmp', `${Date.now()}_${fileName.replace(/[\\/\s]/g, '_')}`);
    const response = await axios.get(audioUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': 'https://youtube.com'
      },
      responseType: 'stream'
    });
    const writer = fs.createWriteStream(dest);
    response.data.pipe(writer);

    // 4. Esperar a que termine de guardarse
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // 5. Enviar el MP3 al chat
    await conn.sendMessage(m.chat, {
      audio: fs.readFileSync(dest),
      mimetype: 'audio/mpeg',
      fileName,
      contextInfo: {
        externalAdReply: {
          title,
          body: "Descargar MP3 de YouTube",
          thumbnailUrl: thumbnail,
          mediaUrl: url
        }
      }
    }, { quoted: m });

    // 6. Limpiar archivo temporal
    fs.unlinkSync(dest);

    await m.react('✅');
  } catch (e) {
    console.error('Error al descargar MP3:', e, e.response?.data);
    await m.react('✖️');
    m.reply("⚠️ La descarga ha fallado, posible error en la API o el video es muy pesado.");
  }
};

handler.help = ['ytmp3'];
handler.command = ['ytmp3'];
handler.tags = ['download'];

export default handler;
