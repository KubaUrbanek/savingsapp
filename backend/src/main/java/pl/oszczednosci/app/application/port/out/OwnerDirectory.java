package pl.oszczednosci.app.application.port.out;

import java.util.List;
import pl.oszczednosci.app.domain.model.OwnerId;

/** Source of owner identities available to application use cases. */
public interface OwnerDirectory {
    List<OwnerId> availableOwners();
}
