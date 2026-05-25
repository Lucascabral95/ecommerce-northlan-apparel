import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';

const FIVE_MINUTES_IN_SECONDS = 300;

export type MercadoPagoWebhookSignatureInput = Readonly<{
  dataId?: string;
  requestId?: string;
  secret?: string;
  signature?: string;
}>;

export function validateMercadoPagoWebhookSignature(
  input: MercadoPagoWebhookSignatureInput,
  now = Date.now(),
): void {
  if (!input.secret) {
    return;
  }

  if (!input.dataId || !input.requestId || !input.signature) {
    throw new UnauthorizedException('Mercado Pago webhook signature headers are required.');
  }

  const signatureParts = parseSignature(input.signature);
  const timestamp = Number(signatureParts.ts);
  if (!Number.isFinite(timestamp)) {
    throw new BadRequestException('Mercado Pago webhook signature timestamp is invalid.');
  }

  const ageInSeconds = Math.abs(Math.floor(now / 1000) - timestamp);
  if (ageInSeconds > FIVE_MINUTES_IN_SECONDS) {
    throw new UnauthorizedException('Mercado Pago webhook signature timestamp is outside tolerance.');
  }

  const manifest = `id:${input.dataId};request-id:${input.requestId};ts:${signatureParts.ts};`;
  const expectedSignature = createHmac('sha256', input.secret).update(manifest).digest('hex');

  if (!safeEquals(expectedSignature, signatureParts.v1)) {
    throw new UnauthorizedException('Mercado Pago webhook signature is invalid.');
  }
}

function parseSignature(signature: string): { ts?: string; v1?: string } {
  return signature.split(',').reduce<{ ts?: string; v1?: string }>((parts, part) => {
    const [key, value] = part.split('=');
    if (key === 'ts' || key === 'v1') {
      parts[key] = value;
    }

    return parts;
  }, {});
}

function safeEquals(left: string, right: string | undefined): boolean {
  if (!right) {
    return false;
  }

  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
