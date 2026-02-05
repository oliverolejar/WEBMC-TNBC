import React, { useRef, useEffect } from 'react';

interface KneeAngleCanvasProps {
  kneeAngleDeg: number;
  ypr: { // Inlined YPR definition
    y: number;
    p: number;
    r: number;
  };
}

const KneeAngleCanvas: React.FC<KneeAngleCanvasProps> = ({ kneeAngleDeg, ypr }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    console.log('KneeAngleCanvas useEffect executing with full drawing logic!');
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height); // Clear previous drawings
    
    ctx.fillStyle = '#f5f5f5'; // Background color from original
    ctx.fillRect(0, 0, width, height);

    // Simple line for knee angle (original logic)
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width / 2, height / 2);
    const angleRad = (kneeAngleDeg - 90) * (Math.PI / 180);
    const lineLength = 50;
    const endX = width / 2 + lineLength * Math.cos(angleRad);
    const endY = height / 2 + lineLength * Math.sin(angleRad);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Text labels (original logic)
    ctx.fillStyle = 'black';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`knee angle: ${kneeAngleDeg.toFixed(2)}`, width - 10, 20);
    ctx.fillText(`Y: ${ypr.y.toFixed(2)}`, width - 10, height - 40);
    ctx.fillText(`P: ${ypr.p.toFixed(2)}`, width - 10, height - 25);
    ctx.fillText(`R: ${ypr.r.toFixed(2)}`, width - 10, height - 10);

  }, [kneeAngleDeg, ypr]); // Added dependencies

  return (
    <canvas 
      ref={canvasRef}
      width="200" 
      height="100" 
      style={{ border: '1px solid green', backgroundColor: 'lightgreen' }} // Keep temporary style for now
      className="placeholder-chart" // Add original class
    >
      Your browser does not support the canvas tag.
    </canvas>
  );
};

export default KneeAngleCanvas;
