import { ArrowRight, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/WEBMC_logo.jpg';

const Home = () => {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col lg:flex-row min-h-screen w-full">

            {/* Left Component (White Background - 60%) */}
            <div className="w-full lg:w-[60%] bg-white flex flex-col justify-center p-12 lg:p-24 relative overflow-hidden">
                {/* Subtle Background Detail */}
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] opacity-20 pointer-events-none" />

                <div className="relative z-10 space-y-8 animate-fade-in-up text-left">
                    <div className="h-56 w-auto mb-16">
                        <img src={logo} alt="WEBMC Logo" className="h-full w-auto object-contain drop-shadow-2xl" />
                    </div>

                    <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-slate-900 leading-[1.1]">
                        Western Engineering <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-brand-light">
                            Biomedical Club
                        </span>
                    </h1>

                    <h2 className="text-xl lg:text-2xl font-medium tracking-wide text-slate-500 uppercase">
                        True North Biomedical Competition
                    </h2>
                </div>
            </div>

            {/* Right Component (Deep Indigo Background - 40%) */}
            <div className="w-full lg:w-[40%] bg-brand-deep text-white flex flex-col justify-center p-12 lg:p-24 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-deep via-brand-deep to-indigo-950" />
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-primary/20 rounded-full blur-[100px] pointer-events-none" />

                <div className="relative z-10 space-y-12 animate-fade-in-up [animation-delay:200ms] text-center">
                    <div className="space-y-4">
                        <p className="text-brand-light font-mono text-sm tracking-widest uppercase mb-2">Featured Project</p>
                        <div className="block relative">
                            <h3 className="text-3xl lg:text-4xl font-bold leading-tight">
                                MustangMotion:<br/>Smart ACL Rehab Sleeve
                            </h3>
                            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-24 h-1.5 bg-gradient-to-r from-brand-primary via-brand-light to-brand-primary rounded-full shadow-[0_0_10px_rgba(124,58,237,0.5)]" />
                        </div>
                        <p className="text-indigo-100/70 text-lg leading-relaxed pt-6 max-w-md mx-auto">
                            Biomechanical real-time and feedback for post-injury recovery optimization.
                        </p>
                    </div>

                    <button
                        onClick={() => navigate('/select-patient')}
                        className="group relative inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-brand-primary to-brand-light text-white rounded-full font-bold text-lg hover:brightness-110 transition-all duration-300 hover:scale-[1.02] shadow-xl shadow-brand-primary/20 active:scale-[0.98] w-fit mx-auto cursor-pointer"
                    >
                        <span>Select Patient</span>
                        <div className="relative w-5 h-5">
                            <ArrowRight className="w-5 h-5 absolute inset-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-0" />
                            <ChevronRight className="w-5 h-5 absolute inset-0 opacity-0 -translate-x-2 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
                        </div>
                    </button>
                </div>
            </div>

        </div>
    )
}

export default Home;
