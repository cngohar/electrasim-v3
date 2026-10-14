/** Historical share-code metadata only; no Diagnosis generation or grading runtime. */
export const LEGACY_DIAGNOSIS_PROFILE_VERSION = 'diagnosis-profile-score-1';
export interface ReplayAssessmentIdentity {
  version: 1;
  modelVersion: string;
  engineVersion: string;
  profileVersion: string;
}
