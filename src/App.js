
import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/login.jsx';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </div>
      {/* Ruta para páginas no encontradas */}
        <Route path='*' element={<Navigate to="/" replace />} />
        
    </Router>
    
  );
}

export default App;
