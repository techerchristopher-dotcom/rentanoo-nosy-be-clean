import { useQuery } from "@tanstack/react-query";
import { BACK_OFFICE_QUERY_KEYS } from "../constants";
import * as reportsService from "../services/reportsService";

export function useReportsSummary() {
  return useQuery({
    queryKey: BACK_OFFICE_QUERY_KEYS.reports,
    queryFn: reportsService.getReportsSummary,
  });
}
