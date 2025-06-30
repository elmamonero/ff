import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const streamPipeline = promisify(pipeline);

const handler = async (msg, { conn, text }) => {
  const rawID = conn.user?.id || "";
  const subbotID = rawID.split(":")[0] + "@s.whatsapp.net";

  const prefixPath = path.resolve("prefixes.json");
  let prefixes = {};
  if (fs.existsSync(prefixPath)) {
    prefixes = JSON.parse(fs.readFileSync(prefixPath, "utf-8"));
  }

  const usedPrefix = prefixes[subbotID] || ".";

  if (!text || (!text.includes('youtube.com') && !text.includes('youtu.be'))) {
    console.log('⚠️ No se detectó un enlace válido de YouTube.');
    return await conn.sendMessage(msg.key.remoteJid, {
      text: `✳️ Usa el comando correctamente:\n\n📌 Ejemplo: *${usedPrefix}ytmp4doc* https://youtube.com/watch?v=...`
    }, { quoted: msg });
  }

  await conn.sendMessage(msg.key.remoteJid, {
    react: { text: '⏳', key: msg.key }
  });

  try {
    const qualities = ['720p', '480p', '360p'];
    let videoData = null;

    for (let quality of qualities) {
      try {
        const apiUrl = `https://api.neoxr.eu/api/youtube?url=${encodeURIComponent(text)}&type=video&quality=${quality}&apikey=russellxz`;
        console.log(`🔍 Intentando obtener video (${quality})...`);
        const response = await axios.get(apiUrl);
        console.log('📡 Respuesta de la API:', response.data);
        if (response.data?.status && response.data?.data?.url) {
          videoData = {
            url: response.data.data.url,
            title: response.data.title || 'video',
            thumbnail: response.data.thumbnail,
            duration: response.data.fduration,
            views: response.data.views,
            channel: response.data.channel,
            quality: response.data.data.quality || quality,
            size: response.data.data.size || 'Desconocido',
            publish: response.data.publish || 'Desconocido',
            id: response.data.id || ''
          };
          console.log('✅ Video encontrado:', videoData);
          break;
        }
      } catch (err) {
        console.error(`❌ Error en calidad ${quality}:`, err.message);
        continue;
      }
    }

    if (!videoData) {
      console.error('❌ No se pudo obtener el video en ninguna calidad');
      throw new Error('No se pudo obtener el video en ninguna calidad');
    }

    const tmpDir = path.join(__dirname, '../tmp');
    if (!fs.existsSync(tmpDir)) {
      console.log('📂 Creando directorio tmp...');
      fs.mkdirSync(tmpDir);
    }
    const filePath = path.join(tmpDir, `${Date.now()}_video.mp4`);
    console.log('📥 Descargando video a:', filePath);

    const response = await axios.get(videoData.url, {
      responseType: 'stream',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    await streamPipeline(response.data, fs.createWriteStream(filePath));
    console.log('✅ Video descargado correctamente.');

    const stats = fs.statSync(filePath);
    console.log('📊 Tamaño del archivo:', stats.size);
    if (!stats || stats.size < 100000) {
      console.error('❌ El video descargado está vacío o incompleto');
      fs.unlinkSync(filePath);
      throw new Error('El video descargado está vacío o incompleto');
    }

    const caption = `
╭────〔 *Azura Ultra Subbot* 〕────╮
│
├ 🎼 *Título:* ${videoData.title}
├ 🕒 *Duración:* ${videoData.duration}
├ 👁️ *Vistas:* ${videoData.views}
├ 👤 *Canal:* ${videoData.channel}
├ 🗓️ *Publicado:* ${videoData.publish}
├ 📦 *Tamaño:* ${videoData.size}
├ 📹 *Calidad:* ${videoData.quality}
└ 🔗 https://youtu.be/${videoData.id}
╰──────────────────────────────╯`;

    console.log('🔄 Enviando video al chat...');
    await conn.sendMessage(msg.key.remoteJid, {
      document: fs.readFileSync(filePath),
      mimetype: 'video/mp4',
      fileName: `${videoData.title}.mp4`,
      caption
    }, { quoted: msg });

    fs.unlinkSync(filePath);
    console.log('✅ Video enviado y archivo eliminado.');

    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: '✅', key: msg.key }
    });

  } catch (err) {
    console.error('❌ Error:', err);
    await conn.sendMessage(msg.key.remoteJid, {
      text: `❌ *Error:* ${err.message}`
    }, { quoted: msg });

    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: '❌', key: msg.key }
    });
  }
};

handler.command = ['testdoc'];
export default handler;
