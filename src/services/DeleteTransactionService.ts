// import AppError from '../errors/AppError';

import { getRepository } from 'typeorm';
import Transaction from '../models/Transaction';

interface Request {
  id: string;
}

class DeleteTransactionService {
  public async execute({ id }: Request): Promise<void> {
    const transactionsRepository = getRepository(Transaction);
    const transaction = await transactionsRepository.findOne(id);

    if (!transaction) {
      throw new Error('Repository not found.');
    }

    await transactionsRepository.remove(transaction);
  }
}

export default DeleteTransactionService;
