# Arquitectura técnica — EDUCACIÓN X Core 0.4

## Límites del MVP

- **Cliente estático**: sin compilación, sin backend, sin dependencias CDN; JS nativo ES Modules, CSS, HTML5 y PWA.
- **Datos locales**: IndexedDB `educacion-x-core` v1 con object stores `profile` y `attempts`. Las escrituras confirman transacción antes de actualizar la interfaz.
- **Contenidos**: módulos de `data/curriculum.js` versionados con código. Se cachean por SW. En producción deberían versionarse los paquetes de curriculum y aplicar estrategias de migración.
- **Reglas pedagógicas**: `core/pedagogy.js`. No utiliza LLM remoto: selección determinista, normalización numérica y umbrales de evidencia transparentes.
- **Modalidades**: el campo `track` identifica el contexto de cada intento, pero el dominio se calcula **por competencia** de forma global, evitando progreso duplicado.
- **Respaldo**: archivo JSON con versión de formato y validación antes de una transacción de reemplazo atómica.
- **Offline**: precaché de HTML/CSS/JS/datos/íconos, respuesta cache-first. El SW solo intercepta requests GET del mismo origen dentro de su alcance.

## Objetos importantes

```js
// Perfil
{ name: 'Estudiante', grade: 2, track: 'support' | 'academy' }
// Intento
{ id, questionId, topic, mode: 'diagnostic' | 'practice' | 'assessment' | 'review',
  track: 'support' | 'academy', correct: true, answer: '3/4',
  date: '2026-10-13T05:00:00.000Z' }
```

## Criterio de dominio

No se confunde un acierto de diagnóstico con dominio. Para este prototipo se exige:

- Cinco ejercicios recientes del mismo tema.
- Cuatro o más correctos.
- Al menos tres identificadores distintos correctos.
- Al menos una respuesta correcta de nivel 2 o 3.

No constituye una nota ni certificación; requiere revisión empírica educativa.

## Decisiones de protección de datos

- Una instalación = un perfil local. No hay identificadores de cuenta globales ni analíticas.
- No sincronizar respuestas con terceros. El tutor local solo consulta el contenido del módulo.
- No usar `eval`, `Function` ni parsear expresiones JavaScript provenientes de los alumnos.
- Las exportaciones no están cifradas: los usuarios deben proteger el archivo.
- Migraciones IndexedDB versionadas y transacciones atómicas para evitar resultados falsamente confirmados.
- `navigator.storage.persist()` se pide únicamente si el usuario lo solicita.

## Pendientes antes de producción institucional

- Especificación pedagógica y revisión de docentes argentinos; mapeo exhaustivo de NAP y jurisdicciones.
- Pruebas reales Android/Chrome y navegador escritorio offline, migraciones y recuperabilidad de backups.
- Pruebas de carga y compatibilidad con almacenamiento limitado.
- Soporte multi-alumno y roles con autenticación y autorización del lado del servidor.
- Política de protección de menores, privacidad y cumplimiento legal.
- Auditoría independiente de seguridad, pruebas de accesibilidad y gobernanza curricular.
- Motor de aprendizaje más sólido: ejercicios generativos validados, repaso espaciado y explicaciones multimodales verificables.

**Regla principal:** El conocimiento local no depende de una API externa. Los servicios opcionales deben mejorar la experiencia sin impedir el estudio offline.

## V0.2 — Profesor X y ampliación

- `core/tutor.js` encapsula el tutor basado en reglas, sin llamadas de red. Consume `topicStats`, intentos y temario y devuelve explicaciones trazables.
- `data/curriculum.js`: 7 temas/56 preguntas. Los ID previos son inmutables para mantener restauración e historial.
- `app.js`: diagnóstico parametrizado por longitud del catálogo, plan personalizado por tema, nuevos accesos rápidos del tutor.
- No se cambia IndexedDB v1 ni el contrato de respaldo `educacion-x-backup-v1`; no se crean campos obligatorios nuevos.
- Se invalida caché estática PWA `educacion-x-core-v2`.
- Validación completa de SW y IndexedDB real en Android/localhost pendiente donde el navegador del entorno imponga bloqueo de red local.

## v0.3 — Academia basada en evidencias

- Currículo piloto: `core/academy.js` define un trayecto de 3 unidades y 7 temas; todos los materiales se pueden consultar independientemente del avance.
- Reglas de progreso: se desbloquea una evaluación cuando cada tema de la unidad tiene al menos 5 ejercicios recientes, 4 correctos, 3 identificadores correctos distintos y nivel intermedio.
- Evaluaciones: 5 ejercicios distintos, niveles variados; las sesiones se agrupan por `sessionId` aleatorio; menos de cinco respuestas no acreditan. Aprobación interna: 4/5 o más.
- Persistencia: se reutiliza IndexedDB v1 `attempts`; cada evaluación agrega `mode=assessment` y `sessionId`. Exportaciones mantienen `educacion-x-backup-v1`; las copias antiguas se siguen admitiendo sin cambios.
- Profesor X: `core/dialogue.js` añade una máquina de estados efímera para guiar paso a paso mediante contenido verificado del tema; no interpreta libremente todas las entradas.
- Seguridad: se mantiene la validación del valor numérico sin `eval`; corrección determinista; sin telemetría ni servicios de IA externos.
- Límite: estos logros no equivalen a notas, títulos ni promoción oficial de curso escolar.

## v0.4 — Agenda de repasos

- `core/review.js` recibe historial, tema y fecha inyectable; produce el estado (`not-started`, `scheduled`, `due`), la fecha de próximo repaso y un conjunto de preguntas no duplicadas por sesión.
- Los intervalos [1, 3, 7, 14, 30] días se amplían solo tras repaso correcto consecutivo; práctica reciente reinicia la cadencia; repaso incorrecto requiere revisión inmediata.
- No se otorga dominio por repaso; `topicStats` mantiene su criterio exclusivo sobre `mode=practice`. La sesión en UI devuelve corrección y explicación por pregunta.
- Una nueva modalidad `review` se incorpora al contrato `educacion-x-backup-v1` existente. No cambia la versión de IndexedDB, los IDs históricos ni las reglas de evaluación.
- `sw.js` precachea `core/review.js` con una nueva versión para renovación; todo se ejecuta offline sin transmisión a terceros.
- Limitaciones: los resultados no son calificaciones, las fechas dependen del reloj local, no hay notificaciones push, y la evaluación pedagógica de los intervalos está pendiente.

## Extensión v0.5 — Planificador académico seguro

- Se añaden las tablas `planner` (clave `active`) y `studyEntries` (`keyPath: id`) en **IndexedDB v2**, preservando `profile` y `attempts` de v1. Se realiza una migración aditiva; no se elimina ninguna evidencia educativa.
- `core/planner.js` maneja configuración, fechas locales ISO `YYYY-MM-DD`, recomendaciones reproducibles, y validación de los registros de tiempo. La distribución semanal tiene máximo cuatro sesiones por día y advierte metas que no entran en la disponibilidad seleccionada.
- **Nunca se infiere dominio del tiempo estudiado**: el dominio sigue perteneciendo a `core/pedagogy.js` y sus registros de práctica. No se generan notas ni certificados con estas sesiones.
- Se mantiene el formato `educacion-x-backup-v1` por compatibilidad, con campos opcionales `planner`, `studyEntries`. El validador rechaza entradas duplicadas, fechas imposibles, temas desconocidos y duraciones fuera de rango antes de cualquier transacción de importación.
- `replaceData` y `clearData` ahora abarcan cuatro object stores en transacciones atómicas. Una importación de respaldo antiguo inicializa plan y registros de tiempo vacíos, explícitamente.
- `sw.js` usa caché `educacion-x-core-v5` e incorpora `core/planner.js`; sin dependencias CDN ni servicios de red obligatorios.
- **Límite de validación:** la suite JS y smoke de Chromium con IndexedDB simulado son comprobaciones locales. Probar upgrade v1→v2 y recarga offline con un navegador seguro real sigue siendo obligatorio antes de liberar a instituciones.

## v0.6 — Gestión escolar Local-First

- `core/school.js`: catálogo orientativo de materias para los seis años, validador estricto de tareas (ID, título, notas, año, fecha local válida, prioridad y estado), resúmenes de vencimientos y calendario de 42 celdas de lunes a domingo. No calcula días civiles desde timestamps UTC, evitando desfases para las fechas de entrega.
- `core/storage.js`: migración **IndexedDB v2 → v3** aditiva, nuevo object store `schoolTasks` (keyPath `id`); create/update/delete usan transacciones `readwrite`. `replaceData` y `clearData` incluyen los **cinco** almacenes para consistencia de importaciones y borrado.
- Respaldo `educacion-x-backup-v1`: campo `schoolTasks` opcional; se valida y se rechazan IDs duplicados. Importación atómica entre `profile`, `attempts`, `planner`, `studyEntries` y `schoolTasks`.
- Las tareas son datos personales: no se transfieren a ninguna API, Classroom o servidor. No tienen calificaciones oficiales ni alteran el dominio pedagógico.
- Interfaz `app.js`: pantallas `school`, `schoolTasks` y `calendar`, botones de gestión con confirmación antes de borrar y escape HTML de contenido ingresado por el usuario.
- PWA: caché `educacion-x-core-v6`, incluyendo el módulo `core/school.js`. Una actualización requiere descargar una vez los nuevos recursos antes de usarla offline.

### Pruebas y límites

Se desarrolló con pruebas fallidas antes de las implementaciones de catálogo/tareas y migración IndexedDB. `npm test` ejecuta 41 pruebas automáticas. Chromium con almacenamiento simulado verifica navegación, formularios, edición, acciones de estado, respaldo y layout; este resultado **no certifica** el funcionamiento de IndexedDB o Service Worker en una instalación real. La prueba real con `localhost` fue bloqueada por el entorno y debe ejecutarse en un navegador sin esas restricciones.
