// Profesor X: tutor formativo local, determinista y explicable.
// No envía preguntas a servidores, no genera soluciones arbitrarias ni simula un LLM.
import { QUESTION_BY_ID, TOPIC_BY_ID } from '../data/curriculum.js';
import { topicStats, diagnosticStatus } from './pedagogy.js';

const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const includesAny = (value, words) => words.some(word => value.includes(word));
const practiceOf = (attempts, id) => attempts.filter(a => a.topic === id && a.mode === 'practice').slice().sort((a,b)=>a.date.localeCompare(b.date));

export function learningAdvice(topic, attempts, track='support') {
  const recent = practiceOf(attempts, topic.id);
  const stats = topicStats(attempts, topic.id);
  const last = recent.slice(-3);
  const errors = last.filter(a=>!a.correct);
  const missed = [...recent].reverse().find(a=>!a.correct);
  const prereqs = topic.prereqs.map(id=>TOPIC_BY_ID[id]).filter(Boolean);
  const incomplete = prereqs.filter(t=>!topicStats(attempts,t.id).mastered);
  let headline, action;
  if (!recent.length) {
    headline = diagnosticStatus(attempts,topic.id)==='Reforzar'
      ? 'El diagnóstico sugiere repasar este tema antes de avanzar.'
      : 'Empezá por una clase corta y comprobá qué podés resolver.';
    action='Leé el ejemplo y probá un ejercicio de nivel inicial.';
  } else if (errors.length>=2) {
    headline = 'En las últimas prácticas aparecieron dificultades. Vamos paso a paso.';
    action=`Revisá la idea clave y el ejemplo antes de otra práctica. ${topic.steps[0]}`;
  } else if (stats.mastered) {
    headline = 'Tenés evidencias suficientes de dominio en este tema.';
    action='Podés avanzar al siguiente módulo y volver a repasar más adelante.';
  } else if (last.length && last.every(a=>a.correct)) {
    headline = 'Vas progresando. Falta reunir evidencia con más ejercicios distintos.';
    action='Probá la práctica adaptativa para comprobar otros procedimientos.';
  } else {
    headline = 'Estás construyendo este conocimiento; los errores también aportan información.';
    action='Practicá con atención a los pasos y comprobá tus resultados.';
  }
  const prerequisite = incomplete.length ? `Bases recomendadas: ${incomplete.map(t=>t.title).join(', ')}. No están bloqueadas.` : '';
  const context = track==='academy' ? 'Academia: seguí una secuencia gradual.' : 'Apoyo: priorizá el tema que estás viendo en tu escuela.';
  return { headline, action, prerequisite, context, stats, lastError:missed && QUESTION_BY_ID[missed.questionId] || null };
}

export function tutorReply(query, topic, attempts=[], track='support') {
  if (!topic || !TOPIC_BY_ID[topic.id]) return 'Elegí primero un tema de Matemática para trabajar conmigo.';
  const text = normalize(query).slice(0,300);
  const advice = learningAdvice(topic, attempts, track);
  if (!text) return 'Contame qué parte te cuesta o elegí una opción: explicación, ejemplo, pasos, mi avance o un error.';
  if (includesAny(text,['avance','progreso','como voy','me va','nivel','siguiente','que hago ahora'])) {
    const s=advice.stats;
    return `${advice.headline}\n\nEn ${topic.title}: ${s.total} ejercicios de práctica; ${s.accuracy}% de aciertos en los últimos ${s.recent}. Estado: ${s.status}.\n${advice.action}\n${advice.prerequisite}`.trim();
  }
  if (includesAny(text,['me equivo','error','fall','incorrect','mal','confund'])) {
    if (advice.lastError) return `Repasemos un error reciente en «${topic.title}».\nEjercicio: ${advice.lastError.prompt}\nPista: ${advice.lastError.hint}\n\n${topic.steps[0]} ¿Querés que repasemos el procedimiento completo?`;
    return `Todavía no tengo un error registrado para este tema. Una confusión frecuente es: ${topic.mistake}\n\n¿Qué paso te resulta más difícil?`;
  }
  if (includesAny(text,['previo','base','antes','prerrequisito','necesito saber'])) {
    return advice.prerequisite || `Para este módulo ya tenés acceso a las bases sugeridas. ${topic.prereqs.length?'Podés repasar '+topic.prereqs.map(id=>TOPIC_BY_ID[id]?.title).filter(Boolean).join(', ')+'.':'No tiene temas previos obligatorios.'}`;
  }
  if (includesAny(text,['ejemplo','ejercicio','mostra','mostr','caso'])) {
    return `Trabajemos con un ejemplo de ${topic.title}:\n${topic.example}\n\nAhora intentá explicar por qué ese resultado tiene sentido.`;
  }
  if (includesAny(text,['paso','resolver','hacer','procedimiento','ayuda','pista','no entiendo','dificil','cuesta'])) {
    const guidance=advice.stats.total>0 ? `\n\nSegún tu práctica: ${advice.action}` : '';
    return `Vamos paso a paso, sin apurarnos:\n${topic.steps.map((s,i)=>`${i+1}. ${s}`).join('\n')}\n\nProbá el primer paso y contame cuál harías.${guidance}`;
  }
  if (includesAny(text,['util','vida','aplica','para que','sirve','cotidiano'])) {
    return `Este conocimiento aparece en: ${topic.application}\n\n¿Podés encontrar un ejemplo parecido en tu entorno?`;
  }
  if (includesAny(text,['que es','significa','defin','concepto','explica','teoria','entender'])) {
    return `${topic.intro}\n\nRecordá: ${topic.concept}\n\n¿Querés que lo veamos con un ejemplo?`;
  }
  return `Podemos trabajar «${topic.title}». No interpreto libremente todas las preguntas porque soy un tutor local basado en reglas.\n\nPreguntame «explicame el concepto», «mostrame un ejemplo», «guiame paso a paso», «¿cómo voy?» o «revisemos mi último error».`;
}
