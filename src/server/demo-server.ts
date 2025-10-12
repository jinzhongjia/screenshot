import { ApiServer } from './api';
import type { ApiServerOptions } from '../types';

export class DemoApiServer extends ApiServer {
  constructor(options: ApiServerOptions = {}) {
    super({
      ...options,
      routes: [
        ...(options.routes ?? []),
        {
          path: '/',
          methods: 'GET',
          handler: async () => {
            const demoFile = Bun.file('public/demo.html');
            if (await demoFile.exists()) {
              return new Response(demoFile, {
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
              });
            }
            return new Response('Demo page not found', { status: 404 });
          },
        },
      ],
    });
  }
}
