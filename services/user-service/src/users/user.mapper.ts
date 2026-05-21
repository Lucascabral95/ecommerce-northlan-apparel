import { AddressDto, UserProfileDto } from '@northlane/contracts';
import { Address, Profile } from '../generated/prisma';

export function mapProfile(profile: Profile): UserProfileDto {
  return {
    birthDate: profile.birthDate?.toISOString().slice(0, 10),
    createdAt: profile.createdAt.toISOString(),
    documentNumber: profile.documentNumber ?? undefined,
    documentType: profile.documentType ?? undefined,
    email: profile.email,
    firstName: profile.firstName ?? undefined,
    gender: profile.gender ?? undefined,
    id: profile.id,
    lastName: profile.lastName ?? undefined,
    phone: profile.phone ?? undefined,
    preferredCategories: profile.preferredCategories,
    preferredSizes: profile.preferredSizes,
    updatedAt: profile.updatedAt.toISOString(),
    userId: profile.userId,
  };
}

export function mapAddress(address: Address): AddressDto {
  return {
    alias: address.alias,
    apartment: address.apartment ?? undefined,
    city: address.city,
    country: address.country,
    createdAt: address.createdAt.toISOString(),
    id: address.id,
    isDefault: address.isDefault,
    phone: address.phone,
    postalCode: address.postalCode,
    province: address.province,
    recipientName: address.recipientName,
    references: address.references ?? undefined,
    street: address.street,
    streetNumber: address.streetNumber,
    updatedAt: address.updatedAt.toISOString(),
    userId: address.userId,
  };
}
