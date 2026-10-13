export interface StageDefinition {
  id: number;
  name: string;
  short: string;
  start: string;
  end: string | null;
  approx?: boolean;
  description: string;
}

export const STAGES: StageDefinition[] = [
  {
    id: 0,
    name: 'Aguardando Agendamento do Transporte',
    short: 'Aguardando Agendamento',
    start: 'Criado em',
    end: 'Fim organização',
    description: 'Existe uma demanda que ainda precisa ser agendada para transporte. É o ponto inicial do fluxo.',
  },
  {
    id: 1,
    name: 'Demanda Recebida pela Audax',
    short: 'Recebido pela Audax',
    start: 'Fim organização',
    end: 'Dta.atual registro',
    description: 'A Audax já visualiza a demanda e inicia o processo de coleta/entrega.',
  },
  {
    id: 2,
    name: 'Em Processamento Operacional — Audax',
    short: 'Processamento Audax',
    start: 'Dta.atual registro',
    end: 'Iníc.carregam.atual',
    description: 'Início das rotinas internas e operacionais da Audax, incluindo atividades como quilometragem, PM, movimentação e registro operacional.',
  },
  {
    id: 3,
    name: 'Em Execução Operacional — Audax',
    short: 'Execução Audax',
    start: 'Iníc.carregam.atual',
    end: 'Fim do carreg.atual',
    description: 'Continuação da execução operacional pela Audax, em etapa intermediária entre coleta e entrega.',
  },
  {
    id: 4,
    name: 'Processamento Operacional Avançado — Audax',
    short: 'Proc. Avançado Audax',
    start: 'Fim do carreg.atual',
    end: 'Dta.procmto.transp.',
    description: 'Continuação do fluxo interno e operacional da Audax, já em fase avançada e próxima da finalização da entrega.',
  },
  {
    id: 5,
    name: 'Aguardando Confirmação da Entrega',
    short: 'Aguard. Confirmação Entrega',
    start: 'Dta.procmto.transp.',
    end: 'InícAtualTransp',
    description: 'Etapa final do processamento operacional da Audax antes da confirmação física da entrega.',
  },
  {
    id: 6,
    name: 'Entrega Concluída — Aguardando Comprovante',
    short: 'Entrega Concluída / Aguardando ODT',
    start: 'InícAtualTransp',
    end: 'Fim atual trsp.',
    description: 'O material foi entregue ao cliente e o processo aguarda a formalização do comprovante de entrega/ODT para avançar ao faturamento.',
  },
  {
    id: 7,
    name: 'ODT Anexada — Liberado para Faturamento',
    short: 'Liberado para Faturamento',
    start: 'Fim atual trsp.',
    end: null,
    description: 'O comprovante de entrega/ODT foi anexado e a demanda está liberada para seguir ao faturamento. É o status final.',
  },
];

export const STAGE_COLORS: Record<number, string> = {
  0: '#041A71', // Navy
  1: '#215FC3', // Blue
  2: '#3A78DE', // Blue Light
  3: '#29F38D', // Green Light
  4: '#00CE7C', // Green
  5: '#215FC3', // Blue
  6: '#3A78DE', // Blue Light
  7: '#00CE7C', // Green
};

export const DEFAULT_LIMITS: Record<number, [number, number]> = {
  0: [1, 3],
  1: [1, 3],
  2: [1, 3],
  3: [1, 2],
  4: [1, 2],
  5: [1, 2],
  6: [2, 4],
  7: [999, 999],
};

export const DEFAULT_CONTRACT_SLA: Record<number, number> = {
  0: 1,
  1: 1,
  2: 1,
  3: 1,
  4: 1,
  5: 1,
  6: 3,
  7: 0,
};

export const DEFAULT_SEMAPHORE = {
  green: 95,
  amber: 85,
};

// Initial default vessel mapping for MODEC fleet & units
export const INITIAL_VESSEL_MAP: Record<string, string> = {
  B14L: 'FPSO Carioca (MV30)',
  B13G: 'FPSO Guanabara (MV31)',
  MB26: 'FPSO Almirante Barroso (MV32)',
  MV31: 'FPSO Guanabara (MV31)',
  MV30: 'FPSO Carioca (MV30)',
  MV32: 'FPSO Almirante Barroso (MV32)',
  MV23: 'FPSO Cidade de Itaguaí (MV23)',
  MV33: 'FPSO Anita Garibaldi (MV33)',
  MB29: 'FPSO Cidade de Caraguatatuba (MV27)',
  MB27: 'FPSO Cidade de Angra dos Reis (MV22)',
  MVBC: 'FPSO Baúna (MVBC)',
  MV20: 'FPSO Cidade de Santos (MV20)',
};
