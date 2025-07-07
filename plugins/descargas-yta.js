import yts from 'yt-search'
import fetch from 'node-fetch'

const xdownload = '🔊 Descargar'
const dev = 'Bot creado por TuNombre'

const handler = async (m, { conn, command, text, usedPrefix }) => {
  console.log('[INFO] Comando recibido:', command, 'Texto:', text)
  if (!text) {
    console.log('[WARN] No se ingresó texto')
    return m.reply(`*${xdownload} Por favor, ingresa un título de YouTube.*\n> *\`Ejemplo:\`* ${usedPrefix + command} Anna Carina & La única tropical Prohibido`)
  }

  await m.react('⏳')
  console.log('[INFO] Buscando en YouTube:', text)

  try {
    const search = await yts(text)
    console.log('[INFO] Resultados de búsqueda:', search.videos && search.videos.length)
    if (!search.videos || !search.videos.length) {
      await m.react('✖️')
      console.log('[ERROR] No se encontraron resultados')
      return m.reply('*✖️ No se encontraron resultados.*')
    }

    const vid = search.videos[0]
    const { title, thumbnail, timestamp, url, author } = vid
    console.log('[INFO] Video seleccionado:', title, url)

    const captext = `\`\`\`◜YTA - Download◞\`\`\`

🌴 *\`Título:\`* ${title || 'no encontrado'}
⏰ *\`Duración:\`* ${timestamp || 'no encontrado'}
👤 *\`Artista:\`* ${author?.name || 'no encontrado'}

> ${dev}
`

    await conn.sendMessage(m.chat, {
      image: { url: thumbnail },
      caption: captext
    }, { quoted: m })
    console.log('[INFO] Imagen enviada')

    const headers = {
      "accept": "*/*",
      "accept-language": "es-AR,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "Referer": "https://id.ytmp3.mobi/",
      "Referrer-Policy": "strict-origin-when-cross-origin"
    }

    console.log('[INFO] Solicitando init a d.ymcdn.org')
    const initial = await fetch(`https://d.ymcdn.org/api/v1/init?p=y&23=1llum1n471&_=${Math.random()}`, { headers })
    const init = await initial.json()
    console.log('[INFO] Respuesta init:', init)

    const id = url.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/|.*embed\/))([^&?/]+)/)?.[1]
    console.log('[INFO] ID del video:', id)
    if (!id) throw new Error('ID de video no encontrado.')

    const convertURL = `${init.convertURL}&v=${id}&f=mp4&_=${Math.random()}`
    console.log('[INFO] Solicitando conversión:', convertURL)
    const converts = await fetch(convertURL, { headers })
    const convert = await converts.json()
    console.log('[INFO] Respuesta conversión:', convert)

    let info = {}
    for (let i = 0; i < 3; i++) {
      console.log(`[INFO] Consultando progreso (${i + 1}/3):`, convert.progressURL)
      const progress = await fetch(convert.progressURL, { headers })
      info = await progress.json()
      console.log('[INFO] Progreso:', info)
      if (info.progress === 3) break
    }

    if (!convert.downloadURL) {
      console.log('[ERROR] No se pudo obtener el enlace de descarga')
      throw new Error('No se pudo obtener el enlace de descarga.')
    }

    console.log('[INFO] Enviando audio:', convert.downloadURL)
    await conn.sendMessage(m.chat, {
      audio: { url: convert.downloadURL },
      mimetype: 'audio/mp4'
    }, { quoted: m })

    await m.react('✅')
    console.log('[SUCCESS] Audio enviado correctamente')

  } catch (e) {
    await m.react('✖️')
    console.error('[FATAL ERROR]', e)
    m.reply('*⛔ Ocurrió un error al intentar descargar o enviar el audio.*')
  }
}

handler.help = ['play2'].map(v => v + ' *<consulta>*')
handler.tags = ['downloader']
handler.command = /^(yta|song|musica)$/i

export default handler
