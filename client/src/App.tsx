import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { FixtureProvider } from './context/FixtureContext';
import { ProposedEvaluationProvider } from './context/ProposedEvaluationContext';
import { AppShell } from './components/layout/AppShell';
import { DashboardPage } from './pages/DashboardPage';
import { ForecastPage } from './pages/ForecastPage';
import { AlertsPage } from './pages/AlertsPage';
import { MapPage } from './pages/MapPage';
import { SimulatorPage } from './pages/SimulatorPage';
import { DataQualityPage } from './pages/DataQualityPage';
import { NotFoundPage } from './pages/NotFoundPage';

export const App: React.FC = () => {
  return (
    <FixtureProvider>
      <ProposedEvaluationProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="forecast" element={<ForecastPage />} />
            <Route path="alerts" element={<AlertsPage />} />
            <Route path="map" element={<MapPage />} />
            <Route path="simulator" element={<SimulatorPage />} />
            <Route path="candidates" element={<Navigate to="/map" replace />} />
            <Route path="data-quality" element={<DataQualityPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
        </BrowserRouter>
      </ProposedEvaluationProvider>
    </FixtureProvider>
  );
};

export default App;
