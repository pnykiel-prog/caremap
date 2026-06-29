/**
 * Shared survey types — safe to import from both Server and Client components.
 */

export interface TrendPoint {
  surveyId:  string;
  dateLabel: string;  // short formatted label for axis
  dateFull:  string;  // full date for tooltip
  k1:        number | null;
  k2:        number | null;
  k3:        number | null;
  k4:        number | null;
  level:     number | null;
}
