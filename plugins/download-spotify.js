import fetch from 'node-fetch';

const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) {
    await m.reply(`*🎵 Por favor, ingresa un enlace de Spotify válido.*\n> *Ejemplo:* ${usedPrefix + command} https://open.spotify.com/track/3k68kVFWTTBP0Jb4LOzCax`);
    return;
  }

  await m.react('⌛');

  try {
    // Llamada a la API de Vreden con el parámetro url
    const apiURL = `https://api.vreden.my.id/api/v1/download/spotify?url=${encodeURIComponent(text)}`;
    const response = await fetch(apiURL);
    const data = await response.json();

    if (!data.status || !data.result || !data.result.downloadUrl) {
      throw new Error(data.message || 'No se pudo obtener el audio desde Spotify');
    }

    const { title, thumbnail, downloadUrl } = data.result;

    // Enviar imagen y metadatos (miniatura y título)
    if (thumbnail) {
      await conn.sendMessage(m.chat, {
        image: { url: thumbnail },
        caption: `🎵 *${title}*\n\n🔗 Enlace Spotify: ${text}`,
        footer: 'Vreden API - Spotify Downloader',
      }, { quoted: m });
    }

    // Enviar audio descargado desde la URL devuelta
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
