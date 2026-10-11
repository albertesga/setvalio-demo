// Prototipo conversacional: los agentes de Filmpilot trabajan sobre «La última función».
// Motor simulado y guionizado (src/agentes/): sin modelo de lenguaje y con datos de ejemplo.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import '../agentes/agentes.css'
import '../agentes/ui/pantalla.css'
import { useAgentes } from '../agentes/useAgentes.js'
import { personaDe, estadoTour, conversacionIniciada, vistosDe, epilogoVisto, sugerenciasDe } from '../agentes/sesion.js'
import { decisionesAbiertas } from '../agentes/pendientes.js'
import { AgentesCtx } from '../agentes/ui/contexto.js'
import { Hoja } from '../agentes/ui/Piezas.jsx'
import { Mensaje } from '../agentes/ui/Mensajes.jsx'
import { Sugerencias, Redactor, BarraRecorrido } from '../agentes/ui/Conversacion.jsx'
import { Cabecera, OpcionesDemo, ConfirmarRecorrido } from '../agentes/ui/Cabecera.jsx'
import { AgentesPorFamilia, LoQuePuedesVer, LeyendaAutonomia, DetalleAgente, estadoAgentes } from '../agentes/ui/Paneles.jsx'

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

function Anunciador({ s }) {
  const [texto, setTexto] = useState('')
  const ultimoAnunciado = useRef(null)
  useEffect(() => {
    const ultimo = [...s.mensajes].reverse().find((m) => m.rol === 'agentes' || m.rol === 'novedad')
    if (!ultimo) return
    const clave = `${ultimo.id}-${ultimo.estado ?? ''}`
    if (ultimoAnunciado.current === clave) return
    ultimoAnunciado.current = clave
    if (ultimo.rol === 'novedad') setTexto(`Novedad: ${ultimo.titulo}.`)
    else if (ultimo.estado === 'en_curso') setTexto(`Los agentes trabajan: ${ultimo.turno.titulo}.`)
    else if (ultimo.estado === 'hecho') {
      const decisiones = ultimo.turno.bloques.filter((b) => b.tipo === 'aprobacion').length
      setTexto(`Respuesta lista: ${ultimo.turno.titulo}.${decisiones ? ` Incluye ${decisiones} ${decisiones === 1 ? 'decisión' : 'decisiones'}.` : ''}`)
    }
  }, [s.mensajes])
  return (
    <div className="sr-only" role="status" aria-live="polite">
      {texto}
    </div>
  )
}

export default function Agentes({ onNavigate, contexto, pushToast }) {
  useBloqueoScroll()
  const [ritmo, setRitmo] = useState('normal')
  const { s, despachar } = useAgentes({ ritmo })
  const persona = personaDe(s)
  const ocupado = !!s.activo
  const tour = estadoTour(s)
  const [hoja, setHoja] = useState(null) // 'agentes' (historias y equipo, sin carril) | 'demo' | 'recorrido' (confirmar)
  const [agenteAbierto, setAgenteAbierto] = useState(null)
  const scrollRef = useRef(null)
  const finRef = useRef(null)
  const barraRef = useRef(null)
  const inputRef = useRef(null)
  const [cerca, setCerca] = useState(true)
  const [nuevos, setNuevos] = useState(false)

  const anclado = useRef(true)
  // Respuestas ya colocadas al principio de la vista: no se vuelven a mover.
  const posicionados = useRef(new Set())
  // Último paso del recorrido colocado arriba (id de su mensaje 'guia').
  const pasoColocado = useRef(null)
  // Respuesta que se está colocando arriba: mientras sale (y hasta que hay bastante debajo
  // para que quede arriba) se recoloca con cada bloque, porque lo de encima puede cambiar
  // de alto. Se suelta en cuanto la persona se desplaza.
  const pendiente = useRef(null)
  // Lo que se pide desde una hoja, una tarjeta o una sugerencia: cierra la hoja,
  // vuelve a seguir la conversación y devuelve el foco al redactor (no en pantallas táctiles).
  const trasPedir = useCallback(() => {
    setHoja(null)
    anclado.current = true
    if (!window.matchMedia?.('(pointer: coarse)').matches) requestAnimationFrame(() => inputRef.current?.focus())
  }, [])
  const enviarEntrada = useCallback(
    (entrada) => {
      despachar({ tipo: 'enviar', entrada })
      trasPedir()
    },
    [despachar, trasPedir],
  )
  const enviar = useCallback((texto) => enviarEntrada({ tipo: 'texto', texto }), [enviarEntrada])
  // Una sugerencia puede traer su entrada (una novedad, por ejemplo); si no, se pregunta su texto.
  const elegirSugerencia = useCallback((sg) => enviarEntrada(sg.entrada ?? { tipo: 'texto', texto: sg.texto }), [enviarEntrada])
  const decidir = useCallback((accion, etiqueta) => enviarEntrada({ tipo: 'accion', accion, etiqueta }), [enviarEntrada])
  const avisar = useCallback((texto) => pushToast?.(texto), [pushToast])
  const cerrarHoja = useCallback(() => setHoja(null), [])
  const cerrarAgente = useCallback(() => setAgenteAbierto(null), [])
  const escribir = useCallback(() => despachar({ tipo: 'actividad' }), [despachar])
  // Leer, desplazarse o pulsar también es actividad: las novedades que llegan solas
  // esperan a que la persona deje la pantalla quieta, no la interrumpen mientras lee.
  const ultimaActividad = useRef(0)
  const marcarActividad = useCallback(() => {
    const ahora = Date.now()
    if (ahora - ultimaActividad.current < 1000) return
    ultimaActividad.current = ahora
    despachar({ tipo: 'actividad' })
  }, [despachar])

  // Al abrir, el parte de la mañana ya está escrito: no se ve a los agentes prepararlo.
  // Si la portada pide algo, el recorrido empieza después del parte y una pregunta llega justo debajo.
  const pedidoAtendido = useRef(null)
  const vacia = s.mensajes.length === 0
  useEffect(() => {
    if (contexto && pedidoAtendido.current !== contexto) {
      pedidoAtendido.current = contexto
      if (contexto.tour) {
        if (!s.tour) despachar({ tipo: 'tour/iniciar' })
        return
      }
      if (contexto.pregunta) {
        despachar({ tipo: 'saludar', instantaneo: true })
        enviar(contexto.pregunta)
        return
      }
    }
    if (vacia && !s.tour) despachar({ tipo: 'saludar', instantaneo: true })
  }, [contexto, vacia, s.tour, despachar, enviar])

  // El recorrido. Con conversación en marcha pide confirmar (el parte solo no cuenta);
  // al empezar, vuelve a seguir la conversación desde el paso 1.
  const hayConversacion = conversacionIniciada(s)
  const empezarRecorrido = useCallback(() => {
    setHoja(null)
    posicionados.current.clear()
    pasoColocado.current = null
    anclado.current = true
    despachar({ tipo: 'tour/iniciar' })
  }, [despachar])
  const iniciarRecorrido = useCallback(() => {
    if (hayConversacion) setHoja('recorrido')
    else empezarRecorrido()
  }, [hayConversacion, empezarRecorrido])

  // Al empezar el recorrido, el foco va a su barra: ahí están el paso, la nota y «Siguiente».
  const enRecorrido = !!s.tour
  useEffect(() => {
    if (enRecorrido) requestAnimationFrame(() => barraRef.current?.focus({ preventScroll: true }))
  }, [enRecorrido])

  // Desplazamiento. Mientras los agentes trabajan, sigue el final; cuando llega la
  // respuesta, la deja empezando arriba para leerla desde el principio. Si la
  // persona sube a leer otra cosa, deja de moverla y ofrece «Nuevos mensajes».
  const alFinal = (suave = true) => {
    const el = scrollRef.current
    if (!el) return
    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    el.scrollTo({ top: el.scrollHeight, behavior: suave && !reducido ? 'smooth' : 'auto' })
  }
  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const estaCerca = el.scrollHeight - el.scrollTop - el.clientHeight < 140
    setCerca(estaCerca)
    if (estaCerca) {
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
  const ultimoMsg = s.mensajes[s.mensajes.length - 1]
  const firma = `${s.mensajes.length}-${ultimoMsg?.id ?? ''}-${ultimoMsg?.bloquesVisibles ?? 0}-${ultimoMsg?.estadoPasos?.join('') ?? ''}-${ultimoMsg?.estado ?? ''}-${s.tour?.paso ?? ''}`
  useEffect(() => {
    if (!s.tour) pasoColocado.current = null
    if (!ultimoMsg) {
      posicionados.current.clear()
      return
    }
    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const el = scrollRef.current
    // Devuelve si el mensaje ha podido quedar arriba (si no, falta contenido debajo).
    const llevarArriba = (id) => {
      const nodo = document.querySelector(`[data-msg="${id}"]`)
      if (!nodo || !el) return true
      const top = nodo.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - 12
      el.scrollTo({ top, behavior: reducido ? 'auto' : 'smooth' })
      return top <= el.scrollHeight - el.clientHeight + 1
    }
    // Cada paso del recorrido empieza arriba, con su separador; el primero es el parte,
    // que ya está al principio. Lo que responden los agentes crece debajo sin mover la vista.
    const guia = s.tour ? [...s.mensajes].reverse().find((m) => m.rol === 'guia') : null
    if (guia && pasoColocado.current !== guia.id) {
      pasoColocado.current = guia.id
      if (guia.indice === 0) el?.scrollTo({ top: 0, behavior: 'auto' })
      else llevarArriba(guia.id)
      setNuevos(false)
      anclado.current = false
      return
    }
    // La respuesta que se está colocando se recoloca con cada bloque hasta quedar arriba y terminada.
    if (pendiente.current) {
      if (pendiente.current === ultimoMsg.id) {
        if (llevarArriba(ultimoMsg.id) && ultimoMsg.estado === 'hecho') pendiente.current = null
        return
      }
      pendiente.current = null
    }
    // El parte de la mañana ya está arriba al abrir: no se mueve, se lee desde su fecha.
    if (ultimoMsg.rol === 'agentes' && ultimoMsg.origen === 'saludo') {
      posicionados.current.add(ultimoMsg.id)
      anclado.current = false
      return
    }
    if (!anclado.current) {
      // Los bloques que siguen saliendo de la respuesta que ya se está leyendo no son «nuevos
      // mensajes»; en el recorrido tampoco, porque cada paso ya se coloca solo.
      if (!s.tour && !(ultimoMsg.rol === 'agentes' && posicionados.current.has(ultimoMsg.id))) setNuevos(true)
      return
    }
    if (ultimoMsg.rol === 'agentes' && ultimoMsg.bloquesVisibles > 0) {
      if (posicionados.current.has(ultimoMsg.id)) return
      posicionados.current.add(ultimoMsg.id)
      if (!llevarArriba(ultimoMsg.id) || ultimoMsg.estado !== 'hecho') pendiente.current = ultimoMsg.id
      // La persona está leyendo la respuesta: lo que llegue después no la mueve.
      anclado.current = false
      return
    }
    alFinal()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firma])

  const estados = useMemo(() => estadoAgentes(s), [s])
  const trabajando = Object.entries(estados).filter(([, e]) => e.estado === 'trabajando').map(([id]) => id)

  // Para seguir: la siguiente historia sin ver y las del turno, tres como mucho (sesion.js).
  const sugerencias = useMemo(() => sugerenciasDe(s), [s])
  const vistos = useMemo(() => vistosDe(s), [s])
  const porRevisar = useMemo(() => decisionesAbiertas(s.mundo).length, [s.mundo])

  // El aviso completo de «En exploración» sale la primera vez; después, solo la etiqueta.
  const primerAviso = useMemo(() => {
    const out = {}
    for (const m of s.mensajes) {
      if (m.rol !== 'agentes') continue
      for (const b of m.turno.bloques) if (b.tipo === 'aviso' && !(b.tono in out)) out[b.tono] = m.id
    }
    return out
  }, [s.mensajes])

  const ctx = {
    mundo: s.mundo,
    persona,
    despachar,
    enviar,
    enviarEntrada,
    decidir,
    onNavigate,
    avisar,
    ocupado,
    deshacible: s.ultimaMutacion?.mensajeId,
    eventosPausados: s.eventosPausados,
    primerAviso,
    iniciarRecorrido,
    enRecorrido,
    vistos,
  }

  // El carril: lo que puedes ver arriba, cómo actúan y el equipo. A la izquierda desde
  // 1024 px; por debajo, en una hoja que abre por las historias.
  const carril = (enHoja) => (
    <div className="ag-carril">
      <LoQuePuedesVer nivel={enHoja ? 3 : 2} epilogoVisto={epilogoVisto(s)} />
      <LeyendaAutonomia nivel={enHoja ? 3 : 2} />
      <AgentesPorFamilia
        nivel={enHoja ? 3 : 2}
        estados={estados}
        onAbrir={(id) => {
          if (enHoja) setHoja(null)
          setAgenteAbierto(id)
        }}
      />
    </div>
  )

  const ultimaNovedadId = [...s.mensajes].reverse().find((m) => m.rol === 'novedad')?.id

  return (
    <AgentesCtx.Provider value={ctx}>
      <div className={`ag-app flp-theme ${enRecorrido ? 'is-recorrido' : ''} ${hayConversacion ? 'is-conversando' : ''}`} onPointerDownCapture={marcarActividad} onWheelCapture={marcarActividad} onKeyDownCapture={marcarActividad} onTouchStartCapture={marcarActividad}>
        <a href="#ag-entrada" className="ag-skip">
          Ir al campo de mensaje
        </a>
        <Cabecera
          s={s}
          persona={persona}
          porRevisar={porRevisar}
          onPortada={() => onNavigate('landing')}
          onHistorias={() => setHoja('agentes')}
          onDemo={() => setHoja('demo')}
          onRecorrido={iniciarRecorrido}
          onRevisar={() => enviar('¿Qué tengo que revisar?')}
        />

        <div className="ag-cuerpo">
          <aside className="ag-col-izq" aria-labelledby="ag-titulo-agentes">
            <div className="ag-panel-scroll">
              <h2 id="ag-titulo-agentes" className="sr-only">
                Historias y equipo
              </h2>
              {carril(false)}
            </div>
          </aside>

          <main className="ag-centro" aria-label="Conversación con los agentes">
            <BarraRecorrido
              ref={barraRef}
              tour={tour}
              ocupado={ocupado || s.cola.length > 0}
              onSiguiente={() => {
                // Sigue al paso nuevo: la respuesta anterior ya está leída.
                anclado.current = true
                despachar({ tipo: 'tour/siguiente' })
              }}
              onSalir={() => {
                setNuevos(false)
                despachar({ tipo: 'tour/salir' })
              }}
            />
            <div ref={scrollRef} className="ag-scroll" onScroll={onScroll} onWheel={soltar} onTouchMove={() => {
                anclado.current = false
                pendiente.current = null
              }} onKeyDown={soltar}>
              <div className="ag-hilo">
                {s.mensajes.length > 0 && (
                  <section aria-labelledby="ag-titulo-conversacion" className="space-y-6">
                    <h2 id="ag-titulo-conversacion" className="sr-only">
                      Conversación
                    </h2>
                    {/* data-msg: el desplazamiento coloca cada respuesta y cada paso del recorrido por su mensaje. */}
                    {s.mensajes.map((m, i) => (
                      <div key={m.id} data-msg={m.id}>
                        <Mensaje msg={m} ultimo={i === s.mensajes.length - 1} ultimaNovedad={m.id === ultimaNovedadId} />
                      </div>
                    ))}
                  </section>
                )}
                {!tour && !ocupado && <Sugerencias items={sugerencias} onElegir={elegirSugerencia} />}
                <div ref={finRef} />
              </div>
            </div>
            <div className="ag-pie">
              {/* En el recorrido cada paso se coloca solo: no hace falta el aviso. */}
              {nuevos && !cerca && !tour && (
                <button
                  type="button"
                  className="ag-nuevos"
                  onClick={() => {
                    anclado.current = true
                    alFinal()
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
              <Redactor ocupado={ocupado} inputRef={inputRef} onEnviar={enviar} onEscribir={escribir} />
              {!tour && (
                <p className="ag-pie-nota">
                  <span className="hidden sm:inline">Agentes simulados con datos de ejemplo. No se envía nada ni se mueve dinero.</span>
                  <span className="sm:hidden">Datos de ejemplo: no se envía nada ni se mueve dinero.</span>
                </p>
              )}
            </div>
          </main>
        </div>

        <Hoja abierta={hoja === 'agentes'} onCerrar={cerrarHoja} titulo="Historias y equipo" id="ag-hoja-agentes">
          {hoja === 'agentes' && carril(true)}
        </Hoja>

        <Hoja abierta={hoja === 'demo'} onCerrar={cerrarHoja} titulo="Opciones de la demo" subtitulo={`Ahora: ${persona.nombre} · ${persona.rol}`} id="ag-hoja-demo">
          <OpcionesDemo s={s} despachar={despachar} ritmo={ritmo} setRitmo={setRitmo} onCerrar={cerrarHoja} avisar={avisar} />
        </Hoja>

        <Hoja abierta={hoja === 'recorrido'} onCerrar={cerrarHoja} titulo="¿Empezar el recorrido desde cero?" id="ag-hoja-recorrido">
          {hoja === 'recorrido' && <ConfirmarRecorrido onConfirmar={empezarRecorrido} onCancelar={cerrarHoja} />}
        </Hoja>

        <DetalleAgente id={agenteAbierto} onCerrar={cerrarAgente} />
        <Anunciador s={s} />
      </div>
    </AgentesCtx.Provider>
  )
}
