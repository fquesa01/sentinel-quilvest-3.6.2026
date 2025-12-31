import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface HeatmapCell {
  row: number | string;
  col: number | string;
  value: number;
  tooltip?: string;
  metadata?: Record<string, any>;
}

interface HeatmapGridProps {
  title: string;
  description?: string;
  rowLabels: string[];
  rowLabelsFull?: string[];
  colLabels: string[];
  colLabelsFull?: string[];
  cells: HeatmapCell[];
  colorScale?: "blue" | "green" | "red" | "orange" | "purple";
  onCellClick?: (cell: HeatmapCell) => void;
  formatValue?: (value: number) => string;
  formatTooltip?: (cell: HeatmapCell) => string;
  loading?: boolean;
  emptyMessage?: string;
  minCellSize?: number;
  rotateColumnLabels?: boolean;
}

const COLOR_SCALES = {
  blue: {
    low: "bg-blue-900/20",
    medium: "bg-blue-600/50",
    high: "bg-blue-400",
    text: "text-blue-50",
  },
  green: {
    low: "bg-emerald-900/20",
    medium: "bg-emerald-600/50",
    high: "bg-emerald-400",
    text: "text-emerald-50",
  },
  red: {
    low: "bg-red-900/20",
    medium: "bg-red-600/50",
    high: "bg-red-400",
    text: "text-red-50",
  },
  orange: {
    low: "bg-orange-900/20",
    medium: "bg-orange-600/50",
    high: "bg-orange-400",
    text: "text-orange-50",
  },
  purple: {
    low: "bg-purple-900/20",
    medium: "bg-purple-600/50",
    high: "bg-purple-400",
    text: "text-purple-50",
  },
};

export function HeatmapGrid({
  title,
  description,
  rowLabels,
  rowLabelsFull,
  colLabels,
  colLabelsFull,
  cells,
  colorScale = "blue",
  onCellClick,
  formatValue = (v) => v.toString(),
  formatTooltip,
  loading = false,
  emptyMessage = "No data available",
  minCellSize = 32,
  rotateColumnLabels = false,
}: HeatmapGridProps) {
  const { maxValue, cellMap } = useMemo(() => {
    let max = 0;
    const map = new Map<string, HeatmapCell>();
    
    for (const cell of cells) {
      if (cell.value > max) max = cell.value;
      const key = `${cell.row}-${cell.col}`;
      map.set(key, cell);
    }
    
    return { maxValue: max, cellMap: map };
  }, [cells]);

  const getCellColor = (value: number): string => {
    if (value === 0 || maxValue === 0) return "bg-muted/30";
    
    const ratio = value / maxValue;
    const colors = COLOR_SCALES[colorScale];
    
    if (ratio < 0.33) return colors.low;
    if (ratio < 0.66) return colors.medium;
    return colors.high;
  };

  const getCellTextColor = (value: number): string => {
    if (value === 0 || maxValue === 0) return "text-muted-foreground";
    
    const ratio = value / maxValue;
    if (ratio > 0.5) return COLOR_SCALES[colorScale].text;
    return "text-foreground";
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-pulse text-muted-foreground">Loading heatmap data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (cells.length === 0 || rowLabels.length === 0 || colLabels.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            {emptyMessage}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {rotateColumnLabels ? (
            <div className="flex items-end" style={{ height: 80, marginBottom: 8 }}>
              <div className="flex-shrink-0 w-28" />
              <div className="flex gap-px">
                {colLabels.map((label, i) => {
                  const fullLabel = colLabelsFull?.[i] || label;
                  return (
                    <Tooltip key={`col-${i}`}>
                      <TooltipTrigger asChild>
                        <div
                          className="flex-shrink-0 flex items-end justify-start"
                          style={{ width: minCellSize, minWidth: minCellSize, height: 70 }}
                        >
                          <div
                            className="text-xs text-muted-foreground whitespace-nowrap cursor-default"
                            style={{
                              transform: "rotate(-45deg)",
                              transformOrigin: "left bottom",
                              maxWidth: 100,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {label}
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <p className="text-sm font-medium">{fullLabel}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex">
              <div className="flex-shrink-0 w-24" />
              <div className="flex gap-px">
                {colLabels.map((label, i) => (
                  <div
                    key={`col-${i}`}
                    className="flex-shrink-0 text-xs text-muted-foreground text-center truncate px-1"
                    style={{ width: minCellSize, minWidth: minCellSize }}
                    title={colLabelsFull?.[i] || label}
                  >
                    {label.length > 6 ? `${label.slice(0, 5)}…` : label}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {rowLabels.map((rowLabel, rowIndex) => {
            const fullRowLabel = rowLabelsFull?.[rowIndex] || rowLabel;
            const rowLabelWidth = rotateColumnLabels ? "w-28" : "w-24";
            const maxChars = rotateColumnLabels ? 14 : 12;
            
            return (
              <div key={`row-${rowIndex}`} className="flex items-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "flex-shrink-0 text-xs text-muted-foreground text-right pr-2 truncate cursor-default",
                        rowLabelWidth
                      )}
                    >
                      {rowLabel.length > maxChars ? `${rowLabel.slice(0, maxChars - 1)}…` : rowLabel}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-xs">
                    <p className="text-sm font-medium">{fullRowLabel}</p>
                  </TooltipContent>
                </Tooltip>
                <div className="flex gap-px">
                  {colLabels.map((colLabel, colIndex) => {
                    const key = `${rowIndex}-${colIndex}`;
                    const cell = cellMap.get(key) || { row: rowIndex, col: colIndex, value: 0 };
                    const value = cell.value;
                    const fullColLabel = colLabelsFull?.[colIndex] || colLabel;
                    
                    const tooltipContent = formatTooltip 
                      ? formatTooltip(cell) 
                      : `${fullRowLabel} × ${fullColLabel}: ${formatValue(value)}`;
                    
                    return (
                      <Tooltip key={key}>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className={cn(
                              "flex-shrink-0 flex items-center justify-center rounded-sm transition-all",
                              getCellColor(value),
                              getCellTextColor(value),
                              onCellClick && value > 0 && "cursor-pointer hover:ring-2 hover:ring-primary/50",
                              !onCellClick && "cursor-default"
                            )}
                            style={{ 
                              width: minCellSize, 
                              height: minCellSize, 
                              minWidth: minCellSize 
                            }}
                            onClick={() => value > 0 && onCellClick?.(cell)}
                            data-testid={`heatmap-cell-${rowIndex}-${colIndex}`}
                          >
                            <span className="text-[10px] font-medium">
                              {value > 0 ? formatValue(value) : ""}
                            </span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-sm">{tooltipContent}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="flex items-center justify-end gap-2 mt-4 text-xs text-muted-foreground">
          <span>Low</span>
          <div className="flex gap-px">
            <div className={cn("w-4 h-4 rounded-sm", COLOR_SCALES[colorScale].low)} />
            <div className={cn("w-4 h-4 rounded-sm", COLOR_SCALES[colorScale].medium)} />
            <div className={cn("w-4 h-4 rounded-sm", COLOR_SCALES[colorScale].high)} />
          </div>
          <span>High</span>
        </div>
      </CardContent>
    </Card>
  );
}

interface TimeHeatmapData {
  dayOfWeek: number;
  hour: number;
  count: number;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => 
  i === 0 ? "12a" : i < 12 ? `${i}a` : i === 12 ? "12p" : `${i - 12}p`
);

export function TimeOfDayHeatmap({
  data,
  loading = false,
  onCellClick,
}: {
  data: TimeHeatmapData[];
  loading?: boolean;
  onCellClick?: (dayOfWeek: number, hour: number) => void;
}) {
  const cells = useMemo(() => {
    return data.map((d) => ({
      row: d.dayOfWeek,
      col: d.hour,
      value: d.count,
      metadata: { dayOfWeek: d.dayOfWeek, hour: d.hour },
    }));
  }, [data]);

  return (
    <HeatmapGrid
      title="Communication Activity by Time"
      description="Message volume by day of week and hour of day"
      rowLabels={DAY_LABELS}
      colLabels={HOUR_LABELS}
      cells={cells}
      colorScale="blue"
      loading={loading}
      minCellSize={28}
      formatTooltip={(cell) => {
        const day = DAY_LABELS[cell.row as number];
        const hour = HOUR_LABELS[cell.col as number];
        return `${cell.value} messages on ${day} at ${hour}`;
      }}
      onCellClick={(cell) => {
        onCellClick?.(cell.row as number, cell.col as number);
      }}
      emptyMessage="No communication data found for this case"
    />
  );
}

interface PersonMatrixData {
  personA: string;
  personB: string;
  total: number;
  sentAtoB: number;
  sentBtoA: number;
}

export function PersonMatrixHeatmap({
  people,
  matrix,
  loading = false,
  onCellClick,
}: {
  people: string[];
  matrix: PersonMatrixData[];
  loading?: boolean;
  onCellClick?: (personA: string, personB: string) => void;
}) {
  const cells = useMemo(() => {
    const result: HeatmapCell[] = [];
    
    for (const m of matrix) {
      const rowIdx = people.indexOf(m.personA);
      const colIdx = people.indexOf(m.personB);
      
      if (rowIdx >= 0 && colIdx >= 0) {
        result.push({
          row: rowIdx,
          col: colIdx,
          value: m.total,
          metadata: { personA: m.personA, personB: m.personB, sentAtoB: m.sentAtoB, sentBtoA: m.sentBtoA },
        });
        result.push({
          row: colIdx,
          col: rowIdx,
          value: m.total,
          metadata: { personA: m.personB, personB: m.personA, sentAtoB: m.sentBtoA, sentBtoA: m.sentAtoB },
        });
      }
    }
    
    return result;
  }, [people, matrix]);

  const truncatedLabels = people.map((p) => {
    const atIndex = p.indexOf("@");
    return atIndex > 0 ? p.slice(0, atIndex) : p;
  });

  return (
    <HeatmapGrid
      title="Person-to-Person Communications"
      description="Message volume between individuals"
      rowLabels={truncatedLabels}
      rowLabelsFull={people}
      colLabels={truncatedLabels}
      colLabelsFull={people}
      cells={cells}
      colorScale="green"
      loading={loading}
      minCellSize={32}
      rotateColumnLabels={true}
      formatTooltip={(cell) => {
        const meta = cell.metadata;
        if (!meta) return `${cell.value} messages`;
        const personAName = meta.personA.indexOf("@") > 0 ? meta.personA.slice(0, meta.personA.indexOf("@")) : meta.personA;
        const personBName = meta.personB.indexOf("@") > 0 ? meta.personB.slice(0, meta.personB.indexOf("@")) : meta.personB;
        return `${personAName} ↔ ${personBName}: ${cell.value} total (${meta.sentAtoB} → ${meta.sentBtoA})`;
      }}
      onCellClick={(cell) => {
        const meta = cell.metadata;
        if (meta) {
          onCellClick?.(meta.personA, meta.personB);
        }
      }}
      emptyMessage="No person-to-person communication data"
    />
  );
}

interface OrgMatrixData {
  domainA: string;
  domainB: string;
  count: number;
}

export function OrgMatrixHeatmap({
  domains,
  matrix,
  loading = false,
  onCellClick,
}: {
  domains: string[];
  matrix: OrgMatrixData[];
  loading?: boolean;
  onCellClick?: (domainA: string, domainB: string) => void;
}) {
  const cells = useMemo(() => {
    const result: HeatmapCell[] = [];
    
    for (const m of matrix) {
      const rowIdx = domains.indexOf(m.domainA);
      const colIdx = domains.indexOf(m.domainB);
      
      if (rowIdx >= 0 && colIdx >= 0) {
        result.push({
          row: rowIdx,
          col: colIdx,
          value: m.count,
          metadata: { domainA: m.domainA, domainB: m.domainB },
        });
        result.push({
          row: colIdx,
          col: rowIdx,
          value: m.count,
          metadata: { domainA: m.domainB, domainB: m.domainA },
        });
      }
    }
    
    return result;
  }, [domains, matrix]);

  return (
    <HeatmapGrid
      title="Organization-to-Organization Communications"
      description="Cross-domain message volume"
      rowLabels={domains}
      colLabels={domains}
      cells={cells}
      colorScale="purple"
      loading={loading}
      minCellSize={36}
      rotateColumnLabels={true}
      formatTooltip={(cell) => {
        const meta = cell.metadata;
        if (!meta) return `${cell.value} messages`;
        return `${meta.domainA} ↔ ${meta.domainB}: ${cell.value} messages`;
      }}
      onCellClick={(cell) => {
        const meta = cell.metadata;
        if (meta) {
          onCellClick?.(meta.domainA, meta.domainB);
        }
      }}
      emptyMessage="No cross-organization communication data"
    />
  );
}

interface TopicPersonData {
  topic: string;
  person: string;
  count: number;
}

export function TopicPersonHeatmap({
  topics,
  people,
  matrix,
  loading = false,
  onCellClick,
}: {
  topics: string[];
  people: string[];
  matrix: TopicPersonData[];
  loading?: boolean;
  onCellClick?: (topic: string, person: string) => void;
}) {
  const cells = useMemo(() => {
    return matrix.map((m) => {
      const rowIdx = topics.indexOf(m.topic);
      const colIdx = people.indexOf(m.person);
      return {
        row: rowIdx,
        col: colIdx,
        value: m.count,
        metadata: { topic: m.topic, person: m.person },
      };
    }).filter((c) => c.row >= 0 && c.col >= 0);
  }, [topics, people, matrix]);

  const truncatedPeople = people.map((p) => {
    const atIndex = p.indexOf("@");
    return atIndex > 0 ? p.slice(0, atIndex) : p;
  });

  return (
    <HeatmapGrid
      title="Topic vs Person Analysis"
      description="Message topics by sender"
      rowLabels={topics.map((t) => t.charAt(0).toUpperCase() + t.slice(1))}
      colLabels={truncatedPeople}
      colLabelsFull={people}
      cells={cells}
      colorScale="orange"
      loading={loading}
      minCellSize={32}
      rotateColumnLabels={true}
      formatTooltip={(cell) => {
        const meta = cell.metadata;
        if (!meta) return `${cell.value} messages`;
        const personName = meta.person.indexOf("@") > 0 ? meta.person.slice(0, meta.person.indexOf("@")) : meta.person;
        return `${personName} sent ${cell.value} "${meta.topic}" messages`;
      }}
      onCellClick={(cell) => {
        const meta = cell.metadata;
        if (meta) {
          onCellClick?.(meta.topic, meta.person);
        }
      }}
      emptyMessage="No topic data available"
    />
  );
}

interface AnomalyData {
  entity: string;
  entityType: "person" | "domain";
  months: Array<{ month: string; volume: number; percentChange: number }>;
}

export function AnomalyHeatmap({
  data,
  loading = false,
  onCellClick,
}: {
  data: AnomalyData[];
  loading?: boolean;
  onCellClick?: (entity: string, month: string) => void;
}) {
  const { entities, months, cells } = useMemo(() => {
    const entitiesList = data.map((d) => d.entity);
    const allMonths = new Set<string>();
    
    for (const d of data) {
      for (const m of d.months) {
        allMonths.add(m.month);
      }
    }
    
    const monthsList = Array.from(allMonths).sort();
    
    const cellsList: HeatmapCell[] = [];
    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      for (const m of d.months) {
        const colIdx = monthsList.indexOf(m.month);
        if (colIdx >= 0) {
          cellsList.push({
            row: i,
            col: colIdx,
            value: m.volume,
            metadata: { 
              entity: d.entity, 
              month: m.month, 
              percentChange: m.percentChange,
              isAnomaly: Math.abs(m.percentChange) > 100,
            },
          });
        }
      }
    }
    
    return { entities: entitiesList, months: monthsList, cells: cellsList };
  }, [data]);

  const truncatedEntities = entities.map((e) => {
    const atIndex = e.indexOf("@");
    return atIndex > 0 ? e.slice(0, atIndex) : e;
  });

  return (
    <HeatmapGrid
      title="Communication Volume Trends"
      description="Monthly message volume by person (anomalies highlighted)"
      rowLabels={truncatedEntities}
      colLabels={months.map((m) => m.slice(5))}
      cells={cells}
      colorScale="red"
      loading={loading}
      minCellSize={40}
      formatTooltip={(cell) => {
        const meta = cell.metadata;
        if (!meta) return `${cell.value} messages`;
        const changeText = meta.percentChange !== 0 
          ? ` (${meta.percentChange > 0 ? "+" : ""}${meta.percentChange.toFixed(0)}%)`
          : "";
        const anomalyText = meta.isAnomaly ? " ⚠️ ANOMALY" : "";
        return `${meta.entity} - ${meta.month}: ${cell.value} messages${changeText}${anomalyText}`;
      }}
      onCellClick={(cell) => {
        const meta = cell.metadata;
        if (meta) {
          onCellClick?.(meta.entity, meta.month);
        }
      }}
      emptyMessage="No trend data available"
    />
  );
}
