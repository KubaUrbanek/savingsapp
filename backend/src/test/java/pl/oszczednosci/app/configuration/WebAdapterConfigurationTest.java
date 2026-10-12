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
    @Test
    void atomicChangeHttpContractSupportsRetryUndoZeroBalanceAndPlans() throws Exception {
        String change="""
          {"requestId":"ddc36cab-a704-4a38-b5ac-e39711ab5bb9","kind":"INITIAL","owner":"jakub","type":"KONTO_BANKOWE","date":"2026-09-06","amountPln":1000,"valuePln":1100}
          """;
        mvc.perform(post("/api/portfolio-changes").contentType(MediaType.APPLICATION_JSON).content(change))
            .andExpect(status().isOk()).andExpect(jsonPath("$.atomic").value(true)).andExpect(jsonPath("$.nextValue").value(1100));
        mvc.perform(post("/api/portfolio-changes").contentType(MediaType.APPLICATION_JSON).content(change)).andExpect(status().isOk());
        mvc.perform(get("/api/investment-operations").queryParam("owner","jakub")).andExpect(jsonPath("$.length()").value(1));
        mvc.perform(get("/api/portfolio-performance").queryParam("owner","jakub"))
            .andExpect(jsonPath("$.nominalResultPln").value(100)).andExpect(jsonPath("$.depositsTotalPln").value(1000));
        mvc.perform(put("/api/portfolio-plans").queryParam("scope","jakub").contentType(MediaType.APPLICATION_JSON)
            .content("{\"allocationVersion\":2,\"bonds\":60,\"stocks\":40,\"gold\":50,\"developed\":40,\"emerging\":10}"))
            .andExpect(status().isOk());
        mvc.perform(put("/api/portfolio-plans").queryParam("scope","jakub").contentType(MediaType.APPLICATION_JSON)
            .content("{\"bonds\":80,\"stocks\":30,\"gold\":20,\"developed\":80,\"emerging\":20}"))
            .andExpect(status().isBadRequest());
        mvc.perform(put("/api/portfolio-plans").queryParam("scope","jakub").contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isBadRequest());
        mvc.perform(get("/api/portfolio-plans").queryParam("scope","jakub")).andExpect(jsonPath("$.bonds").value(60)).andExpect(jsonPath("$.gold").value(50)).andExpect(jsonPath("$.allocationVersion").value(2));
        for (String invalidPlan : new String[]{
            "{\"allocationVersion\":2,\"bonds\":50,\"stocks\":50,\"gold\":50,\"developed\":70,\"emerging\":30}",
            "{\"allocationVersion\":3,\"bonds\":50,\"stocks\":50,\"gold\":50,\"developed\":35,\"emerging\":15}"
        }) mvc.perform(put("/api/portfolio-plans").queryParam("scope","jakub").contentType(MediaType.APPLICATION_JSON).content(invalidPlan)).andExpect(status().isBadRequest());
        mvc.perform(delete("/api/portfolio-changes/ddc36cab-a704-4a38-b5ac-e39711ab5bb9")).andExpect(status().isNoContent());
        mvc.perform(get("/api/investments").queryParam("owner","jakub")).andExpect(jsonPath("$").isEmpty());
        mvc.perform(get("/api/investment-operations").queryParam("owner","jakub")).andExpect(jsonPath("$").isEmpty());
        mvc.perform(get("/api/portfolio-plans").queryParam("scope","jakub")).andExpect(jsonPath("$.bonds").value(60)).andExpect(jsonPath("$.gold").value(50)).andExpect(jsonPath("$.allocationVersion").value(2));
    }

    @Test
    void snapshotWithoutBasisReturnsNullProfitAndNewChangesRejectFutureDates() throws Exception {
        mvc.perform(post("/api/investments").contentType(MediaType.APPLICATION_JSON).content(ENTRY)).andExpect(status().isCreated());
        mvc.perform(get("/api/portfolio-performance").queryParam("owner","jakub"))
            .andExpect(jsonPath("$.nominalResultPln").doesNotExist()).andExpect(jsonPath("$.xirrStatus").value("INCOMPLETE_HISTORY"));
        mvc.perform(post("/api/portfolio-changes").contentType(MediaType.APPLICATION_JSON).content("""
            {"requestId":"30c36cab-a704-4a38-b5ac-e39711ab5bb9","kind":"DEPOSIT","owner":"jakub","type":"KONTO_BANKOWE","date":"2999-01-01","amountPln":100}
            """)).andExpect(status().isBadRequest());
    }


    @Test void atomicCorrectionHttpContractPreservesIdentifierAndRejectsMismatchedBody() throws Exception {
        String id="ddc36cab-a704-4a38-b5ac-e39711ab5bb9";
        String change="""
            {"requestId":"ddc36cab-a704-4a38-b5ac-e39711ab5bb9","kind":"INITIAL","owner":"jakub","type":"KONTO_BANKOWE","date":"2026-09-06","amountPln":1000,"valuePln":1100}
            """;
        mvc.perform(post("/api/portfolio-changes").contentType(MediaType.APPLICATION_JSON).content(change)).andExpect(status().isOk());
        String corrected=change.replace("1000","900");
        mvc.perform(put("/api/portfolio-changes/{id}",id).contentType(MediaType.APPLICATION_JSON).content(corrected))
            .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(id)).andExpect(jsonPath("$.nextValue").value(1100));
        mvc.perform(put("/api/portfolio-changes/{id}",id).contentType(MediaType.APPLICATION_JSON).content(corrected)).andExpect(status().isOk());
        mvc.perform(get("/api/investment-operations").queryParam("owner","jakub")).andExpect(jsonPath("$.length()").value(1));
        mvc.perform(get("/api/portfolio-performance").queryParam("owner","jakub")).andExpect(jsonPath("$.nominalResultPln").value(200));
        mvc.perform(put("/api/portfolio-changes/{id}","30c36cab-a704-4a38-b5ac-e39711ab5bb9").contentType(MediaType.APPLICATION_JSON).content(corrected)).andExpect(status().isBadRequest());
    }
}
