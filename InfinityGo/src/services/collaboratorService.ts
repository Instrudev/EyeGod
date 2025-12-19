import { CoverageZone, fetchCoverageZones } from '@services/dashboardService';
import { SurveyRow, fetchSurveys } from '@services/surveyService';

export interface CollaboratorMetrics {
  totalSurveys: number;
  assignedGoal: number;
  progressPercentage: number;
  coveredZones: number;
  pendingZones: number;
}

export interface CollaboratorDashboardData {
  coverage: CoverageZone[];
  surveys: SurveyRow[];
  metrics: CollaboratorMetrics;
}

const calculateMetrics = (coverage: CoverageZone[], surveys: SurveyRow[]): CollaboratorMetrics => {
  const totalSurveys = surveys.length;
  const assignedGoal = coverage.reduce((sum, zone) => sum + (zone.meta_encuestas || 0), 0);
  const coveredZones = coverage.filter((zone) => zone.total_encuestas >= zone.meta_encuestas).length;
  const pendingZones = Math.max(coverage.length - coveredZones, 0);
  const progressPercentage = assignedGoal > 0 ? Math.min(100, Math.round((totalSurveys / assignedGoal) * 100)) : 0;

  return {
    totalSurveys,
    assignedGoal,
    progressPercentage,
    coveredZones,
    pendingZones,
  };
};

export const fetchCollaboratorDashboard = async (): Promise<CollaboratorDashboardData> => {
  const [coverage, surveys] = await Promise.all([fetchCoverageZones(), fetchSurveys()]);
  return { coverage, surveys, metrics: calculateMetrics(coverage, surveys) };
};

export const fetchCollaboratorProgress = async () => {
  const [coverage, surveys] = await Promise.all([fetchCoverageZones(), fetchSurveys()]);
  return { coverage, surveys, metrics: calculateMetrics(coverage, surveys) };
};

export const filterSurveysByDate = (surveys: SurveyRow[], start?: Date | null, end?: Date | null) => {
  return surveys.filter((survey) => {
    const createdAt = new Date(survey.fecha_creacion);
    if (Number.isNaN(createdAt.getTime())) return false;
    if (start && createdAt < start) return false;
    if (end) {
      const endOfDay = new Date(end);
      endOfDay.setHours(23, 59, 59, 999);
      if (createdAt > endOfDay) return false;
    }
    return true;
  });
};
