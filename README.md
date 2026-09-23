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
