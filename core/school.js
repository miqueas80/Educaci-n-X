// EDUCACIÓN X v0.6 — Gestión escolar personal, sin sincronizaciones ni titulaciones oficiales.
// Materias orientativas, no un diseño curricular jurisdiccional certificado.
import { validateStudyBackup, localDayKey } from './planner.js';

export const SUBJECTS = Object.freeze([
  {id:'matematica',name:'Matemática',years:[1,2,3,4,5,6],icon:'∑'},
  {id:'lengua',name:'Lengua y Literatura',years:[1,2,3,4,5,6],icon:'📖'},
  {id:'historia',name:'Historia',years:[1,2,3,4,5,6],icon:'🏛'},
  {id:'geografia',name:'Geografía',years:[1,2,3,4,5,6],icon:'🌎'},
  {id:'ingles',name:'Inglés',years:[1,2,3,4,5,6],icon:'🌐'},
  {id:'biologia',name:'Biología / Ciencias Naturales',years:[1,2,3,4,5,6],icon:'🧬'},
  {id:'fisica',name:'Física',years:[2,3,4,5,6],icon:'⚛'},
  {id:'quimica',name:'Química',years:[2,3,4,5,6],icon:'⚗'},
  {id:'tecnologia',name:'Tecnología',years:[1,2,3,4,5,6],icon:'⚙'},
  {id:'ciudadania',name:'Ciudadanía y Sociedad',years:[1,2,3,4,5,6],icon:'🤝'},
  {id:'otros',name:'Otra materia / Taller',years:[1,2,3,4,5,6],icon:'✎'}
]);
export const SUBJECT_BY_ID = Object.fromEntries(SUBJECTS.map(s=>[s.id,s]));
export function subjectsForGrade(grade) {
  if(!Number.isInteger(grade)||grade<1||grade>6)throw new Error('Año escolar inválido.');
  return SUBJECTS.filter(s=>s.years.includes(grade));
}
export function parseLocalDate(input) {
  if(typeof input!=='string'||!/^(20\d\d|21\d\d)-\d\d-\d\d$/.test(input))throw new Error('Fecha de entrega inválida.');
  const [y,m,d]=input.split('-').map(Number);
  const date=new Date(y,m-1,d,12);
  if(localDayKey(date)!==input)throw new Error('La fecha indicada no existe.');
  return date;
}
function isoDate(value){return typeof value==='string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString()===value;}
export function validateSchoolTask(input) {
  if(!input || typeof input!=='object'||Array.isArray(input))throw new Error('La tarea no es válida.');
  const {id,title,notes,subjectId,grade,dueDate,priority,status,createdAt,completedAt}=input;
  if(typeof id!=='string'||!/^[a-zA-Z0-9-]{6,100}$/.test(id))throw new Error('ID de tarea inválido.');
  if(typeof title!=='string'||!title.trim()||title.trim().length>120)throw new Error('Título requerido (máx. 120 caracteres).');
  if(typeof notes!=='string'||notes.length>500)throw new Error('Notas demasiado largas (máx. 500 caracteres).');
  if(!SUBJECT_BY_ID[subjectId])throw new Error('Materia desconocida.');
  subjectsForGrade(grade);
  parseLocalDate(dueDate);
  if(!['low','medium','high'].includes(priority))throw new Error('Prioridad inválida.');
  if(!['pending','done'].includes(status))throw new Error('Estado de tarea inválido.');
  if(!isoDate(createdAt))throw new Error('Fecha de creación inválida.');
  if((status==='done' && !isoDate(completedAt)) || (status==='pending' && completedAt!==null))throw new Error('Fecha de finalización inconsistente.');
  return {id,title:title.trim(),notes:notes.trim(),subjectId,grade,dueDate,priority,status,createdAt,completedAt};
}
export function validateSchoolBackup(data) {
  const prior=validateStudyBackup(data);
  const raw=data.schoolTasks===undefined?[]:data.schoolTasks;
  if(!Array.isArray(raw)||raw.length>10000)throw new Error('Las tareas de la copia son inválidas.');
  const seen=new Set();
  const schoolTasks=raw.map(row=>{
    const task=validateSchoolTask(row);
    if(seen.has(task.id))throw new Error('La copia contiene tareas duplicadas.');
    seen.add(task.id);return task;
  });
  return {...prior,schoolTasks};
}
export function summarizeSchoolTasks(tasks,now=new Date()) {
  const today=localDayKey(now);
  const last=new Date(now.getFullYear(),now.getMonth(),now.getDate()+7,12);
  const next=localDayKey(last);
  const compare=(a,b)=>a.dueDate.localeCompare(b.dueDate) || ({high:0,medium:1,low:2}[a.priority]-{high:0,medium:1,low:2}[b.priority])||a.createdAt.localeCompare(b.createdAt);
  const pending=tasks.filter(t=>t.status==='pending').sort(compare);
  const completed=tasks.filter(t=>t.status==='done').sort((a,b)=>b.completedAt.localeCompare(a.completedAt));
  return {today,pending,completed,overdue:pending.filter(t=>t.dueDate<today),dueToday:pending.filter(t=>t.dueDate===today),nextSevenDays:pending.filter(t=>t.dueDate>=today&&t.dueDate<=next)};
}
export function monthCalendar(year,month,tasks=[]) {
  if(!Number.isInteger(year)||year<2000||year>2199||!Number.isInteger(month)||month<1||month>12)throw new Error('Mes de calendario inválido.');
  const first=new Date(year,month-1,1,12);
  const offset=(first.getDay()+6)%7;
  const start=new Date(year,month-1,1-offset,12);
  const monthKey=`${year}-${String(month).padStart(2,'0')}`;
  const grouped=new Map();
  for(const task of tasks){if(!grouped.has(task.dueDate))grouped.set(task.dueDate,[]);grouped.get(task.dueDate).push(task);}
  const days=Array.from({length:42},(_,i)=>{const date=new Date(start);date.setDate(date.getDate()+i);const key=localDayKey(date);return {date:key,day:date.getDate(),inMonth:date.getMonth()===month-1,tasks:grouped.get(key)||[]};});
  return {monthKey,days};
}
