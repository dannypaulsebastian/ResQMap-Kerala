package com.resqmap.service;
import com.resqmap.model.Ticket;
import org.springframework.stereotype.Service;
import java.time.Duration;
import java.time.Instant;
@Service
public class TriageService {
    public void calculatePriority(Ticket ticket) {
        int score = 0;
        StringBuilder breakdown = new StringBuilder();
        // 1. Base Score by Category (Need Type)
        String needType = ticket.getNeedType();
        if (needType == null) {
            needType = "rescue";
        }
        
        switch (needType.toLowerCase()) {
            case "medical":
                score += 45;
                break;
            case "rescue":
                score += 38;
                break;
            case "food_water":
                score += 18;
                break;
            case "shelter":
                score += 10;
                break;
            default:
                score += 5;
        }
        breakdown.append("Base need (").append(needType).append("): ").append(score).append(" pts; ");
        // 2. Add score based on reporter's selected urgency level or derived from state
        // In the full-stack version, the frontend sends a direct ticket. The triage service
        // can check if there are specific urgency levels (we can infer it from the request).
        // Let's check the ticket's description/other flags for keywords if urgency is null.
        String desc = ticket.getDescription() != null ? ticket.getDescription().toLowerCase() : "";
        int keywordScore = 0;
        if (desc.contains("critical") || desc.contains("dying") || desc.contains("severe") || desc.contains("drowning")) {
            keywordScore = 25;
        } else if (desc.contains("high") || desc.contains("urgent") || desc.contains("flood")) {
            keywordScore = 15;
        } else if (desc.contains("medium") || desc.contains("need")) {
            keywordScore = 5;
        }
        score += keywordScore;
        if (keywordScore > 0) {
            breakdown.append("Urgency keywords: +").append(keywordScore).append(" pts; ");
        }
        // 3. Vulnerability Modifiers
        int vulnerabilityScore = 0;
        if (ticket.isChild()) vulnerabilityScore += 12;
        if (ticket.isElderly()) vulnerabilityScore += 10;
        if (ticket.isPregnant()) vulnerabilityScore += 15;
        if (ticket.isDisabled()) vulnerabilityScore += 15;
        if (ticket.isTrapped()) vulnerabilityScore += 15;
        
        score += vulnerabilityScore;
        if (vulnerabilityScore > 0) {
            breakdown.append("Vulnerabilities: +").append(vulnerabilityScore).append(" pts; ");
        }
        // 3.5 Corroboration (Duplicate reports count) Bonus
        int corroborationBonus = 0;
        if (ticket.getCorroborationCount() != null && ticket.getCorroborationCount() > 1) {
            corroborationBonus = (ticket.getCorroborationCount() - 1) * 10;
            corroborationBonus = Math.min(30, corroborationBonus);
        }
        score += corroborationBonus;
        if (corroborationBonus > 0) {
            breakdown.append("Social Corroboration (x").append(ticket.getCorroborationCount()).append(" reports): +").append(corroborationBonus).append(" pts; ");
        }
        // 4. Time Elapsed Modifier (Prevention of Starvation)
        // Add +1 point for every 10 minutes elapsed, up to a max of +15 points.
        if (ticket.getCreatedAt() != null) {
            try {
                Instant created = Instant.parse(ticket.getCreatedAt());
                long elapsedMinutes = Duration.between(created, Instant.now()).toMinutes();
                if (elapsedMinutes > 0) {
                    long timeBonus = Math.min(15, elapsedMinutes / 10);
                    score += timeBonus;
                    breakdown.append("Starvation prevention (").append(elapsedMinutes).append("m elapsed): +").append(timeBonus).append(" pts; ");
                }
            } catch (Exception e) {
                // Ignore parsing errors, skip time bonus
            }
        }
        // Cap at 100 and min at 0
        int finalScore = Math.max(0, Math.min(100, score));
        ticket.setUrgencyScore(finalScore);
        
        breakdown.append("Final Score: ").append(finalScore);
        ticket.setScoreBreakdown(breakdown.toString());
        // Determine Severity Label
        String label = "LOW";
        if (finalScore >= 75) {
            label = "CRITICAL";
        } else if (finalScore >= 50) {
            label = "HIGH";
        } else if (finalScore >= 25) {
            label = "MEDIUM";
        }
        ticket.setScoreBreakdown(ticket.getScoreBreakdown() + " [Label: " + label + "]");
    }
}
