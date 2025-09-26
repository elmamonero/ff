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

    // Petición POST a la API de Sylphy enviando URL en el body
    const { data } = await axios.post('https://api.sylphy.xyz/download/ytmp3', { url });

    if (!data.status) {
      await m.react('✖️');
      return m.reply(`*✖️ Error:* ${data.mensaje || 'No se pudo obtener el mp3'}`);
    }

    // Ajusta estos campos según la respuesta real de la API
    const audioUrl = data.result?.url || data.downloadUrl || data.url;
    const title = data.result?.title || 'audio';
    const fileName = `${title}.mp3`;
    const thumbnail = data.result?.thumbnail || null;

    if (!audioUrl) {
      await m.react('✖️');
      return m.reply('*✖️ Error:* No se pudo obtener el enlace de descarga del MP3');
    }

    // Descargar audio a archivo temporal
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

    // Enviar imagen y metadatos si hay thumbnail
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

    // Enviar audio descargado
    await conn.sendMessage(m.chat, {
      audio: fs.readFileSync(dest),
      mimetype: 'audio/mpeg',
      fileName,
    }, { quoted: m });

    fs.unlinkSync(dest);
    await m.react('✅');
  } catch (e) {
    console.error('Error al descargar MP3:', e, e.response?.data);
    await m.react('✖️');
    m.reply('⚠️ La descarga ha fallado, posible error en la API o video muy pesado.');
  }
};

handler.help = ['play <nombre|URL>'];
handler.command = ['play'];
handler.tags = ['descargas'];
export default handler;
