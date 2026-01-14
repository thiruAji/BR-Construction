import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { isConfigured } from '../firebase';
import { Icons } from './Icons';
import '../index.css';

const Login = () => {
    const [authMethod, setAuthMethod] = useState('email'); // 'email' or 'phone'
    const [isSignup, setIsSignup] = useState(false);

    // Form states
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [secretCode, setSecretCode] = useState(''); // For CEO role

    const [step, setStep] = useState('input'); // 'input' or 'verify' (for phone)
    const [confirmationResult, setConfirmationResult] = useState(null);

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [firebaseError, setFirebaseError] = useState(!isConfigured());

    const { loginEmail, signupEmail, setupRecaptcha, sendPhoneOtp } = useAuth();

    // Initialize Recaptcha for Phone Auth
    useEffect(() => {
        if (authMethod === 'phone' && step === 'input') {
            try {
                setupRecaptcha('recaptcha-container');
            } catch (e) {
                console.error("Recaptcha setup failed", e);
            }
        }
    }, [authMethod, step]);

    const handleEmailAuth = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isSignup) {
                await signupEmail(email, password, secretCode);
            } else {
                await loginEmail(email, password);
            }
        } catch (err) {
            setError(err.message.replace('Firebase: ', ''));
        }
        setLoading(false);
    };

    const handlePhoneSend = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const confirmation = await sendPhoneOtp(phone);
            setConfirmationResult(confirmation);
            setStep('verify');
        } catch (err) {
            console.error("Phone Auth Error:", err);
            let msg = err.message.replace('Firebase: ', '');
            if (msg.includes('billing') || msg.includes('quota')) {
                msg = "⚠️ SMS limit reached or billing not enabled. Please use a TEST PHONE NUMBER defined in Firebase Console.";
            }
            setError(msg);
        }
        setLoading(false);
    };

    const handlePhoneVerify = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await confirmationResult.confirm(otp);
        } catch (err) {
            setError(err.message.replace('Firebase: ', ''));
        }
        setLoading(false);
    };

    return (
        <div className="tiled-background">
            <div className="glass-card fade-in">
                {/* Firebase Configuration Error */}
                {firebaseError && (
                    <div style={{ border: '2px solid var(--danger-color)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', background: '#fef2f2' }}>
                        <h3 style={{ color: 'var(--danger-color)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}>
                            <Icons.Alert size={20} /> Configuration Required
                        </h3>
                        <p style={{ fontSize: '0.875rem', marginBottom: '1rem', color: 'var(--danger-color)' }}>
                            Missing Firebase credentials in <code>.env</code> file.
                        </p>
                        <button
                            onClick={() => setFirebaseError(false)}
                            className="btn btn-secondary"
                            style={{ width: '100%', padding: '0.5rem' }}
                        >
                            Retry Connection
                        </button>
                    </div>
                )}

                <div className="text-center mb-lg">
                    <div style={{ color: 'var(--primary-color)', marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                        <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: '50%', boxShadow: 'var(--shadow-sm)' }}>
                            <Icons.Construction size={48} />
                        </div>
                    </div>
                    <h1 style={{ marginBottom: '0.5rem', fontSize: '2rem', letterSpacing: '-0.03em', color: 'var(--primary-dark)' }}>BR CONSTRUCTION</h1>
                    <p className="text-secondary" style={{ fontSize: '1rem' }}>
                        {isSignup ? 'Join the team and start building.' : 'Welcome back to the site.'}
                    </p>
                </div>

                {/* Auth Method Toggle */}
                <div className="flex mb-lg" style={{ background: 'var(--bg-main)', borderRadius: 'var(--radius-md)', padding: '4px' }}>
                    <button
                        type="button"
                        className={`btn`}
                        style={{
                            flex: 1,
                            background: authMethod === 'email' ? 'white' : 'transparent',
                            boxShadow: authMethod === 'email' ? 'var(--shadow-sm)' : 'none',
                            color: authMethod === 'email' ? 'var(--primary-color)' : 'var(--text-secondary)',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: 600
                        }}
                        onClick={() => { setAuthMethod('email'); setError(''); }}
                    >
                        Email
                    </button>
                    <button
                        type="button"
                        className={`btn`}
                        style={{
                            flex: 1,
                            background: authMethod === 'phone' ? 'white' : 'transparent',
                            boxShadow: authMethod === 'phone' ? 'var(--shadow-sm)' : 'none',
                            color: authMethod === 'phone' ? 'var(--primary-color)' : 'var(--text-secondary)',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: 600
                        }}
                        onClick={() => { setAuthMethod('phone'); setError(''); }}
                    >
                        Phone
                    </button>
                </div>

                {authMethod === 'email' && (
                    <form onSubmit={handleEmailAuth}>
                        <div className="input-group">
                            <label style={{ marginBottom: '0.5rem', display: 'block', fontWeight: 600 }}>Email Address</label>
                            <input
                                type="email"
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                style={{ padding: '0.75rem 1rem', background: '#f8fafc' }}
                            />
                        </div>
                        <div className="input-group">
                            <label style={{ marginBottom: '0.5rem', display: 'block', fontWeight: 600 }}>Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    style={{ paddingRight: '40px', padding: '0.75rem 1rem', paddingRight: '40px', background: '#f8fafc' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute',
                                        right: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: 'var(--text-muted)'
                                    }}
                                >
                                    {showPassword ? <Icons.EyeOff size={18} /> : <Icons.Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {isSignup && (
                            <div className="input-group">
                                <label>CEO Access Code (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="Enter code for administrative access"
                                    value={secretCode}
                                    onChange={(e) => setSecretCode(e.target.value)}
                                    style={{ padding: '0.75rem 1rem', background: '#f8fafc' }}
                                />
                            </div>
                        )}

                        {error && <div className="text-danger mb-md" style={{ fontSize: '0.875rem' }}>{error}</div>}

                        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem', padding: '0.875rem', fontWeight: 600 }} disabled={loading}>
                            {loading ? <span className="loading-spinner-small"></span> : (isSignup ? 'Create Account' : 'Sign In')}
                        </button>
                    </form>
                )}

                {authMethod === 'phone' && step === 'input' && (
                    <form onSubmit={handlePhoneSend}>
                        <div className="input-group">
                            <label style={{ marginBottom: '0.5rem', display: 'block', fontWeight: 600 }}>Phone Number</label>
                            <input
                                type="tel"
                                placeholder="+91 98765 43210"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                required
                                style={{ padding: '0.75rem 1rem', background: '#f8fafc' }}
                            />
                        </div>
                        <div id="recaptcha-container" style={{ marginBottom: '1rem' }}></div>

                        {error && <div className="text-danger mb-md" style={{ fontSize: '0.875rem' }}>{error}</div>}

                        <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.875rem', fontWeight: 600 }} disabled={loading}>
                            {loading ? <span className="loading-spinner-small"></span> : 'Send Verification Code'}
                        </button>
                    </form>
                )}

                {authMethod === 'phone' && step === 'verify' && (
                    <form onSubmit={handlePhoneVerify}>
                        <div className="input-group">
                            <label style={{ marginBottom: '0.5rem', display: 'block', fontWeight: 600 }}>Verification Code</label>
                            <input
                                type="text"
                                placeholder="000000"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                required
                                style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '1.25rem', fontWeight: 700, padding: '0.75rem', background: '#f8fafc' }}
                            />
                        </div>

                        {error && <div className="text-danger mb-md" style={{ fontSize: '0.875rem' }}>{error}</div>}

                        <button type="submit" className="btn btn-success" style={{ width: '100%', padding: '0.875rem', fontWeight: 600 }} disabled={loading}>
                            {loading ? <span className="loading-spinner-small"></span> : 'Verify & Sign In'}
                        </button>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ width: '100%', marginTop: '0.75rem' }}
                            onClick={() => setStep('input')}
                        >
                            Back
                        </button>
                    </form>
                )}

                {authMethod === 'email' && (
                    <div className="text-center mt-lg">
                        <button
                            className="text-primary"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9375rem', fontWeight: 600 }}
                            onClick={() => setIsSignup(!isSignup)}
                        >
                            {isSignup ? 'Already have an account? Sign In' : 'Need an account? Create one'}
                        </button>
                    </div>
                )}
            </div>

            {/* Loading Overlay */}
            {loading && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'rgba(15, 23, 42, 0.8)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 9999,
                    flexDirection: 'column',
                    color: 'white',
                    backdropFilter: 'blur(8px)'
                }}>
                    <div className="loading-spinner" style={{ marginBottom: '1.5rem' }}></div>
                    <h2 style={{ marginBottom: '0.5rem' }}>Authenticating...</h2>
                    <p style={{ opacity: 0.7 }}>Please wait while we verify your credentials.</p>
                </div>
            )}
        </div>
    );
};

export default React.memo(Login);
