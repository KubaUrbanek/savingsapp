package pl.oszczednosci.app.adapter.out.persistence.json;

import pl.oszczednosci.app.domain.model.*;

public final class InvestmentEntryJsonMapper {
    public InvestmentEntryJsonRecord toRecord(InvestmentEntry value) {
        return new InvestmentEntryJsonRecord(value.getId(), value.getType(), value.getOwner().value(), value.getSubcategory(),
                value.getValuePln(), value.getDate(), value.getCreatedAt(), value.getUpdatedAt());
    }
    public InvestmentEntry toDomain(InvestmentEntryJsonRecord value) {
        return InvestmentEntry.reconstitute(new InvestmentEntryId(value.id()),
                AssetCategory.of(value.type(), value.subcategory()), OwnerId.fromExternal(value.owner()),
                Money.positive(value.valuePln()), value.date(), value.createdAt(), value.updatedAt());
    }
}
