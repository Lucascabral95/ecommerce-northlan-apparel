import { describe, expect, it } from 'vitest';
import { UsersService } from './users.service';

describe('UsersService', () => {
  it('updates an existing user profile owned by user-service', async () => {
    const prisma = new FakeUserPrisma();
    const service = new UsersService(prisma as never);

    const updatedProfile = await service.updateProfile({
      birthDate: '1994-05-04',
      firstName: 'Ada',
      lastName: 'Lovelace',
      phone: '+54 11 5555 0101',
      preferredCategories: ['Hoodies', 'Denim'],
      preferredSizes: ['M', 'L'],
      userId: 'user-1',
    });

    expect(updatedProfile).toMatchObject({
      birthDate: '1994-05-04',
      email: 'buyer@northlane.test',
      firstName: 'Ada',
      lastName: 'Lovelace',
      phone: '+54 11 5555 0101',
      preferredCategories: ['Hoodies', 'Denim'],
      preferredSizes: ['M', 'L'],
      userId: 'user-1',
    });
  });
});

class FakeUserPrisma {
  private readonly profileRecord: FakeProfileRecord = {
    birthDate: null as Date | null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    documentNumber: null as string | null,
    documentType: null as string | null,
    email: 'buyer@northlane.test',
    firstName: null as string | null,
    gender: null as string | null,
    id: 'profile-1',
    lastName: null as string | null,
    phone: null as string | null,
    preferredCategories: [] as string[],
    preferredSizes: [] as string[],
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    userId: 'user-1',
  };

  readonly profile = {
    findUnique: async ({ where }: { select?: unknown; where: { userId: string } }) =>
      where.userId === this.profileRecord.userId ? structuredClone(this.profileRecord) : null,
    update: async ({
      data,
      where,
    }: {
      data: Partial<FakeProfileRecord>;
      where: { userId: string };
    }) => {
      if (where.userId !== this.profileRecord.userId) {
        throw new Error('Profile not found.');
      }

      Object.assign(this.profileRecord, data, { updatedAt: new Date('2026-01-02T00:00:00.000Z') });
      return structuredClone(this.profileRecord);
    },
  };
}

type FakeProfileRecord = {
  birthDate: Date | null;
  createdAt: Date;
  documentNumber: string | null;
  documentType: string | null;
  email: string;
  firstName: string | null;
  gender: string | null;
  id: string;
  lastName: string | null;
  phone: string | null;
  preferredCategories: string[];
  preferredSizes: string[];
  updatedAt: Date;
  userId: string;
};
