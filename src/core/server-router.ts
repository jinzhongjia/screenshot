import type { ApiRouteDefinition, RouteHandlerContext, HttpMethod } from '../types';

interface InternalRoute {
  path: string;
  methods: HttpMethod[];
  handler: ApiRouteDefinition['handler'];
}

function normalizeMethods(methods?: HttpMethod | HttpMethod[]): HttpMethod[] {
  if (!methods) {
    return ['GET'];
  }
  return Array.isArray(methods) ? methods : [methods];
}

export class RouteRegistry {
  private routes: InternalRoute[] = [];

  constructor(initialRoutes: ApiRouteDefinition[] = []) {
    initialRoutes.forEach((route) => this.register(route));
  }

  register(route: ApiRouteDefinition): void {
    if (!route.path.startsWith('/')) {
      throw new Error(`Route path must start with '/': ${route.path}`);
    }
    this.routes.push({
      path: route.path,
      methods: normalizeMethods(route.methods),
      handler: route.handler,
    });
  }

  match(pathname: string, method: string): InternalRoute | undefined {
    return this.routes.find((route) => {
      return route.path === pathname && route.methods.includes(method.toUpperCase() as HttpMethod);
    });
  }

  async handle(request: Request, context: RouteHandlerContext): Promise<Response | undefined> {
    const url = new URL(request.url);
    const match = this.match(url.pathname, request.method);
    if (!match) {
      return undefined;
    }
    return await match.handler(request, context);
  }

  list(): InternalRoute[] {
    return [...this.routes];
  }
}

export const createRouteRegistry = (routes: ApiRouteDefinition[] = []): RouteRegistry => {
  return new RouteRegistry(routes);
};
