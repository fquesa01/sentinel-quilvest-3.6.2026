import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

type ChannelData = {
  name: string;
  value: number;
  color: string;
};

type Props = {
  emailPercent: number;
  teamsPercent: number;
  smsPercent: number;
  externalPercent: number;
};

export function ChannelMixDonut({ emailPercent, teamsPercent, smsPercent, externalPercent }: Props) {
  const data: ChannelData[] = [
    { name: "Email", value: emailPercent, color: "hsl(var(--primary))" },
    { name: "Teams", value: teamsPercent, color: "hsl(217, 91%, 60%)" },
    { name: "SMS", value: smsPercent, color: "hsl(217, 91%, 75%)" },
    { name: "External", value: externalPercent, color: "hsl(0, 72%, 51%)" },
  ].filter(item => item.value > 0);

  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "var(--radius)",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-2 gap-3 mt-4 w-full">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-muted-foreground">
              {item.name}: {item.value}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
