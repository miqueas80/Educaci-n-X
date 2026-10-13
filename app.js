import { TOPICS, TOPIC_BY_ID, QUESTION_BY_ID } from './data/curriculum.js';
import { checkAnswer, buildAttempt, topicStats, diagnosticStatus, recommendTopic, selectNextQuestion, diagnosticQuestions, validateBackup } from './core/pedagogy.js';
import {openDatabase, getProfile, saveProfile, getAttempts, saveAttempt, replaceData, clearData} from './core/storage.js';
import { learningAdvice, tutorReply } from './core/tutor.js';

const app = { profile:null, attempts:[], view:'home', topicId:'enteros', activity:null, tutorReply:null, tutorQuery:'', flash:null };
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
    ${navItem('home','⌂','Inicio')}${navItem('path','▦','Mis recorridos')}${navItem('math','∑','Matemática')}${navItem('diagnostic','◉','Diagnóstico')}${navItem('progress','◫','Mi progreso')}
  </nav><div class="navtitle" style="margin-top:23px">Mi cuenta</div><nav class="nav">${navItem('settings','⚙','Datos y privacidad')}</nav><div class="sidebar-spacer"></div>
  <div class="sidecard"><b><span class="side-dot"></span>Motor X Local</b><p>Sin cuentas externas ni envío de respuestas. El progreso se guarda en este dispositivo.</p></div></aside>`;
}
function mobileNav() { return `<nav class="mobile-nav" aria-label="Navegación móvil">${navItem('home','⌂','Inicio')}${navItem('path','▦','Rutas')}${navItem('math','∑','Mate')}${navItem('progress','◫','Progreso')}${navItem('settings','⚙','Datos')}</nav>`; }
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
  const title = {home:'Mi escuela digital',path:'Mis recorridos',math:'Matemática',diagnostic:'Diagnóstico inicial',progress:'Mi progreso',settings:'Privacidad y datos',lesson:'Aprender Matemática',activity:'Práctica guiada'}[app.view] ?? 'EDUCACIÓN X';
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
  return `<div class="stack"><div class="page-head"><div><div class="eyebrow">Un nuevo modo de aprender</div><h1>¡Hola, ${safe(app.profile.name)}! 👋</h1><p class="lead">Tu aprendizaje tiene un lugar propio. Elegí cómo avanzar hoy.</p></div>${selectTrack()}</div>
  <section class="hero"><div><div class="eyebrow">${isAcademy?'Tu segundo recorrido académico':'Tu compañero de escuela'}</div><h1>${isAcademy?'Una escuela que sigue tu ritmo.':'Lo que cuesta hoy, se aprende paso a paso.'}</h1><p>${isAcademy?'Recorré un programa progresivo y registrá tus competencias sin depender de tu escuela presencial.':'Reforzá lo que ves en clase, practicá sin presión y preparate para tu próxima evaluación.'}</p><div class="buttons">${button('Continuar: '+safe(recommended.title)+' →','recommended','white')}${button('Hacer diagnóstico','start-diagnostic','ghost')}</div></div></section>
  <section class="grid stats" aria-label="Resumen de progreso"><div class="card stat"><div class="stat-ico">◉</div><b>${sum}/${TOPICS.length}</b><span>Temas dominados</span></div><div class="card stat"><div class="stat-ico">✎</div><b>${practice}</b><span>Ejercicios realizados</span></div><div class="card stat"><div class="stat-ico">⌁</div><b>100%</b><span>Actividades locales</span></div></section>
  <div class="section-title"><h2>Mis temas de Matemática</h2><button class="muted-link" data-action="navigate" data-view="math">Ver todos →</button></div><section class="grid">${TOPICS.slice(0,3).map(topicCard).join('')}</section>
  <div class="notebox"><strong>Una sola trayectoria de aprendizaje.</strong> Apoyo y Academia comparten las evidencias de dominio. Cambiar de recorrido no elimina tus avances.</div></div>`;
}
function path(){
  const isAcademy=app.profile.track==='academy';
  const chosen = recommendTopic(app.attempts,app.profile.track);
  return `<header class="page-head"><div><div class="eyebrow">Trayectorias conectadas</div><h1>Mis recorridos</h1><p class="lead">Dos modalidades, un mismo mapa de conocimientos y evidencias compartidas.</p></div>${selectTrack()}</header>
  <section class="grid two"><div class="card pad"><span class="topic-ico">🏫</span><h2 style="margin:13px 0 7px">Apoyo escolar</h2><p class="lead">Elegí cualquier tema que estés viendo en tu escuela. Priorizamos los conceptos que necesitás reforzar.</p><div class="buttons"><button data-action="track" data-track="support" class="btn ${!isAcademy?'ghost':''}">${!isAcademy?'Recorrido activo':'Elegir Apoyo'}</button></div></div>
  <div class="card pad"><span class="topic-ico">🎓</span><h2 style="margin:13px 0 7px">Academia independiente</h2><p class="lead">Seguí una secuencia recomendada de conceptos. Podés explorar cualquier módulo si querés.</p><div class="buttons"><button data-action="track" data-track="academy" class="btn ${isAcademy?'ghost':''}">${isAcademy?'Recorrido activo':'Elegir Academia'}</button></div></div></section>
  <div class="section-title"><h2>${isAcademy?'Itinerario de Matemática · ciclo básico y ampliación':'Temas disponibles para reforzar'}</h2><span class="small subtle">Propuesta piloto, no plan oficial completo</span></div>
  <div class="card">${TOPICS.map((t,i)=>`<div class="module"><div class="module-left"><span class="module-num">${i+1}</span><div><b>${safe(t.title)}</b><p>${T(t).status} · ${safe(t.level)}${t.id===chosen.id?' · Recomendado':''}</p></div></div><div class="row"><span class="pill ${T(t).mastered?'good':'mid'}">${T(t).progress}%</span><button class="btn small ghost" data-action="lesson" data-topic="${t.id}">Abrir</button></div></div>`).join('')}</div>
  <p class="footnote">EDUCACIÓN X no reemplaza la inscripción a una institución educativa oficial y no expide títulos reconocidos.</p>`;
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
  <aside class="tutor"><div class="tutor-icon">✦</div><h3>Profesor X · Método X v0.2</h3><p class="small subtle" style="margin-top:7px">Uso tu progreso real para darte pistas y explicaciones del tema. Funciono sin Internet.</p><div class="tutor-message" role="status">${safe(app.tutorReply ?? '¿Querés otro ejemplo, un consejo para resolver o repasar el error frecuente?')}</div>
  <div class="buttons"><button class="btn small ghost" data-action="tutor-prompt" data-prompt="ejemplo">Ejemplo</button><button class="btn small ghost" data-action="tutor-prompt" data-prompt="pasos">Pasos</button><button class="btn small ghost" data-action="tutor-prompt" data-prompt="error">Repasar error</button><button class="btn small ghost" data-action="tutor-prompt" data-prompt="mi avance">Mi avance</button></div>
  <form id="tutor-form" style="margin-top:18px"><label for="tutor-input" class="small"><b>Tu pregunta</b></label><textarea class="input" id="tutor-input" name="question" maxlength="300" placeholder="Ej.: ¿Me explicás los pasos?" style="margin-top:7px"></textarea><button type="submit" class="btn small">Preguntar</button></form><p class="footnote">Tutor guiado basado en reglas y evidencias locales. No es un modelo generativo ni entiende consultas libres fuera del contenido.</p></aside></div>`;
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
  const question=s.mode==='diagnostic'?s.questions[s.index]:s.question;
  const title=s.mode==='diagnostic'?'Diagnóstico exploratorio':'Práctica: '+TOPIC_BY_ID[s.topicId].title;
  const count=s.mode==='diagnostic'?s.index+1:s.count+(s.feedback?0:1);
  const total=s.mode==='diagnostic'?s.questions.length:5;
  return `<div class="quiz"><div class="quiz-head"><div><div class="eyebrow">Motor pedagógico X</div><h1>${safe(title)}</h1></div><button class="btn small ghost" data-action="quit-activity">Salir</button></div>
  <div class="card pad"><div class="row" style="justify-content:space-between"><span class="tag">Pregunta ${count} de ${total}</span><span class="pill">Nivel ${question.level}</span></div>
  <div class="progress" style="margin-top:16px" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${count-1}" aria-label="Preguntas completadas"><div class="bar" style="width:${((count-1)/total)*100}%"></div></div>
  <h2 class="question">${safe(question.prompt)}</h2>
  ${s.feedback ? `<div class="feedback ${s.feedback.correct?'correct':'incorrect'}" role="status"><strong>${s.feedback.correct?'✓ ¡Bien resuelto!':'↗ Todavía podés mejorarlo'}</strong><p>${safe(question.explanation)}</p>${s.feedback.correct?'':`<p><b>Pista para repasar:</b> ${safe(question.hint)}</p>`}</div>
    <div class="buttons">${button(count===total?'Ver resultados →':'Siguiente pregunta →','next-question')}${s.mode==='practice'?button('Volver a la clase','quit-activity','ghost'):''}</div>`
   : `<form id="answer-form"><div class="form-field"><label for="answer">Tu respuesta</label><input class="input answer-input" id="answer" name="answer" inputmode="decimal" autocomplete="off" spellcheck="false" required maxlength="48" placeholder="Ej.: 12 o 3/4" autofocus></div>
    <p class="small subtle">Se aceptan enteros, decimales con coma y fracciones.</p><div class="buttons"><button class="btn" type="submit">Comprobar respuesta →</button><button class="btn ghost" type="button" data-action="show-hint">Necesito una pista</button></div>
    ${s.hintVisible?`<div class="notebox amber" style="margin-top:15px"><strong>Pista:</strong> ${safe(question.hint)}</div>`:''}</form>`}</div>
    <p class="footnote">Cada respuesta corregida se guarda como evidencia local. Podés abandonar sin perder las preguntas que ya respondiste.</p></div>`;
}
function resultView(){
  const s=app.activity, ok=s.results.filter(r=>r.correct).length;
  const recommended=recommendTopic(app.attempts,app.profile.track);
  const isDiag=s.mode==='diagnostic';
  return `<div class="card pad result-card"><div class="result-emoji">${ok>=Math.ceil(s.results.length*0.8)?'🌟':'🌱'}</div><div class="eyebrow">${isDiag?'Diagnóstico finalizado':'Sesión completada'}</div><h1>Respondiste ${ok} de ${s.results.length} preguntas correctamente.</h1>
  <p class="lead" style="margin:16px auto">${isDiag?'Ya tenemos un primer mapa orientativo. No es una calificación escolar ni prueba dominio.':'Cada intento es parte del aprendizaje. Tus avances se registraron y se compartirán entre Apoyo y Academia.'}</p>
  <div class="notebox" style="text-align:left;margin-top:22px"><strong>Recomendación del Motor X:</strong> seguir con ${safe(recommended.title)}.</div>
  <div class="buttons" style="justify-content:center">${button('Ir a la clase recomendada →','recommended')}${button('Ver mi progreso','go-progress','ghost')}</div></div>`;
}
function progress(){
  const total=app.attempts.filter(a=>a.mode==='practice').length;
  const correct=app.attempts.filter(a=>a.mode==='practice' && a.correct).length;
  const mastered=TOPICS.filter(t=>T(t).mastered).length;
  const last=app.attempts.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8);
  return `<div class="page-head"><div><div class="eyebrow">Evidencia, no solamente calificaciones</div><h1>Tu progreso</h1><p class="lead">El dominio se calcula con respuestas recientes, diferentes preguntas y al menos una de dificultad intermedia.</p></div></div>
  <div class="grid stats"><div class="card stat"><span>Ejercicios de práctica</span><b>${total}</b></div><div class="card stat"><span>Respuestas correctas</span><b>${correct}</b></div><div class="card stat"><span>Temas dominados</span><b>${mastered}/${TOPICS.length}</b></div></div>
  <div class="section-title"><h2>Dominio por tema</h2></div><div class="card">${TOPICS.map(t=>{const s=T(t);return `<div class="module"><div style="flex:1;max-width:750px"><div class="row" style="justify-content:space-between"><b>${safe(t.title)}</b><span class="small subtle">${s.status} · ${s.accuracy}% últimos intentos</span></div><div class="progress" style="margin-top:9px"><div class="bar" style="width:${s.progress}%"></div></div><p>${s.total} respuestas de práctica · ${s.distinct} preguntas distintas correctas recientemente</p></div></div>`}).join('')}</div>
  <div class="section-title"><h2>Actividad reciente</h2></div><div class="card">${last.length?last.map(a=>`<div class="module"><div class="module-left"><div class="module-num">${a.correct?'✓':'↗'}</div><div><b>${safe(TOPIC_BY_ID[a.topic]?.title||'Tema')}</b><p>${a.mode==='diagnostic'?'Diagnóstico':'Práctica'} · ${trackTitle(a.track)} · ${fmt(a.date)}</p></div></div><span class="pill ${a.correct?'good':'mid'}">${a.correct?'Correcta':'Para repasar'}</span></div>`).join(''):`<div class="pad empty">Todavía no hay actividad registrada.</div>`}</div>
  <p class="footnote">Indicadores internos del piloto. No constituyen notas oficiales, certificados ni acreditaciones.</p>`;
}
function settings(){
  return `<div class="page-head"><div><div class="eyebrow">Tus datos, bajo tu control</div><h1>Datos y privacidad</h1><p class="lead">EDUCACIÓN X Core funciona sin usuario en la nube. Podés guardar una copia de tu progreso y recuperarla en otro dispositivo.</p></div></div>
  <div class="profile-grid"><div class="card pad"><h2>Mi perfil local</h2><form id="profile-form" style="margin-top:20px"><div class="form-field"><label for="edit-name">Nombre visible</label><input id="edit-name" class="input" name="name" maxlength="45" value="${safe(app.profile.name)}" required></div>
  <div class="form-field"><label for="edit-grade">Año de secundaria</label><select id="edit-grade" name="grade">${[1,2,3,4,5,6].map(n=>`<option ${app.profile.grade===n?'selected':''} value="${n}">${n}.º año</option>`).join('')}</select></div>
  <button type="submit" class="btn">Guardar perfil</button></form></div>
  <div class="card pad"><h2>Respaldo y protección</h2><p class="lead">Guardamos perfil y respuestas en IndexedDB. El navegador puede borrar almacenamiento en algunas circunstancias; conservá copias regularmente.</p>
  <div class="buttons"><button class="btn" data-action="export">Descargar copia JSON</button><button class="btn ghost" data-action="pick-import">Importar copia</button><input class="hidden" id="backup-file" type="file" accept="application/json,.json"></div><div class="buttons"><button class="btn small ghost" data-action="persist">Solicitar almacenamiento persistente</button></div>
  <p class="footnote" id="storage-info">La copia JSON contiene respuestas y nombre local, sin cifrado. Guardala en un lugar privado.</p></div>
  <div class="card pad"><h2>Privacidad por diseño</h2><p class="lead">No incluimos analíticas, anuncios, cuentas externas, telemetría ni servicios de IA remotos. Las consultas del Profesor X se procesan localmente y no se guardan.</p><p class="footnote">Esta versión admite un solo perfil por navegador. No es apropiada para computadoras compartidas sin separación de usuarios.</p></div>
  <div class="card pad"><h2>Borrar mis datos</h2><p class="lead">Elimina definitivamente el perfil y todas las respuestas de este dispositivo. Primero exportá una copia si querés conservarlos.</p><div class="buttons"><button class="btn warn" data-action="clear">Eliminar perfil y progreso</button></div></div></div>`;
}
function render(){
  const screens={home,path,math,diagnostic,progress,settings,lesson,activity:activityView};
  root.innerHTML = app.profile ? pageTemplate((screens[app.view]||home)()) : setup();
  const answer=document.getElementById('answer');
  if(answer) answer.focus({preventScroll:true});
}
function changeView(view){
  if (view==='lesson') app.tutorReply=null;
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
    if(action==='recommended'){app.topicId=recommendTopic(app.attempts,app.profile.track).id;changeView('lesson');return;}
    if(action==='lesson'){app.topicId=btn.dataset.topic;changeView('lesson');return;}
    if(action==='start-diagnostic'){app.activity={mode:'diagnostic',questions:diagnosticQuestions(),index:0,results:[],feedback:null};app.view='activity';render();return;}
    if(action==='start-practice'){app.topicId=btn.dataset.topic;app.activity={mode:'practice',topicId:app.topicId,question:selectNextQuestion(app.topicId,app.attempts),count:0,results:[],feedback:null};app.view='activity';render();return;}
    if(action==='show-hint'){app.activity.hintVisible=true;render();return;}
    if(action==='next-question'){
      const s=app.activity;if(!s?.feedback)return;
      if(s.mode==='diagnostic'){s.index++;if(s.index>=s.questions.length)s.complete=true;}
      else {if(s.count>=5)s.complete=true;else s.question=selectNextQuestion(s.topicId,app.attempts);}
      s.feedback=null;s.hintVisible=false;render();return;
    }
    if(action==='quit-activity'){changeView(app.activity?.mode==='practice'?'lesson':'diagnostic');return;}
    if(action==='tutor-prompt'){app.tutorReply=tutorReply(btn.dataset.prompt,TOPIC_BY_ID[app.topicId],app.attempts,app.profile.track);render();return;}
    if(action==='export'){
      const backup={format:'educacion-x-backup-v1',exportedAt:new Date().toISOString(),profile:app.profile,attempts:app.attempts};
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
      await clearData();app.profile=null;app.attempts=[];app.view='home';render();flash('Se borraron los datos de EDUCACIÓN X en este navegador.');return;
    }
  } catch(error){console.error(error);flash('No se pudo completar la acción: '+error.message,true);}
});

root.addEventListener('submit',async event=>{
  const form=event.target;if(!['setup-form','answer-form','tutor-form','profile-form'].includes(form.id))return;
  event.preventDefault();
  try {
    const data=new FormData(form);
    if(form.id==='setup-form'){
      const profile={name:String(data.get('name')||'Estudiante').trim().slice(0,45)||'Estudiante',grade:Number(data.get('grade')),track:data.get('track')};
      await saveProfile(profile);app.profile=profile;render();return;
    }
    if(form.id==='profile-form'){
      const profile={...app.profile,name:String(data.get('name')||'Estudiante').trim().slice(0,45)||'Estudiante',grade:Number(data.get('grade'))};
      await saveProfile(profile);app.profile=profile;render();flash('Perfil guardado.');return;
    }
    if(form.id==='tutor-form'){
      const query=String(data.get('question')||'').trim();if(!query)return;
      app.tutorReply=tutorReply(query,TOPIC_BY_ID[app.topicId],app.attempts,app.profile.track);render();return;
    }
    if(form.id==='answer-form'){
      const s=app.activity;if(!s || s.feedback)return;
      const q=s.mode==='diagnostic'?s.questions[s.index]:s.question;
      const answer=String(data.get('answer')||'').trim();
      const checked=checkAnswer(q,answer);
      if(!checked.valid){flash(checked.message,true);return;}
      const attempt=buildAttempt(q,answer,s.mode,app.profile.track);
      await saveAttempt(attempt); // Solo mostrar resultado después de persistir la evidencia.
      app.attempts.push(attempt);s.results.push(attempt);if(s.mode==='practice')s.count++;
      s.feedback={correct:attempt.correct};render();return;
    }
  }catch(error){console.error(error);flash('No se pudo guardar: '+error.message,true);}
});
root.addEventListener('change',async event=>{
  if(event.target.id!=='backup-file')return;
  const file=event.target.files?.[0];if(!file)return;
  if(file.size>8*1024*1024){flash('La copia es demasiado grande para esta importación (límite 8 MB).',true);return;}
  try{
    const data=validateBackup(JSON.parse(await file.text()));
    if(!confirm(`¿Reemplazar el perfil actual y sus ${app.attempts.length} registros por los ${data.attempts.length} de la copia? Esta acción no se puede deshacer.`))return;
    await replaceData(data.profile,data.attempts);
    app.profile=data.profile;app.attempts=data.attempts;app.view='home';render();flash('Copia importada correctamente.');
  }catch(error){console.error(error);flash('No se pudo importar: '+error.message,true);}
  finally{event.target.value='';}
});
window.addEventListener('online',()=>{const x=document.getElementById('connection');if(x){x.textContent='● Con red';x.classList.remove('off');}});
window.addEventListener('offline',()=>{const x=document.getElementById('connection');if(x){x.textContent='● Sin red';x.classList.add('off');}});

async function start(){
  try {
    await openDatabase();
    [app.profile,app.attempts]=await Promise.all([getProfile(),getAttempts()]);
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
