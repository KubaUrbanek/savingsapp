package pl.oszczednosci.app.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import pl.oszczednosci.app.model.InvestmentEntry;
import pl.oszczednosci.app.model.InvestmentType;

public interface InvestmentEntryRepository extends JpaRepository<InvestmentEntry, UUID> {

    List<InvestmentEntry> findByTypeOrderByDateDescCreatedAtDesc(InvestmentType type);

    List<InvestmentEntry> findAllByOrderByDateDescCreatedAtDesc();
}
