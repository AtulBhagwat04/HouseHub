import { http } from '@/lib/api';

export async function fetchAchievements(houseId) {
  const body = await http.get(`/houses/${houseId}/achievements`);
  return body.data;
}

export default { fetchAchievements };
