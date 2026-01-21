import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import '../index.css';

const BarBendingSchedule = () => {
    const [schedule, setSchedule] = useState([]);
    const [currentBar, setCurrentBar] = useState({
        description: '',
        shape: 'stirrup', // stirrup, straight, crank
        dia: 8,
        noOfBars: 1,
        a: 0, // Dimension A (e.g., Width)
        b: 0, // Dimension B (e.g., Depth)
        cover: 40, // Clear cover in mm
        length: 0, // For straight bars
        hookLength: 0, // Custom hook length if needed
        spacing: 150, // Spacing for estimation (optional)
        memberLength: 0 // Length of member to calc no. of bars (optional)
    });

    const [modalOpen, setModalOpen] = useState(false); // For Symbol Legend

    // Constants
    const DENSITY = 7850; // kg/m^3 (approx, but we use D^2/162 formulation)

    // Unit weight calculation: D^2 / 162 (kg/m)
    const getUnitWeight = (d) => (d * d) / 162;

    const calculateValues = () => {
        let cutLen = 0;
        const { shape, dia, a, b, cover, length } = currentBar;
        const d = parseFloat(dia) || 0;
        const cov = parseFloat(cover) || 0;

        // Convert dimensions to mm for calculation if they are in different units? 
        // Assuming inputs are in mm for precision in BBS usually, 
        // but user might use convertor. Let's assume mm for now as standard for BBS.
        // We can add unit toggle later if needed. For now, we'll label inputs as mm.

        if (shape === 'stirrup') {
            // Rectangular Stirrup
            // Formula: 2 * (A + B) + Hook Lengths - Bend Deductions
            // Effective A = A - 2*cover
            // Effective B = B - 2*cover
            // Hook = 2 * 10d (for 135 deg) or 2 * 9d
            // Bend Deduction = 3 * 2d (for 90 deg bends) + 2 * 3d (for 135 deg hooks)?
            // simplified: 2(A+B) + 2(10d) - 3(2d) is a common approximation.
            // Let's use: L = 2(A_eff + B_eff) + 24d (approx generous) or standard 2(A+B)+...

            const A_eff = (parseFloat(a) || 0) - 2 * cov;
            const B_eff = (parseFloat(b) || 0) - 2 * cov;

            if (A_eff > 0 && B_eff > 0) {
                // Perimeter + Hooks (2 * 10d usually for 135deg) - Bends (3 * 2d for 90deg corners)
                // Total = 2 * (A_eff + B_eff) + 20*d - 6*d = 2(A+B) + 14d
                cutLen = 2 * (A_eff + B_eff) + 12 * d; // Simplified slightly
            }
        } else if (shape === 'straight') {
            // Straight Bar with Hooks option?
            // Usually L + 2 * 9d (for L-bends)
            cutLen = (parseFloat(length) || 0); // User enters full length usually
        } else if (shape === 'crank') {
            // Cranked Bar (Bent up)
            // L = Clear Span + Anchorages + 0.42*D (Inclined length extra) - Bends
            // Simplified: L + 0.42*d_slab (depth)
            // For this MVP, let's treat it as: Straight Length + Extra for Crank
            // We'll ask user for "Total Straight Length" and "Crank Height"
            const L = parseFloat(length) || 0;
            const H = parseFloat(a) || 0; // Crank Height
            cutLen = L + 0.42 * H;
        }

        // Convert to meters
        return cutLen / 1000;
    };

    const handleAdd = () => {
        const cutLengthM = calculateValues();
        if (cutLengthM <= 0) return alert("Please check dimensions");

        const unitWt = getUnitWeight(currentBar.dia);
        const totalLen = cutLengthM * currentBar.noOfBars;
        const totalWt = totalLen * unitWt;

        const newItem = {
            id: Date.now(),
            ...currentBar,
            cutLength: cutLengthM.toFixed(3),
            totalLength: totalLen.toFixed(2),
            totalWeight: totalWt.toFixed(2)
        };

        setSchedule([...schedule, newItem]);
        setCurrentBar({ ...currentBar, description: '', a: 0, b: 0, length: 0 }); // Reset mostly
    };

    const handleDelete = (id) => {
        setSchedule(schedule.filter(item => item.id !== id));
    };

    const getTotalWeight = () => {
        return schedule.reduce((sum, item) => sum + parseFloat(item.totalWeight), 0).toFixed(2);
    };

    return (
        <div className="card fade-in" style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div className="flex-between mb-lg" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <div className="flex gap-md items-center">
                    <Icons.TrendingUp size={28} style={{ color: 'var(--primary-color)' }} />
                    <div>
                        <h2 style={{ margin: 0 }}>Bar Bending Schedule</h2>
                        <p className="text-secondary" style={{ margin: 0, fontSize: '0.9rem' }}>Automated BBS Calculator & Book</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="badge badge-primary" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
                        Total Steel: {getTotalWeight()} kg
                    </div>
                    <button
                        onClick={() => setModalOpen(true)}
                        className="btn btn-ghost btn-small mt-sm"
                        style={{ display: 'block', width: '100%', textAlign: 'right', fontSize: '0.8rem' }}
                    >
                        ℹ️ Symbol Legend
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '2rem' }}>

                {/* INPUT SECTION */}
                <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '12px' }}>
                    <h3 className="mb-md">Add New Bar</h3>

                    <div className="input-group">
                        <label>Description (Location)</label>
                        <input
                            type="text"
                            placeholder="e.g. Beam B1 Bottom Bars"
                            value={currentBar.description}
                            onChange={e => setCurrentBar({ ...currentBar, description: e.target.value })}
                        />
                    </div>

                    <div className="flex gap-md mb-md">
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Shape</label>
                            <select
                                value={currentBar.shape}
                                onChange={e => setCurrentBar({ ...currentBar, shape: e.target.value })}
                                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px' }}
                            >
                                <option value="stirrup">⬜ Stirrup (Rect)</option>
                                <option value="straight">➖ Straight Bar</option>
                                <option value="crank">〰️ Crank / Bent-up</option>
                            </select>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Diameter (mm)</label>
                            <select
                                value={currentBar.dia}
                                onChange={e => setCurrentBar({ ...currentBar, dia: e.target.value })}
                                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px' }}
                            >
                                {[8, 10, 12, 16, 20, 25, 32].map(d => (
                                    <option key={d} value={d}>{d} mm</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="mb-md">
                        {/* Dynamic Inputs based on Shape */}
                        {currentBar.shape === 'stirrup' && (
                            <div className="grid-2-col gap-sm">
                                <div className="input-group">
                                    <label>Width (A) (mm)</label>
                                    <input type="number" value={currentBar.a} onChange={e => setCurrentBar({ ...currentBar, a: e.target.value })} placeholder="e.g. 300" />
                                </div>
                                <div className="input-group">
                                    <label>Depth (B) (mm)</label>
                                    <input type="number" value={currentBar.b} onChange={e => setCurrentBar({ ...currentBar, b: e.target.value })} placeholder="e.g. 450" />
                                </div>
                                <div className="input-group">
                                    <label>Cover (mm)</label>
                                    <input type="number" value={currentBar.cover} onChange={e => setCurrentBar({ ...currentBar, cover: e.target.value })} />
                                </div>
                            </div>
                        )}

                        {currentBar.shape === 'straight' && (
                            <div className="input-group">
                                <label>Total Length (mm)</label>
                                <input type="number" value={currentBar.length} onChange={e => setCurrentBar({ ...currentBar, length: e.target.value })} placeholder="e.g. 5000" />
                            </div>
                        )}

                        {currentBar.shape === 'crank' && (
                            <div className="grid-2-col gap-sm">
                                <div className="input-group">
                                    <label>Total Length (mm)</label>
                                    <input type="number" value={currentBar.length} onChange={e => setCurrentBar({ ...currentBar, length: e.target.value })} placeholder="e.g. 6000" />
                                </div>
                                <div className="input-group">
                                    <label>Bend Height (mm)</label>
                                    <input type="number" value={currentBar.a} onChange={e => setCurrentBar({ ...currentBar, a: e.target.value })} placeholder="Slab depth usually" />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="input-group">
                        <label>No. of Bars</label>
                        <div className="flex gap-sm">
                            <input
                                type="number"
                                value={currentBar.noOfBars}
                                onChange={e => setCurrentBar({ ...currentBar, noOfBars: e.target.value })}
                                style={{ flex: 1 }}
                            />
                            {currentBar.shape === 'stirrup' && (
                                <div className="text-muted text-small flex-center" style={{ width: '100px', lineHeight: 1 }}>
                                    (Enter total rings)
                                </div>
                            )}
                        </div>
                    </div>

                    <button className="btn btn-primary w-100" onClick={handleAdd}>
                        Add to Schedule
                    </button>

                    {/* Live Preview of Calculation */}
                    <div className="mt-md p-sm bg-white rounded text-center text-secondary" style={{ fontSize: '0.85rem' }}>
                        Cut Length: <strong>{calculateValues().toFixed(3)} m</strong> <br />
                        Unit Weight: <strong>{getUnitWeight(currentBar.dia).toFixed(3)} kg/m</strong>
                    </div>

                </div>

                {/* TABLE SECTION */}
                <div style={{ overflowX: 'auto' }}>
                    <table className="w-100" style={{ borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead>
                            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #e9ecef' }}>
                                <th style={{ padding: '10px', textAlign: 'left' }}>#</th>
                                <th style={{ padding: '10px', textAlign: 'left' }}>Description</th>
                                <th style={{ padding: '10px' }}>Shape</th>
                                <th style={{ padding: '10px' }}>Dia</th>
                                <th style={{ padding: '10px' }}>No.</th>
                                <th style={{ padding: '10px' }}>Cut Len (m)</th>
                                <th style={{ padding: '10px' }}>Total Wt (kg)</th>
                                <th style={{ padding: '10px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {schedule.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="text-center text-muted" style={{ padding: '2rem' }}>
                                        No items in schedule yet. Add a bar to start.
                                    </td>
                                </tr>
                            ) : (
                                schedule.map((item, idx) => (
                                    <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '10px' }}>{idx + 1}</td>
                                        <td style={{ padding: '10px' }}>{item.description}</td>
                                        <td style={{ padding: '10px', textAlign: 'center' }}>
                                            {item.shape === 'stirrup' && '⬜'}
                                            {item.shape === 'straight' && '➖'}
                                            {item.shape === 'crank' && '〰️'}
                                        </td>
                                        <td style={{ padding: '10px', textAlign: 'center' }}>{item.dia}</td>
                                        <td style={{ padding: '10px', textAlign: 'center' }}>{item.noOfBars}</td>
                                        <td style={{ padding: '10px', textAlign: 'center' }}>{item.cutLength}</td>
                                        <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold' }}>{item.totalWeight}</td>
                                        <td style={{ padding: '10px' }}>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="btn-ghost text-danger"
                                                style={{ padding: '4px' }}
                                            >
                                                <Icons.Trash size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        {schedule.length > 0 && (
                            <tfoot>
                                <tr style={{ background: '#f8f9fa', fontWeight: 'bold' }}>
                                    <td colSpan="6" style={{ padding: '10px', textAlign: 'right' }}>Total Project Steel:</td>
                                    <td style={{ padding: '10px', textAlign: 'center', color: 'var(--primary-color)' }}>{getTotalWeight()} kg</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* SYMBOL LEGEND MODAL */}
            {modalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', zIndex: 1000,
                    display: 'flex', justifyContent: 'center', alignItems: 'center'
                }}>
                    <div className="card fade-in" style={{ width: '90%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
                        <div className="flex-between mb-md">
                            <h3>Structural Symbols Legend</h3>
                            <button onClick={() => setModalOpen(false)} className="btn btn-ghost">✕</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="p-sm bg-light rounded flex gap-sm items-center">
                                <strong style={{ fontSize: '1.2rem' }}>X</strong>
                                <span>Void / Opening / Column Position</span>
                            </div>
                            <div className="p-sm bg-light rounded flex gap-sm items-center">
                                <strong style={{ fontSize: '1.2rem' }}>----</strong>
                                <span>Hidden Line / Beam Below</span>
                            </div>
                            <div className="p-sm bg-light rounded flex gap-sm items-center">
                                <strong style={{ fontSize: '1.2rem' }}>⌖</strong>
                                <span>Level Marker / Elevation</span>
                            </div>
                            <div className="p-sm bg-light rounded flex gap-sm items-center">
                                <strong style={{ fontSize: '1.2rem' }}>#</strong>
                                <span>Deformed Bar (TMT)</span>
                            </div>
                            <div className="p-sm bg-light rounded flex gap-sm items-center">
                                <strong style={{ fontSize: '1.2rem' }}>@</strong>
                                <span>Center to Center Spacing (c/c)</span>
                            </div>
                            <div className="p-sm bg-light rounded flex gap-sm items-center">
                                <strong style={{ fontSize: '1.2rem' }}>Ø</strong>
                                <span>Diameter (Dia)</span>
                            </div>
                        </div>
                        <div className="mt-lg">
                            <h4>Standard Bends</h4>
                            <p className="text-small text-secondary">
                                • 45° Bend: 1d deduction<br />
                                • 90° Bend: 2d deduction<br />
                                • 135° Hook: 3d deduction + 10d length<br />
                                • 180° Hook: 4d deduction
                            </p>
                        </div>
                        <button onClick={() => setModalOpen(false)} className="btn btn-primary w-100 mt-lg">Close</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BarBendingSchedule;
