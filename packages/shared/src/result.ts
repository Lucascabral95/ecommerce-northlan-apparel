export type Result<TValue, TError = Error> = OkResult<TValue> | ErrResult<TError>;

export type OkResult<TValue> = Readonly<{
  ok: true;
  value: TValue;
}>;

export type ErrResult<TError> = Readonly<{
  error: TError;
  ok: false;
}>;

export function ok<TValue>(value: TValue): OkResult<TValue> {
  return {
    ok: true,
    value,
  };
}

export function err<TError>(error: TError): ErrResult<TError> {
  return {
    error,
    ok: false,
  };
}

export function isOk<TValue, TError>(result: Result<TValue, TError>): result is OkResult<TValue> {
  return result.ok;
}

export function isErr<TValue, TError>(result: Result<TValue, TError>): result is ErrResult<TError> {
  return !result.ok;
}
