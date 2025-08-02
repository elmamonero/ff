const emojisTag = [
  '😀','😃','😄','😁','😆','😅','😂','🤣','😊','😉',
  '😍','🥰','😘','😗','😙','😚','😋','😜','🤪','😝',
  '🤑','🤗','🤭','🤫','🤔','🤐','😶','😏','😒','🙄',
  '😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕',
  '🤢','🤮','🥵','🥶','😵','🤯','🤠','🥳','😎','🤓',
  '🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺',
  '😦','😧','😨','😰','😥','😢','😭','😱','😖','😣',
  '😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈',
  '👿','💀','☠️','🤡','👹','👺','👻','👽','👾','🤖',
  '💩','👋','🤚','🖐','✋','🖖','👌','🤏','✌️','🤞',
  '🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍',
  '👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏',
];

// Función para obtener emoji aleatorio
function randomEmoji() {
  return emojisTag[Math.floor(Math.random() * emojisTag.length)];
}

export async function todos4(m, { conn, args }) {
  if (!m.isGroup)
    return await conn.sendMessage(m.chat, { text: "❌ Este comando solo funciona en grupos." }, { quoted: m });

  const senderNum = (m.sender || '').split('@')[0];

  const metadata = await conn.groupMetadata(m.chat);
  const participants = metadata.participants;

  const participant = participants.find(p => p.id.includes(senderNum));
  const isAdmin = participant?.admin === "admin" || participant?.admin === "superadmin";
  const botNumber = (conn.user?.id || '').split(":")[0].replace(/[^0-9]/g, "");
  const isBot = senderNum === botNumber;

  if (!isAdmin && !isBot) {
    return await conn.sendMessage(
      m.chat,
      { text: "❌ Solo administradores o el bot pueden usar este comando." },
      { quoted: m }
    );
  }

  const memberCount = participants.length;
  const senderTag = `@${senderNum}`;

  let aviso = args.length ? `*AVISO:* ${args.join(' ')}` : "*AVISO:* ¡Atención a todos!*";

  const mentionList = participants
    .map(p => `${randomEmoji()} @${p.id.split("@")[0]}`)
    .join("\n");

  const mentionIds = participants.map(p => p.id);

  // Texto EXACTO que pusiste por ti, respetando saltos, símbolos y formato
  const finalMsg = `╭━[ INVOCACIÓN MASIVA ]━⬣
┃🔱 KILLUA-BOT ⚡
┃👤 Invocado por: ${senderTag}
┃👥 Miembros del grupo: ${memberCount}
╰━━━━━━━⋆★⋆━━━━━━━⬣

┌──⭓ Mencionando a todos...
${mentionList}
└───────⭓`;

  await conn.sendMessage(
    m.chat,
    { text: finalMsg, mentions: mentionIds },
    { quoted: m }
  );
}

todos4.command = /^todos4$/i;
todos4.group = true;
todos4.tags = ['group'];
todos4.help = ['todos4'];
