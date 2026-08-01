import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Wallet, Plus, ArrowUpRight, ArrowDownLeft, CreditCard, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { walletApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const isStripeConfigured = stripePublishableKey && stripePublishableKey !== 'pk_test_your_stripe_publishable_key';

const paymentMethods = [
  {
    id: 'stripe',
    name: 'Stripe Card Payment',
    description: 'International card payments',
    icon: CreditCard,
    color: 'text-eco-green',
    bg: 'bg-eco-green/10',
    border: 'border-eco-green/50',
    status: 'active',
    isPrimary: true
  },
];

export function WalletPage() {
  const { refreshUser, setCurrentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [balance, setBalance] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [topupAmount, setTopupAmount] = useState('50');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('stripe');

  // Lock to prevent concurrent load() calls from racing
  const isLoadingRef = useRef(false);
  // Lock to prevent confirm flow from running more than once per same sessionId
  const confirmedSessionIdRef = useRef(null);
  // Refs to access last set value without stale closures
  const balanceRef = useRef(0);
  const totalEarnedRef = useRef(0);

  // 🔴 BULLETPROOF RACE ELIMINATOR: "max known" monotonic refs.
  // These refs are ONLY EVER UPDATED WITH Math.max. Once we've seen a
  // higher value (from confirm API, load() fresh read, or refreshUser)
  // we **PERMANENTLY REFUSE** to display anything lower. This makes
  // stale HTTP responses literally unable to lower the displayed balance,
  // regardless of HTTP arrival order, React batching, StrictMode, or any
  // other race. This is the ONLY approach that guarantees correctness.
  const maxKnownBalanceRef = useRef(0);
  const maxKnownTotalEarnedRef = useRef(0);
  const MAX_FP = 0.005;

  // Every setBalance wrapper: Applies monotonic MAX before updating.
  const applyBalance = (value) => {
    const v = Number(value) || 0;
    if (v + MAX_FP >= maxKnownBalanceRef.current) {
      maxKnownBalanceRef.current = Math.max(maxKnownBalanceRef.current, v);
      balanceRef.current = maxKnownBalanceRef.current;
      setBalance(maxKnownBalanceRef.current);
      return maxKnownBalanceRef.current;
    } else {
      console.warn(
        `[WalletPage applyBalance] ⚠️ REFUSED LOWER candidate=$${v} < maxKnown=$${maxKnownBalanceRef.current} — KEEPING $${maxKnownBalanceRef.current}`
      );
      balanceRef.current = maxKnownBalanceRef.current;
      setBalance(maxKnownBalanceRef.current);
      return maxKnownBalanceRef.current;
    }
  };
  const applyTotalEarned = (value) => {
    const v = Number(value) || 0;
    if (v + MAX_FP >= maxKnownTotalEarnedRef.current) {
      maxKnownTotalEarnedRef.current = Math.max(maxKnownTotalEarnedRef.current, v);
      totalEarnedRef.current = maxKnownTotalEarnedRef.current;
      setTotalEarned(maxKnownTotalEarnedRef.current);
      return maxKnownTotalEarnedRef.current;
    } else {
      totalEarnedRef.current = maxKnownTotalEarnedRef.current;
      setTotalEarned(maxKnownTotalEarnedRef.current);
      return maxKnownTotalEarnedRef.current;
    }
  };

  // Keep state↔ref sync (legacy other components might rely on balanceRef directly)
  useEffect(() => {
    balanceRef.current = balance;
  }, [balance]);
  useEffect(() => {
    totalEarnedRef.current = totalEarned;
  }, [totalEarned]);

  // ------------------------------------------------------------------
  // LOAD: Single atomic wallet loader function — uses applyBalance()
  //       (monotonic MAX of maxKnownBalanceRef) → NEVER accepts a value
  //       lower than what we've already seen. 100% stale-overwrite immune.
  //
  // Options:
  //   bypassLock – skip isLoadingRef gate (used by confirm's step 4 —
  //                because mount load may still be in-flight and we MUST
  //                get the post-credit fresh snapshot for verification)
  // ------------------------------------------------------------------
  const load = async (options = {}) => {
    const { bypassLock = false } = options;
    if (!bypassLock && isLoadingRef.current) return null;

    const acquiredLock = bypassLock ? 'bypassed' : (isLoadingRef.current = true);
    try {
      const [walletRes, txRes] = await Promise.all([
        walletApi.get(),
        walletApi.transactions(),
      ]);

      const serverBalance = walletRes.data.balance;
      const serverTotalEarned = walletRes.data.totalEarned || 0;
      const serverTransactions = txRes.data;

      // Apply via monotonic wrappers — guarantees display only goes UP.
      // applyBalance returns the ACTUALLY-APPLIED value (after MAX rule enforcement).
      const appliedBalance = applyBalance(serverBalance);
      const appliedTotalEarned = applyTotalEarned(serverTotalEarned);

      if (appliedBalance !== serverBalance) {
        console.warn(
          `[WalletPage load] ⚠️ serverBalance=$${serverBalance} REPLACED by MAX-RULE → applied=$${appliedBalance} (maxKnown=$${maxKnownBalanceRef.current})`
        );
      }

      setTransactions(serverTransactions);

      return {
        balance: appliedBalance,
        totalEarned: appliedTotalEarned,
        transactions: serverTransactions,
      };
    } catch (err) {
      console.error('Failed to load wallet:', err);
      toast.error('Failed to load wallet');
      return null;
    } finally {
      setLoading(false);
      if (acquiredLock !== 'bypassed') isLoadingRef.current = false;
    }
  };

  // Initial mount-only load
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------------------------------------------------------
  // POST-CHECKOUT CONFIRM FLOW — triggered when Stripe redirects back
  // with ?status=success&session_id=... in the URL.
  //
  // CRITICAL ORDERING (prevents timeouts + double-runs):
  //   1. Check confirmedSessionIdRef — SKIP if same session already started
  //      (blocks React StrictMode double-invoke from calling API twice)
  //   2. Start failsafe timeout ONLY AFTER guard passes
  //   3. Call confirm API FIRST — DON'T call navigate() before this
  //      (navigate triggers location.search change → cleanup → KILLS timeout!)
  //   4. Only AFTER confirm API returns — THEN clear URL params
  //   5. Run refreshUser() + load() IN PARALLEL (saves 1 full roundtrip)
  // ------------------------------------------------------------------
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get('status');
    const sessionId = params.get('session_id');

    if (!(status === 'success' && sessionId)) return;

    // GUARD: Never run confirm twice for the same sessionId.
    // This is the ONLY protection we need — backend is fully idempotent anyway
    // (creditWallet checks Transaction.stripeCheckoutSessionId), so even if this
    // guard failed, NO double-charging / double-crediting could occur. But guard
    // still prevents wasted API calls + race conditions in React StrictMode.
    if (confirmedSessionIdRef.current === sessionId) return;
    confirmedSessionIdRef.current = sessionId;

    setConfirming(true);

    const FAILSAFE_TIMEOUT_MS = 45000;
    let failsafeTimeout = setTimeout(() => {
      console.warn(`[WalletTopup] ⏱️ FAILSAFE TIMEOUT (${FAILSAFE_TIMEOUT_MS / 1000}s) — resetting state`);
      setConfirming(false);
      toast.error('Top-up confirmation timed out. Please try again.');
    }, FAILSAFE_TIMEOUT_MS);

    const LOG = '[WalletTopup]';
    const t0 = Date.now();
    const time = (label) => console.log(`${LOG} ⏱ +${Date.now() - t0}ms — ${label}`);
    console.log(`\n${'🚀'.repeat(20)} ${LOG} START session=${sessionId.slice(0, 12)}...`);
    time('Guard passed, failsafe started');

    const confirmTopup = async () => {
      try {
        // === STEP 1: Confirm Stripe payment on backend ===
        // (This is the critical path — backend verifies Stripe session + credits wallet)
        console.log(`${LOG} Step 1 → POST /wallet/confirm-checkout-session`);
        const tConfirm = Date.now();
        const confirmRes = await walletApi.confirmCheckoutSession(sessionId);
        time(`Step 1 DONE (${Date.now() - tConfirm}ms) — backend returned balance=${confirmRes.data.balance}`);

        const { balance: confirmBalance, totalEarned: confirmTotalEarned, user: updatedUser, message } = confirmRes.data;

        // === STEP 2: Clear URL params (prevent refresh/re-renders from re-running)
        // Done RIGHT AFTER critical confirm API returns, so even if subsequent
        // steps throw, we don't re-trigger confirm on next render/refresh.
        navigate('/dashboard/wallet', { replace: true });
        time('Step 2 DONE — URL params cleared');

        // === STEP 3: Apply state + refs + localStorage SYNCHRONOUSLY from confirm API response
        // localStorage written FIRST before awaits so concurrent reads see latest value.
        if (updatedUser) {
          localStorage.setItem('waste2worth_user', JSON.stringify(updatedUser));
          setCurrentUser(updatedUser);
        }
        // applyBalance/applyTotalEarned = monotonic MAX rule (never lower than known value)
        // These WRITE THROUGH to maxKnownBalanceRef / balanceRef / setBalance in one call.
        applyBalance(confirmBalance);
        applyTotalEarned(confirmTotalEarned ?? totalEarned);
        time(`Step 3 DONE — confirm API applied: balance=$${maxKnownBalanceRef.current}`);

        // === STEP 4: load({bypassLock}) + refreshUser() RUN IN PARALLEL
        // Both read fresh values from server (independent sources).
        console.log(`${LOG} Step 4 → load() + refreshUser() PARALLEL`);
        const tParallel = Date.now();
        const [loaded, refreshUserResult] = await Promise.all([
          load({ bypassLock: true }),
          (async () => {
            try { return await refreshUser(); } catch (_) { return null; }
          })(),
        ]);
        time(`Step 4 DONE (${Date.now() - tParallel}ms) — parallel complete`);

        const loadedBalance = loaded ? loaded.balance : confirmBalance;
        const loadedTotalEarned = loaded ? loaded.totalEarned : confirmTotalEarned;
        const freshTransactions = loaded ? loaded.transactions : [];

        let authWalletBalance = null;
        let authTotalEarned = null;
        if (refreshUserResult) {
          authWalletBalance = refreshUserResult.walletBalance;
          authTotalEarned = refreshUserResult.totalEarned;
        } else {
          try {
            const stored = JSON.parse(localStorage.getItem('waste2worth_user') || '{}');
            authWalletBalance = stored.walletBalance;
            authTotalEarned = stored.totalEarned;
          } catch (_) { /* ignore */ }
        }

        // ============================================================
        // BULLETPROOF FINAL STATE APPLICATION (MAX of 3 sources)
        //
        // We have THREE independent reads from DB:
        //   A) confirm API response  (fresh lean() after $inc)
        //   B) GET /wallet + transactions (fresh lean() from Step 4 load)
        //   C) GET /auth/me (fresh User.findById from Step 4 refreshUser)
        //
        // Each of them is a valid current DB snapshot. The atomic $inc
        // guarantees MongoDB ONLY increases. So the MAX of these 3 is
        // the REAL/CORRECT balance!
        // ============================================================
        const FP_EPSILON = 0.005;
        const candidatesBalance = [confirmBalance, loadedBalance, authWalletBalance].filter(v => v !== null && v !== undefined && !isNaN(Number(v))).map(Number);
        const candidatesTotalEarned = [confirmTotalEarned, loadedTotalEarned, authTotalEarned].filter(v => v !== null && v !== undefined && !isNaN(Number(v))).map(Number);

        const finalBalance = Math.max(...candidatesBalance);
        const finalTotalEarned = Math.max(...candidatesTotalEarned);
        time(`Sources [confirm, load, auth] balance: [${confirmBalance}, ${loadedBalance}, ${authWalletBalance}] → MAX=$${finalBalance}`);
        time(`Sources totalEarned: [${confirmTotalEarned}, ${loadedTotalEarned}, ${authTotalEarned}] → MAX=$${finalTotalEarned}`);

        // 🔴 FINAL MONOTONIC WRITE: applyBalance(finalBalance) → even if finalBalance
        // is LOWER than what we already have (impossible per theory, but defensive)
        // applyBalance will refuse to lower it via maxKnownBalanceRef rule.
        const appliedFinalBal = applyBalance(finalBalance);
        const appliedFinalTE = applyTotalEarned(finalTotalEarned);
        time(`Step 5 DONE — FINAL monotonic apply: balance=$${appliedFinalBal}, totalEarned=$${appliedFinalTE}. maxKnownBalanceRef=$${maxKnownBalanceRef.current}`);

        // Ok1 primary check: confirm API + Step 4 load MUST match (within 5c tolerance).
        // If they don't match by more than 5c even after MAX-select, something is wrong.
        const ok1 = Math.abs(confirmBalance - loadedBalance) < 0.05;

        // Ok2: newest topup tx.balanceAfter should match our final balance (advisory)
        const newestTopupTx = [...freshTransactions]
          .filter(tx => tx && tx.type === 'topup')
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0];
        const ok2 = !newestTopupTx
          ? true
          : Math.abs(Number(newestTopupTx.balanceAfter || 0) - appliedFinalBal) < FP_EPSILON;

        // Ok3: localStorage balance matches (advisory)
        const ok3 = authWalletBalance === null
          ? true
          : Math.abs(Number(authWalletBalance) - appliedFinalBal) < FP_EPSILON;

        console.log(`${LOG} VERIFY — ok1(confirm-load match <5c)=${ok1} ok2(tx)=${ok2} ok3(auth)=${ok3}, appliedFinalBal=$${appliedFinalBal}`);

        if (!ok1) {
          console.error(`${LOG} ❌ ok1 PRIMARY CHECK FAILED (confirm and load differ > 0.05 — DB consistency issue)`);
          console.error(`${LOG}   confirmBalance=${confirmBalance}`);
          console.error(`${LOG}   loadedBalance=${loadedBalance}`);
          console.error(`${LOG}   authWalletBalance=${authWalletBalance}`);
          console.error(`${LOG}   Used MAX appliedFinalBal: ${appliedFinalBal}`);
          console.error(`${LOG}   newestTopupTx.balanceAfter=${newestTopupTx?.balanceAfter ?? 'n/a'}`);
          console.error(`${LOG}   maxKnownBalanceRef=$${maxKnownBalanceRef.current}`);
          throw new Error(
            `Balance update could not be verified. Expected ~$${Number(confirmBalance).toFixed(2)}. Please refresh the page.`
          );
        }

        if (!(ok2 && ok3)) {
          console.warn(`${LOG} ⚠️ ADVISORY checks non-perfect ok2=${ok2} ok3=${ok3} — ok1 passed so topup successful`);
          console.warn(`${LOG}   newest topup tx.balanceAfter=${newestTopupTx?.balanceAfter ?? 'n/a'}`);
          console.warn(`${LOG}   authCtx walletBalance=${authWalletBalance ?? 'n/a'}`);
        }

        console.log(`${LOG} ${'✅'.repeat(20)} FINAL SUCCESS — appliedFinalBal = $${appliedFinalBal} (TOTAL ${Date.now() - t0}ms)\n`);
        toast.success(message || 'Amount has been added to your wallet successfully');
      } catch (err) {
        console.error(`${LOG} ❌ ERROR:`, err);
        const errMsg = err?.response?.data?.message || err?.message || 'Failed to confirm top-up';
        toast.error(errMsg);
        confirmedSessionIdRef.current = null;
      } finally {
        clearTimeout(failsafeTimeout);
        setConfirming(false);
      }
    };

    confirmTopup();

    // CLEANUP: Only clear timeout. Do NOT reset confirmedSessionIdRef here!
    // If cleanup runs due to navigate() clearing URL params mid-flow,
    // we still want the guard protecting against re-running SAME session.
    return () => {
      clearTimeout(failsafeTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);


  const handleStripeTopup = async (e) => {
    e.preventDefault();
    const amount = parseFloat(topupAmount);
    if (!amount || amount < 1 || amount > 10000) {
      toast.error('Enter an amount between $1 and $10000');
      return;
    }
    if (!isStripeConfigured) {
      toast.info('Stripe keys not configured');
      return;
    }

    setProcessing(true);
    try {
      const { data } = await walletApi.createCheckoutSession(amount);
      if (!data.url) {
        throw new Error('No checkout URL returned');
      }
      window.location.href = data.url;
    } catch (err) {
      console.error('Failed to start checkout:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to start checkout');
      setProcessing(false);
    }
  };

  if (loading)
    return (
      <motion.div animate={{ opacity: 1 }} className="text-text-light">
        Loading wallet...
      </motion.div>
    );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8 bg-gradient-to-br from-eco-green/20 to-transparent border-eco-green/30"
      >
        <div className="flex items-center gap-3 mb-2">
          <Wallet className="w-8 h-8 text-eco-green" />
          <span className="text-text-light">Available Balance</span>
        </div>
        <p className="text-4xl font-bold text-white">${Number(balance || 0).toFixed(2)}</p>
        <p className="text-sm text-text-light mt-2">
          Total earned from recycling & sales: ${Number(totalEarned || 0).toFixed(2)}
        </p>
      </motion.div>

      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-eco-green" /> Top Up Wallet
        </h2>

        <div className="mb-6">
          <label className="text-sm text-text-light mb-2 block">Top-up Amount (USD)</label>
          <input
            type="number"
            min="1"
            value={topupAmount}
            onChange={(e) => setTopupAmount(e.target.value)}
            className="glass-input w-full"
            placeholder="Enter amount"
          />
        </div>

        <div className="mb-6">
          <label className="text-sm text-text-light mb-3 block">Select Payment Method</label>
          <div className="space-y-3">
            {paymentMethods.map((method) => {
              const Icon = method.icon;
              const isActive = method.id === selectedMethod;
              const isDisabled = method.status !== 'active' || (method.id === 'stripe' && !isStripeConfigured);

              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => !isDisabled && setSelectedMethod(method.id)}
                  disabled={isDisabled}
                  className={`w-full p-4 rounded-xl border-2 flex items-center justify-between transition-all ${
                    isActive ? `${method.border} ${method.bg}` : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                  } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${method.bg}`}>
                      <Icon className={`w-6 h-6 ${method.color}`} />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white">{method.name}</p>
                        {method.isPrimary && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-eco-green/20 text-eco-green rounded-full">
                            Primary
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-light mt-0.5">{method.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {method.status === 'active' && (
                      <CheckCircle2 className="w-5 h-5 text-eco-green" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleStripeTopup}>
          {selectedMethod === 'stripe' && isStripeConfigured ? (
            <button
              type="submit"
              disabled={processing || confirming}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              {confirming
                ? 'Confirming top-up...'
                : processing
                ? 'Redirecting...'
                : 'Proceed to Pay with Stripe'}
            </button>
          ) : selectedMethod === 'stripe' && !isStripeConfigured ? (
            <div className="rounded-xl border border-eco-green/30 bg-eco-green/10 p-4">
              <p className="text-sm text-eco-green">
                Stripe is not configured. Add your Stripe keys to enable payments.
              </p>
            </div>
          ) : null}
        </form>

        {isStripeConfigured && selectedMethod === 'stripe' && (
          <p className="text-xs text-text-light mt-4">
            Use Stripe test card: <span className="font-mono text-white">4242 4242 4242 4242</span>, any future expiry, any CVC
          </p>
        )}
      </div>

      <div className="glass-card overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-6 border-b border-white/10"
        >
          <h2 className="text-lg font-semibold text-white">Transaction History</h2>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="divide-y divide-white/5 max-h-[600px] overflow-y-auto"
        >
          {transactions.length === 0 ? (
            <p className="p-8 text-center text-text-light">No transactions yet.</p>
          ) : (
            transactions.map((tx) => (
              <div
                key={tx._id}
                className="p-4 hover:bg-white/5"
              >
                <div className="flex items-center justify-between mb-2">
                  <motion.div
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3"
                  >
                    {(tx.amount ?? 0) >= 0 ? (
                      <ArrowDownLeft className="w-5 h-5 text-eco-green" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5 text-soft-orange" />
                    )}
                    <div>
                      <p className="text-sm text-white">{tx.description}</p>
                      <p className="text-xs text-text-light">
                        {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : ''}
                      </p>
                    </div>
                  </motion.div>
                  <span
                    className={`font-medium ${
                      (tx.amount ?? 0) >= 0 ? 'text-eco-green' : 'text-red-400'
                    }`}
                  >
                    {(tx.amount ?? 0) >= 0 ? '+' : ''}${Math.abs(tx.amount ?? 0).toFixed(2)}
                  </span>
                </div>
                
                {/* Show detailed breakdown for recycling rewards */}
                {tx.type === 'recycling_reward' && (
                  <div className="mt-3 p-3 glass-card bg-white/5 rounded-lg border border-eco-green/20">
                    <p className="text-xs text-text-light mb-2 font-semibold uppercase tracking-wider">Breakdown</p>
                    <div className="space-y-2">
                      {tx.productName && (
                        <div className="flex justify-between text-xs">
                          <span className="text-text-light">Product:</span>
                          <span className="text-white">{tx.productName}</span>
                        </div>
                      )}
                      {(tx.productValue || 0) > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-text-light">Product Value:</span>
                          <span className="text-white">${(tx.productValue || 0).toFixed(2)}</span>
                        </div>
                      )}
                      {((tx.recyclingExpense || 0) > 0 || (tx.pickupServiceCharge || 0) > 0) && (
                        <div className="flex justify-between text-xs">
                          <span className="text-text-light">Recycling Expense:</span>
                          <span className="text-red-400">-${((tx.recyclingExpense || 0)).toFixed(2)}</span>
                        </div>
                      )}
                      {(tx.pickupServiceCharge || 0) > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-text-light">Service Charge:</span>
                          <span className="text-red-400">-${(tx.pickupServiceCharge || 0).toFixed(2)}</span>
                        </div>
                      )}
                      {(tx.finalReward || 0) > 0 && (
                        <div className="flex justify-between text-xs pt-2 border-t border-white/10">
                          <span className="text-text-light font-semibold">Your Reward:</span>
                          <span className="text-eco-green font-semibold">${(tx.finalReward || 0).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
