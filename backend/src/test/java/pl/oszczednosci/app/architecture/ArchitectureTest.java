package pl.oszczednosci.app.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

@AnalyzeClasses(packages = "pl.oszczednosci.app", importOptions = ImportOption.DoNotIncludeTests.class)
class ArchitectureTest {
    @ArchTest static final ArchRule domain_depends_only_inward = noClasses().that().resideInAPackage("..domain..")
            .should().dependOnClassesThat().resideInAnyPackage("..application..", "..adapter..", "..configuration..",
                    "org.springframework..", "jakarta..", "com.fasterxml.jackson..", "tools.jackson..");

    @ArchTest static final ArchRule application_depends_only_on_application_and_domain = noClasses()
            .that().resideInAPackage("..application..").should().dependOnClassesThat().resideInAnyPackage(
                    "..adapter..", "..configuration..", "org.springframework..", "jakarta..",
                    "com.fasterxml.jackson..", "tools.jackson..");

    @ArchTest static final ArchRule inbound_web_does_not_bypass_ports = noClasses()
            .that().resideInAPackage("..adapter.in.web..").should().dependOnClassesThat().resideInAnyPackage(
                    "..adapter.out..", "..application.usecase..", "..configuration..");

    @ArchTest static final ArchRule outbound_persistence_does_not_depend_on_inbound_side = noClasses()
            .that().resideInAPackage("..adapter.out.persistence..").should().dependOnClassesThat().resideInAnyPackage(
                    "..adapter.in..", "..application.port.in..", "..application.usecase..", "..configuration..");

    @ArchTest static final ArchRule controllers_stay_in_web_adapter = classes().that().haveSimpleNameEndingWith("Controller")
            .should().resideInAPackage("..adapter.in.web..");
    @ArchTest static final ArchRule web_transport_types_stay_in_web_adapter = classes().that()
            .haveSimpleNameEndingWith("Request").or().haveSimpleNameEndingWith("Response")
            .should().resideInAPackage("..adapter.in.web..");
    @ArchTest static final ArchRule json_records_stay_in_json_adapter = classes().that().haveSimpleNameEndingWith("JsonRecord")
            .should().resideInAPackage("..adapter.out.persistence.json..");
    @ArchTest static final ArchRule web_mappers_stay_in_web_adapter = classes().that().haveSimpleNameEndingWith("WebMapper")
            .should().resideInAPackage("..adapter.in.web..");
    @ArchTest static final ArchRule json_mappers_stay_in_json_adapter = classes().that().haveSimpleNameEndingWith("JsonMapper")
            .should().resideInAPackage("..adapter.out.persistence.json..");
}
