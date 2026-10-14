import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, CheckCircle, AlertCircle, Loader2, ArrowLeft, RefreshCw, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';

const RazorpayTest = () => {
    const [gatewayMode, setGatewayMode] = useState('live'); // 'live' or 'test'
    const [amount, setAmount] = useState('10'); // Default ₹10 live test order
    const [customerName, setCustomerName] = useState('Test Driver');
    const [customerEmail, setCustomerEmail] = useState('test@trackmeisters.in');
    const [customerPhone, setCustomerPhone] = useState('9876543210');
    
    const [scriptLoaded, setScriptLoaded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState(null);
    const [paymentResult, setPaymentResult] = useState(null);

    // Dynamically load Razorpay SDK
    useEffect(() => {
        if (window.Razorpay) {
            setScriptLoaded(true);
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = () => setScriptLoaded(true);
        script.onerror = () => setError('Failed to load Razorpay SDK. Please check your internet connection.');
        document.body.appendChild(script);

        return () => {
            // Optional cleanup if needed
        };
    }, []);

    const handleCreateAndPay = async (e) => {
        e?.preventDefault();
        setError(null);
        setPaymentResult(null);

        if (!scriptLoaded || !window.Razorpay) {
            setError('Razorpay SDK is still loading. Please wait a moment.');
            return;
        }

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            setError('Please enter a valid test amount (e.g. ₹1).');
            return;
        }

        setLoading(true);

        try {
            // Step 1: Create Order via Netlify serverless function
            const orderRes = await fetch('/api/create-razorpay-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: numAmount,
                    receipt: `test_${Date.now()}`,
                    notes: {
                        test_order: 'true',
                        customer_name: customerName,
                        purpose: 'Razorpay Dev Mode Live Test'
                    },
                    mode: gatewayMode
                })
            });

            if (!orderRes.ok) {
                const errData = await orderRes.json().catch(() => ({}));
                throw new Error(errData.error || errData.details || `Order creation failed (${orderRes.status})`);
            }

            const orderData = await orderRes.json();

            // Step 2: Open Razorpay Checkout modal
            const options = {
                key: orderData.key_id,
                amount: orderData.amount,
                currency: orderData.currency || 'INR',
                name: 'Trackmeisters',
                description: `Test Order - ₹${numAmount}`,
                image: 'https://trackmeisters.in/trackicon.webp',
                order_id: orderData.order_id,
                handler: async function (response) {
                    // Step 3: Payment Authorized -> Verify signature with backend
                    setVerifying(true);
                    setLoading(false);

                    try {
                        const verifyRes = await fetch('/api/verify-razorpay-payment', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                mode: gatewayMode
                            })
                        });

                        const verifyData = await verifyRes.json();
                        if (verifyRes.ok && verifyData.verified) {
                            setPaymentResult({
                                status: 'success',
                                payment_id: response.razorpay_payment_id,
                                order_id: response.razorpay_order_id,
                                amount: numAmount,
                                mode: orderData.is_test ? 'TEST MODE' : 'LIVE MODE'
                            });
                        } else {
                            setError('Payment signature verification failed: ' + (verifyData.error || 'Unknown error'));
                        }
                    } catch (verifyErr) {
                        setError('Signature verification failed: ' + verifyErr.message);
                    } finally {
                        setVerifying(false);
                    }
                },
                prefill: {
                    name: customerName,
                    email: customerEmail,
                    contact: customerPhone
                },
                notes: {
                    order_source: 'Trackmeisters Test Sandbox'
                },
                theme: {
                    color: '#e10600'
                },
                modal: {
                    ondismiss: function () {
                        setLoading(false);
                    }
                }
            };

            const rzpInstance = new window.Razorpay(options);
            rzpInstance.on('payment.failed', function (resp) {
                setLoading(false);
                setError(`Payment Failed: ${resp.error.description} (${resp.error.code})`);
            });
            rzpInstance.open();

        } catch (err) {
            console.error('Payment Error:', err);
            setError(err.message || 'Error initiating payment');
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(180deg, #0a0a0a 0%, #111 100%)',
            color: '#fff',
            padding: '100px 20px 60px',
            fontFamily: "'Outfit', sans-serif"
        }}>
            <div style={{ maxWidth: '640px', margin: '0 auto' }}>
                
                {/* Back button */}
                <Link to="/" style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#888',
                    textDecoration: 'none',
                    fontSize: '14px',
                    marginBottom: '24px',
                    transition: 'color 0.2s'
                }}>
                    <ArrowLeft size={16} /> Back to Trackmeisters
                </Link>

                {/* Test Isolation Banner */}
                <div style={{
                    background: 'rgba(59, 130, 246, 0.08)',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                    borderRadius: '12px',
                    padding: '14px 18px',
                    marginBottom: '24px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    color: '#93c5fd'
                }}>
                    <Shield size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#60a5fa' }} />
                    <div>
                        <strong>Isolated Test Sandbox:</strong> This test order runs independently without altering event registrations or existing checkout code. You can easily remove this route when finished testing.
                    </div>
                </div>

                {/* Card Container */}
                <div style={{
                    background: 'var(--color-surface, #141414)',
                    border: '1px solid var(--color-border, #262626)',
                    borderRadius: '16px',
                    padding: '32px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <div>
                            <span style={{
                                display: 'inline-block',
                                background: 'rgba(234, 179, 8, 0.15)',
                                color: '#facc15',
                                padding: '4px 10px',
                                borderRadius: '20px',
                                fontSize: '11px',
                                fontWeight: '700',
                                textTransform: 'uppercase',
                                letterSpacing: '0.8px',
                                marginBottom: '8px'
                            }}>
                                Dev Mode Sandbox
                            </span>
                            <h1 style={{ fontSize: '26px', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' }}>
                                Razorpay Test Order
                            </h1>
                        </div>
                        <div style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '12px',
                            background: 'rgba(225, 6, 0, 0.12)',
                            color: '#e10600',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <CreditCard size={22} />
                        </div>
                    </div>

                    <p style={{ color: '#aaa', fontSize: '14px', lineHeight: '1.6', marginBottom: '28px' }}>
                        Test order creation and signature verification end-to-end. In Test Mode, you can use Razorpay's simulated UPI / Card test credentials.
                    </p>

                    {/* SUCCESS STATE */}
                    {paymentResult && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                                background: 'rgba(34, 197, 94, 0.1)',
                                border: '1px solid rgba(34, 197, 94, 0.3)',
                                borderRadius: '12px',
                                padding: '24px',
                                marginBottom: '28px',
                                textAlign: 'center'
                            }}
                        >
                            <CheckCircle size={40} color="#22c55e" style={{ margin: '0 auto 12px' }} />
                            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#22c55e', margin: '0 0 6px' }}>
                                Payment & Signature Verified!
                            </h3>
                            <p style={{ color: '#cbd5e1', fontSize: '13px', marginBottom: '16px' }}>
                                The test order was completed and cryptographic HMAC-SHA256 signature was verified by the server.
                            </p>
                            <div style={{
                                background: 'rgba(0,0,0,0.4)',
                                borderRadius: '8px',
                                padding: '14px',
                                textAlign: 'left',
                                fontSize: '12px',
                                fontFamily: 'monospace',
                                color: '#ddd',
                                lineHeight: '1.8'
                            }}>
                                <div><strong>Mode:</strong> {paymentResult.mode}</div>
                                <div><strong>Amount:</strong> ₹{paymentResult.amount}</div>
                                <div><strong>Payment ID:</strong> {paymentResult.payment_id}</div>
                                <div><strong>Order ID:</strong> {paymentResult.order_id}</div>
                            </div>
                            <button
                                onClick={() => setPaymentResult(null)}
                                style={{
                                    marginTop: '16px',
                                    background: 'transparent',
                                    border: '1px solid #22c55e',
                                    color: '#22c55e',
                                    borderRadius: '6px',
                                    padding: '8px 16px',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    fontWeight: '600'
                                }}
                            >
                                Run Another Test
                            </button>
                        </motion.div>
                    )}

                    {/* ERROR ALERT */}
                    {error && (
                        <div style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '10px',
                            padding: '14px',
                            color: '#f87171',
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px',
                            marginBottom: '20px'
                        }}>
                            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                            <div>{error}</div>
                        </div>
                    )}

                    {/* FORM */}
                    <form onSubmit={handleCreateAndPay}>
                        <div style={{ marginBottom: '18px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#ccc', marginBottom: '6px' }}>
                                Test Amount (INR)
                            </label>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <div style={{ position: 'relative', flex: 1 }}>
                                    <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#888', fontWeight: 'bold' }}>
                                        ₹
                                    </span>
                                    <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '12px 14px 12px 32px',
                                            background: '#0c0c0c',
                                            border: '1px solid #333',
                                            borderRadius: '8px',
                                            color: '#fff',
                                            fontSize: '16px',
                                            fontWeight: '700'
                                        }}
                                        required
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setAmount('1')}
                                    style={{
                                        padding: '12px 16px',
                                        background: amount === '1' ? 'rgba(225, 6, 0, 0.2)' : '#1f1f1f',
                                        border: amount === '1' ? '1px solid #e10600' : '1px solid #333',
                                        color: '#fff',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        cursor: 'pointer',
                                        fontWeight: '600'
                                    }}
                                >
                                    ₹1
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAmount('10')}
                                    style={{
                                        padding: '12px 16px',
                                        background: amount === '10' ? 'rgba(225, 6, 0, 0.2)' : '#1f1f1f',
                                        border: amount === '10' ? '1px solid #e10600' : '1px solid #333',
                                        color: '#fff',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        cursor: 'pointer',
                                        fontWeight: '600'
                                    }}
                                >
                                    ₹10
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '4px' }}>
                                    Prefill Name
                                </label>
                                <input
                                    type="text"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        background: '#0c0c0c',
                                        border: '1px solid #333',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '13px'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '4px' }}>
                                    Prefill Phone
                                </label>
                                <input
                                    type="text"
                                    value={customerPhone}
                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        background: '#0c0c0c',
                                        border: '1px solid #333',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '13px'
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '4px' }}>
                                Prefill Email
                            </label>
                            <input
                                type="email"
                                value={customerEmail}
                                onChange={(e) => setCustomerEmail(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    background: '#0c0c0c',
                                    border: '1px solid #333',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    fontSize: '13px'
                                }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || verifying || !scriptLoaded}
                            style={{
                                width: '100%',
                                padding: '16px',
                                background: loading || verifying ? '#555' : 'linear-gradient(135deg, #e10600 0%, #b80500 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                fontSize: '16px',
                                fontWeight: '700',
                                cursor: loading || verifying ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                transition: 'all 0.2s',
                                boxShadow: '0 8px 24px rgba(225, 6, 0, 0.3)'
                            }}
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Creating Order...
                                </>
                            ) : verifying ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Verifying Signature...
                                </>
                            ) : (
                                <>
                                    <CreditCard size={18} />
                                    Pay ₹{amount} with Razorpay
                                </>
                            )}
                        </button>
                    </form>

                    {/* How to Remove Note */}
                    <div style={{
                        marginTop: '28px',
                        paddingTop: '20px',
                        borderTop: '1px solid #222',
                        fontSize: '12px',
                        color: '#666',
                        lineHeight: '1.6'
                    }}>
                        <strong style={{ color: '#888' }}>How to remove this test order:</strong>
                        <br />
                        Simply remove the route from <code>App.jsx</code> and delete <code>src/pages/RazorpayTest.jsx</code>. The backend functions (<code>create-razorpay-order.js</code> and <code>verify-razorpay-payment.js</code>) are completely independent and ready for live checkout whenever you need them.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RazorpayTest;
