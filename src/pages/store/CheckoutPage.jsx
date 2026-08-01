import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wallet, Banknote, MapPin, ArrowLeft, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { storeApi, walletApi, addressApi } from '../../api';
import { useAuth } from '../../context/AuthContext';

// Stripe configuration
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const isStripeConfigured = stripePublishableKey && stripePublishableKey !== 'pk_test_your_stripe_publishable_key';

export function CheckoutPage() {
  const { id: productId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshUser } = useAuth();
  const [product, setProduct] = useState(null);
  const [wallet, setWallet] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [shippingAddress, setShippingAddress] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch product, wallet, address
  useEffect(() => {
    Promise.all([
      storeApi.product(productId),
      walletApi.get(),
      addressApi.list().catch(() => ({ data: [] })),
    ]).then(([p, w, a]) => {
      setProduct(p.data);
      setWallet(w.data.balance);
      const def = a.data?.find((x) => x.isDefault);
      if (def) setShippingAddress(`${def.street}, ${def.city}, ${def.state} ${def.zip}`);
    });
  }, [productId]);

  // Handle Stripe Checkout success redirect
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get('status');
    const sessionId = params.get('session_id');
    if (status === 'success' && sessionId) {
      (async () => {
        try {
          await storeApi.confirmCheckoutSession({ sessionId });
          await refreshUser();
          toast.success('Purchase successful!');
          navigate('/dashboard/store-orders');
        } catch (err) {
          toast.error(err.response?.data?.message || 'Failed to confirm order');
        }
      })();
    }
  }, [location.search, refreshUser, navigate]);

  // Handle Stripe Checkout
  const [redirectingToStripe, setRedirectingToStripe] = useState(false);
  const handleStripeCheckout = async (e) => {
    e.preventDefault();
    if (!shippingAddress.trim()) {
      toast.error('Please enter a shipping address');
      return;
    }
    if (!isStripeConfigured) {
      toast.info('Stripe keys not configured');
      return;
    }
    setLoading(true);
    try {
      const { data } = await storeApi.createCheckoutSession({ productId, shippingAddress });
      console.log('âœ… [Stripe] Full API response data:', JSON.stringify(data, null, 2));
      console.log('âœ… [Stripe] Checkout session ID:', data.sessionId, 'URL:', data.url);
      if (!data.url) {
        console.error('âŒ [Stripe] NO URL FOUND IN RESPONSE! Full data:', data);
        throw new Error('No checkout URL returned');
      }
      // Show redirecting state
      setRedirectingToStripe(true);
      toast.info('Redirecting to Stripe checkout...', { duration: 2000 });
      // Redirect to Stripe Checkout using the URL from backend
      window.location.href = data.url;
    } catch (err) {
      console.error('âŒ [Stripe] Error:', err);
      toast.error(err.response?.data?.message || err.message || 'Purchase failed');
      setLoading(false);
      setRedirectingToStripe(false);
    }
  };

  const handlePurchase = async (e) => {
    e.preventDefault();
    if (!shippingAddress.trim()) {
      toast.error('Please enter a shipping address');
      return;
    }

    if (paymentMethod === 'wallet' && wallet < product.price) {
      toast.error('Insufficient wallet balance');
      return;
    }

    setLoading(true);
    try {
      await storeApi.purchase({ productId, paymentMethod, shippingAddress });
      await refreshUser();
      toast.success(paymentMethod === 'cod' ? 'COD order placed!' : 'Purchase successful!');
      navigate('/dashboard/store-orders');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Purchase failed');
    } finally {
      setLoading(false);
    }
  };

  if (!product) return <motion.div animate={{ opacity: 1 }} className="text-center py-20 text-text-light">Loading...</motion.div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-lg mx-auto space-y-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:border-eco-green/50 hover:bg-eco-green/10"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="glass-card p-6">
        <h1 className="text-xl font-bold text-white mb-4">Checkout</h1>
        <div className="flex gap-4 mb-6 pb-6 border-b border-white/10">
          <img src={product.images?.[0]} alt="" className="w-20 h-20 rounded-lg object-cover" />
          <div>
            <p className="font-medium text-white">{product.title}</p>
            <p className="text-eco-green font-bold text-lg mt-1">${product.price?.toFixed(2)}</p>
          </div>
        </div>

        <form onSubmit={paymentMethod === 'stripe' ? handleStripeCheckout : handlePurchase} className="space-y-5">
          <div>
            <label className="text-sm text-text-light mb-2 block flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Shipping Address
            </label>
            <textarea
              required
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              className="w-full glass-input min-h-[80px]"
              placeholder="Street, City, ZIP"
            />
          </div>

          <div>
            <label className="text-sm text-text-light mb-3 block">Payment Method</label>
            <div className="grid gap-3 grid-cols-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('stripe')}
                className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${paymentMethod === 'stripe' ? 'border-eco-green bg-eco-green/10' : 'border-white/10 hover:bg-white/5'}`}
              >
                <CreditCard className="w-5 h-5 text-eco-green" />
                <span className="text-sm font-medium text-white">Stripe</span>
                <span className="text-xs text-text-light">Card Payment</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('wallet')}
                className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${paymentMethod === 'wallet' ? 'border-eco-green bg-eco-green/10' : 'border-white/10 hover:bg-white/5'}`}
              >
                <Wallet className="w-5 h-5 text-eco-green" />
                <span className="text-sm font-medium text-white">Wallet</span>
                <span className="text-xs text-text-light">${wallet.toFixed(2)}</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('cod')}
                className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${paymentMethod === 'cod' ? 'border-eco-green bg-eco-green/10' : 'border-white/10 hover:bg-white/5'}`}
              >
                <Banknote className="w-5 h-5 text-soft-orange" />
                <span className="text-sm font-medium text-white">COD</span>
                <span className="text-xs text-text-light">Pay on Delivery</span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? 'Processing...' : paymentMethod === 'stripe' ? 'Pay with Stripe' : `Place Order â€” $${product.price?.toFixed(2)}`}
          </button>
        </form>

        {!isStripeConfigured && paymentMethod === 'stripe' && (
          <div className="rounded-xl border border-eco-green/30 bg-eco-green/10 p-3 mt-4">
            <p className="text-sm text-eco-green">Stripe keys not configured yet. Add your test keys to .env files!</p>
          </div>
        )}

        {isStripeConfigured && paymentMethod === 'stripe' && (
          <p className="text-xs text-text-light mt-4">
            Test card: <span className="font-mono text-white">4242 4242 4242 4242</span>
          </p>
        )}
      </div>
    </motion.div>
  );
}
