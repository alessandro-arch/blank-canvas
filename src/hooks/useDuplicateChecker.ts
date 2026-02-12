import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ParsedRow, DuplicateInfo, DuplicateStatus } from '@/types/import';
import { unformatCPF } from '@/lib/cpf-validator';

interface ExistingProfile {
  id: string;
  user_id: string;
  cpf: string | null;
  email: string | null;
}

export function useDuplicateChecker() {
  const [isChecking, setIsChecking] = useState(false);

  const checkDuplicates = useCallback(async (rows: ParsedRow[]): Promise<ParsedRow[]> => {
    setIsChecking(true);

    try {
      // Fetch all existing profiles with CPF and email
      const { data: existingProfiles, error } = await supabase
        .from('profiles')
        .select('id, user_id, cpf, email');

      if (error) {
        console.error('Error fetching profiles:', error);
        setIsChecking(false);
        return rows;
      }

      const profiles = existingProfiles || [];

      // Create lookup maps for faster checking
      const cpfMap = new Map<string, ExistingProfile>();
      const emailMap = new Map<string, ExistingProfile>();

      profiles.forEach(profile => {
        if (profile.cpf) {
          const cleanCpf = unformatCPF(profile.cpf);
          cpfMap.set(cleanCpf, profile);
        }
        if (profile.email) {
          emailMap.set(profile.email.toLowerCase(), profile);
        }
      });

      // Check each row for duplicates
      const checkedRows = rows.map(row => {
        if (!row.isValid) {
          return row; // Skip invalid rows
        }

        const rowCpf = row.data.cpf ? unformatCPF(String(row.data.cpf)) : '';
        const rowEmail = row.data.email ? String(row.data.email).toLowerCase() : '';

        let duplicateInfo: DuplicateInfo;

        // Check CPF first (primary identifier)
        const existingByCpf = rowCpf ? cpfMap.get(rowCpf) : undefined;
        
        // Check email (secondary identifier)
        const existingByEmail = rowEmail ? emailMap.get(rowEmail) : undefined;

        if (existingByCpf) {
          // CPF exists - it's a duplicate
          duplicateInfo = {
            status: 'duplicate' as DuplicateStatus,
            existingProfileId: existingByCpf.id,
            existingUserId: existingByCpf.user_id,
            conflictReason: `CPF já cadastrado`,
            action: 'skip', // Default action for duplicates
          };
        } else if (existingByEmail) {
          // Email exists with different/no CPF - it's a conflict
          duplicateInfo = {
            status: 'conflict' as DuplicateStatus,
            existingProfileId: existingByEmail.id,
            existingUserId: existingByEmail.user_id,
            conflictReason: `E-mail já cadastrado com outro CPF`,
            action: 'skip', // Default action for conflicts
          };
        } else {
          // No match - it's a new record
          duplicateInfo = {
            status: 'new' as DuplicateStatus,
            action: 'import', // Default action for new records
          };
        }

        return {
          ...row,
          duplicateInfo,
        };
      });

      setIsChecking(false);
      return checkedRows;
    } catch (err) {
      console.error('Error checking duplicates:', err);
      setIsChecking(false);
      return rows;
    }
  }, []);

  return {
    checkDuplicates,
    isChecking,
  };
}
