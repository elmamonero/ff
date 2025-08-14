import process from 'process'

let restartHandler = async (m, { conn }) => {
  // Guarda el chat donde se ejecutó el comando para luego notificar
  global.chatRestartNotify = m.chat

  await conn.sendMessage(m.chat, { text: '♻️ Reiniciando el bot...' }, { quoted: m })

  // Termina el proceso para que PM2 u otro gestor lo reinicie
  process.exit(0)
}

restartHandler.help = ['restart']
restartHandler.tags = ['owner']
restartHandler.command = ['restart', 'reboot']
restartHandler.rowner = true  // Asegúrate que sólo el dueño pueda ejecutarlo

export default restartHandler
