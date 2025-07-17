import fetch from 'node-fetch'
import yts from 'yt-search'

let handler = async (m, { conn, command, text, usedPrefix }) => {
  if (!text) return m.reply(`╭━━〔 *❗ 𝙀𝙅𝙀𝙈𝙋𝙇𝙊 ❗* 〕━━⬣
┃ ✦ ${usedPrefix + command} Joji - Glimpse of Us
╰━━━━━━━━━━━━━━━━━━⬣`);

  await conn.sendMessage(m.chat, { react: { text: '🔍', key: m.key } })

  let results = await yts(text)

  if (!results || !results.videos || results.videos.length === 0)
    return m.reply('❎ No se encontraron resultados en YouTube.')

  let tes = results.videos[0]
  const apiUrl = `https://www.apis-anomaki.zone.id/downloader/yta?url=${encodeURIComponent(tes.url)}`

  try {
    const res = await fetch(apiUrl)
    const json = await res.json()

    if (!json.result || !json.result.data || !json.result.data.downloadURL)
      return m.reply('❎ No se pudo obtener el audio.')

    const { downloadURL } = json.result.data
    const mention = `@${m.sender.split('@')[0]}`

    const caption = `
╭━━〔 *📥 PLAY AUDIO* 〕━━⬣
┃ ✦ *Título:* ${tes.title}
┃ ✦ *Artista:* ${tes.author.name}
┃ ✦ *Duración:* ${tes.timestamp || tes.duration}
┃ ✦ *Publicado:* ${tes.ago}
╰━━━━━━━━━━━━━━━━━━⬣
⌬ *Enlace:* ${tes.url}
⌬ *Pedido por:* ${mention}
⌬ *𝙼𝚟𝚛𝚌𝚘 𝚂𝚎𝚡𝚘*
`.trim()

    // Enviar imagen con detalles
    await conn.sendMessage(m.chat, {
      image: { url: tes.thumbnail },
      caption,
      mentions: [m.sender]
    }, { quoted: m })

    // Descargar y enviar audio como buffer
    const audioBuffer = await fetch(downloadURL, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }).then(res => res.buffer())

    await conn.sendMessage(m.chat, {
      audio: audioBuffer,
      mimetype: 'audio/mp3',
      fileName: `${tes.title}.`,
      mentions: [m.sender]
    }, { quoted: m })

    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

  } catch (err) {
    console.error(`❎ Error: ${err.message}`)
    await conn.sendMessage(m.chat, { react: { text: '❎', key: m.key } })
    await m.reply('❎ Error al obtener o enviar el audio. Puedes intentar más tarde o descargarlo aquí:\n' + apiUrl)
  }
}

handler.help = ['play *<texto>*']
handler.tags = ['downloader']
handler.command = /^(keni)$/i

export default handler
