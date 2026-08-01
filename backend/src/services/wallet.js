import mongoose from 'mongoose';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';

// Helper: convert a raw lean() user object into the shape callers expect.
// This guarantees `.walletBalance` / `.totalEarned` match actual DB state,
// and exposes a `.toPublic()` method identical to mongoose doc toPublic().
function wrapLeanWithToPublic(u) {
  const formatAvatar = (img) => {
    if (!img) return '';
    if (img.startsWith('http')) return img;
    if (img.startsWith('/uploads')) return img;
    if (img.startsWith('uploads')) return `/${img}`;
    return img;
  };
  return Object.assign({}, u, {
    toPublic() {
      return {
        id: this._id.toString(),
        _id: this._id,
        name: this.name,
        email: this.email,
        role: this.role,
        avatar: formatAvatar(this.avatar),
        phone: this.phone,
        status: this.status,
        recycleCount: this.recycleCount,
        totalEarned: this.totalEarned,
        walletBalance: this.walletBalance,
        createdAt: this.createdAt,
      };
    },
    walletBalance: u.walletBalance,
    totalEarned: u.totalEarned,
  });
}

const LEAN_SELECT = 'walletBalance totalEarned name email role avatar phone status recycleCount createdAt';

/**
 * creditWallet — ATOMIC wallet credit. Uses:
 *   1. Mongoose findOneAndUpdate($inc, {new:true}) — single atomic MongoDB op
 *   2. Idempotency by Transaction lookup (stripeCheckoutSessionId / productId)
 *   3. FINAL RAW .lean() re-read of the actual DB doc before returning —
 *      ELIMINATES mongoose-document getter / caching staleness.
 *      Return value GUARANTEED to match actual MongoDB post-write state.
 */
export async function creditWallet(userId, amount, type, description, meta = {}) {
  const step = `[creditWallet] userId=${userId} amount=${amount} type=${type}`;
  const t0 = Date.now();
  const time = (label) => console.log(`${step} ⏱️  +${Date.now() - t0}ms — ${label}`);

  console.log(`\n${'═'.repeat(90)}`);
  console.log(`${step} → START`);
  console.log(`${step}   description:`, description);
  console.log(`${step}   meta:`, JSON.stringify(meta));

  if (!userId) {
    console.error(`${step} ❌ FAIL: userId is undefined/null`);
    throw new Error('creditWallet called without userId');
  }
  const userIdObj = typeof userId === 'string'
    ? new mongoose.Types.ObjectId(userId)
    : userId;

  if (amount <= 0) {
    console.log(`${step} ⚠️  SKIP: amount <= 0 (${amount})`);
    const raw = await User.findById(userIdObj).select(LEAN_SELECT).lean();
    return wrapLeanWithToPublic(raw);
  }

  // ------------------------------------------------------------------
  // IDEMPOTENCY: find prior transaction for this event
  // ------------------------------------------------------------------
  let idemQuery = null;
  if (type === 'topup') {
    const conds = [];
    if (meta.stripePaymentIntentId) conds.push({ 'meta.stripePaymentIntentId': meta.stripePaymentIntentId });
    if (meta.stripeCheckoutSessionId) conds.push({ 'meta.stripeCheckoutSessionId': meta.stripeCheckoutSessionId });
    if (conds.length > 0) idemQuery = { userId: userIdObj, type, $or: conds };
  } else if (type === 'recycling_reward' && meta.productId) {
    idemQuery = { userId: userIdObj, type, productId: meta.productId };
  }

  const [existingTx, userDoc] = await Promise.all([
    idemQuery ? Transaction.findOne(idemQuery) : Promise.resolve(null),
    User.findById(userIdObj),
  ]);
  time('Idempotency TX lookup + User.findById (parallel)');

  if (!userDoc) {
    console.error(`${step} ❌ FAIL: User not found in MongoDB`);
    throw new Error('User not found');
  }
  const balanceBefore = userDoc.walletBalance;

  // ------------------------------------------------------------------
  // IDEMPOTENCY FAST PATH: TX exists AND balance already matches
  // 🔴 GUARANTEE return via FRESH .lean() re-read — not old userDoc!
  // ------------------------------------------------------------------
  if (existingTx) {
    console.log(`${step} ℹ️  IDEMPOTENCY: found prior TX _id=${existingTx._id}`);
    console.log(`${step}    existingTx.amount=${existingTx.amount}, balanceAfter=${existingTx.balanceAfter}, current wallet=${balanceBefore}`);

    const diff = Math.abs(balanceBefore - existingTx.balanceAfter);
    if (diff < 0.01) {
      console.log(`${step} ✅ IDEMPOTENCY OK — FRESH lean() re-read for return value.`);
      const freshLean = await User.findById(userIdObj).select(LEAN_SELECT).lean();
      const wrapped = wrapLeanWithToPublic(freshLean);
      console.log(`${step}   fresh lean.walletBalance=${wrapped.walletBalance}`);
      console.log(`${'═'.repeat(90)}\n`);
      return wrapped;
    }
    console.log(`${step} ⚠️  IDEMPOTENCY MISMATCH — re-applying credit.`);
  }

  // ------------------------------------------------------------------
  // SINGLE ATOMIC WRITE: findOneAndUpdate($inc) — MongoDB atomic per-doc lock
  // ------------------------------------------------------------------
  const expectedBalanceAfter = Math.round((balanceBefore + amount) * 100) / 100;
  console.log(`${step}   [DEBUG] balanceBefore=${balanceBefore}, expectedAfter=${expectedBalanceAfter} (+${amount})`);

  const updateDoc = { $inc: { walletBalance: amount } };
  if (type === 'sale_commission' || type === 'recycling_reward' || type === 'rider_fee') {
    updateDoc.$inc.totalEarned = amount;
  }

  const tWrite = Date.now();
  console.log(`${step}   [DEBUG] executing updateOne query:`, JSON.stringify(updateDoc));
  
  const updateResult = await User.updateOne(
    { _id: userIdObj },
    updateDoc,
    { runValidators: true, context: 'query' }
  );
  
  console.log(`${step}   [DEBUG] updateOne RESULT: matchedCount=${updateResult.matchedCount}, modifiedCount=${updateResult.modifiedCount}`);
  
  if (updateResult.matchedCount === 0) {
    console.error(`${step} ❌ [DEBUG] WRITE FAIL: updateOne matched 0 documents. User ID: ${userIdObj.toString()}`);
    throw new Error(`creditWallet: User document not found for update (userId=${userId})`);
  }
  
  if (updateResult.modifiedCount === 0) {
    console.error(`${step} ❌ [DEBUG] WRITE FAIL: updateOne modified 0 documents (modifiedCount === 0). The document matched but was not updated by MongoDB!`);
    throw new Error(`creditWallet: Wallet update failed, modifiedCount is 0`);
  }

  const savedUser = await User.findById(userIdObj);
  console.log(`${step}   [DEBUG] Atomic updateOne($inc) completed in ${Date.now() - tWrite}ms → DB walletBalance=${savedUser?.walletBalance}`);

  const balanceAfter = savedUser.walletBalance;
  
  // Relaxed sanity check to allow for concurrent transactions. If balanceAfter is AT LEAST expectedBalanceAfter, it means our topup + potentially others succeeded.
  if (balanceAfter < expectedBalanceAfter - 0.01) {
    console.error(`${step} ❌ [DEBUG] WRITE SANITY FAIL: expected at least ${expectedBalanceAfter}, got ${balanceAfter}`);
    throw new Error(`creditWallet: balance mismatch after write (expected ${expectedBalanceAfter}, got ${balanceAfter})`);
  }

  // ------------------------------------------------------------------
  // TRANSACTION: create or update (for idempotency mismatch repair)
  // ------------------------------------------------------------------
  if (existingTx) {
    await Transaction.findByIdAndUpdate(
      existingTx._id,
      {
        amount,
        balanceAfter,
        description,
        meta: { ...existingTx.meta, ...meta, repairedAt: new Date().toISOString() },
      },
      { runValidators: true }
    );
    time('Transaction updated (repair case)');
  } else {
    try {
      await Transaction.create({
        userId: userIdObj,
        type,
        amount,
        balanceAfter,
        description,
        orderId: meta.orderId || null,
        productId: meta.productId || null,
        productName: meta.productName || '',
        productValue: meta.productValue || 0,
        recyclingExpense: meta.recyclingExpense || 0,
        pickupServiceCharge: meta.pickupServiceCharge || 0,
        finalReward: meta.finalReward || 0,
        transactionStatus: meta.paymentStatus || 'completed',
        meta,
      });
      time('Transaction created');
    } catch (txErr) {
      console.error(`${step} ❌ Transaction.create FAILED. Reverting wallet $inc.`);
      try {
        await User.findByIdAndUpdate(userIdObj, {
          $inc: {
            walletBalance: -amount,
            ...(updateDoc.$inc.totalEarned ? { totalEarned: -amount } : {}),
          },
        });
        console.log(`${step}   Wallet revert OK`);
      } catch (revertErr) {
        console.error(`${step}   ❌ REVERT FAIL: ${revertErr.message}`);
      }
      throw txErr;
    }
  }

  // ------------------------------------------------------------------
  // 🔴 FINAL FRESH .lean() RE-READ GUARANTEE before returning.
  //    SavedUser mongoose doc COULD theoretically have stale getters.
  //    This lean() call reads directly from the WT-acked MongoDB state,
  //    so return value walletBalance is 100% actual DB post-write value.
  // ------------------------------------------------------------------
  const finalRaw = await User.findById(userIdObj).select(LEAN_SELECT).lean();
  time(`FINAL lean() re-read: walletBalance=${finalRaw.walletBalance}`);
  const finalWrapped = wrapLeanWithToPublic(finalRaw);

  // Extra strong consistency check: final DB value MUST equal our expected
  if (Math.abs(finalWrapped.walletBalance - expectedBalanceAfter) > 0.01) {
    console.error(`${step} ❌ LEAN FINAL READ MISMATCH — expected=${expectedBalanceAfter}, actual=${finalWrapped.walletBalance}`);
    throw new Error(
      `creditWallet: final lean read mismatch (expected ${expectedBalanceAfter}, got ${finalWrapped.walletBalance})`
    );
  }

  console.log(`${step} ✅ SUCCESS — lean() confirmed +$${amount} → $${finalWrapped.walletBalance} (${Date.now() - t0}ms)`);
  console.log(`${'═'.repeat(90)}\n`);
  return finalWrapped;
}

/**
 * debitWallet — Atomic wallet debit, also returns fresh lean() wrapped user.
 */
export async function debitWallet(userId, amount, type, description, meta = {}) {
  const step = `[debitWallet] userId=${userId} amount=${amount} type=${type}`;
  console.log(`\n${'-'.repeat(90)}`);
  console.log(`${step} → START`);

  if (!userId) throw new Error('debitWallet called without userId');
  const userIdObj = typeof userId === 'string'
    ? new mongoose.Types.ObjectId(userId)
    : userId;

  if (amount <= 0) {
    const raw = await User.findById(userIdObj).select(LEAN_SELECT).lean();
    return wrapLeanWithToPublic(raw);
  }

  const user = await User.findById(userIdObj);
  if (!user) {
    console.error(`${step} ❌ FAIL: User not found`);
    throw new Error('User not found');
  }
  if (user.walletBalance < amount) {
    const err = new Error('Insufficient wallet balance');
    err.statusCode = 400;
    throw err;
  }
  const balanceBefore = user.walletBalance;
  console.log(`${step}   balanceBefore=${balanceBefore}, amount to debit=${amount}`);

  const expectedAfter = Math.round((balanceBefore - amount) * 100) / 100;
  const updateDoc = { $inc: { walletBalance: -amount } };
  const filter = { _id: userIdObj, walletBalance: { $gte: amount } };

  // 🔴 Single atomic write + fresh lean return (consistent with creditWallet pattern)
  const savedUser = await User.findOneAndUpdate(
    filter,
    updateDoc,
    { new: true, runValidators: true, context: 'query' }
  );
  if (!savedUser) {
    console.error(`${step} ❌ Mongoose findOneAndUpdate returned null (insufficient funds / concurrent)`);
    const err = new Error('Insufficient wallet balance');
    err.statusCode = 400;
    throw err;
  }

  console.log(`${step}   post-write walletBalance=${savedUser.walletBalance} (expected ${expectedAfter})`);

  try {
    await Transaction.create({
      userId: userIdObj,
      type,
      amount: -amount,
      balanceAfter: savedUser.walletBalance,
      description,
      orderId: meta.orderId || null,
      productId: meta.productId || null,
      productName: meta.productName || '',
      transactionStatus: meta.paymentStatus || 'completed',
      meta,
    });
    console.log(`${step} ✅ Transaction (debit) created`);
  } catch (txErr) {
    console.error(`${step} ❌ Transaction debit fail → REVERTING!`, txErr.message);
    try {
      await User.collection.findOneAndUpdate(
        { _id: userIdObj },
        { $inc: { walletBalance: amount } },
        { returnDocument: 'after' }
      );
    } catch (_) {}
    throw txErr;
  }

  const finalRaw = await User.findById(userIdObj).select(LEAN_SELECT).lean();
  const wrapped = wrapLeanWithToPublic(finalRaw);
  console.log(`${step} ✅ SUCCESS — final lean walletBalance=${wrapped.walletBalance}`);
  console.log(`${'-'.repeat(90)}\n`);
  return wrapped;
}
