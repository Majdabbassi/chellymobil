import axios, { AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

/* ------------------------------------------------------------------ */
/*  TYPES                                                             */
/* ------------------------------------------------------------------ */
export interface Role {
  id?: number;
  nom: string;
}

export interface User {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  telephone?: string;
  imageBase64?: string;
    roles: Role[];
}

type RawUser = {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  telephone?: string;
  imageBase64?: string;
  roles: (string | Role)[];
};

/* ------------------------------------------------------------------ */
/*  CONSTANTES & HELPERS                                              */
/* ------------------------------------------------------------------ */
const BASE_URL = 'http://192.168.100.4:8080/api/utilisateurs'; // ⚠️ adapte ton IP si nécessaire

const handleAxiosError = (msg: string, err: unknown) => {
  const e = err as AxiosError;
  console.error(msg, e.response?.data ?? e.message);
};

const getAuthHeaders = async () => {
  const token = await AsyncStorage.getItem('token');
  return token
    ? { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    : undefined;
};

const normalizeRoles = (roles: (string | Role)[]): Role[] => {
  return roles.map((r) => (typeof r === 'string' ? { nom: r } : r));
};

/* ------------------------------------------------------------------ */
/*  API : TOUS LES UTILISATEURS                                       */
/* ------------------------------------------------------------------ */
export const getAllUsers = async (): Promise<User[]> => {
  try {
    const headers = await getAuthHeaders();
    const { data } = await axios.get(`${BASE_URL}/`, headers);

    const rawUsers: RawUser[] = Array.isArray(data) ? data : data?.data ?? [];

    const normalizedUsers: User[] = rawUsers.map((u: RawUser) => ({
      ...u,
      roles: normalizeRoles(u.roles),
    }));

    return normalizedUsers;
  } catch (err) {
    handleAxiosError('Error fetching users', err);
    return [];
  }
};

/* ------------------------------------------------------------------ */
/*  API : UTILISATEUR PAR ID                                          */
/* ------------------------------------------------------------------ */
export const getUserById = async (userId: number): Promise<User | undefined> => {
  try {
    const headers = await getAuthHeaders();
    const { data } = await axios.get(`${BASE_URL}/test-dto/${userId}`, headers);

    if (!data) return undefined;

    const rawUser: RawUser = data;

    return {
      ...rawUser,
      roles: normalizeRoles(rawUser.roles),
    };
  } catch (err) {
    handleAxiosError('Error fetching user by id', err);
    return undefined;
  }
};

/* ------------------------------------------------------------------ */
/*  API : UTILISATEURS PAR RÔLE                                       */
/* ------------------------------------------------------------------ */
export const getUsersByRole = async (role: string): Promise<User[]> => {
  try {
    const headers = await getAuthHeaders();
    const { data } = await axios.get(`${BASE_URL}/role/${role}`, headers);

    const rawUsers: RawUser[] = Array.isArray(data) ? data : data?.data ?? [];

    return rawUsers.map((u: RawUser) => ({
      ...u,
      roles: normalizeRoles(u.roles),
    }));
  } catch (err) {
    handleAxiosError('Error fetching users by role', err);
    return [];
  }
};
