import { useState, useCallback, useEffect } from "react";
import { Calendar, CalendarRange } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export type PeriodType = "month" | "quarter" | "year" | "custom";

export interface PeriodRange {
  startMonth: string; // "YYYY-MM"
  endMonth: string;   // "YYYY-MM"
  label: string;
}

interface PeriodFilterProps {
  availableMonths: string[];
  value: PeriodRange | null;
  onChange: (range: PeriodRange) => void;
}

function getMonthStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(m: string): string {
  try {
    const [y, mo] = m.split("-").map(Number);
    const d = new Date(y, mo - 1, 1);
    const label = format(d, "MMMM/yyyy", { locale: ptBR });
    return label.charAt(0).toUpperCase() + label.slice(1);
  } catch {
    return m;
  }
}

function getQuarterMonths(year: number, quarter: number): { start: string; end: string } {
  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  return {
    start: `${year}-${String(startMonth).padStart(2, "0")}`,
    end: `${year}-${String(endMonth).padStart(2, "0")}`,
  };
}

function getCurrentQuarter(): number {
  return Math.ceil((new Date().getMonth() + 1) / 3);
}

export function PeriodFilter({ availableMonths, value, onChange }: PeriodFilterProps) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = getMonthStr(now);

  const [periodType, setPeriodType] = useState<PeriodType>("month");
  const [selectedMonth, setSelectedMonth] = useState<string>(value?.startMonth || currentMonth);
  const [selectedQuarter, setSelectedQuarter] = useState<string>(`${currentYear}-Q${getCurrentQuarter()}`);
  const [selectedYear, setSelectedYear] = useState<string>(String(currentYear));
  const [customStart, setCustomStart] = useState<Date | undefined>(undefined);
  const [customEnd, setCustomEnd] = useState<Date | undefined>(undefined);

  // Available years from months
  const availableYears = [...new Set(availableMonths.map(m => m.split("-")[0]))].sort().reverse();
  if (!availableYears.includes(String(currentYear))) {
    availableYears.unshift(String(currentYear));
  }

  const emitChange = useCallback((type: PeriodType, extra?: { month?: string; quarter?: string; year?: string; start?: Date; end?: Date }) => {
    let range: PeriodRange;

    switch (type) {
      case "month": {
        const m = extra?.month || selectedMonth;
        range = { startMonth: m, endMonth: m, label: formatMonthLabel(m) };
        break;
      }
      case "quarter": {
        const q = extra?.quarter || selectedQuarter;
        const [y, qStr] = q.split("-Q");
        const { start, end } = getQuarterMonths(Number(y), Number(qStr));
        range = { startMonth: start, endMonth: end, label: `${qStr}º Trimestre/${y}` };
        break;
      }
      case "year": {
        const y = extra?.year || selectedYear;
        range = { startMonth: `${y}-01`, endMonth: `${y}-12`, label: `Ano ${y}` };
        break;
      }
      case "custom": {
        const s = extra?.start || customStart;
        const e = extra?.end || customEnd;
        if (!s || !e) return;
        const startM = getMonthStr(s);
        const endM = getMonthStr(e);
        range = {
          startMonth: startM <= endM ? startM : endM,
          endMonth: startM <= endM ? endM : startM,
          label: `${format(s, "MM/yyyy")} - ${format(e, "MM/yyyy")}`,
        };
        break;
      }
      default:
        return;
    }

    onChange(range);
  }, [selectedMonth, selectedQuarter, selectedYear, customStart, customEnd, onChange]);

  // Emit on mount
  useEffect(() => {
    if (!value) {
      emitChange("month");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePeriodTypeChange = (type: PeriodType) => {
    setPeriodType(type);
    if (type !== "custom") {
      emitChange(type);
    }
  };

  const handleMonthChange = (m: string) => {
    setSelectedMonth(m);
    emitChange("month", { month: m });
  };

  const handleQuarterChange = (q: string) => {
    setSelectedQuarter(q);
    emitChange("quarter", { quarter: q });
  };

  const handleYearChange = (y: string) => {
    setSelectedYear(y);
    emitChange("year", { year: y });
  };

  const handleCustomStartSelect = (date: Date | undefined) => {
    setCustomStart(date);
    if (date && customEnd) {
      emitChange("custom", { start: date, end: customEnd });
    }
  };

  const handleCustomEndSelect = (date: Date | undefined) => {
    setCustomEnd(date);
    if (customStart && date) {
      emitChange("custom", { start: customStart, end: date });
    }
  };

  // Generate quarter options
  const quarterOptions = availableYears.flatMap(y =>
    [4, 3, 2, 1].map(q => ({
      value: `${y}-Q${q}`,
      label: `${q}º Trimestre/${y}`,
    }))
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Period type selector */}
      <Select value={periodType} onValueChange={(v) => handlePeriodTypeChange(v as PeriodType)}>
        <SelectTrigger className="w-[140px] border-primary/30 bg-primary/5">
          <CalendarRange className="h-4 w-4 mr-2 text-primary" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="month">Mês</SelectItem>
          <SelectItem value="quarter">Trimestre</SelectItem>
          <SelectItem value="year">Ano</SelectItem>
          <SelectItem value="custom">Personalizado</SelectItem>
        </SelectContent>
      </Select>

      {/* Month selector */}
      {periodType === "month" && (
        <Select value={selectedMonth} onValueChange={handleMonthChange}>
          <SelectTrigger className="w-[180px] border-primary/30 bg-primary/5">
            <Calendar className="h-4 w-4 mr-2 text-primary" />
            <SelectValue placeholder="Mês/Ano" />
          </SelectTrigger>
          <SelectContent>
            {availableMonths.map(month => (
              <SelectItem key={month} value={month}>
                {formatMonthLabel(month)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Quarter selector */}
      {periodType === "quarter" && (
        <Select value={selectedQuarter} onValueChange={handleQuarterChange}>
          <SelectTrigger className="w-[200px] border-primary/30 bg-primary/5">
            <Calendar className="h-4 w-4 mr-2 text-primary" />
            <SelectValue placeholder="Trimestre" />
          </SelectTrigger>
          <SelectContent>
            {quarterOptions.map(q => (
              <SelectItem key={q.value} value={q.value}>
                {q.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Year selector */}
      {periodType === "year" && (
        <Select value={selectedYear} onValueChange={handleYearChange}>
          <SelectTrigger className="w-[120px] border-primary/30 bg-primary/5">
            <Calendar className="h-4 w-4 mr-2 text-primary" />
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent>
            {availableYears.map(y => (
              <SelectItem key={y} value={y}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Custom date range */}
      {periodType === "custom" && (
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("w-[140px] justify-start text-left font-normal border-primary/30", !customStart && "text-muted-foreground")}>
                <Calendar className="h-4 w-4 mr-2" />
                {customStart ? format(customStart, "MM/yyyy") : "Início"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={customStart}
                onSelect={handleCustomStartSelect}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          <span className="text-muted-foreground text-sm">até</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("w-[140px] justify-start text-left font-normal border-primary/30", !customEnd && "text-muted-foreground")}>
                <Calendar className="h-4 w-4 mr-2" />
                {customEnd ? format(customEnd, "MM/yyyy") : "Fim"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={customEnd}
                onSelect={handleCustomEndSelect}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}
