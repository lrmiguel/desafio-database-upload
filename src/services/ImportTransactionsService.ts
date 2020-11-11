import path from 'path';
import fs from 'fs';
import getStream from 'get-stream';

import parse from 'csv-parse';
import { getRepository } from 'typeorm';
import Transaction from '../models/Transaction';
import uploadConfig from '../config/upload';
import Category from '../models/Category';

interface Request {
  filename: string;
}

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category_id: string;
}

class ImportTransactionsService {
  async execute({ filename }: Request): Promise<Transaction[]> {
    const transactionsRepository = getRepository(Transaction);
    const categoriesRepository = getRepository(Category);

    const transactionsFilePath = path.join(uploadConfig.directory, filename);

    const parser = parse({ delimiter: ',' });
    const data: string[][] = await getStream.array(
      fs.createReadStream(transactionsFilePath).pipe(parser),
    );

    const categories: Category[] = [];
    const persistedCategories = await categoriesRepository.find();

    const transactions: Transaction[] = await Promise.all(
      data.slice(1).map(async line => {
        const [title, type, value, categoryTitle] = line.map((item: string) =>
          item.trim(),
        );

        const foundCategory = persistedCategories.find(
          persistedCategory => persistedCategory.title === categoryTitle,
        );

        let categoryToAdd = foundCategory;

        const earlyCycleCategory = categories.find(
          category => category.title === categoryTitle,
        );
        if (earlyCycleCategory) {
          categoryToAdd = earlyCycleCategory;
        }

        if (!categoryToAdd) {
          const createdCategory = categoriesRepository.create({
            title: categoryTitle,
          });
          categories.push(createdCategory);
          categoryToAdd = createdCategory;
        }

        const csvTransaction: CSVTransaction = {
          title,
          type: type === 'income' ? 'income' : 'outcome',
          value: +value,
          category_id: categoryToAdd.id,
        };

        const transaction = transactionsRepository.create(csvTransaction);

        return transaction;
      }),
    );

    await categoriesRepository.save(
      categories.filter(
        category =>
          !persistedCategories.map(c => c.title).includes(category.title),
      ),
    );

    await transactionsRepository.save(transactions);

    return transactions;
  }
}

export default ImportTransactionsService;
