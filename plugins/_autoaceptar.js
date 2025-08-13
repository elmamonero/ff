let handler = m => m

handler.before = async function (m, {conn, isAdmin, isBotAdmin}) {
  if (!m.isGroup) return !1
  let chat = global.db.data.chats[m.chat]
  
  // Solo si autoAceptar activo y el que envía no es admin
  if (chat.autoAceptar && !isAdmin) {
    if (!isBotAdmin) return !0
    
    // Lista de solicitudes pendientes
    const participants = await conn.groupRequestParticipantsList(m.chat)
    
    // Lista de prefijos de países árabes (sin el +)
    const arabicPrefixes = [
      '20','212','213','216','218','971','966','967','968',
      '974','973','965','962','961','963','964','970','972'
    ]
    
    // Filtra cualquier número que NO empiece por prefijo árabe
    const filteredParticipants = participants.filter(p => {
      if (!p.jid.includes('@s.whatsapp.net')) return false
      const num = p.jid.split('@')[0]
      return !arabicPrefixes.some(pref => num.startsWith(pref))
    })
    
    // Aprueba todos los que pasen el filtro
    for (const participant of filteredParticipants) {
      await conn.groupRequestParticipantsUpdate(m.chat, [participant.jid], "approve")
    }
    
    // También manejar evento directo de solicitud
    if (m.messageStubType === 172 && m.messageStubParameters) {
      const [jid] = m.messageStubParameters
      if (jid.includes('@s.whatsapp.net')) {
        const num = jid.split('@')[0]
        if (!arabicPrefixes.some(pref => num.startsWith(pref))) {
          await conn.groupRequestParticipantsUpdate(m.chat, [jid], "approve")
        }
      }
    }
  }
}

export default handler
