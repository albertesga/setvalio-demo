import { createContext, useContext } from 'react'

// mundo, persona, despachar, enviar(texto), decidir(accion, etiqueta), onNavigate, avisar(texto)
export const AgentesCtx = createContext(null)

export function useCtx() {
  return useContext(AgentesCtx)
}
