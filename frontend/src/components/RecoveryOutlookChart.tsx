import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const RecoveryOutlookChart = () => {
    // Dummy Data: Recovery progress over weeks
    const data = [
        { week: 'Wk 1', health: 20 },
        { week: 'Wk 2', health: 35 },
        { week: 'Wk 3', health: 45 },
        { week: 'Wk 4', health: 58 }, // Current
        { week: 'Wk 5', health: 65, projected: true },
        { week: 'Wk 6', health: 75, projected: true },
        { week: 'Wk 7', health: 82, projected: true },
        { week: 'Wk 8', health: 90, projected: true },
        { week: 'Wk 9', health: 95, projected: true },
        { week: 'Wk 10', health: 98, projected: true },
    ];

    // Split data for styling (Solid for past, Dashed for future if possible, or just color difference)
    // For simplicity, we'll map a single line but use a "ReferenceLine" or similar to show "today"? 
    // Actually, let's just use one styled Area for now, or maybe a composed chart.
    // Let's stick to AreaChart for a "stock" look.

    return (
        <div className="h-full w-full bg-white rounded-2xl border border-slate-200 p-8 flex flex-col">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h3 className="text-xl font-bold text-slate-900">Recovery Forecast</h3>
                    <p className="text-slate-500 mt-1">Estimated trajectory to full mobility</p>
                </div>
                <div className="text-right">
                    <div className="text-3xl font-bold text-brand-primary">58%</div>
                    <div className="text-sm font-medium text-slate-400 uppercase tracking-wide">Current Health Score</div>
                </div>
            </div>

            <div className="h-[400px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorHealth" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6d28d9" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#c084fc" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey="week"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis
                            hide
                            domain={[0, 100]}
                        />
                        <Tooltip
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="health"
                            stroke="#6d28d9"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorHealth)"
                            isAnimationActive={false}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default RecoveryOutlookChart;
