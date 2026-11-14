import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGenreDto } from './dto/create-genre.dto';
import { UpdateGenreDto } from './dto/update-genre.dto';

@Injectable()
export class GenresService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateGenreDto) {
    try {
      return await this.prisma.genre.create({ data: { name: dto.name } });
    } catch (error) {
      this.handleError(error);
    }
  }

  findAll() {
    return this.prisma.genre.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { books: true } } },
    });
  }

  async findOne(id: number) {
    const genre = await this.prisma.genre.findUnique({
      where: { id },
      include: { _count: { select: { books: true } } },
    });
    if (!genre) {
      throw new NotFoundException(`Genre ${id} not found`);
    }
    return genre;
  }

  async update(id: number, dto: UpdateGenreDto) {
    await this.findOne(id);
    try {
      return await this.prisma.genre.update({ where: { id }, data: dto });
    } catch (error) {
      this.handleError(error);
    }
  }

  async remove(id: number) {
    await this.findOne(id);
    const bookCount = await this.prisma.book.count({ where: { genreId: id } });
    if (bookCount > 0) {
      throw new ConflictException(
        `Genre ${id} still has ${bookCount} book(s). Move or delete them first.`,
      );
    }
    return this.prisma.genre.delete({ where: { id } });
  }

  private handleError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('A genre with this name already exists');
    }
    throw error;
  }
}
