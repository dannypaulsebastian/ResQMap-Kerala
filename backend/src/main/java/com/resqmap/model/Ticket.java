package com.resqmap.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "tickets")
public class Ticket {

    @Id
    private String id;

    @Column(name = "reporter_name")
    private String reporterName;

    private String phone;

    @Column(name = "need_type")
    private String needType;

    @Column(columnDefinition = "TEXT")
    private String description;

    private Double latitude;
    private Double longitude;
    private String status;

    @Column(name = "assigned_zone_id")
    private String assignedZoneId;

    @Column(name = "assigned_zone_name")
    private String assignedZoneName;

    @Column(name = "urgency_score")
    private Integer urgencyScore;

    @Column(name = "score_breakdown", columnDefinition = "TEXT")
    private String scoreBreakdown;

    @Column(name = "created_at")
    private String createdAt;

    @Column(name = "corroboration_count")
    private Integer corroborationCount = 1;

    // Vulnerabilities
    private boolean child;
    private boolean elderly;
    private boolean pregnant;
    private boolean disabled;
    private boolean trapped;

    // ── Media attachments (MMS photo/video, voice call recordings) ──────────
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "ticket_photo_urls", joinColumns = @JoinColumn(name = "ticket_id"))
    @Column(name = "photo_url", columnDefinition = "TEXT")
    private List<String> photoUrls = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "ticket_video_urls", joinColumns = @JoinColumn(name = "ticket_id"))
    @Column(name = "video_url", columnDefinition = "TEXT")
    private List<String> videoUrls = new ArrayList<>();

    @Column(name = "voice_recording_url", columnDefinition = "TEXT")
    private String voiceRecordingUrl;

    @Column(name = "voice_transcript", columnDefinition = "TEXT")
    private String voiceTranscript;

    @Column(name = "report_source")
    private String reportSource; // WEB, SMS, MMS, VOICE

    // Flag for very short/unclear messages (e.g. a single ".") with no
    // detectable location — treated as a possible critical distress signal
    // where the citizen may be unable to provide more information.
    @Column(name = "critical_unclear")
    private boolean criticalUnclear;

    public Ticket() {
        this.createdAt = Instant.now().toString();
        this.status = "PENDING";
        this.corroborationCount = 1;
        this.reportSource = "WEB";
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public Integer getCorroborationCount() { return corroborationCount; }
    public void setCorroborationCount(Integer corroborationCount) { this.corroborationCount = corroborationCount; }

    public String getReporterName() { return reporterName; }
    public void setReporterName(String reporterName) { this.reporterName = reporterName; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getNeedType() { return needType; }
    public void setNeedType(String needType) { this.needType = needType; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getAssignedZoneId() { return assignedZoneId; }
    public void setAssignedZoneId(String assignedZoneId) { this.assignedZoneId = assignedZoneId; }

    public String getAssignedZoneName() { return assignedZoneName; }
    public void setAssignedZoneName(String assignedZoneName) { this.assignedZoneName = assignedZoneName; }

    public Integer getUrgencyScore() { return urgencyScore; }
    public void setUrgencyScore(Integer urgencyScore) { this.urgencyScore = urgencyScore; }

    public String getScoreBreakdown() { return scoreBreakdown; }
    public void setScoreBreakdown(String scoreBreakdown) { this.scoreBreakdown = scoreBreakdown; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public boolean isChild() { return child; }
    public void setChild(boolean child) { this.child = child; }

    public boolean isElderly() { return elderly; }
    public void setElderly(boolean elderly) { this.elderly = elderly; }

    public boolean isPregnant() { return pregnant; }
    public void setPregnant(boolean pregnant) { this.pregnant = pregnant; }

    public boolean isDisabled() { return disabled; }
    public void setDisabled(boolean disabled) { this.disabled = disabled; }

    public boolean isTrapped() { return trapped; }
    public void setTrapped(boolean trapped) { this.trapped = trapped; }

    public List<String> getPhotoUrls() { return photoUrls; }
    public void setPhotoUrls(List<String> photoUrls) { this.photoUrls = photoUrls; }
    public void addPhotoUrl(String url) { this.photoUrls.add(url); }

    public List<String> getVideoUrls() { return videoUrls; }
    public void setVideoUrls(List<String> videoUrls) { this.videoUrls = videoUrls; }
    public void addVideoUrl(String url) { this.videoUrls.add(url); }

    public String getVoiceRecordingUrl() { return voiceRecordingUrl; }
    public void setVoiceRecordingUrl(String voiceRecordingUrl) { this.voiceRecordingUrl = voiceRecordingUrl; }

    public String getVoiceTranscript() { return voiceTranscript; }
    public void setVoiceTranscript(String voiceTranscript) { this.voiceTranscript = voiceTranscript; }

    public String getReportSource() { return reportSource; }
    public void setReportSource(String reportSource) { this.reportSource = reportSource; }

    public boolean isCriticalUnclear() { return criticalUnclear; }
    public void setCriticalUnclear(boolean criticalUnclear) { this.criticalUnclear = criticalUnclear; }
}