import fs from 'fs';
import path from 'path';

// Rutas para archivos de configuración
const progPath = path.resolve('./programaciongrupo.js');

// --- Gestión de programación ---
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

// --- Zonas soportadas ---
const zonasSoportadas = {
  'mexico': 'America/Mexico_City',
  'bogota': 'America/Bogota',
  'lima': 'America/Lima',
  'argentina': 'America/Argentina/Buenos_Aires',
  'venezuela': 'America/Caracas',
};

// Parseo de hora tipo "8:00 am", "8 30 pm", "10:00", "7 am", etc.
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

function formatHora({hora, min}) {
  return `${hora.toString().padStart(2,'0')}:${min.toString().padStart(2,'0')}`;
}

// --- Función para comparar la hora actual con la programada ---
// Recibe 2 strings "HH:mm"
function esHoraIgual(hora1, hora2) {
  return hora1 === hora2;
}

// Función para saber si hora actual está entre abrir y cerrar
// Ambas en formato "HH:mm", evalúa rango considerando paso a medianoche
function estaEnRango(horaActual, abrir, cerrar) {
  if (!abrir || !cerrar) return false;
  // Convertir a minutos totales para comparar fácilmente
  const [hA, mA] = horaActual.split(':').map(Number);
  const [hAbrir, mAbrir] = abrir.split(':').map(Number);
  const [hCerrar, mCerrar] = cerrar.split(':').map(Number);

  const totalA = hA * 60 + mA;
  const totalAbrir = hAbrir * 60 + mAbrir;
  const totalCerrar = hCerrar * 60 + mCerrar;

  if (totalAbrir <= totalCerrar) {
    return totalA >= totalAbrir && totalA < totalCerrar;
  } else {
    // Rango que pasa la medianoche (ej: abrir 22:00 cerrar 06:00)
    return totalA >= totalAbrir || totalA < totalCerrar;
  }
}

// --- Estado interno para evitar mensajes repetidos ---
const estadoGrupo = {}; // { chatId: 'abierto'|'cerrado' }

// --- Función principal del handler del comando .programargrupo ---
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
    const zonaKey = zonaInput.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const zonaIana = zonasSoportadas[zonaKey] || (zonaInput.startsWith('america/') ? zonaInput : null);
    if (!zonaIana) {
      return await conn.sendMessage(chatId, {
        text: '❌ Zona no soportada. Usa: México, Bogota, Lima, Argentina, Venezuela o usa nombre IANA válido.'
      }, { quoted: msg });
    }
    progData[chatId] = progData[chatId] || {};
    progData[chatId].zona = zonaIana;
    guardarProgramacion(progData);
    return await conn.sendMessage(chatId, { text: `🌎 Zona horaria configurada a ${zonaIana}` }, { quoted: msg });
  }

  // Parsear comandos abrir y cerrar en cualquier orden
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

// --- FUNCION PARA VERIFICAR Y APLICAR ESTADO DE CIERRE / APERTURA ---

async function revisarEstados(conn) {
  let progData = await leerProgramacion();
  const chatIds = Object.keys(progData);

  for (const chatId of chatIds) {
    const config = progData[chatId];
    if (!config) continue;

    const { abrir, cerrar, zona } = config;
    if (!abrir && !cerrar) continue;

    // Obtener hora actual en la zona configurada
    let horaAhora;
    try {
      horaAhora = new Date().toLocaleString('en-US', { timeZone: zona });
    } catch {
      horaAhora = new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' });
    }
    const d = new Date(horaAhora);
    const horaStr = `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;

    // Evaluar si el grupo debe estar abierto o cerrado
    // Abierto si está dentro del rango [abrir, cerrar), cerrado si no.
    const abierto = estaEnRango(horaStr, abrir, cerrar);

    // Revisar estado previo para evitar repetir mensajes
    if (estadoGrupo[chatId] === undefined) estadoGrupo[chatId] = abierto ? 'abierto' : 'cerrado';

    if (abierto && estadoGrupo[chatId] !== 'abierto') {
      // Abrir grupo: permitir enviar mensajes
      try {
        await conn.groupSettingChange(chatId, 'not_announcement'); // Permite hablar
        await conn.sendMessage(chatId, { text: '✅ El grupo se ha *ABIERTO* según programación.' });
        estadoGrupo[chatId] = 'abierto';
      } catch (e) {
        console.error(`Error abriendo grupo ${chatId}:`, e);
      }
    } else if (!abierto && estadoGrupo[chatId] !== 'cerrado') {
      // Cerrar grupo: solo admins pueden hablar
      try {
        await conn.groupSettingChange(chatId, 'announcement'); // Solo admins hablan
        await conn.sendMessage(chatId, { text: '⛔ El grupo se ha *CERRADO* según programación.' });
        estadoGrupo[chatId] = 'cerrado';
      } catch (e) {
        console.error(`Error cerrando grupo ${chatId}:`, e);
      }
    }
    // Si el estado no cambió, no hacer nada para evitar spam.
  }
}

// --- INICIAR INTERVALO DE VERIFICACION ---
// Debe llamarse después de cargar o iniciar el bot, con el objeto `conn` válido

function iniciarVerificador(conn) {
  // Ejecutar cada minuto
  setInterval(() => {
    revisarEstados(conn).catch(err => console.error('Error en verificar estados:', err));
  }, 60 * 1000);

  // Opcional: ejecutar inmediatamente una vez al iniciar
  revisarEstados(conn).catch(err => console.error('Error inicial en verificar estados:', err));
}

// Exportar handler y función para iniciar verificador
export { handler, iniciarVerificador };
