# SetValio

Prototipo de control financiero para productoras de cine y televisión. Conecta el
presupuesto del proyecto con incentivos, ayudas, financiación, compras, gasto real
y documentación fiscal. Todos los datos son de demostración y viven en memoria;
no hay backend ni persistencia.

El proyecto precargado es **La última función**. La aplicación permite cambiar de
proyecto, editar el presupuesto por los 12 capítulos ICAA y ver cómo se propaga
el nuevo total a las pantallas conectadas.

## Arranque

```bash
npm install
npm run dev
```

La aplicación local usa [http://localhost:5180](http://localhost:5180). Para
compilar la versión estática: `npm run build`.

La demo pública está en [GitHub Pages](https://albertesga.github.io/setvalio-demo/).
Cada cambio en `main` se publica automáticamente con el flujo de `.github/workflows/pages.yml`.

## Recorrido

1. **Proyecto y presupuesto:** cartera, proyecto activo, presupuesto por capítulos y resumen.
2. **Retorno:** optimizador de incentivos, escenarios, ayudas compatibles y tope de intensidad.
3. **Financiación:** fuentes, calendario de cobros y previsión de caja.
4. **Rodaje:** órdenes de compra, control de costes, proveedores y bandeja de gastos.
5. **Justificación:** elegibilidad por gasto, dossier fiscal, informes y consola multi-cliente.

## Agentes (prototipo conversacional)

Desde la portada, **Probar el asistente** abre una conversación con los agentes de
SetValio sobre La última función (también con `?vista=agentes`). Un Orquestador
reparte cada petición entre Facturas, Conciliación, Excepciones, Previsión,
Control de costes, Informes y Cumplimiento. Cada paso muestra si el agente
**ejecuta**, **propone** o **pide aprobación**; las decisiones las toma una persona
en su tarjeta y cambian las cifras de toda la conversación. Mientras se conversa
llegan novedades de ejemplo (una factura, una solicitud de compra, un vencimiento)
y un recorrido guiado enseña los diez casos de uso.

Es una demo **simulada y guionizada**: no hay modelo de lenguaje, no se envía nada
y ninguna cifra está escrita a mano en los guiones. El motor vive en `src/agentes/`
(mundo de demo, cálculos, reductor, intenciones, guiones y sesión) y
`npm run check:agentes` lo comprueba en Node: cifras frente a `src/lib`, frases de
ejemplo, transiciones, recorrido y deshacer.

La ruta **Design system** documenta en vivo los tokens y componentes compartidos.
La dirección de marca, usos del logotipo y normas de voz están en
[docs/identidad-setvalio.md](docs/identidad-setvalio.md).

## Datos y límites

- `src/lib/proyectos.js` define el proyecto y su presupuesto por capítulos; el
  total se deriva de ellos.
- `src/lib/incentivos.js` calcula escenarios y combinación con ayudas. Es una
  estimación orientativa, no asesoramiento fiscal.
- `src/lib/format.js` formatea importes y porcentajes en `es-ES`.
- Las acciones de exportación y subida son demostrativas, no entregables reales.

Las cifras de ejemplo no corresponden a una producción real. Antes de usar
SetValio comercialmente, comprueba la disponibilidad legal del nombre y del
dominio.
