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
import { decisionesAbiertas } from '../agentes/ui/Bloques.jsx'
import { Inicio, Sugerencias, Redactor, BarraRecorrido } from '../agentes/ui/Conversacion.jsx'
import { Cabecera, OpcionesDemo } from '../agentes/ui/Cabecera.jsx'
import { AgentesPorFamilia, CasosTracker, DetalleAgente, PanelActividad, PanelDecisiones, PanelRiesgos, estadoAgentes, casosVistos } from '../agentes/ui/Paneles.jsx'
import { riesgosAltos } from '../agentes/rodaje.js'

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
  const [hoja, setHoja] = useState(null) // 'actividad' | 'demo'
  const [pestana, setPestana] = useState('revisar')
  const [agenteAbierto, setAgenteAbierto] = useState(null)
  const scrollRef = useRef(null)
  const finRef = useRef(null)
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

  // Recorrido pedido desde la portada.
  const tourPedido = useRef(false)
  useEffect(() => {
    if (contexto?.tour && !tourPedido.current && !s.tour) {
      tourPedido.current = true
      despachar({ tipo: 'tour/iniciar' })
    }
  }, [contexto, s.tour, despachar])

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
      setNuevos(true)
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
  const pendientes = decisionesAbiertas(s.mundo).length
  const altos = riesgosAltos(s.mundo).length
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

  const ctx = { mundo: s.mundo, persona, despachar, enviar, enviarEntrada, decidir, onNavigate, avisar, ocupado, deshacible: s.ultimaMutacion?.mensajeId }

  const abrirHoja = (que) => {
    setHoja(que)
    if (que === 'actividad') despachar({ tipo: 'leerNovedades' })
  }

  const panelDerecho = (pref) => (
    <>
      <div className="ag-tabs" role="tablist" aria-label="Por revisar, actividad y riesgos">
        {[
          ['revisar', 'Por revisar', pendientes],
          ['actividad', 'Actividad', s.novedades],
          ['riesgos', 'Riesgos', altos],
          ['casos', 'Casos', null],
        ].map(([id, etiqueta, n]) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`${pref}-tab-${id}`}
            aria-selected={pestana === id}
            aria-controls={`${pref}-tabpanel-${id}`}
            tabIndex={pestana === id ? 0 : -1}
            className={`ag-tab ${id === 'casos' && pref === 'lateral' ? 'ag-tab--casos' : ''}`}
            onClick={() => {
              setPestana(id)
              if (id === 'actividad') despachar({ tipo: 'leerNovedades' })
            }}
            onKeyDown={(e) => {
              const visibles = [...e.currentTarget.parentElement.querySelectorAll('[role="tab"]')].filter((el) => el.offsetParent !== null)
              const i = visibles.indexOf(e.currentTarget)
              let sig = null
              if (e.key === 'ArrowRight') sig = visibles[(i + 1) % visibles.length]
              if (e.key === 'ArrowLeft') sig = visibles[(i + visibles.length - 1) % visibles.length]
              if (e.key === 'Home') sig = visibles[0]
              if (e.key === 'End') sig = visibles[visibles.length - 1]
              if (!sig) return
              e.preventDefault()
              sig.click()
              sig.focus()
            }}
          >
            {etiqueta}
            {n ? <span className={`ag-tab-n tnum ${id === 'revisar' ? 'is-revisar' : ''}`}>{n}</span> : null}
          </button>
        ))}
      </div>
      <div id={`${pref}-tabpanel-${pestana}`} role="tabpanel" aria-labelledby={`${pref}-tab-${pestana}`} className="ag-panel-scroll">
        {pestana === 'actividad' && <PanelActividad s={s} />}
        {pestana === 'revisar' && <PanelDecisiones s={s} />}
        {pestana === 'riesgos' && <PanelRiesgos s={s} />}
        {pestana === 'casos' && <CasosTracker vistos={s.casosVistos} />}
      </div>
    </>
  )

  const vistos = casosVistos(s.casosVistos)

  return (
    <AgentesCtx.Provider value={ctx}>
      <div className="ag-app flp-theme">
        <a href="#ag-entrada" className="ag-skip">
          Ir al campo de mensaje
        </a>
        <Cabecera s={s} persona={persona} pendientes={pendientes} onPortada={() => onNavigate('landing')} onActividad={() => abrirHoja('actividad')} onDemo={() => setHoja('demo')} />

        <div className="ag-cuerpo">
          <aside className="ag-col-izq" aria-label="Agentes">
            <div className="ag-panel-scroll">
              <AgentesPorFamilia estados={estados} onAbrir={setAgenteAbierto} />
              <div className="mt-5 border-t border-flp-line pt-1">
                <Desplegable titulo="Casos de uso" resumen={`${vistos} de ${CASOS.length} vistos`}>
                  <CasosTracker vistos={s.casosVistos} cabecera={false} />
                </Desplegable>
              </div>
            </div>
          </aside>

          <main className="ag-centro" aria-label="Conversación con los agentes">
            <BarraRecorrido tour={tour} onSiguiente={() => despachar({ tipo: 'tour/siguiente' })} onSalir={() => despachar({ tipo: 'tour/salir' })} />
            <div ref={scrollRef} className="ag-scroll" onScroll={onScroll} onWheel={soltar} onTouchMove={() => (anclado.current = false)} onKeyDown={soltar}>
              <div className="ag-hilo">
                {s.mensajes.length === 0 ? (
                  <Inicio persona={persona} estados={estados} onAbrirAgente={setAgenteAbierto} onRecorrido={() => despachar({ tipo: 'tour/iniciar' })} />
                ) : (
                  <section aria-label="Mensajes" className="space-y-6">
                    {s.mensajes.map((m, i) => (
                      <Mensaje key={m.id} msg={m} ultimo={i === s.mensajes.length - 1} />
                    ))}
                  </section>
                )}
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
                  Nuevos mensajes ↓
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
              {!tour && <Sugerencias items={sugerencias} onElegir={enviar} deshabilitado={ocupado} />}
              <Redactor ocupado={ocupado} inputRef={inputRef} onEnviar={enviar} onEscribir={escribir} />
              <p className="ag-pie-nota">Agentes simulados con datos de ejemplo. No se envía nada ni se mueve dinero.</p>
            </div>
          </main>

          <aside className="ag-col-der" aria-label="Por revisar, actividad y riesgos">
            {panelDerecho('lateral')}
          </aside>
        </div>

        <Hoja abierta={hoja === 'actividad'} onCerrar={cerrarHoja} titulo="Por revisar, actividad y riesgos" id="ag-hoja-actividad">
          {hoja === 'actividad' && panelDerecho('hoja')}
        </Hoja>

        <Hoja abierta={hoja === 'demo'} onCerrar={cerrarHoja} titulo="Opciones de la demo" subtitulo={`Ves la demo como ${persona.nombre} · ${persona.rol}`} id="ag-hoja-demo">
          <OpcionesDemo
            s={s}
            despachar={despachar}
            ritmo={ritmo}
            setRitmo={setRitmo}
            ocupado={ocupado}
            estados={estados}
            onNavigate={onNavigate}
            onCerrar={cerrarHoja}
            onAbrirAgente={setAgenteAbierto}
          />
        </Hoja>

        <DetalleAgente id={agenteAbierto} onCerrar={cerrarAgente} />
        <Anunciador s={s} />
      </div>
    </AgentesCtx.Provider>
  )
}
