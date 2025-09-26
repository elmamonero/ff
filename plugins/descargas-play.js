import axios from 'axios';
import fs from 'fs';
import path from 'path';
import yts from 'yt-search';

const DL_API = 'https://delirius-apiofc.vercel.app/download/ytmp3?url=';

const handler = async (m, { conn, args }) => {
  if (!args[0]) return m.reply('Por favor, ingresa un nombre o URL de un video de YouTube');

  let url = args[0];
  const isUrl = /(youtube\.com|youtu\.be)/.test(url);

  if (!isUrl) {
    // Buscar video en YouTube si no es URL
    const searchResults = await yts(args.join(' '));
    if (!searchResults.videos.length) return m.reply('No se encontraron resultados para tu búsqueda');
    url = searchResults.videos[0].url;
  }

  try {
    await m.react('🕒');

    const dURL = `${DL_API}${encodeURIComponent(url)}`;
    // Verificar acceso al enlace antes de descargar
    const headCheck = await axios.head(dURL, { timeout: 10000 });
    if (headCheck.status >= 400) {
      throw new Error(`No se puede acceder al enlace de descarga. Status: ${headCheck.status}`);
    }

    // Solicitar descarga mp3 y metadata
    const { data } = await axios.get(dURL, { timeout: 30000 });

    if (!data.status || !data.data || !data.data.download || !data.data.download.url) {
      await m.react('✖️');
      return m.reply(`*✖️ Error:* No se pudo obtener el mp3`);
    }

    const { title, author, image, duration, download } = data.data;
    const { url: audioUrl, filename } = download;
    const fileName = filename || `${title}.mp3`;

    // Descargar archivo al servidor temporal
    const dest = path.join('/tmp', `${Date.now()}_${fileName.replace(/[\\/\s]/g, '_')}`);

    const response = await axios.get(audioUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': 'https://youtube.com',
      },
      responseType: 'stream',
    });
    const writer = fs.createWriteStream(dest);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    const toMMSS = ms => {
      const totalSec = Math.floor((+ms || 0) / 1000);
      const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
      const ss = String(totalSec % 60).padStart(2, '0');
      return `${mm}:${ss}`;
    };
    const mmss = toMMSS(duration * 1000);

    if (image) {
      await conn.sendMessage(m.chat, {
        image: { url: image },
        caption: `🎵 *${title}*\n👤 *${author}*\n⏳ *Duración:* ${mmss}\n\n📎 URL: ${url}\n\nDescarga MP3 desde YouTube`,
        footer: 'Pantheon Bot',
        contextInfo: {
          externalAdReply: {
            title,
            body: 'Descargar MP3 de YouTube',
            thumbnailUrl: image,
            mediaUrl: url,
          },
        },
      }, { quoted: m });
    }

    await conn.sendMessage(m.chat, {
      audio: fs.readFileSync(dest),
      mimetype: 'audio/mpeg',
      fileName,
    }, { quoted: m });

    fs.unlinkSync(dest);
    await m.react('✅');
  } catch (error) {
    console.error('Error al descargar MP3:', error);
    await m.react('✖️');
    await m.reply('⚠️ La descarga ha fallado, posible error en la API o video muy pesado.');
  }
};

handler.help = ['play <nombre|URL>'];
handler.command = ['play'];
handler.tags = ['descargas'];
export default handler;
