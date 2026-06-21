/// <reference types="@cloudflare/workers-types" />

import { DEVICE_PRESETS, getDevice } from './core/devices';
import type { DevicePreset, ScreenshotOptions } from './types';

interface Env {
  BROWSER: BrowserRun;
}

type ScreenshotRequest = ScreenshotOptions & { format?: 'json' | 'image' };
type ScreenshotFormat = NonNullable<ScreenshotRequest['type']>;

interface NormalizedScreenshotRequest extends ScreenshotRequest {
  url: string;
  type: ScreenshotFormat;
  format: 'json' | 'image';
  width: number;
  height: number;
  quality: number;
  timeout: number;
}

interface DeviceSummary {
  name: string;
  width: number;
  height: number;
}

interface DeviceGroups {
  iPhone: DeviceSummary[];
  iPad: DeviceSummary[];
  'Google Pixel': DeviceSummary[];
  'Samsung Galaxy S': DeviceSummary[];
  'Other Android': DeviceSummary[];
  Desktop: DeviceSummary[];
}

const MAX_JSON_BODY_BYTES = 64 * 1024;
const DEFAULT_WIDTH = 1920;
const DEFAULT_HEIGHT = 1080;
const DEFAULT_TIMEOUT = 30_000;
const MAX_DIMENSION = 10_000;
const UNSUPPORTED_WORKER_OPTIONS = [
  'actions',
  'timezone',
  'geolocation',
  'offline',
  'cacheKey',
  'cacheTTL',
  'browser',
  'ignoreHTTPSErrors',
  'darkMode',
  'javascript',
] as const;

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return Response.json({ status: 'healthy', runtime: 'cloudflare-worker' });
    }

    if (url.pathname === '/devices') {
      return Response.json({ success: true, devices: groupDevices() });
    }

    if (url.pathname === '/screenshot') {
      return handleScreenshot(request, env);
    }

    return new Response('Screenshot Worker: POST /screenshot, GET /health, GET /devices', {
      status: url.pathname === '/' ? 200 : 404,
    });
  },
} satisfies ExportedHandler<Env>;

async function handleScreenshot(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const options = normalizeOptions(await readJson(request));
    const screenshot = await env.BROWSER.quickAction('screenshot', toQuickActionRequest(options));

    if (!screenshot.ok) {
      return screenshot;
    }

    if (options.format === 'image') {
      return screenshot;
    }

    const bytes = new Uint8Array(await screenshot.arrayBuffer());
    return Response.json({
      success: true,
      screenshot: bytesToBase64(bytes),
      metadata: {
        width: options.clip?.width ?? options.width,
        height: options.clip?.height ?? options.height,
        size: bytes.byteLength,
        format: options.type,
      },
    });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status });
  }
}

async function readJson(request: Request): Promise<unknown> {
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (contentLength > MAX_JSON_BODY_BYTES) {
    throw new HttpError(413, 'Request body is too large');
  }

  if (!request.body) {
    throw new HttpError(400, 'JSON body is required');
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    received += value.byteLength;
    if (received > MAX_JSON_BODY_BYTES) {
      await reader.cancel();
      throw new HttpError(413, 'Request body is too large');
    }

    chunks.push(value);
  }

  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new HttpError(400, 'Invalid JSON body');
  }
}

function normalizeOptions(body: unknown): NormalizedScreenshotRequest {
  if (!body || typeof body !== 'object') {
    throw new HttpError(400, 'JSON object body is required');
  }

  const raw = body as Record<string, unknown>;
  if (typeof raw.url !== 'string' || raw.url.length === 0) {
    throw new HttpError(400, 'URL is required');
  }

  const target = new URL(raw.url);
  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    throw new HttpError(400, 'URL must use http or https');
  }

  const unsupported = UNSUPPORTED_WORKER_OPTIONS.filter((key) => raw[key] !== undefined);
  if (unsupported.length > 0) {
    throw new HttpError(400, `Unsupported Worker option(s): ${unsupported.join(', ')}`);
  }

  const type = raw.type === 'png' || raw.type === 'jpeg' || raw.type === 'webp' ? raw.type : 'png';
  const format = raw.format === 'image' ? 'image' : 'json';
  const options = raw as Partial<ScreenshotRequest>;

  return {
    ...options,
    url: target.toString(),
    type,
    format,
    width: numberOption(raw.width, DEFAULT_WIDTH, 1, MAX_DIMENSION),
    height: numberOption(raw.height, DEFAULT_HEIGHT, 1, MAX_DIMENSION),
    quality: numberOption(raw.quality, 90, 1, 100),
    timeout: numberOption(raw.timeout, DEFAULT_TIMEOUT, 1, 60_000),
  };
}

function toQuickActionRequest(options: NormalizedScreenshotRequest): BrowserRunScreenshotOptions {
  const device = getSelectedDevice(options);
  const headers = buildHeaders(options);

  return {
    url: options.url,
    viewport: device?.viewport ?? { width: options.width, height: options.height },
    ...(device?.userAgent ? { userAgent: device.userAgent } : {}),
    ...(options.selector ? { selector: options.selector } : {}),
    ...(options.auth?.cookies ? { cookies: options.auth.cookies } : {}),
    ...(options.auth?.basic ? { authenticate: options.auth.basic } : {}),
    ...(Object.keys(headers).length > 0 ? { setExtraHTTPHeaders: headers } : {}),
    gotoOptions: {
      waitUntil: options.waitUntil ?? 'networkidle2',
      timeout: options.timeout,
    },
    screenshotOptions: {
      type: options.type,
      fullPage: options.fullPage ?? false,
      ...(options.type !== 'png' ? { quality: options.quality } : {}),
      ...(options.clip ? { clip: options.clip } : {}),
    },
  };
}

function buildHeaders(options: NormalizedScreenshotRequest): Record<string, string> {
  return {
    ...(options.locale ? { 'Accept-Language': options.locale } : {}),
    ...options.auth?.headers,
    ...(options.auth?.bearer ? { Authorization: `Bearer ${options.auth.bearer}` } : {}),
  };
}

function getSelectedDevice(options: ScreenshotRequest): DevicePreset | undefined {
  if (options.customDevice) return options.customDevice;
  if (options.device) return getDevice(options.device);
  return undefined;
}

function numberOption(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }

  return btoa(binary);
}

function groupDevices(): DeviceGroups {
  const grouped: DeviceGroups = {
    iPhone: [],
    iPad: [],
    'Google Pixel': [],
    'Samsung Galaxy S': [],
    'Other Android': [],
    Desktop: [],
  };

  for (const [name, device] of Object.entries(DEVICE_PRESETS)) {
    const deviceInfo = {
      name: device.name,
      width: device.viewport.width,
      height: device.viewport.height,
    };

    if (name.includes('iPhone')) grouped.iPhone.push(deviceInfo);
    else if (name.includes('iPad')) grouped.iPad.push(deviceInfo);
    else if (name.includes('Pixel')) grouped['Google Pixel'].push(deviceInfo);
    else if (name.includes('Samsung Galaxy S')) grouped['Samsung Galaxy S'].push(deviceInfo);
    else if (
      name.includes('OnePlus') ||
      name.includes('Xiaomi') ||
      name.includes('Samsung Galaxy Tab')
    ) {
      grouped['Other Android'].push(deviceInfo);
    } else if (name.includes('Desktop') || name.includes('MacBook') || name.includes('Laptop')) {
      grouped.Desktop.push(deviceInfo);
    }
  }

  return grouped;
}
