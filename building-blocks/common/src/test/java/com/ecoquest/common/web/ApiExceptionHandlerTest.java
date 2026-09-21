package com.ecoquest.common.web;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ApiExceptionHandlerTest {
    @RestController
    static class Controller {
        @GetMapping("/scan") void scan() {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This station is not assigned to the mission.");
        }
        @PostMapping("/rule") void rule(@RequestBody java.util.Map<String, Integer> body) {}
    }
    @Test void responseStatusExceptionExposesDomainReasonWithoutInternalDetails() throws Exception {
        MockMvcBuilders.standaloneSetup(new Controller()).setControllerAdvice(new ApiExceptionHandler()).build()
                .perform(get("/scan")).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("This station is not assigned to the mission."))
                .andExpect(jsonPath("$.message").value("This station is not assigned to the mission."))
                .andExpect(jsonPath("$.trace").doesNotExist());
    }
    @Test void malformedBodyDoesNotExposeJacksonInternals() throws Exception {
        MockMvcBuilders.standaloneSetup(new Controller()).setControllerAdvice(new ApiExceptionHandler()).build()
                .perform(post("/rule").contentType("application/json").content("{broken"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.detail").value("Invalid request data. Check field types and required values."));
    }
}
