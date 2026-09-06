package pl.oszczednosci.app.configuration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.forwardedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest(properties = {
        "app.database.file=./target/web-adapter-configuration-test.json",
        "app.web.cors.allowed-origins=https://portfolio.example.com"
})
@AutoConfigureMockMvc
class WebAdapterConfigurationTest {
    private static final Path DATABASE = Path.of("target/web-adapter-configuration-test.json");
    private static final String ENTRY = """
            {"type":"KONTO_BANKOWE","owner":"jakub","valuePln":100.00,"date":"2026-09-06"}
            """;

    @Autowired MockMvc mvc;

    @BeforeEach
    void resetDatabase() throws Exception {
        Files.deleteIfExists(DATABASE);
    }

    @Test
    void appliesConfiguredCorsOriginAndRejectsAnUnconfiguredOrigin() throws Exception {
        mvc.perform(options("/api/investments")
                        .header("Origin", "https://portfolio.example.com")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "https://portfolio.example.com"));

        mvc.perform(options("/api/investments")
                        .header("Origin", "https://attacker.example")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }

    @Test
    void forwardsSpaRoutesAtArbitraryDepthButNeverOperationalApiOrAssetPaths() throws Exception {
        mvc.perform(get("/portfolio/a/b/c/d/e/f/g/h/i/j/k/l/m/n/o"))
                .andExpect(forwardedUrl("/index.html"));
        mvc.perform(get("/api/not-a-real-endpoint")).andExpect(status().isNotFound());
        mvc.perform(get("/actuator/not-a-real-endpoint")).andExpect(status().isNotFound());
        mvc.perform(get("/assets/missing.js")).andExpect(status().isNotFound());
    }

    @Test
    void healthIsOperationalAndLegacyDemoEndpointsAreAbsent() throws Exception {
        mvc.perform(get("/actuator/health")).andExpect(status().isOk());
        mvc.perform(get("/api/hello")).andExpect(status().isNotFound());
        mvc.perform(get("/api/status")).andExpect(status().isNotFound());
    }

    @Test
    void anonymousClientCanReadWriteDeleteImportAndExportData() throws Exception {
        mvc.perform(get("/api/investments").queryParam("owner", "jakub"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());

        String created = mvc.perform(post("/api/investments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ENTRY))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String id = new JsonMapper().readTree(created).get("id").asText();

        mvc.perform(put("/api/investments/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ENTRY.replace("100.00", "125.00")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valuePln").value(125.0));

        byte[] backup = mvc.perform(get("/api/database/export"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsByteArray();
        assertThat(backup).isNotEmpty();

        mvc.perform(delete("/api/investments/{id}", id)).andExpect(status().isNoContent());
        mvc.perform(get("/api/investments").queryParam("owner", "jakub"))
                .andExpect(jsonPath("$").isEmpty());

        MockMultipartFile file = new MockMultipartFile(
                "file", "backup.json", MediaType.APPLICATION_JSON_VALUE, backup);
        mvc.perform(multipart("/api/database/import").file(file)).andExpect(status().isNoContent());
        mvc.perform(get("/api/investments").queryParam("owner", "jakub"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(id));
    }
}
