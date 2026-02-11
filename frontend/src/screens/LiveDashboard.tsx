import React, { useState } from 'react';

import Panel from '../components/Panel';
import { Button } from '../components/Button';
import Modal from '../components/Modal';
import KneeAngleViz from '../components/KneeAngleViz';
import LineChart from '../components/LineChart';
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PageHeader from '../components/layout/PageHeader'; // Import PageHeader from layout
import Page from '../components/layout/Page'; // Import Page from layout
import { ClipboardIcon, ClockIcon, Percent } from 'lucide-react'; // New icons for stats
import { Textarea } from '@/components/ui/textarea'; // Assuming shadcn/ui provides textarea

const mockChartData = [
  { name: 'Jan', value: 4000 },
  { name: 'Feb', value: 3000 },
  { name: 'Mar', value: 2000 },
  { name: 'Apr', value: 2780 },
  { name: 'May', value: 1890 },
  { name: 'Jun', value: 2390 },
  { name: 'Jul', value: 3490 },
];

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  trend?: string;
  trendUp?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, trend, trendUp }) => (
  <div className="flex flex-col p-4 rounded-lg bg-background border border-border/50 shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/20">
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
      <Icon className="h-4 w-4 text-primary/70" />
    </div>
    <div>
      <span className="text-2xl font-bold text-foreground tracking-tight">{value}</span>
      {trend && (
        <div className={`text-xs mt-1 font-medium ${trendUp ? 'text-emerald-600' : 'text-rose-600'}`}>
          {trend}
        </div>
      )}
    </div>
  </div>
);

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
  const [clinicalNotes, setClinicalNotes] = useState("");

  // Retain ypr for placeholder display in KneeAngleViz
  const mockYprUnhealthy = { y: 5, p: 45, r: 2 };
  const mockYprHealthy = { y: 0, p: 30, r: 0 };


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setUserData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: keyof InlinedUserData, value: string) => {
    setUserData(prev => ({ ...prev, [name]: value as InlinedUserData[keyof InlinedUserData] }));
  };

  return (
    <Page>
      <PageHeader
        title="Live Dashboard"
        description="Monitor real-time biomechanical data and manage collection sessions."
        actions={
          <Button variant="default" onClick={() => setIsModalOpen(true)}>
            Start New Session
          </Button>
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">

        {/* Session Summary Card */}
        <Panel title="Session Summary" className="lg:col-span-4 xl:col-span-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <StatCard
              icon={ClipboardIcon}
              label="ROM Max (Unhealthy)"
              value="120°"
              trend="+2° vs last"
              trendUp={true}
            />
            <StatCard
              icon={ClipboardIcon}
              label="ROM Min (Unhealthy)"
              value="10°"
            />
            <StatCard
              icon={ClockIcon}
              label="Session Duration"
              value="00:15:30"
            />
            <StatCard
              icon={Percent}
              label="Symmetry Score"
              value="92%"
              trend="-1% vs last"
              trendUp={false}
            />
          </div>
        </Panel>

        {/* Current Knee Angle Section */}
        <div className="lg:col-span-4 xl:col-span-4 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Numeric Readout */}
          <Panel className="md:col-span-1 flex flex-col items-center justify-center min-h-[250px] relative overflow-hidden bg-gradient-to-br from-card to-accent/10 border-primary/20">
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live Data</span>
            </div>
            <div className="text-center z-10">
              <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest mb-1">Right Knee Angle</p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-7xl font-bold tracking-tighter text-foreground">85</span>
                <span className="text-2xl text-muted-foreground font-light">°</span>
              </div>
              <div className="mt-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                Confidence: 98%
              </div>
            </div>
          </Panel>

          {/* Visualizations */}
          <Panel title="Real-time Visualization" className="md:col-span-2">
            <div className="grid grid-cols-2 gap-8 h-full">
              <div className="flex flex-col items-center">
                <span className="mb-2 text-xs font-semibold text-muted-foreground uppercase">Unhealthy (Left)</span>
                <div className="flex-1 w-full min-h-[180px]">
                  <KneeAngleViz ypr={mockYprUnhealthy} />
                </div>
              </div>
              <div className="flex flex-col items-center border-l border-border/50">
                <span className="mb-2 text-xs font-semibold text-muted-foreground uppercase">Healthy (Right)</span>
                <div className="flex-1 w-full min-h-[180px]">
                  <KneeAngleViz ypr={mockYprHealthy} />
                </div>
              </div>
            </div>
          </Panel>
        </div>

        {/* Muscle Firing Graphs */}
        <Panel title="Muscle Activity Comparison" className="lg:col-span-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-[250px]">
              <h4 className="text-sm font-medium text-muted-foreground mb-4 pl-2">Unhealthy Leg</h4>
              <LineChart data={mockChartData} dataKey="value" xAxisKey="name" lineColor="var(--destructive)" />
            </div>
            <div className="h-[250px]">
              <h4 className="text-sm font-medium text-muted-foreground mb-4 pl-2">Healthy Leg</h4>
              <LineChart data={mockChartData} dataKey="value" xAxisKey="name" lineColor="var(--primary)" />
            </div>
          </div>
        </Panel>

        {/* Clinical Notes */}
        <Panel title="Clinical Observation Notes" className="lg:col-span-4">
          <Textarea
            placeholder="Enter clinical observations..."
            value={clinicalNotes}
            onChange={(e) => setClinicalNotes(e.target.value)}
            className="min-h-[150px] bg-secondary/30 resize-none border-border/50 focus:border-primary/50 text-base"
          />
          <div className="mt-4 flex flex-wrap gap-2">
            {['PostOp', 'Session 2', 'Improvement', 'Pain Reported'].map(tag => (
              <span key={tag} className="bg-accent/50 text-accent-foreground px-2.5 py-1 rounded-md text-xs font-medium border border-accent">
                #{tag}
              </span>
            ))}
          </div>
          <div className="flex justify-end mt-4">
            <Button variant="default" className="w-[150px]">Save Record</Button>
          </div>
        </Panel>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Start New Collection"
        description="Please provide details for the new data collection session."
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button variant="default" onClick={() => setIsModalOpen(false)}>Start Collection</Button>
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
    </Page>
  );
};

export default LiveDashboard;