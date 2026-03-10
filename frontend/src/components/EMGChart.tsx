import { LineChart, Line, YAxis, ResponsiveContainer } from 'recharts';

interface EMGChartProps {
    data: { time: number; value: number }[];
    isConnected?: boolean;
    label: string;
    color?: string;
    currentValue?: number;
}

const EMGChart = ({ data, isConnected = true, label, color = "#4f2683", currentValue = 0 }: EMGChartProps) => {
    if (!isConnected) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <div className="text-center space-y-2">
                    <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center">
                        <span className="text-slate-400 text-xl">⚠️</span>
                    </div>
                    <p className="text-slate-400 font-medium">{label ? `${label} ` : ''}EMG Sensor Disconnected</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full bg-white rounded-2xl border border-slate-200 p-6 flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-700">{label ? `${label} - ` : ''}Muscle Activity (EMG)</h3>
                <div className="bg-brand-deep text-white px-3 py-1 rounded-lg font-mono text-sm">
                    {Math.round(currentValue)}%
                </div>
            </div>

            <div className="flex-1 w-full min-h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <YAxis domain={[-100, 100]} hide />
                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke={color}
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={false} // Disable animation for real-time feel
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default EMGChart;
