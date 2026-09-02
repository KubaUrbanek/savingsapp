package pl.oszczednosci.app.adapter.out.persistence;

import java.util.List;
import pl.oszczednosci.app.application.port.out.OwnerDirectory;
import pl.oszczednosci.app.domain.model.OwnerId;

/** Configuration adapter; owners currently have identity only and no aggregate lifecycle. */
public final class ConfiguredOwnerDirectory implements OwnerDirectory {
    private final List<OwnerId> owners;

    public ConfiguredOwnerDirectory(List<OwnerId> owners) {
        this.owners = List.copyOf(owners);
    }

    @Override public List<OwnerId> availableOwners() { return owners; }
}
