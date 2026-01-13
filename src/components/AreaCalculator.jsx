import React, { useState, useRef, useEffect } from 'react';
import { Icons } from './Icons';
import '../index.css';

const AreaCalculator = () => {
    const [segments, setSegments] = useState([]);
    const [currentSegment, setCurrentSegment] = useState([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [showLengthInput, setShowLengthInput] = useState(false);
    const [currentLength, setCurrentLength] = useState('');
    const [totalArea, setTotalArea] = useState(0);
    const [inputUnit, setInputUnit] = useState('feet');
    const [outputUnit, setOutputUnit] = useState('sqft');
    const canvasRef = useRef(null);
    const [startPoint, setStartPoint] = useState(null);

    // Unit conversions to feet
    const toFeet = (value, unit) => {
        const conversions = {
            feet: 1,
            meter: 3.28084,
            cm: 0.0328084,
            inch: 0.0833333
        };
        return parseFloat(value) * conversions[unit];
    };

    // Area conversions from sq.ft
    const convertArea = (sqFt, unit) => {
        const conversions = {
            sqft: 1,
            sqm: 0.092903,
            cent: 0.00229568,
            acre: 0.0000229568
        };
        return sqFt * conversions[unit];
    };

    const calculateArea = (segmentsWithLengths) => {
        if (segmentsWithLengths.length < 3) return 0;

        const polygonPoints = [];
        let currentPoint = { x: 0, y: 0 };
        let currentAngle = 0;

        segmentsWithLengths.forEach((seg, index) => {
            polygonPoints.push({ ...currentPoint });

            const path = seg.path;
            if (path.length > 1) {
                const dx = path[path.length - 1].x - path[0].x;
                const dy = path[path.length - 1].y - path[0].y;
                currentAngle = Math.atan2(dy, dx);
            }

            // Convert to feet for calculation
            const lengthInFeet = toFeet(seg.length, seg.unit);
            currentPoint = {
                x: currentPoint.x + lengthInFeet * Math.cos(currentAngle),
                y: currentPoint.y + lengthInFeet * Math.sin(currentAngle)
            };
        });

        // Shoelace formula
        let area = 0;
        for (let i = 0; i < polygonPoints.length; i++) {
            const j = (i + 1) % polygonPoints.length;
            area += polygonPoints[i].x * polygonPoints[j].y;
            area -= polygonPoints[j].x * polygonPoints[i].y;
        }
        return Math.abs(area / 2);
    };

    const drawCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw grid
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        for (let i = 0; i < canvas.width; i += 20) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, canvas.height);
            ctx.stroke();
        }
        for (let i = 0; i < canvas.height; i += 20) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(canvas.width, i);
            ctx.stroke();
        }

        // Draw start point (magnetic target)
        if (startPoint && segments.length > 0) {
            ctx.fillStyle = 'rgba(16, 185, 129, 0.3)';
            ctx.beginPath();
            ctx.arc(startPoint.x, startPoint.y, 20, 0, 2 * Math.PI);
            ctx.fill();

            ctx.fillStyle = 'var(--success-color)';
            ctx.beginPath();
            ctx.arc(startPoint.x, startPoint.y, 6, 0, 2 * Math.PI);
            ctx.fill();
        }

        // Draw completed segments
        segments.forEach((seg, index) => {
            ctx.strokeStyle = 'var(--primary-color)';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            if (seg.path.length > 0) {
                ctx.beginPath();
                ctx.moveTo(seg.path[0].x, seg.path[0].y);
                seg.path.forEach(point => {
                    ctx.lineTo(point.x, point.y);
                });
                ctx.stroke();

                // Draw length label
                if (seg.length) {
                    const midIdx = Math.floor(seg.path.length / 2);
                    const midPoint = seg.path[midIdx];

                    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
                    ctx.fillRect(midPoint.x - 30, midPoint.y - 12, 60, 24);
                    ctx.fillStyle = 'var(--success-color)';
                    ctx.font = 'bold 11px Inter';
                    ctx.textAlign = 'center';
                    ctx.fillText(`${seg.length} ${seg.unit}`, midPoint.x, midPoint.y + 4);
                }
            }
        });

        // Draw current segment
        if (currentSegment.length > 0) {
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(currentSegment[0].x, currentSegment[0].y);
            currentSegment.forEach(point => {
                ctx.lineTo(point.x, point.y);
            });
            ctx.stroke();
        }
    };

    useEffect(() => {
        drawCanvas();
    }, [segments, currentSegment, startPoint]);

    const getCoordinates = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    const handleStart = (e) => {
        if (!isDrawing) return;
        e.preventDefault();
        const coords = getCoordinates(e);

        // Save first point as start point for magnetic snap
        if (segments.length === 0) {
            setStartPoint(coords);
        }

        setCurrentSegment([coords]);
    };

    const handleMove = (e) => {
        if (!isDrawing || currentSegment.length === 0) return;
        e.preventDefault();
        const coords = getCoordinates(e);
        setCurrentSegment(prev => [...prev, coords]);
    };

    const handleEnd = (e) => {
        if (!isDrawing || currentSegment.length === 0) return;
        e.preventDefault();

        const startPt = currentSegment[0];
        let endPt = currentSegment[currentSegment.length - 1];

        // MAGNETIC SNAP: Check if near starting point
        if (startPoint && segments.length >= 2) {
            const distance = Math.sqrt(
                Math.pow(endPt.x - startPoint.x, 2) +
                Math.pow(endPt.y - startPoint.y, 2)
            );

            // If within 30 pixels, snap to start point and auto-finish
            if (distance < 30) {
                endPt = startPoint;
                const straightLine = [startPt, endPt];
                setSegments(prev => [...prev, { path: straightLine, length: null, unit: inputUnit }]);
                setCurrentSegment([]);
                setShowLengthInput(true);
                return;
            }
        }

        // Normal straight line
        const straightLine = [startPt, endPt];
        setSegments(prev => [...prev, { path: straightLine, length: null, unit: inputUnit }]);
        setCurrentSegment([]);
        setShowLengthInput(true);
    };

    const saveLengthAndContinue = () => {
        if (!currentLength || parseFloat(currentLength) <= 0) {
            alert('Please enter a valid length');
            return;
        }

        setSegments(prev => {
            const updated = [...prev];
            updated[updated.length - 1].length = currentLength;
            updated[updated.length - 1].unit = inputUnit;
            return updated;
        });

        setCurrentLength('');
        setShowLengthInput(false);

        // Check if closed (last segment ends at start point)
        const lastSeg = segments[segments.length - 1];
        if (lastSeg && lastSeg.path.length > 1) {
            const lastPoint = lastSeg.path[lastSeg.path.length - 1];
            if (startPoint && Math.abs(lastPoint.x - startPoint.x) < 5 && Math.abs(lastPoint.y - startPoint.y) < 5) {
                // Auto-finish when closed
                setTimeout(() => finishPlot(), 300);
            }
        }
    };

    const finishPlot = () => {
        if (segments.length < 3) {
            alert('Need at least 3 sides to calculate area');
            return;
        }

        if (segments.some(seg => !seg.length)) {
            alert('Please enter length for all sides');
            return;
        }

        const areaSqFt = calculateArea(segments);
        setTotalArea(areaSqFt);
        setIsDrawing(false);
    };

    const reset = () => {
        setSegments([]);
        setCurrentSegment([]);
        setCurrentLength('');
        setShowLengthInput(false);
        setTotalArea(0);
        setIsDrawing(false);
        setStartPoint(null);
    };

    const startDrawing = () => {
        reset();
        setIsDrawing(true);
    };

    const getUnitLabel = (unit) => {
        const labels = {
            feet: 'feet',
            meter: 'meters (m)',
            cm: 'centimeters (cm)',
            inch: 'inches (in)'
        };
        return labels[unit];
    };

    const getOutputUnitLabel = (unit) => {
        const labels = {
            sqft: 'sq.ft',
            sqm: 'sq.m',
            cent: 'cent',
            acre: 'acre'
        };
        return labels[unit];
    };

    return (
        <div className="card mb-lg" style={{ background: 'linear-gradient(135deg, #f6f8fb 0%, #ffffff 100%)' }}>
            <div className="flex-between mb-md">
                <h3 className="flex" style={{ alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                    <Icons.Building size={24} /> Area Calculator
                </h3>
                <button onClick={reset} className="btn btn-secondary btn-small">
                    Clear All
                </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Unit Selectors */}
                <div className="flex gap-sm" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
                    <div className="flex gap-sm" style={{ alignItems: 'center' }}>
                        <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Input Unit:</label>
                        <select
                            value={inputUnit}
                            onChange={(e) => setInputUnit(e.target.value)}
                            style={{ padding: '0.5rem', borderRadius: '6px', fontSize: '0.875rem' }}
                        >
                            <option value="feet">Feet</option>
                            <option value="meter">Meters</option>
                            <option value="cm">Centimeters</option>
                            <option value="inch">Inches</option>
                        </select>
                    </div>

                    <div className="flex gap-sm" style={{ alignItems: 'center' }}>
                        <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Result Unit:</label>
                        <select
                            value={outputUnit}
                            onChange={(e) => setOutputUnit(e.target.value)}
                            style={{ padding: '0.5rem', borderRadius: '6px', fontSize: '0.875rem' }}
                        >
                            <option value="sqft">Square Feet (sq.ft)</option>
                            <option value="sqm">Square Meters (sq.m)</option>
                            <option value="cent">Cent</option>
                            <option value="acre">Acre</option>
                        </select>
                    </div>
                </div>

                <canvas
                    ref={canvasRef}
                    width={600}
                    height={400}
                    onMouseDown={handleStart}
                    onMouseMove={handleMove}
                    onMouseUp={handleEnd}
                    onTouchStart={handleStart}
                    onTouchMove={handleMove}
                    onTouchEnd={handleEnd}
                    style={{
                        border: '3px solid var(--border-color)',
                        borderRadius: '12px',
                        cursor: isDrawing ? 'crosshair' : 'default',
                        maxWidth: '100%',
                        background: 'white',
                        touchAction: 'none'
                    }}
                />

                {showLengthInput && (
                    <div className="card" style={{ padding: '1.5rem', background: 'var(--accent-color)', color: 'white' }}>
                        <h4 style={{ margin: 0, marginBottom: '1rem', color: 'white' }}>
                            📏 Enter Length of Side {segments.length}
                        </h4>
                        <div className="flex gap-sm">
                            <input
                                type="number"
                                value={currentLength}
                                onChange={(e) => setCurrentLength(e.target.value)}
                                placeholder="e.g., 25"
                                autoFocus
                                style={{ flex: 1 }}
                                onKeyPress={(e) => e.key === 'Enter' && saveLengthAndContinue()}
                            />
                            <span style={{ alignSelf: 'center', fontWeight: 600 }}>{getUnitLabel(inputUnit)}</span>
                            <button onClick={saveLengthAndContinue} className="btn btn-success">
                                ✓ Next
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
                    {!isDrawing ? (
                        <button onClick={startDrawing} className="btn btn-primary">
                            <Icons.Plus size={18} /> Start Drawing
                        </button>
                    ) : (
                        <>
                            <div style={{
                                padding: '0.75rem 1rem',
                                background: 'rgba(59, 130, 246, 0.1)',
                                borderRadius: '8px',
                                fontWeight: 600,
                                flex: 1,
                                fontSize: '0.875rem'
                            }}>
                                ✏️ Side {segments.length + 1} | 🧲 Draw near start point to auto-close
                            </div>
                            {segments.length >= 3 && !showLengthInput && (
                                <button onClick={finishPlot} className="btn btn-success">
                                    <Icons.Check size={18} /> Finish
                                </button>
                            )}
                        </>
                    )}
                </div>

                {segments.length > 0 && isDrawing && (
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        Sides: {segments.filter(s => s.length).length} / {segments.length}
                    </div>
                )}

                {totalArea > 0 && (
                    <div className="card" style={{ background: 'var(--success-color)', color: 'white', padding: '1.5rem' }}>
                        <h2 style={{ margin: 0, marginBottom: '0.5rem' }}>📐 Total Area</h2>
                        <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>
                            {convertArea(totalArea, outputUnit).toFixed(4)} {getOutputUnitLabel(outputUnit)}
                        </div>
                        <div style={{ fontSize: '0.875rem', opacity: 0.8, marginTop: '0.5rem' }}>
                            = {totalArea.toFixed(2)} sq.ft | {convertArea(totalArea, 'sqm').toFixed(2)} sq.m
                        </div>
                    </div>
                )}

                <div className="text-center text-secondary" style={{ fontSize: '0.75rem' }}>
                    💡 Tip: Draw each side, enter length, repeat. Draw near start to auto-close!
                </div>
            </div>
        </div>
    );
};

export default AreaCalculator;
