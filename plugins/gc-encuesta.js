/* MEJORADO POR CRISS  
github.com/CrxstianEscobar  
Pantheon Code */  

let handler = async (m, { conn, text, args, usedPrefix, command }) => {  
    // Verificar que se haya ingresado texto  
    if (!args[0]) {  
        conn.reply(m.chat, `*[ ℹ️ ] Ingrese un texto para iniciar la encuesta.*\n\n*[ 💡 ] Ejemplo:*\n${usedPrefix + command} *pregunta|opcion1|opcion2*`, m);  
        return;  
    }  

    // Separar la pregunta de las opciones usando el primer `|`  
    const partes = text.split('|');  
    
    // La pregunta es el primer elemento y las opciones son el resto  
    const pregunta = partes[0].trim();  
    const opciones = partes.slice(1).map(opcion => [opcion.trim()]); // Eliminar espacios en las opciones  

    // Validar que haya al menos dos opciones  
    if (opciones.length < 1) {  
        conn.reply(m.chat, `*[ ⚠️️ ] Debe haber al menos una opción en la encuesta.*`, m);  
        return;  
    }  

    // Enviar la encuesta  
    return conn.sendPoll(m.chat, `*📊 Encuesta:* ${pregunta}`, opciones, m);  
};  

handler.help = ['encuesta *<pregunta|opcion1|opcion2>*'];  
handler.tags = ['gc'];  
handler.command = ['poll', 'encuesta'];  
handler.group = true;  

export default handler;  
