import { useCallback, useState } from 'react';
import * as XLSX from 'xlsx';
import { ImportType, IMPORT_TYPES, ParsedRow, ImportPreview } from '@/types/import';

export function useSpreadsheetParser() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateRow = useCallback((row: Record<string, unknown>, importType: ImportType): { errors: string[], warnings: string[] } => {
    const config = IMPORT_TYPES[importType];
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    for (const field of config.requiredFields) {
      const value = row[field];
      if (value === undefined || value === null || value === '') {
        errors.push(`Campo obrigatório "${field}" não preenchido`);
      }
    }

    // Type-specific validations
    if (importType === 'scholars') {
      const email = row.email as string;
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push('Email inválido');
      }
      
      const cpf = row.cpf as string;
      if (cpf && !/^\d{11}$/.test(cpf.replace(/\D/g, ''))) {
        errors.push('CPF deve ter 11 dígitos');
      }
    }

    if (importType === 'bank_accounts') {
      const userEmail = row.user_email as string;
      if (userEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
        errors.push('Email do bolsista inválido');
      }

      const bankCode = row.bank_code as string;
      if (bankCode && !/^\d{3}$/.test(bankCode)) {
        warnings.push('Código do banco deve ter 3 dígitos');
      }
    }

    if (importType === 'projects') {
      const startDate = row.start_date as string;
      const endDate = row.end_date as string;
      
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (start >= end) {
          errors.push('Data de início deve ser anterior à data de término');
        }
      }

      const valorMensal = row.valor_mensal;
      if (valorMensal !== undefined && (isNaN(Number(valorMensal)) || Number(valorMensal) <= 0)) {
        errors.push('Valor mensal deve ser um número positivo');
      }

      if (!row.empresa_parceira) {
        errors.push('Campo "empresa_parceira" é obrigatório');
      }
    }

    if (importType === 'enrollments') {
      const grantValue = row.grant_value;
      if (grantValue !== undefined && (isNaN(Number(grantValue)) || Number(grantValue) <= 0)) {
        errors.push('Valor da bolsa deve ser um número positivo');
      }

      const totalInstallments = row.total_installments;
      if (totalInstallments !== undefined && (!Number.isInteger(Number(totalInstallments)) || Number(totalInstallments) <= 0)) {
        errors.push('Total de parcelas deve ser um número inteiro positivo');
      }

      const validModalities = ['ict', 'ext', 'ens', 'ino', 'dct_a', 'dct_b', 'dct_c', 'postdoc', 'senior', 'prod', 'visitor'];
      const modality = String(row.modality || '').toLowerCase();
      if (modality && !validModalities.includes(modality)) {
        warnings.push(`Modalidade "${row.modality}" não reconhecida. Use: ${validModalities.join(', ')}`);
      }
    }

    return { errors, warnings };
  }, []);

  const parseFile = useCallback(async (file: File, importType: ImportType): Promise<ImportPreview> => {
    setIsLoading(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        throw new Error('Arquivo vazio ou sem dados válidos');
      }

      const worksheet = workbook.Sheets[sheetName];
      const rawData: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });

      if (rawData.length === 0) {
        throw new Error('Planilha vazia ou sem dados válidos');
      }

      return processRawData(rawData, file.name, importType);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao processar arquivo';
      setError(message);
      setIsLoading(false);
      throw new Error(message);
    }
  }, []);

  const processRawData = useCallback((
    rawData: Record<string, unknown>[],
    fileName: string,
    importType: ImportType
  ): ImportPreview => {
    // Normalize column names (lowercase, remove accents, replace spaces with underscores)
    const normalizeKey = (key: string): string => {
      return key
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
    };

    const parsedRows: ParsedRow[] = rawData.map((rawRow, index) => {
      // Normalize keys
      const normalizedRow: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(rawRow)) {
        normalizedRow[normalizeKey(key)] = value;
      }

      const { errors, warnings } = validateRow(normalizedRow, importType);

      return {
        rowNumber: index + 2, // +2 because Excel is 1-indexed and has header row
        data: normalizedRow,
        errors,
        warnings,
        isValid: errors.length === 0,
      };
    });

    const preview: ImportPreview = {
      fileName,
      totalRows: parsedRows.length,
      validRows: parsedRows.filter(r => r.isValid).length,
      invalidRows: parsedRows.filter(r => !r.isValid).length,
      newRows: 0,
      duplicateRows: 0,
      conflictRows: 0,
      rows: parsedRows,
    };

    setIsLoading(false);
    return preview;
  }, [validateRow]);

  return {
    parseFile,
    isLoading,
    error,
  };
}
