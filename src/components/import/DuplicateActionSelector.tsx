import { DuplicateAction, DuplicateStatus } from '@/types/import';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RefreshCw, SkipForward } from 'lucide-react';

interface DuplicateActionSelectorProps {
  status: DuplicateStatus;
  action: DuplicateAction;
  onChange: (action: DuplicateAction) => void;
}

export function DuplicateActionSelector({ 
  status, 
  action, 
  onChange 
}: DuplicateActionSelectorProps) {
  if (status === 'new') {
    return null;
  }

  return (
    <Select value={action} onValueChange={(value) => onChange(value as DuplicateAction)}>
      <SelectTrigger className="w-[140px] h-8 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="update">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-3 h-3" />
            <span>Atualizar</span>
          </div>
        </SelectItem>
        <SelectItem value="skip">
          <div className="flex items-center gap-2">
            <SkipForward className="w-3 h-3" />
            <span>Ignorar</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
