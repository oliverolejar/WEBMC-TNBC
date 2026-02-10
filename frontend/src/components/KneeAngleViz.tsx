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
  const [currentKneeAngle, setCurrentKneeAngle] = useState(90);

  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const angleDirectionRef = useRef<1 | -1>(1);

  useEffect(() => {
    const animate = (time: DOMHighResTimeStamp) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = time;
      }
      const deltaTime = time - lastTimeRef.current;
      lastTimeRef.current = time;

      const animationSpeed = 0.05;
      setCurrentKneeAngle(prevAngle => {
        let newAngle = prevAngle + angleDirectionRef.current * animationSpeed * deltaTime;

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
  }, [setCurrentKneeAngle]);


  const viewBoxWidth = 320;
  const viewBoxHeight = 220;
  const hip = { x: 80, y: 60 };
  const femurLength = 80;
  const tibiaLength = 80;
  const jointRadius = 6;

  const knee = {
    x: hip.x + femurLength * Math.sin(Math.PI / 6),
    y: hip.y + femurLength * Math.cos(Math.PI / 6),
  };

  const femurAngleFromXAxis = Math.PI / 2 - Math.PI / 6;

  const tibiaRelativeAngle = (180 - currentKneeAngle) * Math.PI / 180;

  const ankleX = knee.x + tibiaLength * Math.cos(femurAngleFromXAxis + tibiaRelativeAngle);
  const ankleY = knee.y + tibiaLength * Math.sin(femurAngleFromXAxis + tibiaRelativeAngle);

  const clampedAnkleX = Math.max(jointRadius, Math.min(viewBoxWidth - jointRadius, ankleX));
  const clampedAnkleY = Math.max(jointRadius, Math.min(viewBoxHeight - jointRadius, ankleY));

  const points = `${hip.x},${hip.y} ${knee.x},${knee.y} ${clampedAnkleX},${clampedAnkleY}`;

  return (
    <div className="w-full h-full flex items-center justify-center p-2">
      <svg ref={svgRef} viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`} className="w-full h-full max-w-full max-h-full">
        {/* Background */}
        <rect x="0" y="0" width={viewBoxWidth} height={viewBoxHeight}
              fill="lightgray" stroke="darkgray" strokeWidth="1"/>

        {/* Leg Segments */}
        <polyline points={points}
                  stroke="black" strokeWidth="4" fill="none"
                  strokeLinecap="round" strokeLinejoin="round"/>

        {/* Joints */}
        <circle cx={hip.x} cy={hip.y} r={jointRadius} fill="red"/>
        <circle cx={knee.x} cy={knee.y} r={jointRadius} fill="red"/>
        <circle cx={clampedAnkleX} cy={clampedAnkleY} r={jointRadius} fill="red"/>

        {/* Text Labels */}
        <text x={viewBoxWidth - 10} y="20" textAnchor="end" fontSize="14" fill="blue">
          Knee Angle: {currentKneeAngle.toFixed(0)}°
        </text>
        <text x={viewBoxWidth - 10} y={viewBoxHeight - 60} textAnchor="end" fontSize="12" fill="blue">
          Y: {ypr?.y?.toFixed(1) || '0.0'}
        </text>
        <text x={viewBoxWidth - 10} y={viewBoxHeight - 40} textAnchor="end" fontSize="12" fill="blue">
          P: {ypr?.p?.toFixed(1) || '0.0'}
        </text>
        <text x={viewBoxWidth - 10} y={viewBoxHeight - 20} textAnchor="end" fontSize="12" fill="blue">
          R: {ypr?.r?.toFixed(1) || '0.0'}
        </text>
      </svg>
    </div>
  );
};

export default KneeAngleViz;