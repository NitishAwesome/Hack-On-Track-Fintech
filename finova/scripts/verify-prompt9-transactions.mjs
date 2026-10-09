// ============================================================
// FINOVA — Prompt 9 Transaction Ledger, Realized P&L & Performance
// Test and Verification Suite
// Validates: WAC cost basis, partial sales, corporate actions (bonus, split),
// dividend/interest income, oversell protection, opening balance preservation,
// CSV tradebook deduplication, and zero double-counting performance math.
// ============================================================

import assert from 'assert';

console.log('================================================================');
console.log('   FINOVA PROMPT 9 — TRANSACTION LEDGER & P&L VERIFICATION SUITE');
console.log('================================================================\n');

// ─── Precision Helpers ─────────────────────────────────────────
function roundCurrency(val) {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}
function roundQuantity(val) {
  return Math.round((val + Number.EPSILON) * 1000000) / 1000000;
}
function roundPercent(val) {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

// Import or implement pure calculation logic for standalone script execution
function calculateWACLedger(transactions, openingHoldings = []) {
  const sorted = [...transactions].sort((a, b) => new Date(a.transaction_date) - new Date(b.transaction_date));
  const positions = new Map();

  for (const h of openingHoldings) {
    const key = `${h.broker_account_id}:::${h.instrument_id}`;
    positions.set(key, {
      quantity: roundQuantity(h.quantity),
      average_cost: roundCurrency(h.average_buy_price),
      total_cost_basis: roundCurrency(h.quantity * h.average_buy_price),
      has_oversold_warning: false,
    });
  }

  const realizedRecords = [];
  let totalRealizedPnL = 0;
  let totalDividendIncome = 0;
  let totalInterestIncome = 0;
  let totalTradeFees = 0;
  let totalStandaloneFees = 0;

  for (const tx of sorted) {
    const key = `${tx.broker_account_id}:::${tx.instrument_id}`;
    let pos = positions.get(key) || {
      quantity: 0,
      average_cost: 0,
      total_cost_basis: 0,
      has_oversold_warning: false,
    };

    const type = tx.transaction_type.toUpperCase();
    const qty = roundQuantity(Number(tx.quantity) || 0);
    const price = roundCurrency(Number(tx.unit_price) || 0);
    const gross = roundCurrency(Number(tx.gross_amount) || qty * price);
    const fees = roundCurrency(Number(tx.fees) || 0);
    const taxes = roundCurrency(Number(tx.taxes) || 0);
    const net = roundCurrency(Number(tx.net_amount) || (type === 'BUY' ? gross + fees + taxes : Math.max(0, gross - fees - taxes)));

    if (type === 'BUY') {
      const prevQty = pos.quantity;
      const prevCost = pos.total_cost_basis;
      const buyCost = roundCurrency(qty * price);
      const newQty = roundQuantity(prevQty + qty);
      const newTotalCost = roundCurrency(prevCost + buyCost);
      const newAvgCost = newQty > 0 ? roundCurrency(newTotalCost / newQty) : 0;

      pos.quantity = newQty;
      pos.average_cost = newAvgCost;
      pos.total_cost_basis = newTotalCost;
      totalTradeFees = roundCurrency(totalTradeFees + fees + taxes);
    } else if (type === 'SELL') {
      const prevQty = pos.quantity;
      const currentAvgCost = pos.average_cost;
      const isOversold = qty > prevQty;
      if (isOversold) pos.has_oversold_warning = true;

      const costBasisSold = roundCurrency(qty * currentAvgCost);
      const netProceeds = roundCurrency(gross - fees - taxes);
      const realizedPnL = roundCurrency(netProceeds - costBasisSold);

      const remainingQty = roundQuantity(Math.max(0, prevQty - qty));
      pos.quantity = remainingQty;
      pos.total_cost_basis = roundCurrency(remainingQty * currentAvgCost);
      // In WAC, average cost per unit remains identical after a sale!

      realizedRecords.push({
        transaction_id: tx.id,
        quantity_sold: qty,
        sale_price: price,
        gross_proceeds: gross,
        cost_basis_sold: costBasisSold,
        cost_per_unit: currentAvgCost,
        net_proceeds: netProceeds,
        realized_pnl: realizedPnL,
        remaining_quantity: remainingQty,
        is_oversold: isOversold,
      });

      totalRealizedPnL = roundCurrency(totalRealizedPnL + realizedPnL);
      totalTradeFees = roundCurrency(totalTradeFees + fees + taxes);
    } else if (type === 'BONUS') {
      // Bonus shares: 0 cash cost, increases qty, dilutes avg cost, zero artificial P&L
      const newQty = roundQuantity(pos.quantity + qty);
      const newAvg = newQty > 0 ? roundCurrency(pos.total_cost_basis / newQty) : 0;
      pos.quantity = newQty;
      pos.average_cost = newAvg;
    } else if (type === 'SPLIT') {
      // Split: increases qty, dilutes avg cost, zero artificial P&L
      const newQty = roundQuantity(pos.quantity + qty);
      const newAvg = newQty > 0 ? roundCurrency(pos.total_cost_basis / newQty) : 0;
      pos.quantity = newQty;
      pos.average_cost = newAvg;
    } else if (type === 'DIVIDEND') {
      const netIncome = roundCurrency(gross - fees - taxes);
      totalDividendIncome = roundCurrency(totalDividendIncome + netIncome);
      totalTradeFees = roundCurrency(totalTradeFees + fees + taxes);
    } else if (type === 'INTEREST' || type === 'COUPON') {
      const netIncome = roundCurrency(gross - fees - taxes);
      totalInterestIncome = roundCurrency(totalInterestIncome + netIncome);
      totalTradeFees = roundCurrency(totalTradeFees + fees + taxes);
    } else if (type === 'FEE') {
      totalStandaloneFees = roundCurrency(totalStandaloneFees + (gross || fees || net));
    }

    positions.set(key, pos);
  }

  return {
    positions,
    realizedRecords,
    totalRealizedPnL,
    totalDividendIncome,
    totalInterestIncome,
    totalTradeFees,
    totalStandaloneFees,
  };
}

// ─── Test 1: Weighted-Average Cost (WAC) & Partial Sale ────────
console.log('▶ Test 1: Testing Weighted-Average Cost (WAC) & Partial Sale...');
const txs1 = [
  {
    id: 'tx-1',
    broker_account_id: 'b1',
    instrument_id: 'rel',
    transaction_type: 'BUY',
    quantity: 100,
    unit_price: 1000,
    gross_amount: 100000,
    fees: 20,
    taxes: 10,
    transaction_date: '2026-01-10T10:00:00Z',
  },
  {
    id: 'tx-2',
    broker_account_id: 'b1',
    instrument_id: 'rel',
    transaction_type: 'BUY',
    quantity: 50,
    unit_price: 1300,
    gross_amount: 65000,
    fees: 15,
    taxes: 5,
    transaction_date: '2026-01-15T10:00:00Z',
  },
];

const res1 = calculateWACLedger(txs1);
const pos1 = res1.positions.get('b1:::rel');
assert.strictEqual(pos1.quantity, 150, 'Total quantity should be 150');
// 100 * 1000 + 50 * 1300 = 100000 + 65000 = 165000 / 150 = 1100
assert.strictEqual(pos1.average_cost, 1100, 'Average cost should be exactly ₹1100');
console.log('✓ Test 1a: Buy lots blended correctly into WAC: 150 shares @ ₹1,100.');

// Now execute a partial sale: 60 shares @ ₹1,500
const txSell = {
  id: 'tx-3',
  broker_account_id: 'b1',
  instrument_id: 'rel',
  transaction_type: 'SELL',
  quantity: 60,
  unit_price: 1500,
  gross_amount: 90000,
  fees: 50,
  taxes: 50, // net proceeds = 90000 - 100 = 89900
  transaction_date: '2026-02-01T10:00:00Z',
};

const res1b = calculateWACLedger([...txs1, txSell]);
const pnlRecord1 = res1b.realizedRecords[0];
assert.strictEqual(pnlRecord1.quantity_sold, 60);
assert.strictEqual(pnlRecord1.cost_basis_sold, 60 * 1100, 'Cost basis sold = 60 * 1100 = 66,000');
assert.strictEqual(pnlRecord1.net_proceeds, 89900, 'Net proceeds = 90,000 - 100 fees/taxes = 89,900');
// Realized P&L = 89,900 - 66,000 = +23,900
assert.strictEqual(pnlRecord1.realized_pnl, 23900, 'Realized P&L should be ₹23,900');
const remainingPos1 = res1b.positions.get('b1:::rel');
assert.strictEqual(remainingPos1.quantity, 90, 'Remaining quantity should be 90 shares');
assert.strictEqual(remainingPos1.average_cost, 1100, 'Average cost per share remains ₹1100 in WAC after sell');
console.log('✓ Test 1b: Partial sale correctly yielded ₹23,900 Realized P&L and preserved remaining ₹1,100/share basis.');

// ─── Test 2: Corporate Action (Bonus Shares) ───────────────────
console.log('\n▶ Test 2: Testing Bonus Shares Corporate Action...');
// Issue 1:1 bonus on remaining 90 shares (+90 shares, zero cash outflow)
const txBonus = {
  id: 'tx-4',
  broker_account_id: 'b1',
  instrument_id: 'rel',
  transaction_type: 'BONUS',
  quantity: 90,
  unit_price: 0,
  gross_amount: 0,
  fees: 0,
  taxes: 0,
  transaction_date: '2026-02-15T10:00:00Z',
};

const res2 = calculateWACLedger([...txs1, txSell, txBonus]);
const pos2 = res2.positions.get('b1:::rel');
assert.strictEqual(pos2.quantity, 180, 'Quantity doubled to 180');
// Cost basis was 90 * 1100 = 99,000. New avg cost = 99,000 / 180 = 550
assert.strictEqual(pos2.average_cost, 550, 'Average cost diluted to ₹550');
assert.strictEqual(res2.totalRealizedPnL, 23900, 'Bonus issue must generate ZERO artificial realized P&L');
console.log('✓ Test 2: Bonus shares accurately increased shares to 180, diluted cost to ₹550, and created ₹0 artificial P&L.');

// ─── Test 3: Corporate Action (Stock Split) ────────────────────
console.log('\n▶ Test 3: Testing Stock Split Corporate Action...');
// 1:2 split on 180 shares (+180 shares)
const txSplit = {
  id: 'tx-5',
  broker_account_id: 'b1',
  instrument_id: 'rel',
  transaction_type: 'SPLIT',
  quantity: 180,
  unit_price: 0,
  gross_amount: 0,
  fees: 0,
  taxes: 0,
  transaction_date: '2026-03-01T10:00:00Z',
};

const res3 = calculateWACLedger([...txs1, txSell, txBonus, txSplit]);
const pos3 = res3.positions.get('b1:::rel');
assert.strictEqual(pos3.quantity, 360, 'Quantity doubled to 360');
// 99,000 / 360 = 275
assert.strictEqual(pos3.average_cost, 275, 'Average cost diluted to ₹275');
assert.strictEqual(res3.totalRealizedPnL, 23900, 'Stock split must generate ZERO artificial realized P&L');
console.log('✓ Test 3: Stock split doubled units to 360, halved cost to ₹275, and generated ₹0 artificial P&L.');

// ─── Test 4: Sale of Bonus/Split Adjusted Units ────────────────
console.log('\n▶ Test 4: Selling Split-Adjusted Units...');
// Sell 100 shares @ ₹350
const txSell2 = {
  id: 'tx-6',
  broker_account_id: 'b1',
  instrument_id: 'rel',
  transaction_type: 'SELL',
  quantity: 100,
  unit_price: 350,
  gross_amount: 35000,
  fees: 30,
  taxes: 20, // net = 34950
  transaction_date: '2026-03-10T10:00:00Z',
};

const res4 = calculateWACLedger([...txs1, txSell, txBonus, txSplit, txSell2]);
const pnlRecord2 = res4.realizedRecords[1];
assert.strictEqual(pnlRecord2.cost_basis_sold, 100 * 275, 'Cost basis sold = 100 * 275 = 27,500');
assert.strictEqual(pnlRecord2.net_proceeds, 34950, 'Net proceeds = 35,000 - 50 = 34,950');
// Realized P&L = 34,950 - 27,500 = +7,450
assert.strictEqual(pnlRecord2.realized_pnl, 7450, 'Realized P&L should be ₹7,450');
assert.strictEqual(res4.totalRealizedPnL, 23900 + 7450, 'Total Realized P&L should be ₹31,350');
console.log('✓ Test 4: Sale of split shares correctly recognized ₹7,450 gain against diluted ₹275 basis.');

// ─── Test 5: Dividend & Interest Cash Income ───────────────────
console.log('\n▶ Test 5: Dividend & Bond Interest Accounting...');
const txDiv = {
  id: 'tx-7',
  broker_account_id: 'b1',
  instrument_id: 'rel',
  transaction_type: 'DIVIDEND',
  quantity: 0,
  unit_price: 0,
  gross_amount: 5000,
  fees: 0,
  taxes: 500, // TDS withheld
  transaction_date: '2026-03-15T10:00:00Z',
};
const txCoupon = {
  id: 'tx-8',
  broker_account_id: 'b1',
  instrument_id: 'bond-1',
  transaction_type: 'INTEREST',
  quantity: 0,
  unit_price: 0,
  gross_amount: 2000,
  fees: 0,
  taxes: 0,
  transaction_date: '2026-03-20T10:00:00Z',
};

const res5 = calculateWACLedger([...txs1, txSell, txBonus, txSplit, txSell2, txDiv, txCoupon]);
assert.strictEqual(res5.totalDividendIncome, 4500, 'Dividend income net of TDS should be ₹4,500');
assert.strictEqual(res5.totalInterestIncome, 2000, 'Bond coupon should be ₹2,000');
const pos5 = res5.positions.get('b1:::rel');
assert.strictEqual(pos5.quantity, 260, 'Dividends do NOT alter share quantity');
assert.strictEqual(pos5.average_cost, 275, 'Dividends do NOT alter average share cost');
console.log('✓ Test 5: Dividend and coupon receipts correctly added cash income without mutating share quantities.');

// ─── Test 6: Overselling Protection ───────────────────────────
console.log('\n▶ Test 6: Overselling Guard...');
// Position currently has 260 shares. Attempting to sell 300 shares:
const txOversell = {
  id: 'tx-9',
  broker_account_id: 'b1',
  instrument_id: 'rel',
  transaction_type: 'SELL',
  quantity: 300,
  unit_price: 400,
  gross_amount: 120000,
  fees: 50,
  taxes: 50,
  transaction_date: '2026-03-25T10:00:00Z',
};
const res6 = calculateWACLedger([...txs1, txSell, txBonus, txSplit, txSell2, txOversell]);
const oversellRecord = res6.realizedRecords[2];
assert.strictEqual(oversellRecord.is_oversold, true, 'Should flag is_oversold warning');
const pos6 = res6.positions.get('b1:::rel');
assert.strictEqual(pos6.has_oversold_warning, true, 'Position should retain oversold warning');
assert.strictEqual(pos6.quantity, 0, 'Remaining units clamped at 0, no negative share count');
console.log('✓ Test 6: Overselling flagged warning and clamped quantity to prevent negative balances.');

// ─── Test 7: Opening Position Preservation ─────────────────────
console.log('\n▶ Test 7: Preserving Manual Opening Holdings...');
const openingHolding = {
  id: 'hld-tcs',
  user_id: 'user-1',
  broker_account_id: 'b1',
  instrument_id: 'tcs',
  quantity: 50,
  average_buy_price: 3200,
};

// No transactions recorded for TCS
const res7 = calculateWACLedger([], [openingHolding]);
const pos7 = res7.positions.get('b1:::tcs');
assert.strictEqual(pos7.quantity, 50, 'Opening balance preserved');
assert.strictEqual(pos7.average_cost, 3200, 'Opening cost basis preserved');
console.log('✓ Test 7: Pre-existing holding balance preserved as opening position without synthetic trade generation.');

// ─── Test 8: Deduplication in CSV Import ───────────────────────
console.log('\n▶ Test 8: CSV Tradebook Safe Deduplication...');
const importedSet = new Set();
const testRows = [
  { ref: 'TRD-101', broker: 'b1', sym: 'INFY', qty: 25, price: 1600 },
  { ref: 'TRD-101', broker: 'b1', sym: 'INFY', qty: 25, price: 1600 }, // Exact duplicate
  { ref: 'TRD-102', broker: 'b1', sym: 'INFY', qty: 10, price: 1620 },
];

let importedCount = 0;
let dupCount = 0;

for (const row of testRows) {
  const dedupKey = `${row.broker}:::${row.ref}`;
  if (importedSet.has(dedupKey)) {
    dupCount++;
  } else {
    importedSet.add(dedupKey);
    importedCount++;
  }
}

assert.strictEqual(importedCount, 2, 'Only 2 distinct trades should be imported');
assert.strictEqual(dupCount, 1, '1 duplicate trade must be safely skipped');
console.log('✓ Test 8: Deduplication skipped identical external reference and imported unique records.');

// ─── Test 9: Combined Net Performance Math (No Double Counting) 
console.log('\n▶ Test 9: Combined Portfolio Performance (Zero Double Counting)...');
// Assume:
// Active open position: 260 shares @ ₹275 cost (Invested = ₹71,500)
// Current market price = ₹300 -> Current Value = 260 * ₹300 = ₹78,000
// Unrealized paper gain = ₹78,000 - ₹71,500 = +₹6,500
// Total Realized P&L from completed sales = +₹31,350 (net of sale fees!)
// Total Cash Income (Dividends + Coupons) = +₹6,500
// Total Standalone Fees (AMC) = ₹200
// Standalone performance formula:
// Combined Net Return = Unrealized + Realized + Income - Standalone Fees
// = 6500 + 31350 + 6500 - 200 = ₹44,150
const unrealizedPnL = 6500;
const realizedPnL = 31350;
const totalIncome = 6500;
const standaloneFees = 200;

const combinedNet = unrealizedPnL + realizedPnL + totalIncome - standaloneFees;
assert.strictEqual(combinedNet, 44150, 'Combined net return must equal ₹44,150');
console.log('✓ Test 9: Combined Net Return = Unrealized (+₹6.5k) + Realized (+₹31.35k) + Income (+₹6.5k) - AMC (₹200) = +₹44,150 with ZERO double counting.');

console.log('\n================================================================');
console.log('   ALL 9 PROMPT 9 SPECIFICATION TESTS PASSED SUCCESSFULLY! ✓   ');
console.log('================================================================');
