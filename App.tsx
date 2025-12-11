import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Home } from './views/Home';
import { HostView } from './views/HostView';
import { ControllerView } from './views/ControllerView';

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/host" element={<HostView />} />
        <Route path="/controller/:roomId" element={<ControllerView />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
