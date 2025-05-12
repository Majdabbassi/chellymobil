import API from './api'; // ✅ Chemin vers ton fichier api.ts
import { AxiosError } from 'axios';

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
/*  HELPERS                                                           */
/* ------------------------------------------------------------------ */
const handleAxiosError = (msg: string, err: unknown) => {
  const e = err as AxiosError;
  console.error(msg, e.response?.data ?? e.message);
};

const normalizeRoles = (roles: (string | Role)[]): Role[] => {
  return roles.map((r) => (typeof r === 'string' ? { nom: r } : r));
};

/* ------------------------------------------------------------------ */
/*  API : TOUS LES UTILISATEURS                                       */
/* ------------------------------------------------------------------ */
export const getAllUsers = async (): Promise<User[]> => {
  try {
    const { data } = await API.get('/utilisateurs/');

    const rawUsers: RawUser[] = Array.isArray(data) ? data : data?.data ?? [];

    return rawUsers.map((u: RawUser) => ({
      ...u,
      roles: normalizeRoles(u.roles),
    }));
  } catch (err) {
    handleAxiosError('❌ Erreur lors de la récupération des utilisateurs', err);
    return [];
  }
};

/* ------------------------------------------------------------------ */
/*  API : UTILISATEUR PAR ID                                          */
/* ------------------------------------------------------------------ */
export const getUserById = async (userId: number): Promise<User | undefined> => {
  try {
    const { data } = await API.get(`/utilisateurs/test-dto/${userId}`);

    if (!data) return undefined;

    return {
      ...data,
      roles: normalizeRoles(data.roles),
    };
  } catch (err) {
    handleAxiosError('❌ Erreur lors de la récupération de l\'utilisateur par ID', err);
    return undefined;
  }
};

/* ------------------------------------------------------------------ */
/*  API : UTILISATEURS PAR RÔLE                                       */
/* ------------------------------------------------------------------ */
export const getUsersByRole = async (role: string): Promise<User[]> => {
  try {
    const { data } = await API.get(`/utilisateurs/role/${role}`);

    const rawUsers: RawUser[] = Array.isArray(data) ? data : data?.data ?? [];

    return rawUsers.map((u: RawUser) => ({
      ...u,
      roles: normalizeRoles(u.roles),
    }));
  } catch (err) {
    handleAxiosError('❌ Erreur lors de la récupération des utilisateurs par rôle', err);
    return [];
  }
};
