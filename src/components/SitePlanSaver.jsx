import React, { useState, useEffect, useRef } from 'react';
import { db, storage } from '../firebase';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Icons } from './Icons';
import '../index.css';

const SitePlanSaver = ({ site, user, isCEO }) => {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
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

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validation
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        if (!validTypes.includes(file.type)) {
            alert("❌ Only images (JPG, PNG, WebP) and PDF files are allowed.");
            return;
        }

        if (file.size > 20 * 1024 * 1024) { // 20MB limit for plans
            alert("❌ File size exceeds 20MB limit.");
            return;
        }

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const storagePath = `plans/${site.id}/${fileName}`;
            const storageRef = ref(storage, storagePath);

            console.log("🔼 Uploading plan:", file.name);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);

            await addDoc(collection(db, 'sites', site.id, 'plans'), {
                name: file.name,
                url: downloadURL,
                type: file.type,
                size: file.size,
                storagePath: storagePath,
                createdAt: serverTimestamp(),
                createdBy: user.uid,
                createdByEmail: user.email
            });

            console.log("✅ Plan saved successfully");
            alert("✅ Site plan saved successfully!");
        } catch (err) {
            console.error("Upload failed:", err);
            alert("❌ Failed to upload plan: " + err.message);
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDeletePlan = async (plan) => {
        if (!isCEOUser) {
            alert("❌ Only CEO can delete plans.");
            return;
        }

        if (!confirm(`Delete plan "${plan.name}"?`)) return;

        try {
            // Delete from storage
            if (plan.storagePath) {
                const storageRef = ref(storage, plan.storagePath);
                await deleteObject(storageRef);
            }

            // Delete from firestore
            await deleteDoc(doc(db, 'sites', site.id, 'plans', plan.id));
            alert("✅ Plan deleted.");
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
                    disabled={uploading}
                >
                    {uploading ? (
                        <><span className="loading-spinner-small"></span> Uploading...</>
                    ) : (
                        <><Icons.Plus size={18} /> Upload New Plan</>
                    )}
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
            ) : plans.length === 0 ? (
                <div className="card flex-center" style={{ minHeight: '30vh', flexDirection: 'column', gap: '1rem', background: 'rgba(0,0,0,0.02)', border: '1px dashed var(--border-color)' }}>
                    <div style={{ opacity: 0.3 }}><Icons.Folder size={48} /></div>
                    <p className="text-secondary">No plans uploaded yet.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
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
