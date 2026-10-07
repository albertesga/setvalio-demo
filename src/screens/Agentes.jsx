// Prototipo conversacional: los agentes de SetValio trabajan sobre «La última función».
// Motor simulado y guionizado (src/agentes/): sin modelo de lenguaje y con datos de ejemplo.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import '../agentes/agentes.css'
import { BrandLockup, SetvalioMark } from '../components/Brand.jsx'
import { IconBell, IconMenu, IconMore, IconArrowLeft, IconPlay } from '../components/icons.jsx'
import { useAgentes, RITMOS } from '../agentes/useAgentes.js'
import { personaDe, estadoTour } from '../agentes/sesion.js'
import { PERSONAS } from '../agentes/mundo.js'
import { CASOS } from '../agentes/casos.js'
import * as c from '../agentes/calculos.js'
import { AgentesCtx } from '../agentes/ui/contexto.js'
import { Hoja } from '../agentes/ui/Piezas.jsx'
import { Mensaje } from '../agentes/ui/Mensajes.jsx'
import { Inicio, Sugerencias, Redactor, BarraRecorrido } from '../agentes/ui/Conversacion.jsx'
import { AgentRail, CasosTracker, DetalleAgente, PanelActividad, PanelDecisiones, estadoAgentes } from '../agentes/ui/Paneles.jsx'

function useTema() {
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]')
    const original = meta?.getAttribute('content')
    meta?.setAttribute('content', '#F4F1E8')
    // La pantalla ocupa el alto visible y desplaza sus columnas por dentro: el documento no se mueve.
    const html = document.documentElement
    const previos = [html.style.overflow, document.body.style.overflow]
    html.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    window.scrollTo(0, 0)
    return () => {
      if (original != null) meta?.setAttribute('content', original)
      html.style.overflow = previos[0]
      document.body.style.overflow = previos[1]
    }
  }, [])
}

function PildoraDemo() {
  const [abierta, setAbierta] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!abierta) return
    const fuera = (e) => {
      if (!ref.current?.contains(e.target)) setAbierta(false)
    }
    const esc = (e) => e.key === 'Escape' && setAbierta(false)
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', fuera)
      document.removeEventListener('keydown', esc)
    }
  }, [abierta])
  return (
    <div ref={ref} className="relative">
      <button type="button" className="ag-demo-pill" aria-expanded={abierta} aria-controls="ag-demo-info" onClick={() => setAbierta((v) => !v)}>
        Demo · agentes simulados
      </button>
      {abierta && (
        <div id="ag-demo-info" className="ag-popover" role="dialog" aria-label="Sobre esta demo">
          <p>
            Esta pantalla es una demostración. Los agentes siguen guiones preparados sobre datos de ejemplo de «La última función» (Candilejas Films). No hay un modelo de lenguaje detrás, no se conecta a bancos y no se envía ningún correo.
          </p>
          <p className="mt-2">Las cifras salen de los datos de la demo y de sus reglas de cálculo. Lo marcado como «Exploratorio» o «Fase posterior» no forma parte del alcance decidido.</p>
        </div>
      )}
    </div>
  )
}

function MenuMas({ ritmo, setRitmo, onReiniciar, onNavigate }) {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!abierto) return
    const fuera = (e) => {
      if (!ref.current?.contains(e.target)) setAbierto(false)
    }
    const esc = (e) => e.key === 'Escape' && setAbierto(false)
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', fuera)
      document.removeEventListener('keydown', esc)
    }
  }, [abierto])
  return (
    <div ref={ref} className="relative">
      <button type="button" className="ag-icon-button" aria-label="Más opciones" aria-expanded={abierto} onClick={() => setAbierto((v) => !v)}>
        <IconMore size={20} />
      </button>
      {abierto && (
        <div className="ag-popover ag-popover--menu" role="menu">
          <label className="block px-3 pb-1 pt-2 text-xs font-bold text-muted" htmlFor="ag-ritmo">
            Ritmo de los agentes
          </label>
          <select id="ag-ritmo" className="fp-input mx-3 mb-2 w-[calc(100%-1.5rem)] px-2 text-sm" value={ritmo} onChange={(e) => setRitmo(e.target.value)}>
            {Object.entries(RITMOS).map(([k, r]) => (
              <option key={k} value={k}>
                {r.etiqueta}
              </option>
            ))}
          </select>
          <button type="button" role="menuitem" className="ag-menu-item" onClick={() => { setAbierto(false); onNavigate('panel') }}>
            Abrir la demo clásica
          </button>
          <button type="button" role="menuitem" className="ag-menu-item" onClick={() => { setAbierto(false); onNavigate('landing') }}>
            Volver a la portada
          </button>
          <button type="button" role="menuitem" className="ag-menu-item text-negative" onClick={() => { setAbierto(false); onReiniciar() }}>
            Reiniciar la demo
          </button>
        </div>
      )}
    </div>
  )
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
  useTema()
  const [ritmo, setRitmo] = useState('normal')
  const { s, despachar } = useAgentes({ ritmo })
  const persona = personaDe(s)
  const ocupado = !!s.activo
  const tour = estadoTour(s)
  const [hoja, setHoja] = useState(null) // 'actividad' | 'menu'
  const [pestana, setPestana] = useState('actividad')
  const [agenteAbierto, setAgenteAbierto] = useState(null)
  const scrollRef = useRef(null)
  const finRef = useRef(null)
  const inputRef = useRef(null)
  const [cerca, setCerca] = useState(true)
  const [nuevos, setNuevos] = useState(false)

  const enviar = useCallback((texto) => despachar({ tipo: 'enviar', entrada: { tipo: 'texto', texto } }), [despachar])
  const enviarEntrada = useCallback((entrada) => despachar({ tipo: 'enviar', entrada }), [despachar])
  const decidir = useCallback((accion, etiqueta) => despachar({ tipo: 'enviar', entrada: { tipo: 'accion', accion, etiqueta } }), [despachar])
  const avisar = useCallback((texto) => pushToast?.(texto), [pushToast])

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
  const anclado = useRef(true)
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
    if (!ultimoMsg) return
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
      return
    }
    alFinal()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firma])

  const estados = useMemo(() => estadoAgentes(s), [s])
  const pendientes = c.excepciones(s.mundo).length
  const trabajando = Object.entries(estados).filter(([, e]) => e.estado === 'trabajando').map(([id]) => id)

  const ultimoAgentes = [...s.mensajes].reverse().find((m) => m.rol === 'agentes')
  const sugerencias = useMemo(() => {
    if (!ultimoAgentes || ultimoAgentes.estado === 'en_curso') return []
    const base = [...ultimoAgentes.turno.sugerencias]
    const textos = new Set(base.map((x) => x.texto))
    const sinVer = CASOS.find((x) => !s.casosVistos.includes(x.id) && !textos.has(x.prompt))
    if (sinVer && base.length < 4) base.push({ etiqueta: sinVer.prompt, texto: sinVer.prompt })
    return base.slice(0, 4)
  }, [ultimoAgentes, s.casosVistos])

  const ctx = { mundo: s.mundo, persona, despachar, enviar, enviarEntrada, decidir, onNavigate, avisar, ocupado, deshacible: s.ultimaMutacion?.mensajeId }

  const abrirHoja = (que) => {
    setHoja(que)
    if (que === 'actividad') despachar({ tipo: 'leerNovedades' })
  }

  const panelDerecho = (pref) => (
    <>
      <div className="ag-tabs" role="tablist" aria-label="Panel de agentes">
        {[
          ['actividad', 'Actividad', s.novedades],
          ['decisiones', 'Decisiones', pendientes],
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
            className={`ag-tab ${id === 'casos' ? 'xl:hidden' : ''}`}
            onClick={() => {
              setPestana(id)
              if (id === 'actividad') despachar({ tipo: 'leerNovedades' })
            }}
            onKeyDown={(e) => {
              const orden = ['actividad', 'decisiones', 'casos']
              const i = orden.indexOf(pestana)
              if (e.key === 'ArrowRight') setPestana(orden[(i + 1) % orden.length])
              if (e.key === 'ArrowLeft') setPestana(orden[(i + orden.length - 1) % orden.length])
            }}
          >
            {etiqueta}
            {n ? <span className="ag-tab-n tnum">{n}</span> : null}
          </button>
        ))}
      </div>
      <div id={`${pref}-tabpanel-${pestana}`} role="tabpanel" aria-labelledby={`${pref}-tab-${pestana}`} className="ag-panel-scroll">
        {pestana === 'actividad' && <PanelActividad s={s} />}
        {pestana === 'decisiones' && <PanelDecisiones s={s} />}
        {pestana === 'casos' && <CasosTracker vistos={s.casosVistos} />}
      </div>
    </>
  )

  return (
    <AgentesCtx.Provider value={ctx}>
      <div className="ag-app">
        <a href="#ag-entrada" className="ag-skip">
          Ir al campo de mensaje
        </a>
        <header className="ag-header">
          <button type="button" className="ag-header-marca" onClick={() => onNavigate('landing')} aria-label="SetValio, volver a la portada">
            <span className="hidden sm:inline-flex">
              <BrandLockup compact decorative />
            </span>
            <span className="sm:hidden">
              <SetvalioMark size={30} />
            </span>
          </button>
          <span className="ag-header-sep hidden md:block" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold text-ink">
              Agentes <span className="font-semibold text-muted">· {s.mundo.proyecto.titulo}</span>
            </p>
            <p className="truncate text-xs text-muted">
              Rodaje, día {s.mundo.proyecto.diaActual} de {s.mundo.proyecto.diasRodaje}
              <span className="md:hidden"> · demo simulada</span>
            </p>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <PildoraDemo />
            {!s.tour && (
              <button type="button" className="ag-boton-fila" onClick={() => despachar({ tipo: 'tour/iniciar' })} disabled={ocupado}>
                <IconPlay size={14} aria-hidden="true" /> Recorrido guiado
              </button>
            )}
            <label className="sr-only" htmlFor="ag-persona">
              Ver como
            </label>
            <select id="ag-persona" className="ag-select" value={s.persona} onChange={(e) => despachar({ tipo: 'persona', persona: e.target.value })}>
              {Object.values(PERSONAS).map((p) => (
                <option key={p.id} value={p.id}>
                  Ver como: {p.nombre} · {p.rol}
                </option>
              ))}
            </select>
            <MenuMas ritmo={ritmo} setRitmo={setRitmo} onReiniciar={() => despachar({ tipo: 'reiniciar' })} onNavigate={onNavigate} />
          </div>
          <div className="flex items-center gap-1 lg:hidden">
            <button type="button" className="ag-icon-button relative" aria-label={`Actividad y decisiones${s.novedades ? `, ${s.novedades} novedades` : pendientes ? `, ${pendientes} decisiones pendientes` : ''}`} onClick={() => abrirHoja('actividad')}>
              <IconBell size={20} />
              {(s.novedades > 0 || pendientes > 0) && <span className="ag-badge tnum">{s.novedades || pendientes}</span>}
            </button>
            <button type="button" className="ag-icon-button md:hidden" aria-label="Menú" onClick={() => abrirHoja('menu')}>
              <IconMenu size={20} />
            </button>
          </div>
        </header>

        <div className="ag-cuerpo">
          <aside className="ag-col-izq" aria-label="Agentes y casos de uso">
            <div className="ag-panel-scroll">
              <h2 className="mb-2 text-xs font-bold text-muted">Agentes</h2>
              <AgentRail estados={estados} onAbrir={setAgenteAbierto} />
              <div className="mt-6 border-t border-line pt-4">
                <CasosTracker vistos={s.casosVistos} />
              </div>
            </div>
          </aside>

          <main className="ag-centro" aria-label="Conversación con los agentes">
            <BarraRecorrido tour={tour} onSiguiente={() => despachar({ tipo: 'tour/siguiente' })} onSalir={() => despachar({ tipo: 'tour/salir' })} />
            <div ref={scrollRef} className="ag-scroll" onScroll={onScroll} onWheel={soltar} onTouchMove={() => (anclado.current = false)} onKeyDown={soltar}>
              <div className="ag-hilo">
                {s.mensajes.length === 0 ? (
                  <Inicio persona={persona} onAbrirAgente={setAgenteAbierto} onRecorrido={() => despachar({ tipo: 'tour/iniciar' })} />
                ) : (
                  <section aria-label="Mensajes" className="space-y-5">
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
              <Redactor ocupado={ocupado} inputRef={inputRef} onEnviar={enviar} onDetener={() => despachar({ tipo: 'detener' })} />
              <p className="ag-pie-nota">Agentes simulados con datos de ejemplo. No se envía nada ni se mueve dinero.</p>
            </div>
          </main>

          <aside className="ag-col-der" aria-label="Actividad y decisiones">
            {panelDerecho('lateral')}
          </aside>
        </div>

        <Hoja abierta={hoja === 'actividad'} onCerrar={() => setHoja(null)} titulo="Actividad y decisiones" id="ag-hoja-actividad">
          {hoja === 'actividad' && panelDerecho('hoja')}
        </Hoja>

        <Hoja abierta={hoja === 'menu'} onCerrar={() => setHoja(null)} titulo="Agentes y opciones" id="ag-hoja-menu">
          <div className="space-y-5">
            <PildoraDemo />
            {!s.tour && (
              <button
                type="button"
                className="ag-boton-fila w-full justify-center"
                disabled={ocupado}
                onClick={() => {
                  setHoja(null)
                  despachar({ tipo: 'tour/iniciar' })
                }}
              >
                <IconPlay size={14} aria-hidden="true" /> Recorrido guiado
              </button>
            )}
            <div>
              <label className="mb-1 block text-xs font-bold text-muted" htmlFor="ag-persona-m">
                Ver como
              </label>
              <select id="ag-persona-m" className="ag-select w-full" value={s.persona} onChange={(e) => despachar({ tipo: 'persona', persona: e.target.value })}>
                {Object.values(PERSONAS).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} · {p.rol}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-muted" htmlFor="ag-ritmo-m">
                Ritmo de los agentes
              </label>
              <select id="ag-ritmo-m" className="ag-select w-full" value={ritmo} onChange={(e) => setRitmo(e.target.value)}>
                {Object.entries(RITMOS).map(([k, r]) => (
                  <option key={k} value={k}>
                    {r.etiqueta}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-bold text-muted">Agentes</h3>
              <AgentRail
                estados={estados}
                onAbrir={(id) => {
                  setHoja(null)
                  setAgenteAbierto(id)
                }}
              />
            </div>
            <div className="border-t border-line pt-4">
              <CasosTracker vistos={s.casosVistos} />
            </div>
            <div className="flex flex-col gap-1 border-t border-line pt-4">
              <button type="button" className="ag-menu-item" onClick={() => onNavigate('panel')}>
                Abrir la demo clásica
              </button>
              <button type="button" className="ag-menu-item" onClick={() => onNavigate('landing')}>
                <IconArrowLeft size={16} aria-hidden="true" /> Volver a la portada
              </button>
              <button
                type="button"
                className="ag-menu-item text-negative"
                onClick={() => {
                  setHoja(null)
                  despachar({ tipo: 'reiniciar' })
                }}
              >
                Reiniciar la demo
              </button>
            </div>
          </div>
        </Hoja>

        <DetalleAgente id={agenteAbierto} onCerrar={() => setAgenteAbierto(null)} />
        <Anunciador s={s} />
      </div>
    </AgentesCtx.Provider>
  )
}
