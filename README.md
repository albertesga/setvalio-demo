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
La última función (también con `?vista=agentes`). Empieza con el **parte de la
mañana** ya escrito: «Buenos días, Marta. Hoy es el día 7 de rodaje.» y, debajo,
lo que está pasando:

- dónde se rueda hoy, cómo va el coste y qué toca primero;
- la tira de las 20 jornadas, con las rodadas, la de hoy y los riesgos;
- las cifras clave;
- «Para hoy», lo urgente por orden y con su botón: la lluvia de mañana, los
  avisos al equipo, las compras pendientes y el certificado que vence el
  viernes. Se tacha a medida que decides;
- lo que ha hecho cada agente, en una línea.

Todo sale del motor, sin cifras escritas a mano, y «Ponme al día» lo vuelve a
pedir con lo que ya has decidido. La pantalla tiene dos columnas: el carril de
agentes y casos de uso (en móvil, el botón **Agentes** de la cabecera) y la
conversación. Lo que no es conversación (ver como otro rol, velocidad,
recorrido guiado, reinicio) está detrás del botón **Demo**.

El mundo de la demo es el martes 2 de junio de 2026: el rodaje empezó el lunes
25 de mayo, van seis jornadas rodadas y hoy se rueda la 7 de 20
(`src/agentes/rodaje.js`, con `HECHAS` y el plan que vigila Riesgos).

Los agentes se agrupan en tres familias, cada una con su glifo:
**Presupuesto** (Presupuesto, Proveedores, Control de costes y Riesgos),
**Financiación** (Conciliación, Excepciones y Previsión) y **Documentación**
(Facturas, Informes y Cumplimiento). Un Orquestador reparte cada petición. Los
estados usan el vocabulario de la marca: En espera, Trabajando, Por revisar y
Completado. Cada paso muestra si el agente **ejecuta**, **propone** o **pide
aprobación**; las decisiones las toma una persona en su tarjeta y cambian las
cifras de toda la conversación. Mientras se conversa llegan novedades de ejemplo
(una factura, una solicitud de compra, un vencimiento, avisos de rodaje) y un
recorrido guiado enseña todos los casos de uso.

Incluye un caso **sin validar**, sobre el proyecto en desarrollo *Itsasoa*: la
**primera propuesta de presupuesto**. Aportas los costes que ya tienes hablados
con proveedores (en la conversación o con el formulario), el agente Presupuesto
estima por capítulo lo que falta por detallar y lo compara con el objetivo.
Después, Proveedores busca alternativas más baratas en un directorio de ejemplo,
descarta las que no cumplen tus requisitos, te pide permiso para llamar y, si lo
das, enseña cada llamada: cómo se presenta, qué confirma y el precio final. Tú
eliges el proveedor y la propuesta se recalcula. Las llamadas son simuladas.

**Riesgos de producción** (exploratorio) es un agente proactivo que vigila el plan
de rodaje: el parte de la mañana ya cuenta sus riesgos, los avisos
urgentes llegan mientras hablas y «¿Qué riesgos hay para las próximas jornadas?»
enseña el radar en directo. Propone una respuesta (cambiar el orden de jornadas, un aviso al equipo
en borrador) y, si hay dinero en juego, una reserva que solo sube el coste
estimado final si producción ejecutiva la aprueba. Plan, previsión del tiempo,
convocatorias y permisos son de ejemplo.

Es una demo **simulada y guionizada**: no hay modelo de lenguaje, no se envía nada
y ninguna cifra está escrita a mano en los guiones. El motor vive en `src/agentes/`
(mundo de demo, cálculos, reductor, intenciones, guiones y sesión) y
`npm run check:agentes` lo comprueba en Node: cifras frente a `src/lib`, frases de
ejemplo, transiciones, recorrido y deshacer.

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
