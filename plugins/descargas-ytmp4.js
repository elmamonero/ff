import fetch from 'node-fetch';
import yts from 'yt-search';

const youtubeRegexID = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/;

const botname = "Pantheon Bot"; // Pon aquí el nombre de tu bot
const dev = "RukiXzy & El Bicho Man"; // Cambia según autor

function formatViews(views) {
  if (views === undefined) return "No disponible";
  if (views >= 1_000_000_000) return `${(views / 1_000_000_000).toFixed(1)}B (${views.toLocaleString()})`;
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M (${views.toLocaleString()})`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}k (${views.toLocaleString()})`;
  return views.toString();
}

const handler = async (m, { conn, text = '', usedPrefix, command }) => {
  try {
    if (!text.trim()) {
      return conn.reply(m.chat, `❀ Por favor, ingresa el nombre o enlace del video de YouTube que quieres descargar.`, m);
    }

    // Buscar en YouTube el video por ID o texto
    let videoIdToFind = text.match(youtubeRegexID) || null;
    let searchQuery = videoIdToFind === null ? text : 'https://youtu.be/' + videoIdToFind[1];
    let searchResult = await yts(searchQuery);

    let videoInfo;
    if (videoIdToFind) {
      const videoId = videoIdToFind[1];
      videoInfo = searchResult.all.find(item => item.videoId === videoId) || searchResult.videos.find(item => item.videoId === videoId);
    }
    videoInfo = videoInfo || searchResult.all?.[0] || searchResult.videos?.[0];

    if (!videoInfo) {
      return m.reply('✧ No se encontraron resultados para tu búsqueda.', m);
    }

    // Extraer datos
    let { title, thumbnail, timestamp, views, ago, url, author } = videoInfo;
    title = title || 'No encontrado';
    thumbnail = thumbnail || '';
    timestamp = timestamp || 'No disponible';
    views = views || 'No disponible';
    ago = ago || 'No disponible';
    url = url || 'No disponible';
    author = author || {};

    const vistas = formatViews(Number(views) || 0);
    const canal = author.name || 'Desconocido';

    // Obtener la miniatura para contexto (si tu bot tiene método para ello)
    const thumb = thumbnail ? (await conn.getFile?.(thumbnail))?.data : null;

    // Mensaje informativo con link visible
    const infoMessage = 
`「✦」Descargando *<${title}>*

> 📺 Canal ✦ *${canal}*
> 👀 Vistas ✦ *${vistas}*
> ⏳ Duración ✦ *${timestamp}*
> 📆 Publicado ✦ *${ago}*
> 🖇️ Link ✦ ${url}`;

    const JT = {
      contextInfo: {
        externalAdReply: {
          title: botname,
          body: dev,
          mediaType: 1,
          previewType: 0,
          mediaUrl: url,
          sourceUrl: url,
          thumbnail: thumb,
          renderLargerThumbnail: true,
        },
      },
    };

    // Enviar info al chat
    await conn.reply(m.chat, infoMessage, m, JT);

    // Buscar URL del video mp4 con API Neoxr
    const apiUrl = `https://api.neoxr.eu/api/youtube?url=${encodeURIComponent(url)}&type=video&quality=480p&apikey=GataDios`;
    const response = await fetch(apiUrl);
    const json = await response.json();

    if (!json.data?.url) {
      return conn.reply(m.chat, '✦ No se pudo obtener el enlace del video para descargar.', m);
    }

    // Enviar video mp4
    await conn.sendFile(m.chat, json.data.url, `${json.title || title}.mp4`, title, m);

  } catch (error) {
    console.error(error);
    return m.reply(`✦ Ocurrió un error al descargar el video:\n${error.message || error}`, m);
  }
};

handler.command = ['play2'];
handler.tags = ['descargas'];
handler.help = ['play2 <nombre|URL>'];

export default handler;
