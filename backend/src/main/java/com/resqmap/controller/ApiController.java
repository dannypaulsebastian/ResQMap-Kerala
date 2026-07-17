package com.resqmap.controller;
import com.resqmap.model.Resource;
import com.resqmap.model.Ticket;
import com.resqmap.repository.ResourceRepository;
import com.resqmap.repository.TicketRepository;
import com.resqmap.service.TriageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.util.*;

@CrossOrigin(origins = "${app.frontend.url:http://localhost:3000}")
@RestController
@RequestMapping("/api")
public class ApiController {

    @Autowired
    private TicketRepository ticketRepository;
    @Autowired
    private ResourceRepository resourceRepository;
    @Autowired
    private TriageService triageService;

    // GET /api/tickets
    @GetMapping("/tickets")
    public List<Ticket> getTickets() {
        List<Ticket> tickets = ticketRepository.findAll();
        for (Ticket t : tickets) {
            if (!"resolved".equalsIgnoreCase(t.getStatus())) {
                Integer oldScore = t.getUrgencyScore();
                triageService.calculatePriority(t);
                if (!Objects.equals(oldScore, t.getUrgencyScore())) {
                    ticketRepository.save(t);
                }
            }
        }
        return ticketRepository.findAllByOrderByUrgencyScoreDesc();
    }

    // POST /api/tickets
    @PostMapping("/tickets")
    public ResponseEntity<Ticket> createTicket(@RequestBody Ticket ticket) {
        if (ticket.getId() == null || ticket.getId().isEmpty()) {
            ticket.setId("incident-" + (1000 + new Random().nextInt(9000)));
        }
        if (ticket.getCreatedAt() == null || ticket.getCreatedAt().isEmpty()) {
            ticket.setCreatedAt(Instant.now().toString());
        }
        if (ticket.getStatus() == null || ticket.getStatus().isEmpty()) {
            ticket.setStatus("PENDING");
        }

        // --- Duplicate Report Clustering and Social Corroboration Heuristic ---
        List<Ticket> existingTickets = ticketRepository.findAll();
        Ticket duplicate = null;
        for (Ticket t : existingTickets) {
            if (!"RESOLVED".equalsIgnoreCase(t.getStatus()) &&
                    Objects.equals(t.getNeedType(), ticket.getNeedType()) &&
                    t.getLatitude() != null && ticket.getLatitude() != null &&
                    t.getLongitude() != null && ticket.getLongitude() != null) {
                double latDiff = Math.abs(t.getLatitude() - ticket.getLatitude());
                double lngDiff = Math.abs(t.getLongitude() - ticket.getLongitude());
                if (latDiff < 0.0025 && lngDiff < 0.0025) { // ~250m radius (widened for demo reliability)
                    duplicate = t;
                    break;
                }
            }
        }

        if (duplicate != null) {
            // Append report details
            String updatedDesc = duplicate.getDescription() + "\n[Corroborated by " + ticket.getReporterName() + "]: " + ticket.getDescription();
            duplicate.setDescription(updatedDesc);

            // Increment corroboration count
            int currentCount = duplicate.getCorroborationCount() != null ? duplicate.getCorroborationCount() : 1;
            duplicate.setCorroborationCount(currentCount + 1);

            // Recalculate priority with new count
            triageService.calculatePriority(duplicate);
            Ticket saved = ticketRepository.save(duplicate);
            return new ResponseEntity<>(saved, HttpStatus.OK); // Return 200 OK for updated resource
        }

        triageService.calculatePriority(ticket);
        Ticket saved = ticketRepository.save(ticket);
        return new ResponseEntity<>(saved, HttpStatus.CREATED);
    }

    // PUT /api/tickets/{id}/status
    // Updates status (e.g. from PENDING to RESOLVED). Handles string quotes from JSON stringifier.
    @PutMapping("/tickets/{id}/status")
    public ResponseEntity<Ticket> updateTicketStatus(
            @PathVariable String id,
            @RequestBody String statusPayload) {

        Optional<Ticket> optTicket = ticketRepository.findById(id);
        if (optTicket.isEmpty()) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }

        Ticket ticket = optTicket.get();
        String oldStatus = ticket.getStatus();
        String oldZoneId = ticket.getAssignedZoneId();

        // Clean quotes from raw string JSON payload
        String status = statusPayload.replace("\"", "").trim().toUpperCase();
        ticket.setStatus(status);

        if ("RESOLVED".equalsIgnoreCase(status)) {
            // Free shelter space if it was assigned
            if (oldZoneId != null) {
                Optional<Resource> optShelter = resourceRepository.findById(oldZoneId);
                if (optShelter.isPresent()) {
                    Resource shelter = optShelter.get();
                    shelter.setCurrentlyUsed(Math.max(0, shelter.getCurrentlyUsed() - 1));
                    resourceRepository.save(shelter);
                }
            }
        }

        Ticket updated = ticketRepository.save(ticket);
        return new ResponseEntity<>(updated, HttpStatus.OK);
    }

    // Static helper class for assignment payload
    public static class AssignmentRequest {
        public String zoneId;
        public String zoneName;
    }

    // PUT /api/tickets/{id}/assign
    @PutMapping("/tickets/{id}/assign")
    public ResponseEntity<Ticket> assignTicket(
            @PathVariable String id,
            @RequestBody AssignmentRequest assignment) {

        Optional<Ticket> optTicket = ticketRepository.findById(id);
        if (optTicket.isEmpty()) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }

        Ticket ticket = optTicket.get();
        String oldZoneId = ticket.getAssignedZoneId();

        // If it was already assigned to a different shelter, decrement the old one
        if (oldZoneId != null && !oldZoneId.equalsIgnoreCase(assignment.zoneId)) {
            Optional<Resource> optOld = resourceRepository.findById(oldZoneId);
            optOld.ifPresent(old -> {
                old.setCurrentlyUsed(Math.max(0, old.getCurrentlyUsed() - 1));
                resourceRepository.save(old);
            });
        }

        ticket.setStatus("ASSIGNED");
        ticket.setAssignedZoneId(assignment.zoneId);
        ticket.setAssignedZoneName(assignment.zoneName);

        // Increment the new shelter capacity
        Optional<Resource> optNew = resourceRepository.findById(assignment.zoneId);
        if (optNew.isPresent()) {
            Resource newShelter = optNew.get();
            newShelter.setCurrentlyUsed(Math.min(newShelter.getCapacity(), newShelter.getCurrentlyUsed() + 1));
            resourceRepository.save(newShelter);
        }

        Ticket updated = ticketRepository.save(ticket);
        return new ResponseEntity<>(updated, HttpStatus.OK);
    }

    // DELETE /api/tickets/{id}
    @DeleteMapping("/tickets/{id}")
    public ResponseEntity<Void> deleteTicket(@PathVariable String id) {
        Optional<Ticket> optTicket = ticketRepository.findById(id);
        if (optTicket.isEmpty()) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }

        Ticket ticket = optTicket.get();
        String oldZoneId = ticket.getAssignedZoneId();

        // Free zone capacity if deleted ticket was assigned
        if (oldZoneId != null && !"RESOLVED".equalsIgnoreCase(ticket.getStatus())) {
            Optional<Resource> optShelter = resourceRepository.findById(oldZoneId);
            optShelter.ifPresent(shelter -> {
                shelter.setCurrentlyUsed(Math.max(0, shelter.getCurrentlyUsed() - 1));
                resourceRepository.save(shelter);
            });
        }

        ticketRepository.delete(ticket);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }

    // GET /api/resources
    @GetMapping("/resources")
    public List<Resource> getResources() {
        if (resourceRepository.count() == 0) {
            seedDefaultResources();
        }
        return resourceRepository.findAll();
    }

    // PUT /api/resources/{id}/usage
    public static class UsageRequest {
        public Integer currentlyUsed;
    }

    @PutMapping("/resources/{id}/usage")
    public ResponseEntity<Resource> updateResourceUsage(
            @PathVariable String id,
            @RequestBody UsageRequest usage) {

        Optional<Resource> optResource = resourceRepository.findById(id);
        if (optResource.isEmpty()) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }

        Resource shelter = optResource.get();
        shelter.setCurrentlyUsed(Math.max(0, Math.min(shelter.getCapacity(), usage.currentlyUsed)));

        Resource updated = resourceRepository.save(shelter);
        return new ResponseEntity<>(updated, HttpStatus.OK);
    }

    // POST /api/resources/init
    @PostMapping("/resources/init")
    public ResponseEntity<List<Resource>> seedResources() {
        seedDefaultResources();
        return new ResponseEntity<>(resourceRepository.findAll(), HttpStatus.OK);
    }

    private void seedDefaultResources() {
        List<Resource> defaultList = Arrays.asList(
            new Resource("shelter-1", "Kanteerava Indoor Stadium (Mega Center)", 12.9698, 77.5928, "shelter", 500, 124, "080-2222-0001"),
            new Resource("shelter-2", "St. Martha's Hospital Stabilization Hub", 12.9725, 77.5962, "medical", 150, 89, "080-2222-0002"),
            new Resource("shelter-3", "Cubbon Park Community Relief Hall", 12.9772, 77.5955, "shelter", 200, 42, "080-2222-0003"),
            new Resource("shelter-4", "Richmond Town Government School", 12.9610, 77.5985, "shelter", 100, 15, "080-2222-0004")
        );
        resourceRepository.saveAll(defaultList);
    }
}