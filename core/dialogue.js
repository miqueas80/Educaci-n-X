// Tutor X 3: guía socrática por pasos, sobre contenido curricular verificado,
// sin simulación de razonamiento abierto ni dependencias de red.
import { learningAdvice, tutorReply } from './tutor.js';
import { TOPIC_BY_ID, QUESTION_BY_ID } from '../data/curriculum.js';

const normalizeDialogue = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().slice(0,300);
const agrees = text => /\b(siguiente|continuar|otro paso|seguimos|dale|si|listo)\b/.test(text);
const starts = text => /\b(guiame|guiar|paso a paso|practiquemos|empezar|comencemos|ayuda)\b/.test(text);
const stops = text => /\b(reiniciar|empezar de nuevo|volver a empezar)\b/.test(text);

export function tutorTurn(query, topic, attempts=[], track='support', state=null) {
  if (!topic || !TOPIC_BY_ID[topic.id]) return {reply:'Elegí un tema para aprender.',state:null};
  const text = normalizeDialogue(query);
  let s = state?.topicId===topic.id ? {...state} : {topicId:topic.id,step:0,active:false};
  if (stops(text)) s={topicId:topic.id,step:0,active:true};
  else if (starts(text) && !s.active) s={topicId:topic.id,step:0,active:true};
  else if (agrees(text) && s.active) s.step=Math.min(s.step+1,topic.steps.length);
  else if (/\b(me equivoque|mi error|error reciente|ultimo error)\b/.test(text)) {
    const advice=learningAdvice(topic,attempts,track);
    const q=advice.lastError;
    if (q) return {reply:`Revisemos una dificultad registrada: ${q.prompt}\nPista: ${q.hint}\n¿Cuál sería tu primer paso?`,state:{topicId:topic.id,step:0,active:true}};
  }
  else if (!agrees(text) && !starts(text) && !stops(text)) {
    return {reply:tutorReply(query,topic,attempts,track),state:s};
  }
  if (!s.active) return {reply:'Pedime «guiame paso a paso» para iniciar una explicación guiada.',state:s};
  if (s.step>=topic.steps.length) {
    s.active=false;
    return {reply:`¡Terminamos los pasos de ${topic.title}! Ahora probá resolver un ejercicio por tu cuenta y comprobá el resultado. Podés volver a comenzar cuando quieras.`,state:s};
  }
  const prompt = s.step===0?'¿Cómo aplicarías este primer paso?':'¿Podés explicarlo con tus palabras antes de avanzar?';
  return {reply:`Paso ${s.step+1} de ${topic.steps.length}: ${topic.steps[s.step]}\n\n${prompt}\n(Escribí «siguiente» para recibir el próximo paso.)`,state:s};
}
