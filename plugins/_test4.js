import yts from 'yt-search';
import fetch from 'node-fetch';
import { prepareWAMessageMedia, generateWAMessageFromContent } from '@whiskeysockets/baileys';

const club = '🤖 MiBot - Club Oficial';

const handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!args[0]) {
    return conn.reply(
      m.chat,
      `*Por favor, ingresa un título de YouTube o Spotify.*\n> *\`Ejemplo:\`* ${usedPrefix + command} Corazón Serrano - Olvídalo Corazón`,
      m
    );
  }

  await m.react('🕒');
  try {
    const query = args.join(" ");
    const searchResults = await searchVideos(query);
    const spotifyResults = await searchSpotify(query);

    if (!searchResults.length && !spotifyResults.length) {
      throw new Error('*✖️ No se encontraron resultados.*');
    }

    const video = searchResults[0];

    let thumbnail;
    try {
      const res = await fetch(video.miniatura);
      thumbnail = await res.buffer();
    } catch {
      const res = await fetch('https://telegra.ph/file/36f2a1bd2aaf902e4d1ff.jpg');
      thumbnail = await res.buffer();
    }

    let messageText = `\`\`\`◜YouTube - Download◞\`\`\`\n\n`;
    messageText += `*${video.titulo}*\n\n`;
    messageText += `≡ *⏳ Duración* ${video.duracion || 'No disponible'}\n`;
    messageText += `≡ *🌴 Autor* ${video.canal || 'Desconocido'}\n`;
    messageText += `≡ *🌵 Url* ${video.url}\n`;

    const unifiedSections = [];

    if (searchResults.length > 1) {
      const ytRows = searchResults.slice(1, 11).flatMap((v, index) => ([
        {
          title: `${index + 1}┃ ${v.titulo} (MP3)`,
          description: `Descargar audio - Duración: ${v.duracion}`,
          id: `${usedPrefix}ytmp3 ${v.url}`
        },
        {
          title: `${index + 1}┃ ${v.titulo} (MP4)`,
          description: `Descargar video - Duración: ${v.duracion}`,
          id: `${usedPrefix}ytmp4 ${v.url}`
        }
      ]));
      unifiedSections.push({ title: '📺 YouTube - Resultados', rows: ytRows });
    }

    if (spotifyResults.length > 0) {
      const spRows = spotifyResults.map((s, i) => ({
        title: `${i + 1}┃ ${s.titulo}`,
        description: `Duración: ${s.duracion || 'No disponible'}`,
        id: `${usedPrefix}spotify ${s.url}`
      }));
      unifiedSections.push({ title: '🎧 Spotify - Resultados', rows: spRows });
    }

    await conn.sendMessage(m.chat, {
      image: thumbnail,
      caption: messageText,
      footer: club,
      contextInfo: {
        mentionedJid: [m.sender],
        forwardingScore: 999,
        isForwarded: true
      },
      buttons: [
        {
          buttonId: `${usedPrefix}ytmp3 ${video.url}`,
          buttonText: { displayText: '𝖠𝗎𝖽𝗂𝗈 🎧' },
          type: 1,
        },
        {
          buttonId: `${usedPrefix}ytmp4 ${video.url}`,
          buttonText: { displayText: '𝖵𝗂𝖽𝖾𝗈 📹' },
          type: 1,
        }
      ],
      ...(unifiedSections.length > 0 ? {
        headerType: 1,
        viewOnce: true,
        nativeFlowInfo: {
          name: 'single_select',
          paramsJson: JSON.stringify({
            title: 'Resultados YouTube & Spotify',
            sections: unifiedSections,
          }),
        },
        type: 4,
      } : {})
    }, { quoted: m });

    await m.react('✅');
  } catch (e) {
    console.error(e);
    await m.react('✖️');
    conn.reply(m.chat, '*`Error al procesar tu solicitud.`*\n' + e.message, m);
  }
};

handler.help = ['play <texto>'];
handler.tags = ['dl'];
handler.command = ['play'];
export default handler;

async function searchVideos(query) {
  try {
    const res = await yts(query);
    return res.videos.slice(0, 10).map(video => ({
      titulo: video.title,
      url: video.url,
      miniatura: video.thumbnail,
      canal: video.author.name,
      publicado: video.timestamp || 'No disponible',
      vistas: video.views || 'No disponible',
      duracion: video.duration?.timestamp || 'No disponible'
    }));
  } catch (error) {
    console.error('[YouTube] Error:', error.message);
    return [];
  }
}

async function searchSpotify(query) {
  try {
    const res = await fetch(`https://delirius-apiofc.vercel.app/search/spotify?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (!data || !Array.isArray(data.data)) return [];
    return data.data.slice(0, 10).map(track => ({
      titulo: track.title,
      url: track.url,
      duracion: track.duration || 'No disponible'
    }));
  } catch (error) {
    console.error('[Spotify] Error:', error.message);
    return [];
  }
}
