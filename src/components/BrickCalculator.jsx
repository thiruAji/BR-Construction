
import React, { useState, useRef } from 'react';
import { Icons } from './Icons';
import '../index.css';

const BrickCalculator = () => {
    // Inputs
    const [length, setLength] = useState('');
    const [height, setHeight] = useState('');
    const [thickness, setThickness] = useState('9'); // 4 or 9 inches
    const [unit, setUnit] = useState('feet'); // feet or meters

    // Advanced Inputs
    const [deductionArea, setDeductionArea] = useState('0'); // For doors/windows
    const [mortarRatio, setMortarRatio] = useState('1:6'); // 1:6 or 1:4

    // Custom Brick Size (in mm) - Standard Molecular is 190x90x90
    const [brickL, setBrickL] = useState('190');
    const [brickW, setBrickW] = useState('90');
    const [brickH, setBrickH] = useState('90');

    // Local Preview
    const [previewUrl, setPreviewUrl] = useState(null);
    const fileInputRef = useRef(null);

    // Results
    const [result, setResult] = useState(null);

    const handleCalculate = () => {
        // 1. Convert everything to consistent units (meters)
        let L = parseFloat(length);
        let H = parseFloat(height);
        let T_inch = parseFloat(thickness);
        let deduct = parseFloat(deductionArea);

        if (isNaN(L) || isNaN(H)) {
            alert("Please enter valid length and height");
            return;
        }

        // Convert dimensions to meters
        let L_m = unit === 'feet' ? L * 0.3048 : L;
        let H_m = unit === 'feet' ? H * 0.3048 : H;

        let wallThickness_m = (T_inch * 0.0254); // Convert inches to meters

        // Calculate Wall Volume (Cu.m)
        let totalArea_m2 = L_m * H_m;
        // Deduction (assuming input is in same unit system sq.feet or sq.meters)
        let deduct_m2 = unit === 'feet' ? deduct * 0.092903 : deduct;

        let netArea_m2 = totalArea_m2 - deduct_m2;
        if (netArea_m2 < 0) netArea_m2 = 0;

        let totalWallVolume_m3 = netArea_m2 * wallThickness_m;

        // 2. Brick Calculation
        // Size with mortar (approx 10mm joint)
        let bL = parseFloat(brickL) + 10;
        let bW = parseFloat(brickW) + 10;
        let bH = parseFloat(brickH) + 10;

        // Volume of one brick with mortar (in m3) - Convert mm to m
        let oneBrickVol_m3 = (bL / 1000) * (bW / 1000) * (bH / 1000);

        // Total Bricks
        let numBricks = totalWallVolume_m3 / oneBrickVol_m3;

        // 3. Mortar Calculation
        // Volume of actual bricks without mortar
        let actualBrickVol_m3 = (parseFloat(brickL) / 1000) * (parseFloat(brickW) / 1000) * (parseFloat(brickH) / 1000);
        let totalActualBricksVol = numBricks * actualBrickVol_m3;

        // Wet Mortar Volume
        let wetMortarVol = totalWallVolume_m3 - totalActualBricksVol;

        // Dry Mortar Volume (increase by 33% for frog filling & wastage + 30% for dry volume ?? Standard is +33%)
        // Actually, dry volume of mortar is considered 1.33 times wet volume.
        let dryMortarVol = wetMortarVol * 1.33;

        // Ratio Sum
        let [cementParts, sandParts] = mortarRatio.split(':').map(Number);
        let totalParts = cementParts + sandParts;

        // Cement
        let cementVol = (cementParts / totalParts) * dryMortarVol;
        let cementBags = cementVol / 0.0347; // 1 bag = 0.0347 m3 (approx 35L) or 1440kg/m3

        // Sand
        let sandVol_m3 = (sandParts / totalParts) * dryMortarVol;
        let sandVol_cft = sandVol_m3 * 35.3147; // Convert to cubic feet

        setResult({
            bricks: Math.ceil(numBricks),
            cement: cementBags.toFixed(1),
            sand_m3: sandVol_m3.toFixed(2),
            sand_cft: sandVol_cft.toFixed(1),
            wallVol: totalWallVolume_m3.toFixed(2)
        });
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    return (
        <div className="fade-in">
            <div className="card mb-lg" style={{ borderTop: '4px solid var(--primary-color)' }}>
                <div className="flex-between mb-md">
                    <div className="flex gap-md">
                        <div className="text-primary"><Icons.Brick size={28} /></div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Brick Calculator</h2>
                            <p className="text-secondary" style={{ fontSize: '0.875rem' }}>Estimate bricks, cement & sand</p>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: previewUrl ? '1fr 1fr' : '1fr', gap: '2rem' }}>

                    {/* LEFT COLUMN: Controls */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                        {/* Reference Plan Section */}
                        <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px' }}>
                            <div className="flex-between mb-sm">
                                <label style={{ fontWeight: 600 }}>Reference Plan (Local View)</label>
                                <button
                                    onClick={() => fileInputRef.current.click()}
                                    className="btn btn-secondary btn-small"
                                >
                                    {previewUrl ? 'Change Plan' : 'Select Plan'}
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    accept="image/*,application/pdf"
                                    style={{ display: 'none' }}
                                />
                            </div>
                            {!previewUrl && (
                                <p className="text-muted" style={{ fontSize: '0.8rem' }}>
                                    Select a 2D plan from your device to view it side-by-side while calculating.
                                    Nothing is uploaded.
                                </p>
                            )}
                        </div>

                        {/* Wall Dimensions */}
                        <div>
                            <h4 className="mb-sm text-primary">1. Wall Dimensions</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="input-group">
                                    <label>Total Length</label>
                                    <div className="flex">
                                        <input
                                            type="number"
                                            value={length}
                                            onChange={(e) => setLength(e.target.value)}
                                            placeholder="0"
                                            style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                                        />
                                        <select
                                            value={unit}
                                            onChange={(e) => setUnit(e.target.value)}
                                            style={{ width: '80px', borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderLeft: 'none' }}
                                        >
                                            <option value="feet">ft</option>
                                            <option value="meters">m</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="input-group">
                                    <label>Height</label>
                                    <input
                                        type="number"
                                        value={height}
                                        onChange={(e) => setHeight(e.target.value)}
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Wall Thickness & Deduction */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="input-group">
                                <label>Wall Thickness</label>
                                <select
                                    value={thickness}
                                    onChange={(e) => setThickness(e.target.value)}
                                >
                                    <option value="4">4 inches (Partition)</option>
                                    <option value="9">9 inches (Main Wall)</option>
                                    <option value="13.5">14 inches (Load Bearing)</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label>Deductions (Sq.{unit === 'feet' ? 'ft' : 'm'})</label>
                                <input
                                    type="number"
                                    value={deductionArea}
                                    onChange={(e) => setDeductionArea(e.target.value)}
                                    placeholder="Door/Window area"
                                />
                            </div>
                        </div>

                        {/* Advanced Settings Toggle */}
                        <details>
                            <summary style={{ cursor: 'pointer', color: 'var(--primary-color)', fontSize: '0.9rem' }}>Advanced Settings (Brick Size & Ratio)</summary>
                            <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                                <div className="input-group mb-md">
                                    <label>Mortar Ratio (Cement : Sand)</label>
                                    <div className="flex gap-md">
                                        <label className="flex gap-sm" style={{ fontWeight: 'normal' }}>
                                            <input
                                                type="radio"
                                                name="ratio"
                                                checked={mortarRatio === '1:4'}
                                                onChange={() => setMortarRatio('1:4')}
                                            /> 1 : 4 (Strong)
                                        </label>
                                        <label className="flex gap-sm" style={{ fontWeight: 'normal' }}>
                                            <input
                                                type="radio"
                                                name="ratio"
                                                checked={mortarRatio === '1:6'}
                                                onChange={() => setMortarRatio('1:6')}
                                            /> 1 : 6 (Standard)
                                        </label>
                                    </div>
                                </div>

                                <label className="mb-sm block">Brick Size (mm)</label>
                                <div className="flex gap-sm">
                                    <div className="input-group">
                                        <input type="number" value={brickL} onChange={(e) => setBrickL(e.target.value)} placeholder="L" />
                                    </div>
                                    <div className="input-group">
                                        <input type="number" value={brickW} onChange={(e) => setBrickW(e.target.value)} placeholder="W" />
                                    </div>
                                    <div className="input-group">
                                        <input type="number" value={brickH} onChange={(e) => setBrickH(e.target.value)} placeholder="H" />
                                    </div>
                                </div>
                            </div>
                        </details>

                        <button
                            onClick={handleCalculate}
                            className="btn btn-primary"
                            style={{ marginTop: '1rem' }}
                        >
                            <Icons.Brick size={20} /> Calculate Materials
                        </button>
                    </div>

                    {/* RIGHT COLUMN: Preview & Results */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                        {/* Preview Area */}
                        {previewUrl && (
                            <div style={{
                                height: '300px',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                position: 'relative',
                                background: '#f5f5f5'
                            }}>
                                <div style={{
                                    position: 'absolute',
                                    top: 0, left: 0, right: 0,
                                    padding: '4px 8px',
                                    background: 'rgba(0,0,0,0.7)',
                                    color: 'white',
                                    fontSize: '0.75rem',
                                    zIndex: 10
                                }}>
                                    Reference Plan View
                                </div>
                                <img
                                    src={previewUrl}
                                    alt="Plan Reference"
                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                />
                            </div>
                        )}

                        {/* Result Card */}
                        {result && (
                            <div className="card fade-in" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                                <h3 className="mb-md" style={{ color: '#0369a1' }}>Estimation Results</h3>

                                <div style={{ display: 'grid', gap: '1rem' }}>
                                    <div className="flex-between p-sm" style={{ background: 'white', borderRadius: '6px' }}>
                                        <span className="text-secondary">🧱 Total Bricks</span>
                                        <strong style={{ fontSize: '1.2rem', color: 'var(--primary-color)' }}>{result.bricks} nos</strong>
                                    </div>

                                    <div className="flex-between p-sm" style={{ background: 'white', borderRadius: '6px' }}>
                                        <span className="text-secondary">🏗️ Cement (50kg bags)</span>
                                        <strong style={{ fontSize: '1.2rem' }}>{result.cement} bags</strong>
                                    </div>

                                    <div className="flex-between p-sm" style={{ background: 'white', borderRadius: '6px' }}>
                                        <span className="text-secondary">🏖️ Sand Quantity</span>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: 600 }}>{result.sand_cft} cft</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{result.sand_m3} m³</div>
                                        </div>
                                    </div>
                                </div>

                                <p className="text-muted mt-md" style={{ fontSize: '0.8rem', fontStyle: 'italic' }}>
                                    * Includes standard % for wastage and frog filling.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BrickCalculator;
