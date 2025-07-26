import fs from 'fs';
import path from 'path';

const progPath = path.resolve('./programaciongrupo.js');

async function leerProgramacion() {
  try {
    const datos = await import(progPath + '?update=' + Date.now());
    return datos.default || {};
  } catch {
    return {};
  }
}

function guardarProgramacion(data) {
  const contenido = 'export default ' + JSON.stringify(data, null, 2) + ';\n';
  fs.writeFileSync(progPath, contenido);
}

// Zonas soportadas mapeadas a IANA
const zonasSoportadas = {
  'mexico': 'America/Mexico_City',
  'bogota': 'America/Bogota',
  'lima': 'America/Lima',
  'argentina': 'America/Argentina/Buenos_Aires',
  'venezuela': 'America/Caracas',  // Añadido para Venezuela
};

// Función para parsear hora tipo "8:00 am" o "8 00 pm" o "10:30" o "7 am"
function parsearHora(str) {
  const regex = /(\d{1,2})(?::| )?(\d{0,2})\s*(am|pm)?/i;
  const match = str.match(regex);
  if (!match) return null;
  let hora = parseInt(match[1]);
  let min = match[2] ? parseInt(match[2]) : 0;
  const ampm = match[3] ? match[3].toLowerCase() : null;

  if (ampm === 'pm' && hora < 12) hora += 12;
  if (ampm === 'am' && hora === 12) hora = 0;
  if (hora > 23 || min > 59) return null;

  return { hora, min };
}

// Función para convertir hora objeto a string "HH:mm"
function formatHora({hora, min}) {
  return `${hora.toString().padStart(2,'0')}:${min.toString().padStart(2,'0')}`;
}

const handler = async (msg, { conn, command, args }) => {
  const rawID = conn.user?.id || '';
  const botNumber = rawID.split(':')[0].replace(/[^0-9]/g, '');
  const chatId = msg.key.remoteJid;
  const senderJid = msg.key.participant || msg.key.remoteJid;
  const senderNum = senderJid.replace(/[^0-9]/g, '');

  if (!chatId.endsWith('@g.us')) {
    return await conn.sendMessage(chatId, { text: '❌ Este comando solo puede usarse en grupos.' }, { quoted: msg });
  }

  const metadata = await conn.groupMetadata(chatId);
  const participants = metadata.participants || [];

  const participant = participants.find((p) => p.id.includes(senderNum));
  const isAdmin = participant?.admin === 'admin' || participant?.admin === 'superadmin';
  const isBot = botNumber === senderNum;

  if (!isAdmin && !isBot) {
    return await conn.sendMessage(chatId, { text: '❌ Solo administradores o el bot pueden usar este comando.' }, { quoted: msg });
  }

  let progData = await leerProgramacion();

  const text = args.join(' ').toLowerCase();

  // Comando para cambiar zona: .programargrupo zona Mexico
  if (text.startsWith('zona ')) {
    const zonaInput = text.slice(5).trim();
    // Admitir que el usuario escriba la zona sin tilde para México
    const zonaKey = zonaInput.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const zonaIana = zonasSoportadas[zonaKey] || (zonaInput.startsWith('america/') ? zonaInput : null);
    if (!zonaIana) {
      return await conn.sendMessage(chatId, {
        text: '❌ Zona no soportada. Usa: México, Bogota, Lima, Argentina, Venezuela o escribe zona con nombre IANA válido.'
      }, { quoted: msg });
    }
    progData[chatId] = progData[chatId] || {};
    progData[chatId].zona = zonaIana;
    guardarProgramacion(progData);
    return await conn.sendMessage(chatId, { text: `🌎 Zona horaria configurada a ${zonaIana}` }, { quoted: msg });
  }

  // Parsear comandos abrir y cerrar en cualquier orden
  // Ejemplos de texto: "abrir 8:00 am cerrar 10:30 pm", "cerrar 10:30 pm abrir 8:00", "abrir 7 am", "cerrar 11:15 pm"
  const regexAbrir = /abrir\s+([0-9: ]+(?:am|pm)?)/i;
  const regexCerrar = /cerrar\s+([0-9: ]+(?:am|pm)?)/i;

  const matchAbrir = text.match(regexAbrir);
  const matchCerrar = text.match(regexCerrar);

  if (!matchAbrir && !matchCerrar) {
    return await conn.sendMessage(chatId, {
      text:
        '*Uso incorrecto.*\n\n' +
        'Ejemplos:\n' +
        '» .programargrupo abrir 8:00 am cerrar 10:30 pm\n' +
        '» .programargrupo cerrar 10:30 abrir 8:00 am\n' +
        '» .programargrupo abrir 7:45 am\n' +
        '» .programargrupo cerrar 11:15 pm\n' +
        '» .programargrupo zona America/Mexico_City\n\n' +
        '🌎 Zonas soportadas: México, Bogota, Lima, Argentina, Venezuela'
    }, { quoted: msg });
  }

  const abrirHora = matchAbrir ? parsearHora(matchAbrir[1].trim()) : null;
  const cerrarHora = matchCerrar ? parsearHora(matchCerrar[1].trim()) : null;

  if ((matchAbrir && !abrirHora) || (matchCerrar && !cerrarHora)) {
    return await conn.sendMessage(chatId, { text: '❌ Hora inválida o formato incorrecto.' }, { quoted: msg });
  }

  progData[chatId] = progData[chatId] || {};

  if (abrirHora) progData[chatId].abrir = formatHora(abrirHora);
  if (cerrarHora) progData[chatId].cerrar = formatHora(cerrarHora);

  // Si no hay zona configurada, poner una por defecto (México)
  if (!progData[chatId].zona) progData[chatId].zona = zonasSoportadas['mexico'];

  guardarProgramacion(progData);

  let respuesta = '✅ Configuración de horarios guardada:\n';
  if (progData[chatId].abrir) respuesta += `🌅 Abrir: ${progData[chatId].abrir}\n`;
  if (progData[chatId].cerrar) respuesta += `🌇 Cerrar: ${progData[chatId].cerrar}\n`;
  respuesta += `🕰 Zona horaria: ${progData[chatId].zona}`;

  await conn.sendMessage(chatId, { text: respuesta }, { quoted: msg });
};

handler.command = /^programargrupo$/i;

export default handler;
