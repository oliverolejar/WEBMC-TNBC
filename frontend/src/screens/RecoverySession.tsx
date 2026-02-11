import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Panel from '../components/Panel';
import LineChart from '../components/LineChart';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import PageHeader from '../components/layout/PageHeader'; // Import PageHeader from layout
import Page from '../components/layout/Page'; // Import Page from layout
import { ChevronLeft } from 'lucide-react'; // Import icon for back button

const mockChartData = [
  { name: 'Jan', value: 4000 },
  { name: 'Feb', value: 3000 },
  { name: 'Mar', value: 2000 },
  { name: 'Apr', value: 2780 },
  { name: 'May', value: 1890 },
  { name: 'Jun', value: 2390 },
  { name: 'Jul', value: 3490 },
];

const RecoverySession: React.FC = () => {
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
    <Page>
      <PageHeader
        title="Recovery Session"
        description="View predicted recovery dates for various metrics."
        actions={
          <Link to="/">
            <Button variant="outline">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-6">
        <div className="flex flex-col gap-6">
          <Panel title="Knee Angle Over Time">
            <LineChart data={mockChartData} dataKey="value" xAxisKey="name" />
          </Panel>
          <Panel title="Knee Strength Over Time">
            <LineChart data={mockChartData} dataKey="value" xAxisKey="name" />
          </Panel>
        </div>
        <Panel title="Predicted Full Recovery Dates">
          <div className="flex flex-col gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Knee Angle Recovery</h3>
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
              <h3 className="text-lg font-semibold">Knee Strength Recovery</h3>
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
      </div>
    </Page>
  );
};

export default RecoverySession;
