import React from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface LineChartProps {
  data: any[];
  dataKey: string;
  xAxisKey: string;
  // title?: string; // Removed title prop
  lineColor?: string;
}

const LineChart: React.FC<LineChartProps> = ({
  data,
  dataKey,
  xAxisKey,
  // title, // Removed title prop
  lineColor = 'hsl(var(--primary))'
}) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsLineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--muted)" vertical={false} />
        <XAxis dataKey={xAxisKey} stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--popover)',
            borderColor: 'var(--border)',
            color: 'var(--popover-foreground)',
            borderRadius: 'var(--radius)',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
          }}
          labelStyle={{ color: 'var(--foreground)' }}
          itemStyle={{ color: 'var(--primary)' }}
        />
        <Legend />
        <Line type="monotone" dataKey={dataKey} stroke={lineColor.startsWith('hsl') ? lineColor : `var(--primary)`} strokeWidth={2} activeDot={{ r: 6, strokeWidth: 0 }} dot={false} />
      </RechartsLineChart>
    </ResponsiveContainer>
  );
};

export default LineChart;
