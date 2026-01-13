import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, onSnapshot, query, orderBy, limit, deleteDoc, doc } from 'firebase/firestore';
import { Icons } from './Icons';
import MeasurementConverter from './MeasurementConverter';
import '../index.css';

const Dashboard = ({ onSelectSite }) => {
    const { user, logout, isCEO, upgradeToCEO } = useAuth();
    const [sites, setSites] = useState([]);
    const [showAddSite, setShowAddSite] = useState(false);
    const [showConverter, setShowConverter] = useState(false);
    const [newSiteName, setNewSiteName] = useState('');
    const [newSiteLocation, setNewSiteLocation] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isCEOUser, setIsCEOUser] = useState(false);
    const [upgrading, setUpgrading] = useState(false);
    const [editingSite, setEditingSite] = useState(null);
    const [editName, setEditName] = useState('');
    const [editLocation, setEditLocation] = useState('');

    // Cross-tab communication channel
    const broadcastChannelRef = React.useRef(null);

    // Update CEO status whenever user changes
    useEffect(() => {
        setIsCEOUser(isCEO());
    }, [user?.role, isCEO]);

    // Initialize BroadcastChannel for cross-tab sync
    useEffect(() => {
        try {
            broadcastChannelRef.current = new BroadcastChannel('site_updates');
            broadcastChannelRef.current.onmessage = (event) => {
                console.log("📡 Received cross-tab message:", event.data);
                // Messages are handled by Firestore listeners automatically
                // This is just for logging and debugging multi-user scenarios
                if (event.data.type === 'site_added' || event.data.type === 'sites_updated' || event.data.type === 'site_deleted') {
                    console.log("🔄 Firestore listener will automatically refresh data");
                }
            };
            console.log("✅ BroadcastChannel initialized for multi-tab sync");
        } catch (e) {
            console.warn("BroadcastChannel not supported:", e);
        }

        return () => {
            if (broadcastChannelRef.current) {
                broadcastChannelRef.current.close();
            }
        };
    }, []);

    // Load sites from Firestore (Real-time) - Increased limit for better visibility
    useEffect(() => {
        const q = query(collection(db, 'sites'), orderBy('createdAt', 'desc'), limit(100));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const sitesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setSites(sitesData);
            setLoading(false);
            setError(null);
            console.log("📍 Sites updated from Firestore:", sitesData.length, "sites");

            // Notify all tabs about the update
            if (broadcastChannelRef.current) {
                broadcastChannelRef.current.postMessage({
                    type: 'sites_updated',
                    count: sitesData.length,
                    timestamp: new Date().toISOString()
                });
            }
        }, (err) => {
            console.error("Error fetching sites:", err);
            setError("Failed to load sites. Check your internet connection or Firebase permissions.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleAddSite = async (e) => {
        e.preventDefault();

        if (!newSiteName.trim()) {
            alert("❌ Please enter a site name");
            return;
        }

        if (!user) {
            alert("❌ You must be logged in to add sites");
            return;
        }

        if (!isCEOUser) {
            alert("❌ Only CEO users can add sites. Your role: " + user.role);
            return;
        }

        console.log("Adding new site:", { newSiteName, newSiteLocation, userUID: user.uid, isCEO: isCEOUser });

        try {
            const siteData = {
                name: newSiteName.trim(),
                location: newSiteLocation.trim() || 'Not specified',
                createdAt: new Date().toISOString(),
                createdBy: user.uid,
                createdByEmail: user.email,
                // Initialize empty expenses structure
                expenseColumns: [
                    { id: 'item', name: 'Item Description', type: 'text', width: '200px' },
                    { id: 'date', name: 'Date', type: 'text', width: '120px' },
                    { id: 'amount', name: 'Amount (₹)', type: 'number', width: '120px' },
                    { id: 'dailyTotal', name: 'Daily Total', type: 'number', width: '120px' }
                ],
                ceoBudget: '',
                ceoProjectValue: ''
            };

            console.log("Site data to save:", siteData);
            const docRef = await addDoc(collection(db, 'sites'), siteData);
            console.log("✅ Site added successfully with ID:", docRef.id);

            // Broadcast to other tabs
            if (broadcastChannelRef.current) {
                broadcastChannelRef.current.postMessage({
                    type: 'site_added',
                    siteId: docRef.id,
                    siteName: newSiteName,
                    timestamp: new Date().toISOString()
                });
                console.log("📡 Broadcasted site addition to other tabs");
            }

            setNewSiteName('');
            setNewSiteLocation('');
            setShowAddSite(false);
            alert("✅ Site added successfully!");
        } catch (error) {
            console.error("Error adding site:", error);
            alert("❌ Failed to add site:\n" + error.message + "\n\nCheck console for details.");
        }
    };

    const handleDeleteSite = async (siteId, siteName) => {
        try {
            await deleteDoc(doc(db, 'sites', siteId));
            console.log("✅ Site deleted successfully:", siteId);

            // Broadcast deletion to all other tabs
            if (broadcastChannelRef.current) {
                broadcastChannelRef.current.postMessage({
                    type: 'site_deleted',
                    siteId: siteId,
                    siteName: siteName,
                    timestamp: new Date().toISOString()
                });
                console.log("📡 Broadcasted site deletion to other tabs");
            }

            alert(`✅ "${siteName}" has been deleted.`);
        } catch (error) {
            console.error("Error deleting site:", error);
            alert("❌ Failed to delete site:\n" + error.message);
        }
    };

    const handleUpdateSite = async (siteId) => {
        if (!editName.trim()) {
            alert("❌ Site name cannot be empty");
            return;
        }

        try {
            const { updateDoc: updateDocFirestore } = await import('firebase/firestore');
            await updateDocFirestore(doc(db, 'sites', siteId), {
                name: editName.trim(),
                location: editLocation.trim() || 'Not specified'
            });
            console.log("✅ Site updated successfully:", siteId);
            setEditingSite(null);
            alert("✅ Site updated successfully!");
        } catch (error) {
            console.error("Error updating site:", error);
            alert("❌ Failed to update site:\n" + error.message);
        }
    };

    return (
        <div className="container fade-in" style={{ paddingTop: '3rem', paddingBottom: '3rem' }}>
            {/* Professional Header */}
            <header className="flex-between mb-lg" style={{ alignItems: 'flex-end', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem' }}>
                <div>
                    <div className="flex gap-sm mb-sm" style={{ alignItems: 'center' }}>
                        <div style={{ color: 'var(--accent-color)' }}>
                            <Icons.Construction size={28} />
                        </div>
                        <h1 style={{ margin: 0 }}>Project Dashboard</h1>
                    </div>
                    <p className="text-secondary" style={{ fontSize: '0.9375rem' }}>
                        Managing <strong className="text-main">{sites.length}</strong> active construction sites
                    </p>
                </div>

                <div className="flex gap-md" style={{ alignItems: 'center' }}>
                    <div className="text-right mr-md" style={{ textAlign: 'right', marginRight: '1rem' }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{user.name}</div>
                        <div className="badge badge-primary">{user.role}</div>
                    </div>
                    <button
                        onClick={async () => {
                            try {
                                await logout();
                            } catch (error) {
                                console.error("Logout error:", error);
                                alert("Error signing out. Please try again.");
                            }
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '0.5rem 1rem' }}
                    >
                        <Icons.Logout size={18} /> Sign Out
                    </button>
                </div>
            </header>

            {/* Actions Bar */}
            <div className="flex-between mb-lg">
                <div className="flex gap-md" style={{ flex: 1, maxWidth: '600px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                            <Icons.Search size={18} />
                        </div>
                        <input
                            type="text"
                            placeholder="Search projects by name or location..."
                            style={{ paddingLeft: '40px' }}
                        />
                    </div>
                </div>

                {isCEOUser && (
                    <button
                        onClick={() => setShowAddSite(true)}
                        className="btn btn-primary"
                    >
                        <Icons.Plus size={18} /> Create New Project
                    </button>
                )}

                {!isCEOUser && (
                    <button
                        onClick={async () => {
                            const code = prompt("Enter CEO Secret Code:");
                            if (code) {
                                setUpgrading(true);
                                try {
                                    const success = await upgradeToCEO(code);
                                    if (success) alert("Successfully upgraded to CEO role.");
                                    else alert("Invalid code.");
                                } catch (err) {
                                    alert("An error occurred during upgrade.");
                                }
                                setUpgrading(false);
                            }
                        }}
                        disabled={upgrading}
                        className="btn btn-secondary"
                    >
                        {upgrading ? 'Verifying...' : 'Upgrade to CEO'}
                    </button>
                )}
                <button
                    onClick={() => setShowConverter(!showConverter)}
                    className="btn btn-secondary"
                    title="Toggle Measurement Converter"
                >
                    <Icons.TrendingUp size={18} style={{ transform: 'rotate(45deg)' }} />
                    {showConverter ? 'Hide' : 'Show'} Converter
                </button>
            </div>

            {/* Measurement Converter Tool */}
            {showConverter && <MeasurementConverter />}

            {/* Add Site Modal/Form */}
            {showAddSite && (
                <div className="card mb-lg fade-in" style={{ maxWidth: '600px', margin: '0 auto 2rem' }}>
                    <div className="flex-between mb-md">
                        <h3>New Project Details</h3>
                        <button onClick={() => setShowAddSite(false)} className="btn btn-secondary" style={{ padding: '4px 8px' }}>✕</button>
                    </div>
                    <form onSubmit={handleAddSite}>
                        <div className="input-group">
                            <label>Project Name</label>
                            <input
                                type="text"
                                placeholder="e.g., Sky Tower Phase 1"
                                value={newSiteName}
                                onChange={(e) => setNewSiteName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="input-group">
                            <label>Location</label>
                            <input
                                type="text"
                                placeholder="e.g., North District, Block C"
                                value={newSiteLocation}
                                onChange={(e) => setNewSiteLocation(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-sm" style={{ justifyContent: 'flex-end' }}>
                            <button type="button" onClick={() => setShowAddSite(false)} className="btn btn-secondary">Cancel</button>
                            <button type="submit" className="btn btn-primary">Initialize Project</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="card mb-lg" style={{ borderLeft: '4px solid var(--danger-color)' }}>
                    <div className="flex gap-md">
                        <div className="text-danger"><Icons.Alert size={24} /></div>
                        <div>
                            <h4 className="text-danger">System Error</h4>
                            <p className="text-secondary">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Sites Grid */}
            {loading ? (
                <div className="flex-center" style={{ minHeight: '40vh', flexDirection: 'column', gap: '1rem' }}>
                    <div className="loading-spinner"></div>
                    <p className="text-secondary">Synchronizing project data...</p>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                    gap: '1.5rem',
                }}>
                    {sites.map((site, index) => (
                        <div
                            key={site.id}
                            className="card fade-in"
                            onClick={() => {
                                console.log("🔍 Site card clicked:", site.id, site.name);
                                onSelectSite(site);
                            }}
                            style={{
                                cursor: 'pointer',
                                animationDelay: `${index * 0.05}s`,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                minHeight: '180px',
                                position: 'relative',
                                userSelect: 'none',
                                outline: 'none',
                                border: '1px solid var(--border-color)',
                                background: 'var(--card-bg, #fff)',
                                padding: '1.5rem',
                                font: 'inherit',
                                textAlign: 'left',
                                borderRadius: '12px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                            }}
                            tabIndex={0}
                            role="button"
                        >
                            {/* Show edit/delete buttons only if CEO and creator */}
                            {isCEOUser && site.createdBy === user.uid && (
                                <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '6px' }}>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            setEditingSite(site.id);
                                            setEditName(site.name);
                                            setEditLocation(site.location);
                                        }}
                                        style={{
                                            background: 'var(--primary-color)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            padding: '4px 8px',
                                            cursor: 'pointer',
                                            fontSize: '0.75rem',
                                            fontWeight: 600
                                        }}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            if (confirm(`Delete "${site.name}"?`)) {
                                                handleDeleteSite(site.id, site.name);
                                            }
                                        }}
                                        style={{
                                            background: 'var(--danger-color)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            padding: '4px 8px',
                                            cursor: 'pointer',
                                            fontSize: '0.75rem',
                                            fontWeight: 600
                                        }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            )}

                            <div>
                                <div className="flex-between mb-sm">
                                    <div className="badge badge-primary">Active Project</div>
                                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                        ID: {site.id.substring(0, 8)}
                                    </div>
                                </div>
                                {editingSite === site.id ? (
                                    <div onClick={(e) => e.stopPropagation()} style={{ padding: '0.5rem 0' }}>
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            placeholder="Site name"
                                            style={{ marginBottom: '0.5rem', width: '100%' }}
                                            autoFocus
                                        />
                                        <input
                                            type="text"
                                            value={editLocation}
                                            onChange={(e) => setEditLocation(e.target.value)}
                                            placeholder="Location"
                                            style={{ marginBottom: '0.5rem', width: '100%' }}
                                        />
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => handleUpdateSite(site.id)}
                                                className="btn btn-primary btn-small"
                                                style={{ flex: 1 }}
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={() => setEditingSite(null)}
                                                className="btn btn-secondary btn-small"
                                                style={{ flex: 1 }}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <h3 className="mb-sm" style={{ color: 'var(--primary-color)' }}>{site.name}</h3>
                                        <p className="text-secondary" style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Icons.Location size={14} /> {site.location}
                                        </p>
                                    </>
                                )}
                            </div>

                            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span className="text-primary" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                                    {isCEOUser ? '✏️ Edit & Manage →' : '📊 View & Contribute →'}
                                </span>
                                <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                    Created: {new Date(site.createdAt).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!loading && sites.length === 0 && (
                <div className="flex-center" style={{ minHeight: '40vh', flexDirection: 'column', textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                        <Icons.Building size={64} opacity={0.2} />
                    </div>
                    <h3 className="text-secondary">No Projects Found</h3>
                    <p className="text-muted mb-md">Get started by creating your first construction project.</p>
                    {isCEOUser && (
                        <button onClick={() => setShowAddSite(true)} className="btn btn-primary">
                            <Icons.Plus size={18} /> Create Project
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default React.memo(Dashboard);

