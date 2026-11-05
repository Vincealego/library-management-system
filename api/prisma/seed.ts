import { PrismaClient, Role } from '@prisma/client';

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

  // 16 books, 4 per genre
  await prisma.book.createMany({
    data: [
      { title: 'Dune', author: 'Frank Herbert', publishedYear: 1965, genreId: scienceFiction.id },
      { title: 'Neuromancer', author: 'William Gibson', publishedYear: 1984, genreId: scienceFiction.id },
      { title: 'The Left Hand of Darkness', author: 'Ursula K. Le Guin', publishedYear: 1969, genreId: scienceFiction.id },
      { title: 'Foundation', author: 'Isaac Asimov', publishedYear: 1951, genreId: scienceFiction.id },

      { title: 'The Hobbit', author: 'J.R.R. Tolkien', publishedYear: 1937, genreId: fantasy.id },
      { title: 'A Wizard of Earthsea', author: 'Ursula K. Le Guin', publishedYear: 1968, genreId: fantasy.id },
      { title: 'The Name of the Wind', author: 'Patrick Rothfuss', publishedYear: 2007, genreId: fantasy.id },
      { title: 'Mistborn', author: 'Brandon Sanderson', publishedYear: 2006, genreId: fantasy.id },

      { title: 'And Then There Were None', author: 'Agatha Christie', publishedYear: 1939, genreId: mystery.id },
      { title: 'The Big Sleep', author: 'Raymond Chandler', publishedYear: 1939, genreId: mystery.id },
      { title: 'The Girl with the Dragon Tattoo', author: 'Stieg Larsson', publishedYear: 2005, genreId: mystery.id },
      { title: 'Gone Girl', author: 'Gillian Flynn', publishedYear: 2012, genreId: mystery.id },

      { title: 'Sapiens', author: 'Yuval Noah Harari', publishedYear: 2011, genreId: nonFiction.id },
      { title: 'The Immortal Life of Henrietta Lacks', author: 'Rebecca Skloot', publishedYear: 2010, genreId: nonFiction.id },
      { title: 'Educated', author: 'Tara Westover', publishedYear: 2018, genreId: nonFiction.id },
      { title: 'Cosmos', author: 'Carl Sagan', publishedYear: 1980, genreId: nonFiction.id },
    ],
  });

  // 2 users using the Role enum
  await prisma.user.upsert({
    where: { email: 'patron@library.test' },
    update: {},
    create: { email: 'patron@library.test', name: 'Sample Patron', role: Role.PATRON },
  });
  await prisma.user.upsert({
    where: { email: 'librarian@library.test' },
    update: {},
    create: { email: 'librarian@library.test', name: 'Sample Librarian', role: Role.LIBRARIAN },
  });

  console.log('Seeded 4 genres, 16 books, and 2 users');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());