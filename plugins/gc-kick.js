let handler = async (m, { conn, participants, isBotAdmin, isAdmin, args }) => {
  if (!m.isGroup) return m.reply('❗ *Este comando solo funciona en grupos.*');
  if (!isAdmin) return m.reply('🚫 *Solo los admins pueden usar este comando.*');
  if (!isBotAdmin) return m.reply('😥 *No puedo eliminar a nadie si no soy admin.*');

  let users = [];

  if (m.mentionedJid?.length) {
    users = m.mentionedJid;
  } else if (m.quoted?.sender) {
    users = [m.quoted.sender];
  } else if (args[0]) {
    let jid = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    users = [jid];
  }

  if (!users.length) {
    return m.reply('👀 *Etiqueta o responde al mensaje de quien quieras eliminar...*');
  }

  // --- LISTA BLANCA ---
  const whitelist = [
    conn.user.jid.split('@')[0],   // el bot
    '584123456789',                // ejemplo: número del owner
    '573203965212'                 // otro número protegido
  ];

  for (let user of users) {
    const targetId = user.split('@')[0];

    // Protección: si está en la lista blanca, no se expulsa
    if (whitelist.includes(targetId)) {
      m.reply(`🛡️ *El número @${targetId} está protegido y no puede ser eliminado.*`, null, {
        mentions: [user],
      });
      continue;
    }

    // Verificamos que el usuario esté en el grupo
    if (!participants.some(p => p.id === user)) {
      m.reply(`🤔 *No encontré a @${targetId} en este grupo...*`, null, {
        mentions: [user],
      });
      continue;
    }

    await conn.groupParticipantsUpdate(m.chat, [user], 'remove');
    await m.reply(`👢 *@${targetId} fue eliminado del grupo.*`, null, {
      mentions: [user],
    });
  }

  m.react('✅');
};

handler.help = ['kick', 'ban'];
handler.tags = ['group'];
handler.command = /^(kick|ban|echar|sacar)$/i;
handler.group = true;
handler.admin = true;
handler.botAdmin = true;

export default handler;
