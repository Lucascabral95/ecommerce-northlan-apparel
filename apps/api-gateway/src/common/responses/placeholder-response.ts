export type PlaceholderResponse = Readonly<{
  message: string;
  module: string;
  service: 'api-gateway';
  status: 'placeholder';
}>;

export function createPlaceholderResponse(moduleName: string): PlaceholderResponse {
  return {
    message: 'HTTP boundary is reserved for a later implementation phase.',
    module: moduleName,
    service: 'api-gateway',
    status: 'placeholder',
  };
}
