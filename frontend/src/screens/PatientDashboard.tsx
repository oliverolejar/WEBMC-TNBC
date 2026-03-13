import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import KneeAngleViz from '../components/KneeAngleViz';
import EMGChart from '../components/EMGChart';
import RecoveryOutlookChart from '../components/RecoveryOutlookChart';

const WS_URL = 'ws://localhost:8000/ws/knee-angle';
const API_BASE = 'http://localhost:8000';

type EmgPoint = {
    time: number;
    quadEnvelope: number;
    hamEnvelope: number;
};

const MAX_EMG_POINTS = 120;

const clamp = (value: number, lo: number, hi: number) => Math.max(lo, Math.min(value, hi));

const mapToPercent = (value: number, min: number, max: number) => {
    if (max <= min) return 0;
    return clamp(((value - min) / (max - min)) * 100, 0, 100);
};

const PatientDashboard = () => {
    const navigate = useNavigate();
    const [currentView, setCurrentView] = useState('live');

    const [kneeAngle, setKneeAngle] = useState(0);
    const [deviceConnected, setDeviceConnected] = useState(false);

    const [emgData, setEmgData] = useState<EmgPoint[]>([]);
    const [quadEnvelopeValue, setQuadEnvelopeValue] = useState(0);
    const [hamEnvelopeValue, setHamEnvelopeValue] = useState(0);

    const [quadMin, setQuadMin] = useState(36);
    const [quadMax, setQuadMax] = useState(250);
    const [hamMin, setHamMin] = useState(36);
    const [hamMax, setHamMax] = useState(250);

    const [calibrationActive, setCalibrationActive] = useState(false);
    const [calibrationMessage, setCalibrationMessage] = useState('');
    const [isCalibrating, setIsCalibrating] = useState(false);
    const [isRecording, setIsRecording] = useState(false);

    const quadPercentValue = mapToPercent(quadEnvelopeValue, quadMin, quadMax);
    const hamPercentValue = mapToPercent(hamEnvelopeValue, hamMin, hamMax);

    useEffect(() => {
        const ws = new WebSocket(WS_URL);

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (typeof data.knee_angle_deg === 'number') {
                setKneeAngle(data.knee_angle_deg);
            }

            const quadEnvelope =
                typeof data.emg_quad_envelope === 'number'
                    ? data.emg_quad_envelope
                    : null;

            const hamEnvelope =
                typeof data.emg_ham_envelope === 'number'
                    ? data.emg_ham_envelope
                    : null;

            if (quadEnvelope !== null) {
                setQuadEnvelopeValue(quadEnvelope);
            }

            if (hamEnvelope !== null) {
                setHamEnvelopeValue(hamEnvelope);
            }

            if (quadEnvelope !== null || hamEnvelope !== null) {
                setEmgData((prev) => {
                    const last =
                        prev.length > 0
                            ? prev[prev.length - 1]
                            : { time: Date.now(), quadEnvelope: 0, hamEnvelope: 0 };

                    const next = [
                        ...prev,
                        {
                            time: Date.now(),
                            quadEnvelope: quadEnvelope ?? last.quadEnvelope,
                            hamEnvelope: hamEnvelope ?? last.hamEnvelope,
                        },
                    ];

                    return next.length > MAX_EMG_POINTS
                        ? next.slice(next.length - MAX_EMG_POINTS)
                        : next;
                });
            }

            if (typeof data.device_connected === 'boolean') {
                setDeviceConnected(data.device_connected);
            }

            if (typeof data.calibration_active === 'boolean') {
                setCalibrationActive(data.calibration_active);
            }
        };

        ws.onerror = (err) => {
            console.error('WebSocket error:', err);
        };

        return () => {
            ws.close();
        };
    }, []);

    useEffect(() => {
        let isMounted = true;

        const refreshHealth = async () => {
            try {
                const response = await fetch(`${API_BASE}/health`);
                if (!response.ok) {
                    throw new Error(`Health check failed: ${response.status}`);
                }

                const data: {
                    device_connected?: boolean;
                    calibration_active?: boolean;
                    recording?: boolean;
                } = await response.json();

                if (isMounted) {
                    setDeviceConnected(!!data.device_connected);
                    setCalibrationActive(!!data.calibration_active);
                    setIsRecording(!!data.recording);
                }
            } catch (err) {
                console.error('Health check error:', err);
            }
        };

        refreshHealth();
        const intervalId = setInterval(refreshHealth, 1000);

        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, []);

    const handleCalibrate = async () => {
        setIsCalibrating(true);
        setCalibrationMessage('');

        try {
            const response = await fetch(`${API_BASE}/calibration/zero`, {
                method: 'POST',
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Calibration failed');
            }

            setCalibrationActive(true);
            setCalibrationMessage('Calibration successful. Current pose is now zeroed.');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Calibration failed';
            setCalibrationMessage(message);
        } finally {
            setIsCalibrating(false);
        }
    };

    const handleStartRecording = async () => {
        try {
            const response = await fetch(`${API_BASE}/session/start`, { method: 'POST' });
            if (!response.ok) throw new Error('Failed to start recording');
            setIsRecording(true);
        } catch (err) {
            console.error(err);
        }
    };

    const handleStopRecording = async () => {
        try {
            const response = await fetch(`${API_BASE}/session/stop`, { method: 'POST' });
            if (!response.ok) throw new Error('Failed to stop recording');
            setIsRecording(false);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 flex flex-col">
            <header className="mb-8 bg-white rounded-xl shadow-sm border border-slate-100">
                {/* Top action bar */}
                <div className="flex items-center justify-between px-4 py-3">
                    {/* Left: nav + actions */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/select-patient')}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-900"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </button>

                        <div className="relative">
                            <select
                                value={currentView}
                                onChange={(e) => setCurrentView(e.target.value)}
                                className="appearance-none bg-slate-50 border border-slate-200 text-slate-900 text-lg font-bold rounded-lg py-2 pl-4 pr-10 focus:outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer"
                            >
                                <option value="live">Live Session</option>
                                <option value="outlook">Recovery Outlook</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                </svg>
                            </div>
                        </div>

                        <button
                            onClick={handleCalibrate}
                            disabled={!deviceConnected || isCalibrating}
                            className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors bg-white text-slate-700 border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {isCalibrating ? 'Calibrating...' : 'Calibrate'}
                        </button>

                        {isRecording ? (
                            <button
                                onClick={handleStopRecording}
                                className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors bg-red-600 text-white border-red-600 hover:bg-red-700"
                            >
                                Stop Recording
                            </button>
                        ) : (
                            <button
                                onClick={handleStartRecording}
                                disabled={!deviceConnected}
                                className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors bg-violet-600 text-white border-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Start Recording
                            </button>
                        )}
                    </div>

                    {/* Right: status chips */}
                    <div className="flex items-center gap-2">
                        {deviceConnected ? (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium border border-emerald-100">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                Connected
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-sm font-medium border border-slate-200">
                                <span className="w-2 h-2 rounded-full bg-slate-400" />
                                Disconnected
                            </div>
                        )}

                        {calibrationActive ? (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium border border-blue-100">
                                <span className="w-2 h-2 rounded-full bg-blue-500" />
                                Calibrated
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-sm font-medium border border-slate-200">
                                <span className="w-2 h-2 rounded-full bg-slate-400" />
                                Not Calibrated
                            </div>
                        )}

                        {isRecording ? (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm font-medium border border-red-100">
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                Recording
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-sm font-medium border border-slate-200">
                                <span className="w-2 h-2 rounded-full bg-slate-400" />
                                Not Recording
                            </div>
                        )}
                    </div>
                </div>

                {/* Patient info subrow */}
                <div className="px-4 pb-3 flex items-center justify-center gap-2 text-sm text-slate-500">
                    <span className="font-semibold text-slate-800">Sarah Jenkins</span>
                    <span className="text-slate-300">·</span>
                    <span>ID <span className="font-mono">001</span></span>
                    <span className="text-slate-300">·</span>
                    <span>Injured Leg <span className="font-semibold text-violet-600">Right</span></span>
                </div>
            </header>

            {calibrationMessage && (
                <div className="mb-4 bg-white border border-slate-200 rounded-xl p-4 text-slate-800">
                    {calibrationMessage}
                </div>
            )}

            <div className="mb-4 grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-4 text-slate-800 font-mono">
                    Knee angle: {kneeAngle.toFixed(2)}°
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4 text-slate-800 font-mono">
                    Quad Env: {quadEnvelopeValue.toFixed(1)}
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4 text-slate-800 font-mono">
                    Ham Env: {hamEnvelopeValue.toFixed(1)}
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4 text-slate-800 font-mono">
                    Quad %: {quadPercentValue.toFixed(1)}
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4 text-slate-800 font-mono">
                    Ham %: {hamPercentValue.toFixed(1)}
                </div>
            </div>

            <div className="flex-1 h-full min-h-0">
                {currentView === 'live' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                        <div className="h-full min-h-[400px]">
                            <KneeAngleViz
                                side="Right"
                                label=""
                                angle={kneeAngle}
                                isConnected={deviceConnected}
                            />
                        </div>

                        <div className="h-full min-h-[400px]">
                            <EMGChart
                                data={emgData}
                                isConnected={deviceConnected}
                                quadEnvelopeCurrentValue={quadEnvelopeValue}
                                hamEnvelopeCurrentValue={hamEnvelopeValue}
                                quadPercentCurrentValue={quadPercentValue}
                                hamPercentCurrentValue={hamPercentValue}
                                quadMin={quadMin}
                                quadMax={quadMax}
                                hamMin={hamMin}
                                hamMax={hamMax}
                                onQuadMinChange={setQuadMin}
                                onQuadMaxChange={setQuadMax}
                                onHamMinChange={setHamMin}
                                onHamMaxChange={setHamMax}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="h-[600px] w-full">
                        <RecoveryOutlookChart />
                    </div>
                )}
            </div>
        </div>
    );
};

export default PatientDashboard;