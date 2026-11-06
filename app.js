import { TOPICS, TOPIC_BY_ID, QUESTION_BY_ID } from './data/curriculum.js';
import { checkAnswer, buildAttempt, topicStats, diagnosticStatus, recommendTopic, selectNextQuestion, diagnosticQuestions, validateBackup, createSessionId } from './core/pedagogy.js';
import {openDatabase, getProfile, saveProfile, getAttempts, saveAttempt, getPlanner, savePlanner, getStudyEntries, saveStudyEntry, getSchoolTasks, saveSchoolTask, deleteSchoolTask, replaceData, clearData} from './core/storage.js';
import { learningAdvice } from './core/tutor.js';
import { tutorTurn } from './core/dialogue.js';
import { ACADEMY, academyStatus, unitStatus, findUnit, unitAssessmentQuestions } from './core/academy.js';
import { reviewPlan, reviewDeck } from './core/review.js';
import { defaultStudyPreferences, normalizeStudyPreferences, buildWeeklyPlan, validateStudyEntry, localDayKey } from './core/planner.js';
import { SUBJECTS, SUBJECT_BY_ID, subjectsForGrade, validateSchoolTask, validateSchoolBackup, summarizeSchoolTasks, monthCalendar, parseLocalDate } from './core/school.js';

const app = { profile:null, attempts:[], view:'home', topicId:'enteros', activity:null, tutorReply:null, tutorQuery:'', tutorState:null, flash:null, planner:defaultStudyPreferences(), studyEntries:[], plannerDraft:null, schoolTasks:[], taskFilter:'pending', taskEditing:null, calendarMonth:{year:new Date().getFullYear(),month:new Date().getMonth()+1}, selectedCalendarDay:localDayKey(new Date()) };
const root=document.getElementById('app');
const safe = value => String(value ?? '').replace(/[&<>"']/g, char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const trackTitle = t=> t==='academy' ? 'Academia independiente' : 'Apoyo escolar';
const T = topic => topicStats(app.attempts,topic.id);
const button=(label,action,extra='',type='button')=>`<button type="${type}" class="btn ${extra}" data-action="${action}">${label}</button>`;
const fmt = date=>new Intl.DateTimeFormat('es-AR',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(date));

function flash(message, isError=false) {
  document.querySelector('.toast')?.remove();
  const el=document.createElement('div');
  el.className='toast'+(isError?' error':''); el.role='status'; el.textContent=message;
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),4800);
}
function navItem(view, icon, title) {
  return `<button class="nav-btn ${app.view===view?'active':''}" data-action="navigate" data-view="${view}" ${app.view===view?'aria-current="page"':''}><span class="nav-icon" aria-hidden="true">${icon}</span>${title}</button>`;
}
function sidebar() {
  return `<aside class="sidebar"><div class="brand"><div class="logo"><img src="./assets/icon.svg" alt=""></div><div><strong>EDUCACIÓN X</strong><small>Mi escuela digital</small></div></div>
  <div class="navtitle">Mi espacio</div><nav class="nav" aria-label="Navegación principal">
    ${navItem('home','⌂','Inicio')}${navItem('path','▦','Mis recorridos')}${navItem('academy','🎓','Mi academia')}${navItem('reviews','↻','Mis repasos')}${navItem('planner','▣','Mi plan semanal')}${navItem('school','▤','Mis materias')}${navItem('schoolTasks','☑','Mis tareas')}${navItem('calendar','▦','Calendario escolar')}${navItem('math','∑','Matemática')}${navItem('diagnostic','◉','Diagnóstico')}${navItem('progress','◫','Mi progreso')}
  </nav><div class="navtitle" style="margin-top:23px">Mi cuenta</div><nav class="nav">${navItem('settings','⚙','Datos y privacidad')}</nav><div class="sidebar-spacer"></div>
  <div class="sidecard"><b><span class="side-dot"></span>Motor X Local</b><p>Sin cuentas externas ni envío de respuestas. El progreso se guarda en este dispositivo.</p></div></aside>`;
}
function mobileNav() { return `<nav class="mobile-nav" aria-label="Navegación móvil">${navItem('home','⌂','Inicio')}${navItem('schoolTasks','☑','Tareas')}${navItem('calendar','▦','Agenda')}${navItem('planner','▣','Plan')}${navItem('academy','🎓','Academia')}${navItem('math','∑','Mate')}${navItem('reviews','↻','Repasos')}${navItem('progress','◫','Progreso')}${navItem('settings','⚙','Datos')}</nav>`; }
function setup() {
  return `<div class="setup-bg"><div class="card setup"><div class="logo"><img src="./assets/icon.svg" alt=""></div><div class="eyebrow">Bienvenido a tu segunda escuela</div>
  <h1>Tu aprendizaje empieza acá.</h1><p>Creá un perfil local. No requiere cuenta, Internet ni datos personales reales.</p>
  <form id="setup-form"><div class="form-field"><label for="student-name">¿Cómo querés que te llamemos?</label><input class="input" id="student-name" name="name" type="text" maxlength="45" placeholder="Estudiante" autocomplete="off"></div>
  <div class="form-field"><label for="student-grade">Año de secundaria</label><select id="student-grade" name="grade">${[1,2,3,4,5,6].map(i=>`<option value="${i}">${i}.º año</option>`).join('')}</select></div>
  <div class="form-field"><label for="student-track">¿Por dónde querés empezar?</label><select id="student-track" name="track"><option value="support">Apoyo escolar</option><option value="academy">Academia independiente</option></select></div>
  <button class="btn" type="submit">Entrar a EDUCACIÓN X →</button></form>
  <p class="footnote">Sin registro remoto. Podés exportar tu progreso desde Datos y privacidad. Esto no otorga títulos oficiales.</p></div></div>`;
}
function pageTemplate(inner) {
  const title = {home:'Mi escuela digital',path:'Mis recorridos',academy:'Mi academia',reviews:'Mis repasos',planner:'Mi plan semanal',school:'Mis materias',schoolTasks:'Mis tareas',calendar:'Calendario escolar',math:'Matemática',diagnostic:'Diagnóstico inicial',progress:'Mi progreso',settings:'Privacidad y datos',lesson:'Aprender Matemática',activity:'Práctica guiada'}[app.view] ?? 'EDUCACIÓN X';
  return `<div class="shell">${sidebar()}<main class="main"><header class="topbar"><h2>${title}</h2><div class="topbar-right"><span class="status ${navigator.onLine?'':'off'}" id="connection">● ${navigator.onLine?'Con red':'Sin red'}</span><span class="small subtle" title="Perfil local">${safe(app.profile.name)}</span><div class="avatar" aria-hidden="true">${safe((app.profile.name||'E').charAt(0).toUpperCase())}</div></div></header><div class="page">${inner}</div></main>${mobileNav()}</div>`;
}
function selectTrack() {
  return `<div class="track-switch" role="group" aria-label="Recorrido activo"><button data-action="track" data-track="support" aria-pressed="${app.profile.track==='support'}" class="${app.profile.track==='support'?'active':''}">Apoyo</button><button data-action="track" data-track="academy" aria-pressed="${app.profile.track==='academy'}" class="${app.profile.track==='academy'?'active':''}">Academia</button></div>`;
}
function topicCard(topic){
  const stats = T(topic);
  return `<article class="card topic-card"><div class="row" style="justify-content:space-between"><span class="topic-ico">${topic.icon}</span><span class="pill ${stats.mastered?'good':''}">${stats.status}</span></div>
    <small>${safe(topic.tag)} · ${topic.duration}</small><h3>${safe(topic.title)}</h3><p>${safe(topic.objective)}</p>
    <div class="progress" role="progressbar" aria-label="Avance ${safe(topic.title)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${stats.progress}"><div class="bar" style="width:${stats.progress}%"></div></div>
    <div class="topic-footer"><span class="tiny subtle">Avance formativo: ${stats.progress}%</span><button class="btn small ghost" data-action="lesson" data-topic="${topic.id}">Estudiar →</button></div></article>`;
}
function home(){
  const sum=TOPICS.filter(t=>T(t).mastered).length, practice=app.attempts.filter(a=>a.mode==='practice').length;
  const recommended=recommendTopic(app.attempts,app.profile.track);
  const isAcademy=app.profile.track==='academy';
  const due=reviewPlan(app.attempts).due.length;
  const weekly=buildWeeklyPlan(app.attempts,app.studyEntries,app.planner);
  const deadlines=summarizeSchoolTasks(app.schoolTasks);
  return `<div class="stack"><div class="page-head"><div><div class="eyebrow">Un nuevo modo de aprender</div><h1>¡Hola, ${safe(app.profile.name)}! 👋</h1><p class="lead">Tu aprendizaje tiene un lugar propio. Elegí cómo avanzar hoy.</p></div>${selectTrack()}</div>
  <section class="hero"><div><div class="eyebrow">${isAcademy?'Tu segundo recorrido académico':'Tu compañero de escuela'}</div><h1>${isAcademy?'Una escuela que sigue tu ritmo.':'Lo que cuesta hoy, se aprende paso a paso.'}</h1><p>${isAcademy?'Recorré un programa progresivo y registrá tus competencias sin depender de tu escuela presencial.':'Reforzá lo que ves en clase, practicá sin presión y preparate para tu próxima evaluación.'}</p><div class="buttons">${button('Continuar: '+safe(recommended.title)+' →','recommended','white')}${button('Hacer diagnóstico','start-diagnostic','ghost')}</div></div></section>
  <section class="grid stats" aria-label="Resumen de progreso"><div class="card stat"><div class="stat-ico">◉</div><b>${sum}/${TOPICS.length}</b><span>Temas dominados</span></div><div class="card stat"><div class="stat-ico">✎</div><b>${practice}</b><span>Ejercicios realizados</span></div><div class="card stat"><div class="stat-ico">⌁</div><b>100%</b><span>Actividades locales</span></div></section>
  <div class="notebox ${deadlines.overdue.length?'amber':''}"><strong>Entregas:</strong> ${deadlines.overdue.length} vencidas · ${deadlines.dueToday.length} para hoy · ${deadlines.nextSevenDays.length} en los próximos 7 días. <button class="muted-link" data-action="navigate" data-view="schoolTasks">Ver mis tareas →</button></div>
  <div class="notebox"><strong>Tu semana:</strong> ${weekly.completedMinutes} de ${weekly.goalMinutes} minutos registrados · ${weekly.dueCount} repasos prioritarios. <button class="muted-link" data-action="navigate" data-view="planner">Abrir mi plan semanal →</button></div>
  <div class="section-title"><h2>Mis temas de Matemática</h2><button class="muted-link" data-action="navigate" data-view="math">Ver todos →</button></div><section class="grid">${TOPICS.slice(0,3).map(topicCard).join('')}</section>
  ${due?`<div class="notebox amber" role="note"><strong>↻ Tenés ${due} ${due===1?'tema':'temas'} para repasar.</strong> Una sesión breve ayuda a comprobar cuánto recordás. <button class="btn small" data-action="navigate" data-view="reviews" style="margin-left:10px">Ir a mis repasos →</button></div>`:`<div class="notebox" role="note"><strong>↻ Repasos al día.</strong> <button class="muted-link" data-action="navigate" data-view="reviews">Ver próximas sesiones →</button></div>`}
  <div class="notebox"><strong>Una sola trayectoria de aprendizaje.</strong> Apoyo y Academia comparten las evidencias de dominio. Cambiar de recorrido no elimina tus avances.</div></div>`;
}
function path(){
  const isAcademy=app.profile.track==='academy';
  const chosen = recommendTopic(app.attempts,app.profile.track);
  return `<header class="page-head"><div><div class="eyebrow">Trayectorias conectadas</div><h1>Mis recorridos</h1><p class="lead">Dos modalidades, un mismo mapa de conocimientos y evidencias compartidas.</p></div>${selectTrack()}</header>
  <section class="grid two"><div class="card pad"><span class="topic-ico">🏫</span><h2 style="margin:13px 0 7px">Apoyo escolar</h2><p class="lead">Elegí cualquier tema que estés viendo en tu escuela. Priorizamos los conceptos que necesitás reforzar.</p><div class="buttons"><button data-action="track" data-track="support" class="btn ${!isAcademy?'ghost':''}">${!isAcademy?'Recorrido activo':'Elegir Apoyo'}</button></div></div>
  <div class="card pad"><span class="topic-ico">🎓</span><h2 style="margin:13px 0 7px">Academia independiente</h2><p class="lead">Seguí una secuencia recomendada de conceptos. Podés explorar cualquier módulo si querés.</p><div class="buttons"><button data-action="track" data-track="academy" class="btn ${isAcademy?'ghost':''}">${isAcademy?'Recorrido activo':'Elegir Academia'}</button></div></div></section>
  <div class="buttons"><button class="btn" data-action="navigate" data-view="academy">Explorar el programa de Academia →</button></div>
  <div class="section-title"><h2>${isAcademy?'Itinerario de Matemática · ciclo básico y ampliación':'Temas disponibles para reforzar'}</h2><span class="small subtle">Propuesta piloto, no plan oficial completo</span></div>
  <div class="card">${TOPICS.map((t,i)=>`<div class="module"><div class="module-left"><span class="module-num">${i+1}</span><div><b>${safe(t.title)}</b><p>${T(t).status} · ${safe(t.level)}${t.id===chosen.id?' · Recomendado':''}</p></div></div><div class="row"><span class="pill ${T(t).mastered?'good':'mid'}">${T(t).progress}%</span><button class="btn small ghost" data-action="lesson" data-topic="${t.id}">Abrir</button></div></div>`).join('')}</div>
  <p class="footnote">EDUCACIÓN X no reemplaza la inscripción a una institución educativa oficial y no expide títulos reconocidos.</p>`;
}

function academy(){
  const status=academyStatus(app.attempts);
  return `<div class="page-head"><div><div class="eyebrow">Academia independiente · Trayecto piloto</div><h1>${safe(ACADEMY.title)}</h1><p class="lead">${safe(ACADEMY.description)}</p></div><span class="pill ${status.completed?'good':''}">${status.passed}/${status.total} unidades con evaluación aprobada</span></div>
  <div class="notebox amber" role="note" style="margin-bottom:18px"><b>Formación independiente, sin acreditación oficial.</b> Una evaluación aprobada registra un hito interno, pero no promociona de año ni reemplaza exámenes escolares.</div>
  <div class="card pad"><h2>Tu mapa académico</h2><p class="lead">Cada unidad contiene lecciones, práctica y una evaluación integradora. Para habilitarla necesitás dominar los temas de la unidad; podés estudiar todos sin bloqueos.</p></div>
  <div class="academy-units">${ACADEMY.units.map(unit=>{
    const x=unitStatus(unit,app.attempts);
    return `<section class="card pad" aria-label="${safe(unit.title)}"><div class="row" style="justify-content:space-between;align-items:flex-start;gap:12px"><div><span class="eyebrow">Secuencia académica</span><h2>${safe(unit.title)}</h2><p class="lead">${safe(unit.objective)}</p></div><span class="pill ${x.passed?'good':''}">${safe(x.status)}</span></div>
      <div class="progress" role="progressbar" aria-label="Dominio de ${safe(unit.title)}" aria-valuemin="0" aria-valuemax="${x.total}" aria-valuenow="${x.mastered}" style="margin:12px 0 16px"><div class="bar" style="width:${100*x.mastered/x.total}%"></div></div>
      <p class="small subtle">${x.mastered}/${x.total} temas dominados con práctica · Evaluación: ${x.lastAssessment?x.lastAssessment.correct+'/5 correctas':'sin completar'}</p>
      ${unit.topics.map((topicId,index)=>{const topic=TOPIC_BY_ID[topicId],s=T(topic);return `<div class="module"><div class="module-left"><span class="module-num">${index+1}</span><div><b>${safe(topic.title)}</b><p>Lección · práctica adaptativa · ${safe(s.status)}</p></div></div><button class="btn small ghost" data-action="lesson" data-topic="${topic.id}">Abrir clase →</button></div>`}).join('')}
      <div class="buttons"><button class="btn ${x.ready?'':'ghost'}" data-action="start-assessment" data-unit="${unit.id}" ${x.ready?'':'disabled aria-disabled="true"'}>${x.passed?'Repetir evaluación integradora':x.ready?'Iniciar evaluación de unidad →':'Dominá los temas para evaluar'}</button></div>
      <p class="footnote">5 preguntas distintas. Se aprueba internamente con al menos 4 correctas. Durante la evaluación no se muestran las respuestas.</p></section>`
  }).join('')}</div>
  ${status.completed?'<div class="notebox"><strong>Trayecto piloto completado con evidencias.</strong> No equivale a una certificación oficial.</div>':''}`;
}

function math(){
  return `<div class="page-head"><div><div class="eyebrow">Matemática · secundaria argentina</div><h1>Aprender es comprender.</h1><p class="lead">${TOPICS.length} módulos piloto del ciclo básico, con teoría, profesor local y práctica adaptable.</p></div></div>
  <div class="notebox amber" style="margin-bottom:18px">Propuesta inicial inspirada en ejes generales de los NAP de Matemática del ciclo básico. No representa el programa completo de todos los años o provincias.</div>
  <div class="grid">${TOPICS.map(topicCard).join('')}</div>`;
}
function lesson(){
  const t=TOPIC_BY_ID[app.topicId]; if(!t) return math();
  const stats=T(t);
  const advice=learningAdvice(t,app.attempts,app.profile.track);
  return `<div class="page-head"><div><div class="eyebrow">Matemática / ${safe(t.tag)}</div><h1>${safe(t.title)}</h1><p class="lead">Objetivo: ${safe(t.objective)}</p></div><span class="pill ${stats.mastered?'good':''}">${stats.status}</span></div>
  <div class="notebox" role="note" style="margin-bottom:18px"><strong>Plan personalizado · Método X:</strong> ${safe(advice.headline)} ${safe(advice.action)} ${advice.prerequisite?`<div class="small subtle">${safe(advice.prerequisite)}</div>`:''}</div>
  <div class="lesson"><div class="card pad lesson-body"><div><span class="tag">Clase breve · ${t.duration}</span></div><section><h3>Empecemos por la idea</h3><p>${safe(t.intro)}</p></section>
  <section><h3>Lo importante</h3><p>${safe(t.concept)}</p></section><section><h3>Un ejemplo resuelto</h3><div class="math-example">${safe(t.example)}</div></section>
  <section><h3>Tu estrategia</h3><ol>${t.steps.map(s=>`<li>${safe(s)}</li>`).join('')}</ol></section><section><h3>Error frecuente</h3><p>${safe(t.mistake)}</p></section>
  <section><h3>¿Para qué sirve?</h3><p>${safe(t.application)}</p></section><div class="buttons"><button class="btn" data-action="start-practice" data-topic="${t.id}">Empezar práctica de 5 ejercicios →</button><button class="btn ghost" data-action="navigate" data-view="math">Volver a temas</button></div></div>
  <aside class="tutor"><div class="tutor-icon">✦</div><h3>Profesor X · Método X v0.4</h3><p class="small subtle" style="margin-top:7px">Uso tu progreso real para darte pistas y explicaciones del tema. Funciono sin Internet.</p><div class="tutor-message" role="status">${safe(app.tutorReply ?? '¿Querés otro ejemplo, un consejo para resolver o repasar el error frecuente?')}</div>
  <div class="buttons"><button class="btn small ghost" data-action="tutor-prompt" data-prompt="ejemplo">Ejemplo</button><button class="btn small ghost" data-action="tutor-prompt" data-prompt="guiame paso a paso">Guía interactiva</button><button class="btn small ghost" data-action="tutor-prompt" data-prompt="siguiente">Siguiente paso</button><button class="btn small ghost" data-action="tutor-prompt" data-prompt="error">Repasar error</button><button class="btn small ghost" data-action="tutor-prompt" data-prompt="mi avance">Mi avance</button></div>
  <form id="tutor-form" style="margin-top:18px"><label for="tutor-input" class="small"><b>Tu pregunta</b></label><textarea class="input" id="tutor-input" name="question" maxlength="300" placeholder="Ej.: ¿Me explicás los pasos?" style="margin-top:7px"></textarea><button type="submit" class="btn small">Preguntar</button></form><p class="footnote">Tutor conversacional guiado, basado en reglas y evidencias locales. No es un modelo generativo ni entiende consultas libres fuera del contenido.</p></aside></div>`;
}
function reviews(){
  const plan=reviewPlan(app.attempts);
  const heading = plan.due.length ? `Tenés ${plan.due.length} ${plan.due.length===1?'tema pendiente':'temas pendientes'}` : '¡Tus repasos están al día!';
  return `<div class="page-head"><div><div class="eyebrow">Método X · Memoria y comprensión</div><h1>Mis repasos inteligentes</h1><p class="lead">Revisá temas ya practicados con preguntas diferentes. Las fechas se calculan en tu dispositivo; no usamos notificaciones ni servidores.</p></div></div>
  <section class="card pad review-highlight" aria-label="Estado de repaso"><div class="eyebrow">Sesión de hoy</div><h2>${heading}</h2><p class="lead">${plan.due.length?'Elegimos hasta cinco preguntas, una por tema pendiente, para una sesión breve.':'Cuando practiques un tema o llegue su fecha, aparecerá un repaso sugerido.'}</p>
    <div class="buttons"><button class="btn" data-action="start-review" ${plan.due.length?'':'disabled aria-disabled="true"'}>Empezar repaso ${plan.due.length?'de '+Math.min(5,plan.due.length)+' preguntas':'(sin pendientes)'}</button><button class="btn ghost" data-action="navigate" data-view="math">Ver temas</button></div></section>
  <div class="section-title"><h2>Para repasar ahora</h2></div>
  <div class="card">${plan.due.length?plan.due.map(x=>`<div class="module"><div class="module-left"><span class="module-num">↻</span><div><b>${safe(x.topic.title)}</b><p>${x.lastCorrect===false?'Hubo un error: conviene repasar la explicación.':'Programado según la última práctica o repaso.'}</p></div></div><span class="pill mid">Pendiente</span></div>`).join(''):'<div class="pad empty">Todavía no tenés repasos pendientes.</div>'}</div>
  <div class="section-title"><h2>Próximos repasos</h2></div>
  <div class="card">${plan.upcoming.length?plan.upcoming.map(x=>`<div class="module"><div class="module-left"><span class="module-num">${safe(x.topic.icon)}</span><div><b>${safe(x.topic.title)}</b><p>Próximo: ${fmt(x.dueAt)}</p></div></div><span class="pill">Programado</span></div>`).join(''):'<div class="pad empty">No hay repasos programados todavía.</div>'}</div>
  ${plan.notStarted.length?`<p class="footnote">Temas sin práctica: ${plan.notStarted.map(x=>safe(x.topic.title)).join(', ')}. No generamos repasos ficticios; primero necesitás resolver ejercicios.</p>`:''}
  <div class="notebox amber" role="note" style="margin-top:24px"><strong>Importante:</strong> los intervalos de 1, 3, 7, 14 y 30 días son recomendaciones iniciales, no una medición científica de memoria ni una calificación. Un repaso no concede automáticamente dominio.</div>`;
}


function planner(){
  const plan=buildWeeklyPlan(app.attempts,app.studyEntries,app.planner);
  const weekdayNames=['','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
  const grouped=new Map();
  for(const session of plan.schedule){if(!grouped.has(session.date))grouped.set(session.date,[]);grouped.get(session.date).push(session);}
  const draft=app.plannerDraft || {date:localDayKey(new Date()),topicId:plan.suggestedTopic,minutes:app.planner.sessionMinutes};
  const recent=app.studyEntries.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8);
  return `<div class="stack"><div class="page-head"><div><div class="eyebrow">Método X · Organización sin presión</div><h1>Mi semana de estudio</h1><p class="lead">Plan sugerido para ${safe(plan.weekStart)} al ${safe(plan.weekEnd)}. Las sesiones son propuestas, no asistencia obligatoria: solo se cuentan los minutos que vos registrás.</p></div></div>
  <div class="grid stats"><div class="card stat"><span>Meta semanal</span><b>${plan.goalMinutes} min</b></div><div class="card stat"><span>Tiempo registrado</span><b>${plan.completedMinutes} min</b></div><div class="card stat"><span>Avance declarado</span><b>${plan.progressPercent}%</b></div></div>
  <div class="card pad"><h2>Tu objetivo semanal</h2><div class="progress" role="progressbar" aria-label="Avance de minutos de estudio registrados" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${plan.progressPercent}" style="margin-top:15px"><div class="bar" style="width:${plan.progressPercent}%"></div></div><p class="footnote">${plan.registeredSessions} sesiones registradas esta semana. Estudiar más tiempo no garantiza dominar un tema; el dominio depende de ejercicios verificados.</p>${plan.unplannedMinutes?`<div class="notebox amber" style="margin-top:15px">Con los días elegidos y un límite de cuatro sesiones por día, quedan ${plan.unplannedMinutes} minutos de tu meta sin agendar. Podés sumar días o aumentar la duración de las sesiones.</div>`:''}</div>
  <div class="profile-grid"><section class="card pad"><h2>Configurá tu rutina</h2><form id="planner-form" style="margin-top:18px"><div class="form-field"><label for="weekly-goal">Meta semanal (30 a 420 minutos)</label><input class="input" id="weekly-goal" name="weeklyGoalMinutes" type="number" min="30" max="420" step="5" required value="${app.planner.weeklyGoalMinutes}"></div><div class="form-field"><label for="session-time">Duración sugerida por sesión (15 a 60 minutos)</label><input class="input" id="session-time" name="sessionMinutes" type="number" min="15" max="60" step="5" required value="${app.planner.sessionMinutes}"></div><fieldset class="study-days"><legend>¿Qué días querés estudiar?</legend><div class="day-options">${[1,2,3,4,5,6,7].map(n=>`<label><input type="checkbox" name="days" value="${n}" ${app.planner.days.includes(n)?'checked':''}><span>${weekdayNames[n]}</span></label>`).join('')}</div></fieldset><button class="btn" type="submit">Guardar mi rutina</button></form></section>
  <section class="card pad"><h2>Registrar tiempo real</h2><p class="lead">Cuando termines de estudiar, anotá los minutos. Este registro es manual y no modifica tus calificaciones.</p><form id="study-form" style="margin-top:17px"><div class="form-field"><label for="study-date">Día que estudiaste</label><input class="input" id="study-date" type="date" name="date" required max="${localDayKey(new Date())}" value="${safe(draft.date)}"></div><div class="form-field"><label for="study-topic">Tema</label><select id="study-topic" name="topicId">${TOPICS.map(t=>`<option value="${t.id}" ${t.id===draft.topicId?'selected':''}>${safe(t.title)}</option>`).join('')}</select></div><div class="form-field"><label for="study-minutes">Minutos estudiados realmente (1 a 180)</label><input id="study-minutes" class="input" type="number" name="minutes" min="1" max="180" value="${draft.minutes}" required></div><button class="btn" type="submit">Guardar sesión estudiada</button></form></section></div>
  <div class="section-title"><h2>Agenda sugerida</h2></div><div class="card"><div class="planner-legend">Los temas se adaptan a tu progreso. Si modificás ejercicios o preferencias, las sugerencias pueden cambiar; tu registro de minutos permanece.</div>${[...grouped.entries()].map(([day,sessions])=>`<section class="planner-day"><h3>${weekdayNames[sessions[0].weekday]} · ${safe(day)} ${day===plan.today?'· Hoy':''}</h3>${sessions.map(item=>`<div class="planner-session"><div><b>${safe(item.title)}</b><p>${item.kind==='review'?'Repaso prioritario':'Práctica orientativa'} · ${item.minutes} min</p></div><button class="btn small ghost" data-action="prefill-study" data-topic="${item.topicId}" data-minutes="${item.minutes}">Registrar estudio</button></div>`).join('')}</section>`).join('')}</div>
  <div class="section-title"><h2>Mis últimas sesiones registradas</h2></div><div class="card">${recent.length?recent.map(entry=>`<div class="module"><div class="module-left"><span class="module-num">✓</span><div><b>${safe(TOPIC_BY_ID[entry.topicId].title)}</b><p>${safe(entry.date)} · Registrado por el estudiante</p></div></div><span class="pill good">${entry.minutes} min</span></div>`).join(''):'<div class="pad empty">Todavía no registraste sesiones de estudio.</div>'}</div>
  <p class="footnote">Este plan no crea tareas en Google Classroom ni Todoist, no envía notificaciones ni certifica la asistencia. No se comparte información con terceros.</p></div>`;
}

function diagnostic(){
  const done=app.attempts.filter(a=>a.mode==='diagnostic');
  return `<div class="page-head"><div><div class="eyebrow">Punto de partida · Matemática</div><h1>Descubrí qué reforzar</h1><p class="lead">Respondé ${TOPICS.length} preguntas exploratorias, una por tema. No recibís una nota ni se certifica dominio.</p></div></div>
  <div class="card pad" style="max-width:730px"><h2>Diagnóstico inicial</h2><p class="lead">Este recorrido detecta indicios de conocimientos previos. Cada respuesta genera una recomendación formativa.</p><div class="buttons">${button(done.length?'Repetir diagnóstico':'Empezar diagnóstico de '+TOPICS.length+' preguntas','start-diagnostic')}${button('Ver contenidos','navigate','ghost')}</div><p class="footnote">Podés aprender cualquier tema sin hacer el diagnóstico. Las respuestas quedan exclusivamente en este dispositivo.</p></div>
  <div class="section-title"><h2>Mapa orientativo</h2></div><div class="card">${TOPICS.map(t=>`<div class="module"><div class="module-left"><div class="module-num">${t.icon}</div><div><b>${safe(t.title)}</b><p>Estado de diagnóstico</p></div></div><span class="pill ${diagnosticStatus(app.attempts,t.id)==='Base detectada'?'good':''}">${diagnosticStatus(app.attempts,t.id)}</span></div>`).join('')}</div>`;
}
function activityView(){
  const s=app.activity; if(!s) return diagnostic();
  if (s.complete) return resultView();
  const question=['diagnostic','assessment','review'].includes(s.mode)?s.questions[s.index]:s.question;
  const title=s.mode==='diagnostic'?'Diagnóstico exploratorio':s.mode==='assessment'?'Evaluación: '+findUnit(s.unitId).title:s.mode==='review'?'Repaso inteligente':'Práctica: '+TOPIC_BY_ID[s.topicId].title;
  const count=['diagnostic','assessment','review'].includes(s.mode)?s.index+1:s.count+(s.feedback?0:1);
  const total=['diagnostic','assessment','review'].includes(s.mode)?s.questions.length:5;
  return `<div class="quiz"><div class="quiz-head"><div><div class="eyebrow">Motor pedagógico X</div><h1>${safe(title)}</h1></div><button class="btn small ghost" data-action="quit-activity">Salir</button></div>
  <div class="card pad"><div class="row" style="justify-content:space-between"><span class="tag">Pregunta ${count} de ${total}</span><span class="pill">Nivel ${question.level}</span></div>
  <div class="progress" style="margin-top:16px" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${count-1}" aria-label="Preguntas completadas"><div class="bar" style="width:${((count-1)/total)*100}%"></div></div>
  <h2 class="question">${safe(question.prompt)}</h2>${s.mode==='assessment'?'<p class="small subtle">Evaluación formativa: las respuestas se corrigen al finalizar las cinco preguntas.</p>':''}
  ${s.feedback ? `<div class="feedback ${s.feedback.correct?'correct':'incorrect'}" role="status"><strong>${s.feedback.correct?'✓ ¡Bien resuelto!':'↗ Todavía podés mejorarlo'}</strong><p>${safe(question.explanation)}</p>${s.feedback.correct?'':`<p><b>Pista para repasar:</b> ${safe(question.hint)}</p>`}</div>
    <div class="buttons">${button(count===total?'Ver resultados →':'Siguiente pregunta →','next-question')}${s.mode==='practice'?button('Volver a la clase','quit-activity','ghost'):''}</div>`
   : `<form id="answer-form"><div class="form-field"><label for="answer">Tu respuesta</label><input class="input answer-input" id="answer" name="answer" inputmode="decimal" autocomplete="off" spellcheck="false" required maxlength="48" placeholder="Ej.: 12 o 3/4" autofocus></div>
    <p class="small subtle">Se aceptan enteros, decimales con coma y fracciones.</p><div class="buttons"><button class="btn" type="submit">Comprobar respuesta →</button>${s.mode==='assessment'?'':'<button class="btn ghost" type="button" data-action="show-hint">Necesito una pista</button>'}</div>
    ${s.hintVisible?`<div class="notebox amber" style="margin-top:15px"><strong>Pista:</strong> ${safe(question.hint)}</div>`:''}</form>`}</div>
    <p class="footnote">Cada respuesta corregida se guarda como evidencia local. Podés abandonar sin perder las preguntas que ya respondiste.</p></div>`;
}
function resultView(){
  const s=app.activity, ok=s.results.filter(r=>r.correct).length;
  const recommended=recommendTopic(app.attempts,app.profile.track);
  const isDiag=s.mode==='diagnostic';
  const isAssessment=s.mode==='assessment';
  const isReview=s.mode==='review';
  const passed=isAssessment && s.results.length===5 && ok>=4;
  return `<div class="card pad result-card"><div class="result-emoji">${ok>=Math.ceil(s.results.length*0.8)?'🌟':'🌱'}</div><div class="eyebrow">${isDiag?'Diagnóstico finalizado':isAssessment?'Evaluación integradora completada':isReview?'Repaso completado':'Sesión completada'}</div><h1>Respondiste ${ok} de ${s.results.length} preguntas correctamente.</h1>
  <p class="lead" style="margin:16px auto">${isDiag?'Ya tenemos un primer mapa orientativo. No es una calificación escolar ni prueba dominio.':isAssessment?(passed?'Aprobaste esta unidad como hito de aprendizaje interno. No es acreditación oficial.':'Todavía no alcanzaste el criterio interno (4/5). Repasá los temas y volvé a evaluar.'):isReview?'Tus repasos se guardaron. Una respuesta incorrecta señala que conviene revisar la clase, no que perdiste una calificación.':'Cada intento es parte del aprendizaje. Tus avances se registraron y se compartirán entre Apoyo y Academia.'}</p>
  ${isAssessment?`<div class="notebox" style="text-align:left;margin-top:22px"><strong>Devolución de la evaluación:</strong>${s.results.map((a,i)=>{const q=QUESTION_BY_ID[a.questionId];return `<p><b>${i+1}. ${a.correct?'Correcto':'Para repasar'}</b> · ${safe(TOPIC_BY_ID[a.topic].title)}: ${safe(q.explanation)}</p>`}).join('')}</div>`:`<div class="notebox" style="text-align:left;margin-top:22px"><strong>Recomendación del Motor X:</strong> seguir con ${safe(recommended.title)}.</div>`}
  <div class="buttons" style="justify-content:center">${isAssessment?button('Volver a Mi Academia','navigate','ghost') .replace('data-action="navigate"','data-action="navigate" data-view="academy"'):isReview?'<button class="btn" data-action="navigate" data-view="reviews">Volver a mis repasos →</button>':button('Ir a la clase recomendada →','recommended')}${button('Ver mi progreso','go-progress','ghost')}</div></div>`;
}
function progress(){
  const total=app.attempts.filter(a=>a.mode==='practice').length;
  const correct=app.attempts.filter(a=>a.mode==='practice' && a.correct).length;
  const mastered=TOPICS.filter(t=>T(t).mastered).length;
  const last=app.attempts.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8);
  const dueCount=reviewPlan(app.attempts).due.length;
  return `<div class="page-head"><div><div class="eyebrow">Evidencia, no solamente calificaciones</div><h1>Tu progreso</h1><p class="lead">El dominio se calcula con respuestas recientes, diferentes preguntas y al menos una de dificultad intermedia.</p></div></div>
  <div class="grid stats"><div class="card stat"><span>Ejercicios de práctica</span><b>${total}</b></div><div class="card stat"><span>Respuestas correctas</span><b>${correct}</b></div><div class="card stat"><span>Temas dominados</span><b>${mastered}/${TOPICS.length}</b></div></div>
  <div class="notebox ${dueCount?'amber':''}" style="margin-top:18px"><strong>Repasos pendientes: ${dueCount}.</strong> <button class="muted-link" data-action="navigate" data-view="reviews">Consultar mi plan de repaso →</button></div>
  <div class="section-title"><h2>Dominio por tema</h2></div><div class="card">${TOPICS.map(t=>{const s=T(t);return `<div class="module"><div style="flex:1;max-width:750px"><div class="row" style="justify-content:space-between"><b>${safe(t.title)}</b><span class="small subtle">${s.status} · ${s.accuracy}% últimos intentos</span></div><div class="progress" style="margin-top:9px"><div class="bar" style="width:${s.progress}%"></div></div><p>${s.total} respuestas de práctica · ${s.distinct} preguntas distintas correctas recientemente</p></div></div>`}).join('')}</div>
  <div class="section-title"><h2>Actividad reciente</h2></div><div class="card">${last.length?last.map(a=>`<div class="module"><div class="module-left"><div class="module-num">${a.correct?'✓':'↗'}</div><div><b>${safe(TOPIC_BY_ID[a.topic]?.title||'Tema')}</b><p>${a.mode==='diagnostic'?'Diagnóstico':a.mode==='review'?'Repaso':a.mode==='assessment'?'Evaluación':'Práctica'} · ${trackTitle(a.track)} · ${fmt(a.date)}</p></div></div><span class="pill ${a.correct?'good':'mid'}">${a.correct?'Correcta':'Para repasar'}</span></div>`).join(''):`<div class="pad empty">Todavía no hay actividad registrada.</div>`}</div>
  <p class="footnote">Indicadores internos del piloto. No constituyen notas oficiales, certificados ni acreditaciones.</p>`;
}

function school(){
  const subjects=subjectsForGrade(app.profile.grade);
  return `<div class="stack"><div class="page-head"><div><div class="eyebrow">Apoyo escolar · secundaria argentina</div><h1>Mis materias de ${app.profile.grade}.º año</h1><p class="lead">Organizá tus trabajos por asignatura. Esta lista es orientativa y puede variar según la provincia, la escuela y la especialidad técnica.</p></div></div>
  <div class="notebox"><strong>Contenido educativo disponible:</strong> Matemática tiene clases, ejercicios y Profesor X. Las otras materias permiten registrar tareas, pero todavía no ofrecen cursos completos.</div>
  <section class="grid">${subjects.map(subject=>{const tasks=app.schoolTasks.filter(t=>t.subjectId===subject.id&&t.grade===app.profile.grade);const pending=tasks.filter(t=>t.status==='pending').length;return `<article class="card topic-card"><span class="topic-ico" aria-hidden="true">${subject.icon}</span><h3>${safe(subject.name)}</h3><p>${pending} pendientes · ${tasks.length} tareas registradas</p><div class="topic-footer">${subject.id==='matematica'?'<button class="btn small ghost" data-action="navigate" data-view="math">Ir a clases</button>':'<span class="tiny subtle">Agenda personal</span>'}<button class="btn small ghost" data-action="new-task" data-subject="${subject.id}">+ Tarea</button></div></article>`}).join('')}</section>
  <div class="buttons"><button class="btn" data-action="navigate" data-view="schoolTasks">Ver todas mis tareas →</button><button class="btn ghost" data-action="navigate" data-view="calendar">Abrir calendario</button></div></div>`;
}
function taskItem(task) {
  const today=localDayKey(new Date());const overdue=task.status==='pending'&&task.dueDate<today;
  const labels={high:'Alta',medium:'Media',low:'Baja'};
  return `<article class="school-task ${task.status==='done'?'school-done':''}">
    <div class="school-task-info"><div class="row" style="flex-wrap:wrap"><b>${safe(task.title)}</b><span class="pill ${task.status==='done'?'good':overdue?'mid':''}">${task.status==='done'?'Terminada':overdue?'Vencida':'Pendiente'}</span></div>
    <p>${safe(SUBJECT_BY_ID[task.subjectId]?.name||'Materia')} · ${task.grade}.º año · Entrega ${safe(task.dueDate)} · Prioridad ${labels[task.priority]}</p>
    ${task.notes?`<p class="school-task-note">${safe(task.notes)}</p>`:''}</div>
    <div class="school-task-actions"><button class="btn small ${task.status==='done'?'ghost':''}" data-action="toggle-task" data-task="${task.id}">${task.status==='done'?'Reabrir':'Terminar'}</button><button class="btn small ghost" data-action="edit-task" data-task="${task.id}">Editar</button><button class="btn small warn" data-action="delete-task" data-task="${task.id}" aria-label="Eliminar ${safe(task.title)}">Borrar</button></div>
  </article>`;
}
function schoolTasks(){
  const summary=summarizeSchoolTasks(app.schoolTasks);
  const filters=[['pending','Pendientes'],['overdue','Vencidas'],['all','Todas'],['done','Finalizadas']];
  const items=app.taskFilter==='pending'?summary.pending:app.taskFilter==='overdue'?summary.overdue:app.taskFilter==='done'?summary.completed:[...summary.pending,...summary.completed];
  const editing=app.schoolTasks.find(t=>t.id===app.taskEditing);
  const draft=editing||{title:'',notes:'',subjectId:'matematica',grade:app.profile.grade,dueDate:localDayKey(new Date()),priority:'medium'};
  return `<div class="stack"><header class="page-head"><div><div class="eyebrow">Gestión escolar personal · Local-First</div><h1>Mis tareas y entregas</h1><p class="lead">Organizá lo que te piden en la escuela o tus proyectos de Academia. No se envía ni entrega nada en plataformas externas.</p></div></header>
  <div class="grid stats"><div class="card stat"><span>Pendientes</span><b>${summary.pending.length}</b></div><div class="card stat"><span>Vencidas</span><b>${summary.overdue.length}</b></div><div class="card stat"><span>Para hoy</span><b>${summary.dueToday.length}</b></div></div>
  <div class="profile-grid"><section class="card pad"><h2>${editing?'Editar tarea':'Nueva tarea'}</h2><form id="school-task-form" style="margin-top:17px">
    <div class="form-field"><label for="task-title">Nombre de la tarea</label><input id="task-title" class="input" name="title" maxlength="120" required value="${safe(draft.title)}" placeholder="Ej.: Trabajo práctico de Biología"></div>
    <div class="profile-grid"><div class="form-field"><label for="task-subject">Materia</label><select id="task-subject" name="subjectId">${SUBJECTS.map(subject=>`<option value="${subject.id}" ${draft.subjectId===subject.id?'selected':''}>${safe(subject.name)}</option>`).join('')}</select></div>
    <div class="form-field"><label for="task-grade">Año</label><select id="task-grade" name="grade">${[1,2,3,4,5,6].map(year=>`<option value="${year}" ${draft.grade===year?'selected':''}>${year}.º</option>`).join('')}</select></div></div>
    <div class="profile-grid"><div class="form-field"><label for="task-date">Fecha de entrega</label><input class="input" type="date" id="task-date" name="dueDate" value="${draft.dueDate}" required></div>
    <div class="form-field"><label for="task-priority">Prioridad</label><select id="task-priority" name="priority">${[['medium','Media'],['high','Alta'],['low','Baja']].map(([id,label])=>`<option value="${id}" ${draft.priority===id?'selected':''}>${label}</option>`).join('')}</select></div></div>
    <div class="form-field"><label for="task-notes">Notas (opcional, máximo 500 caracteres)</label><textarea id="task-notes" name="notes" maxlength="500" placeholder="Consignas, materiales y recordatorios">${safe(draft.notes)}</textarea></div>
    <div class="buttons"><button class="btn" type="submit">${editing?'Guardar cambios':'Agregar tarea'}</button>${editing?'<button class="btn ghost" type="button" data-action="cancel-task-edit">Cancelar edición</button>':''}</div></form></section>
  <section class="card pad"><h2>Próximas entregas</h2><p class="lead">Los avisos aparecen dentro de EDUCACIÓN X cuando abrís la aplicación; no son notificaciones push.</p>
  ${(summary.overdue.length||summary.nextSevenDays.length)?[...new Map([...summary.overdue,...summary.nextSevenDays].map(t=>[t.id,t])).values()].slice(0,8).map(task=>`<div class="school-mini"><b>${safe(task.title)}</b><span>${safe(task.dueDate)} · ${safe(SUBJECT_BY_ID[task.subjectId]?.name)}</span></div>`).join(''):'<p class="empty">No hay entregas cercanas. ¡Muy bien!</p>'}
  <div class="buttons"><button class="btn ghost" data-action="navigate" data-view="calendar">Ver el calendario →</button></div></section></div>
  <div class="section-title"><h2>Listado de tareas</h2><span class="small subtle">${items.length} resultados</span></div><div class="school-filters" role="group" aria-label="Filtrar tareas">${filters.map(([id,label])=>`<button type="button" data-action="task-filter" data-filter="${id}" class="btn small ${app.taskFilter===id?'':'ghost'}" aria-pressed="${app.taskFilter===id}">${label}</button>`).join('')}</div>
  <div class="card">${items.length?items.map(taskItem).join(''):'<div class="pad empty">No hay tareas en este filtro. Podés crear una desde el formulario.</div>'}</div>
  <p class="footnote">Tus tareas permanecen en este navegador y se incluyen en tus copias de seguridad. Ninguna actividad se entrega automáticamente.</p></div>`;
}
function calendar(){
  const {year,month}=app.calendarMonth;
  const calendar=monthCalendar(year,month,app.schoolTasks);
  const selected=calendar.days.find(d=>d.date===app.selectedCalendarDay)?.tasks || app.schoolTasks.filter(t=>t.dueDate===app.selectedCalendarDay);
  const monthLabel=new Intl.DateTimeFormat('es-AR',{month:'long',year:'numeric'}).format(new Date(year,month-1,1,12));
  return `<div class="stack"><div class="page-head"><div><div class="eyebrow">Calendario sin conexión</div><h1>Mi calendario escolar</h1><p class="lead">Consultá vencimientos y tareas por día. Las fechas usan el calendario local del dispositivo.</p></div></div>
  <section class="card pad"><div class="calendar-controls"><button class="btn small ghost" data-action="calendar-month" data-direction="-1" aria-label="Mes anterior">←</button><h2 style="text-transform:capitalize">${safe(monthLabel)}</h2><button class="btn small ghost" data-action="calendar-month" data-direction="1" aria-label="Mes siguiente">→</button></div>
  <div class="calendar-grid" role="group" aria-label="Días del mes">${['L','M','M','J','V','S','D'].map((n,i)=>`<span class="calendar-weekday" aria-label="${['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'][i]}">${n}</span>`).join('')}
  ${calendar.days.map(d=>{const count=d.tasks.filter(t=>t.status==='pending').length;return `<button type="button" class="calendar-day ${d.inMonth?'':'other-month'} ${d.date===app.selectedCalendarDay?'selected':''} ${d.date===localDayKey(new Date())?'today':''}" data-action="calendar-day" data-date="${d.date}" aria-pressed="${d.date===app.selectedCalendarDay}" aria-label="${d.date}: ${count} tareas pendientes"><span>${d.day}</span>${count?`<small>${count} ${count===1?'tarea':'tareas'}</small>`:''}</button>`}).join('')}</div></section>
  <section class="card"><div class="pad"><h2>Entregas del ${safe(app.selectedCalendarDay)}</h2></div>${selected.length?selected.map(taskItem).join(''):'<p class="pad empty">Sin tareas para esta fecha.</p>'}</section>
  <div class="buttons"><button class="btn" data-action="navigate" data-view="schoolTasks">Agregar o administrar tareas →</button></div></div>`;
}

function settings(){
  return `<div class="page-head"><div><div class="eyebrow">Tus datos, bajo tu control</div><h1>Datos y privacidad</h1><p class="lead">EDUCACIÓN X Core funciona sin usuario en la nube. Podés guardar una copia de tu progreso y recuperarla en otro dispositivo.</p></div></div>
  <div class="profile-grid"><div class="card pad"><h2>Mi perfil local</h2><form id="profile-form" style="margin-top:20px"><div class="form-field"><label for="edit-name">Nombre visible</label><input id="edit-name" class="input" name="name" maxlength="45" value="${safe(app.profile.name)}" required></div>
  <div class="form-field"><label for="edit-grade">Año de secundaria</label><select id="edit-grade" name="grade">${[1,2,3,4,5,6].map(n=>`<option ${app.profile.grade===n?'selected':''} value="${n}">${n}.º año</option>`).join('')}</select></div>
  <button type="submit" class="btn">Guardar perfil</button></form></div>
  <div class="card pad"><h2>Respaldo y protección</h2><p class="lead">Guardamos perfil, respuestas, rutina y sesiones registradas en IndexedDB. El navegador puede borrar almacenamiento en algunas circunstancias; conservá copias regularmente.</p>
  <div class="buttons"><button class="btn" data-action="export">Descargar copia JSON</button><button class="btn ghost" data-action="pick-import">Importar copia</button><input class="hidden" id="backup-file" type="file" accept="application/json,.json"></div><div class="buttons"><button class="btn small ghost" data-action="persist">Solicitar almacenamiento persistente</button></div>
  <p class="footnote" id="storage-info">La copia JSON contiene nombre local, respuestas y sesiones estudiadas, sin cifrado. Guardala en un lugar privado.</p></div>
  <div class="card pad"><h2>Privacidad por diseño</h2><p class="lead">No incluimos analíticas, anuncios, cuentas externas, telemetría ni servicios de IA remotos. Las consultas del Profesor X se procesan localmente y no se guardan.</p><p class="footnote">Esta versión admite un solo perfil por navegador. No es apropiada para computadoras compartidas sin separación de usuarios.</p></div>
  <div class="card pad"><h2>Borrar mis datos</h2><p class="lead">Elimina definitivamente el perfil y todas las respuestas de este dispositivo. Primero exportá una copia si querés conservarlos.</p><div class="buttons"><button class="btn warn" data-action="clear">Eliminar perfil y progreso</button></div></div></div>`;
}
function render(){
  const screens={home,path,academy,reviews,planner,school,schoolTasks,calendar,math,diagnostic,progress,settings,lesson,activity:activityView};
  root.innerHTML = app.profile ? pageTemplate((screens[app.view]||home)()) : setup();
  const answer=document.getElementById('answer');
  if(answer) answer.focus({preventScroll:true});
}
function changeView(view){
  if (view==='lesson') {app.tutorReply=null;app.tutorState=null;}
  app.view=view;app.activity=null; render(); window.scrollTo({top:0,behavior:'auto'});
}

root.addEventListener('click',async event=>{
  const btn=event.target.closest('[data-action]');if(!btn||btn.disabled)return;
  const action=btn.dataset.action;
  try {
    if(action==='navigate') {changeView(btn.dataset.view||'math');return;}
    if(action==='go-progress'){changeView('progress');return;}
    if(action==='track'){
      if(!['support','academy'].includes(btn.dataset.track))return;
      app.profile.track=btn.dataset.track;await saveProfile(app.profile);render();flash('Recorrido actualizado. Tus conocimientos se mantienen.');return;
    }
    if(action==='new-task'){app.taskEditing=null;app.view='schoolTasks';app.taskFilter='pending';render();const field=document.getElementById('task-subject');if(field&&SUBJECT_BY_ID[btn.dataset.subject])field.value=btn.dataset.subject;document.getElementById('task-title')?.focus();return;}
    if(action==='task-filter'){if(!['pending','overdue','all','done'].includes(btn.dataset.filter))return;app.taskFilter=btn.dataset.filter;render();return;}
    if(action==='edit-task'){const task=app.schoolTasks.find(x=>x.id===btn.dataset.task);if(!task)return;app.taskEditing=task.id;app.view='schoolTasks';render();document.getElementById('task-title')?.focus();return;}
    if(action==='cancel-task-edit'){app.taskEditing=null;render();return;}
    if(action==='toggle-task'){const task=app.schoolTasks.find(x=>x.id===btn.dataset.task);if(!task)return;const done=task.status!=='done';const next=validateSchoolTask({...task,status:done?'done':'pending',completedAt:done?new Date().toISOString():null});await saveSchoolTask(next);app.schoolTasks=app.schoolTasks.map(t=>t.id===task.id?next:t);render();flash(done?'Tarea marcada como terminada.':'Tarea reabierta.');return;}
    if(action==='delete-task'){const task=app.schoolTasks.find(t=>t.id===btn.dataset.task);if(!task||!confirm('¿Eliminar esta tarea? Podés exportar una copia antes.'))return;await deleteSchoolTask(task.id);app.schoolTasks=app.schoolTasks.filter(t=>t.id!==task.id);if(app.taskEditing===task.id)app.taskEditing=null;render();flash('Tarea eliminada de este dispositivo.');return;}
    if(action==='calendar-month'){const direction=Number(btn.dataset.direction);if(![-1,1].includes(direction))return;const d=new Date(app.calendarMonth.year,app.calendarMonth.month-1+direction,1,12);if(d.getFullYear()<2000||d.getFullYear()>2199)return;app.calendarMonth={year:d.getFullYear(),month:d.getMonth()+1};app.selectedCalendarDay=localDayKey(d);render();return;}
    if(action==='calendar-day'){const key=btn.dataset.date;parseLocalDate(key);app.selectedCalendarDay=key;const day=parseLocalDate(key);app.calendarMonth={year:day.getFullYear(),month:day.getMonth()+1};render();return;}
    if(action==='recommended'){app.topicId=recommendTopic(app.attempts,app.profile.track).id;changeView('lesson');return;}
    if(action==='lesson'){app.topicId=btn.dataset.topic;changeView('lesson');return;}
    if(action==='prefill-study'){app.plannerDraft={date:localDayKey(new Date()),topicId:btn.dataset.topic,minutes:Number(btn.dataset.minutes)};render();document.getElementById('study-date')?.focus();return;}
    if(action==='start-review'){
      const questions=reviewDeck(app.attempts);
      if(!questions.length){flash('No hay repasos pendientes por ahora.');return;}
      app.activity={mode:'review',questions,index:0,results:[],feedback:null};app.view='activity';render();return;
    }
    if(action==='start-diagnostic'){app.activity={mode:'diagnostic',questions:diagnosticQuestions(),index:0,results:[],feedback:null};app.view='activity';render();return;}
    if(action==='start-assessment'){
      const unit=findUnit(btn.dataset.unit);
      if(!unit || !unitStatus(unit,app.attempts).ready){flash('Primero reuní evidencias de dominio en todos los temas de esta unidad.',true);return;}
      const sessionId=createSessionId();
      app.activity={mode:'assessment',unitId:unit.id,sessionId,questions:unitAssessmentQuestions(unit),index:0,results:[],feedback:null};app.view='activity';render();return;
    }
    if(action==='start-practice'){app.topicId=btn.dataset.topic;app.activity={mode:'practice',topicId:app.topicId,question:selectNextQuestion(app.topicId,app.attempts),count:0,results:[],feedback:null};app.view='activity';render();return;}
    if(action==='show-hint'){app.activity.hintVisible=true;render();return;}
    if(action==='next-question'){
      const s=app.activity;if(!s?.feedback)return;
      if(s.mode==='diagnostic'||s.mode==='review'){s.index++;if(s.index>=s.questions.length)s.complete=true;}
      else {if(s.count>=5)s.complete=true;else s.question=selectNextQuestion(s.topicId,app.attempts);}
      s.feedback=null;s.hintVisible=false;render();return;
    }
    if(action==='quit-activity'){changeView(app.activity?.mode==='practice'?'lesson':app.activity?.mode==='assessment'?'academy':app.activity?.mode==='review'?'reviews':'diagnostic');return;}
    if(action==='tutor-prompt'){const turn=tutorTurn(btn.dataset.prompt,TOPIC_BY_ID[app.topicId],app.attempts,app.profile.track,app.tutorState);app.tutorReply=turn.reply;app.tutorState=turn.state;render();return;}
    if(action==='export'){
      const backup={format:'educacion-x-backup-v1',exportedAt:new Date().toISOString(),profile:app.profile,attempts:app.attempts,planner:app.planner,studyEntries:app.studyEntries,schoolTasks:app.schoolTasks};
      const url=URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}));
      const link=document.createElement('a');link.href=url;link.download=`educacion-x-respaldo-${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
      flash('Copia preparada. Verificá la descarga en tu dispositivo.');return;
    }
    if(action==='pick-import'){document.getElementById('backup-file')?.click();return;}
    if(action==='persist'){
      if(!navigator.storage?.persist){flash('Este navegador no ofrece la solicitud de almacenamiento persistente.',true);return;}
      const granted=await navigator.storage.persist();
      flash(granted?'El navegador confirmó almacenamiento persistente. Conservá igualmente tus copias.':'El navegador no concedió almacenamiento persistente. Exportá copias periódicamente.',!granted);
      return;
    }
    if(action==='clear'){
      if(!confirm('¿Eliminar definitivamente el perfil y todo tu progreso local? Esta acción no se puede deshacer.'))return;
      await clearData();app.profile=null;app.attempts=[];app.studyEntries=[];app.schoolTasks=[];app.planner=defaultStudyPreferences();app.taskEditing=null;app.view='home';render();flash('Se borraron los datos de EDUCACIÓN X en este navegador.');return;
    }
  } catch(error){console.error(error);flash('No se pudo completar la acción: '+error.message,true);}
});

root.addEventListener('submit',async event=>{
  const form=event.target;if(!['setup-form','answer-form','tutor-form','profile-form','planner-form','study-form','school-task-form'].includes(form.id))return;
  event.preventDefault();
  try {
    const data=new FormData(form);
    if(form.id==='school-task-form'){
      const old=app.schoolTasks.find(t=>t.id===app.taskEditing);
      const task=validateSchoolTask({id:old?.id||createSessionId(),title:String(data.get('title')||''),notes:String(data.get('notes')||''),subjectId:String(data.get('subjectId')||''),grade:Number(data.get('grade')),dueDate:String(data.get('dueDate')||''),priority:String(data.get('priority')||'medium'),status:old?.status||'pending',createdAt:old?.createdAt||new Date().toISOString(),completedAt:old?.completedAt||null});
      await saveSchoolTask(task);app.schoolTasks=old?app.schoolTasks.map(t=>t.id===old.id?task:t):[...app.schoolTasks,task];app.taskEditing=null;render();flash(old?'Cambios guardados.':'Nueva tarea guardada en este dispositivo.');return;
    }
    if(form.id==='setup-form'){
      const profile={name:String(data.get('name')||'Estudiante').trim().slice(0,45)||'Estudiante',grade:Number(data.get('grade')),track:data.get('track')};
      await saveProfile(profile);app.profile=profile;render();return;
    }
    if(form.id==='profile-form'){
      const profile={...app.profile,name:String(data.get('name')||'Estudiante').trim().slice(0,45)||'Estudiante',grade:Number(data.get('grade'))};
      await saveProfile(profile);app.profile=profile;render();flash('Perfil guardado.');return;
    }
    if(form.id==='planner-form'){
      const days=data.getAll('days').map(Number);
      const next=normalizeStudyPreferences({weeklyGoalMinutes:Number(data.get('weeklyGoalMinutes')),sessionMinutes:Number(data.get('sessionMinutes')),days});
      await savePlanner(next);app.planner=next;app.plannerDraft=null;render();flash('Rutina semanal guardada en este dispositivo.');return;
    }
    if(form.id==='study-form'){
      const date=String(data.get('date')||'');
      if(date>localDayKey(new Date()))throw new Error('No se pueden registrar sesiones futuras.');
      const entry=validateStudyEntry({id:createSessionId(),date,topicId:String(data.get('topicId')),minutes:Number(data.get('minutes'))});
      await saveStudyEntry(entry);app.studyEntries.push(entry);app.plannerDraft=null;render();flash('Sesión registrada. No altera el dominio de la materia.');return;
    }
    if(form.id==='tutor-form'){
      const query=String(data.get('question')||'').trim();if(!query)return;
      const turn=tutorTurn(query,TOPIC_BY_ID[app.topicId],app.attempts,app.profile.track,app.tutorState);app.tutorReply=turn.reply;app.tutorState=turn.state;render();return;
    }
    if(form.id==='answer-form'){
      const s=app.activity;if(!s || s.feedback)return;
      const q=['diagnostic','assessment','review'].includes(s.mode)?s.questions[s.index]:s.question;
      const answer=String(data.get('answer')||'').trim();
      const checked=checkAnswer(q,answer);
      if(!checked.valid){flash(checked.message,true);return;}
      const attempt=buildAttempt(q,answer,s.mode,app.profile.track,s.mode==='assessment'?s.sessionId:null);
      await saveAttempt(attempt); // Solo mostrar resultado después de persistir la evidencia.
      app.attempts.push(attempt);s.results.push(attempt);if(s.mode==='practice')s.count++;
      if(s.mode==='assessment'){s.index++;if(s.index>=s.questions.length)s.complete=true;}
      else s.feedback={correct:attempt.correct};
      render();return;
    }
  }catch(error){console.error(error);flash('No se pudo guardar: '+error.message,true);}
});
root.addEventListener('change',async event=>{
  if(event.target.id!=='backup-file')return;
  const file=event.target.files?.[0];if(!file)return;
  if(file.size>8*1024*1024){flash('La copia es demasiado grande para esta importación (límite 8 MB).',true);return;}
  try{
    const data=validateSchoolBackup(JSON.parse(await file.text()));
    if(!confirm(`¿Reemplazar el perfil actual y sus ${app.attempts.length} registros por los ${data.attempts.length} de la copia? Esta acción no se puede deshacer.`))return;
    await replaceData(data.profile,data.attempts,data.planner,data.studyEntries,data.schoolTasks);
    app.profile=data.profile;app.attempts=data.attempts;app.planner=data.planner;app.studyEntries=data.studyEntries;app.schoolTasks=data.schoolTasks;app.taskEditing=null;app.view='home';render();flash('Copia importada correctamente.');
  }catch(error){console.error(error);flash('No se pudo importar: '+error.message,true);}
  finally{event.target.value='';}
});
window.addEventListener('online',()=>{const x=document.getElementById('connection');if(x){x.textContent='● Con red';x.classList.remove('off');}});
window.addEventListener('offline',()=>{const x=document.getElementById('connection');if(x){x.textContent='● Sin red';x.classList.add('off');}});

async function start(){
  try {
    await openDatabase();
    [app.profile,app.attempts,app.planner,app.studyEntries,app.schoolTasks]=await Promise.all([getProfile(),getAttempts(),getPlanner(),getStudyEntries(),getSchoolTasks()]);
    if(!app.planner)app.planner=defaultStudyPreferences();
    render();
    if('serviceWorker' in navigator && window.isSecureContext) {
      navigator.serviceWorker.register('./sw.js').catch(err=>console.warn('La instalación offline falló:',err));
    }
  }catch(error){
    console.error(error);
    root.innerHTML=`<div class="card error-screen"><h1>No se pudo abrir tu escuela</h1><p class="lead">${safe(error.message)}</p><p style="margin-top:15px">Para proteger tus respuestas no se usará almacenamiento temporal. Verificá los permisos del navegador, que no estés en modo privado y que haya espacio disponible.</p><button class="btn" onclick="location.reload()" style="margin-top:20px">Reintentar</button></div>`;
  }
}
start();
