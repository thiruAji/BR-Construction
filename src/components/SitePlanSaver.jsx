import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { Icons } from './Icons';
import { compressImage } from '../utils/imageUtils';
import '../index.css';

const SitePlanSaver = ({ site, user, isCEO }) => {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploadingItems, setUploadingItems] = useState({}); // Map of tempId -> { name, progress, url, type }
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);
    const isCEOUser = isCEO();

    useEffect(() => {
        console.log("📂 SitePlanSaver loading for site:", site.id);
        const q = query(
            collection(db, 'sites', site.id, 'plans'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const plansData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setPlans(plansData);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching plans:", err);
            setError("Failed to load plans.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [site.id]);

    // Helper to convert file to base64
    const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    };

    const handleFileUpload = async (e) => {
        let file = e.target.files[0];
        if (!file) return;

        // Reset input immediately so same file can be selected again
        if (fileInputRef.current) fileInputRef.current.value = '';

        // Validation
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        if (!validTypes.includes(file.type)) {
            alert("❌ Only images (JPG, PNG, WebP) and PDF files are allowed.");
            return;
        }

        // Stricter size limit for base64 storage (2MB instead of 20MB)
        if (file.size > 2 * 1024 * 1024) {
            alert("❌ File size exceeds 2MB limit. (Temporary limit until Firebase Storage is enabled)");
            return;
        }

        // Optimistic UI: Create temporary item
        const tempId = Date.now().toString();
        const previewUrl = URL.createObjectURL(file);

        setUploadingItems(prev => ({
            ...prev,
            [tempId]: {
                name: file.name,
                progress: 0,
                url: previewUrl,
                type: file.type,
                status: 'compressing'
            }
        }));

        try {
            // Compress image if it is one
            if (file.type.startsWith('image/')) {
                console.log("🖼️ Compressing image...");
                file = await compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.7 });
            }

            setUploadingItems(prev => ({
                ...prev,
                [tempId]: { ...prev[tempId], status: 'uploading', progress: 50 }
            }));

            console.log("💾 Saving plan to Firestore (base64)...");

            // Convert to base64 for temporary storage
            const base64Data = await fileToBase64(file);

            setUploadingItems(prev => ({
                ...prev,
                [tempId]: { ...prev[tempId], progress: 80 }
            }));

            // Save to Firestore instead of Storage
            await addDoc(collection(db, 'sites', site.id, 'plans'), {
                name: file.name,
                url: base64Data, // Store base64 data URL temporarily
                type: file.type,
                size: file.size,
                storageType: 'base64', // Flag to indicate this is temporary
                createdAt: serverTimestamp(),
                createdBy: user.uid,
                createdByEmail: user.email
            });

            console.log("✅ Plan saved successfully (temporary base64 storage)");

            // Simulate completion progress
            setUploadingItems(prev => ({
                ...prev,
                [tempId]: { ...prev[tempId], progress: 100 }
            }));

            // Remove from uploading items after short delay
            setTimeout(() => {
                setUploadingItems(prev => {
                    const newState = { ...prev };
                    delete newState[tempId];
                    return newState;
                });
            }, 500);

        } catch (err) {
            console.error("Upload failed:", err);
            alert("❌ Failed to save plan: " + err.message);
            setUploadingItems(prev => {
                const newState = { ...prev };
                delete newState[tempId];
                return newState;
            });
        }
    };

    const handleDeletePlan = async (plan) => {
        if (!isCEOUser) {
            alert("❌ Only CEO can delete plans.");
            return;
        }

        if (!confirm(`Delete plan "${plan.name}"?`)) return;

        try {
            // Delete from firestore only (no Firebase Storage to clean up with base64)
            await deleteDoc(doc(db, 'sites', site.id, 'plans', plan.id));
            console.log("✅ Plan deleted.");
        } catch (err) {
            console.error("Delete failed:", err);
            alert("❌ Failed to delete plan.");
        }
    };

    const formatSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="fade-in">
            <div className="flex-between mb-lg">
                <div>
                    <h3>Site Plans & Documents</h3>
                    <p className="text-secondary">Upload drawings, blueprints, or site progress photos</p>
                </div>
                <button
                    onClick={() => fileInputRef.current.click()}
                    className="btn btn-primary"
                >
                    <Icons.Plus size={18} /> Upload New Plan
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                    accept="image/*,application/pdf"
                />
            </div>

            {loading ? (
                <div className="flex-center" style={{ minHeight: '30vh' }}>
                    <div className="loading-spinner"></div>
                </div>
            ) : plans.length === 0 && Object.keys(uploadingItems).length === 0 ? (
                <div className="card flex-center" style={{ minHeight: '30vh', flexDirection: 'column', gap: '1rem', background: 'rgba(0,0,0,0.02)', border: '1px dashed var(--border-color)' }}>
                    <div style={{ opacity: 0.3 }}><Icons.Folder size={48} /></div>
                    <p className="text-secondary">No plans uploaded yet.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                    {/* Render Optimistic Uploading Items */}
                    {Object.values(uploadingItems).map((item, index) => (
                        <div key={`upload-${index}`} className="card plan-card" style={{ padding: 0, overflow: 'hidden', position: 'relative', border: '2px solid var(--primary-color)' }}>
                            <div style={{ height: '160px', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', borderBottom: '1px solid var(--border-color)', position: 'relative' }}>
                                {/* Overlay for compressing/uploading state */}
                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                                    <div className="badge badge-primary">{item.status === 'compressing' ? 'Compressing...' : `${Math.round(item.progress)}%`}</div>
                                </div>
                                {item.type.includes('image') ? (
                                    <img src={item.url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
                                ) : (
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ color: 'var(--primary-color)', marginBottom: '8px' }}><Icons.File size={48} /></div>
                                        <div className="badge">PDF DOCUMENT</div>
                                    </div>
                                )}
                            </div>
                            <div style={{ padding: '1rem' }}>
                                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.name}>
                                    {item.name}
                                </h4>
                                {/* Progress Bar */}
                                <div style={{ height: '6px', background: '#eee', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%',
                                        background: 'var(--success-color)',
                                        width: `${item.progress}%`,
                                        transition: 'width 0.2s ease-out'
                                    }} />
                                </div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', textAlign: 'right' }}>
                                    {item.status === 'compressing' ? 'Optimizing...' : 'Uploading...'}
                                </p>
                            </div>
                        </div>
                    ))}

                    {/* Render Real Plans */}
                    {plans.map(plan => (
                        <div key={plan.id} className="card plan-card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
                            <div style={{ height: '160px', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', borderBottom: '1px solid var(--border-color)' }}>
                                {plan.type.includes('image') ? (
                                    <img src={plan.url} alt={plan.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ color: 'var(--primary-color)', marginBottom: '8px' }}><Icons.File size={48} /></div>
                                        <div className="badge">PDF DOCUMENT</div>
                                    </div>
                                )}
                            </div>
                            <div style={{ padding: '1rem' }}>
                                <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={plan.name}>
                                    {plan.name}
                                </h4>
                                <div className="flex-between">
                                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>{formatSize(plan.size)}</span>
                                    <div className="flex gap-sm">
                                        <a href={plan.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-small" title="View/Download">
                                            <Icons.Download size={14} />
                                        </a>
                                        {isCEOUser && (
                                            <button onClick={() => handleDeletePlan(plan)} className="btn btn-danger btn-small" title="Delete">
                                                <Icons.Trash size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default React.memo(SitePlanSaver);
