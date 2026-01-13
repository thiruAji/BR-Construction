import React, { useState, useRef, useEffect } from 'react';
import { Icons } from './Icons';
import '../index.css';

const AreaCalculator = () => {
    const [segments, setSegments] = useState([]); // Array of {path: [{x,y}...], length: number}
    const [currentSegment, setCurrentSegment] = useState([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [showLengthInput, setShowLengthInput] = useState(false);
    const [currentLength, setCurrentLength] = useState('');
    const [totalArea, setTotalArea] = useState(0);
    const canvasRef = useRef(null);

    const calculateArea = (segmentsWithLengths) => {
        if (segmentsWithLengths.length < 3) return 0;

        // Build polygon from segments and actual lengths
        const polygonPoints = [];
        let currentPoint = { x: 0, y: 0 };
        let currentAngle = 0;

        segmentsWithLengths.forEach((seg, index) => {
            polygonPoints.push({ ...currentPoint });

            // Calculate angle from drawn path
            const path = seg.path;
            if (path.length > 1) {
                const dx = path[path.length - 1].x - path[0].x;
                const dy = path[path.length - 1].y - path[0].y;
                currentAngle = Math.atan2(dy, dx);
            }

            // Move by actual length in that direction
            const actualLength = parseFloat(seg.length) || 0;
            currentPoint = {
                x: currentPoint.x + actualLength * Math.cos(currentAngle),
                y: currentPoint.y + actualLength * Math.sin(currentAngle)
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
                    ctx.fillRect(midPoint.x - 25, midPoint.y - 12, 50, 24);
                    ctx.fillStyle = 'var(--success-color)';
                    ctx.font = 'bold 12px Inter';
                    ctx.textAlign = 'center';
                    ctx.fillText(`${seg.length} ft`, midPoint.x, midPoint.y + 4);
                }
            }
        });

        // Draw current segment being drawn
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
    }, [segments, currentSegment]);

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

        // AUTO-STRAIGHTEN: Convert drawn path to straight line
        const startPoint = currentSegment[0];
        const endPoint = currentSegment[currentSegment.length - 1];

        // Create perfectly straight line
        const straightLine = [startPoint, endPoint];

        // Save segment with straight line
        setSegments(prev => [...prev, { path: straightLine, length: null }]);
        setCurrentSegment([]);
        setShowLengthInput(true);
    };

    const saveLengthAndContinue = () => {
        if (!currentLength || parseFloat(currentLength) <= 0) {
            alert('Please enter a valid length');
            return;
        }

        // Update last segment with length
        setSegments(prev => {
            const updated = [...prev];
            updated[updated.length - 1].length = currentLength;
            return updated;
        });

        setCurrentLength('');
        setShowLengthInput(false);
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

        const area = calculateArea(segments);
        setTotalArea(area);
        setIsDrawing(false);
    };

    const reset = () => {
        setSegments([]);
        setCurrentSegment([]);
        setCurrentLength('');
        setShowLengthInput(false);
        setTotalArea(0);
        setIsDrawing(false);
    };

    const startDrawing = () => {
        reset();
        setIsDrawing(true);
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

                {/* Length Input Popup */}
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
                            <span style={{ alignSelf: 'center', fontWeight: 600 }}>feet</span>
                            <button onClick={saveLengthAndContinue} className="btn btn-success">
                                ✓ Next Side
                            </button>
                        </div>
                    </div>
                )}

                {/* Status and Actions */}
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
                                ✏️ Side {segments.length + 1}: Draw with finger → Enter length → Continue
                            </div>
                            {segments.length >= 3 && !showLengthInput && (
                                <button onClick={finishPlot} className="btn btn-success">
                                    <Icons.Check size={18} /> Finish & Calculate
                                </button>
                            )}
                        </>
                    )}
                </div>

                {/* Progress */}
                {segments.length > 0 && isDrawing && (
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        Sides completed: {segments.filter(s => s.length).length} / {segments.length}
                    </div>
                )}

                {/* Result */}
                {totalArea > 0 && (
                    <div className="card" style={{ background: 'var(--success-color)', color: 'white', padding: '1.5rem' }}>
                        <h2 style={{ margin: 0, marginBottom: '0.5rem' }}>📐 Total Area</h2>
                        <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>
                            {totalArea.toFixed(2)} sq.ft
                        </div>
                        <div style={{ fontSize: '1.25rem', opacity: 0.9, marginTop: '0.5rem' }}>
                            {(totalArea * 0.0929).toFixed(2)} sq.m
                        </div>
                    </div>
                )}

                <div className="text-center text-secondary" style={{ fontSize: '0.75rem' }}>
                    💡 Tip: Draw each side with your finger, then enter its actual length in feet!
                </div>
            </div>
        </div>
    );
};

export default AreaCalculator;
