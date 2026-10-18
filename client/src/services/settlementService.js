import { http } from '@/lib/api';

const base = (houseId) => `/houses/${houseId}/settlements`;

export async function listSettlements(houseId, params = {}) {
  const body = await http.get(base(houseId), params);
  return { items: body.data, meta: body.meta };
}

export async function createSettlement(houseId, { from, to, amount, note }) {
  const body = await http.post(base(houseId), { from, to, amount, note });
  return body.data.settlement;
}

export async function confirmSettlement(houseId, settlementId) {
  const body = await http.post(`${base(houseId)}/${settlementId}/confirm`);
  return body.data.settlement;
}

export async function rejectSettlement(houseId, settlementId, reason = '') {
  const body = await http.post(`${base(houseId)}/${settlementId}/reject`, { reason });
  return body.data.settlement;
}

export async function remindSettlement(houseId, settlementId) {
  const body = await http.post(`${base(houseId)}/${settlementId}/remind`);
  return body.message;
}

export async function cancelSettlement(houseId, settlementId) {
  const body = await http.delete(`${base(houseId)}/${settlementId}`);
  return body.message;
}

export default {
  listSettlements,
  createSettlement,
  confirmSettlement,
  rejectSettlement,
  remindSettlement,
  cancelSettlement,
};
