import { LineChart, Line, YAxis, ResponsiveContainer } from 'recharts';

interface EMGChartProps {
    data: { time: number; quad: number; ham: number }[];
    isConnected?: boolean;
    label: string;
    quadCurrentValue?: number;
    hamCurrentValue?: number;
}

const EMGChart = ({
    data,
    isConnected = true,
    label,
    quadCurrentValue = 0,
    hamCurrentValue = 0,
}: EMGChartProps) => {
    if (!isConnected) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <div className="text-center space-y-2">
                    <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center">
                        <span className="text-slate-400 text-xl">⚠️</span>
                    </div>
                    <p className="text-slate-400 font-medium">EMG Sensor Disconnected</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full bg-white rounded-2xl border border-slate-200 p-6 flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-700">
                    {label ? `${label} - ` : ''}Muscle Activity (EMG)
                </h3>
                <div className="flex gap-2">
                    <div className="bg-violet-700 text-white px-3 py-1 rounded-lg font-mono text-sm">
                        Quad {quadCurrentValue.toFixed(1)}%
                    </div>
                    <div className="bg-emerald-600 text-white px-3 py-1 rounded-lg font-mono text-sm">
                        Ham {hamCurrentValue.toFixed(1)}%
                    </div>
                </div>
            </div>

            <div className="mb-3 flex gap-4 text-sm">
                <div className="flex items-center gap-2 text-slate-700">
                    <span className="inline-block w-4 h-1 bg-violet-700 rounded" />
                    Quad
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                    <span className="inline-block w-4 h-1 bg-emerald-600 rounded" />
                    Hamstring
                </div>
            </div>

            <div className="flex-1 w-full min-h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <YAxis domain={[0, 100]} hide />
                        <Line
                            type="monotone"
                            dataKey="quad"
                            stroke="#6d28d9"
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={false}
                        />
                        <Line
                            type="monotone"
                            dataKey="ham"
                            stroke="#059669"
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default EMGChart;