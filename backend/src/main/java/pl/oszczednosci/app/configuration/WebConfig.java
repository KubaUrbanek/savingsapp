package pl.oszczednosci.app.configuration;

import java.io.IOException;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    private final WebProperties properties;

    public WebConfig(WebProperties properties) {
        this.properties = properties;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(properties.cors().allowedOrigins().toArray(String[]::new))
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("Content-Type", "Authorization")
                .allowCredentials(true);
    }

    @Configuration
    static class SpaForwardingFilter extends OncePerRequestFilter {
        @Override
        protected boolean shouldNotFilter(HttpServletRequest request) {
            String path = request.getRequestURI().substring(request.getContextPath().length());
            return !HttpMethod.GET.matches(request.getMethod())
                    || path.equals("/")
                    || path.equals("/index.html")
                    || path.startsWith("/api/")
                    || path.equals("/api")
                    || path.startsWith("/actuator/")
                    || path.equals("/actuator")
                    || path.startsWith("/assets/")
                    || lastSegment(path).contains(".");
        }

        @Override
        protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                FilterChain filterChain) throws ServletException, IOException {
            request.getRequestDispatcher("/index.html").forward(request, response);
        }

        private static String lastSegment(String path) {
            return path.substring(path.lastIndexOf('/') + 1);
        }
    }
}
