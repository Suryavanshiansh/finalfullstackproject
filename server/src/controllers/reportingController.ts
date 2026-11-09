import { Request, Response, NextFunction } from 'express';
import { reportingService } from '../services/reportingService';

export class ReportingController {
  async getFacultyContributionReport(req: Request, res: Response, next: NextFunction) {
    try {
      let departmentId = req.query.departmentId as string;
      if (req.user?.role === 'REVIEWER') {
        departmentId = req.user.departmentId || departmentId;
      }

      const report = await reportingService.getFacultyContributionReport({
        departmentId,
        academicSessionId: req.query.academicSessionId as string,
      });

      res.json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }

  async getDepartmentAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const analytics = await reportingService.getDepartmentAnalytics(
        req.query.academicSessionId as string
      );
      res.json({ success: true, data: analytics });
    } catch (err) {
      next(err);
    }
  }

  async getActivityParticipation(req: Request, res: Response, next: NextFunction) {
    try {
      const report = await reportingService.getActivityParticipationReport(
        req.query.categoryId as string,
        req.query.academicSessionId as string
      );
      res.json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }

  async exportCSV(req: Request, res: Response, next: NextFunction) {
    try {
      const type = (req.query.type as string) || 'faculty-contribution';
      let csvContent = '';
      let filename = 'fpis-report.csv';

      if (type === 'faculty-contribution') {
        const report = await reportingService.getFacultyContributionReport({
          departmentId: req.query.departmentId as string,
          academicSessionId: req.query.academicSessionId as string,
        });

        const headers = [
          'Faculty Name',
          'Employee ID',
          'Designation',
          'Department',
          'Overall Contribution Index',
          'Performance Tier',
        ];

        const rows = report.data.map((r) => [
          r.name,
          r.employeeId,
          r.designation,
          r.department,
          r.overallContributionIndex,
          r.tierLabel,
        ]);

        csvContent = reportingService.exportToCSV(headers, rows);
        filename = `faculty-contribution-${Date.now()}.csv`;
      } else if (type === 'department-analytics') {
        const analytics = await reportingService.getDepartmentAnalytics(
          req.query.academicSessionId as string
        );

        const headers = [
          'Department Code',
          'Department Name',
          'Faculty Count',
          'Average OCI',
          'Activities Submitted',
          'Activities Approved',
          'Approval Rate (%)',
        ];

        const rows = analytics.map((a) => [
          a.code,
          a.name,
          a.facultyCount,
          a.averageOCI,
          a.activitiesSubmitted,
          a.activitiesApproved,
          a.approvalRate,
        ]);

        csvContent = reportingService.exportToCSV(headers, rows);
        filename = `department-analytics-${Date.now()}.csv`;
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(csvContent);
    } catch (err) {
      next(err);
    }
  }
}

export const reportingController = new ReportingController();
