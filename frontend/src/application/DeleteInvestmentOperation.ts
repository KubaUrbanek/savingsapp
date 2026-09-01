// @ts-nocheck
export class DeleteInvestmentOperation {
  constructor(operations) {
    this.operations = operations;
  }
  execute(id) {
    return this.operations.delete(id);
  }
}
