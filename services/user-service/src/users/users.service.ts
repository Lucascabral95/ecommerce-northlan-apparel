import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AddressDto,
  CreateAddressCommandPayload,
  UpdateProfileCommandPayload,
  UserProfileDto,
  UserRegisteredEventPayload,
} from '@northlane/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { mapAddress, mapProfile } from './user.mapper';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createInitialProfile(payload: UserRegisteredEventPayload): Promise<UserProfileDto> {
    const profile = await this.prisma.profile.upsert({
      create: {
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        userId: payload.userId,
      },
      update: {
        email: payload.email,
      },
      where: {
        userId: payload.userId,
      },
    });

    return mapProfile(profile);
  }

  async getProfile(userId: string): Promise<UserProfileDto> {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('User profile was not found.');
    }

    return mapProfile(profile);
  }

  async updateProfile(input: UpdateProfileCommandPayload): Promise<UserProfileDto> {
    await this.ensureProfileExists(input.userId);

    const profile = await this.prisma.profile.update({
      data: {
        birthDate: input.birthDate ? new Date(input.birthDate) : undefined,
        documentNumber: input.documentNumber,
        documentType: input.documentType,
        firstName: input.firstName,
        gender: input.gender,
        lastName: input.lastName,
        phone: input.phone,
        preferredCategories: input.preferredCategories ? [...input.preferredCategories] : undefined,
        preferredSizes: input.preferredSizes ? [...input.preferredSizes] : undefined,
      },
      where: { userId: input.userId },
    });

    return mapProfile(profile);
  }

  async listAddresses(userId: string): Promise<readonly AddressDto[]> {
    await this.ensureProfileExists(userId);

    const addresses = await this.prisma.address.findMany({
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      where: { userId },
    });

    return addresses.map(mapAddress);
  }

  async createAddress(input: CreateAddressCommandPayload): Promise<AddressDto> {
    await this.ensureProfileExists(input.userId);

    const address = await this.prisma.$transaction(async (transaction) => {
      if (input.isDefault) {
        await transaction.address.updateMany({
          data: { isDefault: false },
          where: { userId: input.userId },
        });
      }

      return transaction.address.create({
        data: {
          alias: input.alias,
          apartment: input.apartment,
          city: input.city,
          country: input.country,
          isDefault: input.isDefault ?? false,
          phone: input.phone,
          postalCode: input.postalCode,
          province: input.province,
          recipientName: input.recipientName,
          references: input.references,
          street: input.street,
          streetNumber: input.streetNumber,
          userId: input.userId,
        },
      });
    });

    return mapAddress(address);
  }

  private async ensureProfileExists(userId: string): Promise<void> {
    const profile = await this.prisma.profile.findUnique({
      select: { userId: true },
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('User profile was not found.');
    }
  }
}
