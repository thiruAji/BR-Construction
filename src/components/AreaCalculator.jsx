import React, { useState, useRef, useEffect } from 'react';
import { Icons } from './Icons';
import '../index.css';

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
