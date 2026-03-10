import { motion } from 'framer-motion';

interface KneeAngleVizProps {
    angle: number;
    isConnected?: boolean;
    side: 'Left' | 'Right';
    label: string;
}

const KneeAngleViz = ({ angle, isConnected = true, side, label }: KneeAngleVizProps) => {
    if (!isConnected) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <div className="text-center space-y-2">
                    <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center">
                        <span className="text-slate-400 text-xl">⚠️</span>
                    </div>
                    <p className="text-slate-400 font-medium">{side} Knee Sleeve Disconnected</p>
                </div>
            </div>
        );
    }

    // Convert angle to rotation for the lower leg (tibia)
    // Assuming 0 degrees is straight leg, 90 is bent
    const rotation = angle;

    return (
        <div className="h-full w-full bg-white rounded-2xl border border-slate-200 p-6 flex flex-col relative overflow-hidden">
            <h3 className="text-lg font-bold text-slate-700 mb-4">{label ? `${label} - ` : ''}Knee Angle</h3>

            <div className="flex-1 flex items-center justify-center relative">
                {/* Leg Visualization */}
                <div className="relative w-64 h-32 flex items-center justify-center">
                    {/* Upper Leg (Femur) - Horizontal Fixed */}
                    <div className="w-32 h-4 bg-slate-800 rounded-full relative z-10" />

                    {/* Knee Joint */}
                    <div className="w-6 h-6 bg-slate-900 rounded-full absolute z-20 shadow-lg shadow-black/20 translate-x-16" />

                    {/* Lower Leg (Tibia) - Animated */}
                    <motion.div
                        className="w-32 h-4 bg-slate-800 rounded-full origin-left absolute left-[50%] translate-x-14"
                        style={{ rotate: 0 }} // Initial state
                        animate={{ rotate: rotation }} // Rotate clockwise (positive) for bending down
                        transition={{ type: "spring", stiffness: 100, damping: 20 }}
                    />

                    {/* Angle Readout Overlay */}
                    <div className="absolute top-0 right-0 bg-brand-deep text-white px-3 py-1 rounded-lg font-mono text-sm">
                        {Math.round(angle)}°
                    </div>
                </div>
            </div>
        </div>
    );
};

export default KneeAngleViz;
