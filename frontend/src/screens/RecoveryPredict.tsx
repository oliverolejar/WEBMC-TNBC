import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import HeaderBar from '../components/HeaderBar';
import Panel from '../components/Panel';
import TimeSeriesChartPlaceholder from '../components/TimeSeriesChartPlaceholder';

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
    <div className="flex flex-col h-screen">
      <HeaderBar 
        title="Recovery Predict" 
        leftAction={<Link to="/" className="text-blue-500">&larr; Back</Link>}
      />
      <main className="flex-grow p-6 grid grid-cols-[1fr_360px] gap-6">
        <div className="flex flex-col gap-6">
            <Panel>
                <TimeSeriesChartPlaceholder leftAxisLabel="average knee angle" bottomAxisLabel="time" />
            </Panel>
            <Panel>
                <TimeSeriesChartPlaceholder leftAxisLabel="average knee strength" bottomAxisLabel="time" />
            </Panel>
        </div>
        <Panel title="Predicted full recovery">
            <div className="flex flex-col gap-6">
                <div className="p-4 border rounded-md">
                    <h3 className="font-semibold mb-2">Knee angle</h3>
                    <div className="flex flex-col gap-2">
                        <div>
                            <label htmlFor="kneeAngle-date" className="block text-sm font-medium text-gray-700">date</label>
                            <input type="text" name="kneeAngle-date" id="kneeAngle-date" value={predictions.kneeAngle.date} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                        </div>
                        <div>
                            <label htmlFor="kneeAngle-time" className="block text-sm font-medium text-gray-700">time</label>
                            <input type="text" name="kneeAngle-time" id="kneeAngle-time" value={predictions.kneeAngle.time} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                        </div>
                    </div>
                </div>
                 <div className="p-4 border rounded-md">
                    <h3 className="font-semibold mb-2">Knee strength</h3>
                    <div className="flex flex-col gap-2">
                        <div>
                            <label htmlFor="kneeStrength-date" className="block text-sm font-medium text-gray-700">date</label>
                            <input type="text" name="kneeStrength-date" id="kneeStrength-date" value={predictions.kneeStrength.date} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                        </div>
                        <div>
                            <label htmlFor="kneeStrength-time" className="block text-sm font-medium text-gray-700">time</label>
                            <input type="text" name="kneeStrength-time" id="kneeStrength-time" value={predictions.kneeStrength.time} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                        </div>
                    </div>
                </div>
            </div>
        </Panel>
      </main>
    </div>
  );
};

export default RecoveryPredict;
