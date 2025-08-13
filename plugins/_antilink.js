let linkRegex = /chat.whatsapp.com\/([0-9A-Za-z]{20,24})/i

export async function before(m, { isAdmin, isBotAdmin, conn }) {
  if (m.isBaileys && m.fromMe) return !0
  if (!m.isGroup) return !1

  if (m.sender === conn.user.jid) return !0

  let chat = global.db.data.chats[m.chat]
  let delet = m.key.participant
  let bang = m.key.id
  let bot = global.db.data.settings[this.user.jid] || {}
  const isGroupLink = linkRegex.exec(m.text)
  const grupo = `https://chat.whatsapp.com`

  // Usaremos un campo en la DB para contar infracciones por usuario en cada grupo
  if (!chat.antiLink) return !0

  if (isAdmin && m.text.includes(grupo)) {
    return conn.reply(m.chat, `*☕ Hey!! el \`antilink\` está activo pero eres admin, ¡salvado!*`, m)
  }

  if (chat.antiLink && isGroupLink && !isAdmin) {
    if (isBotAdmin) {
      const linkThisGroup = `https://chat.whatsapp.com/${await this.groupInviteCode(m.chat)}`
      if (m.text.includes(linkThisGroup)) return !0
    }

    // Inicializar el contador si no existe
    if (!chat.antiLinkUsers) chat.antiLinkUsers = {}
    if (!(m.sender in chat.antiLinkUsers)) {
      chat.antiLinkUsers[m.sender] = 0
    }

    chat.antiLinkUsers[m.sender] += 1 // Incrementar contador

    if (chat.antiLinkUsers[m.sender] < 3) {
      // Primero y segundo aviso / advertencia
      await conn.reply(m.chat, `*☕ ¡Enlace detectado!*\n\n*${await this.getName(m.sender)} mandaste un enlace prohibido. Esta es la advertencia ${chat.antiLinkUsers[m.sender]}/3. En la tercera infracción serás expulsado.*`, m)
      
      // Opcional: eliminar mensaje con enlace para mantener grupo limpio
      await conn.sendMessage(m.chat, { delete: { remoteJid: m.chat, fromMe: false, id: bang, participant: delet }})
      return !0
    }

    if (chat.antiLinkUsers[m.sender] >= 3) {
      // Tercera infracción: expulsar
      await conn.reply(m.chat, `*☕ ${await this.getName(m.sender)} ¡has alcanzado la tercera infracción con enlaces y serás expulsado!*`, m)
      if (!isBotAdmin) 
        return conn.reply(m.chat, `*☕ No soy admin, no puedo eliminar intrusos*`, m)

      await conn.sendMessage(m.chat, { delete: { remoteJid: m.chat, fromMe: false, id: bang, participant: delet }})
      await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove')

      // Reiniciar contador o eliminarlo
      delete chat.antiLinkUsers[m.sender]
    }
  }

  return !0
}
