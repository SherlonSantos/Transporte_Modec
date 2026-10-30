import { CteRecord, CteMetrics, CteDtSummary, CteSlaConfig } from './cteTypes';

/**
 * Calcula a diferença em dias entre duas datas (ou data de emissão e hoje)
 */
export function getCteAgeDays(emissionDateStr: string | null, refDate = new Date()): number | null {
  if (!emissionDateStr) return null;
  const d = new Date(emissionDateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return null;

  const diffMs = refDate.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays >= 0 ? diffDays : 0;
}

/**
 * Formata valor monetário em R$
 */
export function fmtMoney(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Formata data ISO (YYYY-MM-DD) para padrão brasileiro (DD/MM/AAAA)
 */
export function fmtDateBr(isoStr: string | null | undefined): string {
  if (!isoStr) return '—';
  const parts = String(isoStr).split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoStr;
}

/**
 * Categoriza o motivo de pendência para os gráficos gerenciais com base em ERROS e DETALHE
 */
export function categorizeCteError(errors = '', detail = ''): string {
  const text = (errors + ' ' + detail).toUpperCase();

  if (text.includes('FALTA COMPROVANTE') || text.includes('COMPROVANTE')) {
    return 'Falta de comprovante';
  }
  if (text.includes('AG. NOVO CTE') || text.includes('NOVA EMISSÃO') || text.includes('NOVO CT-E')) {
    return 'Aguardando novo CT-e';
  }
  if (text.includes('AG. CTE') || text.includes('AGUARDANDO EMISSÃO')) {
    return 'Aguardando emissão do CT-e';
  }
  if (text.includes('RECUSADO')) {
    return 'Documento recusado';
  }
  if (text.includes('VERIFICAR') || text.includes('EM ANÁLISE') || text.includes('GERARDO')) {
    return 'Aguardando análise';
  }
  if (text.includes('CHEGADA') || text.includes('AGUARDANDO CHEGADA')) {
    return 'Pendência de chegada';
  }
  if (text.includes('ICMS') || text.includes('ISENÇÃO')) {
    return 'Divergência fiscal / ICMS';
  }
  if (text.includes('F5') || text.includes('DÉBITO') || text.includes('DEBITO')) {
    return 'Erro de débito/crédito (F5)';
  }
  if (text.includes('TOMADOR')) {
    return 'Tomador incorreto';
  }
  if (text.includes('EGR') || text.includes('XML')) {
    return 'XML com erro no EGR';
  }
  if (text.includes('LINHA') || text.includes('LINHAS')) {
    return 'Múltiplas linhas no CT-e';
  }
  if (text.includes('ZT02')) {
    return 'Tratar transação ZT02';
  }
  if (text.includes('PGTO MANUAL') || text.includes('PAGAMENTO MANUAL')) {
    return 'Aguardando pagamento manual';
  }
  if (errors.trim() && errors.trim() !== ' ') {
    return errors.trim();
  }
  return 'Motivo não identificado';
}

/**
 * Calcula os indicadores gerenciais (KPIs) com contagem distinta
 */
export function calculateCteMetrics(
  records: CteRecord[],
  slaConfigs?: Record<number, CteSlaConfig>
): CteMetrics {
  const dtsSet = new Set<string>();
  const ctesSet = new Set<string>();

  let inProgressCount = 0;
  let faturadosCount = 0;
  let encerradosCount = 0;
  let recusadosCount = 0;
  let pendentesCount = 0;
  let aClassificarCount = 0;

  let sumOpenDays = 0;
  let countOpenDays = 0;

  let slaWithinCount = 0;
  let slaOverdueCount = 0;
  let totalWithSla = 0;

  const now = new Date();

  records.forEach(r => {
    if (r.dt) dtsSet.add(r.dt);
    if (r.cte) ctesSet.add(r.cte);

    const order = r.kanbanOrder;

    if (order === 0 || order === 1 || order === 2 || order === 4) {
      inProgressCount++;
    }
    if (order === 5) {
      faturadosCount++;
    }
    if (order === 6) {
      encerradosCount++;
    }
    if (order === 3) {
      recusadosCount++;
    }
    if (order === 1 || order === 2 || order === 3 || order === 4) {
      pendentesCount++;
    }
    if (order === 99 || order === null) {
      aClassificarCount++;
    }

    // Tempo em aberto (para documentos não faturados e não encerrados)
    if (order !== 5 && order !== 6 && r.emissionDate) {
      const age = getCteAgeDays(r.emissionDate, now);
      if (age !== null) {
        sumOpenDays += age;
        countOpenDays++;
      }
    }

    // SLA por etapa (se houver SLA parametrizado)
    if (slaConfigs && order !== null && slaConfigs[order] && slaConfigs[order].targetDays) {
      const target = slaConfigs[order].targetDays!;
      const age = getCteAgeDays(r.emissionDate, now);
      if (age !== null) {
        totalWithSla++;
        if (age <= target) {
          slaWithinCount++;
        } else {
          slaOverdueCount++;
        }
      }
    }
  });

  const totalRecords = records.length;
  const faturadosPct = totalRecords > 0 ? ((faturadosCount / totalRecords) * 100).toFixed(1) + '%' : '0.0%';
  const pendenciasPct = totalRecords > 0 ? ((pendentesCount / totalRecords) * 100).toFixed(1) + '%' : '0.0%';
  const avgDaysOpen = countOpenDays > 0 ? Math.round(sumOpenDays / countOpenDays) : null;

  const slaWithinPct = totalWithSla > 0 ? ((slaWithinCount / totalWithSla) * 100).toFixed(1) + '%' : 'Não parametrizado';
  const slaOverduePct = totalWithSla > 0 ? ((slaOverdueCount / totalWithSla) * 100).toFixed(1) + '%' : 'Não parametrizado';
  const slaStatusText = totalWithSla > 0 ? `${slaWithinCount} dentro / ${slaOverdueCount} fora` : 'Não parametrizado';

  return {
    totalDtsDistinct: dtsSet.size,
    totalCtesDistinct: ctesSet.size,
    totalRecords,
    inProgressCount,
    faturadosCount,
    encerradosCount,
    recusadosCount,
    pendentesCount,
    aClassificarCount,
    faturadosPct,
    pendenciasPct,
    avgDaysOpen,
    avgDaysToFaturado: null, // Sem carimbo confiável de faturamento nas colunas originais
    slaWithinPct,
    slaOverduePct,
    slaStatusText,
  };
}

/**
 * Agrupa os registros por DT para a "Visão por DT"
 */
export function groupCtesByDt(records: CteRecord[]): CteDtSummary[] {
  const map = new Map<string, CteRecord[]>();

  records.forEach(r => {
    const dt = r.dt || 'SEM_DT';
    if (!map.has(dt)) {
      map.set(dt, []);
    }
    map.get(dt)!.push(r);
  });

  const summaries: CteDtSummary[] = [];

  for (const [dt, ctes] of map.entries()) {
    // Ordena os CT-es pelo mais recente (data de emissão desc)
    ctes.sort((a, b) => {
      const dateA = a.emissionDate || '';
      const dateB = b.emissionDate || '';
      return dateB.localeCompare(dateA);
    });

    const latest = ctes[0];
    const vessel = ctes.find(c => c.vessel)?.vessel || 'Não informado';
    const base = ctes.find(c => c.base)?.base || 'Não informado';

    let faturadosCount = 0;
    let recusadosCount = 0;
    let encerradosCount = 0;
    let pendentesCount = 0;
    let aClassificarCount = 0;
    let totalFreight = 0;
    const errorsList: string[] = [];

    ctes.forEach(c => {
      if (c.kanbanOrder === 5) faturadosCount++;
      else if (c.kanbanOrder === 6) encerradosCount++;
      else if (c.kanbanOrder === 3) recusadosCount++;
      else if (c.kanbanOrder === 1 || c.kanbanOrder === 2 || c.kanbanOrder === 4 || c.kanbanOrder === 0) pendentesCount++;
      else if (c.kanbanOrder === 99) aClassificarCount++;

      if (c.freightValue) totalFreight += c.freightValue;
      if (c.errors && !errorsList.includes(c.errors)) errorsList.push(c.errors);
    });

    // Regra auditável de status consolidado da DT:
    // Prioridade de criticidade:
    // 1. Recusado (Ordem 3)
    // 2. Pendência Operacional (Ordem 2)
    // 3. Em Análise (Ordem 1)
    // 4. Aguardando Pagamento (Ordem 4)
    // 5. Aguardando CT-e (Ordem 0)
    // 6. A Classificar (Ordem 99)
    // 7. Faturado (Ordem 5) - se não houver pendências ativas
    // 8. Encerrado (Ordem 6) - se todos os CT-es forem encerrados
    let consolidatedStatus = 'Faturado';
    let consolidatedOrder = 5;

    if (recusadosCount > 0) {
      consolidatedStatus = 'Recusado / Reprocessamento';
      consolidatedOrder = 3;
    } else if (ctes.some(c => c.kanbanOrder === 2)) {
      consolidatedStatus = 'Pendência Operacional';
      consolidatedOrder = 2;
    } else if (ctes.some(c => c.kanbanOrder === 1)) {
      consolidatedStatus = 'Em Análise';
      consolidatedOrder = 1;
    } else if (ctes.some(c => c.kanbanOrder === 4)) {
      consolidatedStatus = 'Aguardando Pagamento';
      consolidatedOrder = 4;
    } else if (ctes.some(c => c.kanbanOrder === 0)) {
      consolidatedStatus = 'Aguardando CT-e';
      consolidatedOrder = 0;
    } else if (aClassificarCount > 0 && faturadosCount === 0) {
      consolidatedStatus = 'A Classificar';
      consolidatedOrder = 99;
    } else if (faturadosCount > 0) {
      consolidatedStatus = 'Faturado';
      consolidatedOrder = 5;
    } else if (encerradosCount === ctes.length) {
      consolidatedStatus = 'Encerrado';
      consolidatedOrder = 6;
    } else {
      consolidatedStatus = latest.statusKanban || 'A Classificar';
      consolidatedOrder = latest.kanbanOrder ?? 99;
    }

    summaries.push({
      dt,
      vessel,
      base,
      ctes,
      totalCtes: ctes.length,
      faturadosCount,
      recusadosCount,
      encerradosCount,
      pendentesCount,
      aClassificarCount,
      consolidatedStatus,
      consolidatedOrder,
      latestEmissionDate: latest.emissionDate,
      totalFreightValue: totalFreight,
      hasErrors: errorsList.length > 0,
      errorsList,
    });
  }

  return summaries;
}
