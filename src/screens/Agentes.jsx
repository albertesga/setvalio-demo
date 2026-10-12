// Prototipo conversacional: los agentes de Filmpilot trabajan sobre «La última función».
// Motor simulado y guionizado (src/agentes/): sin modelo de lenguaje y con datos de ejemplo.
// Como un chat: a la izquierda, las conversaciones (cada una con un agente y de un tema);
// a la derecha, la abierta. Se guardan hasta refrescar la página.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import '../agentes/agentes.css'
import '../agentes/ui/pantalla.css'
import { useAgentes } from '../agentes/useAgentes.js'
import { personaDe, sugerenciasDe, mensajesDe, listaConversaciones, conversacionPara, conversacionIniciada, porLeer } from '../agentes/sesion.js'
import { CONVERSACIONES_POR_ID } from '../agentes/casos.js'
import { decisionesAbiertas } from '../agentes/pendientes.js'
import { AgentesCtx } from '../agentes/ui/contexto.js'
import { Hoja } from '../agentes/ui/Piezas.jsx'
import { Mensaje } from '../agentes/ui/Mensajes.jsx'
import { Sugerencias, Redactor } from '../agentes/ui/Conversacion.jsx'
import { Cabecera } from '../agentes/ui/Cabecera.jsx'
import { AgentesPorFamilia, LeyendaAutonomia, DetalleAgente, estadoAgentes } from '../agentes/ui/Paneles.jsx'
import { ListaConversaciones, CabeceraChat, EstadoVacio } from '../agentes/ui/Conversaciones.jsx'
import { aprobacionPendiente } from '../agentes/ui/Bloques.jsx'
import { AGENTES } from '../agentes/agentes.js'

// La pantalla ocupa el alto visible y desplaza sus columnas por dentro: el documento no se mueve.
// (El color del navegador lo fija App.jsx según la ruta.)
function useBloqueoScroll() {
  useEffect(() => {
    const html = document.documentElement
    const previos = [html.style.overflow, document.body.style.overflow]
    html.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    window.scrollTo(0, 0)
    return () => {
      html.style.overflow = previos[0]
      document.body.style.overflow = previos[1]
    }
  }, [])
}

// Desde 1024 px se ven la lista y la conversación a la vez.
const ANCHO = '(min-width: 1024px)'
function useAncho() {
  const [ancho, setAncho] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(ANCHO).matches)
  useEffect(() => {
    const mq = window.matchMedia?.(ANCHO)
    if (!mq) return
    const fn = () => setAncho(mq.matches)
    fn()
    mq.addEventListener?.('change', fn)
    return () => mq.removeEventListener?.('change', fn)
  }, [])
  return ancho
}

function Anunciador({ mensajes, conv }) {
  const [texto, setTexto] = useState('')
  const ultimoAnunciado = useRef(null)
  const convAnunciada = useRef(conv)
  useEffect(() => {
    const ultimo = [...mensajes].reverse().find((m) => m.rol === 'agentes' || m.rol === 'novedad')
    if (!ultimo) return
    const clave = `${ultimo.id}-${ultimo.estado ?? ''}`
    if (ultimoAnunciado.current === clave) return
    ultimoAnunciado.current = clave
    // Al volver a una conversación, lo que ya tenía no se anuncia como si llegara ahora.
    if (convAnunciada.current !== conv) {
      convAnunciada.current = conv
      return
    }
    // Lo que ya estaba escrito al abrir, tampoco.
    if (ultimo.apertura) return
    if (ultimo.rol === 'novedad') setTexto(`Novedad: ${ultimo.titulo}.`)
    else if (ultimo.estado === 'en_curso') setTexto(`Los agentes trabajan: ${ultimo.turno.titulo}.`)
    else if (ultimo.estado === 'hecho') {
      const decisiones = ultimo.turno.bloques.filter((b) => b.tipo === 'aprobacion').length
      setTexto(`Respuesta lista: ${ultimo.turno.titulo}.${decisiones ? ` Incluye ${decisiones} ${decisiones === 1 ? 'decisión' : 'decisiones'}.` : ''}`)
    }
  }, [mensajes, conv])
  return (
    <div className="sr-only" role="status" aria-live="polite">
      {texto}
    </div>
  )
}

export default function Agentes({ onNavigate, contexto, pushToast }) {
  useBloqueoScroll()
  // La demo se ve siempre como Marta y a ritmo normal.
  const { s, despachar } = useAgentes({ ritmo: 'normal' })
  const sRef = useRef(s)
  sRef.current = s
  const persona = personaDe(s)
  const ocupado = !!s.activo
  const iniciadas = Object.keys(s.conversaciones).length > 0
  const [hoja, setHoja] = useState(null) // 'equipo'
  const [agenteAbierto, setAgenteAbierto] = useState(null)
  // Por debajo de 1024 px se ve la lista o el chat, como en el móvil.
  const [vista, setVista] = useState('lista')
  const ancho = useAncho()
  // La conversación que se está viendo (en el móvil, ninguna mientras se ve la lista).
  const abierta = ancho || vista === 'chat' ? s.actual : null
  const anchoRef = useRef(ancho)
  anchoRef.current = ancho
  const scrollRef = useRef(null)
  const finRef = useRef(null)
  const inputRef = useRef(null)
  const [cerca, setCerca] = useState(true)
  const [nuevos, setNuevos] = useState(false)

  const mensajes = useMemo(() => mensajesDe(s), [s])
  const conversacion = s.conversaciones[s.actual] ?? null
  const lista = useMemo(() => listaConversaciones(s, abierta), [s, abierta])

  const anclado = useRef(true)
  // Respuestas ya colocadas al principio de la vista: no se vuelven a mover.
  const posicionados = useRef(new Set())
  // Respuesta que se está colocando arriba, con su pregunta: se recoloca con cada bloque
  // hasta quedar arriba y terminada. Se suelta en cuanto la persona se desplaza.
  const pendiente = useRef(null)
  // Cuándo se desplazó la vista por código: ese desplazamiento no vuelve a anclar al final.
  const programado = useRef(0)
  // Posición de cada conversación, para volver a donde estabas.
  const scrollPorConv = useRef(new Map())
  const convColocada = useRef(null)
  // Al abrir una conversación: la tarjeta a la que ir, o seguir el final (si se acaba de pedir algo).
  const tarjetaPendiente = useRef(null)
  const alFinalAlAbrir = useRef(false)
  // Lo escrito sin enviar en cada conversación.
  const borradores = useRef(new Map())

  // Al abrir, los agentes ya han escrito lo suyo en cada conversación.
  useEffect(() => {
    if (!iniciadas) despachar({ tipo: 'conversaciones/iniciar' })
  }, [iniciadas, despachar])

  // La pregunta de la portada que ya se ha atendido (cada encargo se atiende una vez).
  const pedidoAtendido = useRef(null)

  // Lo que se ve queda leído: el número de la lista desaparece al abrir la conversación. Mientras
  // la portada tenga una pregunta sin atender, nada se da por visto: va a otra conversación.
  const quedaPorLeer = abierta ? porLeer(s, abierta) : 0
  const encargoPendiente = !!contexto?.pregunta && pedidoAtendido.current !== contexto
  useEffect(() => {
    if (quedaPorLeer && !encargoPendiente) despachar({ tipo: 'conversacion/leida', id: abierta })
  }, [quedaPorLeer, abierta, encargoPendiente, despachar])

  const enfocarRedactor = () => {
    if (!window.matchMedia?.('(pointer: coarse)').matches) requestAnimationFrame(() => inputRef.current?.focus())
  }
  const guardarScroll = () => {
    const actual = sRef.current.actual
    const el = scrollRef.current
    // Con el chat oculto (la lista en el móvil) la posición vale 0: ya se guardó al volver.
    if (actual && el?.clientHeight) scrollPorConv.current.set(actual, el.scrollTop)
  }
  // Por debajo de 1024 px, el botón pulsado desaparece al pasar de la lista al chat: el foco va al
  // título de la conversación. Se espera a que una hoja que se cierra devuelva el suyo.
  const enfocarCabecera = () => setTimeout(() => document.getElementById('ag-chat-titulo')?.focus({ preventScroll: true }), 80)
  const abrirConversacion = useCallback(
    (id, { tarjeta = null, alFinal = false, desdeLista = false } = {}) => {
      const misma = id === sRef.current.actual
      if (!misma) guardarScroll()
      setHoja(null)
      setVista('chat')
      // En escritorio, la fila pulsada sigue a la vista; con una tarjeta, el foco va a ella.
      if (!tarjeta && !(desdeLista && anchoRef.current)) enfocarCabecera()
      // La que ya está abierta: nada que cambiar (ni que terminar de golpe).
      if (misma) return
      tarjetaPendiente.current = tarjeta
      alFinalAlAbrir.current = alFinal
      despachar({ tipo: 'conversacion/abrir', id })
    },
    [despachar],
  )
  // `agente`: desde la ficha de un agente, la conversación nueva es con él.
  const nuevaConversacion = useCallback(
    ({ agente } = {}) => {
      guardarScroll()
      alFinalAlAbrir.current = true
      setHoja(null)
      setVista('chat')
      despachar({ tipo: 'conversacion/nueva', agente })
      // Con teclado, al campo de mensaje; en una pantalla táctil (sin abrir el teclado), al título.
      if (window.matchMedia?.('(pointer: coarse)').matches) enfocarCabecera()
      else enfocarRedactor()
    },
    [despachar],
  )
  // Del chat a la lista (por debajo de 1024 px): se guarda dónde estabas y el foco vuelve a su fila.
  const volverALista = () => {
    const deja = sRef.current.actual
    guardarScroll()
    setVista('lista')
    setTimeout(() => document.querySelector(`.ag-conv[data-conv="${deja}"]`)?.focus(), 80)
  }
  // «Revisar» de una decisión cuya tarjeta ya está en la conversación abierta: se enseña el chat
  // (en el móvil puede estar en la lista) y se lleva a ella, en vez de repetir la pregunta.
  const irATarjeta = useCallback((ref) => {
    if (!ref) return false
    const s0 = sRef.current
    const aqui = mensajesDe(s0).some((m) => m.rol === 'agentes' && m.estado === 'hecho' && m.turno.bloques.some((b) => b.tipo === 'aprobacion' && b.ref?.tipo === ref.tipo && b.ref?.id === ref.id && aprobacionPendiente(s0.mundo, b)))
    if (!aqui) return false
    setHoja(null)
    setVista('chat')
    // Tras cerrar una hoja, el foco vuelve a su botón: se espera a que termine antes de moverlo.
    setTimeout(() => {
      const t = [...document.querySelectorAll(`.ag-aprobacion[data-ref="${ref.tipo}-${ref.id}"]:not(.is-decidida)`)].reverse().find((x) => x.getClientRects().length)
      if (!t) return
      const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      t.scrollIntoView({ block: 'center', behavior: reducido ? 'auto' : 'smooth' })
      t.querySelector('h4')?.focus({ preventScroll: true })
    }, 80)
    return true
  }, [])

  // Lo escrito en el redactor se responde en la conversación abierta.
  const enviarAqui = useCallback(
    (entrada) => {
      setHoja(null)
      setVista('chat')
      anclado.current = true
      pendiente.current = null
      despachar({ tipo: 'enviar', entrada })
      enfocarRedactor()
    },
    [despachar],
  )
  // Un botón o un enlace va a la conversación de lo que pide: si ya lo enseña, solo la abre;
  // si no, la abre y lo pide allí. Si no tiene conversación propia, se responde aquí.
  const pedir = useCallback(
    (entrada, { ref = null } = {}) => {
      const destino = conversacionPara(sRef.current, entrada)
      if (destino && destino.conv !== sRef.current.actual) {
        abrirConversacion(destino.conv, { tarjeta: destino.esApertura ? ref : null, alFinal: !destino.esApertura })
        if (!destino.esApertura) despachar({ tipo: 'enviar', entrada: { ...entrada, conv: destino.conv } })
        return
      }
      enviarAqui(entrada)
    },
    [abrirConversacion, enviarAqui, despachar],
  )
  const enviar = useCallback((texto, opciones) => pedir({ tipo: 'texto', texto }, opciones), [pedir])
  const decidir = useCallback((accion, etiqueta) => enviarAqui({ tipo: 'accion', accion, etiqueta }), [enviarAqui])
  // «Pídele algo» desde la ficha de un agente: a su conversación o, si no tiene, a una nueva.
  const preguntarA = useCallback(
    (texto, agente) => {
      const entrada = { tipo: 'texto', texto }
      if (conversacionPara(sRef.current, entrada)) return pedir(entrada)
      nuevaConversacion({ agente })
      despachar({ tipo: 'enviar', entrada })
    },
    [pedir, nuevaConversacion, despachar],
  )
  const avisar = useCallback((texto) => pushToast?.(texto), [pushToast])
  const cerrarHoja = useCallback(() => setHoja(null), [])
  const cerrarAgente = useCallback(() => setAgenteAbierto(null), [])
  const escribir = useCallback(() => despachar({ tipo: 'actividad' }), [despachar])
  // Leer, desplazarse o pulsar también es actividad: si alguna novedad volviera a llegar sola,
  // esperaría a que la persona dejara la pantalla quieta, sin interrumpirla mientras lee.
  const ultimaActividad = useRef(0)
  const marcarActividad = useCallback(() => {
    const ahora = Date.now()
    if (ahora - ultimaActividad.current < 1000) return
    ultimaActividad.current = ahora
    despachar({ tipo: 'actividad' })
  }, [despachar])

  // Lo que pide la portada: una pregunta va a su conversación o, si no tiene, a una nueva.
  useEffect(() => {
    if (!iniciadas || pedidoAtendido.current === contexto) return
    pedidoAtendido.current = contexto
    if (!contexto?.pregunta) return
    const entrada = { tipo: 'texto', texto: contexto.pregunta }
    if (conversacionPara(sRef.current, entrada)) pedir(entrada)
    else {
      nuevaConversacion()
      despachar({ tipo: 'enviar', entrada })
    }
  }, [contexto, iniciadas, pedir, nuevaConversacion, despachar])

  // Desplazamiento. Al abrir una conversación: donde la dejaste, en su tarjeta o arriba la primera
  // vez. Mientras los agentes trabajan, sigue el final; cuando llega la respuesta, la deja arriba
  // con su pregunta. Si la persona sube a leer otra cosa, no la mueve y ofrece «Nuevos mensajes».
  const alFinal = (suave = true) => {
    const el = scrollRef.current
    if (!el) return
    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    programado.current = Date.now()
    el.scrollTo({ top: el.scrollHeight, behavior: suave && !reducido ? 'smooth' : 'auto' })
  }
  // Deja el mensaje empezando arriba. Devuelve si ha podido (si no, falta contenido debajo).
  const colocarArriba = (id) => {
    const el = scrollRef.current
    const nodo = document.querySelector(`[data-msg="${id}"]`)
    if (!nodo || !el) return true
    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const top = nodo.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - 12
    programado.current = Date.now()
    el.scrollTo({ top, behavior: reducido ? 'auto' : 'smooth' })
    return top <= el.scrollHeight - el.clientHeight + 1
  }
  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const estaCerca = el.scrollHeight - el.scrollTop - el.clientHeight < 140
    setCerca(estaCerca)
    // Solo vuelve a seguir el final si baja la persona, no un desplazamiento por código.
    if (estaCerca && !pendiente.current && Date.now() - programado.current > 700) {
      anclado.current = true
      setNuevos(false)
    }
  }
  const soltar = (e) => {
    pendiente.current = null
    if (e.type === 'wheel' && e.deltaY >= 0) return
    if (e.type === 'keydown' && !['ArrowUp', 'PageUp', 'Home'].includes(e.key)) return
    anclado.current = false
  }
  const ultimoMsg = mensajes[mensajes.length - 1]
  const firma = `${s.actual}-${mensajes.length}-${ultimoMsg?.id ?? ''}-${ultimoMsg?.bloquesVisibles ?? 0}-${ultimoMsg?.estadoPasos?.join('') ?? ''}-${ultimoMsg?.estado ?? ''}`
  useEffect(() => {
    const el = scrollRef.current
    // Otra conversación: se coloca y no cuenta lo que ya tenía como nuevo.
    if (convColocada.current !== s.actual) {
      convColocada.current = s.actual
      pendiente.current = null
      setNuevos(false)
      const siguiendo = alFinalAlAbrir.current
      alFinalAlAbrir.current = false
      // Si se acaba de pedir algo aquí, lo nuevo (la pregunta y su respuesta) se coloca como siempre.
      const yaEstaban = siguiendo ? mensajes.filter((m) => m.estado !== 'en_curso' && m.rol === 'agentes') : mensajes
      for (const m of yaEstaban) posicionados.current.add(m.id)
      programado.current = Date.now()
      const tarjeta = tarjetaPendiente.current
      tarjetaPendiente.current = null
      requestAnimationFrame(() => {
        if (!el) return
        const t = tarjeta && el.querySelector(`.ag-aprobacion[data-ref="${tarjeta.tipo}-${tarjeta.id}"]:not(.is-decidida)`)
        if (t) {
          el.scrollTo({ top: t.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - 16, behavior: 'auto' })
          t.querySelector('h4')?.focus({ preventScroll: true })
        } else if (siguiendo) alFinal(false)
        else el.scrollTo({ top: scrollPorConv.current.get(s.actual) ?? 0, behavior: 'auto' })
      })
      anclado.current = siguiendo
      return
    }
    if (!ultimoMsg) return
    const llevarArriba = colocarArriba
    // La respuesta que se está colocando se recoloca con cada bloque hasta quedar arriba y terminada.
    if (pendiente.current) {
      if (pendiente.current.id === ultimoMsg.id) {
        if (llevarArriba(pendiente.current.ancla) && ultimoMsg.estado === 'hecho') pendiente.current = null
        return
      }
      pendiente.current = null
      anclado.current = false
    }
    if (!anclado.current) {
      if (el) setCerca(el.scrollHeight - el.scrollTop - el.clientHeight < 140)
      // Ni los bloques que siguen saliendo de la respuesta que ya se está leyendo ni la nota de tu
      // propio «Deshacer» son «nuevos mensajes».
      if (ultimoMsg.rol === 'nota') return
      if (!(ultimoMsg.rol === 'agentes' && posicionados.current.has(ultimoMsg.id))) setNuevos((n) => n || ultimoMsg.id)
      return
    }
    if (ultimoMsg.rol === 'agentes' && ultimoMsg.bloquesVisibles > 0) {
      if (posicionados.current.has(ultimoMsg.id)) return
      posicionados.current.add(ultimoMsg.id)
      // La pregunta arriba y la respuesta debajo.
      const previo = mensajes[mensajes.length - 2]
      const ancla = previo && ['usuario', 'decision', 'novedad'].includes(previo.rol) ? previo.id : ultimoMsg.id
      if (!llevarArriba(ancla) || ultimoMsg.estado !== 'hecho') pendiente.current = { id: ultimoMsg.id, ancla }
      // La persona está leyendo la respuesta: lo que llegue después no la mueve.
      anclado.current = false
      return
    }
    alFinal()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firma])

  const estados = useMemo(() => estadoAgentes(s), [s])
  const trabajando = Object.entries(estados).filter(([, e]) => e.estado === 'trabajando').map(([id]) => id)
  const sugerencias = useMemo(() => sugerenciasDe(s), [s])
  const porRevisar = useMemo(() => decisionesAbiertas(s.mundo).length, [s.mundo])

  const ctx = {
    mundo: s.mundo,
    persona,
    despachar,
    enviar,
    enviarEntrada: pedir,
    decidir,
    preguntarA,
    abrirConversacion,
    irATarjeta,
    conversacion,
    onNavigate,
    avisar,
    ocupado,
    deshacible: s.ultimaMutacion?.mensajeId,
    eventosPausados: s.eventosPausados,
  }

  const ultimaNovedadId = [...mensajes].reverse().find((m) => m.rol === 'novedad')?.id
  const capacidad = conversacion?.capacidad ?? CONVERSACIONES_POR_ID[s.actual]?.capacidad
  const nombreAgente = conversacion ? (AGENTES[conversacion.agente]?.nombre ?? 'Orquestador') : 'los agentes'

  return (
    <AgentesCtx.Provider value={ctx}>
      <div className={`ag-app flp-theme ${conversacionIniciada(s) ? 'is-conversando' : ''}`} data-vista={vista} onPointerDownCapture={marcarActividad} onWheelCapture={marcarActividad} onKeyDownCapture={marcarActividad} onTouchStartCapture={marcarActividad}>
        <a href="#ag-entrada" className="ag-skip">
          Ir al campo de mensaje
        </a>
        <Cabecera
          s={s}
          porRevisar={porRevisar}
          onPortada={() => onNavigate('landing')}
          onEquipo={() => setHoja('equipo')}
          onRevisar={() => {
            abrirConversacion('parte', { alFinal: true })
            despachar({ tipo: 'enviar', entrada: { tipo: 'texto', texto: '¿Qué tengo que revisar?', conv: 'parte' } })
            anclado.current = true
          }}
        />

        <div className="ag-cuerpo">
          <aside className="ag-col-izq" aria-label="Conversaciones">
            <div className="ag-panel-scroll">
              <ListaConversaciones items={lista} actual={abierta} onAbrir={(id) => abrirConversacion(id, { desdeLista: true })} onNueva={() => nuevaConversacion()} />
            </div>
          </aside>

          <main className="ag-centro" aria-label={conversacion ? `Conversación: ${conversacion.titulo ?? 'nueva'}` : 'Conversación'}>
            <CabeceraChat conversacion={conversacion} capacidad={capacidad} onVolver={volverALista} />
            <div
              ref={scrollRef}
              className="ag-scroll"
              onScroll={onScroll}
              onWheel={soltar}
              onTouchMove={() => {
                anclado.current = false
                pendiente.current = null
              }}
              onKeyDown={soltar}
            >
              <div className="ag-hilo" key={s.actual ?? 'ninguna'}>
                {mensajes.length > 0 ? (
                  <section aria-labelledby="ag-chat-titulo" className="flex flex-col gap-6">
                    {/* data-msg: el desplazamiento coloca cada respuesta por su mensaje. */}
                    {mensajes.map((m, i) => (
                      <div key={m.id} data-msg={m.id}>
                        <Mensaje msg={m} ultimo={i === mensajes.length - 1} ultimaNovedad={m.id === ultimaNovedadId} />
                      </div>
                    ))}
                  </section>
                ) : (
                  conversacion?.nueva && <EstadoVacio ocupado={ocupado} onPedir={(texto) => enviarAqui({ tipo: 'texto', texto })} />
                )}
                {!ocupado && <Sugerencias items={sugerencias} onElegir={(sg) => pedir(sg.entrada ?? { tipo: 'texto', texto: sg.texto })} />}
                <div ref={finRef} />
              </div>
            </div>
            <div className="ag-pie">
              {nuevos && !cerca && (
                <button
                  type="button"
                  className="ag-nuevos"
                  onClick={() => {
                    // Lo nuevo se lee desde su principio; lo que siga llegando no mueve la vista.
                    anclado.current = false
                    colocarArriba(nuevos)
                    setNuevos(false)
                  }}
                >
                  Nuevos mensajes <span aria-hidden="true">↓</span>
                </button>
              )}
              {ocupado && trabajando.length > 0 && (
                <p className="ag-trabajando-linea" aria-hidden="true">
                  <span className="ag-puntos">
                    <i />
                    <i />
                    <i />
                  </span>
                  {trabajando.length === 1 ? '1 agente trabajando' : `${trabajando.length} agentes trabajando`}
                </p>
              )}
              {/* Un borrador por conversación: lo que escribes se queda en la suya al cambiar. */}
              <Redactor
                key={s.actual ?? 'ninguna'}
                ocupado={ocupado}
                inputRef={inputRef}
                placeholder={conversacion?.agente && conversacion.agente !== 'orquestador' ? `Escribe a ${nombreAgente}…` : 'Escribe a los agentes…'}
                inicial={borradores.current.get(s.actual) ?? ''}
                onCambio={(texto) => borradores.current.set(s.actual, texto)}
                onEnviar={(texto) => enviarAqui({ tipo: 'texto', texto })}
                onEscribir={escribir}
              />
              <p className="ag-pie-nota">
                <span className="hidden sm:inline">Agentes simulados con datos de ejemplo. No se envía nada ni se mueve dinero.</span>
                <span className="sm:hidden">Datos de ejemplo: no se envía nada ni se mueve dinero.</span>
              </p>
            </div>
          </main>
        </div>

        <Hoja abierta={hoja === 'equipo'} onCerrar={cerrarHoja} titulo="El equipo" subtitulo="Cómo actúan y quién hace qué" id="ag-hoja-equipo">
          {hoja === 'equipo' && (
            <div className="ag-carril">
              <LeyendaAutonomia nivel={3} />
              <AgentesPorFamilia
                nivel={3}
                estados={estados}
                onAbrir={(id) => {
                  setHoja(null)
                  setAgenteAbierto(id)
                }}
              />
            </div>
          )}
        </Hoja>

        <DetalleAgente id={agenteAbierto} onCerrar={cerrarAgente} />
        <Anunciador mensajes={mensajes} conv={s.actual} />
      </div>
    </AgentesCtx.Provider>
  )
}
