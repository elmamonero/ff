let linkRegex = /chat.whatsapp.com\/([0-9A-Za-z]{20,24})/i

export async function before(m, { isAdmin, isBotAdmin, conn }) {
  if (m.isBaileys && m.fromMe) return !0
  if (!m.isGroup) return !1

  if (m.sender === conn.user.jid) return !0 // Ignorar si el mensaje es del bot

  let chat = global.db.data.chats[m.chat]
  let delet = m.key.participant
  let bang = m.key.id
  let bot = global.db.data.settings[this.user.jid] || {}
  const isGroupLink = linkRegex.exec(m.text)
  const grupo = `https://chat.whatsapp.com`

  // Salir si no está activado el antilink
  if (!chat.antiLink) return !0

  // Si es admin y manda link, NO responder nada
  if (isAdmin && m.text.includes(grupo)) return !0

  if (chat.antiLink && isGroupLink && !isAdmin) {
    if (isBotAdmin) {
      const linkThisGroup = `https://chat.whatsapp.com/${await this.groupInviteCode(m.chat)}`
      if (m.text.includes(linkThisGroup)) return !0
    }

    if (!chat.antiLinkUsers) chat.antiLinkUsers = {}
    if (!(m.sender in chat.antiLinkUsers)) chat.antiLinkUsers[m.sender] = 0

    chat.antiLinkUsers[m.sender] += 1

    // Mensaje visual de advertencia
    if (chat.antiLinkUsers[m.sender] < 3) {
      const advertencias = `${chat.antiLinkUsers[m.sender]}/3`
      const msg = `➤ \`〔 𝗔𝗗𝗩𝗘𝗥𝗧𝗘𝗡𝗖𝗜𝗔 ⚠️ 〕\`
@${m.sender.split("@")[0]} 𝖯𝖱𝖮𝖧𝖨𝖡𝖨𝖣𝖮 𝖤𝖭𝖫𝖠𝖢𝖤𝖲 𝖣𝖤 𝖮𝖳𝖱𝖮𝖲 𝖦𝖱𝖴𝖯𝖮𝖲, 𝖠𝖭𝖳𝖨𝖫𝖨𝖭𝖪 𝖠𝖢𝖳𝖨𝖵𝖠𝖣𝖮 𝖵𝖤 𝖠 𝖧𝖠𝖢𝖤𝖱 𝖲𝖯𝖠𝖬 𝖠 𝖮𝖳𝖱𝖮 𝖫𝖠𝖣𝖮\`\`\`

\`\`\`≫ 𝖭𝖮 𝖫𝖨𝖭𝖪𝖲 𝖣𝖤 𝖮𝖳𝖱𝖮𝖲 𝖦𝖱𝖴𝖯𝖮𝖲
≫ 𝖠𝖣𝖵𝖤𝖱𝖳𝖤𝖭𝖢𝖨𝖠𝖲 ${advertencias}\`\`\``

      await conn.reply(m.chat, msg, m, { mentions: [m.sender] })
      // Elimina el mensaje con enlace para mantener limpio
      await conn.sendMessage(m.chat, { delete: { remoteJid: m.chat, fromMe: false, id: bang, participant: delet }})
      return !0
    }

    if (chat.antiLinkUsers[m.sender] >= 3) {
      // Expulsa tras 3 advertencias
      await conn.reply(m.chat, `*☕ ${await this.getName(m.sender)} ¡has alcanzado la tercera infracción con enlaces y serás expulsado!*`, m)
      if (!isBotAdmin) 
        return conn.reply(m.chat, `*☕ No soy admin, no puedo eliminar intrusos*`, m)

      await conn.sendMessage(m.chat, { delete: { remoteJid: m.chat, fromMe: false, id: bang, participant: delet }})
      await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove')
      delete chat.antiLinkUsers[m.sender]
    }
  }

  return !0
}
