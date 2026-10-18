import { http } from '@/lib/api';

const base = (houseId) => `/houses/${houseId}/expenses`;

/**
 * `amount` is always integer paise. Pages convert user input with
 * parseAmountToPaise() before calling this - a float never leaves the browser.
 */
export async function listExpenses(houseId, params = {}) {
  const body = await http.get(base(houseId), params);
  return { items: body.data, meta: body.meta };
}

export async function getExpense(houseId, expenseId) {
  const body = await http.get(`${base(houseId)}/${expenseId}`);
  return { expense: body.data.expense, settlement: body.data.settlement };
}

export async function createExpense(houseId, payload) {
  const body = await http.post(base(houseId), payload);
  return body.data.expense;
}

export async function updateExpense(houseId, expenseId, payload) {
  const body = await http.patch(`${base(houseId)}/${expenseId}`, payload);
  return body.data.expense;
}

export async function deleteExpense(houseId, expenseId) {
  const body = await http.delete(`${base(houseId)}/${expenseId}`);
  return body.message;
}

export default { listExpenses, getExpense, createExpense, updateExpense, deleteExpense };
