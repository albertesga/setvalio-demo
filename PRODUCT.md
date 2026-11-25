# FilmPilot

## Platform

web

## Users and purpose

Productoras de cine y televisión. La demo se utiliza como Marta Cobo, producción ejecutiva de la producción ficticia «La última función». El recorrido de creación de presupuesto corresponde a otro proyecto de ejemplo, «Itsasoa», en desarrollo.

## Confirmed direction

Después de las entrevistas, la conversación cotidiana debe suceder en WhatsApp. El escritorio reúne la consulta del presupuesto, los análisis, las gráficas y los documentos. Se conserva la demo anterior.

## Capabilities and constraints

- Prototipo con React y Vite, publicado en GitHub Pages.
- Datos de ejemplo y respuestas preparadas. Sin backend, modelo de lenguaje, conexión a WhatsApp ni persistencia.
- Las dos superficies nuevas comparten estado en memoria y cálculos. La demo anterior mantiene su propia sesión.
- El selector de casos y el catálogo del escritorio ofrecen siete recorridos del motor original: dossier diario, informe semanal, recepción de facturas, revisión de cambios, riesgos de rodaje, creación de presupuesto de Itsasoa y dossier fiscal.
- WhatsApp presenta respuestas breves y pasos siguientes; cada respuesta de un caso enlaza su análisis completo en el escritorio, con tablas, informes, propuestas, borradores y decisiones. Los presupuestos de Itsasoa y «La última función» permanecen separados.
- Las decisiones se validan contra el estado vigente. Si cambia la revisión de la sesión, un análisis anterior debe actualizarse antes de aplicar sus decisiones, también después de deshacer.
- Las decisiones de la persona actualizan únicamente la simulación. No se envían mensajes, realizan pagos ni modifican documentos externos.
- El presupuesto, el coste previsto y la caja proceden del mundo de demostración existente. No se presentan ahorros ni resultados de clientes como hechos.

## Brand commitments

Conservar nombre, símbolos y marca FilmPilot. En el chat, respetar la referencia explícita a WhatsApp: un contacto, burbujas, adjuntos y mensajes breves.

## Evidence

Petición del usuario del 25 de noviembre de 2026; README; `src/agentes/mundo.js`; `docs/identidad-filmpilot.md`.
