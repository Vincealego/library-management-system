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
