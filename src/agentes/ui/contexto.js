import { createContext, useContext } from 'react'

// Contrato del contexto de la pantalla de agentes (lo rellena src/screens/Agentes.jsx):
// - mundo, persona, despachar, onNavigate, avisar(texto)
// - enviar(texto) y enviarEntrada(entrada): entrada = { tipo:'texto', texto } | { tipo:'evento', eventoId }
//   (para una historia, enviarEntrada(entradaDeHistoria(h, mundo)))
// - decidir(accion, etiqueta)
// - ocupado: los agentes están trabajando
// - iniciarRecorrido(): empieza el recorrido guiado y vuelve a seguir la conversación.
//   Con la demo recién abierta (solo el parte) empieza al momento; si ya hay conversación,
//   abre la hoja «¿Empezar el recorrido desde cero?». Quien lo llama no pregunta nada.
// - abrirHistoria(h): abre una historia en limpio (cierra la conversación anterior; lo decidido se queda)
// - enRecorrido: hay un recorrido en marcha
// - esperaRecorrido: la decisión ({ tipo, id }) que espera el paso del recorrido, o null
// - vistos: ids de HISTORIAS vistas, en el orden del arco (vistosDe(s))
// - deshacible, eventosPausados
export const AgentesCtx = createContext(null)

export function useCtx() {
  return useContext(AgentesCtx)
}
