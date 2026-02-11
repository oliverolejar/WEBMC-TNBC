import React, { useRef, useEffect, useState } from 'react';

// Utility function for calculating coordinates of a point rotated around another
const rotatePoint = (px: number, py: number, cx: number, cy: number, angleDeg: number) => {
  const angleRad = angleDeg * Math.PI / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const nx = (cos * (px - cx)) + (sin * (py - cy)) + cx;
  const ny = (cos * (py - cy)) - (sin * (px - cx)) + cy;
  return { x: nx, y: ny };
};

interface KneeAngleVizProps {
  ypr?: { y: number; p: number; r: number; };
}

const KneeAngleViz: React.FC<KneeAngleVizProps> = ({ ypr }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  // Use ypr.p if available, otherwise fallback to animation
  const [currentKneeAngle, setCurrentKneeAngle] = useState(ypr?.p ? 180 - ypr.p : 90);

  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const angleDirectionRef = useRef<1 | -1>(1);

  useEffect(() => {
    if (ypr?.p !== undefined) {
      setCurrentKneeAngle(180 - ypr.p); // Map pitch to a knee bend angle
      return; // If ypr is provided, stop animation logic
    }

    const animate = (time: DOMHighResTimeStamp) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = time;
      }
      const deltaTime = time - lastTimeRef.current;
      lastTimeRef.current = time;

      const animationSpeed = 0.05;
      setCurrentKneeAngle(prevAngle => {
        let newAngle = prevAngle + angleDirectionRef.current * animationSpeed * deltaTime;

        // Ensure angle stays within a reasonable range (e.g., 90 to 180 for illustrative bend)
        if (newAngle >= 180) {
          newAngle = 180;
          angleDirectionRef.current = -1;
        } else if (newAngle <= 90) {
          newAngle = 90;
          angleDirectionRef.current = 1;
        }
        return newAngle;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [ypr?.p, setCurrentKneeAngle]); // Re-run effect if ypr.p changes

  const viewBoxWidth = 320;
  const viewBoxHeight = 220;
  const hip = { x: 80, y: 60 };
  const femurLength = 80;
  const tibiaLength = 80;
  const jointRadius = 6;

  // Calculate knee position based on hip and femur
  const femurAngle = 30; // degrees from vertical
  const knee = rotatePoint(hip.x, hip.y + femurLength, hip.x, hip.y, -femurAngle);

  // Calculate ankle position based on knee and tibia
  // currentKneeAngle is assumed to be the internal angle of the knee joint (e.g., 180 for straight, 90 for bent)
  const tibiaBaseAngle = femurAngle; // angle of femur from vertical
  const tibiaRotation = 180 - currentKneeAngle; // relative rotation of tibia to femur

  const ankle = rotatePoint(knee.x, knee.y + tibiaLength, knee.x, knee.y, tibiaBaseAngle + tibiaRotation);

  // Clamp ankle position to ensure it stays within bounds
  const clampedAnkleX = Math.max(jointRadius, Math.min(viewBoxWidth - jointRadius, ankle.x));
  const clampedAnkleY = Math.max(jointRadius, Math.min(viewBoxHeight - jointRadius, ankle.y));

  const points = `${hip.x},${hip.y} ${knee.x},${knee.y} ${clampedAnkleX},${clampedAnkleY}`;

  return (
    <div className="w-full h-full flex items-center justify-center p-2 bg-transparent"> {/* Changed to bg-transparent */}
      <svg ref={svgRef} viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`} className="w-full h-full max-w-full max-h-full">
        {/* Leg Segments */}
        <polyline points={points}
                  stroke="hsl(var(--foreground))" strokeWidth="4" fill="none" // Use foreground color
                  strokeLinecap="round" strokeLinejoin="round"/>

        {/* Joints */}
        <circle cx={hip.x} cy={hip.y} r={jointRadius} fill="hsl(var(--primary))"/> {/* Use primary color */}
        <circle cx={knee.x} cy={knee.y} r={jointRadius} fill="hsl(var(--primary))"/> {/* Use primary color */}
        <circle cx={clampedAnkleX} cy={clampedAnkleY} r={jointRadius} fill="hsl(var(--primary))"/> {/* Use primary color */}

        {/* Text Labels (Moved to parent LiveDashboard for "large current angle readout") */}
        {/* <text x={viewBoxWidth - 10} y="20" textAnchor="end" fontSize="14" fill="hsl(var(--foreground))">
          Knee Angle: {currentKneeAngle.toFixed(0)}°
        </text> */}
      </svg>
    </div>
  );
};

export default KneeAngleViz;