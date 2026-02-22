import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronsUpDown, Check, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import DOMPurify from "dompurify";

const UF_LIST = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA",
  "PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];

interface InstitutionData {
  name: string;
  sigla: string;
  uf: string;
  isCustom: boolean;
}

interface InstitutionComboboxProps {
  value: InstitutionData;
  onChange: (data: InstitutionData) => void;
  disabled?: boolean;
}

interface InstitutionMec {
  id: string;
  nome: string;
  sigla: string | null;
  uf: string;
  municipio: string | null;
}

export function InstitutionCombobox({ value, onChange, disabled }: InstitutionComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<InstitutionMec[]>([]);
  const [loading, setLoading] = useState(false);
  const [manualMode, setManualMode] = useState(value.isCustom);
  const [manualName, setManualName] = useState(value.isCustom ? value.name : "");
  const [manualSigla, setManualSigla] = useState(value.isCustom ? value.sigla : "");
  const [manualUf, setManualUf] = useState(value.isCustom ? value.uf : "");

  const sanitize = (val: string) => DOMPurify.sanitize(val).replace(/<[^>]*>/g, "").toUpperCase().trim();

  const searchInstitutions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const normalized = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      // Search by normalized_name, sigla, or uf
      const { data, error } = await (supabase as any)
        .from("institutions_mec")
        .select("id, nome, sigla, uf, municipio")
        .or(`normalized_name.ilike.%${normalized}%,sigla.ilike.%${query.toUpperCase()}%,uf.eq.${query.toUpperCase()}`)
        .order("nome")
        .limit(20);

      if (error) throw error;
      setResults((data as InstitutionMec[]) || []);
    } catch (e) {
      console.warn("Search error:", e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search) searchInstitutions(search);
      else setResults([]);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, searchInstitutions]);

  const handleSelect = (inst: InstitutionMec) => {
    onChange({
      name: inst.nome,
      sigla: inst.sigla || "",
      uf: inst.uf,
      isCustom: false,
    });
    setManualMode(false);
    setOpen(false);
    setSearch("");
  };

  const handleManualSave = () => {
    const name = sanitize(manualName);
    const sigla = sanitize(manualSigla);
    if (!name || !sigla || !manualUf) return;
    onChange({ name, sigla, uf: manualUf, isCustom: true });
  };

  const handleClear = () => {
    onChange({ name: "", sigla: "", uf: "", isCustom: false });
    setManualMode(false);
    setManualName("");
    setManualSigla("");
    setManualUf("");
  };

  useEffect(() => {
    if (value.isCustom) {
      setManualMode(true);
      setManualName(value.name);
      setManualSigla(value.sigla);
      setManualUf(value.uf);
    }
  }, [value.isCustom, value.name, value.sigla, value.uf]);

  const displayValue = value.name
    ? `${value.name}${value.sigla ? ` (${value.sigla})` : ""} — ${value.uf}`
    : "";

  if (manualMode) {
    return (
      <div className="space-y-3 rounded-md border border-border p-4 bg-muted/30">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Cadastro manual</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setManualMode(false);
              if (!value.isCustom) handleClear();
            }}
          >
            <X className="w-4 h-4 mr-1" /> Voltar à busca
          </Button>
        </div>
        <div className="space-y-2">
          <Label>Nome da instituição/empresa *</Label>
          <Input
            value={manualName}
            onChange={(e) => setManualName(e.target.value.toUpperCase())}
            placeholder="NOME DA INSTITUIÇÃO"
            disabled={disabled}
            maxLength={200}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Sigla *</Label>
            <Input
              value={manualSigla}
              onChange={(e) => setManualSigla(e.target.value.toUpperCase())}
              placeholder="SIGLA"
              disabled={disabled}
              maxLength={20}
            />
          </div>
          <div className="space-y-2">
            <Label>UF *</Label>
            <Select value={manualUf} onValueChange={setManualUf} disabled={disabled}>
              <SelectTrigger>
                <SelectValue placeholder="UF" />
              </SelectTrigger>
              <SelectContent className="z-[200] bg-popover">
                {UF_LIST.map((uf) => (
                  <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={handleManualSave}
          disabled={disabled || !manualName.trim() || !manualSigla.trim() || !manualUf}
        >
          Confirmar instituição
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            className="w-full justify-between font-normal h-auto min-h-10 text-left"
            disabled={disabled}
          >
            {displayValue ? (
              <span className="truncate text-sm">{displayValue}</span>
            ) : (
              <span className="text-muted-foreground text-sm">
                Digite o nome, sigla ou UF da instituição
              </span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 z-[200] bg-popover" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Buscar por nome, sigla ou UF..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {loading && (
                <div className="py-4 text-center text-sm text-muted-foreground">Buscando...</div>
              )}
              {!loading && search.length >= 2 && results.length === 0 && (
                <CommandEmpty>Nenhuma instituição encontrada.</CommandEmpty>
              )}
              {!loading && results.length > 0 && (
                <CommandGroup heading="Instituições (MEC)">
                  {results.map((inst) => (
                    <CommandItem
                      key={inst.id}
                      value={inst.id}
                      onSelect={() => handleSelect(inst)}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value.name === inst.nome ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="text-sm">
                        {inst.nome}
                        {inst.sigla && ` (${inst.sigla})`} — {inst.uf}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setManualMode(true);
                    setOpen(false);
                    setSearch("");
                  }}
                  className="cursor-pointer text-primary"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Minha instituição não está na lista
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value.name && (
        <Button type="button" variant="ghost" size="sm" onClick={handleClear} className="text-xs">
          <X className="w-3 h-3 mr-1" /> Limpar seleção
        </Button>
      )}
      <p className="text-xs text-muted-foreground">
        Selecione sua instituição conforme cadastro oficial do MEC. Caso não encontre, utilize a opção "Minha instituição não está na lista". A UF é obrigatória.
      </p>
    </div>
  );
}
