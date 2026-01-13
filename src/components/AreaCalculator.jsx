import React, { useState, useRef, useEffect } from 'react';
import { Icons } from './Icons';
import '../index.css';

const AreaCalculator = () => {
    const [points, setPoints] = useState([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [totalArea, setTotalArea] = useState(0);
    const [scale, setScale] = useState(10); // 1 pixel = 10 feet
    const canvasRef = useRef(null);
    const [currentPath, setCurrentPath] = useState([]);

    const calculateArea = (pts) => {
        if (pts.length < 3) return 0;

        // Shoelace formula for polygon area
        let area = 0;
        for (let i = 0; i < pts.length; i++) {
            const j = (i + 1) % pts.length;
            area += pts[i].x * pts[j].y;
            area -= pts[j].x * pts[i].y;
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

        // Draw current path while drawing
        if (currentPath.length > 0) {
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(currentPath[0].x, currentPath[0].y);
            currentPath.forEach(point => {
                ctx.lineTo(point.x, point.y);
            });
            ctx.stroke();
        }

        // Draw completed polygon
        if (points.length > 0 && !isDrawing) {
            ctx.strokeStyle = 'var(--primary-color)';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);

            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x, points[i].y);
            }

            ctx.closePath();
            ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
            ctx.fill();
            ctx.stroke();

            // Draw corner points
            points.forEach((point, index) => {
                ctx.fillStyle = 'var(--accent-color)';
                ctx.beginPath();
                ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
                ctx.fill();
            });
        }
    };

    useEffect(() => {
        drawCanvas();
    }, [points, currentPath, isDrawing]);

    const getCoordinates = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();

        // Support both mouse and touch
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
        setCurrentPath([coords]);
    };

    const handleMove = (e) => {
        if (!isDrawing || currentPath.length === 0) return;
        e.preventDefault();
        const coords = getCoordinates(e);
        setCurrentPath(prev => [...prev, coords]);
    };

    const handleEnd = (e) => {
        if (!isDrawing || currentPath.length === 0) return;
        e.preventDefault();

        // Simplify path - take every Nth point for cleaner polygon
        const simplified = [];
        const skipFactor = Math.max(1, Math.floor(currentPath.length / 50));
        for (let i = 0; i < currentPath.length; i += skipFactor) {
            simplified.push(currentPath[i]);
        }

        setPoints(simplified);
        setCurrentPath([]);
        setIsDrawing(false);

        // Calculate area
        const pixelArea = calculateArea(simplified);
        const sqFeet = (pixelArea / (scale * scale));
        setTotalArea(sqFeet);
    };

    const reset = () => {
        setPoints([]);
        setCurrentPath([]);
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
                {/* Scale selector */}
                <div className="flex gap-sm" style={{ alignItems: 'center' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Scale:</label>
                    <select
                        value={scale}
                        onChange={(e) => setScale(Number(e.target.value))}
                        style={{ padding: '0.5rem', borderRadius: '4px' }}
                    >
                        <option value={5}>1 inch = 5 feet</option>
                        <option value={10}>1 inch = 10 feet (Default)</option>
                        <option value={20}>1 inch = 20 feet</option>
                        <option value={50}>1 inch = 50 feet</option>
                    </select>
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

                <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
                    {!isDrawing ? (
                        <button onClick={startDrawing} className="btn btn-primary">
                            <Icons.Plus size={18} /> Draw Plot with Finger
                        </button>
                    ) : (
                        <div style={{
                            padding: '1rem',
                            background: 'var(--accent-color)',
                            color: 'white',
                            borderRadius: '8px',
                            fontWeight: 600,
                            flex: 1
                        }}>
                            ✏️ Draw the outline of your plot with your finger/mouse → Release to finish
                        </div>
                    )}
                </div>

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
                    💡 Tip: Drag your finger/mouse to trace the plot outline. Area calculates automatically!
                </div>
            </div>
        </div>
    );
};

export default AreaCalculator;


const AreaCalculator = () => {
    const [points, setPoints] = useState([]);
    const [currentLength, setCurrentLength] = useState('');
    const [showInput, setShowInput] = useState(false);
    const [totalArea, setTotalArea] = useState(0);
    const [isDrawing, setIsDrawing] = useState(false);
    const canvasRef = useRef(null);

    const calculateArea = (pts) => {
        if (pts.length < 3) return 0;

        // Shoelace formula for polygon area
        let area = 0;
        for (let i = 0; i < pts.length; i++) {
            const j = (i + 1) % pts.length;
            area += pts[i].x * pts[j].y;
            area -= pts[j].x * pts[i].y;
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

        // Draw polygon
        if (points.length > 0) {
            ctx.strokeStyle = 'var(--primary-color)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);

            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x, points[i].y);
            }

            if (points.length > 2) {
                ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
                ctx.fill();
            }
            ctx.stroke();

            // Draw points
            points.forEach((point, index) => {
                ctx.fillStyle = 'var(--accent-color)';
                ctx.beginPath();
                ctx.arc(point.x, point.y, 6, 0, 2 * Math.PI);
                ctx.fill();

                // Draw length labels
                if (index > 0 && point.length) {
                    const prevPoint = points[index - 1];
                    const midX = (point.x + prevPoint.x) / 2;
                    const midY = (point.y + prevPoint.y) / 2;

                    ctx.fillStyle = 'white';
                    ctx.fillRect(midX - 20, midY - 10, 40, 20);
                    ctx.fillStyle = 'var(--primary-color)';
                    ctx.font = 'bold 12px Inter';
                    ctx.textAlign = 'center';
                    ctx.fillText(`${point.length}'`, midX, midY + 4);
                }
            });
        }
    };

    useEffect(() => {
        drawCanvas();
    }, [points]);

    const handleCanvasClick = (e) => {
        if (!isDrawing) return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (points.length === 0) {
            setPoints([{ x, y, length: 0 }]);
        } else {
            setShowInput(true);
        }
    };

    const addPoint = () => {
        if (!currentLength || parseFloat(currentLength) <= 0) {
            alert('Please enter a valid length');
            return;
        }

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();

        // For simplicity, draw in the direction of last move
        const lastPoint = points[points.length - 1];
        const angle = Math.random() * Math.PI * 2; // Random for demo
        const length = parseFloat(currentLength) * 10; // Scale factor

        const newX = lastPoint.x + Math.cos(angle) * length;
        const newY = lastPoint.y + Math.sin(angle) * length;

        setPoints([...points, { x: newX, y: newY, length: currentLength }]);
        setCurrentLength('');
        setShowInput(false);

        // Calculate area
        const newPoints = [...points, { x: newX, y: newY, length: currentLength }];
        const area = calculateArea(newPoints);
        setTotalArea(area);
    };

    const finishPlot = () => {
        if (points.length < 3) {
            alert('Need at least 3 points to calculate area');
            return;
        }

        const area = calculateArea(points);
        setTotalArea(area);
        setIsDrawing(false);
    };

    const reset = () => {
        setPoints([]);
        setCurrentLength('');
        setShowInput(false);
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
                    onClick={handleCanvasClick}
                    style={{
                        border: '2px solid var(--border-color)',
                        borderRadius: '8px',
                        cursor: isDrawing ? 'crosshair' : 'default',
                        maxWidth: '100%',
                        background: 'white'
                    }}
                />

                {showInput && (
                    <div className="card" style={{ padding: '1rem', background: 'var(--accent-color)', color: 'white' }}>
                        <label style={{ marginBottom: '0.5rem', display: 'block' }}>Enter length (feet):</label>
                        <div className="flex gap-sm">
                            <input
                                type="number"
                                value={currentLength}
                                onChange={(e) => setCurrentLength(e.target.value)}
                                placeholder="e.g., 25"
                                autoFocus
                                style={{ flex: 1 }}
                            />
                            <button onClick={addPoint} className="btn btn-success">
                                Add Line
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
                    {!isDrawing ? (
                        <button onClick={startDrawing} className="btn btn-primary">
                            <Icons.Plus size={18} /> Start Drawing Plot
                        </button>
                    ) : (
                        <>
                            <button onClick={finishPlot} className="btn btn-success">
                                <Icons.Check size={18} /> Finish & Calculate
                            </button>
                            <button onClick={reset} className="btn btn-secondary">
                                Cancel
                            </button>
                        </>
                    )}
                </div>

                {totalArea > 0 && (
                    <div className="card" style={{ background: 'var(--success-color)', color: 'white', padding: '1.5rem' }}>
                        <h2 style={{ margin: 0, marginBottom: '0.5rem' }}>📐 Total Area</h2>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                            {(totalArea / 100).toFixed(2)} sq.ft
                        </div>
                        <div style={{ fontSize: '1rem', opacity: 0.9, marginTop: '0.5rem' }}>
                            {((totalArea / 100) * 0.0929).toFixed(2)} sq.m
                        </div>
                    </div>
                )}

                <div className="text-center text-secondary" style={{ fontSize: '0.75rem' }}>
                    💡 Tip: Click on canvas to start, enter length after each line, then finish to calculate!
                </div>
            </div>
        </div>
    );
};

export default AreaCalculator;
