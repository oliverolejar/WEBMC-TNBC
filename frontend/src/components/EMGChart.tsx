import { LineChart, Line, YAxis, ResponsiveContainer } from 'recharts';

interface EMGChartProps {
    data: { time: number; envelope: number; activation: number; percent: number }[];
    isConnected?: boolean;
    label: string;
    envelopeCurrentValue?: number;
    activationCurrentValue?: number;
    percentCurrentValue?: number;
}

const EMGChart = ({
    data,
    isConnected = true,
    label,
    envelopeCurrentValue = 0,
    activationCurrentValue = 0,
    percentCurrentValue = 0,
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
                    {label ? `${label} - ` : ''}EMG Debug
                </h3>
                <div className="flex gap-2 flex-wrap justify-end">
                    <div className="bg-violet-700 text-white px-3 py-1 rounded-lg font-mono text-sm">
                        Env {envelopeCurrentValue.toFixed(1)}
                    </div>
                    <div className="bg-emerald-600 text-white px-3 py-1 rounded-lg font-mono text-sm">
                        Act {activationCurrentValue.toFixed(0)}
                    </div>
                    <div className="bg-sky-600 text-white px-3 py-1 rounded-lg font-mono text-sm">
                        % {percentCurrentValue.toFixed(1)}
                    </div>
                </div>
            </div>

            <div className="mb-3 flex gap-4 text-sm flex-wrap">
                <div className="flex items-center gap-2 text-slate-700">
                    <span className="inline-block w-4 h-1 bg-violet-700 rounded" />
                    Envelope
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                    <span className="inline-block w-4 h-1 bg-emerald-600 rounded" />
                    Activation
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                    <span className="inline-block w-4 h-1 bg-sky-600 rounded" />
                    Percent
                </div>
            </div>

            <div className="flex-1 w-full min-h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <YAxis domain={[0, 'auto']} hide />
                        <Line
                            type="monotone"
                            dataKey="envelope"
                            stroke="#6d28d9"
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={false}
                        />
                        <Line
                            type="monotone"
                            dataKey="activation"
                            stroke="#059669"
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={false}
                        />
                        <Line
                            type="monotone"
                            dataKey="percent"
                            stroke="#0284c7"
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