import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

type DonutDatum = {
  name: string;
  value: number;
  color: string;
};

export default function TaskStatusDonut({ data, rate, total }: {
  data: DonutDatum[];
  rate: number;
  total: number;
}) {
  return (
    <div className="flex flex-col items-center gap-1 flex-shrink-0 mx-auto sm:mx-0" aria-label={`Task completion ${rate}%`}>
      <div className="relative w-28 h-28" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={36} outerRadius={54} paddingAngle={3} dataKey="value" strokeWidth={0}>
              {data.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-foreground leading-none">{rate}%</span>
          <span className="text-xs text-muted-foreground mt-0.5">เสร็จแล้ว</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{total} tasks ทั้งหมด</p>
    </div>
  );
}

