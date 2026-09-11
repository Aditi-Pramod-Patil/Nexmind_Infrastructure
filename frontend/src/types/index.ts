export type Role = 'employer' | 'worker';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  designation: string;
  department?: string;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  location: string;
  client: string;
  startDate: string;
  targetCompletion: string;
  baselineProgress: number;
  actualProgress: number;
  status: 'On Schedule' | 'Delayed' | 'Critical';
  disciplinesCount: number;
  totalActivities: number;
  manager: string;
  description: string;
}

export interface Discipline {
  id: string;
  name: string;
  code: string;
  plannedProgress: number;
  actualProgress: number;
  status: 'On Track' | 'Delayed' | 'At Risk';
  delayedActivitiesCount: number;
  manager: string;
}

export type WBSLevel = 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6';

export interface ScheduleActivity {
  id: string;
  activityId: string;
  name: string;
  discipline: string;
  wbsLevel: WBSLevel;
  l5Name: string;
  l6Name: string;
  parentId?: string;
  plannedStart: string;
  plannedFinish: string;
  actualStart?: string;
  actualFinish?: string;
  plannedProgress: number;
  actualProgress: number;
  variance: number;
  status: 'Not Started' | 'In Progress' | 'Completed' | 'Delayed' | 'At Risk' | 'On Track';
  aiConfidence: number;
  delayDays?: number;
  riskLevel?: 'Low' | 'Medium' | 'High' | 'Critical';
  location?: string;
  progressTimeline?: { day: string; progress: number }[];
  detectedEvidence?: string[];
  siteImages?: string[];
}

export interface SegmentationElement {
  className: string;
  confidence: number;
  areaPercentage: number;
  colorHex: string;
}

export interface SiteImageAnalysis {
  id: string;
  timestamp: string;
  location: string;
  discipline: string;
  originalImageUrl: string;
  segmentationOverlayUrl?: string;
  detectedActivityId: string;
  detectedActivityName: string;
  confidence: number;
  progressEstimate: number;
  segmentationClasses: SegmentationElement[];
}

export interface AIActivityMatch {
  id: string;
  rawInput: string;
  discipline: string;
  eventType: string;
  date: string;
  suggestedActivityId: string;
  suggestedActivityName: string;
  confidence: number;
  reasoningChecklist: string[];
  status: 'High Confidence Match' | 'Low Confidence - Planner Review Required' | 'Potential New Activity' | 'Conflicting Data';
}

export interface RiskItem {
  id: string;
  severity: 'HIGH' | 'MED' | 'LOW';
  activityId: string;
  activityName: string;
  discipline: string;
  cause: string;
  scheduleImpactDays: number;
  probability: number;
  recommendedAction: string;
}

export interface AIInsight {
  id: string;
  title: string;
  category: 'Schedule Variance' | 'Velocity Warning' | 'Pattern Detection' | 'Visual Progress';
  description: string;
  impact: string;
  recommendation: string;
  confidence: number;
  timestamp: string;
}

export interface HistoricalProject {
  id: string;
  projectName: string;
  activityType: string;
  plannedDurationDays: number;
  actualDurationDays: number;
  commonDelayCause: string;
}

export interface WorkerTask {
  id: string;
  activityId: string;
  name: string;
  discipline: string;
  location: string;
  plannedProgress: number;
  reportedProgress: number;
  status: 'In Progress' | 'Completed' | 'Not Started';
}

export interface WorkerReportSubmission {
  id: string;
  activityId: string;
  activityName: string;
  location: string;
  reportedProgress: number;
  voiceTranscript?: string;
  textNotes?: string;
  imageUrl?: string;
  aiConfidence: number;
  matchedL6: string;
  submittedAt: string;
  status: 'Pending Employer Verification' | 'Approved';
}

export interface NotificationItem {
  id: string;
  type: 'low_confidence' | 'activity_delayed' | 'discrepancy' | 'new_activity' | 'risk_increased' | 'review_required';
  title: string;
  message: string;
  timestamp: string;
  unread: boolean;
  targetRoute?: string;
}
