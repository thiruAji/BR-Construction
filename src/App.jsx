import React, { useState, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { isConfigured } from './firebase';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import SiteDetail from './components/SiteDetail';
import './index.css';

// Fast loading fallback
const FastLoader = () => (
    <div className="flex-center" style={{ minHeight: '100vh', flexDirection: 'column' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem', animation: 'pulse 1.5s infinite' }}>🏗️</div>
        <h2>Loading...</h2>
        <p className="text-muted" style={{ marginBottom: '1.5rem' }}>Connecting to construction database...</p>
        <button
            onClick={() => window.location.reload()}
            className="btn btn-secondary btn-small"
            style={{ opacity: 0.7 }}
        >
            🔄 Refresh App
        </button>
    </div>
);

const AppContent = () => {
    const { user, loading, isCEO } = useAuth();
    const [selectedSite, setSelectedSite] = useState(null);

    // Show loading only while auth is truly loading - no artificial delays
    if (loading) {
        return <FastLoader />;
    }

    if (!user) {
        return <Login />;
    }

    // If a site is selected, show the site details page (Plan Saver or Expenses)
    if (selectedSite) {
        console.log("📍 Showing SiteDetail for:", selectedSite.name);
        return <SiteDetail site={selectedSite} onBack={() => {
            console.log("🔙 Going back to dashboard");
            setSelectedSite(null);
        }} user={user} isCEO={isCEO} />;
    }

    // Show dashboard
    console.log("📊 Showing Dashboard");
    return <Dashboard onSelectSite={(site) => {
        console.log("✅ Selected site in App:", site.name);
        setSelectedSite(site);
    }} />;
};

function App() {
    return (
        <AuthProvider>
            <Suspense fallback={<FastLoader />}>
                <AppContent />
            </Suspense>
        </AuthProvider>
    );
}

export default App;
