import React, { useState } from 'react';
import { Icons } from './Icons';
import '../index.css';

const MeasurementConverter = () => {
    const [feet, setFeet] = useState('');
    const [inches, setInches] = useState('');
    const [cm, setCm] = useState('');
    const [mm, setMm] = useState('');
    const [meters, setMeters] = useState('');

    // Conversion constants (all based on feet)
    const FEET_TO_INCHES = 12;
    const FEET_TO_CM = 30.48;
    const FEET_TO_MM = 304.8;
    const FEET_TO_METERS = 0.3048;

    const updateFromFeet = (value) => {
        const val = parseFloat(value) || 0;
        setFeet(value);
        setInches(val > 0 ? (val * FEET_TO_INCHES).toFixed(2) : '');
        setCm(val > 0 ? (val * FEET_TO_CM).toFixed(2) : '');
        setMm(val > 0 ? (val * FEET_TO_MM).toFixed(2) : '');
        setMeters(val > 0 ? (val * FEET_TO_METERS).toFixed(4) : '');
    };

    const updateFromInches = (value) => {
        const val = parseFloat(value) || 0;
        setInches(value);
        const feetVal = val / FEET_TO_INCHES;
        setFeet(val > 0 ? feetVal.toFixed(4) : '');
        setCm(val > 0 ? (feetVal * FEET_TO_CM).toFixed(2) : '');
        setMm(val > 0 ? (feetVal * FEET_TO_MM).toFixed(2) : '');
        setMeters(val > 0 ? (feetVal * FEET_TO_METERS).toFixed(4) : '');
    };

    const updateFromCm = (value) => {
        const val = parseFloat(value) || 0;
        setCm(value);
        const feetVal = val / FEET_TO_CM;
        setFeet(val > 0 ? feetVal.toFixed(4) : '');
        setInches(val > 0 ? (feetVal * FEET_TO_INCHES).toFixed(2) : '');
        setMm(val > 0 ? (feetVal * FEET_TO_MM).toFixed(2) : '');
        setMeters(val > 0 ? (feetVal * FEET_TO_METERS).toFixed(4) : '');
    };

    const updateFromMm = (value) => {
        const val = parseFloat(value) || 0;
        setMm(value);
        const feetVal = val / FEET_TO_MM;
        setFeet(val > 0 ? feetVal.toFixed(4) : '');
        setInches(val > 0 ? (feetVal * FEET_TO_INCHES).toFixed(2) : '');
        setCm(val > 0 ? (feetVal * FEET_TO_CM).toFixed(2) : '');
        setMeters(val > 0 ? (feetVal * FEET_TO_METERS).toFixed(4) : '');
    };

    const updateFromMeters = (value) => {
        const val = parseFloat(value) || 0;
        setMeters(value);
        const feetVal = val / FEET_TO_METERS;
        setFeet(val > 0 ? feetVal.toFixed(4) : '');
        setInches(val > 0 ? (feetVal * FEET_TO_INCHES).toFixed(2) : '');
        setCm(val > 0 ? (feetVal * FEET_TO_CM).toFixed(2) : '');
        setMm(val > 0 ? (feetVal * FEET_TO_MM).toFixed(2) : '');
    };

    const clearAll = () => {
        setFeet('');
        setInches('');
        setCm('');
        setMm('');
        setMeters('');
    };

    const CircleInput = ({ label, value, onChange, color, size = 'medium' }) => {
        return (
            <div className="circle-wrapper">
                <div
                    className={`circle-input circle-size-${size}`}
                    style={{ border: `3px solid ${color}` }}
                >
                    <label style={{ color: color }}>
                        {label}
                    </label>
                    <input
                        type="number"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="0"
                        step="any"
                    />
                </div>
            </div>
        );
    };

    return (
        <div className="card mb-lg" style={{ background: 'linear-gradient(135deg, #f6f8fb 0%, #ffffff 100%)' }}>
            <div className="flex-between mb-md">
                <h3 className="flex" style={{ alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                    <Icons.TrendingUp size={24} style={{ transform: 'rotate(45deg)' }} /> Measurement Converter
                </h3>
                <button onClick={clearAll} className="btn btn-secondary btn-small">
                    Clear All
                </button>
            </div>

            <div className="converter-container">
                {/* Top: Inches */}
                <div style={{ position: 'relative' }}>
                    <CircleInput
                        label="Inches"
                        value={inches}
                        onChange={updateFromInches}
                        color="#FF6B6B"
                    />
                </div>

                {/* Middle Row: CM, FEET (center), MM */}
                <div className="converter-row">
                    <CircleInput
                        label="CM"
                        value={cm}
                        onChange={updateFromCm}
                        color="#4ECDC4"
                    />

                    <CircleInput
                        label="FEET"
                        value={feet}
                        onChange={updateFromFeet}
                        color="var(--primary-color)"
                        size="large"
                    />

                    <CircleInput
                        label="MM"
                        value={mm}
                        onChange={updateFromMm}
                        color="#FFD93D"
                    />
                </div>

                {/* Bottom: Meters */}
                <div style={{ position: 'relative' }}>
                    <CircleInput
                        label="Meters"
                        value={meters}
                        onChange={updateFromMeters}
                        color="#6BCB77"
                    />
                </div>

                {/* Connection Lines (decorative) */}
                <svg style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    opacity: 0.1,
                    zIndex: 0
                }}>
                    <circle cx="50%" cy="50%" r="120" fill="none" stroke="var(--primary-color)" strokeWidth="2" strokeDasharray="5,5" />
                </svg>
            </div>

            <div className="text-center text-secondary" style={{ fontSize: '0.75rem', marginTop: '1rem' }}>
                💡 Tip: Type a value in any circle to convert instantly!
            </div>
        </div>
    );
};

export default MeasurementConverter;
