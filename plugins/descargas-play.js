import axios from 'axios';
import fs from 'fs';
import path from 'path';
import yts from 'yt-search';

const NEOXR_API = 'https://api.neoxr.eu/api/youtube';
const API_KEY = 'F0svKu'; // Tu clave de Neoxr

const handler = async (m, { conn, args }) => {
  if (!args[0]) return m.reply('Por favor, ingresa un nombre o URL de un video de YouTube');

  let url = args[0];
  const isUrl = /(youtube\.com|youtu\.be)/.test(url);

  if (!isUrl) {
    const searchResults = await yts(args.join(' '));
    if (!searchResults.videos.length) {
      return m.reply('No se encontraron resultados para tu búsqueda');
    }
    url = searchResults.videos[0].url;
  }

  try {
    await m.react('🕒');

    const { data } = await axios.get(NEOXR_API, {
      params: {
        url,
        type: 'audio',
        quality: '128kbps',
        apikey: API_KEY,
      },
    });

    if (!data || !data.status || !data.result?.url) {
      await m.react('✖️');
      return m.reply(`*✖️ Error:* No se pudo obtener el MP3`);
    }

    const {
      title,
      thumbnail,
      url: audioUrl,
      filename,
    } = data.result;

    const fileName = filename || `${title || 'audio'}.mp3`;
    const dest = path.join('/tmp', `${Date.now()}_${fileName.replace(/[\\/\s]/g, '_')}`);

    const response = await axios.get(audioUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
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

    if (thumbnail) {
      await conn.sendMessage(m.chat, {
        image: { url: thumbnail },
        caption: `🎵 *${title}*\n\n📎 URL: ${url}\n\nDescarga MP3 desde YouTube`,
        footer: 'Pantheon Bot',
        contextInfo: {
          externalAdReply: {
            title,
            body: 'Descargar MP3 de YouTube',
            thumbnailUrl: thumbnail,
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
    m.reply('⚠️ La descarga ha fallado, posible error en la API o video muy pesado.');
  }
};

handler.help = ['play <nombre|URL>'];
handler.command = ['play'];
handler.tags = ['descargas'];
export default handler;
