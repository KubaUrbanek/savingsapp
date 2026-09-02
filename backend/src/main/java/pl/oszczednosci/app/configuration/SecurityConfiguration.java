package pl.oszczednosci.app.configuration;

import static org.springframework.http.HttpMethod.DELETE;
import static org.springframework.http.HttpMethod.GET;
import static org.springframework.http.HttpMethod.OPTIONS;
import static org.springframework.http.HttpMethod.POST;
import static org.springframework.http.HttpMethod.PUT;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfiguration {
    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .cors(Customizer.withDefaults())
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
                        .requestMatchers(OPTIONS, "/api/**").permitAll()
                        .requestMatchers(POST, "/api/database/import").hasRole("ADMIN")
                        .requestMatchers(GET, "/api/database/export").hasRole("ADMIN")
                        .requestMatchers(DELETE, "/api/**").hasRole("ADMIN")
                        .requestMatchers(POST, "/api/**").hasRole("ADMIN")
                        .requestMatchers(PUT, "/api/**").hasRole("ADMIN")
                        .requestMatchers("/api/**").hasAnyRole("READER", "ADMIN")
                        .anyRequest().permitAll())
                .httpBasic(Customizer.withDefaults())
                .build();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    UserDetailsService userDetailsService(AppSecurityProperties properties, PasswordEncoder encoder) {
        AppSecurityProperties.User reader = properties.reader();
        AppSecurityProperties.User administrator = properties.administrator();
        return new InMemoryUserDetailsManager(
                User.withUsername(reader.username()).password(encoder.encode(reader.password())).roles("READER").build(),
                User.withUsername(administrator.username()).password(encoder.encode(administrator.password())).roles("ADMIN").build());
    }
}
