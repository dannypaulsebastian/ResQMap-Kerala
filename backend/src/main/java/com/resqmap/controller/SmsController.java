package com.resqmap.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@CrossOrigin(origins = "${app.frontend.url:http://localhost:3000}")
@RequestMapping("/api/sms")
public class SmsController {

    private static final Logger logger = LoggerFactory.getLogger(SmsController.class);

    private static final int CRITICAL_UNCLEAR_THRESHOLD = 6;

    @Autowired
    private TicketRepository ticketRepository;

    @Autowired
    private TriageService triageService;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();
    private final ObjectMapper mapper = new ObjectMapper();

    private static final List<String> KERALA_PLACES = Arrays.asList(
            "kochi", "cochin", "ernakulam", "trivandrum", "thiruvananthapuram",
            "kozhikode", "calicut", "thrissur", "trichur", "alappuzha", "alleppey",
            "kottayam", "kollam", "quilon", "palakkad", "palghat", "malappuram",
            "kannur", "cannanore", "kasaragod", "idukki", "wayanad", "pathanamthitta",
            "munnar", "varkala", "guruvayur", "aluva", "thodupuzha", "changanassery"
    );

    @PostMapping(value = "/webhook", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE, produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<String> receiveSms(@RequestParam Map<String, String> params) {

        String from = params.getOrDefault("From", "");
        String body = params.getOrDefault("Body", "");
        int numMedia = parseIntSafely(params.get("NumMedia"));

        String replyMessage;
        try {
            String text = body == null ? "" : body.trim();
            boolean hasMedia = numMedia > 0;

            if (text.isEmpty() && !hasMedia) {
                replyMessage = "ResQMap: We didn't receive any message. Please describe your emergency, "
                        + "or send a photo/video, or call this number to report by voice.";
            } else {
                Ticket ticket = text.isEmpty()
                        ? buildTicketFromMediaOnly(from, text)
                        : buildTicketFromFreeText(from, text);

                attachMedia(ticket, params, numMedia);
                ticketRepository.save(ticket);

                logger.info("SMS/MMS ticket created: id={}, from={}, priority={}, status={}, criticalUnclear={}, mediaCount={}",
                        ticket.getId(), maskPhone(from), ticket.getUrgencyScore(), ticket.getStatus(),
                        ticket.isCriticalUnclear(), numMedia);

                replyMessage = "ResQMap: Your report has been received. Help is being coordinated. Stay safe. "
                        + "(Ref #" + ticket.getId() + ", Priority: " + ticket.getUrgencyScore() + ")";
            }
        } catch (Exception e) {
            logger.error("Failed to process SMS/MMS webhook from {}: {}", maskPhone(from), e.getMessage(), e);
            replyMessage = "ResQMap: We received your message but had trouble processing it. "
                    + "Our team has been notified. If this is urgent, please call this number directly.";
        }

        String twiml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response><Message>"
                + escapeXml(replyMessage) + "</Message></Response>";
        return new ResponseEntity<>(twiml, HttpStatus.OK);
    }

    private void attachMedia(Ticket ticket, Map<String, String> params, int numMedia) {
        if (numMedia <= 0) return;

        if ("SMS".equals(ticket.getReportSource())) {
            ticket.setReportSource("MMS");
        }

        for (int i = 0; i < numMedia; i++) {
            String url = params.get("MediaUrl" + i);
            String contentType = params.get("MediaContentType" + i);
            if (url == null) continue;

            if (contentType != null && contentType.startsWith("video/")) {
                ticket.addVideoUrl(url);
            } else if (contentType != null && contentType.startsWith("image/")) {
                ticket.addPhotoUrl(url);
            } else {
                logger.warn("Unrecognized media content type '{}' for ticket {}, storing as photo URL", contentType, ticket.getId());
                ticket.addPhotoUrl(url);
            }
        }
    }

    private Ticket buildTicketFromFreeText(String from, String rawText) {
        String needType = detectNeedType(rawText);
        String detectedPlace = detectPlace(rawText);
        boolean isMinimalMessage = rawText.replaceAll("\\s", "").length() <= CRITICAL_UNCLEAR_THRESHOLD;

        double[] coords;
        String status;
        String locationNote = "";

        if (detectedPlace != null) {
            double[] geocoded = tryGeocodeSafely(detectedPlace);
            if (geocoded != null) {
                coords = geocoded;
                status = "PENDING";
            } else {
                coords = new double[]{10.1632, 76.6413};
                status = "NEEDS_REVIEW";
            }
        } else {
            Optional<Ticket> lastKnown = findLastKnownLocation(from);
            if (lastKnown.isPresent()) {
                coords = new double[]{lastKnown.get().getLatitude(), lastKnown.get().getLongitude()};
                locationNote = " [Using last known location from previous report]";
                status = "NEEDS_REVIEW";
            } else {
                coords = new double[]{10.1632, 76.6413};
                status = "NEEDS_REVIEW";
            }
        }

        Ticket ticket = new Ticket();
        ticket.setId("sms-" + UUID.randomUUID().toString().substring(0, 8));
        ticket.setReporterName("SMS Reporter");
        ticket.setPhone(from);
        ticket.setNeedType(needType);
        ticket.setReportSource("SMS");
        ticket.setDescription("[SMS] " + rawText + locationNote);
        ticket.setLatitude(coords[0]);
        ticket.setLongitude(coords[1]);
        ticket.setCreatedAt(Instant.now().toString());

        applyVulnerabilityFlags(ticket, rawText);

        if (isMinimalMessage && detectedPlace == null) {
            ticket.setCriticalUnclear(true);
            ticket.setStatus("NEEDS_REVIEW");
            triageService.calculatePriority(ticket);
            ticket.setUrgencyScore(Math.max(ticket.getUrgencyScore(), 70));
        } else {
            ticket.setStatus(status);
            triageService.calculatePriority(ticket);
        }

        return ticket;
    }

    private Optional<Ticket> findLastKnownLocation(String phone) {
        if (phone == null || phone.isEmpty()) return Optional.empty();
        return ticketRepository.findAll().stream()
                .filter(t -> phone.equals(t.getPhone()))
                .filter(t -> t.getLatitude() != null && t.getLongitude() != null)
                .filter(t -> !(t.getLatitude() == 10.1632 && t.getLongitude() == 76.6413))
                .sorted(Comparator.comparing(Ticket::getCreatedAt).reversed())
                .findFirst();
    }

    private Ticket buildTicketFromMediaOnly(String from, String rawText) {
        Ticket ticket = new Ticket();
        ticket.setId("mms-" + UUID.randomUUID().toString().substring(0, 8));
        ticket.setReporterName("SMS Reporter");
        ticket.setPhone(from);
        ticket.setNeedType("rescue");
        ticket.setReportSource("MMS");
        ticket.setDescription("[MMS] Photo/video report received — no text description provided.");

        Optional<Ticket> lastKnown = findLastKnownLocation(from);
        if (lastKnown.isPresent()) {
            ticket.setLatitude(lastKnown.get().getLatitude());
            ticket.setLongitude(lastKnown.get().getLongitude());
            ticket.setDescription(ticket.getDescription() + " [Using last known location from previous report]");
        } else {
            ticket.setLatitude(10.1632);
            ticket.setLongitude(76.6413);
        }

        ticket.setCreatedAt(Instant.now().toString());
        ticket.setStatus("NEEDS_REVIEW");

        applyVulnerabilityFlags(ticket, rawText);
        triageService.calculatePriority(ticket);
        return ticket;
    }

    private String detectNeedType(String rawText) {
        String lower = rawText.toLowerCase();
        if (lower.contains("trap") || lower.contains("stuck") || lower.contains("flood")
                || lower.contains("drowning") || lower.contains("rescue")) {
            return "rescue";
        }
        if (lower.contains("medical") || lower.contains("hospital") || lower.contains("doctor")
                || lower.contains("injur") || lower.contains("sick") || lower.contains("bleeding")) {
            return "medical";
        }
        if (lower.contains("hungry") || lower.contains("starving") || lower.contains("no food")
                || lower.contains("no water") || lower.contains("drinking water")) {
            return "food_water";
        }
        if (lower.contains("shelter") || lower.contains("roof") || lower.contains("wall crack")
                || lower.contains("collapse")) {
            return "shelter";
        }
        return "rescue";
    }

    private String detectPlace(String rawText) {
        String lower = rawText.toLowerCase();
        for (String place : KERALA_PLACES) {
            if (lower.contains(place)) {
                return place;
            }
        }
        return null;
    }

    private void applyVulnerabilityFlags(Ticket ticket, String rawText) {
        String lower = rawText == null ? "" : rawText.toLowerCase();
        ticket.setChild(lower.contains("child") || lower.contains("kid") || lower.contains("infant"));
        ticket.setElderly(lower.contains("elderly") || lower.contains("old age") || lower.contains("senior"));
        ticket.setPregnant(lower.contains("pregnant"));
        ticket.setDisabled(lower.contains("disabled") || lower.contains("disability") || lower.contains("wheelchair"));
        ticket.setTrapped(lower.contains("trap") || lower.contains("stuck"));
    }

    private double[] tryGeocodeSafely(String place) {
        try {
            double[] result = tryGeocode(place + ", Kerala, India");
            if (result != null) return result;
        } catch (Exception e) {
            logger.warn("Geocoding failed for place='{}': {}", place, e.getMessage());
        }
        return null;
    }

    private double[] tryGeocode(String query) throws Exception {
        String encoded = URLEncoder.encode(query, StandardCharsets.UTF_8);
        String url = "https://nominatim.openstreetmap.org/search?q=" + encoded + "&format=json&limit=1";

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("User-Agent", "ResQMap-Kerala/1.0")
                .timeout(Duration.ofSeconds(5))
                .GET()
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        JsonNode results = mapper.readTree(response.body());

        if (results.isArray() && results.size() > 0) {
            double lat = results.get(0).get("lat").asDouble();
            double lon = results.get(0).get("lon").asDouble();
            return new double[]{lat, lon};
        }
        return null;
    }

    private String escapeXml(String s) {
        return s.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&apos;");
    }

    private String maskPhone(String phone) {
        if (phone == null || phone.length() < 4) return "****";
        return "****" + phone.substring(phone.length() - 4);
    }

    private int parseIntSafely(String s) {
        if (s == null) return 0;
        try {
            return Integer.parseInt(s.trim());
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}