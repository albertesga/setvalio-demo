# Filmpilot

Prototipo de Filmpilot: un equipo de agentes que prepara el presupuesto, controla
el coste y vigila el rodaje de producciones de cine y televisión. Tiene dos
pantallas: la **portada** y el **prototipo de agentes**. Todos los datos son de
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

Cuenta qué es Filmpilot y lleva a los agentes. Cada etapa de «Cómo funciona»
(presupuesto, incentivos, financiación, rodaje, justificación) abre los agentes
con una pregunta de ejemplo, y las cifras que enseña son las mismas que ellos
responden.

## Agentes (prototipo conversacional)

**Probar los agentes** abre una conversación con los agentes de Filmpilot sobre
*La última función* (también con `?vista=agentes`). Al abrir no hay agentes
trabajando: ya está escrito el **parte de la mañana**, «Buenos días, Marta. Hoy
es el día 7 de rodaje.», con:

- una entradilla: dónde se rueda hoy, cómo va el coste y qué toca primero;
- «Ya hecho, sin pedírtelo»: hasta tres cosas que los agentes han hecho solos;
- «Para hoy»: tres puntos con su botón (la lluvia de mañana, las compras
  pendientes y el certificado que vence el viernes). Los avisos al equipo van
  aparte, plegados, y lo decidido se tacha;
- dos cifras (coste estimado final y caja) y la tira de las 20 jornadas.

«Ponme al día» vuelve a pedir el parte con lo que ya has decidido. La cabecera
lleva el contador «Por revisar», el recorrido y las historias; lo que cambia la
demo (ver como otro rol, velocidad, novedades automáticas, reinicio) está en
**Opciones**.

### Seis historias

La demo enseña una sola idea: **los agentes preparan y tú decides**. Cada
historia es un nivel de autonomía, en este orden:

| Arco | Historia | Qué enseña |
| --- | --- | --- |
| Cada mañana | Lo que encuentras cada mañana | El parte, sin pedir nada |
| Lo hace solo | Una factura que cuadra | Conciliación contabiliza sola lo rutinario y reversible, y se puede deshacer |
| Te lo propone | Un ticket que no sabe dónde va | Facturas propone dos partidas con su impacto y espera tu sí |
| Te pide aprobación | Una compra que ningún agente aprueba | Una compra de hotel que pasa el límite de Viajes: decides tú |
| Se adelantan | La lluvia de mañana | Riesgos propone cambiar el orden de jornadas antes de que llueva |
| Todo el equipo | El informe del viernes | Siete agentes a la vez; compartir el informe necesita tu aprobación |

Las historias viven en `src/agentes/casos.js` (`HISTORIAS`) y de ahí salen el
carril, «¿Qué puedes hacer?», el **recorrido guiado** (un paso por historia; el
de la compra y el de la lluvia esperan tu decisión) y las sugerencias
«Siguiente». Solo dos novedades llegan solas mientras conversas, una vez cada
una: la factura (EV-01) y la compra (EV-02). Las demás novedades de ejemplo
(avisos de rodaje y un vencimiento del dossier) no llegan solas.

Las autonomías se nombran igual en todas partes: **Lo hace solo**, **Te lo
propone** y **Pide tu aprobación**. Ningún agente paga, firma ni se comunica con
nadie sin tu permiso.

**En exploración** marca lo que aún no está en Filmpilot: el agente de Riesgos
(su aviso abre cada respuesta suya) y el epílogo **Para después · Itsasoa**,
otro proyecto en desarrollo, fuera del recorrido. En Itsasoa, Presupuesto
prepara la primera propuesta con los costes que aportas, Proveedores busca
alternativas en un directorio de ejemplo, te pide permiso para llamar y enseña
cada llamada simulada; tú eliges y la propuesta se recalcula.

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
(mundo de demo, cálculos, reductor, intenciones, guiones, historias y sesión) y
`npm run check:agentes` lo comprueba en Node: cifras frente a `src/lib`, frases de
ejemplo, historias, recorrido, novedades, deshacer y vocabulario («límite», no
«umbral»; «En exploración», no «Exploratorio»).

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
