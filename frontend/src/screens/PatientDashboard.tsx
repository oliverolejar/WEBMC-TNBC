import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import KneeAngleViz from '../components/KneeAngleViz';
import EMGChart from '../components/EMGChart';

import RecoveryOutlookChart from '../components/RecoveryOutlookChart';

type EmgPoint = { time: number; quadEnvelope: number; hamEnvelope: number; };

const MAX_EMG_POINTS = 100;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));
const mapToPercent = (v: number, min: number, max: number) =>
    max <= min ? 0 : clamp(((v - min) / (max - min)) * 100, 0, 100);

const PatientDashboard = () => {
    const navigate = useNavigate();
    const [currentView, setCurrentView] = useState('live'); // 'live' | 'outlook'

    // Live Data State
    const [kneeAngle, setKneeAngle] = useState(0);
    const [leftKneeAngle, setLeftKneeAngle] = useState(0);
    const [deviceConnected, setDeviceConnected] = useState(false);
    const [rightConnected, setRightConnected] = useState(false);
    const [leftConnected, setLeftConnected] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isCalibrating, setIsCalibrating] = useState(false);
    const [hasCalibrated, setHasCalibrated] = useState(false);

    const [rightEmgData, setRightEmgData] = useState<EmgPoint[]>([]);
    const [leftEmgData,  setLeftEmgData]  = useState<EmgPoint[]>([]);
    const [rightQuadEnv, setRightQuadEnv] = useState(0);
    const [rightHamEnv,  setRightHamEnv]  = useState(0);
    const [leftQuadEnv,  setLeftQuadEnv]  = useState(0);
    const [leftHamEnv,   setLeftHamEnv]   = useState(0);
    const [quadMin, setQuadMin] = useState(0);
    const [quadMax, setQuadMax] = useState(100);
    const [hamMin,  setHamMin]  = useState(0);
    const [hamMax,  setHamMax]  = useState(100);

    useEffect(() => {
        const ws = new WebSocket(`ws://${window.location.hostname}:8000/ws/knee-angle`);

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (typeof data.right_knee_angle_deg === "number") {
                setKneeAngle(data.right_knee_angle_deg);
            }
            if (typeof data.left_knee_angle_deg === "number") {
                setLeftKneeAngle(data.left_knee_angle_deg);
            }

            const rq = typeof data.right_emg_quad_pct === "number" ? data.right_emg_quad_pct : null;
            const rh = typeof data.right_emg_ham_pct  === "number" ? data.right_emg_ham_pct  : null;
            const lq = typeof data.left_emg_quad_pct  === "number" ? data.left_emg_quad_pct  : null;
            const lh = typeof data.left_emg_ham_pct   === "number" ? data.left_emg_ham_pct   : null;

            if (rq !== null) setRightQuadEnv(rq);
            if (rh !== null) setRightHamEnv(rh);
            if (lq !== null) setLeftQuadEnv(lq);
            if (lh !== null) setLeftHamEnv(lh);

            const t = Date.now();
            if (rq !== null || rh !== null) {
                setRightEmgData(prev => {
                    const last = prev.length > 0 ? prev[prev.length - 1] : { time: t, quadEnvelope: 0, hamEnvelope: 0 };
                    const next = [...prev, { time: t, quadEnvelope: rq ?? last.quadEnvelope, hamEnvelope: rh ?? last.hamEnvelope }];
                    return next.length > MAX_EMG_POINTS ? next.slice(next.length - MAX_EMG_POINTS) : next;
                });
            }
            if (lq !== null || lh !== null) {
                setLeftEmgData(prev => {
                    const last = prev.length > 0 ? prev[prev.length - 1] : { time: t, quadEnvelope: 0, hamEnvelope: 0 };
                    const next = [...prev, { time: t, quadEnvelope: lq ?? last.quadEnvelope, hamEnvelope: lh ?? last.hamEnvelope }];
                    return next.length > MAX_EMG_POINTS ? next.slice(next.length - MAX_EMG_POINTS) : next;
                });
            }

            setRightConnected(!!data.right_available);
            setLeftConnected(!!data.left_available);
            if (typeof data.recording === "boolean") {
                setIsRecording(data.recording);
            }

            // Prefer stream payload status when available.
            if (typeof data.device_connected === "boolean") {
                setDeviceConnected(data.device_connected);
                if (!data.device_connected) setHasCalibrated(false);
            } else {
                setDeviceConnected(true);
            }
        };

        ws.onerror = (err) => {
            console.error("WebSocket error:", err);
        };

        return () => {
            ws.close();
        };
    }, []);

    const calibrate = async () => {
        setIsCalibrating(true);
        try {
            await fetch(`http://${window.location.hostname}:8000/calibration/start`, { method: 'POST' });
        } catch (err) {
            console.error('Calibration request failed:', err);
        } finally {
            setTimeout(() => {
                setIsCalibrating(false);
                setHasCalibrated(true);
            }, 500);
        }
    };

    const toggleRecording = async () => {
        const apiBase = `http://${window.location.hostname}:8000`;
        const endpoint = isRecording ? '/session/stop' : '/session/start';
        try {
            await fetch(`${apiBase}${endpoint}`, { method: 'POST' });
            setIsRecording(prev => !prev);
        } catch (err) {
            console.error('Failed to toggle recording:', err);
        }
    };

    useEffect(() => {
        let isMounted = true;
        const apiBase = `http://${window.location.hostname}:8000`;

        const refreshHealth = async () => {
            try {
                const response = await fetch(`${apiBase}/health`);
                if (!response.ok) {
                    throw new Error(`Health check failed: ${response.status}`);
                }
                const data: { device_connected?: boolean; right_available?: boolean; left_available?: boolean } = await response.json();
                if (isMounted) {
                    setDeviceConnected(!!data.device_connected);
                    setRightConnected(!!data.right_available);
                    setLeftConnected(!!data.left_available);
                }
            } catch {
                // Keep the last known connection state; websocket samples are authoritative.
            }
        };

        refreshHealth();
        const intervalId = setInterval(refreshHealth, 1000);

        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, []);

    const rightQuadPct = mapToPercent(rightQuadEnv, quadMin, quadMax);
    const rightHamPct  = mapToPercent(rightHamEnv,  hamMin,  hamMax);
    const leftQuadPct  = mapToPercent(leftQuadEnv,  quadMin, quadMax);
    const leftHamPct   = mapToPercent(leftHamEnv,   hamMin,  hamMax);

    return (
        <div className="min-h-screen bg-slate-50 p-6 flex flex-col">
            {/* Header */}
            <header className="flex flex-col mb-4 bg-white px-6 pt-4 pb-3 rounded-xl shadow-sm border border-slate-100 gap-2">
                {/* Row 1: Nav + Actions (left) | Status Pills (right) */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                        <button
                            onClick={() => navigate('/select-patient')}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-900"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </button>

                        {/* View Selector Dropdown */}
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
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                            </div>
                        </div>

                        <div className="w-px h-8 bg-slate-200 mx-1" />

                        {/* Calibrate Button */}
                        <button
                            onClick={calibrate}
                            disabled={isCalibrating || !deviceConnected}
                            className={
                                isCalibrating || !deviceConnected
                                    ? "px-4 py-2 bg-slate-100 text-slate-400 rounded-lg text-sm font-medium cursor-not-allowed"
                                    : "px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-900 transition-colors"
                            }
                        >
                            {isCalibrating ? 'Calibrating...' : 'Calibrate'}
                        </button>

                        {/* Recording Button */}
                        <button
                            onClick={toggleRecording}
                            className={isRecording
                                ? "px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                                : "px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors"
                            }
                        >
                            {isRecording ? 'Stop Recording' : 'Start Recording'}
                        </button>
                    </div>

                    {/* Status Pills */}
                    <div className="flex items-center gap-2 flex-1 justify-end">
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
                        <div className={
                            isCalibrating
                                ? "flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium border border-amber-100"
                                : (hasCalibrated && deviceConnected)
                                    ? "flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium border border-emerald-100"
                                    : "flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-sm font-medium border border-slate-200"
                        }>
                            <span className={`w-2 h-2 rounded-full ${isCalibrating ? 'bg-amber-500 animate-pulse' : (hasCalibrated && deviceConnected) ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            {isCalibrating ? 'Calibrating' : (hasCalibrated && deviceConnected) ? 'Calibrated' : 'Not Calibrated'}
                        </div>
                        <div className={isRecording
                            ? "flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm font-medium border border-red-100"
                            : "flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-sm font-medium border border-slate-200"
                        }>
                            <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-slate-400'}`} />
                            {isRecording ? 'Recording' : 'Not Recording'}
                        </div>
                    </div>
                </div>

                {/* Row 2: Patient Info */}
                <div className="flex items-center justify-center gap-2 text-sm border-t border-slate-100 pt-2">
                    <span className="font-semibold text-slate-800">Sarah Jenkins</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-slate-400">ID</span>
                    <span className="font-mono text-slate-600">001</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-slate-400">Injured Leg</span>
                    <span className="font-medium text-brand-primary">Right</span>
                </div>
            </header>

            {/* Metrics Bar */}
            <div className="grid grid-cols-5 gap-4 mb-4">
                {[
                    { label: 'Knee angle', value: `${kneeAngle.toFixed(2)}°` },
                    { label: 'Quad Env',   value: rightQuadEnv.toFixed(1) },
                    { label: 'Ham Env',    value: rightHamEnv.toFixed(1) },
                    { label: 'Quad %',     value: rightQuadPct.toFixed(1) },
                    { label: 'Ham %',      value: rightHamPct.toFixed(1) },
                ].map(({ label, value }) => (
                    <div key={label} className="bg-white border border-slate-200 rounded-xl p-4 font-mono text-slate-800">
                        {label}: {value}
                    </div>
                ))}
            </div>

            {/* Main Content */}
            <div className="flex-1 h-full min-h-0">
                {currentView === 'live' ? (
                    <div className="flex flex-col gap-6">
                        {/* Right Leg Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[400px]">
                            <KneeAngleViz
                                side="Right"
                                label="Right"
                                angle={kneeAngle}
                                isConnected={rightConnected}
                            />
                            <EMGChart
                                data={rightEmgData}
                                isConnected={rightConnected}
                                quadEnvelopeCurrentValue={rightQuadEnv}
                                hamEnvelopeCurrentValue={rightHamEnv}
                                quadPercentCurrentValue={rightQuadPct}
                                hamPercentCurrentValue={rightHamPct}
                                quadMin={quadMin} quadMax={quadMax}
                                hamMin={hamMin}   hamMax={hamMax}
                                onQuadMinChange={setQuadMin} onQuadMaxChange={setQuadMax}
                                onHamMinChange={setHamMin}   onHamMaxChange={setHamMax}
                            />
                        </div>

                        {/* Left Leg Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[400px]">
                            <KneeAngleViz
                                side="Left"
                                label="Left"
                                angle={leftKneeAngle}
                                isConnected={leftConnected}
                            />
                            <EMGChart
                                data={leftEmgData}
                                isConnected={leftConnected}
                                quadEnvelopeCurrentValue={leftQuadEnv}
                                hamEnvelopeCurrentValue={leftHamEnv}
                                quadPercentCurrentValue={leftQuadPct}
                                hamPercentCurrentValue={leftHamPct}
                                quadMin={quadMin} quadMax={quadMax}
                                hamMin={hamMin}   hamMax={hamMax}
                                onQuadMinChange={setQuadMin} onQuadMaxChange={setQuadMax}
                                onHamMinChange={setHamMin}   onHamMaxChange={setHamMax}
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
