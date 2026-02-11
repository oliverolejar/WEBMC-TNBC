import React from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader';
import Page from '../components/layout/Page';
import Panel from '../components/Panel';
import { Button } from '@/components/ui/button';
import { Search, User } from 'lucide-react';
import { Input } from '@/components/ui/input';

const patients = [
    { id: '1', name: 'John Doe', age: 32, condition: 'ACL Repair', status: 'Active', lastVisit: '2 days ago' },
    { id: '2', name: 'Jane Smith', age: 28, condition: 'Meniscus Tear', status: 'Recovery', lastVisit: '1 week ago' },
    { id: '3', name: 'Robert Johnson', age: 45, condition: 'Total Knee Replacement', status: 'Post-Op', lastVisit: 'Yesterday' },
    { id: '4', name: 'Emily Davis', age: 22, condition: 'Ankle Sprain', status: 'Active', lastVisit: '3 days ago' },
    { id: '5', name: 'Michael Brown', age: 55, condition: 'Hip Replacement', status: 'Pre-Op', lastVisit: '2 weeks ago' },
];

const SelectPatient: React.FC = () => {
    return (
        <Page>
            <PageHeader
                title="Select Patient"
                description="Choose a patient to begin a session or review data."
                actions={
                    <div className="relative w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search patients..." className="pl-8" />
                    </div>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {patients.map((patient) => (
                    <Panel key={patient.id} className="hover:border-primary/40 transition-all cursor-pointer hover:shadow-md group relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-primary/0 group-hover:bg-primary/50 transition-all" />
                        <div className="flex items-start justify-between mb-4">
                            <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
                                <User className="h-5 w-5" />
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${patient.status === 'Active' ? 'bg-emerald-100 text-emerald-800' :
                                    patient.status === 'Post-Op' ? 'bg-blue-100 text-blue-800' :
                                        'bg-orange-100 text-orange-800'
                                }`}>
                                {patient.status}
                            </span>
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg hover:text-primary transition-colors">{patient.name}</h3>
                            <p className="text-sm text-muted-foreground mb-1">{patient.condition}</p>
                            <p className="text-xs text-muted-foreground mt-3">Last Visit: {patient.lastVisit}</p>
                        </div>
                        <div className="mt-4 pt-4 border-t border-border/50 flex gap-2">
                            <Link to="/live-session" className="flex-1">
                                <Button variant="outline" size="sm" className="w-full">Session</Button>
                            </Link>
                            <Link to="/recovery" className="flex-1">
                                <Button variant="ghost" size="sm" className="w-full">History</Button>
                            </Link>
                        </div>
                    </Panel>
                ))}
            </div>
        </Page>
    );
};

export default SelectPatient;
