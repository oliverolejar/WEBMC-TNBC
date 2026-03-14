import { useEffect, useState } from 'react';
import {
    Area,
    CartesianGrid,
    ComposedChart,
    Line,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

interface HistoryPoint {
    date: string;
    recovery_index: number;
    source: 'synthetic' | 'real';
}

interface ChartRow {
    label: string;
    synthRi?: number;
    realRi?: number;
}

const DUMMY_DATA: ChartRow[] = [
    { label: 'Wk 1', synthRi: 20 },
    { label: 'Wk 2', synthRi: 35 },
    { label: 'Wk 3', synthRi: 45 },
    { label: 'Wk 4', synthRi: 58 },
    { label: 'Wk 5', synthRi: 65 },
    { label: 'Wk 6', synthRi: 75 },
    { label: 'Wk 7', synthRi: 82 },
    { label: 'Wk 8', synthRi: 90 },
];

function formatDate(iso: string): string {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface Props {
    refreshKey?: number;
}

const RecoveryOutlookChart = ({ refreshKey = 0 }: Props) => {
    const [history, setHistory] = useState<HistoryPoint[] | null>(null);

    useEffect(() => {
        fetch('http://localhost:8000/recovery/history')
            .then(r => r.json())
            .then((data: HistoryPoint[]) => setHistory(data))
            .catch(() => {});
    }, [refreshKey]);

    // Still fetching — render nothing yet
    if (history === null) return null;

    // Build unified chart rows from API data (or fall back to dummy if API returned empty)
    let chartData: ChartRow[];
    let currentScore: number;
    let isLoaded = false;

    if (history.length > 0) {
        isLoaded = true;
        const synthPoints = history.filter(p => p.source === 'synthetic');
        const realPoints = history.filter(p => p.source === 'real');

        const allDates = [...new Set(history.map(p => p.date))].sort();
        chartData = allDates.map(date => {
            const s = synthPoints.find(p => p.date === date);
            const r = realPoints.find(p => p.date === date);
            return { label: formatDate(date), synthRi: s?.recovery_index, realRi: r?.recovery_index };
        });

        if (realPoints.length > 0) {
            currentScore = realPoints[realPoints.length - 1].recovery_index;
        } else {
            currentScore = synthPoints[synthPoints.length - 1]?.recovery_index ?? 0;
        }
    } else {
        chartData = DUMMY_DATA;
        currentScore = 58;
    }

    return (
        <div className="h-full w-full bg-white rounded-2xl border border-slate-200 p-8 flex flex-col">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h3 className="text-xl font-bold text-slate-900">Recovery Forecast</h3>
                    <p className="text-slate-500 mt-1">
                        {isLoaded ? 'Session history & model inference' : 'Estimated trajectory to full mobility'}
                    </p>
                </div>
                <div className="text-right">
                    <div className="text-3xl font-bold text-brand-primary">{Math.round(currentScore)}%</div>
                    <div className="text-sm font-medium text-slate-400 uppercase tracking-wide">Current Health Score</div>
                </div>
            </div>

            <div className="h-[400px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorSynth" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#c084fc" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey="label"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis hide domain={[0, 100]} axisLine={false} tickLine={false} />
                        <Tooltip
                            content={({ active, payload, label }) => {
                                if (!active || !payload?.length) return null;
                                const entry = payload.find(p => p.value != null);
                                if (!entry) return null;
                                const isReal = entry.dataKey === 'realRi';
                                return (
                                    <div style={{ background: 'white', borderRadius: 12, padding: '8px 14px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                                        <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: 2 }}>{label}</p>
                                        <p style={{ color: isReal ? '#6d28d9' : '#a78bfa', fontWeight: 700 }}>{Math.round(entry.value as number)}%</p>
                                    </div>
                                );
                            }}
                        />
                        {/* Synthetic: muted area */}
                        <Area
                            type="monotone"
                            dataKey="synthRi"
                            stroke="#a78bfa"
                            strokeWidth={2}
                            strokeOpacity={0.6}
                            fillOpacity={1}
                            fill="url(#colorSynth)"
                            isAnimationActive={false}
                            connectNulls
                        />
                        {/* Real sessions: bright dots only (transparent line) */}
                        <Line
                            type="monotone"
                            dataKey="realRi"
                            stroke="transparent"
                            strokeWidth={0}
                            dot={{ r: 6, fill: '#6d28d9', stroke: '#fff', strokeWidth: 2 }}
                            activeDot={{ r: 8, fill: '#6d28d9' }}
                            isAnimationActive={false}
                            connectNulls={false}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default RecoveryOutlookChart;
