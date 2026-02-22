import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChevronsUpDown, Check, Plus, X, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCNPJ, unformatCNPJ, validateCNPJ } from "@/lib/cnpj-validator";
import { toast } from "sonner";
import DOMPurify from "dompurify";

const UF_LIST = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA",
  "PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];

const INSTITUTION_TYPES = [
  { value: "ies", label: "Instituição de Ensino" },
  { value: "empresa", label: "Empresa" },
  { value: "ong", label: "ONG" },
  { value: "orgao_publico", label: "Órgão Público" },
  { value: "instituto_pesquisa", label: "Instituto de Pesquisa" },
];

export interface InstitutionData {
  id?: string;
  name: string;
  acronym: string;
  uf: string;
  status?: string;
  isCustom: boolean;
  // legacy compat
  sigla?: string;
}

interface InstitutionComboboxProps {
  value: InstitutionData;
  onChange: (data: InstitutionData) => void;
  disabled?: boolean;
}

interface InstitutionRow {
  id: string;
  name: string;
  acronym: string | null;
  uf: string;
  municipality: string | null;
  status: string;
}

export function InstitutionCombobox({ value, onChange, disabled }: InstitutionComboboxProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<InstitutionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [manualMode, setManualMode] = useState(false);

  // Manual form fields
  const [manualName, setManualName] = useState("");
  const [manualAcronym, setManualAcronym] = useState("");
  const [manualUf, setManualUf] = useState("");
  const [manualCnpj, setManualCnpj] = useState("");
  const [manualMunicipality, setManualMunicipality] = useState("");
  const [manualType, setManualType] = useState("");
  const [cnpjError, setCnpjError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [duplicates, setDuplicates] = useState<InstitutionRow[]>([]);

  const sanitize = (val: string) => DOMPurify.sanitize(val).replace(/<[^>]*>/g, "").toUpperCase().trim();

  const searchInstitutions = useCallback(async (query: string) => {
    if (query.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const normalized = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const { data, error } = await (supabase as any)
        .from("institutions")
        .select("id, name, acronym, uf, municipality, status")
        .eq("status", "approved")
        .or(`normalized_name.ilike.%${normalized}%,acronym.ilike.%${query.toUpperCase()}%`)
        .order("name")
        .limit(20);
      if (error) throw error;
      setResults((data as InstitutionRow[]) || []);
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

  const handleSelect = (inst: InstitutionRow) => {
    onChange({
      id: inst.id,
      name: inst.name,
      acronym: inst.acronym || "",
      sigla: inst.acronym || "",
      uf: inst.uf,
      status: inst.status,
      isCustom: false,
    });
    setOpen(false);
    setSearch("");
  };

  const checkDuplicates = async () => {
    const checks: InstitutionRow[] = [];
    try {
      // Check by acronym
      if (manualAcronym.trim()) {
        const { data } = await (supabase as any)
          .from("institutions")
          .select("id, name, acronym, uf, municipality, status")
          .ilike("acronym", manualAcronym.trim())
          .limit(5);
        if (data?.length) checks.push(...data);
      }
      // Check by CNPJ
      const cleanCnpj = unformatCNPJ(manualCnpj);
      if (cleanCnpj.length === 14) {
        const { data } = await (supabase as any)
          .from("institutions")
          .select("id, name, acronym, uf, municipality, status")
          .eq("cnpj", cleanCnpj)
          .limit(5);
        if (data?.length) checks.push(...data);
      }
      // Check by name similarity
      if (manualName.trim().length >= 4) {
        const norm = manualName.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const { data } = await (supabase as any)
          .from("institutions")
          .select("id, name, acronym, uf, municipality, status")
          .ilike("normalized_name", `%${norm}%`)
          .limit(5);
        if (data?.length) checks.push(...data);
      }
    } catch (e) {
      console.warn("Duplicate check error:", e);
    }
    // Deduplicate by id
    const unique = Array.from(new Map(checks.map(c => [c.id, c])).values());
    setDuplicates(unique);
    return unique.length > 0;
  };

  const handleManualSubmit = async () => {
    const name = sanitize(manualName);
    const acronym = sanitize(manualAcronym);
    if (!name || !acronym || !manualUf) return;

    // Validate CNPJ if provided
    const cleanCnpj = unformatCNPJ(manualCnpj);
    if (cleanCnpj) {
      if (!validateCNPJ(cleanCnpj)) {
        setCnpjError("CNPJ inválido");
        return;
      }
    }

    // CNPJ required for private companies
    if (manualType === "empresa" && !cleanCnpj) {
      setCnpjError("CNPJ é obrigatório para empresas");
      return;
    }

    setCnpjError("");
    setSubmitting(true);

    try {
      // Check duplicates first - only block if user hasn't seen them yet
      if (duplicates.length === 0) {
        const hasDups = await checkDuplicates();
        if (hasDups) {
          // First time: show duplicates for review
          setSubmitting(false);
          return;
        }
      }

      const normalized = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      const { data, error } = await (supabase as any)
        .from("institutions")
        .insert({
          name,
          acronym,
          uf: manualUf,
          municipality: manualMunicipality.toUpperCase().trim() || null,
          cnpj: cleanCnpj || null,
          institution_type: manualType || null,
          source: "USER_SUBMITTED",
          status: "pending",
          submitted_by: user?.id,
          normalized_name: normalized,
        })
        .select("id, name, acronym, uf, status")
        .single();

      if (error) throw error;

      // Audit log
      await supabase.from("audit_logs").insert({
        user_id: user?.id,
        action: "institution_submitted",
        entity_type: "institution",
        entity_id: data.id,
        details: { name, acronym, uf: manualUf },
      } as any);

      onChange({
        id: data.id,
        name: data.name,
        acronym: data.acronym || "",
        sigla: data.acronym || "",
        uf: data.uf,
        status: "pending",
        isCustom: true,
      });

      toast.success("Instituição cadastrada! Aguardando aprovação administrativa.");
      setManualMode(false);
      resetManualForm();
    } catch (e: any) {
      console.error("Error submitting institution:", e);
      if (e.message?.includes("idx_institutions_cnpj_unique")) {
        setCnpjError("CNPJ já cadastrado no sistema");
      } else {
        toast.error("Erro ao cadastrar instituição. Tente novamente.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resetManualForm = () => {
    setManualName("");
    setManualAcronym("");
    setManualUf("");
    setManualCnpj("");
    setManualMunicipality("");
    setManualType("");
    setCnpjError("");
    setDuplicates([]);
  };

  const handleClear = () => {
    onChange({ name: "", acronym: "", sigla: "", uf: "", isCustom: false });
    setManualMode(false);
    resetManualForm();
  };

  const displayValue = value.name
    ? `${value.name}${value.acronym || value.sigla ? ` (${value.acronym || value.sigla})` : ""} — ${value.uf}`
    : "";

  if (manualMode) {
    return (
      <div className="space-y-3 rounded-md border border-border p-4 bg-muted/30">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Cadastrar nova instituição</p>
          <Button type="button" variant="ghost" size="sm" onClick={() => { setManualMode(false); resetManualForm(); }}>
            <X className="w-4 h-4 mr-1" /> Voltar à busca
          </Button>
        </div>

        <div className="space-y-2">
          <Label>Nome da instituição/empresa *</Label>
          <Input value={manualName} onChange={(e) => setManualName(e.target.value.toUpperCase())} placeholder="NOME DA INSTITUIÇÃO" disabled={disabled} maxLength={200} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Sigla *</Label>
            <Input value={manualAcronym} onChange={(e) => setManualAcronym(e.target.value.toUpperCase())} placeholder="SIGLA" disabled={disabled} maxLength={20} />
          </div>
          <div className="space-y-2">
            <Label>UF *</Label>
            <Select value={manualUf} onValueChange={setManualUf} disabled={disabled}>
              <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
              <SelectContent className="z-[200] bg-popover">
                {UF_LIST.map((uf) => (<SelectItem key={uf} value={uf}>{uf}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>CNPJ {manualType === "empresa" ? "*" : "(opcional)"}</Label>
            <Input
              value={manualCnpj}
              onChange={(e) => { setManualCnpj(formatCNPJ(e.target.value)); setCnpjError(""); }}
              placeholder="00.000.000/0000-00"
              disabled={disabled}
              maxLength={18}
            />
            {cnpjError && <p className="text-xs text-destructive">{cnpjError}</p>}
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={manualType} onValueChange={setManualType} disabled={disabled}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent className="z-[200] bg-popover">
                {INSTITUTION_TYPES.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Município (opcional)</Label>
          <Input value={manualMunicipality} onChange={(e) => setManualMunicipality(e.target.value)} placeholder="Município" disabled={disabled} maxLength={100} />
        </div>

        {/* Duplicate warning */}
        {duplicates.length > 0 && (
          <div className="rounded-md border border-yellow-500/30 bg-yellow-50 dark:bg-yellow-900/20 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-yellow-700 dark:text-yellow-400">
              <AlertTriangle className="w-4 h-4" /> Possíveis duplicatas encontradas
            </div>
            <ul className="space-y-1">
              {duplicates.map((d) => (
                <li key={d.id} className="text-xs text-muted-foreground flex items-center justify-between">
                  <span>{d.name} {d.acronym && `(${d.acronym})`} — {d.uf}</span>
                  <Button type="button" variant="link" size="sm" className="text-xs h-auto p-0" onClick={() => { handleSelect(d); setManualMode(false); resetManualForm(); }}>
                    Selecionar
                  </Button>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">Se nenhuma corresponde, clique em "Confirmar cadastro" para prosseguir.</p>
          </div>
        )}

        <Button
          type="button"
          size="sm"
          onClick={handleManualSubmit}
          disabled={disabled || submitting || !manualName.trim() || !manualAcronym.trim() || !manualUf}
        >
          {submitting ? "Enviando..." : "Confirmar cadastro"}
        </Button>
        <p className="text-xs text-muted-foreground">A instituição ficará pendente até aprovação administrativa.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal h-auto min-h-10 text-left" disabled={disabled}>
            {displayValue ? (
              <span className="truncate text-sm flex items-center gap-2">
                {displayValue}
                {value.status === "pending" && (
                  <Badge variant="outline" className="text-yellow-600 border-yellow-500/50 text-[10px] gap-1">
                    <Clock className="w-3 h-3" /> Pendente
                  </Badge>
                )}
              </span>
            ) : (
              <span className="text-muted-foreground text-sm">Digite o nome ou sigla da instituição</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 z-[200] bg-popover" align="start">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Buscar por nome ou sigla..." value={search} onValueChange={setSearch} />
            <CommandList>
              {loading && <div className="py-4 text-center text-sm text-muted-foreground">Buscando...</div>}
              {!loading && search.length >= 2 && results.length === 0 && (
                <CommandEmpty>Nenhuma instituição encontrada.</CommandEmpty>
              )}
              {!loading && results.length > 0 && (
                <CommandGroup heading="Instituições">
                  {results.map((inst) => (
                    <CommandItem key={inst.id} value={inst.id} onSelect={() => handleSelect(inst)} className="cursor-pointer">
                      <Check className={cn("mr-2 h-4 w-4", value.id === inst.id ? "opacity-100" : "opacity-0")} />
                      <span className="text-sm">{inst.name}{inst.acronym && ` (${inst.acronym})`} — {inst.uf}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              <CommandGroup>
                <CommandItem onSelect={() => { setManualMode(true); setOpen(false); setSearch(""); }} className="cursor-pointer text-primary">
                  <Plus className="mr-2 h-4 w-4" /> Minha instituição não está na lista
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
        Selecione sua instituição da base oficial. Caso não encontre, utilize a opção "Minha instituição não está na lista".
      </p>
    </div>
  );
}
