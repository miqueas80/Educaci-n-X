# Arquitectura técnica — EDUCACIÓN X Core 0.1

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
{ id, questionId, topic, mode: 'diagnostic' | 'practice',
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
