
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import TablesPage from './pages/TablesPage';
import StudyPage from './pages/StudyPage';
import FlashcardsPage from './pages/FlashcardsPage';
import StatsPage from './pages/StatsPage';
import RewardsPage from './pages/RewardsPage';
import SettingsPage from './pages/SettingsPage';
import QStudyPage from './pages/QStudyPage';
import { DataProvider } from './contexts/DataContext';
import TableDetailPage from './pages/TableDetailPage';
import RelationCreatePage from './pages/RelationCreatePage';
import FlashcardSessionPage from './pages/FlashcardSessionPage';
import SessionHistoryPage from './pages/SessionHistoryPage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';

const App: React.FC = () => {
  return (
    <DataProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="tables" element={<TablesPage />} />
            <Route path="tables/:tableId" element={<TableDetailPage />} />
            <Route path="tables/:tableId/relations/new" element={<RelationCreatePage />} />
            <Route path="study" element={<StudyPage />} />
            <Route path="flashcards" element={<FlashcardsPage />} />
            <Route path="stats" element={<StatsPage />} />
            <Route path="stats/history" element={<SessionHistoryPage />} />
            <Route path="rewards" element={<RewardsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="/study-session" element={<QStudyPage />} />
          <Route path="/flashcards-session" element={<FlashcardSessionPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
        </Routes>
      </HashRouter>
    </DataProvider>
  );
};

export default App;