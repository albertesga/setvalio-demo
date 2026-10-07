// Guiones de conversación: ayuda, fuera de alcance, desambiguar y no entendido.

import { AGENTES, ORDEN_AGENTES, AUTONOMIA } from '../agentes.js'
import { CASOS } from '../casos.js'
import { t, v, POLITICAS, paso, sug, texto, aviso } from './comun.js'

const EJEMPLO = {
  informe_semanal: 'Prepárame el informe semanal de coste',
  factura_nueva: '¿Han llegado facturas nuevas?',
  revisar_gasto: '¿Qué gastos tengo que revisar?',
  explicar_desviacion: '¿Por qué se desvía Escenografía?',
  aprobar_oc: '¿Qué órdenes de compra tengo pendientes?',
  prevision: '¿Cómo cerraremos el proyecto y llegamos con la caja?',
  cumplimiento: '¿Qué bloquea el dossier fiscal?',
  pedir_documentacion: 'Pide a Ferretería El Tornillo la factura completa',
  incentivo: '¿Cuánto supondría llegar al 50 % de gasto en Canarias?',
  ayuda: '¿Qué puedes hacer?',
  resumen: '¿Cómo vamos?',
  riesgos: '¿Qué riesgos hay para las próximas jornadas?',
  presupuesto_nuevo: 'Ayúdame a preparar la primera propuesta de presupuesto de Itsasoa',
  optimizar_proveedores: 'Optimiza los proveedores de la propuesta',
}

export const ayuda = {
  id: 'ayuda',
  titulo: 'Qué hacen los agentes',
  ejemplos: ['¿Qué puedes hacer?', '¿qué agentes hay?', '¿cómo decides qué tengo que aprobar yo?', 'ayuda'],
  planificar() {
    return [paso('orquestador', t('Reúne lo que sabe hacer cada agente'), { tipo: 'lectura', salida: t('Agentes y reglas de autonomía') })]
  },
  componer() {
    return {
      bloques: [
        texto(t('Trabajamos sobre «La última función». Cada agente hace su parte del control de coste; lo rutinario y reversible lo hacemos solos, lo dudoso lo proponemos y lo que compromete dinero o tiene riesgo fiscal espera a la persona responsable.')),
        {
          tipo: 'tabla',
          titulo: 'Agentes',
          columnas: [
            { id: 'agente', etiqueta: 'Agente' },
            { id: 'hace', etiqueta: 'Qué hace' },
            { id: 'niveles', etiqueta: 'Cómo actúa' },
          ],
          filas: ORDEN_AGENTES.map((id) => ({ id, agente: AGENTES[id].nombre, agenteId: id, hace: AGENTES[id].hace, niveles: AGENTES[id].niveles.map((n) => AUTONOMIA[n].etiqueta).join(' · ') })),
        },
        {
          tipo: 'lista',
          titulo: 'Reglas de autonomía',
          items: [
            { texto: t('Clasifica solo si la confianza es de al menos {u}; por debajo, propone.', { u: v(POLITICAS.umbralConfianza, 'pct0') }) },
            { texto: t('Contabiliza solo la factura que casa con un pedido aprobado.') },
            { texto: t('Una compra de más de {imp} la aprueba line producer.', { imp: v(POLITICAS.umbralImporteOc, 'eur') }) },
            { texto: t('Si deja su capítulo por encima del {u}, la aprueba producción ejecutiva.', { u: v(POLITICAS.umbralDesviacion, 'pct0') }) },
            { texto: t('Lo fiscal lo valida el fiscalista. Filmpilot no envía correos ni hace pagos.') },
            { texto: t('Riesgos de producción avisa sin que se lo pidas. Cambiar el plan lo decide line producer; reservar dinero o asumir el riesgo, producción ejecutiva.') },
          ],
        },
      ],
      sugerencias: CASOS.filter((c) => c.id !== 'alcance').slice(0, 4).map((c) => sug(c.prompt)),
      fuentes: ['Configuración de agentes'],
      reglas: [],
      noHecho: [],
    }
  },
}

const ALCANCE = {
  fase_posterior: {
    titulo: 'Fase posterior',
    texto: t('Production Rescue —planes de recuperación para producciones en apuros— queda para una fase posterior. No está en esta demo. Hoy puedo ayudarte a ver dónde está la presión.'),
    sugerencias: ['¿Qué capítulos están fuera de umbral?', '¿Cómo cerraremos el proyecto y llegamos con la caja?'],
  },
  pagos: {
    titulo: 'Sin pagos',
    texto: t('No ejecuto pagos ni transferencias: salen de vuestra banca, con vuestras firmas. Sí puedo decirte qué vence y cómo queda la caja.'),
    sugerencias: ['¿Cómo cerraremos el proyecto y llegamos con la caja?', '¿Qué bloquea el dossier fiscal?'],
  },
}

export const fueraAlcance = {
  id: 'fuera_alcance',
  titulo: 'Fuera de alcance',
  ejemplos: ['Activa el Production Rescue', 'rescata la producción', 'paga la factura de Grúas', 'haz la transferencia al hotel'],
  planificar(m, det) {
    return [paso('orquestador', t('Comprueba si la petición está en el alcance'), { tipo: 'plan', salida: det.motivo === 'pagos' ? t('Pagos: Filmpilot no los hace') : t('Fase posterior') })]
  },
  componer({ det }) {
    const a = ALCANCE[det.motivo] ?? ALCANCE.fase_posterior
    return {
      bloques: [aviso(det.motivo === 'pagos' ? 'info' : 'fase', a.titulo, a.texto), { tipo: 'lista', titulo: 'Puedes pedir', items: a.sugerencias.map((x) => ({ texto: t('{x}', { x: v(x) }), entrada: x })) }],
      sugerencias: a.sugerencias.map(sug),
      fuentes: [],
      reglas: [t('Filmpilot no hace pagos ni envía comunicaciones')],
      noHecho: [t('No ha hecho nada fuera de su alcance.')],
    }
  },
}

const NOMBRE_INTENCION = {
  informe_semanal: 'el informe semanal',
  factura_nueva: 'una factura entrante',
  revisar_gasto: 'los gastos por revisar',
  explicar_desviacion: 'una desviación',
  aprobar_oc: 'las órdenes de compra',
  prevision: 'la previsión y la caja',
  cumplimiento: 'el dossier fiscal',
  pedir_documentacion: 'pedir documentación',
  incentivo: 'el incentivo fiscal',
  ayuda: 'lo que hacen los agentes',
  resumen: 'un resumen',
  riesgos: 'los riesgos de rodaje',
  presupuesto_nuevo: 'la propuesta de presupuesto',
  optimizar_proveedores: 'optimizar proveedores',
}

export const desambiguar = {
  id: 'desambiguar',
  titulo: 'Aclarar la petición',
  ejemplos: [],
  planificar() {
    return [paso('orquestador', t('Interpreta la petición'), { tipo: 'plan', salida: t('Dos lecturas posibles') })]
  },
  componer({ det }) {
    const [a, b] = det.opciones
    return {
      bloques: [
        texto(t('¿Te refieres a {a} o a {b}?', { a: v(NOMBRE_INTENCION[a] ?? a), b: v(NOMBRE_INTENCION[b] ?? b) })),
        { tipo: 'lista', titulo: 'Elige una', items: [a, b].filter((x) => EJEMPLO[x]).map((x) => ({ texto: t('{x}', { x: v(EJEMPLO[x]) }), entrada: EJEMPLO[x] })) },
      ],
      sugerencias: [a, b].filter((x) => EJEMPLO[x]).map((x) => sug(EJEMPLO[x])),
      fuentes: [],
      reglas: [],
      noHecho: [t('Prefiere preguntar antes que adivinar.')],
    }
  },
}

export const noEntendido = {
  id: 'no_entendido',
  titulo: 'Sin guion',
  ejemplos: [],
  planificar() {
    return [paso('orquestador', t('Interpreta la petición'), { tipo: 'plan', salida: t('No encaja con ningún caso de esta demo') })]
  },
  componer({ det }) {
    const alt = (det.alternativas || []).filter((x) => EJEMPLO[x])
    const base = ['informe_semanal', 'explicar_desviacion', 'aprobar_oc']
    const lista = [...new Set([...alt, ...base])].slice(0, 3)
    return {
      bloques: [
        texto(t('No tengo un guion para esa petición: en esta demo los agentes solo trabajan con los casos preparados y no inventan respuestas.')),
        { tipo: 'lista', titulo: 'Esto sí puedo resolverlo', items: lista.map((x) => ({ texto: t('{x}', { x: v(EJEMPLO[x]) }), entrada: EJEMPLO[x] })) },
      ],
      sugerencias: lista.map((x) => sug(EJEMPLO[x])),
      fuentes: [],
      reglas: [],
      noHecho: [t('No ha inventado ninguna respuesta.')],
    }
  },
}

export { EJEMPLO }
