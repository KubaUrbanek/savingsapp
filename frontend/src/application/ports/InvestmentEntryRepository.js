/** @interface */
export class InvestmentEntryRepository {
  findAll(_filters) { throw new Error('InvestmentEntryRepository.findAll is not implemented'); }
  save(_entry) { throw new Error('InvestmentEntryRepository.save is not implemented'); }
  delete(_id) { throw new Error('InvestmentEntryRepository.delete is not implemented'); }
}
