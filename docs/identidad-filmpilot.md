# Identidad de Filmpilot

La identidad aprobada es el **Filmpilot Brand Kit v1**. Se aplica a toda la demo: la portada y el prototipo de agentes (`?vista=agentes`).

## Nombre y voz

- Nombre en texto: **Filmpilot**. El logotipo usa **filmpilot** en minúsculas y va trazado en el SVG: nunca se escribe con texto vivo.
- Claim (H1 de la portada, en HTML real): **Libertad para crear. / Claridad para producir.**
- Apoyo: «Un equipo de agentes. Una producción bajo control.» Descriptor: «Inteligencia en producción». Cierre: «Menos seguimiento. Más producción.»
- Voz directa, profesional y humana. No prometer automatismos que la demo no tenga: los agentes son simulados y no se envía nada.

## Dónde está cada cosa

| Qué | Dónde |
| --- | --- |
| Assets del kit (logos, glifos, órbitas, iconos, fuentes, foto, OG) | `public/brand/filmpilot/` |
| Tokens y clases de marca | `src/brand/filmpilot.css` |
| Componentes (logo, símbolo, glifo, estado, botón, foto, órbita) | `src/brand/Filmpilot.jsx` |
| Geometría del símbolo y de los glifos (en línea, `currentColor`) | `src/brand/glifos.js` |
| Familias de agentes | `FAMILIAS` en `src/agentes/agentes.js` |

**Prefijo `flp-`.** No se cargan `brand.css` ni `tokens.css` del kit (que usan `.fp-*` y `--fp-*`): sus valores están copiados en `src/brand/filmpilot.css` con prefijo `flp-`, y las clases solo actúan dentro de `.flp-theme`. Tailwind solo tiene las claves de la marca: colores `flp-*`, `font-flp-sans`, `font-flp-mono` y `rounded-flp-sm|md|lg` (y `font-sans` es Instrument Sans).

Orden de las hojas (`src/main.jsx`): marca, Tailwind y después las de cada pantalla. Así una utilidad de Tailwind puede ajustar una clase de marca, y `Landing.css` o `agentes.css` pueden ajustar ambas.

## Color

| Token | HEX | Uso |
| --- | --- | --- |
| Carbón | `#141414` | Texto, logo, paneles oscuros |
| Señal | `#FFE24A` | Acción principal, lo que está «Por revisar», bloque orbital |
| Tiza | `#F5F4EF` | Fondo editorial y texto sobre carbón |
| Plata | `#B7BAB7` | Secundarios y texto secundario sobre carbón |

Semánticos de interfaz: gris `#595B59`, borde de control `#70726E`, divisor `#D3D4CD`, superficie `#FFFFFF`, error `#A42C26`, éxito `#24633D` (con su versión oscura en `.flp-dark`).

**Regla del amarillo:** solo en la acción principal de cada sección, en lo que espera una revisión y en composiciones de marca. Siempre con texto carbón encima. Nunca texto amarillo ni plata sobre tiza. Reparto orientativo de la portada: 60–70 % tiza, 20–30 % carbón, 5–15 % señal.

**Atención no es «Por revisar».** Riesgo medio, cerca del umbral, no cumple, confianza baja o un informe desactualizado usan el tono de atención (`Tono tono="atencion"`: borde y texto carbón), no la señal. En el prototipo, cada agente con algo pendiente lleva un punto señal en su avatar y el recuento en texto; la cifra amarilla vive en la pestaña «Por revisar» (y en la campana, en móvil).

## Tipografía

- **Instrument Sans**: titulares en 400 con tracking negativo (≈ −0,05 em), texto en 400–500, controles en 500. Máximo 600 en la interfaz.
- **Geist Mono**: etiquetas cortas (`.flp-kicker`), estados y cifras. Nunca párrafos.
- Las dos son locales y variables (`public/brand/filmpilot/fonts/`, OFL). Solo se precarga Instrument Sans.

## Agentes: familias y estados

| Familia | Glifo | Agentes |
| --- | --- | --- |
| Presupuesto | `agent-budget` | Presupuesto, Proveedores, Control de costes, Riesgos de producción |
| Financiación | `agent-finance` | Conciliación, Excepciones, Previsión |
| Documentación | `agent-documents` | Facturas, Informes, Cumplimiento |

El Orquestador lleva el símbolo de Filmpilot (tiza sobre carbón). Un glifo nunca va solo: siempre acompaña al nombre del agente. `npm run check:agentes` comprueba que cada agente tenga familia.

Estados con texto, nunca solo color: **En espera** · **Trabajando** · **Por revisar** (carbón sobre señal) · **Completado**, más **Detenido** y **Bloqueante** donde hacen falta. El movimiento es breve: el glifo de un agente que trabaja respira dos veces y para; todo respeta `prefers-reduced-motion`.

## Composición del hero en 3D

`src/brand/CinematicSymbol.jsx` convierte `graphics/orbit-signal.svg` en una escena 3D (CSS, sin librerías). En reposo es la composición del kit, sin sombra, con un visor de cámara alrededor (esquinas, «A · CAM · 24 FPS», «2.39:1» y un código de tiempo). Solo se mueve con la persona, nunca en bucle:

- **Entrada:** al cargar, la cámara A enfoca una sola vez (≈ 1,1 s): el bloque amarillo se abre como un iris, el diafragma se cierra en el logo, las esquinas del visor encuadran con un pequeño rebote y después aparecen sus datos. A la vez, el claim cambia de foco de la primera línea a la segunda. El código de tiempo no rebobina. No hay entrada si la página carga con el bloque ya pasado o con un ancla; en móvil espera a que se vea el bloque.
- **Cursor:** inclina la escena como un movimiento de cámara. Los cinco gestos están a distinta profundidad y tienen grosor.
- **Scroll:**
  - los gestos se abren como las láminas de un diafragma;
  - el satélite se acerca a cámara;
  - las órbitas giran como los aros de un gimbal;
  - el código de tiempo avanza.
- Con `prefers-reduced-motion` se queda quieta. Fuera de pantalla no calcula nada.
- En móvil no hay cursor: solo el scroll. Por debajo de 320 px de ancho se ocultan los datos del visor y quedan las esquinas.

## Fotografía

`images/production-team-*` es una **imagen generada de concepto**: no representa al equipo, a clientes ni a un rodaje real. Por decisión de producto, la portada no lo rotula ni dice que Filmpilot sea un prototipo. El interés está en la mitad derecha; el texto va a la izquierda sobre una capa de contraste.

En la portada, la banda de la foto se mueve por capas con el scroll, sin bucles:

- **Foto:** va más lenta que la página y con un leve acercamiento.
- **Texto:** va algo más rápido y cada línea a su ritmo.
- **Bandas de cine:** dos bandas carbón se cierran cuando la sección llega al centro.
- **Cámara B:** es el contraplano del hero. Al cerrarse las bandas, las esquinas del visor se ajustan (de 1,06 a 1) y aparecen dentro de ellas «B · CAM · 24 FPS», «2.39:1», «La última función · Día 7 de 20» y un código de tiempo propio (por debajo de 640 px, solo el día y el TC). La foto sube de exposición al entrar y, pasado el centro, «Menos seguimiento.» se retira al 55 % (solo por encima de 640 px).

Con `prefers-reduced-motion` todo queda quieto.

## Movimiento en la portada

La portada se rueda como una producción: una toma por sección. Las piezas viven en `src/screens/portada/` y comparten `movimiento.js`:

- `useToma`: una secuencia que se reproduce una vez al entrar en pantalla. Solo se arma si el bloque está bajo el pliegue al cargar.
- `useProgresoScroll`: un solo planificador de scroll y rAF para toda la página. Solo pide frames si hay algo que pintar.
- `CifraCinta`: las cifras dan una vuelta de rodillo y se paran en su valor real. Nunca enseñan ceros ni valores intermedios quietos.

| Sección | Efecto | Disparador |
| --- | --- | --- |
| Cabecera | Pista de montaje: un clip por sección, un cabezal que sigue al scroll y el enlace de la sección activa subrayado | Scroll |
| Agentes | La sección llega recortada como un plano y se abre a sangre; el titular sube por palabras con una pausa antes de «Tú decides.»; el informe semanal se reproduce en directo (En espera → Trabajando → Completado → Por revisar), con «Volver a verlo» | Scroll y en pantalla |
| Cómo funciona | Un cabezal de montaje baja por las cinco etapas, enciende cada número y gira su cifra; al pasar por una etapa, esquinas de visor y la pregunta que se enviará | Scroll y hover o foco |
| Riesgos | La jornada 8 (exterior con lluvia) se cambia por la 9 delante de ti, con las cifras en juego y ahorradas; conmutador «Plan actual / Propuesta del agente» y «Volver a verlo» | En pantalla y clic |
| Fiscalidad | El dossier se deja sobre la mesa en abanico y los tres «Bloqueante» se estampan como sellos | Scroll y en pantalla |
| Preguntas | El titular sube por palabras y cada respuesta se descubre de arriba abajo | En pantalla y clic |
| Cierre | Una claqueta que da el «clac» al pasar por «Probar los agentes» (en táctil, una vez al verla) | Hover o foco |
| Enlaces de texto | El subrayado se recoge y se vuelve a dibujar | Hover o foco |

Reglas: nada en bucle; solo se anima transform, opacity y clip-path; los estados de partida solo existen con movimiento y dentro de `@media screen and (prefers-reduced-motion: no-preference)`, así que con movimiento reducido o al imprimir se ve la portada completa y quieta. El amarillo no gana sitio: solo el CTA, «Por revisar» y el bloque del hero.

## Metadatos

`index.html` usa el favicon, el `site.webmanifest` y la imagen social del kit (`social/og-filmpilot.png`) con URL absoluta bajo `https://albertesga.github.io/setvalio-demo/`. El `theme-color` es tiza (`#F5F4EF`).
