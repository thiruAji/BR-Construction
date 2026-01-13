import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db, storage } from '../firebase';
import { collection, addDoc, updateDoc, doc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Icons } from './Icons';
import { compressImage } from '../utils/imageUtils';
import '../index.css';

// --- Sub-components for Performance ---

const ExpenseCell = React.memo(({ rowId, colId, value, type, onUpdate, isReadOnly }) => {
    const [localValue, setLocalValue] = useState(value);
    const timerRef = React.useRef(null);

    // Sync with external value if it changes (e.g. from another user)
    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const handleChange = (e) => {
        if (isReadOnly) {
            e.preventDefault();
            return;
        }
        const newVal = e.target.value;
        setLocalValue(newVal);

        // Debounce Firestore update
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            onUpdate(rowId, colId, newVal);
        }, 800); // 800ms debounce
    };

    const handleBlur = () => {
        if (isReadOnly) return;
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            onUpdate(rowId, colId, localValue);
        }
    };

    const handleKeyDown = (e) => {
        if (isReadOnly) {
            e.preventDefault();
        }
    };

    return (
        <input
            type={type === 'number' ? 'number' : 'text'}
            value={localValue || ''}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            disabled={isReadOnly}
            readOnly={isReadOnly}
            title={isReadOnly ? '🔒 CEO-managed field (Read-only)' : ''}
            style={{
                width: '100%',
                minWidth: colId === 'date' ? '135px' : 'auto', // Extra width for dates
                background: isReadOnly ? 'rgba(100, 116, 139, 0.08)' : 'transparent',
                border: 'none',
                padding: '4px 8px', // Increased padding
                cursor: isReadOnly ? 'not-allowed' : 'text',
                opacity: isReadOnly ? 0.6 : 1,
                fontSize: '0.9375rem',
                color: isReadOnly ? 'var(--text-muted)' : 'var(--text-main)',
                fontWeight: isReadOnly ? 600 : 400,
                boxSizing: 'border-box'
            }}
        />
    );
});

const ExpenseRow = React.memo(({ row, columns, onUpdate, onDelete, onUpload, isUploading, isCEOUser, dailyTotalCell }) => {
    // Members can edit their own rows, but not CEO-created fields
    // CEO can edit everything
    // Both CEO and members can upload receipts for any row

    const isRowReadOnly = !isCEOUser && row.createdByRole === 'CEO';
    const canUpload = isCEOUser || !isRowReadOnly; // CEO always can, members can upload for their own rows
    const fileInputRef = React.useRef(null);

    const isImage = (url) => {
        if (!url) return false;
        const lowerUrl = url.toLowerCase();
        return lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg') || lowerUrl.includes('.png') || lowerUrl.includes('.gif') || lowerUrl.includes('.webp') || lowerUrl.includes('alt=media');
    };

    return (
        <tr style={{ background: isCEOUser ? 'transparent' : 'rgba(100, 200, 255, 0.02)' }}>
            {columns.filter(col => col.id !== 'dailyTotal').map(col => {
                // Cell is read-only if:
                // 1. User is NOT CEO AND
                // 2. Either column was created by CEO OR this specific cell was created by CEO
                const cellCreator = row.cellCreators?.[col.id];
                const isCellReadOnly = !isCEOUser && (col.createdByRole === 'CEO' || cellCreator === 'CEO');

                return (
                    <td key={`${row.id}-${col.id}`}>
                        <ExpenseCell
                            rowId={row.id}
                            colId={col.id}
                            value={row[col.id]}
                            type={col.type}
                            onUpdate={onUpdate}
                            isReadOnly={isCellReadOnly}
                        />
                    </td>
                );
            })}
            {dailyTotalCell}
            <td>
                {row.receiptUrl ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <a href={row.receiptUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
                            {isImage(row.receiptUrl) ? (
                                <img
                                    src={row.receiptUrl}
                                    alt="Receipt"
                                    style={{
                                        width: '32px',
                                        height: '32px',
                                        objectFit: 'cover',
                                        borderRadius: '4px',
                                        border: '1px solid var(--glass-border)',
                                        cursor: 'zoom-in'
                                    }}
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = 'https://via.placeholder.com/32?text=📄';
                                    }}
                                />
                            ) : (
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'var(--bg-secondary)',
                                    borderRadius: '4px',
                                    fontSize: '1.2rem'
                                }}>
                                    📄
                                </div>
                            )}
                        </a>
                        <a href={row.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-primary" style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>View</a>
                    </div>
                ) : (
                    <label style={{
                        cursor: canUpload && !isUploading ? 'pointer' : 'not-allowed',
                        fontSize: '0.8rem',
                        color: canUpload ? 'var(--text-secondary)' : 'var(--text-muted)',
                        opacity: canUpload ? 1 : 0.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}
                        onClick={() => {
                            if (canUpload && !isUploading && fileInputRef.current) {
                                fileInputRef.current.click();
                            }
                        }}>
                        {isUploading ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span className="loading-spinner-small"></span>
                            </span>
                        ) : <><Icons.Camera /> <span style={{ marginLeft: '4px' }}>Upload</span></>}
                        {canUpload && (
                            <input
                                ref={fileInputRef}
                                type="file"
                                style={{ display: 'none' }}
                                accept="image/*,application/pdf"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                        console.log("📸 File selected:", e.target.files[0].name);
                                        onUpload(row.id, e.target.files[0]);
                                        // Reset input so same file can be uploaded again
                                        e.target.value = '';
                                    }
                                }}
                                disabled={isUploading}
                            />
                        )}
                    </label>
                )}
            </td>
            <td>
                {isCEOUser ? (
                    <button onClick={() => onDelete(row.id)} className="btn btn-danger btn-small" title="Delete Row">
                        <Icons.Trash />
                    </button>
                ) : (
                    // Members can also delete their own rows
                    <button onClick={() => onDelete(row.id)} className="btn btn-danger btn-small" title="Delete Your Expense Row">
                        <Icons.Trash />
                    </button>
                )}
            </td>
        </tr>
    );
});

const SiteCosts = ({ site, onBack, user, isCEO, hideHeader = false }) => {
    console.log("🏗️ SiteCosts component loaded for site:", site?.id, site?.name);

    const [rows, setRows] = useState([]);
    const [columns, setColumns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [ceoBudget, setCeoBudget] = useState('');
    const [ceoProjectValue, setCeoProjectValue] = useState('');
    const [newColumnName, setNewColumnName] = useState('');
    const [showAddColumn, setShowAddColumn] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showSaved, setShowSaved] = useState(false); // For "Saved!" indicator

    // Phase 2 State
    const [searchTerm, setSearchTerm] = useState('');
    const [rowUploading, setRowUploading] = useState({}); // Map of rowId -> boolean
    const isCEOUser = isCEO();

    // BroadcastChannel for multi-user/multi-tab sync
    const broadcastChannelRef = React.useRef(null);

    // Initialize BroadcastChannel
    useEffect(() => {
        try {
            broadcastChannelRef.current = new BroadcastChannel(`expenses_${site.id}`);
            broadcastChannelRef.current.onmessage = (event) => {
                console.log("📡 Received expense update from other tab/user:", event.data);
                // Firestore listeners will auto-update, this is just for logging
            };
            console.log("✅ BroadcastChannel initialized for site:", site.id);
        } catch (e) {
            console.warn("BroadcastChannel not supported:", e);
        }

        return () => {
            if (broadcastChannelRef.current) {
                broadcastChannelRef.current.close();
            }
        };
    }, [site.id]);

    // Load Site Metadata
    useEffect(() => {
        console.log("📂 Loading site metadata for:", site.id);
        const unsubscribe = onSnapshot(doc(db, 'sites', site.id), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                console.log("✅ Site metadata loaded:", data);
                // Fallback for older sites or if metadata is missing
                const expensesData = data.expenses || {};

                const defaultColumns = [
                    { id: 'item', name: 'Item Description', type: 'text', width: '200px', createdByRole: 'SYSTEM' },
                    { id: 'date', name: 'Date', type: 'text', width: '120px', createdByRole: 'SYSTEM' },
                    { id: 'amount', name: 'Amount (₹)', type: 'number', width: '120px', createdByRole: 'SYSTEM' },
                    { id: 'dailyTotal', name: 'Daily Total', type: 'number', width: '120px', createdByRole: 'SYSTEM' }
                ];

                const loadedColumns = data.expenseColumns || expensesData.columns || defaultColumns;

                // Ensure all columns have createdByRole property
                const columnsWithRoles = loadedColumns.map(col => ({
                    ...col,
                    createdByRole: col.createdByRole || 'SYSTEM'
                }));

                setColumns(columnsWithRoles);

                setCeoBudget(data.ceoBudget || expensesData.ceoBudget || '');
                setCeoProjectValue(data.ceoProjectValue || expensesData.ceoProjectValue || '');
            } else {
                console.error("❌ Site document not found:", site.id);
            }
        });
        return () => unsubscribe();
    }, [site.id]);

    // Load Expenses (Real-time) - Increased limit for multiple users with many entries
    useEffect(() => {
        console.log("📋 Loading expenses for site:", site.id);
        const q = query(
            collection(db, 'sites', site.id, 'expenses'),
            orderBy('createdAt', 'desc'),
            limit(500)  // Increased from 100 to support 10+ users with many entries

        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const expensesData = snapshot.docs.map(doc => {
                const data = doc.data();
                // Ensure cellCreators exists for old rows (backward compatibility)
                if (!data.cellCreators) {
                    data.cellCreators = {};
                    // Initialize cellCreators based on who created the row
                    // All cells created by the row creator initially
                    if (data.createdByRole) {
                        Object.keys(data).forEach(key => {
                            if (key !== 'id' && key !== 'createdAt' && key !== 'updatedAt' && key !== 'createdByRole' && key !== 'lastUpdatedByRole' && key !== 'cellCreators' && data[key]) {
                                data.cellCreators[key] = data.createdByRole;
                            }
                        });
                    }
                }
                return {
                    id: doc.id,
                    ...data
                };
            });
            console.log("✅ Expenses loaded:", expensesData.length, "rows");

            setRows(expensesData);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching expenses:", err);
            setLoading(false);
            alert("⚠️ Failed to load expenses. Please check your connection.");
        });
        return () => unsubscribe();
    }, [site.id]);

    const logAction = useCallback(async (action, details) => {
        try {
            await addDoc(collection(db, 'audit_logs'), {
                action,
                details,
                siteId: site.id,
                siteName: site.name,
                userId: user.uid,
                userEmail: user.email,
                timestamp: serverTimestamp()
            });
        } catch (error) {
            console.error("Error logging action:", error);
        }
    }, [site.id, site.name, user.uid, user.email]);

    const saveSiteMetadata = useCallback(async (currColumns, budget, projectValue) => {
        setSaving(true);
        const siteDocRef = doc(db, 'sites', site.id);
        try {
            await updateDoc(siteDocRef, {
                expenseColumns: currColumns,
                ceoBudget: budget,
                ceoProjectValue: projectValue
            });
            logAction('UPDATE_METADATA', { budget, projectValue });
        } catch (error) {
            console.error("Error saving metadata:", error);
            alert("Failed to save changes.");
        }
        setSaving(false);
    }, [site.id, logAction]);

    const handleManualSave = () => {
        setShowSaved(true);
        setTimeout(() => setShowSaved(false), 3000);
    };

    // Column Management
    const addColumn = (e) => {
        e.preventDefault();
        if (!newColumnName.trim()) return;

        const newCol = {
            id: `col_${Date.now()}`,
            name: newColumnName,
            type: 'text',
            width: '150px',
            createdByRole: user.role // Track who created this column
        };
        const updatedColumns = [...columns, newCol];
        setColumns(updatedColumns);
        saveSiteMetadata(updatedColumns, ceoBudget, ceoProjectValue);
        setNewColumnName('');
        setShowAddColumn(false);
        logAction('ADD_COLUMN', { columnName: newColumnName, role: user.role });
    };

    const deleteColumn = (colId) => {
        console.log("Attempting to delete column:", colId);
        if (colId === 'item' || colId === 'amount' || colId === 'date' || colId === 'dailyTotal') {
            alert("Cannot delete default columns");
            return;
        }

        const col = columns.find(c => c.id === colId);
        if (!isCEOUser && col?.createdByRole === 'CEO') {
            alert("❌ Only a CEO can delete CEO-created columns");
            return;
        }

        if (confirm('Delete this column definition?')) {
            const updatedColumns = columns.filter(c => c.id !== colId);
            setColumns(updatedColumns);
            saveSiteMetadata(updatedColumns, ceoBudget, ceoProjectValue);
            logAction('DELETE_COLUMN', { columnId: colId });
        }
    };

    // Row Management
    const addRow = async () => {
        try {
            const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const newRow = {
                createdAt: serverTimestamp(),
                createdByRole: user.role, // Track who created this row
                cellCreators: {} // Track who created each cell
            };
            columns.forEach(col => {
                if (col.id === 'date') {
                    newRow[col.id] = today;
                    newRow.cellCreators[col.id] = user.role; // Track cell creator
                } else {
                    newRow[col.id] = '';
                    newRow.cellCreators[col.id] = user.role; // Track cell creator
                }
            });
            const docRef = await addDoc(collection(db, 'sites', site.id, 'expenses'), newRow);
            logAction('ADD_EXPENSE', { expenseId: docRef.id, role: user.role });
        } catch (error) {
            console.error("Error adding row:", error);
            alert("Failed to add row.");
        }
    };

    const updateCell = useCallback(async (rowId, colId, value) => {
        // Check if member is trying to edit a CEO-created cell
        const row = rows.find(r => r.id === rowId);
        const cellCreator = row?.cellCreators?.[colId];
        if (!isCEOUser && cellCreator === 'CEO') {
            console.error("❌ Member cannot edit CEO-created cell");
            return; // Prevent edit
        }

        // Validate amount field
        if (colId === 'amount' && value && isNaN(parseFloat(value))) {
            alert("❌ Amount must be a valid number");
            return;
        }

        // Optimistic update - When CEO edits a cell, mark it as CEO-owned (immutable for others)
        const cellCreatorValue = isCEOUser ? 'CEO' : user.role;
        setRows(prev => prev.map(r => r.id === rowId ? {
            ...r,
            [colId]: value,
            lastUpdatedByRole: user.role,
            cellCreators: { ...r.cellCreators, [colId]: cellCreatorValue } // CEO values are immutable
        } : r));
        try {
            await updateDoc(doc(db, 'sites', site.id, 'expenses', rowId), {
                [colId]: value,
                lastUpdatedByRole: user.role,
                cellCreators: { ...(row?.cellCreators || {}), [colId]: cellCreatorValue }, // CEO values become immutable
                updatedAt: serverTimestamp()
            });

            // Broadcast update to other tabs (don't fail if this errors)
            if (broadcastChannelRef.current) {
                try {
                    broadcastChannelRef.current.postMessage({
                        type: 'cell_updated',
                        rowId: rowId,
                        colId: colId,
                        value: value,
                        updatedBy: user.email,
                        timestamp: new Date().toISOString()
                    });
                } catch (broadcastError) {
                    console.warn("BroadcastChannel error (non-critical):", broadcastError);
                }
            }
        } catch (error) {
            console.error("Error updating cell:", error);
            alert("❌ Failed to save " + colId + ". Please try again.");
            // Revert optimistic update
            setRows(prev => prev.map(r => r.id === rowId ? { ...r, [colId]: row[colId] } : r));
        }
    }, [site.id, user.role, isCEOUser, rows]);

    const deleteRow = useCallback(async (rowId) => {
        console.log("Attempting to delete row:", rowId);
        if (!rowId) {
            console.error("No rowId provided for deletion");
            return;
        }

        // Check if member is trying to delete a CEO-created row
        const row = rows.find(r => r.id === rowId);
        if (!isCEOUser && row?.createdByRole === 'CEO') {
            alert("❌ You can only delete rows you created. CEO-created rows cannot be deleted by members.");
            return;
        }

        if (!window.confirm('Delete this expense row?')) return;
        try {
            await deleteDoc(doc(db, 'sites', site.id, 'expenses', rowId));
            logAction('DELETE_EXPENSE', { expenseId: rowId });
            console.log("✅ Row deleted successfully:", rowId);
        } catch (error) {
            console.error("Error deleting row:", error);
            alert("Failed to delete row: " + error.message);
        }
    }, [site.id, logAction, isCEOUser, rows]);

    // Receipt Upload
    const handleFileUpload = useCallback(async (rowId, file) => {
        if (!file) return;
        if (!storage) {
            alert("❌ Storage not configured. Please check your Firebase settings.");
            return;
        }

        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
        if (!validTypes.includes(file.type)) {
            alert("❌ Only images (JPG, PNG, GIF, WebP) and PDF files are allowed");
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert("❌ File size exceeds 10MB limit");
            return;
        }

        setRowUploading(prev => ({ ...prev, [rowId]: true }));
        try {
            let uploadFile = file;
            if (file.type.startsWith('image/')) {
                console.log("📸 Compressing receipt for faster upload...");
                uploadFile = await compressImage(file, { maxWidth: 1280, maxHeight: 1280, quality: 0.6 });
            }

            // Use a unique path to avoid collisions
            const fileExt = uploadFile.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const storageRef = ref(storage, `receipts/${site.id}/${rowId}/${fileName}`);

            console.log("🔼 Starting upload for:", uploadFile.name);
            await uploadBytes(storageRef, uploadFile);
            console.log("✅ File uploaded to Storage");

            const downloadURL = await getDownloadURL(storageRef);
            console.log("✅ Got download URL:", downloadURL);

            // Update Firestore with receipt info
            const updateData = {
                receiptUrl: downloadURL,
                receiptName: uploadFile.name,
                receiptSize: uploadFile.size,
                receiptType: uploadFile.type,
                uploadedAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            await updateDoc(doc(db, 'sites', site.id, 'expenses', rowId), updateData);
            console.log("✅ Firestore updated with receipt URL");

            // Also update local state optimistically
            setRows(prev => prev.map(r => r.id === rowId ? {
                ...r,
                receiptUrl: downloadURL,
                receiptName: file.name,
                receiptSize: file.size,
                receiptType: file.type
            } : r));

            logAction('UPLOAD_RECEIPT', { expenseId: rowId, fileName: file.name, fileSize: file.size });
            console.log("✅ Upload successful:", downloadURL);
            alert("✅ Receipt uploaded successfully!");
        } catch (error) {
            console.error("Upload failed:", error);
            if (error.message.includes("retry-limit-exceeded") || error.code === "storage/not-initialized") {
                alert("⚠️ Storage Connection Failed!\n\nThis usually means:\n1. Storage is NOT enabled in Firebase Console (Most Likely).\n2. Storage Rules are blocking the upload.\n\nPlease go to Firebase Console > Storage and click 'Get Started'.");
            } else if (error.code === "storage/unauthorized") {
                alert("❌ Permission denied. Make sure Firebase Storage Rules allow uploads.");
            } else {
                alert("❌ Upload failed: " + error.message);
            }
        } finally {
            setRowUploading(prev => ({ ...prev, [rowId]: false }));
        }
    }, [site.id, logAction]);

    // Export to CSV
    const exportToCSV = () => {
        if (rows.length === 0) {
            alert("No data to export");
            return;
        }

        const headers = columns.map(col => col.name).join(',');
        const csvRows = rows.map(row => {
            return columns.map(col => {
                const val = row[col.id] || '';
                return `"${String(val).replace(/"/g, '""')}"`;
            }).join(',');
        });

        const csvContent = [headers, ...csvRows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${site.name}_expenses_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        logAction('EXPORT_CSV', {});
    };

    // Filtered Rows
    const filteredRows = useMemo(() => {
        if (!searchTerm) return rows;
        const searchLower = searchTerm.toLowerCase();
        return rows.filter(row => {
            // Search in all row values, not just columns
            return Object.values(row).some(val =>
                val && String(val).toLowerCase().includes(searchLower)
            );
        });
    }, [rows, searchTerm]);

    // Grouped Rows for Professional Daily View
    const groupedRows = useMemo(() => {
        const groups = {};
        filteredRows.forEach(row => {
            const date = row.date || 'No Date';
            if (!groups[date]) groups[date] = [];
            groups[date].push(row);
        });

        // Sort dates descending (newest first)
        return Object.keys(groups).sort((a, b) => {
            if (a === 'No Date') return 1;
            if (b === 'No Date') return -1;
            const [da, ma, ya] = a.split('/').map(Number);
            const [db, mb, yb] = b.split('/').map(Number);
            return new Date(yb, mb - 1, db) - new Date(ya, ma - 1, da);
        }).map(date => {
            const subtotal = groups[date].reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
            return {
                date,
                rows: groups[date].map(row => ({ ...row, dailyTotal: subtotal })),
                subtotal
            };
        });
    }, [filteredRows]);

    const totalExpenses = useMemo(() => {
        return filteredRows.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);
    }, [filteredRows]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    // Budget Calculations
    const budget = parseFloat(ceoBudget) || 0;
    const budgetProgress = useMemo(() => budget > 0 ? (totalExpenses / budget) * 100 : 0, [totalExpenses, budget]);
    const remainingBudget = budget - totalExpenses;

    return (
        <div className="container fade-in" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
            {/* Professional Header - Only show if not hidden by parent */}
            {!hideHeader && (
                <header className="flex-between mb-lg" style={{ alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem' }}>
                    <div className="flex gap-md" style={{ alignItems: 'center' }}>
                        <button onClick={onBack} className="btn btn-secondary" style={{ padding: '8px' }}>
                            <Icons.Back size={20} />
                        </button>
                        <div>
                            <div className="flex gap-sm" style={{ alignItems: 'center' }}>
                                <div style={{ color: 'var(--accent-color)' }}>
                                    <Icons.Building size={24} />
                                </div>
                                <h2 style={{ margin: 0 }}>{site.name}</h2>
                            </div>
                            <p className="text-secondary" style={{ fontSize: '0.875rem', marginTop: '2px' }}>
                                <Icons.Location size={14} /> {site.location}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-sm">
                        <button onClick={exportToCSV} className="btn btn-secondary">
                            <Icons.Download size={18} /> Export Data
                        </button>
                    </div>
                </header>
            )}

            {/* If header is hidden, show export button in a different way or keep it available */}
            {hideHeader && (
                <div className="flex justify-end mb-md">
                    <button onClick={exportToCSV} className="btn btn-secondary btn-small">
                        <Icons.Download size={16} /> Export CSV
                    </button>
                </div>
            )}

            {/* Financial KPI Strip */}
            <section className="card mb-lg" style={{ background: 'var(--primary-color)', color: 'white', border: 'none' }}>
                <div className="flex-between mb-md">
                    <h3 style={{ color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Icons.Briefcase size={20} /> Project Financials
                    </h3>
                    {isCEOUser && (
                        <div className="flex gap-sm align-center">
                            {showSaved && <span className="fade-in" style={{ fontSize: '0.75rem', color: 'var(--success-color)', fontWeight: 600 }}>Changes Saved</span>}
                            <button
                                onClick={() => {
                                    saveSiteMetadata(columns, ceoBudget, ceoProjectValue);
                                    handleManualSave();
                                }}
                                className="btn btn-success"
                                style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                            >
                                Update Budget
                            </button>
                        </div>
                    )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                        <label style={{ color: 'rgba(255,255,255,0.7)' }}>Total Project Value</label>
                        {isCEOUser ? (
                            <input
                                type="number"
                                value={ceoProjectValue}
                                onChange={(e) => setCeoProjectValue(e.target.value)}
                                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white' }}
                                placeholder="Enter value..."
                            />
                        ) : (
                            <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{formatCurrency(ceoProjectValue)}</div>
                        )}
                    </div>

                    <div className="input-group" style={{ marginBottom: 0 }}>
                        <label style={{ color: 'rgba(255,255,255,0.7)' }}>Project Budget</label>
                        {isCEOUser ? (
                            <input
                                type="number"
                                value={ceoBudget}
                                onChange={(e) => setCeoBudget(e.target.value)}
                                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white' }}
                                placeholder="Enter budget..."
                            />
                        ) : (
                            <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{formatCurrency(ceoBudget)}</div>
                        )}
                    </div>

                    <div>
                        <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', fontWeight: 500, display: 'block', marginBottom: '0.375rem' }}>Total Expenditure</label>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{formatCurrency(totalExpenses)}</div>
                    </div>

                    <div>
                        <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', fontWeight: 500, display: 'block', marginBottom: '0.375rem' }}>Remaining Balance</label>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: remainingBudget < 0 ? '#fda4af' : '#6ee7b7' }}>
                            {formatCurrency(remainingBudget)}
                        </div>
                    </div>
                </div>

                {budget > 0 && (
                    <div style={{ marginTop: '2rem' }}>
                        <div className="flex-between mb-sm">
                            <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}>Budget Utilization</span>
                            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{Math.round(budgetProgress)}%</span>
                        </div>
                        <div className="progress-container" style={{ background: 'rgba(255,255,255,0.1)', height: '10px' }}>
                            <div
                                className="progress-bar"
                                style={{
                                    width: `${Math.min(budgetProgress, 100)}%`,
                                    backgroundColor: budgetProgress > 100 ? 'var(--danger-color)' : 'var(--success-color)'
                                }}
                            />
                        </div>
                    </div>
                )}
            </section>

            {/* Expense Management Section */}
            <section>
                <div className="flex-between mb-md">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Icons.List size={20} /> Expense Ledger
                    </h3>
                    <div className="flex gap-sm">
                        <div style={{ position: 'relative', width: '280px' }}>
                            <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                                <Icons.Search size={16} />
                            </div>
                            <input
                                type="text"
                                placeholder="Search ledger..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ paddingLeft: '34px', paddingRight: '10px', height: '38px' }}
                            />
                        </div>
                        <button onClick={() => setShowAddColumn(true)} className="btn btn-secondary" style={{ height: '38px' }}>
                            <Icons.Plus size={16} /> Column
                        </button>
                        <button onClick={addRow} className="btn btn-primary" style={{ height: '38px' }}>
                            <Icons.Plus size={16} /> Add Row
                        </button>
                    </div>
                </div>

                {!isCEOUser && columns.some(col => col.createdByRole === 'CEO') && (
                    <div style={{
                        background: 'rgba(59, 130, 246, 0.05)',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        marginBottom: '1.5rem',
                        fontSize: '0.875rem',
                        color: 'var(--text-secondary)'
                    }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>🔒</span>
                            Some columns are managed by the CEO and are read-only. You can edit other fields and add new rows.
                        </span>
                    </div>
                )}
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                {columns.map(col => (
                                    <th key={col.id} style={{ width: col.width }}>
                                        <div className="flex-between">
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                {col.name}
                                                {col.createdByRole === 'CEO' && !isCEOUser && (
                                                    <span title="This field is managed by CEO - read-only" style={{ color: 'var(--danger-color)', fontSize: '0.85rem' }}>
                                                        🔒
                                                    </span>
                                                )}
                                            </span>
                                            {isCEOUser && col.id !== 'item' && col.id !== 'amount' && col.id !== 'date' && col.id !== 'dailyTotal' && (
                                                <button onClick={() => deleteColumn(col.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                                    <Icons.Trash size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </th>
                                ))}
                                <th style={{ width: '120px' }}>Receipt</th>
                                <th style={{ width: '80px', textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={columns.length + 2} className="text-center" style={{ padding: '3rem' }}>
                                        <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
                                    </td>
                                </tr>
                            ) : groupedRows.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length + 2} className="text-center text-muted" style={{ padding: '3rem' }}>
                                        {searchTerm ? 'No expenses match your search' : 'No expenses recorded yet'}
                                    </td>
                                </tr>
                            ) : (
                                groupedRows.map((group) => (
                                    <React.Fragment key={group.date}>
                                        {/* Date Group Header */}
                                        <tr style={{ background: 'var(--bg-secondary)', borderLeft: '4px solid var(--accent-color)' }}>
                                            <td colSpan={columns.length + 2} style={{ padding: '8px 12px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Icons.Calendar size={14} /> {group.date}
                                                    <span style={{ marginLeft: 'auto', opacity: 0.7 }}>Daily Subtotal: {formatCurrency(group.subtotal)}</span>
                                                </div>
                                            </td>
                                        </tr>
                                        {/* Rows for this date */}
                                        {group.rows.map((row, rowIndex) => (
                                            <ExpenseRow
                                                key={row.id}
                                                row={row}
                                                columns={columns}
                                                onUpdate={updateCell}
                                                onDelete={deleteRow}
                                                onUpload={handleFileUpload}
                                                isUploading={!!rowUploading[row.id]}
                                                isCEOUser={isCEOUser}
                                                dailyTotalCell={rowIndex === 0 ? (
                                                    <td
                                                        rowSpan={group.rows.length}
                                                        style={{
                                                            verticalAlign: 'middle',
                                                            textAlign: 'right',
                                                            fontWeight: 'bold',
                                                            background: 'rgba(var(--accent-rgb), 0.05)',
                                                            borderLeft: '1px solid var(--border-color)',
                                                            color: 'var(--primary-color)'
                                                        }}
                                                    >
                                                        {formatCurrency(group.subtotal)}
                                                    </td>
                                                ) : null}
                                            />
                                        ))}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                        {filteredRows.length > 0 && (
                            <tfoot>
                                <tr style={{ background: '#f8fafc', fontWeight: 'bold' }}>
                                    <td colSpan={columns.findIndex(c => c.id === 'amount')} className="text-right">Total:</td>
                                    <td>{formatCurrency(totalExpenses)}</td>
                                    <td colSpan={columns.length - columns.findIndex(c => c.id === 'amount') + 1}></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </section>

            {/* Add Column Modal */}
            {showAddColumn && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'rgba(0,0,0,0.4)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000,
                    backdropFilter: 'blur(4px)'
                }}>
                    <div className="card fade-in" style={{ width: '100%', maxWidth: '400px' }}>
                        <h3 className="mb-md">Add Custom Column</h3>
                        <form onSubmit={addColumn}>
                            <div className="input-group">
                                <label>Column Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g., Vendor, Date, Category"
                                    value={newColumnName}
                                    onChange={(e) => setNewColumnName(e.target.value)}
                                    autoFocus
                                    required
                                />
                            </div>
                            <div className="flex gap-sm mt-lg">
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Add Column</button>
                                <button type="button" onClick={() => setShowAddColumn(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default React.memo(SiteCosts);

