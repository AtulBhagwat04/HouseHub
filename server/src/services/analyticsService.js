import Expense from '../models/Expense.js';
import { CATEGORY_COLORS } from '../../../shared/constants.js';
import { toRupees } from '../../../shared/money.js';
import User from '../models/User.js';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function monthKey(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Chart data for the Expenses analytics section.
 *
 * NOTE: MongoDB's $year/$month operators bucket in UTC. For an Indian household
 * that means an expense added at 3am IST lands in the previous UTC day. That is
 * acceptable for monthly totals and avoids a timezone library, but it is worth
 * knowing if a daily chart is ever added.
 */
export async function buildAnalytics(house, { months = 6 } = {}) {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCMonth(start.getUTCMonth() - (months - 1));

  const [monthlyRaw, categoryRaw, payerRaw, totalsRaw] = await Promise.all([
    Expense.aggregate([
      { $match: { house: house._id, date: { $gte: start } } },
      {
        $group: {
          _id: { year: { $year: '$date' }, month: { $month: '$date' } },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
    Expense.aggregate([
      { $match: { house: house._id } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]),
    Expense.aggregate([
      { $match: { house: house._id } },
      { $group: { _id: '$paidBy', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]),
    Expense.aggregate([{ $match: { house: house._id } }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
  ]);

  const monthly = monthlyRaw.map((entry) => ({
    key: monthKey(entry._id.year, entry._id.month),
    label: `${MONTH_LABELS[entry._id.month - 1]} ${String(entry._id.year).slice(2)}`,
    total: entry.total,
    totalRupees: toRupees(entry.total),
    count: entry.count,
  }));

  const grandTotal = totalsRaw[0]?.total || 0;

  const categories = categoryRaw.map((entry) => ({
    category: entry._id || 'other',
    total: entry.total,
    totalRupees: toRupees(entry.total),
    count: entry.count,
    color: CATEGORY_COLORS[entry._id] || CATEGORY_COLORS.other,
    percentage: grandTotal > 0 ? Math.round((entry.total / grandTotal) * 1000) / 10 : 0,
  }));

  const payerIds = payerRaw.map((entry) => entry._id).filter(Boolean);
  const payers = await User.find({ _id: { $in: payerIds } }).select('name avatarUrl').lean();
  const nameById = new Map(payers.map((user) => [String(user._id), user]));

  const memberSpending = payerRaw.map((entry) => {
    const user = nameById.get(String(entry._id));
    return {
      user: String(entry._id),
      name: user?.name || 'Former member',
      avatarUrl: user?.avatarUrl || '',
      total: entry.total,
      totalRupees: toRupees(entry.total),
      count: entry.count,
      percentage: grandTotal > 0 ? Math.round((entry.total / grandTotal) * 1000) / 10 : 0,
    };
  });

  return {
    monthly,
    categories,
    memberSpending,
    totals: {
      total: grandTotal,
      totalRupees: toRupees(grandTotal),
      expenseCount: totalsRaw[0]?.count || 0,
      average: totalsRaw[0]?.count ? Math.round(grandTotal / totalsRaw[0].count) : 0,
    },
  };
}

export default { buildAnalytics };
