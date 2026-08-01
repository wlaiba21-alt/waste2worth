import { Router } from 'express';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { creditWallet } from '../services/wallet.js';
import Stripe from 'stripe';

// ROOT CAUSE FIX 1: Lazy-initialize Stripe (NOT at module level)
// Reason: ESM import hoisting means wallet.routes.js may execute BEFORE dotenv/config
// loads process.env.STRIPE_SECRET_KEY, causing "undefined" secret key at module init.
let stripeInstance = null;
function getStripe() {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not configured in backend .env');
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeInstance;
}

const router = Router();

router.get(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    // ✅ ROOT CAUSE FIX: Explicitly RE-FETCH user document DIRECTLY from MongoDB
    // at the TIME of this /wallet GET request — NOT using the pre-loaded req.user from
    // protect middleware (which was fetched at the START of request pipeline, which
    // could be stale relative to a concurrent confirm-checkout-session atomic $inc write
    // that completed milliseconds before).
    //
    // Using .select() to only pull the 2 fields we need — faster query + less data.
    const freshUser = await User.findById(req.user._id)
      .select('walletBalance totalEarned')
      .lean(); // lean() for plain JS object (no mongoose caching, raw from DB)

    if (!freshUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log(`[GET /wallet] userId=${req.user._id} FRESH from MongoDB: walletBalance=${freshUser.walletBalance}, totalEarned=${freshUser.totalEarned}`);

    res.json({
      balance: freshUser.walletBalance,
      totalEarned: freshUser.totalEarned || 0,
    });
  })
);

router.get(
  '/transactions',
  protect,
  asyncHandler(async (req, res) => {
    const txs = await Transaction.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50);
    res.json(txs);
  })
);

// --- Stripe Routes ---

// Create Payment Intent
router.post(
  '/create-payment-intent',
  protect,
  asyncHandler(async (req, res) => {
    try {
      const { amount } = req.body;
      const numericAmount = parseFloat(amount);
      if (!numericAmount || numericAmount < 1 || numericAmount > 10000) {
        return res.status(400).json({ message: 'Amount must be between $1 and $10000' });
      }

      const stripe = getStripe();

      // Convert to cents
      const amountInCents = Math.round(numericAmount * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'usd',
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          userId: req.user._id.toString(),
        },
      });

      res.json({
        clientSecret: paymentIntent.client_secret,
      });
    } catch (stripeErr) {
      console.error('Stripe error (create-payment-intent):', stripeErr);
      res.status(500).json({
        message: stripeErr.message || 'Failed to create payment intent',
        error: process.env.NODE_ENV === 'development' ? stripeErr.message : undefined,
      });
    }
  })
);

// Confirm Payment and Top-Up Wallet (for Elements)
router.post(
  '/confirm-payment',
  protect,
  asyncHandler(async (req, res) => {
    try {
      const { paymentIntentId } = req.body;
      if (!paymentIntentId) {
        return res.status(400).json({ message: 'Payment intent ID is required' });
      }

      const stripe = getStripe();
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status === 'succeeded') {
        const amount = paymentIntent.amount / 100; // Convert back to dollars

        // ROOT CAUSE FIX 2: creditWallet already returns the SAVED updated user!
        // No need to do a redundant User.findById() — reuse returned user to avoid
        // race conditions or stale reads.
        const updatedUser = await creditWallet(
          req.user._id,
          amount,
          'topup',
          'Wallet top-up via Stripe',
          {
            stripePaymentIntentId: paymentIntentId,
            stripePaymentMethodId: paymentIntent.payment_method,
          }
        );

        res.json({
          balance: updatedUser.walletBalance,
          totalEarned: updatedUser.totalEarned,
          user: updatedUser.toPublic(),
          message: `Successfully added $${amount.toFixed(2)} to wallet`,
        });
      } else {
        res.status(400).json({
          message: 'Payment not yet completed',
          status: paymentIntent.status,
        });
      }
    } catch (stripeErr) {
      console.error('Stripe error (confirm-payment):', stripeErr);
      res.status(500).json({
        message: 'Failed to confirm payment',
        error: process.env.NODE_ENV === 'development' ? stripeErr.message : undefined,
      });
    }
  })
);

// --- Stripe Hosted Checkout Routes ---
router.post(
  '/create-checkout-session',
  protect,
  asyncHandler(async (req, res) => {
    try {
      const { amount } = req.body;
      const numericAmount = parseFloat(amount);
      if (!numericAmount || numericAmount < 1 || numericAmount > 10000) {
        return res.status(400).json({ message: 'Amount must be between $1 and $10000' });
      }

      const stripe = getStripe();

      // ROOT CAUSE FIX 3: Correct fallback port to 5180 (was wrong 5177)
      // Vite frontend runs on port 5180 per vite.config.ts
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5180';

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            unit_amount: Math.round(numericAmount * 100),
            product_data: {
              name: 'Wallet Top-Up',
              description: `Top up your wallet with $${numericAmount.toFixed(2)}`,
            },
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${clientUrl}/dashboard/wallet?status=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${clientUrl}/dashboard/wallet`,
        metadata: {
          userId: req.user._id.toString(),
          amount: numericAmount.toString(),
          type: 'wallet_topup',
        },
      });

      res.json({ sessionId: session.id, url: session.url });
    } catch (stripeErr) {
      console.error('Stripe error (create-checkout-session):', stripeErr);
      res.status(500).json({
        message: 'Failed to create checkout session',
        error: process.env.NODE_ENV === 'development' ? stripeErr.message : undefined,
      });
    }
  })
);

router.post(
  '/confirm-checkout-session',
  protect,
  asyncHandler(async (req, res) => {
    const step = '[POST /wallet/confirm-checkout-session]';
    console.log(`\n${'▓'.repeat(80)}`);
    console.log(`${step} → RECEIVED`);
    console.log(`${step}   1. req.user._id =`, req.user?._id?.toString());
    console.log(`${step}   2. req.user.email =`, req.user?.email);
    console.log(`${step}   3. req.body =`, JSON.stringify(req.body));

    try {
      const { sessionId } = req.body;
      if (!sessionId) {
        console.warn(`${step} ❌ LINE FAIL @ sessionId check → 400`);
        return res.status(400).json({ message: 'Session ID is required' });
      }
      console.log(`${step}   ✅ 4. sessionId present: ${sessionId.slice(0, Math.min(16, sessionId.length))}...`);

      const stripe = getStripe();
      const tStripeStart = Date.now();
      const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: [] });
      console.log(`${step}   ✅ 5. Stripe session.retrieve OK (${Date.now() - tStripeStart}ms)`);

      const paymentStatus = session.payment_status;
      const metadata = session.metadata || {};
      console.log(`${step}   6. Stripe session.payment_status =`, paymentStatus);
      console.log(`${step}   7. Stripe session.metadata =`, JSON.stringify(metadata));

      if (paymentStatus !== 'paid') {
        console.warn(`${step} ❌ LINE FAIL: payment_status='${paymentStatus}' !== 'paid' → 400`);
        return res.status(400).json({ message: 'Payment not completed' });
      }
      console.log(`${step}   ✅ 8. payment_status === 'paid' VERIFIED`);

      const metaUserId = metadata.userId;
      const meIdStr = req.user._id.toString();
      console.log(`${step}   9. session metadata.userId =`, metaUserId, '| req.user._id =', meIdStr);
      if (metaUserId && metaUserId !== meIdStr) {
        console.error(`${step} ❌ LINE FAIL: session userId mismatch → 403`);
        return res.status(403).json({ message: 'Session does not belong to this user' });
      }
      console.log(`${step}   ✅ 10. userId match OK`);

      const amount = parseFloat(metadata.amount);
      console.log(`${step}   11. Parsed amount from metadata.amount="${metadata.amount}" → Number=${amount}`);
      if (!amount || isNaN(amount) || amount <= 0) {
        console.warn(`${step} ❌ LINE FAIL: invalid amount → 400`);
        return res.status(400).json({ message: 'Invalid amount in session' });
      }
      console.log(`${step}   ✅ 12. amount valid = $${amount.toFixed(2)}`);

      // =================================================================
      // BEFORE DB STATE (fresh lean read — PROOF of starting balance)
      // =================================================================
      const beforeRead = await User.findById(req.user._id).select('walletBalance totalEarned').lean();
      const balanceBefore = Number(beforeRead?.walletBalance ?? 0);
      const totalEarnedBefore = Number(beforeRead?.totalEarned ?? 0);
      const expectedAfter = Math.round((balanceBefore + amount) * 100) / 100;
      console.log(`${step}   📊 BEFORE creditWallet (LEAN): walletBalance=$${balanceBefore}, totalEarned=$${totalEarnedBefore}`);
      console.log(`${step}   📊 EXPECTED AFTER this call = $${expectedAfter} (=$${balanceBefore} + $${amount})`);

      console.log(`${step}   13. → CALLING creditWallet(userId=${meIdStr}, amount=$${amount}, type=topup, stripeCheckoutSessionId=${sessionId.slice(0, Math.min(12, sessionId.length))}...)`);
      const tCredit = Date.now();

      const updatedUser = await creditWallet(
        req.user._id,
        amount,
        'topup',
        'Wallet top-up via Stripe Checkout',
        { stripeCheckoutSessionId: sessionId }
      );
      console.log(`${step}   ✅ 14. creditWallet RETURNED in ${Date.now() - tCredit}ms`);
      console.log(`${step}       creditWallet retval.walletBalance =`, updatedUser?.walletBalance);
      console.log(`${step}       creditWallet retval.totalEarned =`, updatedUser?.totalEarned);

      // =================================================================
      // AFTER DB STATE (second fresh lean read — CONFIRM actual change)
      // =================================================================
      const afterSelect = 'walletBalance totalEarned name email role avatar phone status recycleCount createdAt';
      const afterRead = await User.findById(req.user._id).select(afterSelect).lean();
      const balanceAfter = Number(afterRead?.walletBalance ?? 0);
      const totalEarnedAfter = Number(afterRead?.totalEarned ?? 0);
      const actualDelta = Math.round((balanceAfter - balanceBefore) * 100) / 100;
      console.log(`${step}   📊 AFTER creditWallet (LEAN): walletBalance=$${balanceAfter}, totalEarned=$${totalEarnedAfter}`);
      console.log(`${step}   📊 ACTUAL DB DELTA in THIS confirm call = $${actualDelta} (expected +$${amount})`);

      const wasActuallyCreditedNow = actualDelta + 0.005 >= amount && actualDelta - 0.005 <= amount;
      const wasAlreadyCreditedBefore = Math.abs(balanceAfter - expectedAfter) < 0.01 && Math.abs(actualDelta) < 0.005;
      const balanceConsistent = Math.abs(balanceAfter - expectedAfter) < 0.01;
      console.log(`${step}   📊 VERIFICATION RESULTS:`);
      console.log(`${step}       wasActuallyCreditedNow (delta≈amount)? ${wasActuallyCreditedNow}`);
      console.log(`${step}       wasAlreadyCreditedBefore (idempotent, delta≈0 & matches expected)? ${wasAlreadyCreditedBefore}`);
      console.log(`${step}       balanceConsistent (after===expected)? ${balanceConsistent}`);

      if (!balanceConsistent) {
        console.error(`${step}   ❌ FATAL: BALANCE CONSISTENCY VIOLATION`);
        console.error(`${step}      BEFORE=$${balanceBefore} + AMOUNT=$${amount} = EXPECTED=$${expectedAfter}`);
        console.error(`${step}      ACTUAL AFTER LEAN READ=$${balanceAfter}  (OFF BY $${Math.abs(balanceAfter - expectedAfter).toFixed(4)})`);
        console.error(`${step}      creditWallet FUNCTION returned 200 but MongoDB document was NOT UPDATED correctly.`);
        return res.status(500).json({
          message: `Wallet update failed on server: expected balance ${expectedAfter.toFixed(2)}, got ${balanceAfter.toFixed(2)}. DB not updated.`,
        });
      }

      // Build public user from LEAN afterRead (guaranteed actual DB values, not mongoose doc cache)
      const formatAvatar = (img) => {
        if (!img) return '';
        if (img.startsWith('http')) return img;
        if (img.startsWith('/uploads')) return img;
        if (img.startsWith('uploads')) return `/${img}`;
        return img;
      };
      const freshPublicUser = {
        id: afterRead._id.toString(),
        _id: afterRead._id,
        name: afterRead.name,
        email: afterRead.email,
        role: afterRead.role,
        avatar: formatAvatar(afterRead.avatar),
        phone: afterRead.phone,
        status: afterRead.status,
        recycleCount: afterRead.recycleCount,
        totalEarned: totalEarnedAfter,
        walletBalance: balanceAfter,
        createdAt: afterRead.createdAt,
      };

      let message;
      if (wasActuallyCreditedNow) {
        message = `Successfully added $${amount.toFixed(2)} to wallet`;
        console.log(`${step}   ✅ CASE A — First-time successful credit: DB actually increased by $${actualDelta}. Message: "${message}"`);
      } else if (wasAlreadyCreditedBefore) {
        message = `Top-up of $${amount.toFixed(2)} was already processed (wallet is up-to-date, no change needed)`;
        console.log(`${step}   ℹ️  CASE B — Idempotency replay: DB already had correct value, no DB change in this call. Message: "${message}"`);
      } else {
        message = `Wallet up to date at $${balanceAfter.toFixed(2)}`;
        console.log(`${step}   ℹ️  CASE C — Other consistent state (delta=${actualDelta}). Message: "${message}"`);
      }

      const responsePayload = {
        balance: balanceAfter,
        totalEarned: totalEarnedAfter,
        user: freshPublicUser,
        message,
      };

      console.log(`${step} ✅ FINAL 200 RESPONSE SENT:`);
      console.log(`${step}    message =`, responsePayload.message);
      console.log(`${step}    LEAN balance = $${responsePayload.balance} (verified via 2 independent .findById().lean() calls)`);
      console.log(`${step}    LEAN totalEarned = $${responsePayload.totalEarned}`);
      console.log(`${'▓'.repeat(80)}\n`);
      res.json(responsePayload);
    } catch (stripeErr) {
      console.error(`${step} ❌ CATCH BLOCK ENTERED → 500:`, stripeErr);
      console.error(`${step} ❌ ERR STACK:`, stripeErr?.stack || stripeErr);
      console.log(`${'▓'.repeat(80)}\n`);
      res.status(500).json({
        message: 'Failed to confirm top-up',
        error: process.env.NODE_ENV === 'development' ? stripeErr?.message || String(stripeErr) : undefined,
      });
    }
  })
);

export default router;
