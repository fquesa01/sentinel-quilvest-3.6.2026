import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

type BehaviorMetrics = {
  afterHours: number;
  externalComms: number;
  riskKeywords: number;
  attachments: number;
  offChannel: number;
};

type Props = {
  employeeMetrics: BehaviorMetrics;
  averageMetrics: BehaviorMetrics;
};

export function BehaviorRadar({ employeeMetrics, averageMetrics }: Props) {
  const data = [
    {
      metric: "After Hours",
      employee: employeeMetrics.afterHours * 100,
      average: averageMetrics.afterHours * 100,
    },
    {
      metric: "External",
      employee: employeeMetrics.externalComms * 100,
      average: averageMetrics.externalComms * 100,
    },
    {
      metric: "Risk Keywords",
      employee: employeeMetrics.riskKeywords * 100,
      average: averageMetrics.riskKeywords * 100,
    },
    {
      metric: "Attachments",
      employee: employeeMetrics.attachments * 100,
      average: averageMetrics.attachments * 100,
    },
    {
      metric: "Off-Channel",
      employee: employeeMetrics.offChannel * 100,
      average: averageMetrics.offChannel * 100,
    },
  ];

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={data}>
        <PolarGrid stroke="hsl(var(--border))" />
        <PolarAngleAxis
          dataKey="metric"
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
        />
        <Radar
          name="This Person"
          dataKey="employee"
          stroke="hsl(var(--primary))"
          fill="hsl(var(--primary))"
          fillOpacity={0.5}
        />
        <Radar
          name="Company Avg"
          dataKey="average"
          stroke="hsl(var(--muted-foreground))"
          fill="hsl(var(--muted-foreground))"
          fillOpacity={0.25}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "var(--radius)",
          }}
        />
        <Legend
          wrapperStyle={{
            fontSize: "12px",
          }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
