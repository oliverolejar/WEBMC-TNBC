import { LineChart, Line, YAxis, XAxis, ResponsiveContainer } from 'recharts';

type EmgPoint = {
    time: number;
    quadEnvelope: number;
    hamEnvelope: number;
};

interface EMGChartProps {
    data: EmgPoint[];
    isConnected?: boolean;

    quadEnvelopeCurrentValue?: number;
    hamEnvelopeCurrentValue?: number;

    quadPercentCurrentValue?: number;
    hamPercentCurrentValue?: number;

    quadMin: number;
    quadMax: number;
    hamMin: number;
    hamMax: number;

    onQuadMinChange: (value: number) => void;
    onQuadMaxChange: (value: number) => void;
    onHamMinChange: (value: number) => void;
    onHamMaxChange: (value: number) => void;
}

const numberFromInput = (value: string, fallback: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const EMGChart = ({
    data,
    isConnected = true,
    quadEnvelopeCurrentValue = 0,
    hamEnvelopeCurrentValue = 0,
    quadPercentCurrentValue = 0,
    hamPercentCurrentValue = 0,
    quadMin,
    quadMax,
    hamMin,
    hamMax,
    onQuadMinChange,
    onQuadMaxChange,
    onHamMinChange,
    onHamMaxChange,
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
            <div className="flex flex-col gap-4 mb-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <h3 className="text-lg font-bold text-slate-700">EMG Envelope</h3>

                    <div className="flex gap-2 flex-wrap justify-end">
                        <div className="bg-blue-600 text-white px-3 py-2 rounded-lg font-mono text-sm min-w-[120px] text-center">
                            Quad {quadPercentCurrentValue.toFixed(1)}%
                        </div>
                        <div className="bg-rose-600 text-white px-3 py-2 rounded-lg font-mono text-sm min-w-[120px] text-center">
                            Ham {hamPercentCurrentValue.toFixed(1)}%
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-slate-200 p-3 bg-slate-50">
                        <div className="text-sm font-semibold text-slate-700 mb-2">Quad % Mapping</div>
                        <div className="grid grid-cols-2 gap-2">
                            <label className="text-sm text-slate-600">
                                Min
                                <input
                                    type="number"
                                    value={quadMin}
                                    onChange={(e) => onQuadMinChange(numberFromInput(e.target.value, quadMin))}
                                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
                                />
                            </label>
                            <label className="text-sm text-slate-600">
                                Max
                                <input
                                    type="number"
                                    value={quadMax}
                                    onChange={(e) => onQuadMaxChange(numberFromInput(e.target.value, quadMax))}
                                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
                                />
                            </label>
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-3 bg-slate-50">
                        <div className="text-sm font-semibold text-slate-700 mb-2">Hamstring % Mapping</div>
                        <div className="grid grid-cols-2 gap-2">
                            <label className="text-sm text-slate-600">
                                Min
                                <input
                                    type="number"
                                    value={hamMin}
                                    onChange={(e) => onHamMinChange(numberFromInput(e.target.value, hamMin))}
                                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
                                />
                            </label>
                            <label className="text-sm text-slate-600">
                                Max
                                <input
                                    type="number"
                                    value={hamMax}
                                    onChange={(e) => onHamMaxChange(numberFromInput(e.target.value, hamMax))}
                                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
                                />
                            </label>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                    <div className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg font-mono text-sm">
                        Quad Env {quadEnvelopeCurrentValue.toFixed(1)}
                    </div>
                    <div className="bg-rose-50 text-rose-700 px-3 py-2 rounded-lg font-mono text-sm">
                        Ham Env {hamEnvelopeCurrentValue.toFixed(1)}
                    </div>
                </div>

                <div className="flex gap-4 text-sm flex-wrap">
                    <div className="flex items-center gap-2 text-slate-700">
                        <span className="inline-block w-4 h-1 bg-blue-600 rounded" />
                        Quad Envelope
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                        <span className="inline-block w-4 h-1 bg-rose-600 rounded" />
                        Hamstring Envelope
                    </div>
                </div>
            </div>

            <div className="flex-1 w-full min-h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <XAxis dataKey="time" hide />
                        <YAxis domain={[0, 'auto']} hide />
                        <Line
                            type="monotone"
                            dataKey="quadEnvelope"
                            stroke="#2563eb"
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={false}
                        />
                        <Line
                            type="monotone"
                            dataKey="hamEnvelope"
                            stroke="#e11d48"
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
