// Contenido original de demostración, inspirado en áreas generales de los NAP de Matemática.
// No reproduce textos oficiales ni reemplaza un diseño curricular jurisdiccional.
const q = (id, topic, level, prompt, answer, explanation, hint, choices = null) => ({
  id, topic, level, prompt, answer, explanation, hint, choices
});

export const TOPICS = [
  {
    id: 'enteros', order: 1, icon: '±', title: 'Números enteros', tag: 'Números y operaciones',
    duration: '15 min', level: 'Ciclo básico',
    objective: 'Interpretar y operar con números positivos y negativos.',
    intro: 'Los números enteros incluyen positivos, negativos y cero. Son útiles para representar temperaturas, pisos bajo tierra y deudas.',
    concept: 'Sumar un número negativo equivale a restar. Restar un negativo equivale a sumar.',
    example: 'Si estamos a −3 °C y la temperatura sube 5 °C: −3 + 5 = 2 °C.',
    steps: ['Identificá los signos.', 'Representá el cambio en una recta numérica.', 'Realizá la operación y comprobá si el signo tiene sentido.'],
    mistake: 'Confundir −3 + 5 con −8. Cuando los signos son distintos, se comparan los valores absolutos.',
    application: 'Temperaturas, deudas, alturas relativas y movimientos.', prereqs: [],
  },
  {
    id: 'fracciones', order: 2, icon: '½', title: 'Fracciones y decimales', tag: 'Números racionales',
    duration: '20 min', level: 'Ciclo básico',
    objective: 'Representar, comparar y operar con fracciones sencillas.',
    intro: 'Una fracción indica partes de una unidad. En 3/4, el denominador 4 divide la unidad y el numerador 3 indica cuántas partes tomamos.',
    concept: 'Para sumar fracciones con igual denominador, se suman los numeradores. Con distinto denominador, se busca uno común.',
    example: '1/2 + 1/4 = 2/4 + 1/4 = 3/4. También 3/4 equivale a 0,75.',
    steps: ['Identificá numerador y denominador.', 'Convertí a denominadores comunes cuando sea necesario.', 'Operá y simplificá si podés.'],
    mistake: 'Sumar denominadores: 1/2 + 1/4 NO es 2/6.',
    application: 'Recetas, mediciones, reparto y comparación de cantidades.', prereqs: ['enteros'],
  },
  {
    id: 'proporcionalidad', order: 3, icon: '∝', title: 'Proporcionalidad', tag: 'Relaciones y funciones',
    duration: '20 min', level: 'Ciclo básico',
    objective: 'Reconocer relaciones directamente proporcionales y resolver situaciones.',
    intro: 'Dos cantidades son directamente proporcionales si al multiplicar una por cierto factor, la otra cambia por el mismo factor.',
    concept: 'La razón y/x es constante cuando y = k·x. El valor k se llama constante de proporcionalidad.',
    example: 'Si 2 cuadernos cuestan $600, 1 cuesta $300 y 5 cuestan $1500.',
    steps: ['Identificá las dos magnitudes.', 'Calculá cuánto corresponde a una unidad.', 'Multiplicá por la cantidad buscada y revisá las unidades.'],
    mistake: 'Aplicar regla de tres cuando existe un costo fijo o la relación no es proporcional.',
    application: 'Compras, recetas, mapas y escalas.', prereqs: ['fracciones'],
  },
  {
    id: 'ecuaciones', order: 4, icon: 'x=', title: 'Ecuaciones lineales', tag: 'Álgebra',
    duration: '25 min', level: 'Ciclo básico',
    objective: 'Resolver ecuaciones de primer grado con una incógnita.',
    intro: 'Una ecuación expresa que dos cantidades son iguales. La incógnita representa el valor que debemos encontrar.',
    concept: 'Para conservar la igualdad, una operación que se realiza en un miembro debe realizarse también en el otro.',
    example: '3x + 4 = 19. Restamos 4 a ambos lados: 3x = 15. Dividimos por 3: x = 5.',
    steps: ['Agrupá términos para aislar la incógnita.', 'Aplicá la misma operación a ambos miembros.', 'Reemplazá el valor hallado para verificar.'],
    mistake: 'Cambiar de lado un número sin comprender qué operación inversa se aplica.',
    application: 'Precios desconocidos, longitudes y problemas con cantidades.', prereqs: ['enteros'],
  },
  {
    id: 'porcentajes', order: 5, icon: '%', title: 'Porcentajes', tag: 'Números y operaciones',
    duration: '20 min', level: 'Ciclo básico',
    objective: 'Calcular porcentajes y aplicarlos a situaciones cotidianas.',
    intro: 'Un porcentaje representa una cantidad por cada 100. Por ejemplo, 25 % significa 25 de cada 100.',
    concept: 'El p % de una cantidad N es N·p/100. Para un descuento, restamos ese resultado al precio original.',
    example: 'El 20 % de $1500 es 1500·20/100 = $300. Con descuento, pagamos $1200.',
    steps: ['Identificá el total.', 'Transformá el porcentaje en una fracción sobre 100.', 'Multiplicá y decidí si hay que sumar o restar.'],
    mistake: 'Confundir el descuento calculado con el precio final.',
    application: 'Descuentos, intereses simples, encuestas y estadísticas.', prereqs: ['proporcionalidad'],
  }
];

export const QUESTIONS = [
  q('e1','enteros',1,'¿Cuánto es −4 + 7?',3,'−4 + 7 = 3: desde −4 avanzamos 7 unidades.','Pensá cuánto le falta a −4 para llegar a 0.'),
  q('e2','enteros',1,'¿Cuánto es 5 − 9?',-4,'5 − 9 = −4: retrocedemos 9 unidades desde 5.','En una recta, moverte a la izquierda significa restar.'),
  q('e3','enteros',1,'¿Cuánto es −6 + 2?',-4,'Desde −6 avanzamos 2 unidades y llegamos a −4.','El valor absoluto mayor es 6.'),
  q('e4','enteros',2,'¿Cuánto es −8 − (−3)?',-5,'Restar un negativo equivale a sumar: −8 + 3 = −5.','Dos signos menos consecutivos en esta resta producen una suma.'),
  q('e5','enteros',2,'¿Cuánto es (−4) × (−3)?',12,'El producto de dos números negativos es positivo: 12.','Revisá la regla de signos para multiplicación.'),
  q('e6','enteros',2,'La temperatura era −2 °C y bajó 6 °C. ¿A cuánto llegó?',-8,'Una baja de 6 se representa como −2 − 6 = −8 °C.','Bajar significa restar.'),
  q('e7','enteros',3,'¿Cuánto es −3 × (4 − 9)?',15,'Primero 4 − 9 = −5; después −3 × −5 = 15.','Resolvé los paréntesis primero.'),
  q('e8','enteros',3,'¿Cuánto es (−18 ÷ 3) + (−2 × 4)?',-14,'−18 ÷ 3 = −6 y −2 × 4 = −8; total −14.','Resolvé multiplicación y división antes de sumar.'),

  q('f1','fracciones',1,'¿Qué valor decimal representa 1/2?',0.5,'1 ÷ 2 = 0,5.','Dividí el numerador por el denominador.'),
  q('f2','fracciones',1,'¿Qué valor decimal representa 3/4?',0.75,'3 ÷ 4 = 0,75.','Pensá en 75 partes de 100.'),
  q('f3','fracciones',1,'¿Cuánto es 1/4 + 1/4? (Respondé con fracción o decimal)',0.5,'1/4 + 1/4 = 2/4 = 1/2 = 0,5.','Sumá numeradores porque los denominadores coinciden.'),
  q('f4','fracciones',2,'¿Cuánto es 1/2 + 1/4?',0.75,'1/2 = 2/4. Entonces 2/4 + 1/4 = 3/4.','Convertí 1/2 en cuartos.'),
  q('f5','fracciones',2,'¿Cuánto es 3/5 − 1/5?',0.4,'Restamos numeradores: 2/5 = 0,4.','El denominador permanece 5.'),
  q('f6','fracciones',2,'¿Cuánto es 2/3 × 3/4?',0.5,'Multiplicamos numeradores y denominadores: 6/12 = 1/2.','Multiplicá arriba por arriba y abajo por abajo.'),
  q('f7','fracciones',3,'¿Cuánto es 5/6 − 1/4?',7/12,'El común denominador es 12: 10/12 − 3/12 = 7/12.','Transformá sextos y cuartos en doceavos.'),
  q('f8','fracciones',3,'¿Cuánto es (3/4) ÷ (3/8)?',2,'Dividir por una fracción equivale a multiplicar por su inversa: 3/4 × 8/3 = 2.','Invertí la segunda fracción y multiplicá.'),

  q('p1','proporcionalidad',1,'Si 2 lápices cuestan $200, ¿cuánto cuesta 1?',100,'200 ÷ 2 = 100 pesos por lápiz.','Primero encontrá el valor unitario.'),
  q('p2','proporcionalidad',1,'Si 3 cuadernos cuestan $900, ¿cuánto cuestan 2?',600,'Cada cuaderno cuesta $300; 2 cuestan $600.','Calculá el precio de uno.'),
  q('p3','proporcionalidad',1,'Si 1 kg de fruta cuesta $1500, ¿cuánto cuestan 2 kg?',3000,'2 × 1500 = $3000.','El doble de cantidad cuesta el doble.'),
  q('p4','proporcionalidad',2,'Un auto recorre 120 km en 2 horas a velocidad constante. ¿Cuántos km hace en 5 horas?',300,'120 ÷ 2 = 60 km/h; 60 × 5 = 300 km.','Determiná kilómetros por hora.'),
  q('p5','proporcionalidad',2,'Si 4 paquetes pesan 1,2 kg, ¿cuántos kg pesan 10 paquetes iguales?',3,'Cada paquete pesa 0,3 kg; 10 pesan 3 kg.','Dividí por 4 antes de multiplicar por 10.'),
  q('p6','proporcionalidad',2,'Para 6 personas se usan 900 g de arroz. ¿Cuántos gramos para 4 personas?',600,'900 ÷ 6 = 150 g por persona; 150 × 4 = 600 g.','Primero calculá gramos por persona.'),
  q('p7','proporcionalidad',3,'En un mapa 3 cm representan 15 km. ¿Cuántos km representan 8 cm?',40,'Cada cm representa 5 km; 8 cm representan 40 km.','Buscá km por centímetro.'),
  q('p8','proporcionalidad',3,'Una máquina produce 45 piezas en 3 minutos. A ritmo constante, ¿cuántas piezas en 14 minutos?',210,'Produce 15 piezas por minuto; en 14 minutos hace 210.','Averiguá la producción en un minuto.'),

  q('a1','ecuaciones',1,'Si x + 5 = 12, ¿cuánto vale x?',7,'Restamos 5 de los dos lados: x = 7.','Usá la operación inversa de sumar 5.'),
  q('a2','ecuaciones',1,'Si x − 4 = 9, ¿cuánto vale x?',13,'Sumamos 4 a ambos lados: x = 13.','¿Qué número menos 4 da 9?'),
  q('a3','ecuaciones',1,'Si 3x = 18, ¿cuánto vale x?',6,'Dividimos ambos miembros por 3: x = 6.','Hacé la operación inversa de multiplicar por 3.'),
  q('a4','ecuaciones',2,'Si 2x + 3 = 15, ¿cuánto vale x?',6,'Restamos 3: 2x=12. Dividimos por 2: x=6.','Primero aislá el término con x.'),
  q('a5','ecuaciones',2,'Si 5x − 10 = 20, ¿cuánto vale x?',6,'Sumamos 10: 5x=30. Dividimos por 5: x=6.','Sumá 10 de ambos lados.'),
  q('a6','ecuaciones',2,'Si 4(x + 2) = 28, ¿cuánto vale x?',5,'Dividimos por 4: x + 2 = 7. Restamos 2: x = 5.','Empezá dividiendo ambos miembros por 4.'),
  q('a7','ecuaciones',3,'Si 3x + 7 = x + 19, ¿cuánto vale x?',6,'Restamos x: 2x + 7 = 19; restamos 7 y dividimos por 2: x=6.','Agrupá las x en el mismo miembro.'),
  q('a8','ecuaciones',3,'Si 2(x − 3) + 4 = 18, ¿cuánto vale x?',10,'2x − 6 + 4 = 18; 2x − 2 =18; 2x=20; x=10.','Aplicá distributiva y simplificá.'),

  q('c1','porcentajes',1,'¿Cuánto es el 10 % de 200?',20,'10 % significa dividir por 10: 200 × 0,10 = 20.','Calculá una décima parte.'),
  q('c2','porcentajes',1,'¿Cuánto es el 50 % de 80?',40,'50 % es la mitad: 80 ÷ 2 = 40.','Buscá la mitad.'),
  q('c3','porcentajes',1,'¿Cuánto es el 25 % de 100?',25,'25 de cada 100 equivale a 25.','Un cuarto de 100.'),
  q('c4','porcentajes',2,'Una remera vale $2000 y tiene 20 % de descuento. ¿Cuál es el precio final?',1600,'20 % de 2000 = 400; 2000 − 400 = $1600.','No confundas el descuento con el precio final.'),
  q('c5','porcentajes',2,'Una clase tiene 30 estudiantes y el 40 % eligió taller. ¿Cuántos son?',12,'30 × 40/100 = 12 estudiantes.','40 % es 0,4.'),
  q('c6','porcentajes',2,'Una entrada de $5000 aumenta 10 %. ¿Cuál es el nuevo precio?',5500,'El 10 % es $500; sumamos: $5500.','Un aumento se suma, no se resta.'),
  q('c7','porcentajes',3,'Un artículo de $4800 tiene 15 % de descuento. ¿Cuál es el precio final?',4080,'15 % de 4800 = 720. Precio final: 4800 − 720 = 4080.','Podés separar el 15 % en 10 % y 5 %.'),
  q('c8','porcentajes',3,'El 30 % de una cantidad es 90. ¿Cuál es la cantidad total?',300,'Si 0,3 × N=90, N=90÷0,3=300.','Formá la ecuación 0,30 × x = 90.')
];

export const TOPIC_BY_ID = Object.fromEntries(TOPICS.map(t => [t.id, t]));
export const QUESTION_BY_ID = Object.fromEntries(QUESTIONS.map(item => [item.id, item]));
