import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import HeaderBar from '../components/HeaderBar';
import Panel from '../components/Panel';
import LineChart from '../components/LineChart'; // Changed from TimeSeriesChartPlaceholder
import { Input } from "@/components/ui/input"; // shadcn/ui Input
import { Button } from "@/components/ui/button"; // shadcn/ui Button

const mockChartData = [
  { name: 'Jan', value: 4000 },
  { name: 'Feb', value: 3000 },
  { name: 'Mar', value: 2000 },
  { name: 'Apr', value: 2780 },
  { name: 'May', value: 1890 },
  { name: 'Jun', value: 2390 },
  { name: 'Jul', value: 3490 },
];

const RecoveryPredict: React.FC = () => {
    const [predictions, setPredictions] = useState({
        kneeAngle: { date: '2026-08-15', time: '14:30' },
        kneeStrength: { date: '2026-09-01', time: '10:00' },
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const [group, field] = name.split('-');
        setPredictions(prev => ({
            ...prev,
            [group]: {
                ...(prev[group as keyof typeof predictions]),
                [field]: value,
            }
        }));
    };

  return (
    <div className="flex flex-col h-screen bg-background">
      <HeaderBar
        title="Recovery Prediction"
        leftAction={
          <Link to="/">
            <Button variant="ghost" className="text-primary-foreground hover:bg-primary/90">
              &larr; Back to Dashboard
            </Button>
          </Link>
        }
      />
      <main className="flex-grow p-6 grid grid-cols-1 md:grid-cols-[1fr_360px] gap-6 overflow-auto">
        <div className="flex flex-col gap-6">
            <Panel title="Knee Angle Over Time">
                <LineChart data={mockChartData} dataKey="value" xAxisKey="name" title="Average Knee Angle" />
            </Panel>
            <Panel title="Knee Strength Over Time">
                <LineChart data={mockChartData} dataKey="value" xAxisKey="name" title="Average Knee Strength" />
            </Panel>
        </div>
        <Panel title="Predicted Full Recovery Dates">
            <div className="flex flex-col gap-6">
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Knee Angle Recovery</h3>
                    <div>
                        <label htmlFor="kneeAngle-date" className="block text-sm font-medium text-muted-foreground mb-1">Date</label>
                        <Input type="text" name="kneeAngle-date" id="kneeAngle-date" value={predictions.kneeAngle.date} onChange={handleInputChange} />
                    </div>
                    <div>
                        <label htmlFor="kneeAngle-time" className="block text-sm font-medium text-muted-foreground mb-1">Time</label>
                        <Input type="text" name="kneeAngle-time" id="kneeAngle-time" value={predictions.kneeAngle.time} onChange={handleInputChange} />
                    </div>
                </div>
                 <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Knee Strength Recovery</h3>
                    <div>
                        <label htmlFor="kneeStrength-date" className="block text-sm font-medium text-muted-foreground mb-1">Date</label>
                        <Input type="text" name="kneeStrength-date" id="kneeStrength-date" value={predictions.kneeStrength.date} onChange={handleInputChange} />
                    </div>
                    <div>
                        <label htmlFor="kneeStrength-time" className="block text-sm font-medium text-muted-foreground mb-1">Time</label>
                        <Input type="text" name="kneeStrength-time" id="kneeStrength-time" value={predictions.kneeStrength.time} onChange={handleInputChange} />
                    </div>
                </div>
            </div>
        </Panel>
      </main>
    </div>
  );
};

export default RecoveryPredict;
