// import AppError from '../errors/AppError';

import { getCustomRepository, getRepository } from 'typeorm';
import Transaction from '../models/Transaction';

import Category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    const transactionsRepository = getRepository(Transaction);
    const customTransactionsRepository = getCustomRepository(
      TransactionsRepository,
    );
    const categoriesRepository = getRepository(Category);

    const balance = await customTransactionsRepository.getBalance();
    if (type === 'outcome' && balance.total - value < 0) {
      throw new Error('Invalid balance');
    }

    let categoryEntity = await categoriesRepository.findOne({
      where: {
        title: category,
      },
    });

    if (!categoryEntity) {
      categoryEntity = categoriesRepository.create({
        title: category,
      });
      await categoriesRepository.save(categoryEntity);
    }

    const transaction = transactionsRepository.create({
      title,
      value,
      type,
      category_id: categoryEntity.id,
    });

    await transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
