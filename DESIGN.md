---
name: FilmPilot
description: Marca FilmPilot aplicada al escritorio de producción y a una conversación simulada de WhatsApp.
colors:
  carbon: "#141414"
  signal: "#ffe24a"
  signal-hover: "#f3d433"
  chalk: "#f5f4ef"
  silver: "#b7bab7"
  surface: "#ffffff"
  control-border: "#70726e"
  success: "#24633d"
  workspace-line: "#e6e7e1"
  workspace-muted: "#65675f"
  dashboard-line: "#dedfd8"
  dashboard-muted: "#61635c"
  cost-over: "#a0392e"
  chart-budget: "#b7bab1"
  whatsapp-background: "#efeae2"
  whatsapp-outgoing: "#d9fdd3"
  whatsapp-action: "#008069"
  whatsapp-text: "#111b21"
typography:
  body:
    fontFamily: "Instrument Sans, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  title:
    fontFamily: "Instrument Sans, Arial, sans-serif"
    fontSize: "clamp(24px, 2.5vw, 32px)"
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: "-0.035em"
  label:
    fontFamily: "Instrument Sans, Arial, sans-serif"
    fontSize: "14px"
  brand-mono:
    fontFamily: "Geist Mono, Courier New, monospace"
    fontSize: "0.75rem"
    letterSpacing: "0.01em"
  whatsapp-message:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1rem"
    lineHeight: 1.5
rounded:
  brand-sm: "6px"
  brand-md: "16px"
  brand-lg: "24px"
  pill: "999px"
  document-detail: "12px"
  whatsapp-window: "10px"
spacing:
  desktop-content: "32px"
  mobile-content: "24px 18px"
components:
  desktop-button-primary:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.carbon}"
    rounded: "{rounded.pill}"
    padding: "10px 17px"
  desktop-button-primary-hover:
    backgroundColor: "{colors.signal-hover}"
  document-detail:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.document-detail}"
    padding: "22px"
---

# Sistema de diseño de FilmPilot

## Overview

Extensión de la identidad existente: el escritorio ofrece consulta y análisis; la conversación cotidiana ocurre en WhatsApp. La referencia a WhatsApp es explícita en `PRODUCT.md`: un solo contacto FilmPilot, mensajes breves, burbujas y adjuntos. El logotipo y el símbolo proceden del kit existente; no se redibujan ni se sustituyen por texto.

Este documento registra las superficies de `Workspace` y `WorkspaceDashboard`. La portada y la demo anterior conservan su composición. La fuente de los tokens heredados es `src/brand/filmpilot.css`; la identidad completa está en `docs/identidad-filmpilot.md`.

## Colors

Carbón, señal, tiza y plata son la base heredada. El escritorio usa blanco como superficie, tiza para agrupaciones suaves y divisores grises; el amarillo señal identifica la acción principal y estados que requieren revisión o completar información. Siempre lleva texto carbón. Nunca se usa texto amarillo o plata sobre tiza.

En las gráficas, presupuesto es gris y previsión es carbón. Los sobrecostes y saldos negativos usan rojo; las diferencias favorables, verde. Cifras, signos y etiquetas conservan el significado sin depender del color.

WhatsApp tiene su propia paleta reconocible: fondo cálido, mensajes entrantes blancos, salientes verde claro y envío verde. Esta paleta pertenece al canal y no sustituye los colores de FilmPilot en el escritorio.

## Typography

Instrument Sans sostiene el escritorio: titulares de peso regular con espaciado negativo, cuerpo legible y controles de peso medio. Los encabezados secundarios miden 17 px y los datos auxiliares, filtros y tablas usan 14 px. Las cifras usan números tabulares para facilitar la comparación.

Geist Mono se conserva como recurso de la marca para etiquetas cortas, estados y cifras de las superficies anteriores; el nuevo escritorio utiliza Instrument Sans. WhatsApp emplea la pila de sistema del canal, con mensajes de 16 px y metadatos de 12 px. Las fuentes de marca están alojadas en el proyecto.

## Layout

El escritorio se organiza en navegación lateral, cabecera de producción y contenido con ancho máximo de 1330 px. Resumen, Presupuesto y Documentos son las tres secciones. La jerarquía depende de títulos, espacio y líneas divisorias; los datos se agrupan en filas y paneles abiertos.

En ventanas desde 1250 px pueden verse escritorio y conversación juntos, con el chat en una columna de 380 px, ampliada a 420 px desde 1600 px. Por debajo de 1250 px se alternan las dos superficies; abrir un destino del chat muestra el escritorio. Hasta 740 px la navegación del escritorio pasa arriba y WhatsApp ocupa el ancho disponible, con entrada de mensajes ajustada al área segura del dispositivo.

**El contenido responde a su contenedor.** El escritorio declara un contenedor de ancho y adapta su interior a 850 y 500 px, también cuando comparte pantalla con WhatsApp. A 850 px el resumen pasa a una columna, los totales reducen columnas y el detalle documental se coloca antes de la lista. A 500 px se apilan encabezados, acciones y datos de caja. Las tablas conservan sus columnas mediante desplazamiento horizontal dentro de su región.

## Elevation & Depth

El escritorio es principalmente plano: superficies tonales, bordes finos y espacios separan niveles. El detalle de un documento está delimitado por un borde, sin sombra. WhatsApp usa sombras pequeñas en ventana, burbujas y fecha; el menú de adjuntos y el acceso a mensajes nuevos se elevan para señalar que flotan sobre la conversación.

El movimiento de controles es breve. El indicador de escritura solo aparece durante una respuesta simulada. Se respeta `prefers-reduced-motion` mediante la regla global.

## Shapes

Botones principales y secundarios del escritorio en píldora; filtros, campos y navegación con esquinas discretas. La ficha documental tiene una curva mayor. Las burbujas de WhatsApp mantienen esquinas asimétricas y cola según emisor; avatares y envío son circulares. En móvil desaparece el marco redondeado exterior del chat.

## Components

- **Contacto único.** FilmPilot reúne la conversación; no se introduce una lista de agentes como interlocutores. Las respuestas pueden contener un adjunto, un enlace al escritorio o decisiones concretas.
- **Enlaces con contexto.** «Ver en escritorio» conserva sección y documento de destino. El adjunto abre su detalle. Las consultas desde el escritorio llevan la pregunta contextual a la misma conversación.
- **Un mismo estado.** Ambas superficies leen el mismo estado en memoria y envían sus acciones al mismo reductor. Cambiar de vista conserva mensajes y decisiones. Las decisiones resueltas quedan deshabilitadas y muestran confirmación; la actividad permite deshacer la última decisión disponible.
- **Resumen y presupuesto.** Comparación entre presupuesto y previsión, capítulos seleccionables, caja por semana y revisiones pendientes. Las tablas despliegan partidas sin duplicar el origen de los cálculos.
- **Documentos.** Búsqueda, filtros con recuentos, selección y detalle. La ficha seleccionada recibe foco y entra en la zona visible. El estado vacío ofrece limpiar filtros.
- **Conversación.** Entrada etiquetada, envío deshabilitado si no hay texto o hay una respuesta pendiente, sugerencias y adjunto de ejemplo. El desplazamiento sigue mensajes nuevos cuando la persona está al final; si está leyendo mensajes anteriores, aparece un acceso a los nuevos.
- **Accesibilidad.** Foco visible, estados expresados con texto, nombres accesibles para controles de icono, expansiones y selecciones comunicadas semánticamente, anuncios discretos de mensajes y descripciones de las gráficas.

## Do's and Don'ts

- Mantener la marca existente y el lenguaje visual de cada superficie.
- Conservar destinos y contexto al pasar entre conversación y escritorio.
- Mostrar las decisiones con su resultado en mensajes, actividad y datos de consulta.
- Conservar los avisos visibles de demo, datos de ejemplo y duración de la sesión.
- No presentar la simulación como conexión real a WhatsApp, modelo de lenguaje, envío de archivos, pago ni modificación de documentos externos. Las respuestas están preparadas y no hay persistencia.
- No inventar resultados de clientes, ahorros ni métricas para completar la interfaz.
