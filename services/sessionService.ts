import axios from 'axios';

// URL du backend local
const BASE_URL = 'http://192.168.100.4:8080';

export const getCalendarSessions = async (params: {
  coachId?: number;
  adherentId?: number;
  parentId?: number;
  activiteId?: number;
  equipeId?: number;
  lieuId?: number;
  month?: number;
  year?: number;
}) => {
  const response = await axios.get(`${BASE_URL}/api/sessions/calendar`, {
    params,
  });
  return response.data;
};
