import { useState } from "react";

type NetworkNode = {
  name: string;
  angle: number;
  distance: number;
  risk: "high" | "medium" | "low";
  percent: number;
  channel: string;
};

type Props = {
  centerName: string;
  totalMessages: number;
  topContacts: any[];
};

function riskColor(risk: string) {
  if (risk === "high") return "bg-red-600 dark:bg-red-500";
  if (risk === "medium") return "bg-yellow-600 dark:bg-yellow-500";
  if (risk === "low") return "bg-green-600 dark:bg-green-500";
  return "bg-primary";
}

export function CommunicationNetworkGraph({ centerName, totalMessages, topContacts }: Props) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const nodes: NetworkNode[] = topContacts.slice(0, 10).map((contact, index) => {
    const angleStep = 360 / Math.min(topContacts.length, 10);
    const angle = (index * angleStep - 90) * (Math.PI / 180);
    const distance = 130 + (index % 2) * 20;
    
    const getRisk = (): "high" | "medium" | "low" => {
      const percent = (contact.messageCount / totalMessages) * 100;
      if (percent > 15) return "high";
      if (percent > 8) return "medium";
      return "low";
    };

    return {
      name: contact.contactName,
      angle: index * angleStep - 90,
      distance,
      risk: getRisk(),
      percent: (contact.messageCount / totalMessages) * 100,
      channel: contact.method,
    };
  });

  const initials = centerName
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative h-96 w-full flex items-center justify-center">
      <div className="relative w-full h-full max-w-md mx-auto">
        {/* Center node */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="flex flex-col items-center">
            <div className="h-24 w-24 rounded-full bg-primary flex items-center justify-center text-white text-xl font-semibold shadow-lg">
              {initials}
            </div>
            <div className="mt-2 text-xs font-medium text-center">
              {centerName}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {totalMessages.toLocaleString()} messages
            </div>
          </div>
        </div>

        {/* Nodes and connections */}
        {nodes.map((node, i) => {
          const rad = (node.angle * Math.PI) / 180;
          const x = Math.cos(rad) * node.distance;
          const y = Math.sin(rad) * node.distance;
          const nodeInitials = node.name
            .split(" ")
            .map(n => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

          return (
            <div key={i}>
              {/* Connection line */}
              <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <line
                  x1="50%"
                  y1="50%"
                  x2={`calc(50% + ${x}px)`}
                  y2={`calc(50% + ${y}px)`}
                  stroke="hsl(var(--border))"
                  strokeWidth="1.5"
                  opacity="0.3"
                />
              </svg>

              {/* Node */}
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{
                  transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                }}
                onMouseEnter={() => setHoveredNode(node.name)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                <div className="flex flex-col items-center group cursor-pointer">
                  <div
                    className={`h-10 w-10 rounded-full ${riskColor(
                      node.risk
                    )} flex items-center justify-center text-[11px] text-white shadow-md hover:scale-110 transition-transform`}
                    data-testid={`network-node-${i}`}
                  >
                    {nodeInitials}
                  </div>
                  <div className="mt-1 text-[10px] text-center max-w-[80px] text-muted-foreground truncate">
                    {node.name.split(" ")[0]}
                  </div>

                  {/* Tooltip */}
                  {hoveredNode === node.name && (
                    <div className="absolute top-12 z-20 bg-card border border-border rounded-lg shadow-lg text-[11px] px-3 py-2 whitespace-nowrap">
                      <div className="font-medium">{node.name}</div>
                      <div className="text-muted-foreground">
                        {node.percent.toFixed(1)}% of total · via {node.channel}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
