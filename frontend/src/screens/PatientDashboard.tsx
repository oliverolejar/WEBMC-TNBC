import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import KneeAngleViz from '../components/KneeAngleViz';
import EMGChart from '../components/EMGChart';

import RecoveryOutlookChart from '../components/RecoveryOutlookChart';

const PatientDashboard = () => {
    const navigate = useNavigate();
    const [currentView, setCurrentView] = useState('live'); // 'live' | 'outlook'

    // Live Data State
    const [kneeAngle, setKneeAngle] = useState(0);
    const [emgData, setEmgData] = useState<{ time: number; value: number }[]>([]);

    // Simulate Live Data
    useEffect(() => {
        const interval = setInterval(() => {
            const time = Date.now();

            // Simulating Knee Flexion/Extension (Sine wave)
            setKneeAngle(45 + 40 * Math.sin(time / 1000));

            // Simulating EMG (Noise + Activity burts aligned with movement)
            const baseActivity = Math.random() * 10;
            const burst = Math.abs(Math.sin(time / 1000)) > 0.8 ? Math.random() * 80 : 0;
            const newValue = baseActivity + burst;

            setEmgData(prev => {
                const newData = [...prev, { time, value: newValue }];
                if (newData.length > 50) return newData.slice(newData.length - 50);
                return newData;
            });

        }, 50); // 20Hz update

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 p-6 flex flex-col">
            {/* Header */}
            <header className="flex items-center justify-between mb-8 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-6">
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

                    {/* Patient Info */}
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
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium border border-emerald-100">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        Device Connected
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium border border-red-100">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                        Recording Data
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 h-full min-h-0">
                {currentView === 'live' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                        {/* Knee Angle Visualization */}
                        <div className="h-full min-h-[400px]">
                            <KneeAngleViz
                                side="Right"
                                label=""
                                angle={kneeAngle}
                                isConnected={true}
                            />
                        </div>

                        {/* EMG Chart */}
                        <div className="h-full min-h-[400px]">
                            <EMGChart
                                label=""
                                data={emgData}
                                isConnected={true}
                                color="#6d28d9"
                                currentValue={emgData.length > 0 ? emgData[emgData.length - 1].value : 0}
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
