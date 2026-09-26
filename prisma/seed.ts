import "./load-env";

import { UserRole } from "@/generated/prisma/enums";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const SATU_HARI_MS = 24 * 60 * 60 * 1000;

const OUTLET_CONTOH = [
  {
    name: "Donjun Donat Panakkukang",
    address: "Jl. Boulevard Panakkukang, Makassar, Sulawesi Selatan",
    phone: "0411-000001",
  },
  {
    name: "Donjun Donat Gowa",
    address: "Jl. Sultan Hasanuddin, Sungguminasa, Gowa, Sulawesi Selatan",
    phone: "0411-000002",
  },
];

const REWARD_CONTOH = [
  {
    title: "Gratis 1 Donat Glaze",
    description: "Tukar 5 poin untuk satu donat glaze pilihan.",
    pointsCost: 5,
    quota: 100,
    perUserLimit: 3,
    startAt: null,
    endAt: null,
    terms:
      "Berlaku di seluruh outlet Donjun Donat. Satu voucher untuk satu donat glaze.",
  },
  {
    title: "Gratis 1 Kotak Donat Mini (6 pcs)",
    description: "Tukar 20 poin untuk satu kotak donat mini isi 6 buah.",
    pointsCost: 20,
    quota: 50,
    perUserLimit: 1,
    startAt: new Date(),
    endAt: new Date(Date.now() + 30 * SATU_HARI_MS),
    terms:
      "Khusus konsumsi di tempat. Tidak dapat digabung dengan promo lain.",
  },
  {
    title: "Diskon Rp10.000 (min. belanja Rp50.000)",
    description: "Tukar 10 poin untuk potongan langsung Rp10.000.",
    pointsCost: 10,
    quota: null,
    perUserLimit: 2,
    startAt: null,
    endAt: null,
    terms:
      "Minimal belanja Rp50.000 sebelum diskon. Satu voucher per transaksi.",
  },
];

async function seedSuperAdmin() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "SUPER_ADMIN_EMAIL dan SUPER_ADMIN_PASSWORD wajib diisi di .env.local.",
    );
  }

  const sudahAda = await prisma.user.findUnique({ where: { email } });

  if (sudahAda) {
    console.log(`Super Admin sudah ada: ${email} (kata sandi tidak diubah).`);
  } else {
    await auth.api.signUpEmail({
      body: {
        email,
        password,
        name: "Super Admin Donjun Donat",
      },
    });
    console.log(`Super Admin dibuat: ${email}`);
  }

  const admin = await prisma.user.update({
    where: { email },
    data: {
      role: UserRole.SUPER_ADMIN,
      emailVerified: true,
      isActive: true,
    },
  });

  // signUpEmail sekaligus membuat sesi login; seeder tidak boleh meninggalkan sesi aktif.
  const sesiDihapus = await prisma.session.deleteMany({
    where: { userId: admin.id },
  });

  if (sesiDihapus.count > 0) {
    console.log(`Sesi seed dibersihkan: ${sesiDihapus.count}`);
  }
}

async function seedOutlet() {
  for (const outlet of OUTLET_CONTOH) {
    const sudahAda = await prisma.outlet.findFirst({
      where: { name: outlet.name },
    });

    if (sudahAda) {
      await prisma.outlet.update({ where: { id: sudahAda.id }, data: outlet });
      console.log(`Outlet diperbarui: ${outlet.name}`);
    } else {
      await prisma.outlet.create({ data: outlet });
      console.log(`Outlet dibuat: ${outlet.name}`);
    }
  }
}

async function seedRewardCatalog() {
  for (const reward of REWARD_CONTOH) {
    const sudahAda = await prisma.rewardCatalog.findFirst({
      where: { title: reward.title },
    });

    if (sudahAda) {
      await prisma.rewardCatalog.update({
        where: { id: sudahAda.id },
        data: reward,
      });
      console.log(`Reward diperbarui: ${reward.title}`);
    } else {
      await prisma.rewardCatalog.create({ data: reward });
      console.log(`Reward dibuat: ${reward.title}`);
    }
  }
}

try {
  await seedSuperAdmin();
  await seedOutlet();
  await seedRewardCatalog();
  console.log("Seed dasar selesai.");
} catch (error) {
  console.error("Seed gagal:", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
