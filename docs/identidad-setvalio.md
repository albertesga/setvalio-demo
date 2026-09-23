# Identidad de SetValio

La identidad de producción aprobada está en el SetValio Brand Kit v1. Los archivos publicados viven en `public/brand/setvalio/`. Los SVG del kit son los maestros: no reconstruir el símbolo ni escribir el wordmark con HTML.

## Marca y voz

- Nombre en texto: **SetValio**. El logotipo usa **setvalio** en minúsculas.
- Claim principal: **Libertad para crear. Claridad para producir.**
- Descriptor: **Control financiero para producciones audiovisuales**.
- Hablar con claridad y verbos de oficio: calcula, compara, cuadra, controla, revisa y justifica.
- No prometer ahorro, subvenciones o automatización fiscal sin condiciones. El fiscalista revisa y firma; SetValio prepara la documentación.

## Assets de producción

| Uso | Archivo |
| --- | --- |
| Logo sobre fondo claro | `public/brand/setvalio/logos/svg/setvalio-horizontal-ciruela.svg` |
| Logo sobre fondo oscuro | `public/brand/setvalio/logos/svg/setvalio-horizontal-papel.svg` |
| Símbolo | `public/brand/setvalio/logos/svg/setvalio-symbol-ciruela.svg` y variante papel |
| Favicon y app icon | `public/brand/setvalio/icons/` |
| Foto editorial ficticia | `public/brand/setvalio/images/rodaje-mediterraneo-*.webp` |
| Tarjeta social | `public/brand/setvalio/social/og-setvalio.png` |
| Fuentes locales y licencias | `public/brand/setvalio/fonts/` |

El símbolo y el wordmark se sirven mediante `src/components/Brand.jsx`. La fotografía representa un rodaje ficticio; no es prueba de un cliente o equipo real.

La portada incluye la imagen social con ruta relativa para la demo local. Antes de publicar, `og:image` debe usar la URL absoluta del dominio real; no se define aquí un dominio ficticio.

## Color

| Rol | Valor | Uso |
| --- | --- | --- |
| Ciruela | `#311B2E` | Texto principal, logo y fondos oscuros |
| Papel | `#F4F1E8` | Fondo de lectura |
| Lima | `#D4F26A` | CTA y acentos de marca con texto ciruela |
| Arena | `#D7C9BB` | Superficies secundarias |
| Texto secundario | `#655461` | Texto legible sobre papel |

La lima no significa éxito financiero. Los estados del producto mantienen verde `#236847`, ámbar `#91601C`, rojo `#A8383D` e informativo `#315F83`, siempre con etiqueta o icono. El kit calcula 14,01:1 para ciruela sobre papel y 12,59:1 para ciruela sobre lima.

## Tipografía y composición

- **Manrope** para interfaz, cuerpo, botones, tablas y cifras. **Newsreader cursiva** solo para énfasis editorial puntual.
- En tablas y KPIs: `font-variant-numeric: tabular-nums` y formato `es-ES`.
- Radios de 6 px en botones y de 8 a 10 px en controles y paneles; sombras discretas.
- Retícula editorial y líneas finas en portada; densidad legible en el producto. Evitar decoración sobre tablas.
- Respetar foco visible, objetivos táctiles de al menos 44 px y `prefers-reduced-motion`.

El Brand Kit no cambia reglas de incentivos ni datos de demostración. Las cifras de ejemplo siguen siendo orientativas y deben validarse antes de su uso profesional.
