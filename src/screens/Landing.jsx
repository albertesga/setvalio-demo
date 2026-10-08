// Portada de Filmpilot (Brand Kit v1). Todo lo que se pulsa lleva al prototipo de
// agentes: directamente, al recorrido guiado o con una pregunta de ejemplo.
// Cada sección vive en src/screens/portada/; aquí solo se montan.

import './Landing.css'
import './portada/subrayados.css'
import { Cabecera } from './portada/Cabecera.jsx'
import { Hero } from './portada/Hero.jsx'
import { SeccionAgentes } from './portada/SeccionAgentes.jsx'
import { BandaFoto } from './portada/BandaFoto.jsx'
import { SeccionFlujo } from './portada/SeccionFlujo.jsx'
import { SeccionDossier } from './portada/SeccionDossier.jsx'
import { SeccionFaq } from './portada/SeccionFaq.jsx'
import { Cierre } from './portada/Cierre.jsx'
import { Pie } from './portada/Pie.jsx'

// Agente de Riesgos de producción en «Cómo funciona». Las cifras son las de evaluarRiesgos()
// sobre el mundo de los agentes (check:agentes lo comprueba): en juego, la exposición de los
// riesgos con importe (lluvia en la jornada 8, la actriz sin billete y las horas extra de
// noche); ahorrado, la reserva por lluvia que no hace falta si se aprueba cambiar el orden.
const RIESGO = { enJuego: 119133, ahorrado: 26880 }
const CASO_RIESGO = {
  texto: '80 % de lluvia en el exterior de la jornada 8: propone cambiarla por la 9, un interior con el decorado montado, sin coste en la previsión.',
  pregunta: '¿Va a llover en la jornada 8?',
}

export default function Landing({ onNavigate }) {
  const clearSectionHash = () => {
    if (window.location.hash) window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
  }
  // Abre los agentes; con { tour } empieza el recorrido y con { pregunta } la hace al entrar.
  const abrirAgentes = (contexto) => {
    clearSectionHash()
    onNavigate('agentes', contexto)
  }

  return (
    <div className="landing-page flp-theme">
      <a className="landing-skip-link" href="#landing-main">
        Saltar al contenido
      </a>
      <Cabecera abrirAgentes={abrirAgentes} clearSectionHash={clearSectionHash} />
      <main id="landing-main">
        <Hero abrirAgentes={abrirAgentes} />
        <SeccionAgentes abrirAgentes={abrirAgentes} />
        <BandaFoto />
        <SeccionFlujo abrirAgentes={abrirAgentes} riesgo={{ cifras: RIESGO, caso: CASO_RIESGO.texto, pregunta: CASO_RIESGO.pregunta }} />
        <SeccionDossier abrirAgentes={abrirAgentes} />
        <SeccionFaq />
        <Cierre abrirAgentes={abrirAgentes} />
      </main>
      <Pie abrirAgentes={abrirAgentes} />
    </div>
  )
}
