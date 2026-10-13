# EDUCACIÓN X Core — MVP 0.2.0

**Segunda escuela digital inteligente, en construcción.** Proyecto piloto de Matemática del ciclo básico de secundaria argentina, con dos modos vinculados: **Apoyo escolar** (refuerzo de temas) y **Academia independiente** (progresión sugerida).

> Este es un MVP funcional para probar los recorridos de aprendizaje. NO es una escuela autorizada, una plataforma multialumno de producción, un programa curricular completo ni un sistema que otorgue títulos oficiales.

## Qué funciona hoy

- Perfil local sin inicio de sesión; elección de año (1.º a 6.º) y modalidad educativa.
- Lecciones guiadas originales para números enteros, fracciones, proporcionalidad, ecuaciones lineales, porcentajes, potencias y funciones lineales.
- 56 ejercicios con autocorrección determinista, decimales con coma y respuestas fraccionarias (`3/4`); no se usa `eval`.
- Diagnóstico inicial orientativo de 7 preguntas (no concede dominio).
- Selección adaptativa de preguntas por reglas: aumenta o reduce el nivel según los últimos intentos y evita repetir preguntas hasta agotar el banco.
- Evidencia compartida entre Apoyo y Academia (registro de intentos y criterios de dominio).
- Profesor X v0.2: tutor guiado **basado en reglas**, que usa la evidencia local del alumno para sugerir estudio, revisar errores recientes, mostrar ejemplos, pasos y bases recomendadas. **No es un LLM ni entiende preguntas generales.**
- Almacenamiento local en IndexedDB; descarga e importación de respaldo JSON; borrado con confirmación; solicitud de persistencia de almacenamiento.
- PWA sin dependencias externas: Service Worker, precaché, íconos 192/512, manifiesto y rutas relativas compatibles con GitHub Pages.
- Interfaz adaptable a Android y escritorio.

## Evolución segura desde v0.1

- Mantenemos el nombre y la versión 1 de IndexedDB: no hay migración destructiva. Los 40 identificadores de ejercicios originales permanecen y se agregan 16 nuevos.
- Exportación e importación conservan `educacion-x-backup-v1` y los datos antiguos. Apoyo y Academia mantienen un único progreso.
- El tutor no envía preguntas ni respuestas a servidores; todas las inferencias son reglas pedagógicas transparentes. No hay IA generativa en esta versión.
- `sw.js` aumenta su versión de caché a `educacion-x-core-v2` e incorpora el nuevo módulo offline. El navegador debe completar la instalación de la nueva versión para usarla sin conexión.

## Ejecutar en PC (Python)

1. Descomprimí este ZIP.
2. Entrá por terminal a la carpeta `educacion-x-core`.
3. Ejecutá:

   ```bash
   python3 -m http.server 8080
   ```

4. Abrí `http://localhost:8080` en Chrome o Firefox.

No abras `index.html` mediante `file://`: **IndexedDB y especialmente el Service Worker pueden tener restricciones distintas**. La PWA necesita `localhost` o HTTPS para registrar el Service Worker.

### Instalar en Android / GitHub Pages

1. Creá un repositorio independiente, por ejemplo `Educacion-X`, evitando cualquier cambio a NEXUS-X.
2. Subí **el contenido** de esta carpeta a la raíz del repositorio (`index.html`, `sw.js`, `core/`, `data/`, etc.).
3. En GitHub: **Settings → Pages → Deploy from a branch → main → / (root)**.
4. Una vez publicado, abrí `https://TU_USUARIO.github.io/Educacion-X/` desde Chrome en Android.
5. Esperá a que cargue e instale el Service Worker (idealmente recargá una vez); luego elegí **Instalar aplicación** si el navegador ofrece esa opción.
6. Para probar offline: abrí la app online, completá una práctica, activá modo avión, cerrá y reabrí la app instalada, continuá otra práctica y verificá tus intentos en **Mi progreso**.

> Primera carga requiere red; solo después del precaché el programa podrá reabrirse sin Internet. Las cuotas de almacenamiento dependen del navegador y del dispositivo. Exportá una copia periódicamente.

## Pruebas

Con Node.js 20+:

```bash
npm test
```

Las pruebas cubren también las recomendaciones personalizadas, errores recientes, prerequisitos y compatibilidad de backups. El test visual simulado se ejecuta con `python3 tests/ui_smoke_mock.py` cuando Chromium y Playwright están disponibles. Existe `python3 tests/browser_real_smoke.py` para validar IndexedDB y Service Worker sobre localhost, que debe correrse fuera de entornos que bloqueen la navegación local.

Las pruebas cubren el banco curricular, corrección, seguridad del analizador numérico, diagnóstico vs dominio, selección adaptativa, formato de backups y presencia de recursos PWA.

Se ejecutó además un smoke test visual de la interfaz en Chromium **con una base IndexedDB simulada** (onboarding, lección, tutor, práctica, cambio de modalidad, diagnóstico y diseño móvil). No reemplaza una validación real de IndexedDB ni del Service Worker; esa validación queda **pendiente en localhost/HTTPS y Android**.

## Motor pedagógico propio: Método X 0.1

1. **Diagnóstico**: pregunta exploratoria por concepto, para orientar temas por reforzar.
2. **Enseñanza**: contenido original estructurado con objetivo, concepto, ejemplo y error frecuente.
3. **Práctica adaptativa**: dificultad de nivel 1, 2 o 3 según últimos tres aciertos.
4. **Feedback explicativo**: resultado, explicación y pista en errores.
5. **Evidencias**: cada intento almacena tema, pregunta, modalidad, corrección y fecha.
6. **Dominio**: entre los últimos cinco ejercicios de un tema, al menos cuatro correctos; mínimo tres preguntas distintas correctas y al menos una de nivel 2 o 3. Diagnósticos quedan excluidos.

Los avances se comparten por tema entre los recorridos. Una prueba de 5 preguntas no demuestra dominio escolar real: el indicador es una **aproximación inicial interna**, que deberá refinarse mediante pruebas educativas y revisión docente.

## Estructura del proyecto

```text
educacion-x-core/
├── index.html               # Entrada PWA
├── styles.css               # UI responsive
├── app.js                   # Interfaz, eventos y actividades
├── sw.js                    # Precaché local
├── manifest.webmanifest     # Instalación
├── assets/                  # Logos/iconos locales
├── core/
│   ├── pedagogy.js          # Reglas de aprendizaje, corrección, evidencias
│   └── storage.js           # IndexedDB y transacciones
├── data/
│   └── curriculum.js        # Contenidos originales y banco de preguntas
├── tests/                   # Tests unitarios y pruebas de interacción
├── ARQUITECTURA.md
└── package.json
```

## Privacidad, respaldo y límites

- Sin datos transferidos a servidores por el código actual; no incluye telemetría, anuncios ni APIs de IA.
- Usar un perfil local por instalación. En dispositivos compartidos, otros usuarios del mismo perfil de navegador podrían acceder a esos datos.
- Exportaciones JSON **no cifradas**: no compartir públicamente. La importación reemplaza todos los datos y requiere confirmación.
- IndexedDB no garantiza conservación absoluta: limpiar datos del sitio, modo privado o políticas de almacenamiento puede eliminarlos. Solicitar persistencia ayuda, pero no garantiza protección universal.
- No se recopila información identificatoria obligatoria: se admite un apodo.
- No hay cuentas institucionales, docente real, roles, sincronización ni certificación aún.
- En la próxima etapa, seguridad y privacidad de menores requerirán revisión especializada antes de conectar alumnos, docentes o familias.

## Referencia curricular

Se diseñó un piloto **inspirado en áreas generales** de los NAP de Matemática del ciclo básico, sin reproducir documentos oficiales ni afirmar cobertura completa por año o jurisdicción.

- [Educ.ar — NAP Matemática, Educación Secundaria, Ciclo Básico](https://www.educ.ar/recursos/110570/nap-matematica-educacion-secundaria-ciclo-basico)
- [Argentina.gob.ar — Núcleos de Aprendizajes Prioritarios](https://www.argentina.gob.ar/nucleos-de-aprendizaje-prioritarios)
- [MDN — Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers)

## Siguiente etapa propuesta

Ampliar el banco de tareas para evitar repetición a largo plazo; incorporar otras estrategias de evaluación y repaso espaciado, docentes revisores, herramientas de accesibilidad y distintos recorridos provinciales. Solo después: cuentas con permisos, sincronización cifrada, aulas institucionales y un tutor IA generativo supervisado, sin volverlo obligatorio para el aprendizaje offline.

## Límites pedagógicos de v0.2

- Sigue siendo un piloto del **ciclo básico y ampliación**, no un plan completo por año jurisdiccional.
- No reemplaza al profesor humano ni emite notas o certificaciones oficiales.
- El tutor reconoce un conjunto de intenciones en español; cuando una pregunta supera ese alcance, lo explica y propone opciones.
- No registra conversaciones del tutor, solo los intentos numéricos de las prácticas.
