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
    quad: number;
    ham: number;
};

const MAX_EMG_POINTS = 80;

const PatientDashboard = () => {
    const navigate = useNavigate();
    const [currentView, setCurrentView] = useState('live');

    const [kneeAngle, setKneeAngle] = useState(0);
    const [deviceConnected, setDeviceConnected] = useState(false);
    const [emgData, setEmgData] = useState<EmgPoint[]>([]);
    const [emgQuadPercent, setEmgQuadPercent] = useState(0);
    const [emgHamPercent, setEmgHamPercent] = useState(0);

    const [calibrationActive, setCalibrationActive] = useState(false);
    const [calibrationMessage, setCalibrationMessage] = useState('');
    const [isCalibrating, setIsCalibrating] = useState(false);

    useEffect(() => {
        const ws = new WebSocket(WS_URL);

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (typeof data.knee_angle_deg === 'number') {
                setKneeAngle(data.knee_angle_deg);
            }

            const quad = typeof data.emg_quad_percent === 'number'
                ? Math.max(0, Math.min(100, data.emg_quad_percent))
                : null;

            const ham = typeof data.emg_ham_percent === 'number'
                ? Math.max(0, Math.min(100, data.emg_ham_percent))
                : null;

            if (quad !== null) {
                setEmgQuadPercent(quad);
            }

            if (ham !== null) {
                setEmgHamPercent(ham);
            }

            if (quad !== null || ham !== null) {
                setEmgData((prev) => {
                    const next = [
                        ...prev,
                        {
                            time: Date.now(),
                            quad: quad ?? emgQuadPercent,
                            ham: ham ?? emgHamPercent,
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
    }, [emgQuadPercent, emgHamPercent]);

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
                } = await response.json();

                if (isMounted) {
                    setDeviceConnected(!!data.device_connected);
                    setCalibrationActive(!!data.calibration_active);
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
            setCalibrationMessage('Calibration successful. Current roll pose is now zeroed.');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Calibration failed';
            setCalibrationMessage(message);
        } finally {
            setIsCalibrating(false);
        }
    };

    const handleResetCalibration = async () => {
        setCalibrationMessage('');

        try {
            const response = await fetch(`${API_BASE}/calibration/reset`, {
                method: 'POST',
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Reset failed');
            }

            setCalibrationActive(false);
            setCalibrationMessage('Calibration reset.');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Reset failed';
            setCalibrationMessage(message);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 flex flex-col">
            <header className="flex items-center justify-between mb-8 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-6">
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

                    <div className="flex items-center gap-4 text-sm border-l border-slate-200 pl-6">
                        <div className="flex flex-col">
                            <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Patient</span>
                            <span className="font-medium text-slate-900">Sarah Jenkins</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">ID</span>
                            <span className="font-mono text-slate-500">001</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Injured Leg</span>
                            <span className="font-medium text-brand-primary">Right</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {deviceConnected ? (
                        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium border border-emerald-100">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            Device Connected
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium border border-slate-200">
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                            Device Disconnected
                        </div>
                    )}

                    {calibrationActive ? (
                        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium border border-blue-100">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                            Calibration Active
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium border border-amber-100">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                            Not Calibrated
                        </div>
                    )}

                    <button
                        onClick={handleCalibrate}
                        disabled={!deviceConnected || isCalibrating}
                        className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors bg-violet-600 text-white border-violet-600 hover:bg-violet-700 disabled:bg-slate-300 disabled:border-slate-300 disabled:cursor-not-allowed"
                    >
                        {isCalibrating ? 'Calibrating...' : 'Calibrate Knee Angle'}
                    </button>

                    <button
                        onClick={handleResetCalibration}
                        className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                    >
                        Reset Calibration
                    </button>
                </div>
            </header>

            {calibrationMessage && (
                <div className="mb-4 bg-white border border-slate-200 rounded-xl p-4 text-slate-800">
                    {calibrationMessage}
                </div>
            )}

            <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-4 text-slate-800 font-mono">
                    Live knee angle (roll-based): {kneeAngle.toFixed(2)}°
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4 text-slate-800 font-mono">
                    Quad EMG: {emgQuadPercent.toFixed(1)}%
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4 text-slate-800 font-mono">
                    Hamstring EMG: {emgHamPercent.toFixed(1)}%
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
                                label=""
                                data={emgData}
                                isConnected={deviceConnected}
                                quadCurrentValue={emgQuadPercent}
                                hamCurrentValue={emgHamPercent}
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