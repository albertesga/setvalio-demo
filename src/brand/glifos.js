// Geometría de la marca Filmpilot, copiada de los SVG `-current` del Brand Kit v1
// (public/brand/filmpilot/logos/svg/filmpilot-symbol-current.svg y
// agents/agent-*-current.svg). Va en línea para heredar `currentColor`: así el
// mismo glifo sirve en carbón, tiza o señal sin pedir otro fichero.

/** Símbolo: cuatro gestos orgánicos y un satélite. viewBox 0 0 212 204, desplazado 16 16. */
export const SIMBOLO = {
  viewBox: '0 0 212 204',
  desplazamiento: 'translate(16 16)',
  trazos: [
    'M 32,72 C 15,59 22,41 43,24 C 63,8 89,6 79,28 C 72,43 53,57 51,73 C 51,85 44,83 32,72 Z',
    'M 113,19 C 114,10 135,-2 144,0 C 159,2 135,23 120,24 C 114,25 110,24 113,19 Z',
    'M 97,47 C 112,37 140,53 157,66 C 173,78 183,99 167,99 C 156,99 130,80 113,70 C 97,60 91,53 97,47 Z',
    'M 2,81 C 12,66 36,91 58,102 C 74,110 94,115 85,124 C 75,137 43,135 23,122 C 8,112 -5,95 2,81 Z',
    'M 80,167 C 65,157 95,123 109,103 C 117,92 118,83 126,90 C 147,106 148,126 132,145 C 116,164 88,174 80,167 Z',
  ],
}

/** El gesto común de los tres glifos de agente. viewBox 0 0 96 96. */
export const SEMILLA = 'M -19,0 C -16,-12 8,-17 18,-8 C 29,1 1,15 -13,10 C -19,8 -23,4 -19,0 Z'

/** Cada familia coloca tres semillas de forma distinta. */
export const GLIFOS = {
  presupuesto: ['translate(30 41) rotate(-145)', 'translate(63 21) rotate(-48) scale(0.92)', 'translate(70 68) rotate(-42) scale(1.05)'],
  financiacion: ['translate(28 28) rotate(65)', 'translate(65 25) rotate(-18)', 'translate(49 67) rotate(102) scale(1.08)'],
  documentacion: ['translate(27 46) rotate(-27)', 'translate(64 25) rotate(37) scale(1.05)', 'translate(63 67) rotate(-43) scale(0.92)'],
}
