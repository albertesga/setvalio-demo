# Reglas del motor del optimizador V2 (`src/lib/incentivos.js`)

Spec para cerrar con Victor. Objetivo: que **los inputs del formulario muevan el cálculo** y que se compute la **combinación deducción + ayudas con el tope de intensidad**. Hoy los 3 escenarios son fijos (Bizkaia/Canarias/común) y solo el presupuesto mueve las cifras; esto lo arregla.

> Todas las cifras son de planificación. El fiscalista valida y firma. Marcar como estimación en la UI.

---

## 1. Inputs (vienen del formulario de `Incentivos.jsx`)
- `coste` — presupuesto total (€)
- `tipologia` — largometraje ficción | serie ficción | documental | animación
- `idioma` — castellano | catalán | euskera | gallego → deriva flag `euskera`
- `direccionNovel` — bool
- `coproduccionUE` — bool → activa cap de intensidad al 60 %
- `territoriosCandidatos` — subconjunto de {comun, canarias, bizkaia, alava, gipuzkoa, navarra}
- `subvenciones` (opcional) — lista `{nombre, importe}` a combinar
- `pctGastoTerritorio` (opcional) — % del gasto imputable a cada territorio (para los que exigen mínimos)

## 2. Tipos por territorio (constantes — parametrizar, no hard-codear en cada escenario)

| Territorio | Tramo ≤ 1 M€ | Tramo > 1 M€ | Límite deducción | Requisito territorial | Bonus euskera |
|---|---|---|---|---|---|
| Territorio común | 30 % | 25 % | 20 M€ (10 M€/episodio) | — | — |
| Canarias (REF) | 54 % | 45 % | 36 M€ (18 M€/episodio) | gasto mínimo en Canarias (umbral, **verificar**) | — |
| Bizkaia | 35–60 % según % de gasto en Bizkaia | igual | **sin límite** | tramos por % gasto (**verificar Norma Foral**) | +10 pts (hasta 70 %) |
| Álava / Gipuzkoa | 50–60 % según % gasto en País Vasco | igual | 10 M€ (3 M€/episodio) | gasto en País Vasco > 50 % para el tipo máx | +10 pts |
| Navarra | 35 % (40 % casos especiales) | igual | 5 M€ | ≥ 40 % gasto en Navarra para tipo máx | incluido en "casos especiales" |

## 3. Base de deducción
1. `baseBruta = coste_elegible` (permitir sumar copias + P&P hasta el **40 % del coste**).
2. `base = min(baseBruta, 0,80 * coste)` — **tope del 80 %**.
3. Si se combinan subvenciones: `base = base − Σ subvenciones` — **las subvenciones minoran la base**.
4. Validación (no cálculo): **≥ 50 %** de la base debe ser gasto en territorio español.

## 4. Deducción por territorio
```
tipoBajo, tipoAlto = tipos del territorio
si euskera y territorio ∈ {bizkaia, alava, gipuzkoa}: tipoBajo += 0,10; tipoAlto += 0,10
deduccionBruta = base≤1M * tipoBajo + base>1M * tipoAlto   // doble tramo, umbral 1.000.000 €
deduccion = min(deduccionBruta, limiteTerritorio)
```

## 5. Tope de intensidad de ayuda — **regla clave a calcular (hoy está hard-codeada)**
```
capIntensidad = (coproduccionUE ? 0,60 : 0,50) * coste
ayudaTotal = deduccion + Σ subvenciones
si ayudaTotal > capIntensidad:
    deduccion = max(0, capIntensidad − Σ subvenciones)   // se recorta la deducción
```
- Excepción "obras difíciles" (cortos, primeras/segundas obras, euskera, bajo presupuesto, coprod. con países OCDE/CAD): **sin tope** → flag opcional `obraDificil`.
- **Esto es lo que convierte el 60 % nominal de Bizkaia en ~50 % efectivo.** Debe salir del cálculo, no escribirse a mano.

## 6. Derivar los 3 escenarios (desde los candidatos + reglas, no fijos)
Para cada `territorioCandidato`: calcular `deduccionNeta` tras §4 y §5. Luego:
- **Máximo retorno** = candidato con mayor `deduccionNeta`. Mostrar qué regla topa si aplica.
- **Equilibrado** = mejor deducción **factible** (penalizar territorios cuyo requisito de % de gasto el proyecto no cumple según `pctGastoTerritorio`; p. ej. Canarias 54 % solo si supera el umbral).
- **Combinación orientativa** = territorio de menor requisito (normalmente común) + una ayuda abierta en el corte de la demo (ICAA Generales, importe sugerido no oficial), aplicando §3.3 (minoración) y §5 (tope).
- Banda de confianza: `deducción ± p` (param, p. ej. ±5 %); el "retorno total" suma la ayuda esperada con su propia banda.

## 7. Combinación deducción + ayudas (cierra "optimiza la combinación" de la pestaña Ayudas)
Al añadir una subvención:
1. `base −= subvención` → recomputar deducción (§4).
2. Comprobar tope de intensidad sobre `deducción + subvención` (§5).
3. Mostrar: retorno bruto, efecto de la minoración, si topa, y **retorno neto óptimo**.

## 8. Qué input cambia qué número (test de aceptación rápido)
- `euskera = true` → Bizkaia/Álava/Gipuzkoa +10 pts; Navarra 35 → 40.
- `direccionNovel | documental | animación` → Navarra 40 % (y condiciones de ayudas; param).
- `coproduccionUE = true` → cap de intensidad 50 % → 60 % (permite acumular más).
- `territoriosCandidatos` → solo se evalúan/escenifican los seleccionados.
- `pctGastoTerritorio` → habilita o no el 54 % de Canarias y los tramos del País Vasco.
- `subvenciones` → minoran la base y pueden activar el recorte por intensidad.

## 9. A verificar antes de producción (NO inventar)
- Tramos exactos del País Vasco por % de gasto (Normas Forales Bizkaia / Álava / Gipuzkoa).
- Umbral exacto de gasto en Canarias para el 54 % en producción nacional.
- Condiciones exactas de Navarra 40 % y supuestos de "obra difícil" sin tope de intensidad.
- Tratamiento de copias + P&P (40 %) en producción nacional vs. tope del 80 % (régimen 36.2 / foral).
- Fuente base: **Manual de incentivos fiscales — Spain Film Commission** (rev. nov-2024) + Normas Forales + REF Canarias + Art. 36 LIS.

## 10. Mapeo al código actual (`incentivos.js`)
- Sustituir las funciones `deduccion: (B) => ...` hard-codeadas de `TERRITORIOS` por una función parametrizada por `{tipoBajo, tipoAlto, limite, requisito, euskeraBonus}`.
- `escenarios(base)` → `escenarios(inputs)`: recibe el formulario completo, evalúa los `territoriosCandidatos`, aplica §4 y §5, y devuelve los 3 escenarios **calculados** (no fijos).
- Nueva función `combinar({ deduccion, subvenciones, coste, coproduccionUE })` para §5 + §7 (minoración + tope de intensidad).
- Mantener `tablaTerritorios(base)` pero pasando también `euskera` y `pctGastoTerritorio`.

---
*Estimación de esfuerzo: medio día de lógica + tests unitarios sobre 4-5 casos (común, Canarias con/ sin umbral, Bizkaia con euskera y tope, Navarra novel, combinación con ICAA Generales). Sin backend.*
