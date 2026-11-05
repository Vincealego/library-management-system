import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const catalog: Record<string, [string, string, number][]> = {
  'Science Fiction': [
    ['Dune', 'Frank Herbert', 1965],
    ['Neuromancer', 'William Gibson', 1984],
    ['The Left Hand of Darkness', 'Ursula K. Le Guin', 1969],
    ['Foundation', 'Isaac Asimov', 1951],
  ],
  Fantasy: [
    ['The Hobbit', 'J.R.R. Tolkien', 1937],
    ['A Wizard of Earthsea', 'Ursula K. Le Guin', 1968],
    ['The Name of the Wind', 'Patrick Rothfuss', 2007],
    ['Mistborn', 'Brandon Sanderson', 2006],
  ],
  Mystery: [
    ['And Then There Were None', 'Agatha Christie', 1939],
    ['The Big Sleep', 'Raymond Chandler', 1939],
    ['The Girl with the Dragon Tattoo', 'Stieg Larsson', 2005],
    ['Gone Girl', 'Gillian Flynn', 2012],
  ],
  'Non-Fiction': [
    ['Sapiens', 'Yuval Noah Harari', 2011],
    ['The Immortal Life of Henrietta Lacks', 'Rebecca Skloot', 2010],
    ['Educated', 'Tara Westover', 2018],
    ['Cosmos', 'Carl Sagan', 1980],
  ],
};

async function main() {
  await prisma.review.deleteMany();
  await prisma.book.deleteMany();
  await prisma.genre.deleteMany();

  for (const [genreName, books] of Object.entries(catalog)) {
    await prisma.genre.create({
      data: {
        name: genreName,
        books: {
          create: books.map(([title, author, publishedYear]) => ({
            title,
            author,
            publishedYear,
          })),
        },
      },
    });
  }
  console.log('Seeded 4 genres and 16 books');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
