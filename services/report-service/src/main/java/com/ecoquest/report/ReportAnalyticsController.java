package com.ecoquest.report;

import com.ecoquest.common.security.RoleAuthorizer;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/reports/analytics")
class ReportAnalyticsController {
    private final ReportAnalyticsService analytics;

    ReportAnalyticsController(ReportAnalyticsService analytics) {
        this.analytics = analytics;
    }

    @GetMapping("/summary")
    AnalyticsSummary summary(@RequestParam(defaultValue = "weekly") String period, HttpServletRequest request) {
        RoleAuthorizer.requireRole(request, "ADMIN");
        return analytics.summary(period);
    }

    @GetMapping("/students/{studentId}")
    StudentAnalytics student(@PathVariable String studentId, HttpServletRequest request) {
        RoleAuthorizer.requireRole(request, "ADMIN");
        return analytics.student(studentId);
    }
}
