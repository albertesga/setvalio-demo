// Prototipo conversacional: los agentes de Filmpilot trabajan sobre «La última función».
// Motor simulado y guionizado (src/agentes/): sin modelo de lenguaje y con datos de ejemplo.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import '../agentes/agentes.css'
import { useAgentes } from '../agentes/useAgentes.js'
import { personaDe, estadoTour } from '../agentes/sesion.js'
import { CASOS } from '../agentes/casos.js'
import { AgentesCtx } from '../agentes/ui/contexto.js'
import { Hoja, Desplegable } from '../agentes/ui/Piezas.jsx'
import { Mensaje } from '../agentes/ui/Mensajes.jsx'
import { Sugerencias, Redactor, BarraRecorrido } from '../agentes/ui/Conversacion.jsx'
import { Cabecera, OpcionesDemo } from '../agentes/ui/Cabecera.jsx'
import { AgentesPorFamilia, CasosTracker, DetalleAgente, estadoAgentes, casosVistos } from '../agentes/ui/Paneles.jsx'

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
  const [hoja, setHoja] = useState(null) // 'agentes' (móvil) | 'demo'
  const [agenteAbierto, setAgenteAbierto] = useState(null)
  const scrollRef = useRef(null)
  const finRef = useRef(null)
  const barraRef = useRef(null)
  const inputRef = useRef(null)
  const [cerca, setCerca] = useState(true)
  const [nuevos, setNuevos] = useState(false)

  const anclado = useRef(true)
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

  // Al empezar el recorrido, el foco va a su barra: ahí están el paso, la nota y «Siguiente».
  const enRecorrido = !!s.tour
  useEffect(() => {
    if (enRecorrido) requestAnimationFrame(() => barraRef.current?.focus())
  }, [enRecorrido])

  // Desplazamiento. Mientras los agentes trabajan, sigue el final; cuando llega la
  // respuesta, la deja empezando arriba para leerla desde el principio. Si la
  // persona sube a leer otra cosa, deja de moverla y ofrece «Nuevos mensajes».
  const posicionados = useRef(new Set())
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
    if (e.type === 'wheel' && e.deltaY >= 0) return
    if (e.type === 'keydown' && !['ArrowUp', 'PageUp', 'Home'].includes(e.key)) return
    anclado.current = false
  }
  const ultimoMsg = s.mensajes[s.mensajes.length - 1]
  const firma = `${s.mensajes.length}-${ultimoMsg?.bloquesVisibles ?? 0}-${ultimoMsg?.estadoPasos?.join('') ?? ''}`
  useEffect(() => {
    if (!ultimoMsg) {
      posicionados.current.clear()
      return
    }
    if (!anclado.current) {
      // Los bloques que siguen saliendo de la respuesta que ya se está leyendo no son «nuevos mensajes».
      if (!(ultimoMsg.rol === 'agentes' && posicionados.current.has(ultimoMsg.id))) setNuevos(true)
      return
    }
    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (ultimoMsg.rol === 'agentes' && ultimoMsg.bloquesVisibles > 0) {
      if (posicionados.current.has(ultimoMsg.id)) return
      posicionados.current.add(ultimoMsg.id)
      const art = document.getElementById(`msg-${ultimoMsg.id}`)
      const el = scrollRef.current
      if (art && el) {
        const top = art.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - 12
        el.scrollTo({ top, behavior: reducido ? 'auto' : 'smooth' })
      }
      // La persona está leyendo la respuesta: lo que llegue después no la mueve.
      anclado.current = false
      return
    }
    alFinal()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firma])

  const estados = useMemo(() => estadoAgentes(s), [s])
  const trabajando = Object.entries(estados).filter(([, e]) => e.estado === 'trabajando').map(([id]) => id)

  const ultimoAgentes = [...s.mensajes].reverse().find((m) => m.rol === 'agentes')
  const sugerencias = useMemo(() => {
    if (!ultimoAgentes || ultimoAgentes.estado === 'en_curso') return []
    const base = [...ultimoAgentes.turno.sugerencias]
    const textos = new Set(base.map((x) => x.texto))
    const sinVer = CASOS.find((x) => !s.casosVistos.includes(x.id) && !textos.has(x.prompt))
    // Tres como mucho: el pie no debe comerse la conversación.
    if (sinVer && base.length < 3) base.push({ etiqueta: sinVer.prompt, texto: sinVer.prompt })
    return base.slice(0, 3)
  }, [ultimoAgentes, s.casosVistos])

  // El aviso completo de «Exploratorio» o «Sin validar» sale la primera vez; después, solo la etiqueta.
  const primerAviso = useMemo(() => {
    const out = {}
    for (const m of s.mensajes) {
      if (m.rol !== 'agentes') continue
      for (const b of m.turno.bloques) if (b.tipo === 'aviso' && !(b.tono in out)) out[b.tono] = m.id
    }
    return out
  }, [s.mensajes])

  const ctx = { mundo: s.mundo, persona, despachar, enviar, enviarEntrada, decidir, onNavigate, avisar, ocupado, deshacible: s.ultimaMutacion?.mensajeId, eventosPausados: s.eventosPausados, primerAviso }

  // El carril de agentes y casos de uso: a la izquierda desde 1024 px; en móvil, en una hoja.
  const carril = (enHoja) => (
    <>
      <AgentesPorFamilia
        estados={estados}
        onAbrir={(id) => {
          if (enHoja) setHoja(null)
          setAgenteAbierto(id)
        }}
      />
      <div className="mt-5 border-t border-flp-line pt-1">
        <Desplegable titulo="Casos de uso" resumen={`${vistos} de ${CASOS.length} vistos`} nivel={enHoja ? 3 : 2}>
          <CasosTracker vistos={s.casosVistos} cabecera={false} />
        </Desplegable>
      </div>
    </>
  )

  const vistos = casosVistos(s.casosVistos)
  const ultimaNovedadId = [...s.mensajes].reverse().find((m) => m.rol === 'novedad')?.id

  return (
    <AgentesCtx.Provider value={ctx}>
      <div className="ag-app flp-theme" onPointerDownCapture={marcarActividad} onWheelCapture={marcarActividad} onKeyDownCapture={marcarActividad} onTouchStartCapture={marcarActividad}>
        <a href="#ag-entrada" className="ag-skip">
          Ir al campo de mensaje
        </a>
        <Cabecera s={s} persona={persona} onPortada={() => onNavigate('landing')} onAgentes={() => setHoja('agentes')} onDemo={() => setHoja('demo')} />

        <div className="ag-cuerpo">
          <aside className="ag-col-izq" aria-labelledby="ag-titulo-agentes">
            <div className="ag-panel-scroll">
              <h2 id="ag-titulo-agentes" className="sr-only">
                Agentes
              </h2>
              {carril(false)}
            </div>
          </aside>

          <main className="ag-centro" aria-label="Conversación con los agentes">
            <BarraRecorrido
              ref={barraRef}
              tour={tour}
              onSiguiente={() => {
                // Sigue al paso nuevo: la respuesta anterior ya está leída.
                anclado.current = true
                despachar({ tipo: 'tour/siguiente' })
              }}
              onSalir={() => despachar({ tipo: 'tour/salir' })}
            />
            <div ref={scrollRef} className="ag-scroll" onScroll={onScroll} onWheel={soltar} onTouchMove={() => (anclado.current = false)} onKeyDown={soltar}>
              <div className="ag-hilo">
                {s.mensajes.length > 0 && (
                  <section aria-labelledby="ag-titulo-conversacion" className="space-y-6">
                    <h2 id="ag-titulo-conversacion" className="sr-only">
                      Conversación
                    </h2>
                    {s.mensajes.map((m, i) => (
                      <Mensaje key={m.id} msg={m} ultimo={i === s.mensajes.length - 1} ultimaNovedad={m.id === ultimaNovedadId} />
                    ))}
                  </section>
                )}
                {!tour && !ocupado && <Sugerencias items={sugerencias} onElegir={enviar} />}
                <div ref={finRef} />
              </div>
            </div>
            <div className="ag-pie">
              {nuevos && !cerca && (
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
              <p className="ag-pie-nota">Agentes simulados con datos de ejemplo. No se envía nada ni se mueve dinero.</p>
            </div>
          </main>
        </div>

        <Hoja abierta={hoja === 'agentes'} onCerrar={cerrarHoja} titulo="Agentes y casos de uso" id="ag-hoja-agentes">
          {hoja === 'agentes' && carril(true)}
        </Hoja>

        <Hoja abierta={hoja === 'demo'} onCerrar={cerrarHoja} titulo="Opciones de la demo" subtitulo={`Ahora: ${persona.nombre} · ${persona.rol}`} id="ag-hoja-demo">
          <OpcionesDemo s={s} despachar={despachar} ritmo={ritmo} setRitmo={setRitmo} ocupado={ocupado} onNavigate={onNavigate} onCerrar={cerrarHoja} avisar={avisar} />
        </Hoja>

        <DetalleAgente id={agenteAbierto} onCerrar={cerrarAgente} />
        <Anunciador s={s} />
      </div>
    </AgentesCtx.Provider>
  )
}
