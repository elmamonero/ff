export async function before(m, {conn, isAdmin, isBotAdmin, isOwner, isRowner, isMods}) {
  if (m.isBaileys && m.fromMe) return true;
  if (m.isGroup) return false;
  if (!m.message) return true;
  if (
    m.text.includes('PIEDRA') || m.text.includes('PAPEL') || m.text.includes('TIJERA') ||
    m.text.includes('serbot') || m.text.includes('code') || m.text.includes('qr')
  ) return true;

  const chat = global.db.data.chats[m.chat];
  const bot = global.db.data.settings[this.user.jid] || {};

  if (bot.antiPrivate && !isOwner && !isRowner && !isMods) {
    // Aquí SOLO bloquea, no responde ningún mensaje
    await this.updateBlockStatus(m.chat, 'block');
  }
  return false;
}
