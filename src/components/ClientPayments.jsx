// Client Payments Component - Fixed expense calculation
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Icons } from './Icons';
import '../index.css';

const ClientPayments = ({ site, user, isCEO }) => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddPayment, setShowAddPayment] = useState(false);
    const [contractValue, setContractValue] = useState(site.contractValue || 0);
    const [editingContract, setEditingContract] = useState(false);
    const [totalExpenses, setTotalExpenses] = useState(0);

    const isCEOUser = isCEO();

    // Load payments
    useEffect(() => {
        console.log("💰 ClientPayments loading for site:", site.id);
        const q = query(
            collection(db, 'sites', site.id, 'payments'),
            orderBy('date', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const paymentsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setPayments(paymentsData);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching payments:", err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [site.id]);

    // Load total expenses from site expenses
    useEffect(() => {
        const q = query(collection(db, 'sites', site.id, 'expenses'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            let total = 0;
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                // Sum ALL numeric fields except metadata
                Object.entries(data).forEach(([key, value]) => {
                    // Skip metadata fields and date columns
                    if (key === 'createdAt' || key === 'updatedAt' || key === 'createdByRole' ||
                        key === 'lastUpdatedByRole' || key === 'cellCreators' || key === 'receiptUrl' ||
                        key === 'receiptName' || key === 'receiptSize' || key === 'receiptType' ||
                        key === 'uploadedAt' || key.toLowerCase().includes('date') ||
                        key === 'item' || key === 'dailyTotal') {
                        return;
                    }
                    const numValue = parseFloat(value);
                    if (!isNaN(numValue)) {
                        total += numValue;
                    }
                });
            });
            console.log("💰 Total expenses calculated:", total);
            setTotalExpenses(total);
        });
        return () => unsubscribe();
    }, [site.id]);

    const handleSaveContractValue = async () => {
        if (!isCEOUser) return;
        try {
            await updateDoc(doc(db, 'sites', site.id), {
                contractValue: Number(contractValue)
            });
            setEditingContract(false);
            alert("✅ Contract value updated!");
        } catch (err) {
            console.error("Error updating contract:", err);
            alert("❌ Failed to update contract value");
        }
    };

    const handleAddPayment = async (e) => {
        e.preventDefault();
        if (!isCEOUser) return;

        const formData = new FormData(e.target);
        const amount = Number(formData.get('amount'));
        const date = new Date(formData.get('date'));
        const method = formData.get('method');
        const notes = formData.get('notes');

        try {
            await addDoc(collection(db, 'sites', site.id, 'payments'), {
                amount,
                date: date,
                method,
                notes,
                createdAt: serverTimestamp(),
                createdBy: user.uid,
                createdByEmail: user.email
            });
            setShowAddPayment(false);
            e.target.reset();
            alert("✅ Payment added successfully!");
        } catch (err) {
            console.error("Error adding payment:", err);
            const errorMsg = err.code === 'permission-denied'
                ? "❌ Permission denied. Check Firestore security rules for 'payments' collection."
                : `❌ Failed to add payment: ${err.message}`;
            alert(errorMsg);
        }
    };

    const handleDeletePayment = async (paymentId) => {
        if (!isCEOUser) return;
        if (!confirm("Delete this payment record?")) return;

        try {
            await deleteDoc(doc(db, 'sites', site.id, 'payments', paymentId));
        } catch (err) {
            console.error("Error deleting payment:", err);
            alert("❌ Failed to delete payment");
        }
    };

    const totalReceived = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const balanceDue = contractValue - totalReceived;
    const netProfit = totalReceived - totalExpenses;
    const profitPercentage = contractValue > 0 ? ((netProfit / contractValue) * 100).toFixed(1) : 0;
    const receivedPercentage = contractValue > 0 ? ((totalReceived / contractValue) * 100).toFixed(1) : 0;

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const formatDate = (date) => {
        if (!date) return '';
        const d = date.toDate ? date.toDate() : new Date(date);
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <div className="fade-in">
            {/* Financial Overview Card */}
            <div className="card mb-lg" style={{ background: 'var(--primary-color)', color: 'white', border: 'none' }}>
                <div className="flex-between mb-md">
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Icons.Wallet size={28} /> Project Financials
                    </h3>
                    {isCEOUser && !editingContract && (
                        <button onClick={() => setEditingContract(true)} className="btn" style={{ background: 'white', color: 'var(--primary-color)', border: 'none', fontWeight: 'bold' }}>
                            <Icons.Edit size={16} /> Edit Contract
                        </button>
                    )}
                </div>

                {editingContract ? (
                    <div className="flex gap-sm" style={{ alignItems: 'center' }}>
                        <label style={{ fontWeight: 'bold' }}>Contract Value:</label>
                        <input
                            type="number"
                            value={contractValue}
                            onChange={(e) => setContractValue(e.target.value)}
                            placeholder="Enter contract value"
                            style={{ flex: 1, maxWidth: '200px' }}
                        />
                        <button onClick={handleSaveContractValue} className="btn btn-success">Save</button>
                        <button onClick={() => { setContractValue(site.contractValue || 0); setEditingContract(false); }} className="btn" style={{ background: 'white', color: 'var(--primary-color)', border: 'none' }}>Cancel</button>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                        <div>
                            <p style={{ opacity: 0.9, fontSize: '0.875rem', margin: '0 0 4px 0' }}>Contract Value</p>
                            <h2 style={{ margin: 0, color: 'white' }}>{formatCurrency(contractValue)}</h2>
                        </div>
                        <div>
                            <p style={{ opacity: 0.9, fontSize: '0.875rem', margin: '0 0 4px 0' }}>Total Received</p>
                            <h2 style={{ margin: 0, color: 'white' }}>{formatCurrency(totalReceived)} <span style={{ fontSize: '1rem', opacity: 0.8 }}>({receivedPercentage}%)</span></h2>
                            <div style={{ height: '6px', background: 'rgba(255,255,255,0.3)', borderRadius: '3px', marginTop: '8px' }}>
                                <div style={{ height: '100%', background: 'white', width: `${receivedPercentage}%`, borderRadius: '3px', transition: 'width 0.3s' }}></div>
                            </div>
                        </div>
                        <div>
                            <p style={{ opacity: 0.9, fontSize: '0.875rem', margin: '0 0 4px 0' }}>Balance Due</p>
                            <h2 style={{ margin: 0, color: 'white' }}>{formatCurrency(balanceDue)}</h2>
                        </div>
                    </div>
                )}
            </div>

            {/* Profit Summary */}
            <div className="card mb-lg">
                <h3 className="flex" style={{ alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <Icons.TrendingUp size={24} /> Profit Analysis
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                    <div className="flex" style={{ flexDirection: 'column' }}>
                        <span className="text-secondary" style={{ fontSize: '0.875rem' }}>Total Expenses</span>
                        <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--danger-color)' }}>{formatCurrency(totalExpenses)}</span>
                    </div>
                    <div className="flex" style={{ flexDirection: 'column' }}>
                        <span className="text-secondary" style={{ fontSize: '0.875rem' }}>Net Profit</span>
                        <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: netProfit >= 0 ? 'var(--success-color)' : 'var(--danger-color)' }}>
                            {formatCurrency(netProfit)}
                        </span>
                    </div>
                    <div className="flex" style={{ flexDirection: 'column' }}>
                        <span className="text-secondary" style={{ fontSize: '0.875rem' }}>Profit Margin</span>
                        <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: profitPercentage >= 0 ? 'var(--success-color)' : 'var(--danger-color)' }}>
                            {profitPercentage}%
                        </span>
                    </div>
                </div>
            </div>

            {/* Payment History */}
            <div className="flex-between mb-md">
                <h3 className="flex" style={{ alignItems: 'center', gap: '0.5rem' }}>
                    <Icons.Receipt size={24} /> Payment History
                </h3>
                {isCEOUser && (
                    <button onClick={() => setShowAddPayment(!showAddPayment)} className="btn btn-primary">
                        <Icons.Plus size={18} /> {showAddPayment ? 'Cancel' : 'Add Payment'}
                    </button>
                )}
            </div>

            {/* Add Payment Form */}
            {showAddPayment && (
                <form onSubmit={handleAddPayment} className="card mb-lg">
                    <h4>New Payment</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div>
                            <label>Amount *</label>
                            <input type="number" name="amount" required placeholder="₹ 0" min="0" step="0.01" />
                        </div>
                        <div>
                            <label>Date *</label>
                            <input type="date" name="date" required defaultValue={new Date().toISOString().split('T')[0]} />
                        </div>
                        <div>
                            <label>Payment Method *</label>
                            <select name="method" required>
                                <option value="cash">Cash</option>
                                <option value="bank">Bank Transfer</option>
                                <option value="cheque">Cheque</option>
                                <option value="upi">UPI</option>
                            </select>
                        </div>
                    </div>
                    <div style={{ marginTop: '1rem' }}>
                        <label>Notes</label>
                        <textarea name="notes" rows="2" placeholder="Payment description or milestone"></textarea>
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                        <Icons.Check size={18} /> Save Payment
                    </button>
                </form>
            )}

            {/* Payment List */}
            {loading ? (
                <div className="flex-center" style={{ minHeight: '20vh' }}>
                    <div className="loading-spinner"></div>
                </div>
            ) : payments.length === 0 ? (
                <div className="card flex-center" style={{ minHeight: '20vh', flexDirection: 'column', gap: '1rem', background: 'rgba(0,0,0,0.02)', border: '1px dashed var(--border-color)' }}>
                    <div style={{ opacity: 0.3 }}><Icons.Receipt size={48} /></div>
                    <p className="text-secondary">No payments recorded yet.</p>
                </div>
            ) : (
                <div className="card" style={{ padding: 0 }}>
                    {payments.map((payment, index) => (
                        <div key={payment.id} style={{
                            padding: '1rem 1.5rem',
                            borderBottom: index < payments.length - 1 ? '1px solid var(--border-color)' : 'none',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div style={{ flex: 1 }}>
                                <div className="flex gap-md" style={{ alignItems: 'center', marginBottom: '0.25rem' }}>
                                    <h4 style={{ margin: 0 }}>{formatCurrency(payment.amount)}</h4>
                                    <span className="badge">
                                        {payment.method === 'cash' && '💵 Cash'}
                                        {payment.method === 'bank' && '🏦 Bank'}
                                        {payment.method === 'cheque' && '📝 Cheque'}
                                        {payment.method === 'upi' && '📱 UPI'}
                                    </span>
                                </div>
                                <p className="text-secondary" style={{ fontSize: '0.875rem', margin: '0.25rem 0' }}>
                                    <Icons.Calendar size={14} /> {formatDate(payment.date)}
                                </p>
                                {payment.notes && (
                                    <p style={{ fontSize: '0.875rem', margin: '0.5rem 0 0 0', fontStyle: 'italic' }}>{payment.notes}</p>
                                )}
                            </div>
                            {isCEOUser && (
                                <button
                                    onClick={() => handleDeletePayment(payment.id)}
                                    className="btn btn-danger btn-small"
                                    title="Delete"
                                >
                                    <Icons.Trash size={14} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default React.memo(ClientPayments);
