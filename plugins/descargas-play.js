import axios from 'axios';
import fs from 'fs';
import path from 'path';
import yts from 'yt-search';

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

    const { data } = await axios.get('https://delirius-apiofc.vercel.app/download/ytmp3', {
      params: { url },
    });

    if (!data || !data.status || !data.data?.download?.url) {
      await m.react('✖️');
      return m.reply(`*✖️ Error:* No se pudo obtener el MP3`);
    }

    const {
      title,
      image: thumbnail,
      download: { url: audioUrl, filename },
    } = data.data;

    const fileName = filename || `${title || 'audio'}.mp3`;
    const dest = path.join('/tmp', `${Date.now()}_${fileName.replace(/[\\/\s]/g, '_')}`);

    // Intentar descargar el archivo MP3
    let downloaded = false;
    try {
      const response = await axios.get(audioUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://youtube.com',
          'Connection': 'keep-alive',
        },
        responseType: 'stream',
      });

      const writer = fs.createWriteStream(dest);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      downloaded = true;
    } catch (err) {
      console.warn('⚠️ No se pudo descargar automáticamente el MP3. Enviando enlace directo.');
    }

    if (thumbnail) {
      await conn.sendMessage(m.chat, {
        image: { url: thumbnail },
        caption: `🎵 *${title}*\n\n📎 URL: ${url}\n\n${
          downloaded
            ? 'MP3 descargado automáticamente.'
            : `No se pudo descargar automáticamente.\n🔗 Descárgalo manualmente aquí:\n${audioUrl}`
        }`,
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

    if (downloaded) {
      await conn.sendMessage(m.chat, {
        audio: fs.readFileSync(dest),
        mimetype: 'audio/mpeg',
        fileName,
      }, { quoted: m });

      fs.unlinkSync(dest);
    }

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
