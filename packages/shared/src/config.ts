export type ServiceConfig = {
  readonly databaseUrl?: string;
  readonly logLevel: string;
  readonly nodeEnv: string;
  readonly port: number;
  readonly serviceName: string;
};

export function loadServiceConfig(serviceName: string, defaultPort: number): ServiceConfig {
  return {
    databaseUrl: process.env.DATABASE_URL,
    logLevel: process.env.LOG_LEVEL ?? 'info',
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: parsePort(process.env.PORT, defaultPort),
    serviceName,
  };
}

function parsePort(rawPort: string | undefined, fallback: number): number {
  return parseIntegerEnv('PORT', rawPort, {
    fallback,
    max: 65_535,
    min: 1,
  });
}

export type IntegerEnvOptions = Readonly<{
  fallback?: number;
  max?: number;
  min?: number;
}>;

export function requireStringEnv(name: string, value: string | undefined): string {
  const normalizedValue = value?.trim();
  if (!normalizedValue) {
    throw new Error(`${name} is required.`);
  }

  return normalizedValue;
}

export function optionalStringEnv(value: string | undefined): string | undefined {
  const normalizedValue = value?.trim();
  return normalizedValue && normalizedValue.length > 0 ? normalizedValue : undefined;
}

export function parseIntegerEnv(name: string, value: string | undefined, options: IntegerEnvOptions = {}): number {
  if (!value) {
    if (options.fallback !== undefined) {
      return options.fallback;
    }

    throw new Error(`${name} is required.`);
  }

  const parsedValue = Number(value);
  if (!Number.isInteger(parsedValue)) {
    throw new Error(`${name} must be an integer.`);
  }

  if (options.min !== undefined && parsedValue < options.min) {
    throw new Error(`${name} must be greater than or equal to ${options.min}.`);
  }

  if (options.max !== undefined && parsedValue > options.max) {
    throw new Error(`${name} must be lower than or equal to ${options.max}.`);
  }

  return parsedValue;
}

export function parseBooleanEnv(name: string, value: string | undefined, fallback?: boolean): boolean {
  if (!value) {
    if (fallback !== undefined) {
      return fallback;
    }

    throw new Error(`${name} is required.`);
  }

  const normalizedValue = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'y'].includes(normalizedValue)) {
    return true;
  }

  if (['0', 'false', 'no', 'n'].includes(normalizedValue)) {
    return false;
  }

  throw new Error(`${name} must be a boolean value.`);
}

export function parseEnumEnv<TValue extends string>(
  name: string,
  value: string | undefined,
  allowedValues: readonly TValue[],
  fallback?: TValue,
): TValue {
  if (!value) {
    if (fallback !== undefined) {
      return fallback;
    }

    throw new Error(`${name} is required.`);
  }

  if (allowedValues.includes(value as TValue)) {
    return value as TValue;
  }

  throw new Error(`${name} must be one of: ${allowedValues.join(', ')}.`);
}
