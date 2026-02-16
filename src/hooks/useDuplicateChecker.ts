import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ParsedRow, DuplicateInfo, DuplicateStatus } from '@/types/import';

interface ExistingProfile {
  id: string;
  user_id: string;
  email: string | null;
}

export function useDuplicateChecker() {
  const [isChecking, setIsChecking] = useState(false);

  const checkDuplicates = useCallback(async (rows: ParsedRow[]): Promise<ParsedRow[]> => {
    setIsChecking(true);

    try {
      // Fetch profiles with email only (CPF is in profiles_sensitive, not accessible to managers)
      const { data: existingProfiles, error } = await supabase
        .from('profiles')
        .select('id, user_id, email');

      if (error) {
        console.error('Error fetching profiles:', error);
        setIsChecking(false);
        return rows;
      }

      const profiles = existingProfiles || [];

      // Create lookup map by email
      const emailMap = new Map<string, ExistingProfile>();

      profiles.forEach(profile => {
        if (profile.email) {
          emailMap.set(profile.email.toLowerCase(), profile);
        }
      });

      // Check each row for duplicates (email-based only)
      const checkedRows = rows.map(row => {
        if (!row.isValid) {
          return row;
        }

        const rowEmail = row.data.email ? String(row.data.email).toLowerCase() : '';

        let duplicateInfo: DuplicateInfo;

        const existingByEmail = rowEmail ? emailMap.get(rowEmail) : undefined;

        if (existingByEmail) {
          duplicateInfo = {
            status: 'duplicate' as DuplicateStatus,
            existingProfileId: existingByEmail.id,
            existingUserId: existingByEmail.user_id,
            conflictReason: `E-mail já cadastrado`,
            action: 'skip',
          };
        } else {
          duplicateInfo = {
            status: 'new' as DuplicateStatus,
            action: 'import',
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
