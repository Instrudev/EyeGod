import { CoverageZone, CollaboratorProgress, fetchCollaboratorProgress, fetchCoverageZones } from '@services/dashboardService';
import { fetchUsersByRole, UserResponse } from '@services/userService';
import { fetchSurveys } from '@services/surveyService';

export interface LeaderDashboardData {
  collaborators: UserResponse[];
  coverage: CoverageZone[];
  progress: CollaboratorProgress[];
  metrics: {
    totalCollaborators: number;
    activeCollaborators: number;
    teamSurveys: number;
    averageProgress: number;
  };
}

export interface LeaderSurveyStats {
  validVoters: number;
  totalSurveys: number;
}

const calculateMetrics = (
  collaborators: UserResponse[],
  progress: CollaboratorProgress[],
): LeaderDashboardData['metrics'] => {
  const totalCollaborators = collaborators.length;
  const activeCollaborators = collaborators.filter((col) => col.is_active).length;
  const teamSurveys = progress.reduce((sum, item) => sum + (item.encuestas_realizadas || 0), 0);
  const progressValues = progress.map((item) => {
    const goal = item.meta_encuestas || 0;
    const done = item.encuestas_realizadas || 0;
    if (goal <= 0) return 0;
    return Math.min(100, Math.round((done / goal) * 100));
  });
  const averageProgress = progressValues.length
    ? Math.round(progressValues.reduce((sum, value) => sum + value, 0) / progressValues.length)
    : 0;

  return { totalCollaborators, activeCollaborators, teamSurveys, averageProgress };
};

export const fetchLeaderDashboard = async (): Promise<LeaderDashboardData> => {
  const [collaborators, coverage, progress] = await Promise.all([
    fetchUsersByRole('COLABORADOR'),
    fetchCoverageZones(),
    fetchCollaboratorProgress(),
  ]);

  return {
    collaborators,
    coverage,
    progress,
    metrics: calculateMetrics(collaborators, progress),
  };
};

export const fetchLeaderSurveyStats = async (): Promise<LeaderSurveyStats> => {
  const surveys = await fetchSurveys();
  const validVoters = surveys.filter((survey) => survey.votante_valido).length;
  return { validVoters, totalSurveys: surveys.length };
};
