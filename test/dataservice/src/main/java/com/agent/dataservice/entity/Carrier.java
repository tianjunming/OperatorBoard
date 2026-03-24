package com.agent.dataservice.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class Carrier {
    private Long id;
    private String name;
    private String code;
    private String type;
    private String contact;
    private Integer status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
