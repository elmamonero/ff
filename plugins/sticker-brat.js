import fetch from 'node-fetch';

let handler = async (m, { conn, text }) => {
  try {
    if (!text) {
      return conn.reply(m.chat, '*⚠️ Por favor, ingresa un texto para generar tu sticker.*', m);
    }

    await m.react('🕒');

    // Construir URL con el texto codificado
    const url = `https://api.nekorinn.my.id/maker/brat-v2?text=${encodeURIComponent(text)}`;

    // Descargar imagen webp como buffer
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('No se pudo descargar la imagen del sticker.');
    }

    const imageBuffer = await response.buffer();

    // Enviar el sticker (archivo webp) al chat
    await conn.sendMessage(m.chat, {
      sticker: imageBuffer
    }, { quoted: m });

    await m.react('✅');
  } catch (err) {
    console.error(err);
    await m.react('✖️');
    m.reply(typeof err === 'string' ? err : 'Ocurrió un error al generar el sticker.');
  }
};

handler.help = ['brat <texto>'];
handler.tags = ['sticker'];
handler.command = /^brat$/i;

export default handler;
