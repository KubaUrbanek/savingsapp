package pl.oszczednosci.app.adapter.out.persistence.json;

import pl.oszczednosci.app.domain.model.*;

public final class InvestmentOperationJsonMapper {
    public InvestmentOperationJsonRecord toRecord(InvestmentOperation value) {
        return new InvestmentOperationJsonRecord(value.getId(), value.getOperationType(), value.getType(), value.getOwner().value(),
                value.getSubcategory(), value.getAmountPln(), value.getFeePln(), value.getTaxPln(), value.getDate(),
                value.getNote(), value.getCreatedAt(), value.getGroupId());
    }
    public InvestmentOperation toDomain(InvestmentOperationJsonRecord value) {
        InvestmentOperation operation = InvestmentOperation.reconstitute(new InvestmentOperationId(value.id()), value.operationType(),
                AssetCategory.of(value.type(), value.subcategory()), OwnerId.fromExternal(value.owner()),
                Money.zeroOrPositive(value.amountPln()), Money.zeroOrPositive(value.feePln()),
                Money.zeroOrPositive(value.taxPln()), value.date(), value.note(), value.createdAt());
        return value.groupId() == null ? operation : operation.withGroup(value.groupId());
    }
}
