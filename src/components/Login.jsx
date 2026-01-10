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
        <div className="flex-center" style={{ minHeight: '100vh', padding: '1rem', background: 'var(--bg-main)' }}>
            {/* Firebase Configuration Error */}
            {firebaseError && (
                <div className="card fade-in" style={{ maxWidth: '500px', width: '100%', border: '2px solid var(--danger-color)', marginBottom: '2rem' }}>
                    <h2 style={{ color: 'var(--danger-color)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Icons.Alert size={24} /> Configuration Required
                    </h2>
                    <p style={{ marginBottom: '1rem' }}>
                        The application requires Firebase credentials to function. Please set up your <code>.env</code> file with the following keys:
                    </p>
                    <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontFamily: 'monospace', fontSize: '0.85rem', overflowX: 'auto', border: '1px solid var(--border-color)' }}>
                        <pre style={{ margin: 0 }}>
                            {`VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_ADMIN_SIGNUP_CODE=...`}
                        </pre>
                    </div>
                    <button
                        onClick={() => setFirebaseError(false)}
                        className="btn btn-secondary"
                        style={{ width: '100%' }}
                    >
                        I've configured it, refresh app
                    </button>
                </div>
            )}

            <div className="card fade-in" style={{ maxWidth: '420px', width: '100%', padding: '2.5rem' }}>
                <div className="text-center mb-lg">
                    <div style={{ color: 'var(--primary-color)', marginBottom: '1rem' }}>
                        <Icons.Construction size={48} />
                    </div>
                    <h1 style={{ marginBottom: '0.5rem', fontSize: '1.75rem' }}>BR CONSTRUCTION</h1>
                    <p className="text-secondary">
                        {isSignup ? 'Create your professional account' : 'Sign in to your project dashboard'}
                    </p>
                </div>

                {/* Auth Method Toggle */}
                <div className="flex mb-lg" style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '4px', border: '1px solid var(--border-color)' }}>
                    <button
                        type="button"
                        className={`btn ${authMethod === 'email' ? 'btn-primary' : ''}`}
                        style={{ flex: 1, background: authMethod === 'email' ? '' : 'transparent', boxShadow: 'none', color: authMethod === 'email' ? 'white' : 'var(--text-secondary)' }}
                        onClick={() => { setAuthMethod('email'); setError(''); }}
                    >
                        Email
                    </button>
                    <button
                        type="button"
                        className={`btn ${authMethod === 'phone' ? 'btn-primary' : ''}`}
                        style={{ flex: 1, background: authMethod === 'phone' ? '' : 'transparent', boxShadow: 'none', color: authMethod === 'phone' ? 'white' : 'var(--text-secondary)' }}
                        onClick={() => { setAuthMethod('phone'); setError(''); }}
                    >
                        Phone
                    </button>
                </div>

                {authMethod === 'email' && (
                    <form onSubmit={handleEmailAuth}>
                        <div className="input-group">
                            <label>Email Address</label>
                            <input
                                type="email"
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="input-group">
                            <label>Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    style={{ paddingRight: '40px' }}
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
                                />
                            </div>
                        )}

                        {error && <div className="text-danger mb-md" style={{ fontSize: '0.875rem' }}>{error}</div>}

                        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
                            {loading ? <span className="loading-spinner-small"></span> : (isSignup ? 'Create Account' : 'Sign In')}
                        </button>
                    </form>
                )}

                {authMethod === 'phone' && step === 'input' && (
                    <form onSubmit={handlePhoneSend}>
                        <div className="input-group">
                            <label>Phone Number</label>
                            <input
                                type="tel"
                                placeholder="+91 98765 43210"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                required
                            />
                        </div>
                        <div id="recaptcha-container" style={{ marginBottom: '1rem' }}></div>

                        {error && <div className="text-danger mb-md" style={{ fontSize: '0.875rem' }}>{error}</div>}

                        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                            {loading ? <span className="loading-spinner-small"></span> : 'Send Verification Code'}
                        </button>
                    </form>
                )}

                {authMethod === 'phone' && step === 'verify' && (
                    <form onSubmit={handlePhoneVerify}>
                        <div className="input-group">
                            <label>Verification Code</label>
                            <input
                                type="text"
                                placeholder="000000"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                required
                                style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '1.25rem', fontWeight: 700 }}
                            />
                        </div>

                        {error && <div className="text-danger mb-md" style={{ fontSize: '0.875rem' }}>{error}</div>}

                        <button type="submit" className="btn btn-success" style={{ width: '100%' }} disabled={loading}>
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
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}
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
