package pl.oszczednosci.app.architecture;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import com.tngtech.archunit.core.importer.ImportOption; import com.tngtech.archunit.junit.*;
@AnalyzeClasses(packages="pl.oszczednosci.app", importOptions=ImportOption.DoNotIncludeTests.class)
class ArchitectureTest {
 @ArchTest static final com.tngtech.archunit.lang.ArchRule domain_is_framework_free = noClasses().that().resideInAPackage("..domain..")
  .should().dependOnClassesThat().resideInAnyPackage("org.springframework..", "com.fasterxml.jackson..", "tools.jackson..");
 @ArchTest static final com.tngtech.archunit.lang.ArchRule application_does_not_depend_on_adapters = noClasses().that().resideInAPackage("..application..")
  .should().dependOnClassesThat().resideInAPackage("..adapter..");
 @ArchTest static final com.tngtech.archunit.lang.ArchRule web_uses_no_usecase_implementations = noClasses().that().resideInAPackage("..adapter.in.web..")
  .should().dependOnClassesThat().resideInAPackage("..application.usecase..");
}
