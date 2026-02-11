import { ArrowLeft, UserPlus, Calendar, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SelectPatient = () => {
    const navigate = useNavigate();

    // Dummy Data
    const patients = [
        { id: 1, name: "Sarah Jenkins", lastAssessed: "Oct 24, 2025" },
        { id: 2, name: "Michael Ross", lastAssessed: "Nov 02, 2025" },
        { id: 3, name: "David Chen", lastAssessed: "Nov 15, 2025" },
        { id: 4, name: "Emily Watson", lastAssessed: "Nov 18, 2025" },
        { id: 5, name: "James Alcott", lastAssessed: "Nov 20, 2025" },
    ];

    return (
        <div className="flex flex-col lg:flex-row min-h-screen w-full">

            {/* Left Panel (Controls - Deep Indigo) - 1/3 */}
            <div className="w-full lg:w-[33.33%] bg-brand-deep text-white flex flex-col p-12 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-deep to-[#0f172a]" />

                {/* Content */}
                <div className="relative z-10 flex flex-col h-full justify-between">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight mb-2">Patient Selection</h2>
                        <p className="text-indigo-200/50">Manage patient records and start new sessions.</p>
                    </div>

                    <div className="space-y-4 mt-12 mb-auto">
                        {/* Home Button */}
                        <button
                            onClick={() => navigate('/')}
                            className="group flex items-center justify-center gap-3 w-full py-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all duration-200 backdrop-blur-sm text-slate-300 hover:text-white"
                        >
                            <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
                            <span className="font-medium">Return Home</span>
                        </button>

                        {/* New Patient Button (Inactive) */}
                        <button
                            className="group flex items-center justify-center gap-3 w-full py-4 bg-gradient-to-r from-brand-primary to-brand-light text-white rounded-xl shadow-lg shadow-brand-primary/10 transition-all duration-200 opacity-50 cursor-not-allowed font-bold"
                            disabled
                        >
                            <UserPlus className="h-5 w-5" />
                            <span className="font-medium">New Patient</span>
                        </button>
                    </div>

                    <div className="text-xs text-indigo-300/30 uppercase tracking-widest">
                        PhysioTrack System v1.0
                    </div>
                </div>
            </div>

            {/* Right Panel (List - White) - 2/3 */}
            <div className="w-full lg:w-[66.67%] bg-white flex flex-col relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-white to-transparent z-10 pointer-events-none" />

                <div className="flex-1 overflow-y-auto p-12">
                    <div className="max-w-2xl mx-auto pt-8 space-y-6">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-2xl font-bold text-slate-900">Recent Patients</h3>
                            <span className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{patients.length} Records</span>
                        </div>

                        <div className="grid gap-4">
                            {patients.map((patient) => (
                                <div
                                    key={patient.id}
                                    onClick={() => navigate('/patient-dashboard')}
                                    className="group flex items-center justify-between p-6 bg-white border border-slate-200 rounded-2xl hover:border-brand-primary/20 hover:shadow-xl hover:shadow-brand-primary/5 transition-all duration-300 cursor-pointer"
                                >
                                    <div className="flex items-center gap-6">
                                        <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-brand-primary/10 group-hover:text-brand-primary transition-colors">
                                            <span className="font-bold text-lg">{patient.name.charAt(0)}</span>
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-bold text-slate-900 group-hover:text-brand-primary transition-colors">{patient.name}</h4>
                                            <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                                                <Calendar className="h-3.5 w-3.5" />
                                                <span>Last assessed: <span className="font-medium text-slate-700">{patient.lastAssessed}</span></span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="h-8 w-8 rounded-full border border-slate-100 flex items-center justify-center text-slate-300 group-hover:border-brand-primary/20 group-hover:bg-brand-primary/5 group-hover:text-brand-primary transition-all opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0">
                                        <ChevronRight className="h-4 w-4" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default SelectPatient;
