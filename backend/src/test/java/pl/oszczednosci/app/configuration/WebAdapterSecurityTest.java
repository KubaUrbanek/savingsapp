package pl.oszczednosci.app.configuration;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.forwardedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
        "app.database.file=${java.io.tmpdir}/savingsapp-web-adapter-test.json",
        "app.web.cors.allowed-origins=https://portfolio.example.com",
        "app.security.reader.username=reader-test",
        "app.security.reader.password=reader-password",
        "app.security.administrator.username=admin-test",
        "app.security.administrator.password=admin-password"
})
@AutoConfigureMockMvc
class WebAdapterSecurityTest {
    @Autowired MockMvc mvc;

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
        mvc.perform(get("/api/not-a-real-endpoint"))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/actuator/not-a-real-endpoint"))
                .andExpect(status().isNotFound());
        mvc.perform(get("/assets/missing.js"))
                .andExpect(status().isNotFound());
    }

    @Test
    void healthIsOperationalAndLegacyDemoEndpointsAreAbsent() throws Exception {
        mvc.perform(get("/actuator/health")).andExpect(status().isOk());
        mvc.perform(get("/api/hello").with(httpBasic("reader-test", "reader-password")))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/status").with(httpBasic("reader-test", "reader-password")))
                .andExpect(status().isNotFound());
    }

    @Test
    void domainApiRejectsAnonymousRequests() throws Exception {
        mvc.perform(get("/api/investments")).andExpect(status().isUnauthorized());
    }

    @Test
    void readerCannotDeleteOrUseBackupEndpoints() throws Exception {
        mvc.perform(delete("/api/investments/" + UUID.randomUUID())
                        .with(httpBasic("reader-test", "reader-password")))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/database/export")
                        .with(httpBasic("reader-test", "reader-password")))
                .andExpect(status().isForbidden());
    }

    @Test
    void administratorCanExportAndReachDestructiveOperations() throws Exception {
        mvc.perform(get("/api/database/export")
                        .with(httpBasic("admin-test", "admin-password")))
                .andExpect(status().isOk());
        mvc.perform(delete("/api/investments/" + UUID.randomUUID())
                        .with(httpBasic("admin-test", "admin-password")))
                .andExpect(status().isNotFound());
    }
}
