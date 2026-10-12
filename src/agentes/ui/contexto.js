import { createContext, useContext } from 'react'

// Contrato del contexto de la pantalla de agentes (lo rellena src/screens/Agentes.jsx):
// - mundo, persona, despachar, onNavigate, avisar(texto)
// - enviar(texto, { ref }?) y enviarEntrada(entrada): lo pedido desde un botón o un enlace va a
//   la conversación de lo que pide (conversacionPara); con `ref`, al abrirla va a esa tarjeta.
//   entrada = { tipo:'texto', texto } | { tipo:'evento', eventoId }
// - decidir(accion, etiqueta): en la conversación abierta
// - preguntarA(texto): «Pídele algo» de la ficha de un agente (su conversación o una nueva)
// - abrirConversacion(id, { tarjeta, alFinal }?), conversacion: la abierta ({ id, titulo, etiqueta, agente })
// - ocupado: los agentes están trabajando
// - deshacible, eventosPausados
export const AgentesCtx = createContext(null)

export function useCtx() {
  return useContext(AgentesCtx)
}
