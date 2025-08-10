import fetch from 'node-fetch';

let handler = async (m, { conn, text }) => {
  if (!text) return conn.reply(m.chat, '⚠️ Por favor, ingresa un texto para crear el sticker.', m);

  try {
    await m.react('🕒');

    const url = `https://api.nekorinn.my.id/maker/brat-v2?text=${encodeURIComponent(text)}`;
    const res = await fetch(url);

    if (!res.ok) throw new Error('No se pudo descargar el sticker.');

    const buffer = await res.buffer();

    // Validar longitud mínima del buffer para evitar archivos vacíos
    if (buffer.length < 1000) throw new Error('Archivo recibido muy pequeño o corrupto.');

    // Enviar el sticker visual
    await conn.sendMessage(m.chat, {
      sticker: buffer
    }, { quoted: m });

    // También enviar como documento para descarga
    await conn.sendMessage(m.chat, {
      document: buffer,
      fileName: `${text}.webp`,
      mimetype: 'image/webp',
      caption: 'Sticker en formato descargable'
    }, { quoted: m });

    await m.react('✅');
  } catch (e) {
    console.error(e);
    await m.react('✖️');
    m.reply(typeof e === 'string' ? e : 'Error al generar o enviar el sticker.');
  }
};

handler.help = ['brat <texto>'];
handler.tags = ['sticker'];
handler.command = /^brat$/i;

export default handler;
