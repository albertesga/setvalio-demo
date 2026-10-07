// Almacén único del prototipo: la conversación sobrevive al cambio de pantalla
// mientras la página siga abierta. Sin persistencia (no hay backend).

import { crearSesion, reducirSesion } from './sesion.js'

let estado = crearSesion()
const oyentes = new Set()

export function obtener() {
  return estado
}

export function suscribir(fn) {
  oyentes.add(fn)
  return () => oyentes.delete(fn)
}

export function despachar(accion) {
  const siguiente = reducirSesion(estado, accion)
  if (siguiente === estado) return
  estado = siguiente
  oyentes.forEach((fn) => fn())
}
