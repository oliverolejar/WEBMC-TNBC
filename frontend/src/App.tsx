import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './screens/Home';
import SelectPatient from './screens/SelectPatient';
import PatientDashboard from './screens/PatientDashboard';
import './App.css';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/select-patient" element={<SelectPatient />} />
                <Route path="/patient-dashboard" element={<PatientDashboard />} />
            </Routes>
        </Router>
    )
}

export default App
