import fetch from 'node-fetch';
import yts from 'yt-search';

const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) {
    return await m.reply(`*🎵 Por favor, ingresa el nombre o enlace de una canción.*\nEjemplo:\n${usedPrefix + command} https://open.spotify.com/track/5TFD2bmFKGhoCRbX61nXY5\nO solo texto:\n${usedPrefix + command} Ponte bonita - Cris mj`);
  }

  await m.react('⌛');

  try {
    let url = text.trim();
    const isSpotifyUrl = /^https?:\/\/open\.spotify\.com\/track\/[a-zA-Z0-9]+/.test(url);

    if (!isSpotifyUrl) {
      // Buscar en yt-search el primer video relacionado
      const searchResults = await yts(text);
      if (!searchResults.videos.length) throw new Error('No se encontraron resultados para tu búsqueda');
      url = searchResults.videos[0].url;
    }

    // Usar la API Delirius con URL (Spotify o YouTube)
    const apiUrl = `https://delirius-apiofc.vercel.app/download/spotifydl?url=${encodeURIComponent(url)}`;
    const response = await fetch(apiUrl);
    const json = await response.json();

    if (!json.status || !json.data || !json.data.url) {
      throw new Error('No se pudo obtener el audio desde la API.');
    }

    const { title, author, image, url: audioUrl } = json.data;

    if (image) {
      await conn.sendMessage(m.chat, {
        image: { url: image },
        caption: `🎵 *${title}*\n👤 *${author}*\n\n🔗 [Link](${url})`,
        footer: 'Delirius Spotify Downloader',
        parseMode: 'Markdown',
      }, { quoted: m });
    }

    await conn.sendMessage(m.chat, {
      audio: { url: audioUrl },
      mimetype: 'audio/mpeg',
      fileName: `${title} - ${author}.mp3`,
    }, { quoted: m });

    await m.react('✅');

  } catch (error) {
    console.error('Error al obtener audio:', error);
    await m.react('❌');
    await m.reply(`❌ Error al obtener el audio:\n${error.message}`);
  }
};

handler.help = ['spotify <url|texto>'];
handler.tags = ['descargas'];
handler.command = ['spotify', 'spotifydl', 'spdl'];

export default handler;
