import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Activity, LineChart } from 'lucide-react';
import { cn } from '@/utils/utils';
import { Toaster } from '@/components/ui/sonner';

interface AppShellProps {
  children: React.ReactNode;
}

const NavBar: React.FC = () => {
  const location = useLocation();
  const navItems = [
    { name: 'Home', icon: LayoutDashboard, path: '/home' },
    { name: 'Select Patient', icon: Users, path: '/select-patient' },
    { name: 'Live Session', icon: Activity, path: '/' },
    { name: 'Recovery Outlook', icon: LineChart, path: '/recovery' },
  ];

  return (
    <header className="sticky top-0 z-20 h-14 w-full bg-slate-900 text-slate-50 border-b border-slate-800 shadow-md">
      <div className="container mx-auto h-full px-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          {/* Logo Area */}
          <Link to="/" className="flex items-center gap-2 mr-4 hover:opacity-90 transition-opacity">
            <div className="h-7 w-7 rounded bg-teal-500 flex items-center justify-center text-white">
              <Activity className="h-4 w-4" />
            </div>
            <span className="font-bold text-lg tracking-tight text-white">PhysioTrack</span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
                  location.pathname === item.path || (item.path === '/' && location.pathname === '/live-session')
                    ? "bg-slate-800 text-teal-400 shadow-sm"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 pl-4 border-l border-slate-700">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium text-slate-200">Dr. Sarah Wilson</p>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Physiotherapist</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 text-slate-300">
              <span className="text-xs font-semibold">SW</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-background font-sans">
      <NavBar />
      <main className="flex-1 w-full max-w-[1600px] mx-auto">
        {children}
      </main>
      <Toaster />
    </div>
  );
};

export default AppShell;
