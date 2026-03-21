import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Pos from './pages/Pos';

// Global App Styles
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/pos" element={<Pos isAdmin={false} />} />
        <Route path="/admin" element={<Pos isAdmin={true} />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App;
