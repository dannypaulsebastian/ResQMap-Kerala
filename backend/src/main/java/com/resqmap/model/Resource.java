package com.resqmap.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "resources")
public class Resource {

    @Id
    private String id;
    private String name;
    private Double latitude;
    private Double longitude;
    private String type;
    private Integer capacity;
    private Integer currentlyUsed;
    private String contacts;

    public Resource() {}

    public Resource(String id, String name, Double latitude, Double longitude, String type, 
                    Integer capacity, Integer currentlyUsed, String contacts) {
        this.id = id;
        this.name = name;
        this.latitude = latitude;
        this.longitude = longitude;
        this.type = type;
        this.capacity = capacity;
        this.currentlyUsed = currentlyUsed;
        this.contacts = contacts;
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public Integer getCapacity() { return capacity; }
    public void setCapacity(Integer capacity) { this.capacity = capacity; }

    public Integer getCurrentlyUsed() { return currentlyUsed; }
    public void setCurrentlyUsed(Integer currentlyUsed) { this.currentlyUsed = currentlyUsed; }

    public String getContacts() { return contacts; }
    public void setContacts(String contacts) { this.contacts = contacts; }
}
