package com.ecoquest.report;

import com.ecoquest.common.security.RoleAuthorizer;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/reports/analytics")
class ReportAnalyticsController {
    private final ReportAnalyticsService analytics;
    private final ReportExportService exportService;

    ReportAnalyticsController(ReportAnalyticsService analytics, ReportExportService exportService) {
        this.analytics = analytics;
        this.exportService = exportService;
    }

    @GetMapping("/summary")
    AnalyticsSummary summary(@RequestParam(defaultValue = "weekly") String period,
                             @RequestParam(required = false) Integer year,
                             @RequestParam(required = false) Integer week,
                             @RequestParam(required = false) Integer month,
                             HttpServletRequest request) {
        RoleAuthorizer.requireRole(request, "ADMIN");
        return analytics.summary(period, year, week, month);
    }

    @GetMapping("/students/{studentId}")
    StudentAnalytics student(@PathVariable String studentId,
                             @RequestParam(required = false) String period,
                             @RequestParam(required = false) Integer year,
                             @RequestParam(required = false) Integer week,
                             @RequestParam(required = false) Integer month,
                             @RequestParam(required = false) Integer fromWeek,
                             @RequestParam(required = false) Integer toWeek,
                             @RequestParam(required = false) Integer fromMonth,
                             @RequestParam(required = false) Integer toMonth,
                             @RequestParam(required = false) Integer fromYear,
                             @RequestParam(required = false) Integer toYear,
                             HttpServletRequest request) {
        RoleAuthorizer.requireRole(request, "ADMIN");
        if (period == null) {
            return analytics.student(studentId);
        }
        return analytics.student(studentId, period, year, week, month, fromWeek, toWeek, fromMonth, toMonth, fromYear, toYear);
    }

    @GetMapping("/students")
    List<StudentOutcome> students(@RequestParam(defaultValue = "weekly") String period,
                                  @RequestParam(required = false) Integer year,
                                  @RequestParam(required = false) Integer week,
                                  @RequestParam(required = false) Integer month,
                                  @RequestParam(required = false) Integer fromWeek,
                                  @RequestParam(required = false) Integer toWeek,
                                  @RequestParam(required = false) Integer fromMonth,
                                  @RequestParam(required = false) Integer toMonth,
                                  @RequestParam(required = false) Integer fromYear,
                                  @RequestParam(required = false) Integer toYear,
                                  HttpServletRequest request) {
        RoleAuthorizer.requireRole(request, "ADMIN");
        return analytics.studentOutcomes(period, year, week, month, fromWeek, toWeek, fromMonth, toMonth, fromYear, toYear);
    }

    @GetMapping("/series")
    AnalyticsSeries series(@RequestParam(defaultValue = "weekly") String period,
                           @RequestParam(required = false) Integer year,
                           @RequestParam(required = false) Integer fromYear,
                           @RequestParam(required = false) Integer toYear,
                           @RequestParam(required = false) Integer fromWeek,
                           @RequestParam(required = false) Integer toWeek,
                           @RequestParam(required = false) Integer fromMonth,
                           @RequestParam(required = false) Integer toMonth,
                           HttpServletRequest request) {
        RoleAuthorizer.requireRole(request, "ADMIN");
        return analytics.series(period, year, fromYear, toYear, fromWeek, toWeek, fromMonth, toMonth);
    }

    @GetMapping("/export")
    ResponseEntity<byte[]> export(@RequestParam(defaultValue = "weekly") String period,
                                  @RequestParam(defaultValue = "summary") String scope,
                                  @RequestParam(required = false) Integer year,
                                  @RequestParam(required = false) Integer week,
                                  @RequestParam(required = false) Integer month,
                                  @RequestParam(required = false) Integer fromYear,
                                  @RequestParam(required = false) Integer toYear,
                                  @RequestParam(required = false) Integer fromWeek,
                                  @RequestParam(required = false) Integer toWeek,
                                  @RequestParam(required = false) Integer fromMonth,
                                  @RequestParam(required = false) Integer toMonth,
                                  HttpServletRequest request) {
        RoleAuthorizer.requireRole(request, "ADMIN");
        if ("series".equalsIgnoreCase(scope)) {
            AnalyticsSeries series = analytics.series(period, year, fromYear, toYear, fromWeek, toWeek, fromMonth, toMonth);
            byte[] pdf = exportService.analyticsSeriesPdf(series);
            String filename = "ecoquest-analytics-" + series.period() + "-series.pdf";
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF)
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            ContentDisposition.attachment().filename(filename).build().toString())
                    .body(pdf);
        }
        AnalyticsSummary summary = analytics.summary(period, year, week, month);
        byte[] pdf = exportService.analyticsPdf(summary);
        String filename = "ecoquest-analytics-" + safeFilename(summary.period()) + ".pdf";
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(filename).build().toString())
                .body(pdf);
    }

    private String safeFilename(String value) {
        return value == null ? "summary" : value.toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
    }
}
