import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import '../index.css';

const ConcreteCalculator = () => {
    const [shape, setShape] = useState('box'); // 'box', 'slab', 'cylinder'
    const [unit, setUnit] = useState('feet'); // 'feet', 'meters'
    const [mixRatio, setMixRatio] = useState('M20'); // 'M10', 'M15', 'M20', 'M25', 'Custom'

    // Custom Mix State
    const [customCement, setCustomCement] = useState(1);
    const [customSand, setCustomSand] = useState(1.5);
    const [customAgg, setCustomAgg] = useState(3);

    // Dimensions State
    const [length, setLength] = useState('');
    const [width, setWidth] = useState('');
    const [height, setHeight] = useState(''); // or Thickness for slab, Depth for footing
    const [diameter, setDiameter] = useState('');

    // Results State
    const [results, setResults] = useState(null);

    // Constants
    const DRY_VOLUME_COEFF = 1.54;
    const CEMENT_DENSITY = 1440; // kg/m3
    const BAG_WEIGHT = 50; // kg

    const MIX_RATIOS = {
        'M10': { c: 1, s: 3, a: 6 },
        'M15': { c: 1, s: 2, a: 4 },
        'M20': { c: 1, s: 1.5, a: 3 },
        'M25': { c: 1, s: 1, a: 2 }
    };

    const calculateMaterials = () => {
        // 1. Calculate Wet Volume in Cubic Meters
        let wetVol = 0;
        let l = parseFloat(length) || 0;
        let w = parseFloat(width) || 0;
        let h = parseFloat(height) || 0;
        let d = parseFloat(diameter) || 0;

        if (unit === 'feet') {
            l *= 0.3048;
            w *= 0.3048;
            h *= 0.3048;
            d *= 0.3048;
        }

        if (shape === 'cylinder') {
            const r = d / 2;
            wetVol = Math.PI * r * r * h;
        } else {
            // Box or Slab (same logic L*W*H)
            wetVol = l * w * h;
        }

        if (wetVol === 0) {
            setResults(null);
            return;
        }

        // 2. Convert to Dry Volume
        const dryVol = wetVol * DRY_VOLUME_COEFF;

        // 3. Get Ratios
        let cRatio, sRatio, aRatio;
        if (mixRatio === 'Custom') {
            cRatio = parseFloat(customCement) || 0;
            sRatio = parseFloat(customSand) || 0;
            aRatio = parseFloat(customAgg) || 0;
        } else {
            const ratio = MIX_RATIOS[mixRatio];
            cRatio = ratio.c;
            sRatio = ratio.s;
            aRatio = ratio.a;
        }

        const sumRatio = cRatio + sRatio + aRatio;
        if (sumRatio === 0) return;

        // 4. Calculate Quantities
        // Cement Volume = (Dry Vol * C Ratio) / Sum Ratio
        const cementVol = (dryVol * cRatio) / sumRatio;
        const cementWeight = cementVol * CEMENT_DENSITY;
        const cementBags = cementWeight / BAG_WEIGHT;

        // Sand Volume
        const sandVolm3 = (dryVol * sRatio) / sumRatio;
        const sandVolcft = sandVolm3 * 35.3147;

        // Aggregate Volume
        const aggVolm3 = (dryVol * aRatio) / sumRatio;
        const aggVolcft = aggVolm3 * 35.3147;

        setResults({
            wetVol: unit === 'feet' ? wetVol * 35.3147 : wetVol, // Show in input unit (CFT or Cu.m) roughly
            cementBags: Math.ceil(cementBags),
            sand: sandVolcft.toFixed(2),
            aggregate: aggVolcft.toFixed(2)
        });
    };

    // Auto-calculate on input change
    useEffect(() => {
        calculateMaterials();
    }, [shape, unit, mixRatio, length, width, height, diameter, customCement, customSand, customAgg]);

    return (
        <div className="card" style={{ background: 'linear-gradient(to right bottom, #ffffff, #f8f9fa)' }}>
            <div className="flex-between mb-lg">
                <h3 className="flex" style={{ alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                    <Icons.Layers size={24} style={{ color: 'var(--primary-color)' }} />
                    Concrete Calculator
                </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>

                {/* INPUTS SECTION */}
                <div>
                    <h4 className="mb-md text-secondary">Structure Details</h4>

                    {/* Shape & Unit Selection */}
                    <div className="flex gap-md mb-md">
                        <div style={{ flex: 1 }}>
                            <label className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Shape</label>
                            <select
                                value={shape}
                                onChange={(e) => setShape(e.target.value)}
                                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                            >
                                <option value="box">Box / Column / Beam</option>
                                <option value="slab">Floor Slab</option>
                                <option value="cylinder">Round Column</option>
                            </select>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Unit</label>
                            <select
                                value={unit}
                                onChange={(e) => setUnit(e.target.value)}
                                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                            >
                                <option value="feet">Feet (ft)</option>
                                <option value="meters">Meters (m)</option>
                            </select>
                        </div>
                    </div>

                    {/* Dimensions Inputs */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                        {shape === 'cylinder' ? (
                            <>
                                <div className="input-group">
                                    <label>Diameter</label>
                                    <input type="number" value={diameter} onChange={e => setDiameter(e.target.value)} placeholder="0" />
                                </div>
                                <div className="input-group">
                                    <label>Height / Depth</label>
                                    <input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="0" />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="input-group">
                                    <label>Length</label>
                                    <input type="number" value={length} onChange={e => setLength(e.target.value)} placeholder="0" />
                                </div>
                                <div className="input-group">
                                    <label>Width</label>
                                    <input type="number" value={width} onChange={e => setWidth(e.target.value)} placeholder="0" />
                                </div>
                                <div className="input-group" style={{ gridColumn: 'span 2' }}>
                                    <label>{shape === 'slab' ? 'Thickness' : 'Height / Depth'}</label>
                                    <input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="0" />
                                </div>
                            </>
                        )}
                    </div>

                    <h4 className="mb-md text-secondary">Mix Design</h4>
                    <div className="mb-lg">
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '1rem' }}>
                            {['M10', 'M15', 'M20', 'M25', 'Custom'].map(grade => (
                                <button
                                    key={grade}
                                    onClick={() => setMixRatio(grade)}
                                    className={`btn btn-small ${mixRatio === grade ? 'btn-primary' : 'btn-secondary'}`}
                                    style={{ flex: 1, minWidth: '60px' }}
                                >
                                    {grade}
                                </button>
                            ))}
                        </div>

                        {mixRatio === 'Custom' ? (
                            <div className="flex gap-sm items-center" style={{ background: '#f1f5f9', padding: '10px', borderRadius: '8px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.75rem' }}>Cement</label>
                                    <input type="number" value={customCement} onChange={e => setCustomCement(e.target.value)} />
                                </div>
                                <div style={{ fontWeight: 'bold' }}>:</div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.75rem' }}>Sand</label>
                                    <input type="number" value={customSand} onChange={e => setCustomSand(e.target.value)} />
                                </div>
                                <div style={{ fontWeight: 'bold' }}>:</div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.75rem' }}>Agg.</label>
                                    <input type="number" value={customAgg} onChange={e => setCustomAgg(e.target.value)} />
                                </div>
                            </div>
                        ) : (
                            <div className="text-secondary" style={{ fontSize: '0.9rem', padding: '8px', background: '#f8fafc', borderRadius: '6px', textAlign: 'center' }}>
                                Ratio (Cement : Sand : Aggregate) = <strong>
                                    {MIX_RATIOS[mixRatio].c} : {MIX_RATIOS[mixRatio].s} : {MIX_RATIOS[mixRatio].a}
                                </strong>
                            </div>
                        )}
                    </div>
                </div>

                {/* RESULTS SECTION */}
                <div style={{ background: '#f0f9ff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #bae6fd', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <h3 className="text-primary mb-lg text-center">Estimated Materials</h3>

                    {results ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div className="flex-between" style={{ borderBottom: '1px solid #e0f2fe', paddingBottom: '1rem' }}>
                                <div className="flex gap-sm items-center">
                                    <div style={{ background: '#fff', padding: '8px', borderRadius: '50%' }}>🧱</div>
                                    <span style={{ fontWeight: 600 }}>Cement Bags</span>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div className="text-primary" style={{ fontSize: '1.5rem', fontWeight: 700 }}>{results.cementBags}</div>
                                    <div className="text-secondary" style={{ fontSize: '0.8rem' }}>bags (50kg)</div>
                                </div>
                            </div>

                            <div className="flex-between" style={{ borderBottom: '1px solid #e0f2fe', paddingBottom: '1rem' }}>
                                <div className="flex gap-sm items-center">
                                    <div style={{ background: '#fff', padding: '8px', borderRadius: '50%' }}>🏖️</div>
                                    <span style={{ fontWeight: 600 }}>Sand</span>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{results.sand}</div>
                                    <div className="text-secondary" style={{ fontSize: '0.8rem' }}>cubic feet</div>
                                </div>
                            </div>

                            <div className="flex-between">
                                <div className="flex gap-sm items-center">
                                    <div style={{ background: '#fff', padding: '8px', borderRadius: '50%' }}>🪨</div>
                                    <span style={{ fontWeight: 600 }}>Aggregate</span>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{results.aggregate}</div>
                                    <div className="text-secondary" style={{ fontSize: '0.8rem' }}>cubic feet</div>
                                </div>
                            </div>

                            <div className="text-muted text-center mt-lg" style={{ fontSize: '0.75rem' }}>
                                *Calculations based on dry volume coefficient of 1.54
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-muted" style={{ padding: '2rem 0' }}>
                            Enter dimensions to see material estimates.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ConcreteCalculator;
