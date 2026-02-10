import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import HeaderBar from '../components/HeaderBar';
import Panel from '../components/Panel';
import { Button } from '../components/Button';
import Modal from '../components/Modal';
import KneeAngleViz from '../components/KneeAngleViz'; // Changed from KneeAngleCanvas
import LineChart from '../components/LineChart';
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Page from "../components/ui/Page";

const mockChartData = [
  { name: 'Jan', value: 4000 },
  { name: 'Feb', value: 3000 },
  { name: 'Mar', value: 2000 },
  { name: 'Apr', value: 2780 },
  { name: 'May', value: 1890 },
  { name: 'Jun', value: 2390 },
  { name: 'Jul', value: 3490 },
];

const LiveDashboard: React.FC = () => {
  interface InlinedUserData {
    username: string;
    selectedLegUnhealthy: 'left' | 'right';
    selectedLegHealthy: 'left' | 'right';
    filename: string;
  }

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userData, setUserData] = useState<InlinedUserData>({
    username: 'test_user',
    selectedLegUnhealthy: 'left',
    selectedLegHealthy: 'right',
    filename: 'test_run_01.csv'
  });

  // Retain ypr for placeholder display in KneeAngleViz
  const mockYprUnhealthy = { y: 5, p: 45, r: 2 };
  const mockYprHealthy = { y: 0, p: 30, r: 0 };


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: keyof InlinedUserData, value: string) => {
    setUserData(prev => ({ ...prev, [name]: value as InlinedUserData[keyof InlinedUserData] }));
  };

  return (
    <Page title="Live Dashboard">
    <div className="flex flex-col h-screen bg-background">
      <HeaderBar title="Clinical Dashboard" />
      <main className="flex-grow p-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-[1fr_1fr_300px] gap-6 overflow-auto">
        {/* Knee Angle Visualizations */}
        <Panel title="Unhealthy Leg - Knee Angle" className="col-span-1">
          <KneeAngleViz ypr={mockYprUnhealthy} />
        </Panel>
        <Panel title="Healthy Leg - Knee Angle" className="col-span-1">
          <KneeAngleViz ypr={mockYprHealthy} />
        </Panel>

        {/* Muscle Firing Graphs */}
        <Panel title="Unhealthy Leg - Muscle Activity" className="col-span-1 md:col-span-2">
          <LineChart data={mockChartData} dataKey="value" xAxisKey="name" title="Muscle Firing (Unhealthy)" />
          <div className="flex justify-end mt-4">
            <Button>Calibrate</Button>
          </div>
        </Panel>
        <Panel title="Healthy Leg - Muscle Activity" className="col-span-1 md:col-span-2">
          <LineChart data={mockChartData} dataKey="value" xAxisKey="name" title="Muscle Firing (Healthy)" />
          <div className="flex justify-end mt-4">
            <Button>Calibrate</Button>
          </div>
        </Panel>

        {/* Control Panel */}
        <Panel className="col-span-1 row-start-1 md:row-start-auto md:col-start-3 flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <div>
              <Button onClick={() => setIsModalOpen(true)} className="w-full">Start Data Collection</Button>
              <p className="text-sm text-muted-foreground mt-2 text-center">Start a new data collection session.</p>
            </div>
            <div>
              <Link to="/recovery">
                <Button variant="secondary" className="w-full">Go to Recovery Predict</Button>
              </Link>
              <p className="text-sm text-muted-foreground mt-2 text-center">Analyze recovery predictions.</p>
            </div>
          </div>
        </Panel>
      </main>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Start New Collection"
        description="Please provide details for the new data collection session."
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={() => setIsModalOpen(false)}>Start Collection</Button>
          </>
        }
      >
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="username" className="text-right">User Name</label>
            <Input
              id="username"
              name="username"
              value={userData.username}
              onChange={handleInputChange}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="selectedLegUnhealthy" className="text-right">Unhealthy Leg</label>
            <Select
              value={userData.selectedLegUnhealthy}
              onValueChange={(value) => handleSelectChange('selectedLegUnhealthy', value)}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select unhealthy leg" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="right">Right</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="selectedLegHealthy" className="text-right">Healthy Leg</label>
            <Select
              value={userData.selectedLegHealthy}
              onValueChange={(value) => handleSelectChange('selectedLegHealthy', value)}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select healthy leg" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="right">Right</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="filename" className="text-right">File Name</label>
            <Input
              id="filename"
              name="filename"
              value={userData.filename}
              onChange={handleInputChange}
              className="col-span-3"
            />
          </div>
        </div>
      </Modal>
    </div>
    </Page>
  );
};

export default LiveDashboard;