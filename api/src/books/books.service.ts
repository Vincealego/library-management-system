import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';

export interface FindAllBooksParams {
  genreId?: number;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class BooksService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll({ genreId, search, page = 1, limit = 10 }: FindAllBooksParams) {
    const take = Math.min(Math.max(limit, 1), 100);
    const currentPage = Math.max(page, 1);
    const skip = (currentPage - 1) * take;

    // Build the where clause from the optional filters
    const where: Prisma.BookWhereInput = {};
    if (genreId !== undefined) {
      where.genreId = genreId;
    }
    if (search && search.trim() !== '') {
      where.OR = [
        { title: { contains: search.trim(), mode: 'insensitive' } },
        { author: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.book.findMany({
        where,
        skip,
        take,
        orderBy: { title: 'asc' },
        include: { genre: true },
      }),
      this.prisma.book.count({ where }),
    ]);

    return {
      data,
      meta: { total, page: currentPage, limit: take, totalPages: Math.ceil(total / take) },
    };
  }

  async findOne(id: number) {
    const book = await this.prisma.book.findUnique({ where: { id }, include: { genre: true } });
    if (!book) {
      throw new NotFoundException(`Book ${id} not found`);
    }
    return book;
  }

  async create(dto: CreateBookDto) {
    await this.ensureGenreExists(dto.genreId);
    try {
      return await this.prisma.book.create({ data: dto, include: { genre: true } });
    } catch (error) {
      this.handleError(error);
    }
  }

  async update(id: number, dto: UpdateBookDto) {
    await this.findOne(id);
    if (dto.genreId !== undefined) {
      await this.ensureGenreExists(dto.genreId);
    }
    try {
      return await this.prisma.book.update({ where: { id }, data: dto, include: { genre: true } });
    } catch (error) {
      this.handleError(error);
    }
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.book.delete({ where: { id } });
  }

  private async ensureGenreExists(genreId: number) {
    const genre = await this.prisma.genre.findUnique({ where: { id: genreId } });
    if (!genre) {
      throw new BadRequestException(`Genre ${genreId} does not exist`);
    }
  }

  private handleError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('A book with this ISBN already exists');
    }
    throw error;
  }
}
