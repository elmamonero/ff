import fetch from 'node-fetch';
import yts from 'yt-search';

const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) {
    await m.reply(`*🎵 Por favor, ingresa el enlace o nombre de una canción de Spotify.*\n> *Ejemplo:* ${usedPrefix + command} https://open.spotify.com/track/3k68kVFWTTBP0Jb4LOzCax\nO también:*\n> ${usedPrefix + command} Ponte bonita - Cris mj`);
    return;
  }

  await m.react('⌛');

  try {
    let url = text.trim();
    const isSpotifyUrl = /^https?:\/\/open\.spotify\.com\/track\/[a-zA-Z0-9]+/.test(url);

    if (!isSpotifyUrl) {
      // Si no es URL, buscar en YouTube para obtener posible URL de Spotify
      const searchResults = await yts(text);
      if (!searchResults.videos.length) throw new Error('No se encontraron resultados para tu búsqueda.');
      // Opcional: Tomar el primer video y usarlo para búsqueda Spotify
      // Pero la API Vreden no soporta búsqueda por nombre directo, solo URL
      return m.reply('❌ Debes ingresar un enlace de Spotify válido para esta función.');
    }

    // Petición a API Vreden solo con URL válida
    const apiUrl = `https://api.vreden.my.id/api/v1/download/spotify?url=${encodeURIComponent(url)}`;
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!data.status || !data.result || !data.result.downloadUrl) {
      throw new Error(data.message || 'No se pudo obtener el audio desde Spotify.');
    }

    const { title, thumbnail, downloadUrl } = data.result;

    if (thumbnail) {
      await conn.sendMessage(m.chat, {
        image: { url: thumbnail },
        caption: `🎵 *${title}*\n\n🔗 [Spotify](${url})`,
        footer: 'Vreden API - Spotify Downloader',
        parseMode: 'Markdown'
      }, { quoted: m });
    }

    await conn.sendMessage(m.chat, {
      audio: { url: downloadUrl },
      mimetype: 'audio/mpeg',
      fileName: `${title}.mp3`
    }, { quoted: m });

    await m.react('✅');

  } catch (error) {
    console.error('Error al descargar audio de Spotify:', error);
    await m.react('❌');
    await m.reply(`❌ Error al obtener el audio:\n${error.message}`);
  }
};

handler.help = ['spotify <url>'];
handler.tags = ['descargas'];
handler.command = ['spotify', 'spotifydl', 'spdl'];

export default handler;
