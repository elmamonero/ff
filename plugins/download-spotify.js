import fetch from 'node-fetch';

const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) {
    await m.reply(`*🎵 Por favor, ingresa un enlace válido de Spotify.*\nEjemplo:\n${usedPrefix + command} https://open.spotify.com/track/5TFD2bmFKGhoCRbX61nXY5`);
    return;
  }

  await m.react('⌛');

  try {
    const apiUrl = `https://delirius-apiofc.vercel.app/download/spotifydl?url=${encodeURIComponent(text.trim())}`;
    const response = await fetch(apiUrl);
    const json = await response.json();

    console.log('Respuesta API:', json); // debug

    if (!json.status || !json.data || !json.data.url) {
      throw new Error('No se pudo obtener el audio desde la API.');
    }

    const { title, author, image, url: audioUrl } = json.data;

    if (image) {
      await conn.sendMessage(m.chat, {
        image: { url: image },
        caption: `🎵 *${title}*\n👤 *${author}*\n\n🔗 [Spotify link](${text.trim()})`,
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

handler.help = ['spotify <url>'];
handler.tags = ['descargas'];
handler.command = ['spotify', 'spotifydl', 'spdl'];

export default handler;
