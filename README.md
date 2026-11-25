# Filmpilot

Prototipo de Filmpilot: un equipo de agentes que prepara el presupuesto, controla
el coste y vigila el rodaje de producciones de cine y televisión. Tiene tres
experiencias: la **portada**, el **escritorio con WhatsApp** y el **prototipo de agentes anterior**. Todos los datos son de
demostración y viven en memoria; no hay backend ni persistencia.

El proyecto de ejemplo es **La última función**, un largometraje en rodaje:
martes 2 de junio de 2026, día 7 de 20.

## Arranque

```bash
npm install
npm run dev
```

La aplicación local usa [http://localhost:5180](http://localhost:5180). Para
compilar la versión estática: `npm run build`.

La demo pública está en [GitHub Pages](https://albertesga.github.io/setvalio-demo/).
Cada cambio en `main` se publica automáticamente con el flujo de `.github/workflows/pages.yml`.

## Portada

Cuenta qué es Filmpilot y lleva a la nueva demo. Cada etapa de «Cómo funciona»
(presupuesto, incentivos, financiación, rodaje, justificación) abre los agentes
con una pregunta de ejemplo, y las cifras que enseña son las mismas que ellos
responden.

## Escritorio y WhatsApp

**Probar la demo** abre `?vista=demo`. En pantallas amplias se ven juntos el
escritorio y la conversación de WhatsApp; en móvil, los controles superiores
permiten pasar de uno a otra. El acceso **Demo anterior** conserva `?vista=agentes`.

El selector **Probar un caso** y el catálogo **Casos de uso** del escritorio abren
los mismos siete recorridos. Cambiar de caso conserva el estado de la sesión.

| Recorrido | Qué permite recorrer |
| --- | --- |
| Dossier diario | Consultar el rodaje de hoy, la agenda y las decisiones pendientes; abrir cada revisión. |
| Informe semanal | Preparar el informe de coste completo, revisar sus cifras y aprobarlo; regenerarlo si cambia la información. |
| Recepción de facturas | Recibir ejemplos de correo, formulario y WhatsApp; contabilizar las que cuadran con su pedido y decidir la imputación del ticket dudoso. |
| Revisión de cambios | Comparar el impacto del hotel y otras compras pendientes; aprobar, aprobar el importe previsto o rechazar según las opciones del caso. |
| Riesgos de rodaje | Revisar lluvia, horas extra y grúa; cambiar el plan, reservar dinero o asumir el riesgo. Escenario en exploración. |
| Creación de presupuesto | Preparar la propuesta de Itsasoa, añadir costes, comparar proveedores y autorizar llamadas simuladas antes de elegir. Es otro proyecto en desarrollo. |
| Dossier fiscal | Consultar bloqueantes, preparar y editar solicitudes de documentación, revisar borradores y solicitar la revisión del fiscalista. |

WhatsApp conserva un único contacto FilmPilot, respuestas breves, un adjunto de
ejemplo y acciones contextuales; **Más opciones** despliega las restantes. En los casos,
**Ver en escritorio** abre el análisis completo de esa respuesta: tablas, informes,
propuestas, borradores, criterios y decisiones. Resumen, Presupuesto y Documentos
siguen disponibles para consultar las cifras y documentos compartidos.

Las decisiones de cada análisis están vinculadas a una revisión de la sesión.
Si cambian los datos, el detalle pide **Actualizar análisis** y las decisiones antiguas
del chat quedan deshabilitadas; el modelo también rechaza esas acciones. **Deshacer
último cambio** restaura el cambio reversible disponible y avanza la revisión, sin
volver vigentes los análisis anteriores.

Esta vista representa el canal WhatsApp, sin conectarse a él. Las respuestas son
preparadas, los adjuntos son ejemplos y no se envía ningún mensaje o archivo.
El estado vive en `src/demo/model.js`; `src/demo/cases.js` adapta el motor original
de escenarios, cálculos y acciones a ambas superficies. `WorkspaceCaseDetail`
reutiliza sus bloques completos en el escritorio. La propuesta de Itsasoa conserva
su propio presupuesto y no altera el de «La última función». La demo anterior
mantiene su propia sesión. Recargar reinicia ambas; **Reiniciar demo** reinicia la vista nueva.

Comprobaciones disponibles: `npm run check:workspace` cubre el estado compartido,
las revisiones y deshacer; `npm run check:cases`, los siete recorridos y sus decisiones;
`npm run check:agentes`, los escenarios del prototipo anterior.

## Agentes (prototipo conversacional)

**Probar los agentes** abre los agentes de Filmpilot sobre *La última función*
(también con `?vista=agentes`) como un chat: a la izquierda, las conversaciones;
a la derecha, la abierta. Cada conversación es con un agente y de un tema, y se
guarda hasta que recargas la página. Al abrir no hay nadie trabajando: cada
conversación ya tiene escrito el mensaje de su agente y la lista dice cuántos
quedan por leer; el número desaparece al abrirla. Por debajo de 1024 px se ve
la lista o la conversación, como en el móvil.

En la lista, cada conversación lleva un título corto y una etiqueta (la
clasificación o el agente con el que hablas):

| Conversación | Etiqueta | Agente | Qué enseña |
| --- | --- | --- | --- |
| Parte de hoy | Equipo | Orquestador | «Buenos días, Marta. Hoy es el día 7 de rodaje.»: dónde se rueda, «Ya hecho, sin pedírtelo», «Para hoy» con su botón y la tira de las 20 jornadas |
| Dossier fiscal al día | Fiscal | Cumplimiento | Los bloqueantes del dossier, en vivo, y los pasos para tenerlo al día: la solicitud del certificado ICAA y la petición de justificantes (borradores que nunca se envían), el IGIC por validar y la documentación que falta |
| Informe semanal | Informes | Informes | Siete agentes se reparten el informe; compartirlo necesita tu aprobación |
| Facturas de esta mañana | Facturas | Facturas | Entran tres por correo (facturas@candilejasfilm.com), formulario web y WhatsApp, cada una con quién la sube. Conciliación contabiliza sola las dos que cuadran con su pedido (se puede deshacer); para el ticket dudoso, Facturas te propone dónde va |
| Pedido del Hotel NH | Compras | Excepciones | Una compra que pasaría el límite de Viajes: decides tú |
| Grúa de la jornada 17 | Riesgos | Riesgos | El recurso más caro del plan: qué pasa si se retrasa la víspera o falla, un plan B por recurso y montarla al cerrar la jornada 16 para que siempre haya las horas de grúa necesarias |
| Horas extra de noche | Riesgos | Riesgos | Las noches seguidas de Canarias alargan las jornadas: cuánto costarían y replanificarlas con una citación más tardía |
| Lluvia de mañana | Riesgos | Riesgos | Propone cambiar el orden de jornadas antes de que llueva |
| Presupuesto de Itsasoa | Presupuesto | Presupuesto | Otro proyecto, en desarrollo: la primera propuesta con los costes que aportas |

**Nueva** abre una conversación con el Orquestador, que toma título y etiqueta
de su primera respuesta entendida («Pídele algo», en la ficha de un agente, la
abre con ese agente). Un botón lleva a la conversación de lo que pide (el
«Revisar» de la compra del hotel abre «Pedido del Hotel NH»); si el parte o el
informe se han quedado viejos por algo que has decidido, lo pide allí de nuevo.
Lo que escribes se responde en la conversación abierta, y lo que dejas a medias
en el campo se queda en su conversación. La demo es reactiva: nada llega solo; todo
empieza porque lo pides. Las conversaciones salen de `src/agentes/casos.js`
(`CONVERSACIONES`) y `conversacionPara` (`src/agentes/sesion.js`) decide adónde
va cada botón.

La cabecera lleva el contador **Por revisar** (abre «Parte de hoy» y pregunta qué
tienes que revisar) y **Equipo**, una hoja con cómo actúan y quién hace qué. La
demo se ve siempre como Marta Cobo (producción ejecutiva) y a ritmo normal.

Las autonomías se nombran igual en todas partes: **Lo hace solo**, **Te lo
propone** y **Pide tu aprobación**. Ningún agente paga, firma ni se comunica con
nadie sin tu permiso.

**En exploración** marca lo que aún no está en Filmpilot: el agente de Riesgos
(su aviso abre cada respuesta suya; sus conversaciones llevan la etiqueta
discontinua) e Itsasoa, otro proyecto en desarrollo. Allí Presupuesto prepara la
primera propuesta con los costes que aportas, Proveedores busca alternativas en
un directorio de ejemplo, te pide permiso para llamar y enseña cada llamada
simulada; tú eliges y la propuesta se recalcula.

### Mundo y motor

El mundo de la demo es el martes 2 de junio de 2026: el rodaje empezó el lunes
25 de mayo, van seis jornadas rodadas y hoy se rueda la 7 de 20
(`src/agentes/rodaje.js`, con `HECHAS` y el plan que vigila Riesgos).

Los agentes se agrupan en tres familias, cada una con su glifo:
**Presupuesto** (Presupuesto, Proveedores, Control de costes y Riesgos),
**Financiación** (Conciliación, Excepciones y Previsión) y **Documentación**
(Facturas, Informes y Cumplimiento). Un Orquestador reparte cada petición.

Es una demo **simulada y guionizada**: no hay modelo de lenguaje, no se envía nada
y ninguna cifra está escrita a mano en los guiones. El motor vive en `src/agentes/`
(mundo de demo, cálculos, reductor, intenciones, guiones, conversaciones y sesión)
y `npm run check:agentes` lo comprueba en Node: cifras frente a `src/lib`, frases
de ejemplo, aperturas de cada conversación, adónde va cada botón, mensajes sin
leer, deshacer y vocabulario («límite», no «umbral»; «En exploración», no
«Exploratorio»).

## Marca

Filmpilot Brand Kit v1. Assets en `public/brand/filmpilot/`, tokens y clases con
prefijo `flp-` en `src/brand/filmpilot.css` y componentes en
`src/brand/Filmpilot.jsx`. Reglas de uso en
[docs/identidad-filmpilot.md](docs/identidad-filmpilot.md).

## Datos y límites

- `src/lib/data.js` y `src/lib/proyectos.js` son los datos de ejemplo de los que
  parte el mundo de los agentes (`src/agentes/mundo.js`).
- `src/lib/incentivos.js` calcula escenarios de deducción y su combinación con
  ayudas ([reglas](docs/reglas-optimizador-v2.md)). Es una estimación orientativa,
  no asesoramiento fiscal.
- `src/lib/format.js` formatea importes y porcentajes en `es-ES`.
- Las descargas y envíos son demostrativos: no se genera ni se manda nada.

Las cifras de ejemplo no corresponden a una producción real. Antes de usar
Filmpilot comercialmente, comprueba la disponibilidad legal del nombre y del
dominio. La fotografía de la portada es una imagen conceptual generada: no
representa a un cliente ni un rodaje real.
