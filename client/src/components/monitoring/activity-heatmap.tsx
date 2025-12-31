import { useState } from "react";

type HeatmapCell = {
  date: string;
  value: number;
  flagged: boolean;
};

type Props = {
  data: HeatmapCell[];
};

export function ActivityHeatmap({ data }: Props) {
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const getIntensityClass = (value: number, flagged: boolean) => {
    if (flagged) return "bg-red-600/80 dark:bg-red-500/80";
    if (value === 0) return "bg-muted";
    if (value < 30) return "bg-primary/20";
    if (value < 60) return "bg-primary/40";
    if (value < 90) return "bg-primary/60";
    return "bg-primary/80";
  };

  const handleMouseMove = (e: React.MouseEvent, cell: HeatmapCell) => {
    setHoveredCell(cell);
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-1.5">
        {data.map((cell, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-sm cursor-pointer transition-all hover:scale-125 ${getIntensityClass(
              cell.value,
              cell.flagged
            )}`}
            onMouseMove={(e) => handleMouseMove(e, cell)}
            onMouseLeave={() => setHoveredCell(null)}
            data-testid={`heatmap-cell-${i}`}
          />
        ))}
      </div>

      {/* Tooltip */}
      {hoveredCell && (
        <div
          className="fixed z-50 bg-card border border-border rounded-lg shadow-lg text-xs px-3 py-2 pointer-events-none"
          style={{
            left: mousePos.x + 10,
            top: mousePos.y - 40,
          }}
        >
          <div className="font-medium">{hoveredCell.date}</div>
          <div className="text-muted-foreground">
            {hoveredCell.value} messages
            {hoveredCell.flagged && (
              <span className="text-red-600 dark:text-red-400"> · Flagged activity</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
