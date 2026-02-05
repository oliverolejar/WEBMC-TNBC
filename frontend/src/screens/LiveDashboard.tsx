import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import HeaderBar from '../components/HeaderBar';
import Panel from '../components/Panel';
import Button from '../components/Button';
import Modal from '../components/Modal'; // Uncommented
import KneeAngleCanvas from '../components/KneeAngleCanvas';
import LineChartPlaceholder from '../components/LineChartPlaceholder';
// Removed: import { UserData } from '../state/types'; // No longer needed

const LiveDashboard: React.FC = () => {
  console.log('LiveDashboard component is rendering! (Full Layout Re-enabled)');

  // Inlined UserData interface
  interface InlinedUserData {
    username: string;
    selectedLegUnhealthy: 'left' | 'right';
    selectedLegHealthy: 'left' | 'right';
    filename: string;
  }

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userData, setUserData] = useState<InlinedUserData>({ // Using inlined type
    username: 'test_user',
    selectedLegUnhealthy: 'left',
    selectedLegHealthy: 'right',
    filename: 'test_run_01.csv'
  });

  // Now KneeAngleCanvas is confirmed working, use mockHealthyData/mockUnhealthyData directly
  const mockHealthyData = { kneeAngleDeg: 30, ypr: { y: 0, p: 30, r: 0 }, muscleSeries: [] };
  const mockUnhealthyData = { kneeAngleDeg: 45, ypr: { y: 5, p: 45, r: 2 }, muscleSeries: [] };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setUserData(prev => ({ ...prev, [name]: value as InlinedUserData[keyof InlinedUserData] })); // Cast needed due to inlined type
  };

  // Debugging Modal visibility
  console.log('isModalOpen:', isModalOpen);


  return (
    <div className="flex flex-col h-screen">
      <HeaderBar title="Name of UI" />
      <main className="flex-grow p-6 grid grid-cols-[1fr_1fr_260px] grid-rows-[auto_1fr] gap-6">
        
        <div className="col-start-1">
          <Panel title="Unhealthy leg">
            <KneeAngleCanvas {...mockUnhealthyData} />
          </Panel>
        </div>

        <div className="col-start-2">
          <Panel title="Healthy leg">
            <KneeAngleCanvas {...mockHealthyData} />
          </Panel>
        </div>

        <div className="col-start-1 row-start-2">
           <Panel title="Muscle firing graph">
            <LineChartPlaceholder />
            <Button>Calibrate</Button>
          </Panel>
        </div>
        
        <div className="col-start-2 row-start-2">
          <Panel title="Muscle firing graph">
            <LineChartPlaceholder />
            <Button>Calibrate</Button>
          </Panel>
        </div>

        <div className="col-start-3 row-start-1 row-span-2">
          <Panel>
            <div className="flex flex-col gap-4">
              <div>
                <Button onClick={() => setIsModalOpen(true)} className="w-full">Start Collect</Button>
                <p className="text-xs text-gray-500 mt-1">Prompts for user name, unhealthy leg, healthy leg to name file.</p>
              </div>
              <div>
                <Link to="/recovery" className="w-full">
                  <Button variant="secondary" className="w-full">Recovery Predict</Button>
                </Link>
                <p className="text-xs text-gray-500 mt-1">Goes to next page.</p>
              </div>
            </div>
          </Panel>
        </div>
      </main>

      {isModalOpen && <div style={{ position: 'fixed', top: '10px', left: '10px', backgroundColor: 'yellow', padding: '5px', zIndex: '1000' }}>Modal State: OPEN</div>}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title="Start Collection"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={() => setIsModalOpen(false)}>Start</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">User name</label>
            <input type="text" name="username" id="username" value={userData.username} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
          </div>
          <div>
            <label htmlFor="selectedLegUnhealthy" className="block text-sm font-medium text-gray-700">Unhealthy leg</label>
            <select name="selectedLegUnhealthy" id="selectedLegUnhealthy" value={userData.selectedLegUnhealthy} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
              <option>left</option>
              <option>right</option>
            </select>
          </div>
          <div>
            <label htmlFor="selectedLegHealthy" className="block text-sm font-medium text-gray-700">Healthy leg</label>
            <select name="selectedLegHealthy" id="selectedLegHealthy" value={userData.selectedLegHealthy} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
              <option>left</option>
              <option>right</option>
            </select>
          </div>
          <div>
            <label htmlFor="filename" className="block text-sm font-medium text-gray-700">File name</label>
            <input type="text" name="filename" id="filename" value={userData.filename} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LiveDashboard;