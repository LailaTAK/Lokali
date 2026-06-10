// backend/prisma/seed.ts

import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Main database seed function.
 * Wipes existing tables and inserts complete, clean fake records for development.
 */
async function main() {
  console.log('🌱 Starting database seeding process...');

  // 1. Wipe existing data in correct dependency order
  console.log('🗑️ Cleaning up existing database records...');
  await prisma.message.deleteMany();
  await prisma.paiement.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.avis.deleteMany();
  await prisma.alerte.deleteMany();
  await prisma.annonce.deleteMany();
  await prisma.bien.deleteMany();
  await prisma.user.deleteMany();

  // 2. Hash standard test password (Password123!) for all seeded users
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash('Password123!', saltRounds);

  // 3. Create 1 Administrator
  console.log('👤 Creating administrator...');
  const admin = await prisma.user.create({
    data: {
      nom: 'Diallo',
      prenom: 'Mamadou',
      email: 'admin@lokali.com',
      telephone: '+221771234567',
      motDePasse: hashedPassword,
      role: 'ADMINISTRATEUR',
      actif: true,
      adresse: 'Dakar, Sénégal',
    },
  });

  // 4. Create 2 Loueurs (Hosts)
  console.log('👤 Creating hosts...');
  const hosts = [];
  for (let i = 1; i <= 2; i++) {
    const host = await prisma.user.create({
      data: {
        nom: faker.person.lastName(),
        prenom: faker.person.firstName(),
        email: `loueur${i}@lokali.com`,
        telephone: faker.phone.number(),
        motDePasse: hashedPassword,
        role: 'LOUEUR',
        actif: true,
        adresse: faker.location.streetAddress(),
        photo: `https://randomuser.me/api/portraits/men/${10 + i}.jpg`,
      },
    });
    hosts.push(host);
  }

  // 5. Create 4 Clients (Guests)
  console.log('👤 Creating clients...');
  const clients = [];
  for (let i = 1; i <= 4; i++) {
    const client = await prisma.user.create({
      data: {
        nom: faker.person.lastName(),
        prenom: faker.person.firstName(),
        email: `client${i}@lokali.com`,
        telephone: faker.phone.number(),
        motDePasse: hashedPassword,
        role: 'CLIENT',
        actif: true,
        adresse: faker.location.streetAddress(),
        photo: `https://randomuser.me/api/portraits/women/${20 + i}.jpg`,
      },
    });
    clients.push(client);
  }

  // 6. Create 3 Biens (Properties) for each Loueur (6 total)
  console.log('🏠 Creating property listings...');
  const biens = [];
  const propertyTypes = ['APPARTEMENT', 'MAISON', 'STUDIO', 'CHAMBRE'];
  const cities = ['Paris', 'Lyon', 'Marseille', 'Dakar', 'Saint-Louis'];

  for (const host of hosts) {
    for (let j = 0; j < 3; j++) {
      const type = faker.helpers.arrayElement(propertyTypes);
      const city = faker.helpers.arrayElement(cities);

      const bien = await prisma.bien.create({
        data: {
          titre: `${faker.word.adjective()} ${type.toLowerCase()} à ${city}`,
          description: faker.lorem.paragraph({ min: 3, max: 5 }),
          adresse: faker.location.streetAddress(),
          ville: city,
          superficie: faker.number.float({ min: 18, max: 150, multipleOf: 0.1 }),
          nbPieces: faker.number.int({ min: 1, max: 6 }),
          loyer: faker.number.float({ min: 300, max: 2500, multipleOf: 5 }),
          type,
          equipements: faker.helpers.arrayElements(
            ['Wi-Fi', 'Climatisation', 'Cuisine équipée', 'Machine à laver', 'Piscine', 'Parking', 'Terrasse'],
            { min: 3, max: 6 }
          ),
          lat: faker.location.latitude(),
          lng: faker.location.longitude(),
          statut: 'DISPONIBLE',
          loueurId: host.id,
          photos: [
            `https://images.unsplash.com/photo-${faker.helpers.arrayElement([
              '1522708323590-d24dbb6b0267',
              '1502672260266-1c1ef2d93688',
              '1560448204-e02f11c3d0e2',
              '1484154218962-a197022b5858',
              '1512917774080-9991f1c4c750',
            ])}?auto=format&fit=crop&w=600&q=80`,
          ],
        },
      });
      biens.push(bien);
    }
  }

  // 7. Create 5 approved Annonces (from the 6 biens created)
  console.log('📢 Publishing and approving announcements...');
  const annonces = [];
  for (let k = 0; k < 5; k++) {
    const bien = biens[k];
    const host = hosts.find((h) => h.id === bien.loueurId)!;

    const annonce = await prisma.annonce.create({
      data: {
        titre: `Exceptionnel ! ${bien.titre}`,
        description: `Profitez d'un séjour mémorable dans ce superbe logement. ${bien.description}`,
        prixParNuit: Number((bien.loyer / 30).toFixed(0)), // price per night estimation
        bienId: bien.id,
        statut: 'ACTIF', // APPROVED (moderation done)
        vues: faker.number.int({ min: 10, max: 300 }),
      },
    });
    annonces.push(annonce);
  }

  // 8. Create 3 Reservations booked by CLIENT users on the active annonces
  console.log('📅 Creating client booking reservations...');
  const reservations = [];
  for (let r = 0; r < 3; r++) {
    const client = clients[r];
    const annonce = annonces[r];
    const checkIn = faker.date.soon({ days: 10 });
    const checkOut = new Date(checkIn);
    const nbNuits = faker.number.int({ min: 2, max: 7 });
    checkOut.setDate(checkOut.getDate() + nbNuits);

    const reservation = await prisma.reservation.create({
      data: {
        annonceId: annonce.id,
        bienId: annonce.bienId,
        clientId: client.id,
        checkIn,
        checkOut,
        nbNuits,
        montantTotal: nbNuits * annonce.prixParNuit,
        statut: r === 0 ? 'CONFIRMEE' : 'EN_ATTENTE',
        message: faker.lorem.sentence(),
      },
    });
    reservations.push(reservation);
  }

  // 9. Create 2 settled Paid Payments (Paiement status PAYE) for the first 2 reservations
  console.log('💳 Seeding transaction payments...');
  const paymentMethods = ['CARTE', 'WAVE', 'ORANGE_MONEY'];
  for (let p = 0; p < 2; p++) {
    const reservation = reservations[p];
    const methode = faker.helpers.arrayElement(paymentMethods);

    await prisma.paiement.create({
      data: {
        reservationId: reservation.id,
        amount: reservation.montantTotal,
        methode,
        statut: 'PAYE',
        reference: `${methode.toLowerCase()}_ref_${faker.string.alphanumeric(12)}`,
        meta: JSON.stringify({ gateway_fee: 0.02 * reservation.montantTotal }),
      },
    });

    // Update reservation payment state if confirmed
    if (reservation.statut === 'EN_ATTENTE') {
      await prisma.reservation.update({
        where: { id: reservation.id },
        data: { statut: 'CONFIRMEE' },
      });
    }
  }

  // 10. Create 10 Chat Messages between clients and hosts linked to the bookings
  console.log('✉️ Seeding chat conversation exchanges...');
  const messageContents = [
    'Bonjour ! Votre logement est-il bien équipé d\'un sèche-cheveux ?',
    'Bonjour, oui tout à fait, il est dans le placard de la salle de bain.',
    'Parfait, merci ! Y a-t-il un parking sécurisé gratuit ?',
    'Oui, une place privée vous est réservée au sous-sol de la résidence.',
    'Super, à quelle heure pourrons-nous récupérer les clés ?',
    'Je serai sur place à partir de 15h pour vous accueillir directement.',
    'Entendu, nous devrions arriver vers 15h30.',
    'Très bien, prévenez-moi quand vous prenez la route.',
    'C\'est noté, à bientôt !',
    'Bonne route et à tout à l\'heure !',
  ];

  const client = clients[0];
  const reservation = reservations[0];
  const bien = biens.find((b) => b.id === reservation.bienId)!;
  const hostId = bien.loueurId;

  for (let m = 0; m < 10; m++) {
    const isClientSender = m % 2 === 0;
    await prisma.message.create({
      data: {
        expediteurId: isClientSender ? client.id : hostId,
        destinataireId: isClientSender ? hostId : client.id,
        contenu: messageContents[m],
        lu: m < 8, // first 8 messages marked read, last 2 unread
        createdAt: new Date(Date.now() - (10 - m) * 10 * 60 * 1000), // intervals of 10 min
      },
    });
  }

  // 11. Create a review (Avis) for the property
  console.log('⭐️ Seeding property review notes...');
  await prisma.avis.create({
    data: {
      bienId: biens[0].id,
      clientId: clients[0].id,
      note: 5,
      commentaire: 'Excellent séjour ! Logement extrêmement propre et hôte très accueillant.',
    },
  });

  console.log('✅ Database seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding process crashed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
