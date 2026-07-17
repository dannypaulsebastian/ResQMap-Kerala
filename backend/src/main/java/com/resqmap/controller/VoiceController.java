package com.resqmap.controller;

import com.resqmap.model.Ticket;
import com.resqmap.repository.TicketRepository;
import com.resqmap.service.TriageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@CrossOrigin(origins = "${app.frontend.url:http://localhost:3000}")
@RequestMapping("/api/voice")
public class VoiceController {

    private static final Logger logger = LoggerFactory.getLogger(VoiceController.class);

    @Autowired
    private TicketRepository ticketRepository;

    @Autowired
    private TriageService triageService;

    // ── Step 1: Twilio hits this the moment someone calls your number ───────
    @PostMapping(value = "/incoming", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE, produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<String> handleIncomingCall(@RequestParam Map<String, String> params) {
        String from = params.getOrDefault("From", "unknown");
        logger.info("Incoming voice call from {}", maskPhone(from));

        String twiml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
                + "<Response>"
                + "<Say voice=\"Polly.Aditi\">Welcome to ResQMap Kerala. "
                + "Please describe your emergency after the beep. "
                + "Include what happened, your location, and any landmark nearby. "
                + "Press any key or stay silent for 3 seconds when you are done.</Say>"
                + "<Record"
                + "   action=\"/api/voice/recording-saved\""
                + "   method=\"POST\""
                + "   maxLength=\"90\""
                + "   timeout=\"3\""
                + "   transcribe=\"true\""
                + "   transcribeCallback=\"/api/voice/transcription-ready\""
                + "   playBeep=\"true\"/>"
                + "<Say voice=\"Polly.Aditi\">We did not receive a recording. Please call again.</Say>"
                + "</Response>";

        return new ResponseEntity<>(twiml, HttpStatus.OK);
    }

    // ── Step 2: Twilio hits this right after recording finishes ─────────────
    @PostMapping(value = "/recording-saved", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE, produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<String> handleRecordingSaved(@RequestParam Map<String, String> params) {
        String from = params.getOrDefault("From", "unknown");
        String recordingUrl = params.get("RecordingUrl");
        String callSid = params.get("CallSid");

        try {
            Ticket ticket = buildTicketFromVoice(from, recordingUrl, callSid);
            ticketRepository.save(ticket);
            logger.info("Voice ticket created: id={}, from={}, callSid={}",
                    ticket.getId(), maskPhone(from), callSid);
        } catch (Exception e) {
            logger.error("Failed to create ticket from voice recording, from={}: {}", maskPhone(from), e.getMessage(), e);
        }

        String twiml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
                + "<Response>"
                + "<Say voice=\"Polly.Aditi\">Thank you. Your report has been received. Help is being coordinated. Stay safe.</Say>"
                + "</Response>";
        return new ResponseEntity<>(twiml, HttpStatus.OK);
    }

    // ── Step 3: Twilio hits this once auto-transcription finishes (async) ───
    @PostMapping(value = "/transcription-ready", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public ResponseEntity<Void> handleTranscriptionReady(@RequestParam Map<String, String> params) {
        String callSid = params.get("CallSid");
        String transcriptionText = params.get("TranscriptionText");

        if (callSid == null || transcriptionText == null) {
            return new ResponseEntity<>(HttpStatus.OK);
        }

        try {
            Optional<Ticket> match = ticketRepository.findAll().stream()
                    .filter(t -> ("voice-" + callSid).equals(t.getId())
                            || (t.getDescription() != null && t.getDescription().contains(callSid)))
                    .findFirst();

            if (match.isPresent()) {
                Ticket ticket = match.get();
                ticket.setVoiceTranscript(transcriptionText);
                ticket.setDescription(ticket.getDescription() + " | Transcript: " + transcriptionText);

                applyKeywordAnalysis(ticket, transcriptionText);

                triageService.calculatePriority(ticket);
                ticketRepository.save(ticket);
                logger.info("Transcript attached to ticket {}, new priority={}", ticket.getId(), ticket.getUrgencyScore());
            } else {
                logger.warn("No matching ticket found for CallSid={} when transcription arrived", callSid);
            }
        } catch (Exception e) {
            logger.error("Failed to attach transcription for CallSid={}: {}", callSid, e.getMessage(), e);
        }

        return new ResponseEntity<>(HttpStatus.OK);
    }

    // Re-checks vulnerability flags and need type once real transcript text is available.
    // Rescue-indicating language (trapped/flood/drowning) is checked FIRST and wins over
    // generic words like "house" or "water" that could otherwise misfire the shelter/
    // food_water branches — e.g. "flood near my house" should stay "rescue", not "shelter".
    private void applyKeywordAnalysis(Ticket ticket, String transcriptionText) {
        String lower = transcriptionText.toLowerCase();

        if (lower.contains("child") || lower.contains("kid") || lower.contains("infant")) ticket.setChild(true);
        if (lower.contains("elderly") || lower.contains("senior") || lower.contains("old age")) ticket.setElderly(true);
        if (lower.contains("pregnant")) ticket.setPregnant(true);
        if (lower.contains("disabled") || lower.contains("wheelchair")) ticket.setDisabled(true);
        if (lower.contains("trap") || lower.contains("stuck")) ticket.setTrapped(true);

        if (lower.contains("trap") || lower.contains("stuck") || lower.contains("flood") || lower.contains("drowning")) {
            ticket.setNeedType("rescue");
        } else if (lower.contains("medical") || lower.contains("hospital") || lower.contains("doctor") || lower.contains("injur")) {
            ticket.setNeedType("medical");
        } else if (lower.contains("hungry") || lower.contains("starving") || lower.contains("no food")) {
            ticket.setNeedType("food_water");
        } else if (lower.contains("shelter") || lower.contains("roof blown") || lower.contains("wall crack")) {
            ticket.setNeedType("shelter");
        }
    }

    private Ticket buildTicketFromVoice(String from, String recordingUrl, String callSid) {
        Ticket ticket = new Ticket();
        ticket.setId("voice-" + (callSid != null ? callSid : UUID.randomUUID().toString().substring(0, 8)));
        ticket.setReporterName("Voice Reporter");
        ticket.setPhone(from);
        ticket.setNeedType("rescue");
        ticket.setReportSource("VOICE");
        ticket.setVoiceRecordingUrl(recordingUrl);

        String desc = "[VOICE CALL] Recording received, transcription pending. CallSid: " + callSid;
        ticket.setDescription(desc);

        ticket.setLatitude(10.1632);
        ticket.setLongitude(76.6413);
        ticket.setCreatedAt(Instant.now().toString());
        ticket.setStatus("NEEDS_REVIEW");

        triageService.calculatePriority(ticket);
        return ticket;
    }

    private String maskPhone(String phone) {
        if (phone == null || phone.length() < 4) return "****";
        return "****" + phone.substring(phone.length() - 4);
    }
}