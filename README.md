# Library Management System

NestJS + Prisma + PostgreSQL backend for a library catalog, with JWT authentication and role-based authorization.

## Setup

```bash
cd api
npm install
cp .env.example .env      # then fill in DATABASE_URL and JWT_SECRET
npx prisma migrate dev
npx prisma db seed
npm run start:dev         # http://localhost:3000
```

`.env` needs:

```
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema=public"
JWT_SECRET="a-long-random-string"
JWT_EXPIRES_IN="1d"
```

The seed creates 4 genres, 16 books and two demo accounts (password `Password123!`):
`librarian@library.test` (LIBRARIAN) and `patron@library.test` (PATRON).

## API

| Method | Route | Access |
|---|---|---|
| POST | `/auth/register` | Public. Creates a PATRON and returns a JWT |
| POST | `/auth/login` | Public, rate limited (5 per minute). Returns a JWT |
| GET | `/users/profile` | Any logged-in user |
| GET | `/genres`, `/genres/:id` | Public |
| POST, PATCH, DELETE | `/genres`, `/genres/:id` | LIBRARIAN |
| GET | `/books?genreId=&search=&page=&limit=` | Public |
| GET | `/books/:id` | Public |
| POST, PATCH, DELETE | `/books`, `/books/:id` | LIBRARIAN |

`GET /books` filters by `genreId`, searches title and author (case-insensitive), and paginates with `page` (default 1) and `limit` (default 10, max 100). It returns `{ data, meta: { total, page, limit, totalPages } }`.

Send the token as `Authorization: Bearer <token>`. A Postman collection with a request for every endpoint is in `docs/postman_collection.json`.

## Auth design

- Passwords are hashed with bcrypt before saving and are never returned by the API.
- `JwtStrategy` verifies tokens with `JWT_SECRET`; `JwtAuthGuard` extends `AuthGuard('jwt')`.
- `@Roles(Role.LIBRARIAN)` plus `RolesGuard` checks `req.user.role` against the required roles. A missing or invalid token gives 401, and the wrong role gives 403.
- Registration always creates a PATRON, and `ValidationPipe({ whitelist: true })` strips any `role` field from the request body, so nobody can self-promote to LIBRARIAN.

## Schema Decisions

**Why Book references Genre instead of embedding it**

Book stores a `genreId` foreign key with a `@relation` to the Genre table
rather than copying the genre name into each book row.

- **Single source of truth:** renaming a genre is one update, not one per book.
- **Consistency:** the foreign key prevents assigning a genre that doesn't exist.
- **Easy querying:** listing or counting books per genre is a simple indexed join.
- **Extensible:** a genre can later gain its own fields (description, slug) without touching Book rows.

**Stretch: Prisma vs. a document database**

In a document DB I would have been tempted to embed the genre or reviews
inside each book document. In Prisma, I model them as separate tables with
relations and let the database enforce integrity.

## Source Code Reference

The implementation lives in the files below. They are reproduced here so the whole data layer and API can be reviewed from this page.

### `api/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  PATRON
  LIBRARIAN
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String
  password  String
  role      Role     @default(PATRON)
  createdAt DateTime @default(now())
  reviews   Review[]
}

model Genre {
  id    Int    @id @default(autoincrement())
  name  String @unique
  books Book[]
}

model Book {
  id            Int      @id @default(autoincrement())
  title         String
  author        String
  isbn          String   @unique
  totalCopies   Int      @default(1)
  publishedYear Int?
  genreId       Int
  genre         Genre    @relation(fields: [genreId], references: [id])
  reviews       Review[]

  @@index([genreId])
}

// Stretch from week 1: Review
model Review {
  id      Int     @id @default(autoincrement())
  rating  Int
  comment String?
  bookId  Int
  userId  Int
  book    Book    @relation(fields: [bookId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([bookId, userId])
}
```

### `api/prisma/seed.ts`

```ts
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  await prisma.review.deleteMany();
  await prisma.book.deleteMany();
  await prisma.genre.deleteMany();

  // 4 genres
  const scienceFiction = await prisma.genre.create({ data: { name: 'Science Fiction' } });
  const fantasy = await prisma.genre.create({ data: { name: 'Fantasy' } });
  const mystery = await prisma.genre.create({ data: { name: 'Mystery' } });
  const nonFiction = await prisma.genre.create({ data: { name: 'Non-Fiction' } });

  // 16 books, 4 per genre (sample ISBNs, used as demo data)
  await prisma.book.createMany({
    data: [
      { title: 'Dune', author: 'Frank Herbert', isbn: '9780441172719', totalCopies: 5, publishedYear: 1965, genreId: scienceFiction.id },
      { title: 'Neuromancer', author: 'William Gibson', isbn: '9780441569595', totalCopies: 3, publishedYear: 1984, genreId: scienceFiction.id },
      { title: 'The Left Hand of Darkness', author: 'Ursula K. Le Guin', isbn: '9780441478125', totalCopies: 2, publishedYear: 1969, genreId: scienceFiction.id },
      { title: 'Foundation', author: 'Isaac Asimov', isbn: '9780553293357', totalCopies: 4, publishedYear: 1951, genreId: scienceFiction.id },

      { title: 'The Hobbit', author: 'J.R.R. Tolkien', isbn: '9780547928227', totalCopies: 6, publishedYear: 1937, genreId: fantasy.id },
      { title: 'A Wizard of Earthsea', author: 'Ursula K. Le Guin', isbn: '9780547773742', totalCopies: 3, publishedYear: 1968, genreId: fantasy.id },
      { title: 'The Name of the Wind', author: 'Patrick Rothfuss', isbn: '9780756404741', totalCopies: 4, publishedYear: 2007, genreId: fantasy.id },
      { title: 'Mistborn', author: 'Brandon Sanderson', isbn: '9780765311788', totalCopies: 3, publishedYear: 2006, genreId: fantasy.id },

      { title: 'And Then There Were None', author: 'Agatha Christie', isbn: '9780062073488', totalCopies: 5, publishedYear: 1939, genreId: mystery.id },
      { title: 'The Big Sleep', author: 'Raymond Chandler', isbn: '9780394758282', totalCopies: 2, publishedYear: 1939, genreId: mystery.id },
      { title: 'The Girl with the Dragon Tattoo', author: 'Stieg Larsson', isbn: '9780307269751', totalCopies: 4, publishedYear: 2005, genreId: mystery.id },
      { title: 'Gone Girl', author: 'Gillian Flynn', isbn: '9780307588371', totalCopies: 4, publishedYear: 2012, genreId: mystery.id },

      { title: 'Sapiens', author: 'Yuval Noah Harari', isbn: '9780062316097', totalCopies: 6, publishedYear: 2011, genreId: nonFiction.id },
      { title: 'The Immortal Life of Henrietta Lacks', author: 'Rebecca Skloot', isbn: '9781400052189', totalCopies: 3, publishedYear: 2010, genreId: nonFiction.id },
      { title: 'Educated', author: 'Tara Westover', isbn: '9780399590504', totalCopies: 4, publishedYear: 2018, genreId: nonFiction.id },
      { title: 'Cosmos', author: 'Carl Sagan', isbn: '9780345539434', totalCopies: 3, publishedYear: 1980, genreId: nonFiction.id },
    ],
  });

  // 2 demo users (password for both: Password123!)
  const passwordHash = await bcrypt.hash('Password123!', 10);
  await prisma.user.upsert({
    where: { email: 'patron@library.test' },
    update: { password: passwordHash },
    create: { email: 'patron@library.test', name: 'Sample Patron', password: passwordHash, role: Role.PATRON },
  });
  await prisma.user.upsert({
    where: { email: 'librarian@library.test' },
    update: { password: passwordHash },
    create: { email: 'librarian@library.test', name: 'Sample Librarian', password: passwordHash, role: Role.LIBRARIAN },
  });

  console.log('Seeded 4 genres, 16 books, and 2 users');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

### `api/.env.example`

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema=public"
JWT_SECRET="replace-with-a-long-random-string"
JWT_EXPIRES_IN="1d"
```

### `api/src/app.module.ts`

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GenresModule } from './genres/genres.module';
import { BooksModule } from './books/books.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    GenresModule,
    BooksModule,
  ],
})
export class AppModule {}
```

### `api/src/auth/auth.controller.ts`

```ts
import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // Stretch: login is rate limited to 5 attempts per minute per IP
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
```

### `api/src/auth/auth.module.ts`

```ts
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: (config.get<string>('JWT_EXPIRES_IN') ?? '1d') as JwtSignOptions['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

### `api/src/auth/auth.service.ts`

```ts
import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

interface TokenUser {
  id: number;
  email: string;
  name: string;
  role: Role;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    // Passwords are hashed with bcrypt before saving. New accounts are always PATRON.
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { email: dto.email, name: dto.name, password: hashedPassword },
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    const passwordMatches = user ? await bcrypt.compare(dto.password, user.password) : false;

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.buildAuthResponse(user);
  }

  private async buildAuthResponse(user: TokenUser) {
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      access_token: accessToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  }
}
```

### `api/src/auth/dto/login.dto.ts`

```ts
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
```

### `api/src/auth/dto/register.dto.ts`

```ts
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @MinLength(8)
  password: string;
}
```

### `api/src/auth/jwt-auth.guard.ts`

```ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

### `api/src/auth/jwt.strategy.ts`

```ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';

interface JwtPayload {
  sub: number;
  email: string;
  role: Role;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  // Whatever is returned here becomes req.user
  validate(payload: JwtPayload) {
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
```

### `api/src/auth/roles.decorator.ts`

```ts
import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

### `api/src/auth/roles.guard.ts`

```ts
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles() on the route means any authenticated user may pass
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('You do not have permission to perform this action');
    }

    return true;
  }
}
```

### `api/src/books/books.controller.ts`

```ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { BooksService } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';

@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  // GET /books?genreId=1&search=dune&page=1&limit=10  (public)
  @Get()
  findAll(
    @Query('genreId', new ParseIntPipe({ optional: true })) genreId?: number,
    @Query('search') search?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.booksService.findAll({ genreId, search, page, limit });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.booksService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.LIBRARIAN)
  create(@Body() dto: CreateBookDto) {
    return this.booksService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.LIBRARIAN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBookDto) {
    return this.booksService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.LIBRARIAN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.booksService.remove(id);
  }
}
```

### `api/src/books/books.module.ts`

```ts
import { Module } from '@nestjs/common';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';

@Module({
  controllers: [BooksController],
  providers: [BooksService],
})
export class BooksModule {}
```

### `api/src/books/books.service.ts`

```ts
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
```

### `api/src/books/dto/create-book.dto.ts`

```ts
import { IsInt, IsNotEmpty, IsString, Length, Min } from 'class-validator';

export class CreateBookDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  author: string;

  @IsString()
  @Length(10, 17)
  isbn: string;

  @IsInt()
  @Min(0)
  totalCopies: number;

  @IsInt()
  @Min(1)
  genreId: number;
}
```

### `api/src/books/dto/update-book.dto.ts`

```ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateBookDto } from './create-book.dto';

export class UpdateBookDto extends PartialType(CreateBookDto) {}
```

### `api/src/genres/dto/create-genre.dto.ts`

```ts
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateGenreDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}
```

### `api/src/genres/dto/update-genre.dto.ts`

```ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateGenreDto } from './create-genre.dto';

export class UpdateGenreDto extends PartialType(CreateGenreDto) {}
```

### `api/src/genres/genres.controller.ts`

```ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateGenreDto } from './dto/create-genre.dto';
import { UpdateGenreDto } from './dto/update-genre.dto';
import { GenresService } from './genres.service';

@Controller('genres')
export class GenresController {
  constructor(private readonly genresService: GenresService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.LIBRARIAN)
  create(@Body() dto: CreateGenreDto) {
    return this.genresService.create(dto);
  }

  @Get()
  findAll() {
    return this.genresService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.genresService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.LIBRARIAN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateGenreDto) {
    return this.genresService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.LIBRARIAN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.genresService.remove(id);
  }
}
```

### `api/src/genres/genres.module.ts`

```ts
import { Module } from '@nestjs/common';
import { GenresController } from './genres.controller';
import { GenresService } from './genres.service';

@Module({
  controllers: [GenresController],
  providers: [GenresService],
})
export class GenresModule {}
```

### `api/src/genres/genres.service.ts`

```ts
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
```

### `api/src/main.ts`

```ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.enableCors();
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

### `api/src/prisma/prisma.module.ts`

```ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

### `api/src/prisma/prisma.service.ts`

```ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
```

### `api/src/users/users.controller.ts`

```ts
import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';

interface AuthenticatedRequest {
  user: { id: number; email: string; role: string };
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Stretch: reads the authenticated user from the request
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Req() req: AuthenticatedRequest) {
    return this.usersService.findProfile(req.user.id);
  }
}
```

### `api/src/users/users.module.ts`

```ts
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
```

### `api/src/users/users.service.ts`

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findProfile(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
```

## Postman Collection

`docs/postman_collection.json` contains a request for every endpoint: register, login, profile, genres (create, list, get one, update), books (list, filtered list, get one, create, update, delete), the 403 and 401 role checks, and a cleanup request.
