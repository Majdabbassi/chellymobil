import api from './api';

/* ----------------------------- TYPES ----------------------------- */

export interface CompetitionDTO {
  id: number;
  nom: string;
  date: string;
  lieu?: string;
  resultat?: string;
}

export interface PerformanceDTO {
  id?: number;
  note: number;
  progress: number;
  evaluationDate: string;
  commentaire: string;
  activity: string;
  team: string;
  assignedCoach: string;
  achievements: string[];
}

export interface SessionDTO {
  activity: string;
  date: string;
  location: string;
}

export interface AdherentDTO {
  id: number;
  prenom: string;
  nom: string;
  dateNaissance?: string;
  dateInscriptionClub?: string;
  tauxPresence?: number;
  coach?: { nom: string };
  activites?: {
    id: any; nom: string; prix: number 
}[];
  competitions?: CompetitionDTO[];
  performances?: PerformanceDTO[];
  prochainesSeances?: SessionDTO[];
  imageBase64?: string;
}

/* ----------------------------- ENDPOINTS ----------------------------- */

export const getAdherentById = async (
  adherentId: number | string
): Promise<AdherentDTO> => {
  const id = Number(adherentId);
  if (isNaN(id)) throw new Error(`ID d'adhérent invalide: ${adherentId}`);
  const { data } = await api.get<AdherentDTO>(`/adherents/${id}`);
  return data;
};

export const getEquipesByAdherent = async (
  adherentId: number | string
): Promise<{ id: number; nomEquipe: string; coachNom?: string }[]> => {
  const id = Number(adherentId);
  if (isNaN(id)) throw new Error(`ID d'adhérent invalide: ${adherentId}`);
  const { data } = await api.get(`/equipes/by-adherent/${id}`);
  return data;
};

export const getAdherentsOfCurrentParent = async (): Promise<AdherentDTO[]> => {
  try {
    const response = await api.get<AdherentDTO[]>('/parents/me/adherents');
    if (!Array.isArray(response.data)) {
      throw new Error("La réponse attendue est un tableau d'adhérents");
    }
    return response.data;
  } catch (error: any) {
    console.error(
      '❌ Erreur lors de la récupération des adhérents du parent connecté:',
      error?.response?.data || error.message
    );
    throw error;
  }
};

export const getActivitiesByAdherent = async (
  adherentId: number | string
): Promise<{ nom: string; prix: number }[]> => {
  const { data } = await api.get(`/activites/by-adherent/${adherentId}`);
  return data;
};

export const getPerformancesByAdherent = async (
  adherentId: number | string
): Promise<PerformanceDTO[]> => {
  const { data } = await api.get(`/performances/adherent/${adherentId}`);
  console.log("🔍 Données brutes performances =", data);

  return data.map((perf: any): PerformanceDTO => ({
    id: perf.id,
    note: perf.note,
    progress: typeof perf.note === 'number' ? perf.note : 0,
    evaluationDate: perf.date,
    commentaire: perf.commentaire || '—',
    activity: perf.activity || perf.activiteNom || perf.activite?.nom || 'Activité inconnue', // ✅ garde les vrais noms
    team: perf.team || perf.adherent?.nomEquipe || '—',
    assignedCoach: perf.assignedCoach || perf.coach?.nom || 'Non assigné',
    achievements: perf.achievements || (perf.commentaire ? [perf.commentaire] : []),
  }));
};






export const getLastPerformanceForCurrentUser = async (): Promise<PerformanceDTO | null> => {
  try {
    const { data } = await api.get('/performances/adherent/me/last');
    if (!data) return null;

    return {
      id: data.id,
      note: data.note,
      progress: typeof data.note === 'number' ? data.note : 0,
      commentaire: data.commentaire || '—',
      activity: data.activiteNom || 'Activité inconnue',
      team: data.adherent?.nomEquipe || '—',
      evaluationDate: data.date,
      assignedCoach: data.coach?.nom || 'Non assigné',
      achievements: data.commentaire ? [data.commentaire] : [],
    };
  } catch (error: any) {
    console.error("❌ Erreur lors de la récupération de la dernière performance:", error?.response?.data || error.message);
    return null;
  }
};




export const getCurrentParentInfo = async () => {
  const { data } = await api.get('/parents/me');
  return data;
};

export const getCompetitionsByAdherent = async (
  adherentId: number | string
): Promise<CompetitionDTO[]> => {
  const { data } = await api.get(`/competitions/adherent/${adherentId}`);
  return data;
};


export const getNextSessionByAdherent = async (
  adherentId: number | string
): Promise<SessionDTO | null> => {
  const { data: session } = await api.get(`/sessions/next/adherent/${adherentId}`);
  if (!session) return null;

  const [{ data: activite }, { data: lieu }] = await Promise.all([
    api.get(`/activites/${session.activiteId}`),
    api.get(`/lieux/${session.lieuId}`),
  ]);

  return {
    activity: activite.nom,
    date: session.dateTime,
    location: lieu.nom,
  };
};