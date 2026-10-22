import { TransportRecord } from './types';

/**
 * De-para de usuários SAP (colunas "Criado por" / "Modificado por") para o tipo de demanda.
 * As chaves devem estar em MAIÚSCULAS, exatamente como aparecem no SAP (máx. 12 caracteres).
 */
export const USER_TYPE_MAP: Record<string, string> = {
  LROCHACONTR: 'IMPORTAÇÃO',
  CSUZART: 'LOAD',
  EBASTOS: 'TRANSF. ENTRE BASES',
  PVICENZETTO: 'LOAD',
  HASSISCONTRA: 'BACKLOAD',
  ALEONARDO: 'LOAD',
  JULLIMA: 'LOAD',
  JARAUJO: 'LOAD',
  MBARBOSACONT: 'BACKLOAD',
  TBERNARDESCO: 'TRANSPORTE',
  CARLOLIMACON: 'BACKLOAD',
  MANUNES: 'LOAD',
  ASILVACONTRA: 'AVALIAR',
  JOUVERNEY: 'ANALISTA MODEC',
  JESSICSILVAC: 'TRANSPORTE',
  GNOVAISCONTR: 'BACKLOAD',
  LSINGNORETIC: 'BACKLOAD',
  LUMACHADO: 'TRANSF. ENTRE BASES',
  BGUIMARAES: 'LOAD',
  ALLOPES: 'AVALIAR',
  MOSANTOS: 'LOAD',
  AVCONCEICAO: 'AVALIAR',
  LUSILVA: 'AVALIAR',
  PFRANCACONTR: 'FORNECEDOR',
  EROXO: 'LOAD',
  RLOBATO: 'BACKLOAD',
  JFERREIRACON: 'AVALIAR',
  IPEREIRACONT: 'FORNECEDOR',
  MMELLO: 'BACKLOAD',
  KCASTRO: 'LOAD',
  BNASCIMENTOC: 'FORNECEDOR',
  LUPAIXAO: 'BACKLOAD',
  RXAVIEROLIR: 'BACKLOAD',
  FCRAVO: 'BACKLOAD',
  MCORDEIROCON: 'BACKLOAD',
  FAASSIS: 'LOAD',
  MAURODRIGUES: 'BACKLOAD',
  DMUNIZCONTRA: 'TRANSPORTE',
  VITALMEIDA: 'BACKLOAD',
  MRANGEL: 'BACKLOAD',
  BPINHEIROCON: 'FORNECEDOR',
  ALEJUNIOR: 'AVALIAR',
  FDELFINOCONT: 'BACKLOAD',
  JCUNHABV: 'FATURAMENTO',
  LNETO: 'BACKLOAD',
  MANDRADE: 'BACKLOAD',
  DSOEIRO: 'BACKLOAD',
  MBURITY: 'LOAD',
  CLFILHO: 'BACKLOAD',
  DTUDE: 'BACKLOAD',
  DACIOLI: 'BACKLOAD',
  AALBANO: 'BACKLOAD',
  EDUARDSILVA: 'BACKLOAD',
  EANDRADE: 'BACKLOAD',
  MTHOME: 'CONTRATOS',
  MFSOUZA: 'BACKLOAD',
  LEOAZEVEDO: 'BACKLOAD',
  LROCHACONTRA: 'BACKLOAD',
  SAGUIARCONTR: 'FATURAMENTO',
  MARCOLIMA: 'BACKLOAD',
  KFIGUEIREDO: 'BACKLOAD',
  GIZINI: 'BACKLOAD',
  DDRUMOND: 'BACKLOAD',
  AFFILHO: 'BACKLOAD',
  JETIENE: 'BACKLOAD',
  MMELO: 'BACKLOAD',
  EDSJUNIOR: 'BACKLOAD',
  DICERQUEIRA: 'BACKLOAD',
  AMADURO: 'BACKLOAD',
  EFAGUNDES: 'BACKLOAD',
  SLINHARES: 'BACKLOAD',
  LRATTES: 'ANALISTA MODEC',
  NNERY: 'BACKLOAD',
  ALESOUZA: 'BACKLOAD',
  GABBATISTA: 'ENGENHEIRO',
  IFIGUEIREDO: 'BACKLOAD',
  CARLSOUZA: 'BACKLOAD',
  BMORAES: 'BACKLOAD',
  FANTONIA: 'BACKLOAD',
  WRANGEL: 'BACKLOAD',
};

/** Classes Tailwind de cor e estilo da etiqueta (conforme modelo da imagem "LOAD": bg-blue-100, text-blue-800, border-blue-300) */
export const USER_TYPE_COLORS: Record<string, string> = {
  'IMPORTAÇÃO': 'bg-blue-100 text-blue-800 border-blue-300',
  'LOAD': 'bg-blue-100 text-blue-800 border-blue-300',
  'BACKLOAD': 'bg-blue-100 text-blue-800 border-blue-300',
  'TRANSF. ENTRE BASES': 'bg-blue-100 text-blue-800 border-blue-300',
  'TRANSPORTE': 'bg-blue-100 text-blue-800 border-blue-300',
  'AVALIAR': 'bg-blue-100 text-blue-800 border-blue-300',
  'ANALISTA MODEC': 'bg-blue-100 text-blue-800 border-blue-300',
  'FORNECEDOR': 'bg-blue-100 text-blue-800 border-blue-300',
  'FATURAMENTO': 'bg-blue-100 text-blue-800 border-blue-300',
  'CONTRATOS': 'bg-blue-100 text-blue-800 border-blue-300',
  'ENGENHEIRO': 'bg-blue-100 text-blue-800 border-blue-300',
};

const DEFAULT_MAPPED_COLOR = 'bg-blue-100 text-blue-800 border-blue-300';
const DEFAULT_UNMAPPED_COLOR = 'bg-slate-100 text-slate-600 border-slate-300';

export interface UserTypeInfo {
  type: string | null;
  user: string;
  source: 'created' | 'modified' | null;
}

/**
 * Resolve o tipo da DT a partir do usuário.
 * Prioriza "Criado por"; se o usuário não estiver na listagem, usa "Modificado por".
 */
export function resolveUserType(r: Pick<TransportRecord, 'createdBy' | 'modifiedBy'>): UserTypeInfo {
  const created = String(r.createdBy || '').trim().toUpperCase();
  const modified = String(r.modifiedBy || '').trim().toUpperCase();

  if (created && USER_TYPE_MAP[created]) {
    return { type: USER_TYPE_MAP[created], user: created, source: 'created' };
  }
  if (modified && USER_TYPE_MAP[modified]) {
    return { type: USER_TYPE_MAP[modified], user: modified, source: 'modified' };
  }
  return { type: null, user: created || modified, source: null };
}

export function userTypeColor(type: string | null): string {
  if (!type) return DEFAULT_UNMAPPED_COLOR;
  return USER_TYPE_COLORS[type] || DEFAULT_MAPPED_COLOR;
}
