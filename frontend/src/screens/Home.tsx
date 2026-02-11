import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Page from '../components/layout/Page';
import Panel from '../components/Panel';
import { Activity, Users, ArrowRight } from 'lucide-react';

const Home: React.FC = () => {
    return (
        <Page>
            <div className="max-w-4xl mx-auto py-12">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl mb-4">
                        Clinical Physiotherapy <br /> <span className="text-primary">Bio-Mechanics Track</span>
                    </h1>
                    <p className="mt-4 text-lg leading-8 text-muted-foreground max-w-2xl mx-auto">
                        Advanced motion tracking and recovery analysis for physiotherapy professionals.
                    </p>
                    <div className="mt-10 flex items-center justify-center gap-x-6">
                        <Link to="/select-patient">
                            <Button size="lg" className="gap-2">
                                Start Session <ArrowRight className="h-4 w-4" />
                            </Button>
                        </Link>
                        <Link to="/recovery">
                            <Button variant="outline" size="lg">
                                View Recovery Data
                            </Button>
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-16">
                    <Panel className="hover:border-primary/50 transition-colors cursor-pointer group">
                        <div className="flex flex-col items-center text-center p-6">
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                                <Users className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Patient Management</h3>
                            <p className="text-muted-foreground">Select active patients, review history, and manage treatment plans.</p>
                        </div>
                    </Panel>
                    <Panel className="hover:border-primary/50 transition-colors cursor-pointer group">
                        <div className="flex flex-col items-center text-center p-6">
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                                <Activity className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Live Analysis</h3>
                            <p className="text-muted-foreground">Real-time biomechanical tracking with instant feedback and visualizations.</p>
                        </div>
                    </Panel>
                </div>
            </div>
        </Page>
    );
};

export default Home;
