import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import {
  FALLBACK_NEWS_CNN,
  FALLBACK_NEWS_G1,
  SEED_ADVERTISERS,
  SEED_CAMPAIGNS,
  SEED_CLIENT_ACCESSES,
  SEED_DEVICE_COMMANDS,
  SEED_DEVICES,
  SEED_DYNAMIC_CONTENTS,
  SEED_EXTERNAL_API_SETTINGS,
  SEED_MIDIAS,
  SEED_PLAYBACK_EVENTS,
  SEED_PLAYLISTS,
  SEED_SCREENS,
} from './server-seed.ts';
import type { StoredAndroidDevice } from './server-seed.ts';

import type {
  Advertiser,
  AndroidDevice,
  ApkDisplayPolicy,
  CampaignItem,
  ClientAccess,
  CrmStage,
  DeviceCommand,
  DeviceCommandType,
  DeviceHardwareInfo,
  DevicePlaybackSummary,
  DeviceSettings,
  DynamicCategory,
  DynamicContentItem,
  ExternalApiSettings,
  ExternalRssFeed,
  MediaAsset,
  MediaFitMode,
  MediaQrCodeConfig,
  NetworkAlert,
  NewsArticle,
  PlaybackEventRecord,
  PlaybackMode,
  Playlist,
  PlaylistItem,
  QrCodePosition,
  QrCodeSizePercent,
  ScreenDevice,
  ScreenOrientation,
  ScreenPlaylistSchedule,
  ScreenStatus,
  SportsMatch,
  StandingRow,
} from './src/types.ts';

interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: string;
  passwordHash: string;
  createdAt: string;
}

interface DatabaseStore {
  users: StoredUser[];
  advertisers: Advertiser[];
  midias: MediaAsset[];
  dynamicContents: DynamicContentItem[];
  playlists: Playlist[];
  screens: ScreenDevice[];
  devices: StoredAndroidDevice[];
  deviceCommands: DeviceCommand[];
  playbackEvents: PlaybackEventRecord[];
  campaigns: CampaignItem[];
  clientAccesses: ClientAccess[];
  externalApiSettings: ExternalApiSettings;
  networkAlerts: NetworkAlert[];
}

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  device?: StoredAndroidDevice;
}

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');
const MIDIAS_DIR = path.join(DATA_DIR, 'midias');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(MIDIAS_DIR, { recursive: true });

const SESSION_SECRET =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim().length >= 16
    ? process.env.SESSION_SECRET
    : crypto.randomBytes(32).toString('hex');

const SUPABASE_URL = process.env.SUPABASE_URL?.trim().replace(/\/+$/, '') || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';
const HAS_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_SERVICE_KEY);

function normalizePlaylists(list: Playlist[]): Playlist[] {
  return list.map((p) => ({
    ...p,
    status: p.status || 'PUBLISHED',
    playbackMode: p.playbackMode || 'SEQUENTIAL',
    version: typeof p.version === 'number' && p.version >= 1 ? p.version : 1,
    publishedAt: p.publishedAt !== undefined ? p.publishedAt : p.updatedAt,
    items: (p.items || []).map((item, idx) => ({
      ...item,
      position: typeof item.position === 'number' ? item.position : idx,
      enabled: item.enabled !== false,
    })),
  }));
}

function normalizeScreens(list: ScreenDevice[]): ScreenDevice[] {
  return list.map((s) => ({
    ...s,
    orientation: s.orientation || 'LANDSCAPE',
    status: s.status || 'ACTIVE',
    deviceId: s.deviceId ?? null,
    schedules: Array.isArray(s.schedules) ? s.schedules : [],
  }));
}

function readStore(): DatabaseStore {
  if (!fs.existsSync(DB_PATH)) {
    const initial: DatabaseStore = {
      users: [],
      advertisers: structuredClone(SEED_ADVERTISERS),
      midias: structuredClone(SEED_MIDIAS),
      dynamicContents: structuredClone(SEED_DYNAMIC_CONTENTS),
      playlists: structuredClone(SEED_PLAYLISTS),
      screens: structuredClone(SEED_SCREENS),
      devices: structuredClone(SEED_DEVICES),
      deviceCommands: structuredClone(SEED_DEVICE_COMMANDS),
      playbackEvents: structuredClone(SEED_PLAYBACK_EVENTS),
      campaigns: structuredClone(SEED_CAMPAIGNS),
      clientAccesses: structuredClone(SEED_CLIENT_ACCESSES),
      externalApiSettings: structuredClone(SEED_EXTERNAL_API_SETTINGS),
      networkAlerts: [],
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<DatabaseStore>;
    return {
      users: parsed.users ?? [],
      advertisers: parsed.advertisers ?? structuredClone(SEED_ADVERTISERS),
      midias: (parsed.midias ?? structuredClone(SEED_MIDIAS)).map((m) => {
        const dims = String(m.resolution || '1920x1080').split('x');
        const w = m.widthPx || Number(dims[0]) || 1920;
        const h = m.heightPx || Number(dims[1]) || 1080;
        return {
          ...m,
          widthPx: w,
          heightPx: h,
          aspectRatio: m.aspectRatio || computeAspectRatioLabel(w, h),
          fitMode: m.fitMode || 'FIT_NO_CROP',
        };
      }),
      dynamicContents: parsed.dynamicContents ?? structuredClone(SEED_DYNAMIC_CONTENTS),
      playlists: normalizePlaylists(parsed.playlists ?? structuredClone(SEED_PLAYLISTS)),
      screens: normalizeScreens(parsed.screens ?? structuredClone(SEED_SCREENS)),
      devices: (parsed.devices ?? structuredClone(SEED_DEVICES)).map((d) => ({
        ...d,
        cacheBytes: d.cacheBytes ?? null,
        lastCacheClearedAt: d.lastCacheClearedAt ?? null,
        hardware: d.hardware ?? null,
        settings: {
          ...d.settings,
          watchdogEnabled: d.settings?.watchdogEnabled ?? true,
          autoLaunchDelaySeconds: d.settings?.autoLaunchDelaySeconds ?? 3,
          mediaFitMode: d.settings?.mediaFitMode ?? 'FIT_NO_CROP',
          preventCrop: d.settings?.preventCrop ?? true,
          preventStretch: d.settings?.preventStretch ?? true,
          preventBlurBackdrop: d.settings?.preventBlurBackdrop ?? true,
          preventUpscaleBlur: d.settings?.preventUpscaleBlur ?? true,
          solidBackgroundColor: d.settings?.solidBackgroundColor || '#000000',
          fastSyncEnabled: d.settings?.fastSyncEnabled ?? true,
        },
      })),
      deviceCommands: parsed.deviceCommands ?? structuredClone(SEED_DEVICE_COMMANDS),
      playbackEvents: parsed.playbackEvents ?? structuredClone(SEED_PLAYBACK_EVENTS),
      campaigns: parsed.campaigns ?? structuredClone(SEED_CAMPAIGNS),
      clientAccesses: parsed.clientAccesses ?? structuredClone(SEED_CLIENT_ACCESSES),
      externalApiSettings: normalizeExternalApiSettings(
        parsed.externalApiSettings ?? SEED_EXTERNAL_API_SETTINGS
      ),
      networkAlerts: Array.isArray(parsed.networkAlerts) ? parsed.networkAlerts : [],
    };
  } catch {
    return {
      users: [],
      advertisers: structuredClone(SEED_ADVERTISERS),
      midias: structuredClone(SEED_MIDIAS),
      dynamicContents: structuredClone(SEED_DYNAMIC_CONTENTS),
      playlists: structuredClone(SEED_PLAYLISTS),
      screens: structuredClone(SEED_SCREENS),
      devices: structuredClone(SEED_DEVICES),
      deviceCommands: structuredClone(SEED_DEVICE_COMMANDS),
      playbackEvents: structuredClone(SEED_PLAYBACK_EVENTS),
      campaigns: structuredClone(SEED_CAMPAIGNS),
      clientAccesses: structuredClone(SEED_CLIENT_ACCESSES),
      externalApiSettings: structuredClone(SEED_EXTERNAL_API_SETTINGS),
      networkAlerts: [],
    };
  }
}

function writeStore(store: DatabaseStore): void {
  fs.writeFileSync(DB_PATH, JSON.stringify(store, null, 2), 'utf8');
}

function hashPairingCode(deviceId: string, code: string): string {
  return crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(`${deviceId.toUpperCase()}:${code}`)
    .digest('hex');
}

function hashDeviceToken(token: string): string {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

function timingSafeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length === 0 || bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function toPublicDevice(
  dev: StoredAndroidDevice,
  commands: DeviceCommand[] = []
): AndroidDevice {
  const hasActivePairingCode = Boolean(
    dev.pairingCodeHash &&
      dev.pairingCodeExpiresAt &&
      new Date(dev.pairingCodeExpiresAt).getTime() > Date.now()
  );
  const recentCommands = commands
    .filter((c) => c.deviceId === dev.deviceId)
    .slice(0, 10);

  return {
    id: dev.id,
    deviceId: dev.deviceId,
    name: dev.name,
    screenId: dev.screenId,
    pairingStatus: dev.pairingStatus,
    pairingCodeExpiresAt: dev.pairingCodeExpiresAt,
    hasActivePairingCode,
    status: dev.status,
    lastSeenAt: dev.lastSeenAt,
    lastIpAddress: dev.lastIpAddress,
    appVersion: dev.appVersion,
    osVersion: dev.osVersion,
    deviceModel: dev.deviceModel,
    currentPlaylistVersion: dev.currentPlaylistVersion,
    storageFreeBytes: dev.storageFreeBytes,
    cacheBytes: dev.cacheBytes ?? null,
    lastCacheClearedAt: dev.lastCacheClearedAt ?? null,
    hardware: dev.hardware ?? null,
    recentCommands,
    lastError: dev.lastError,
    settings: dev.settings,
    createdAt: dev.createdAt,
  };
}

function computeAspectRatioLabel(w: number, h: number): string {
  if (!w || !h) return '16:9';
  const ratio = w / h;
  if (Math.abs(ratio - 16 / 9) < 0.06) return '16:9';
  if (Math.abs(ratio - 9 / 16) < 0.06) return '9:16';
  if (Math.abs(ratio - 4 / 3) < 0.06) return '4:3';
  if (Math.abs(ratio - 1) < 0.05) return '1:1';
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const d = gcd(Math.round(w), Math.round(h)) || 1;
  return `${Math.round(w / d)}:${Math.round(h / d)}`;
}

function defaultDeviceSettings(orientation: ScreenOrientation = 'LANDSCAPE'): DeviceSettings {
  return {
    syncIntervalSeconds: 30,
    heartbeatIntervalSeconds: 30,
    startOnBoot: true,
    kioskMode: true,
    watchdogEnabled: true,
    autoLaunchDelaySeconds: 3,
    volume: 80,
    muted: false,
    screenOrientation: orientation,
    offlineModeEnabled: true,
    timezone: 'America/Sao_Paulo',
    mediaFitMode: 'FIT_NO_CROP',
    preventCrop: true,
    preventStretch: true,
    preventBlurBackdrop: true,
    preventUpscaleBlur: true,
    solidBackgroundColor: '#000000',
    fastSyncEnabled: true,
  };
}

function buildApkDisplayPolicy(
  screen: ScreenDevice | null,
  settings: DeviceSettings
): ApkDisplayPolicy {
  const orientation: ScreenOrientation =
    screen?.orientation || settings.screenOrientation || 'LANDSCAPE';
  const fitMode: MediaFitMode = settings.mediaFitMode || 'FIT_NO_CROP';
  const preventUpscaleBlur = settings.preventUpscaleBlur !== false;
  return {
    orientation,
    targetResolution: orientation === 'PORTRAIT' ? '1080x1920' : '1920x1080',
    fitMode,
    exoResizeMode: 'RESIZE_MODE_FIT',
    imageScaleType:
      fitMode === 'NATIVE_NO_UPSCALE' && preventUpscaleBlur
        ? 'CENTER_INSIDE'
        : 'FIT_CENTER',
    preventCrop: settings.preventCrop !== false,
    preventStretch: settings.preventStretch !== false,
    preventBlurBackdrop: settings.preventBlurBackdrop !== false,
    preventUpscaleBlur,
    backgroundColor: /^#[0-9a-fA-F]{6}$/.test(settings.solidBackgroundColor || '')
      ? String(settings.solidBackgroundColor)
      : '#000000',
  };
}

const deviceStreams = new Map<string, Set<Response>>();
const adminAlertStreams = new Set<Response>();
const SCREEN_OFFLINE_THRESHOLD_MS = 10 * 60 * 1000;

function broadcastAdminAlert(event: string, data: unknown): void {
  if (adminAlertStreams.size === 0) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of adminAlertStreams) {
    try {
      client.write(payload);
    } catch {
      adminAlertStreams.delete(client);
    }
  }
}

function evaluateScreenHealthAndSyncAlerts(
  store: DatabaseStore,
  nowMs = Date.now()
): {
  changed: boolean;
  newlyCreated: NetworkAlert[];
  resolvedAlerts: NetworkAlert[];
} {
  const nowIso = new Date(nowMs).toISOString();
  const newlyCreated: NetworkAlert[] = [];
  const resolvedAlerts: NetworkAlert[] = [];
  let changed = false;

  for (const screen of store.screens) {
    if (screen.status === 'INACTIVE') continue;
    const lastSeenMs = screen.lastSeenAt
      ? new Date(screen.lastSeenAt).getTime()
      : null;
    const isOffline =
      !lastSeenMs || nowMs - lastSeenMs > SCREEN_OFFLINE_THRESHOLD_MS;
    const offlineMinutes = lastSeenMs
      ? Math.max(10, Math.floor((nowMs - lastSeenMs) / 60000))
      : 0;

    const openAlert = store.networkAlerts.find(
      (a) =>
        a.screenId === screen.id &&
        a.type === 'SCREEN_OFFLINE' &&
        !a.resolvedAt
    );

    if (isOffline) {
      if (!openAlert) {
        const alert: NetworkAlert = {
          id: `alt-${crypto.randomUUID().slice(0, 8)}`,
          screenId: screen.id,
          screenName: screen.name,
          screenCode: screen.uniqueCode,
          location: screen.location,
          city: screen.city,
          deviceId: screen.deviceId,
          type: 'SCREEN_OFFLINE',
          severity: lastSeenMs ? 'critical' : 'warning',
          message: lastSeenMs
            ? `Tela sem comunicação há ${offlineMinutes} min. Verifique energia, Wi-Fi ou TV Box.`
            : 'Tela aguardando conexão inicial do APK Android para começar a exibição.',
          offlineMinutes,
          lastSeenAt: screen.lastSeenAt,
          read: false,
          acknowledged: false,
          createdAt: nowIso,
          resolvedAt: null,
        };
        store.networkAlerts.unshift(alert);
        newlyCreated.push(alert);
        changed = true;
      } else if (openAlert.offlineMinutes !== offlineMinutes) {
        openAlert.offlineMinutes = offlineMinutes;
        if (lastSeenMs) {
          openAlert.severity = 'critical';
          openAlert.message = `Tela sem comunicação há ${offlineMinutes} min. Verifique energia, Wi-Fi ou TV Box.`;
        }
        changed = true;
      }
    } else if (openAlert) {
      openAlert.resolvedAt = nowIso;
      openAlert.read = true;
      const recovery: NetworkAlert = {
        id: `alt-${crypto.randomUUID().slice(0, 8)}`,
        screenId: screen.id,
        screenName: screen.name,
        screenCode: screen.uniqueCode,
        location: screen.location,
        city: screen.city,
        deviceId: screen.deviceId,
        type: 'SCREEN_RECOVERED',
        severity: 'resolved',
        message: 'Tela reconectada e operando normalmente na rede.',
        offlineMinutes: 0,
        lastSeenAt: screen.lastSeenAt,
        read: false,
        acknowledged: false,
        createdAt: nowIso,
        resolvedAt: nowIso,
      };
      store.networkAlerts.unshift(recovery);
      resolvedAlerts.push(recovery);
      changed = true;
    }
  }

  if (store.networkAlerts.length > 150) {
    store.networkAlerts = store.networkAlerts.slice(0, 150);
  }

  for (const alert of newlyCreated) {
    broadcastAdminAlert('alert:created', alert);
  }
  for (const alert of resolvedAlerts) {
    broadcastAdminAlert('alert:resolved', alert);
  }

  return { changed, newlyCreated, resolvedAlerts };
}

function notifyDevice(
  deviceId: string,
  event: string,
  data: Record<string, unknown>
): void {
  const clients = deviceStreams.get(deviceId.toUpperCase());
  if (!clients || clients.size === 0) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    try {
      client.write(payload);
    } catch {
      clients.delete(client);
    }
  }
}

function notifyDevicesByPlaylistId(
  store: DatabaseStore,
  playlistId: string,
  version: number
): void {
  for (const screen of store.screens) {
    const usesPlaylist =
      screen.playlistId === playlistId ||
      screen.schedules.some((sch) => sch.playlistId === playlistId && sch.isActive);
    if (usesPlaylist && screen.deviceId) {
      notifyDevice(screen.deviceId, 'sync-now', {
        reason: 'playlist_published',
        playlistId,
        version,
        timestamp: new Date().toISOString(),
      });
    }
  }
}

function sanitizeHardwarePayload(raw: unknown): DeviceHardwareInfo | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const info: DeviceHardwareInfo = {};
  if (typeof obj.manufacturer === 'string') info.manufacturer = obj.manufacturer.slice(0, 64);
  if (typeof obj.brand === 'string') info.brand = obj.brand.slice(0, 64);
  if (typeof obj.model === 'string') info.model = obj.model.slice(0, 64);
  if (typeof obj.board === 'string') info.board = obj.board.slice(0, 64);
  if (typeof obj.cpuAbi === 'string') info.cpuAbi = obj.cpuAbi.slice(0, 32);
  if (typeof obj.cpuCores === 'number' && Number.isFinite(obj.cpuCores)) {
    info.cpuCores = Math.max(1, Math.min(64, Math.round(obj.cpuCores)));
  }
  if (typeof obj.ramTotalMb === 'number' && Number.isFinite(obj.ramTotalMb)) {
    info.ramTotalMb = Math.max(128, Math.round(obj.ramTotalMb));
  }
  if (typeof obj.storageTotalBytes === 'number' && Number.isFinite(obj.storageTotalBytes)) {
    info.storageTotalBytes = Math.max(0, Math.round(obj.storageTotalBytes));
  }
  if (typeof obj.screenWidthPx === 'number' && Number.isFinite(obj.screenWidthPx)) {
    info.screenWidthPx = Math.max(240, Math.round(obj.screenWidthPx));
  }
  if (typeof obj.screenHeightPx === 'number' && Number.isFinite(obj.screenHeightPx)) {
    info.screenHeightPx = Math.max(240, Math.round(obj.screenHeightPx));
  }
  if (typeof obj.androidSdk === 'number' && Number.isFinite(obj.androidSdk)) {
    info.androidSdk = Math.max(19, Math.min(45, Math.round(obj.androidSdk)));
  }
  if (typeof obj.macAddress === 'string') info.macAddress = obj.macAddress.slice(0, 32);
  if (typeof obj.serialFingerprint === 'string') {
    info.serialFingerprint = obj.serialFingerprint.slice(0, 64);
  }
  if (typeof obj.isDeviceOwner === 'boolean') info.isDeviceOwner = obj.isDeviceOwner;
  return Object.keys(info).length > 0 ? info : null;
}

function getSaoPauloHHMM(): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
  return parts;
}

function isTimeInWindow(currentHHMM: string, startsAt: string, endsAt: string): boolean {
  if (startsAt <= endsAt) {
    return currentHHMM >= startsAt && currentHHMM <= endsAt;
  }
  return currentHHMM >= startsAt || currentHHMM <= endsAt;
}

function resolveScreenPlaylist(
  screen: ScreenDevice,
  playlists: Playlist[]
): Playlist | null {
  const publishedMap = new Map(
    playlists.filter((p) => p.status === 'PUBLISHED').map((p) => [p.id, p])
  );
  const nowHHMM = getSaoPauloHHMM();
  const matchingSchedules = (screen.schedules || [])
    .filter(
      (sch) =>
        sch.isActive &&
        publishedMap.has(sch.playlistId) &&
        isTimeInWindow(nowHHMM, sch.startsAt, sch.endsAt)
    )
    .sort((a, b) => b.priority - a.priority);

  if (matchingSchedules.length > 0) {
    return publishedMap.get(matchingSchedules[0].playlistId) || null;
  }
  if (screen.playlistId && publishedMap.has(screen.playlistId)) {
    return publishedMap.get(screen.playlistId) || null;
  }
  return null;
}

const ipPairingLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkIpPairingRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipPairingLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    ipPairingLimitMap.set(ip, { count: 1, resetAt: now + 10 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 20) return false;
  entry.count += 1;
  return true;
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(':');
  if (parts.length !== 2) return false;
  const [salt, hashHex] = parts;
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hashHex, 'hex');
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

function signSessionToken(payload: {
  id: string;
  name: string;
  email: string;
  role: string;
  exp: number;
}): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

function verifySessionToken(
  token: string
): { id: string; name: string; email: string; role: string } | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const decoded = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8')
    ) as {
      id: string;
      name: string;
      email: string;
      role: string;
      exp: number;
    };
    if (!decoded.exp || Date.now() > decoded.exp) return null;
    return {
      id: decoded.id,
      name: decoded.name,
      email: decoded.email,
      role: decoded.role,
    };
  } catch {
    return null;
  }
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) result[key] = decodeURIComponent(val);
  }
  return result;
}

function setSessionCookie(req: Request, res: Response, token: string): void {
  const isHttps =
    req.secure || req.headers['x-forwarded-proto'] === 'https';
  const attrs = [
    `vtv_session=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    `Max-Age=${60 * 60 * 24 * 7}`,
  ];
  if (isHttps) {
    attrs.push('Secure', 'SameSite=None', 'Partitioned');
  } else {
    attrs.push('SameSite=Lax');
  }
  res.setHeader('Set-Cookie', attrs.join('; '));
}

function clearSessionCookie(req: Request, res: Response): void {
  const isHttps =
    req.secure || req.headers['x-forwarded-proto'] === 'https';
  const attrs = ['vtv_session=', 'Path=/', 'HttpOnly', 'Max-Age=0'];
  if (isHttps) {
    attrs.push('Secure', 'SameSite=None', 'Partitioned');
  } else {
    attrs.push('SameSite=Lax');
  }
  res.setHeader('Set-Cookie', attrs.join('; '));
}

function extractSessionUser(req: Request) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    const user = verifySessionToken(bearer);
    if (user) return user;
  }
  const cookies = parseCookies(req.headers.cookie);
  if (cookies.vtv_session) {
    return verifySessionToken(cookies.vtv_session);
  }
  return null;
}

function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) &&
    req.headers['x-requested-with'] !== 'XMLHttpRequest' &&
    !req.headers.authorization?.startsWith('Bearer ')
  ) {
    res.status(403).json({ error: 'Cabeçalho de segurança ausente.' });
    return;
  }
  const user = extractSessionUser(req);
  if (!user) {
    res.status(401).json({ error: 'Sessão expirada ou não autenticada.' });
    return;
  }
  req.user = user;
  next();
}

function requireDeviceAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const deviceId = String(req.params.deviceId || '').trim().toUpperCase();
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token do dispositivo ausente.' });
    return;
  }
  const rawToken = authHeader.slice(7).trim();
  const store = readStore();
  const found = store.devices.find((d) => d.deviceId === deviceId);
  if (!found || found.pairingStatus === 'BLOCKED' || found.status === 'BLOCKED') {
    res.status(403).json({ error: 'Dispositivo não autorizado ou bloqueado.' });
    return;
  }
  if (!found.accessTokenHash || !timingSafeEqualHex(hashDeviceToken(rawToken), found.accessTokenHash)) {
    res.status(401).json({ error: 'Token do dispositivo inválido.' });
    return;
  }
  req.device = found;
  next();
}

async function supabaseFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<globalThis.Response> {
  return fetch(`${SUPABASE_URL}${endpoint}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      ...(options.headers || {}),
    },
  });
}

function validatePublicExternalUrl(rawUrl: string): URL | null {
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return null;
    }
    const host = parsed.hostname.toLowerCase();
    if (
      !host ||
      host === 'localhost' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^169\.254\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function normalizeExternalApiSettings(
  raw: Partial<ExternalApiSettings> | null | undefined
): ExternalApiSettings {
  const base = structuredClone(SEED_EXTERNAL_API_SETTINGS);
  if (!raw || typeof raw !== 'object') return base;

  const feeds: ExternalRssFeed[] = Array.isArray(raw.rssFeeds)
    ? raw.rssFeeds
        .filter((f) => f && typeof f.url === 'string' && f.url.trim().length > 0)
        .slice(0, 20)
        .map((f, idx) => ({
          id: typeof f.id === 'string' && f.id.trim() ? f.id.trim() : `rss-${idx + 1}`,
          label:
            typeof f.label === 'string' && f.label.trim()
              ? f.label.trim().slice(0, 60)
              : `Feed ${idx + 1}`,
          url: String(f.url).trim().slice(0, 400),
          category: f.category === 'esportes' ? 'esportes' : 'noticias',
          enabled: f.enabled !== false,
        }))
    : base.rssFeeds;

  return {
    rssFeeds: feeds,
    sportsApiKey:
      typeof raw.sportsApiKey === 'string' ? raw.sportsApiKey.trim().slice(0, 256) : '',
    sportsApiProvider:
      raw.sportsApiProvider === 'football-data' ? 'football-data' : 'api-football',
    imagesApiKey:
      typeof raw.imagesApiKey === 'string' ? raw.imagesApiKey.trim().slice(0, 256) : '',
    imagesApiProvider:
      raw.imagesApiProvider === 'unsplash' ? 'unsplash' : 'pexels',
    defaultWeatherCity:
      typeof raw.defaultWeatherCity === 'string' && raw.defaultWeatherCity.trim()
        ? raw.defaultWeatherCity.trim().slice(0, 80)
        : 'São Paulo',
    customJsonApiUrl:
      typeof raw.customJsonApiUrl === 'string'
        ? raw.customJsonApiUrl.trim().slice(0, 400)
        : '',
    updatedAt:
      typeof raw.updatedAt === 'string' && raw.updatedAt
        ? raw.updatedAt
        : new Date().toISOString(),
  };
}

async function readExternalApiSettingsFromSupabase(): Promise<ExternalApiSettings | null> {
  if (!HAS_SUPABASE) return null;
  try {
    const res = await supabaseFetch(
      '/rest/v1/external_api_settings?id=eq.default&select=*',
      { method: 'GET' }
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<Record<string, unknown>>;
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const row = rows[0];
    return normalizeExternalApiSettings({
      rssFeeds: Array.isArray(row.rss_feeds)
        ? (row.rss_feeds as ExternalRssFeed[])
        : undefined,
      sportsApiKey: typeof row.sports_api_key === 'string' ? row.sports_api_key : '',
      sportsApiProvider:
        row.sports_api_provider === 'football-data' ? 'football-data' : 'api-football',
      imagesApiKey: typeof row.images_api_key === 'string' ? row.images_api_key : '',
      imagesApiProvider:
        row.images_api_provider === 'unsplash' ? 'unsplash' : 'pexels',
      defaultWeatherCity:
        typeof row.default_weather_city === 'string'
          ? row.default_weather_city
          : 'São Paulo',
      customJsonApiUrl:
        typeof row.custom_json_api_url === 'string' ? row.custom_json_api_url : '',
      updatedAt:
        typeof row.updated_at === 'string'
          ? row.updated_at
          : new Date().toISOString(),
    });
  } catch {
    return null;
  }
}

async function saveExternalApiSettingsToSupabase(
  settings: ExternalApiSettings
): Promise<boolean> {
  if (!HAS_SUPABASE) return false;
  try {
    const res = await supabaseFetch('/rest/v1/external_api_settings?on_conflict=id', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify({
        id: 'default',
        rss_feeds: settings.rssFeeds,
        sports_api_key: settings.sportsApiKey,
        sports_api_provider: settings.sportsApiProvider,
        images_api_key: settings.imagesApiKey,
        images_api_provider: settings.imagesApiProvider,
        default_weather_city: settings.defaultWeatherCity,
        custom_json_api_url: settings.customJsonApiUrl,
        updated_at: settings.updatedAt,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

const externalImagesCache = new Map<
  string,
  { expiresAt: number; images: string[] }
>();

async function fetchExternalImagesByCategory(
  settings: ExternalApiSettings,
  category: string
): Promise<{ source: string; images: string[] }> {
  const key = settings.imagesApiKey.trim();
  if (!key) return { source: 'local', images: [] };

  const queryMap: Record<string, string> = {
    curiosidades: 'science cosmos nature ocean',
    dicas: 'wellness healthy lifestyle morning',
    receitas: 'gourmet food kitchen cooking',
    horoscopo: 'galaxy stars zodiac night sky',
    quiz: 'modern stage lights studio',
  };
  const query = queryMap[category] || 'editorial photography';
  const cacheKey = `${settings.imagesApiProvider}:${category}:${key.slice(-6)}`;
  const cached = externalImagesCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return { source: settings.imagesApiProvider, images: cached.images };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    let images: string[] = [];

    if (settings.imagesApiProvider === 'unsplash') {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
          query
        )}&orientation=landscape&per_page=8`,
        {
          signal: controller.signal,
          headers: { Authorization: `Client-ID ${key}` },
        }
      );
      if (res.ok) {
        const json = (await res.json()) as {
          results?: Array<{ urls?: { regular?: string } }>;
        };
        images = (json.results || [])
          .map((r) => r.urls?.regular)
          .filter((u): u is string => Boolean(u));
      }
    } else {
      const res = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(
          query
        )}&orientation=landscape&per_page=8`,
        {
          signal: controller.signal,
          headers: { Authorization: key },
        }
      );
      if (res.ok) {
        const json = (await res.json()) as {
          photos?: Array<{ src?: { large2x?: string; large?: string } }>;
        };
        images = (json.photos || [])
          .map((p) => p.src?.large2x || p.src?.large)
          .filter((u): u is string => Boolean(u));
      }
    }
    clearTimeout(timer);

    if (images.length > 0) {
      externalImagesCache.set(cacheKey, {
        expiresAt: Date.now() + 15 * 60 * 1000,
        images,
      });
    }
    return { source: settings.imagesApiProvider, images };
  } catch {
    return { source: 'local', images: [] };
  }
}

const KNOWN_CITY_COORDS: Record<
  string,
  { lat: number; lng: number; label: string }
> = {
  'São Paulo': { lat: -23.5505, lng: -46.6333, label: 'São Paulo, SP' },
  'Rio de Janeiro': { lat: -22.9068, lng: -43.1729, label: 'Rio de Janeiro, RJ' },
  'Belo Horizonte': { lat: -19.9167, lng: -43.9345, label: 'Belo Horizonte, MG' },
  Curitiba: { lat: -25.4284, lng: -49.2733, label: 'Curitiba, PR' },
  Salvador: { lat: -12.9714, lng: -38.5014, label: 'Salvador, BA' },
  'Porto Alegre': { lat: -30.0346, lng: -51.2177, label: 'Porto Alegre, RS' },
  Brasília: { lat: -15.7975, lng: -47.8919, label: 'Brasília, DF' },
};

async function fetchOpenMeteoServerWeather(cityName: string) {
  const cleanCity = cityName.trim() || 'São Paulo';
  let coords = KNOWN_CITY_COORDS[cleanCity];

  if (!coords) {
    try {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          cleanCity
        )}&count=1&language=pt&format=json`
      );
      if (geoRes.ok) {
        const geoJson = (await geoRes.json()) as {
          results?: Array<{
            name: string;
            admin1?: string;
            latitude: number;
            longitude: number;
          }>;
        };
        const hit = geoJson.results?.[0];
        if (hit) {
          coords = {
            lat: hit.latitude,
            lng: hit.longitude,
            label: hit.admin1 ? `${hit.name}, ${hit.admin1}` : hit.name,
          };
        }
      }
    } catch {
      // Fallback below
    }
  }

  if (!coords) {
    coords = { ...KNOWN_CITY_COORDS['São Paulo'], label: cleanCity };
  }

  const fallback = {
    city: coords.label,
    temperature: 26,
    apparentTemperature: 27,
    humidity: 58,
    windSpeed: 14,
    weatherCode: 2,
    minTemp: 19,
    maxTemp: 28,
    daily: [
      { date: 'Hoje', min: 19, max: 28, code: 2 },
      { date: 'Amanhã', min: 20, max: 29, code: 1 },
      { date: 'Sex', min: 18, max: 26, code: 61 },
      { date: 'Sáb', min: 17, max: 25, code: 0 },
    ],
    updatedAt: new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=America%2FSao_Paulo&forecast_days=4`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return { ok: false, weather: fallback };
    const json = (await res.json()) as {
      current?: {
        temperature_2m: number;
        relative_humidity_2m: number;
        apparent_temperature: number;
        weather_code: number;
        wind_speed_10m: number;
      };
      daily?: {
        time: string[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        weather_code: number[];
      };
    };
    if (!json.current || !json.daily) return { ok: false, weather: fallback };

    const dayLabels = ['Hoje', 'Amanhã'];
    const daily = json.daily.time.slice(0, 4).map((isoDate, idx) => {
      let label = dayLabels[idx];
      if (!label) {
        const d = new Date(`${isoDate}T12:00:00`);
        label = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
      }
      return {
        date: label,
        min: Math.round(json.daily!.temperature_2m_min[idx] ?? 18),
        max: Math.round(json.daily!.temperature_2m_max[idx] ?? 27),
        code: json.daily!.weather_code[idx] ?? 1,
      };
    });

    return {
      ok: true,
      weather: {
        city: coords.label,
        temperature: Math.round(json.current.temperature_2m),
        apparentTemperature: Math.round(json.current.apparent_temperature),
        humidity: Math.round(json.current.relative_humidity_2m),
        windSpeed: Math.round(json.current.wind_speed_10m),
        weatherCode: json.current.weather_code,
        minTemp: daily[0]?.min ?? 18,
        maxTemp: daily[0]?.max ?? 27,
        daily,
        updatedAt: new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      },
    };
  } catch {
    return { ok: false, weather: fallback };
  }
}

function stripTags(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractXmlTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? stripTags(match[1]) : '';
}

function sanitizeHttpUrl(url: string, fallback: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
    return fallback;
  } catch {
    return fallback;
  }
}

function sanitizeQrLink(raw: unknown): string {
  const trimmed = String(raw || '').trim().slice(0, 500);
  if (!trimmed) return '';
  if (/^(javascript|data|vbscript|file):/i.test(trimmed)) return '';
  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : /^[a-z0-9.-]+\.[a-z]{2,}/i.test(trimmed)
    ? `https://${trimmed}`
    : '';
  if (!withScheme) return '';
  return sanitizeHttpUrl(withScheme, '');
}

function sanitizeMediaQrCode(raw: unknown): MediaQrCodeConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const validPositions: QrCodePosition[] = [
    'bottom-right',
    'bottom-left',
    'top-right',
    'top-left',
  ];
  const position: QrCodePosition = validPositions.includes(
    obj.position as QrCodePosition
  )
    ? (obj.position as QrCodePosition)
    : 'bottom-right';
  const rawSize = Number(obj.sizePercent);
  const sizePercent: QrCodeSizePercent =
    rawSize === 12 || rawSize === 18 ? rawSize : 15;
  const url = sanitizeQrLink(obj.url);
  const ctaText = String(obj.ctaText ?? 'Aponte a câmera')
    .trim()
    .slice(0, 48);

  return {
    enabled: Boolean(obj.enabled),
    url,
    ctaText: ctaText || 'Aponte a câmera',
    position,
    sizePercent,
  };
}

async function fetchRssFeedByUrl(
  feedUrl: string,
  sourceLabel: string,
  fallback: NewsArticle[] = FALLBACK_NEWS_G1
): Promise<{ articles: NewsArticle[]; live: boolean; error?: string }> {
  const safeUrl = validatePublicExternalUrl(feedUrl);
  if (!safeUrl) {
    return { articles: fallback, live: false, error: 'URL de feed RSS inválida ou não pública.' };
  }
  const fallbackImg = '/src/assets/images/tv_news_studio_1795621649869.jpg';

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const response = await fetch(safeUrl.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'TaOnMidia-RSS-Reader/1.0',
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
      },
    });
    clearTimeout(timer);

    if (!response.ok) {
      return { articles: fallback, live: false, error: `HTTP ${response.status}` };
    }
    const xml = await response.text();
    const itemMatches =
      xml.match(/<item[\s\S]*?<\/item>/gi) ??
      xml.match(/<entry[\s\S]*?<\/entry>/gi) ??
      [];
    if (itemMatches.length === 0) {
      return { articles: fallback, live: false, error: 'Nenhuma notícia encontrada no XML.' };
    }

    const articles: NewsArticle[] = itemMatches.slice(0, 8).map((itemXml, index) => {
      const title = extractXmlTag(itemXml, 'title') || 'Atualização do Brasil e Mundo';
      const rawDesc =
        extractXmlTag(itemXml, 'description') || extractXmlTag(itemXml, 'summary');
      const summary =
        rawDesc.length > 165
          ? `${rawDesc.slice(0, 162)}...`
          : rawDesc || 'Acompanhe os detalhes completos apontando a câmera para o QR Code.';
      const rawLink =
        extractXmlTag(itemXml, 'link') ||
        (itemXml.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1] ?? '');
      const link = sanitizeHttpUrl(rawLink, safeUrl.origin);
      const mediaMatch = itemXml.match(
        /url=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/i
      );
      const imgInDesc = itemXml.match(
        /<img[^>]+src=["'](https?:\/\/[^"']+)["']/i
      );
      const imageUrl = mediaMatch
        ? sanitizeHttpUrl(mediaMatch[1], fallbackImg)
        : imgInDesc
        ? sanitizeHttpUrl(imgInDesc[1], fallbackImg)
        : fallbackImg;
      const pubDateRaw =
        extractXmlTag(itemXml, 'pubDate') || extractXmlTag(itemXml, 'updated');
      let publishedAt = 'Agora';
      if (pubDateRaw) {
        const parsedDate = new Date(pubDateRaw);
        if (!Number.isNaN(parsedDate.getTime())) {
          publishedAt = parsedDate.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          });
        }
      }

      return {
        id: `${sourceLabel.toLowerCase().replace(/[^a-z0-9]/g, '')}-${index + 1}`,
        source: sourceLabel || 'G1',
        title,
        summary,
        link,
        imageUrl,
        publishedAt,
      };
    });

    return {
      articles: articles.length > 0 ? articles : fallback,
      live: articles.length > 0,
    };
  } catch (err) {
    return {
      articles: fallback,
      live: false,
      error: err instanceof Error ? err.message : 'Falha de rede',
    };
  }
}

async function fetchRssSource(source: 'g1' | 'cnn') {
  const feedUrl =
    source === 'g1'
      ? 'https://g1.globo.com/rss/g1/'
      : 'https://www.cnnbrasil.com.br/feed/';
  const fallback = source === 'g1' ? FALLBACK_NEWS_G1 : FALLBACK_NEWS_CNN;
  const label = source === 'g1' ? 'G1' : 'CNN Brasil';
  const result = await fetchRssFeedByUrl(feedUrl, label, fallback);
  return result.articles;
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);

  // Static media files from local 'midias' bucket directory
  app.use('/midias', express.static(MIDIAS_DIR));

  // Binary upload route for 'midias' bucket BEFORE express.json()
  app.post(
    '/api/midias/upload',
    express.raw({
      type: ['image/jpeg', 'image/png', 'video/mp4'],
      limit: '80mb',
    }),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        if (
          req.headers['x-requested-with'] !== 'XMLHttpRequest' &&
          !req.headers.authorization?.startsWith('Bearer ')
        ) {
          res.status(403).json({ error: 'Cabeçalho de segurança ausente.' });
          return;
        }
        const user = extractSessionUser(req);
        if (!user) {
          res.status(401).json({ error: 'Autenticação necessária.' });
          return;
        }

        const mimeType = String(req.headers['content-type'] || '').split(';')[0].trim();
        const extMap: Record<string, string> = {
          'image/jpeg': '.jpg',
          'image/png': '.png',
          'video/mp4': '.mp4',
        };
        const ext = extMap[mimeType];
        if (!ext) {
          res.status(400).json({ error: 'Formato inválido. Aceitos apenas JPG, PNG ou MP4.' });
          return;
        }

        const bodyBuffer = req.body as Buffer;
        if (!Buffer.isBuffer(bodyBuffer) || bodyBuffer.length === 0) {
          res.status(400).json({ error: 'Arquivo vazio.' });
          return;
        }

        const rawNameHeader = String(req.headers['x-file-name'] || 'midia');
        const originalName = decodeURIComponent(rawNameHeader)
          .replace(/[^a-zA-Z0-9À-ÿ._ -]/g, '')
          .slice(0, 100) || `midia${ext}`;
        const durationHeader = Number(req.headers['x-duration-seconds'] || 12);
        const durationSeconds = Number.isFinite(durationHeader) && durationHeader > 0
          ? Math.min(300, Math.round(durationHeader))
          : 12;

        const safeFileName = `${crypto.randomUUID()}${ext}`;
        const mediaType = mimeType === 'video/mp4' ? 'video' : 'image';
        let publicUrl = `/midias/${safeFileName}`;

        // Upload to Supabase Storage bucket 'midias' when configured, else store safely on local disk
        if (HAS_SUPABASE) {
          const uploadRes = await supabaseFetch(
            `/storage/v1/object/midias/${encodeURIComponent(safeFileName)}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': mimeType,
                'x-upsert': 'true',
              },
              body: new Uint8Array(bodyBuffer),
            }
          );
          if (uploadRes.ok) {
            publicUrl = `${SUPABASE_URL}/storage/v1/object/public/midias/${encodeURIComponent(safeFileName)}`;
          } else {
            const targetPath = path.resolve(MIDIAS_DIR, safeFileName);
            if (!targetPath.startsWith(MIDIAS_DIR + path.sep)) {
              res.status(400).json({ error: 'Caminho de arquivo inválido.' });
              return;
            }
            fs.writeFileSync(targetPath, bodyBuffer);
          }
        } else {
          const targetPath = path.resolve(MIDIAS_DIR, safeFileName);
          if (!targetPath.startsWith(MIDIAS_DIR + path.sep)) {
            res.status(400).json({ error: 'Caminho de arquivo inválido.' });
            return;
          }
          fs.writeFileSync(targetPath, bodyBuffer);
        }

        const rawWidth = Number(req.headers['x-media-width'] || 0);
        const rawHeight = Number(req.headers['x-media-height'] || 0);
        const widthPx =
          Number.isFinite(rawWidth) && rawWidth > 0 ? Math.round(rawWidth) : 1920;
        const heightPx =
          Number.isFinite(rawHeight) && rawHeight > 0 ? Math.round(rawHeight) : 1080;
        const requestedFit = String(req.headers['x-media-fit-mode'] || 'FIT_NO_CROP');
        const fitMode: MediaFitMode =
          requestedFit === 'NATIVE_NO_UPSCALE' ? 'NATIVE_NO_UPSCALE' : 'FIT_NO_CROP';

        const checksumHex = crypto.createHash('sha256').update(bodyBuffer).digest('hex');
        const newAsset: MediaAsset = {
          id: `mid-${crypto.randomUUID().slice(0, 8)}`,
          name: originalName,
          url: publicUrl,
          mediaType: mediaType as 'image' | 'video',
          mimeType,
          sizeBytes: bodyBuffer.length,
          resolution: `${widthPx}x${heightPx}`,
          widthPx,
          heightPx,
          aspectRatio: computeAspectRatioLabel(widthPx, heightPx),
          fitMode,
          durationSeconds,
          checksum: `sha256:${checksumHex}`,
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
        };

        const store = readStore();
        store.midias = [newAsset, ...store.midias];
        writeStore(store);

        res.status(201).json(newAsset);
      } catch (err) {
        console.error('Erro no upload de mídia:', err);
        res.status(500).json({ error: 'Falha ao salvar mídia.' });
      }
    }
  );

  app.use(express.json({ limit: '2mb' }));

  // -------- HEALTH CHECK --------
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'ta-on-midia',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  // -------- AUTH ROUTES --------
  app.get('/api/auth/me', (req: Request, res: Response) => {
    const user = extractSessionUser(req);
    const store = readStore();
    res.json({
      user,
      hasUsers: store.users.length > 0,
      storageProvider: HAS_SUPABASE ? 'supabase' : 'local',
    });
  });

  app.post('/api/auth/register', async (req: Request, res: Response) => {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!name || name.length < 2) {
      res.status(400).json({ error: 'Informe seu nome completo.' });
      return;
    }
    if (!email || !email.includes('@')) {
      res.status(400).json({ error: 'Informe um e-mail válido.' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres.' });
      return;
    }

    const store = readStore();
    if (store.users.some((u) => u.email === email)) {
      res.status(409).json({ error: 'Este e-mail já está cadastrado.' });
      return;
    }

    const userRecord: StoredUser = {
      id: `usr-${crypto.randomUUID().slice(0, 8)}`,
      name,
      email,
      role: store.users.length === 0 ? 'Administrador' : 'Operador Comercial',
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    };

    store.users.push(userRecord);
    writeStore(store);

    const token = signSessionToken({
      id: userRecord.id,
      name: userRecord.name,
      email: userRecord.email,
      role: userRecord.role,
      exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
    });
    setSessionCookie(req, res, token);
    res.status(201).json({
      token,
      user: {
        id: userRecord.id,
        name: userRecord.name,
        email: userRecord.email,
        role: userRecord.role,
      },
    });
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!email || !password) {
      res.status(400).json({ error: 'Informe e-mail e senha.' });
      return;
    }

    const store = readStore();
    const found = store.users.find((u) => u.email === email);
    if (!found || !verifyPassword(password, found.passwordHash)) {
      res.status(401).json({ error: 'E-mail ou senha incorretos.' });
      return;
    }

    const token = signSessionToken({
      id: found.id,
      name: found.name,
      email: found.email,
      role: found.role,
      exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
    });
    setSessionCookie(req, res, token);
    res.json({
      token,
      user: {
        id: found.id,
        name: found.name,
        email: found.email,
        role: found.role,
      },
    });
  });

  app.post('/api/auth/logout', (req: Request, res: Response) => {
    clearSessionCookie(req, res);
    res.json({ ok: true });
  });

  // -------- CRM ADVERTISERS --------
  app.get('/api/advertisers', requireAuth, (_req: Request, res: Response) => {
    const store = readStore();
    res.json(store.advertisers);
  });

  app.post('/api/advertisers', requireAuth, (req: Request, res: Response) => {
    const companyName = String(req.body?.companyName || '').trim();
    const segment = String(req.body?.segment || '').trim();
    const contactName = String(req.body?.contactName || '').trim();
    const whatsapp = String(req.body?.whatsapp || '').trim();
    const monthlyValue = Number(req.body?.monthlyValue || 0);
    const stage = String(req.body?.stage || 'Novo Contato');
    const validStages = ['Novo Contato', 'Negociação', 'Proposta Enviada', 'Fechado', 'Ativo'];

    if (!companyName || !segment || !contactName || !whatsapp) {
      res.status(400).json({ error: 'Preencha todos os campos obrigatórios do anunciante.' });
      return;
    }

    const item: Advertiser = {
      id: `adv-${crypto.randomUUID().slice(0, 8)}`,
      companyName,
      segment,
      contactName,
      whatsapp,
      monthlyValue: Number.isFinite(monthlyValue) && monthlyValue >= 0 ? monthlyValue : 0,
      stage: (validStages.includes(stage) ? stage : 'Novo Contato') as CrmStage,
      notes: String(req.body?.notes || '').trim(),
      createdAt: new Date().toISOString(),
    };

    const store = readStore();
    store.advertisers = [item, ...store.advertisers];
    writeStore(store);
    res.status(201).json(item);
  });

  app.patch('/api/advertisers/:id', requireAuth, (req: Request, res: Response) => {
    const id = String(req.params.id);
    const validStages = ['Novo Contato', 'Negociação', 'Proposta Enviada', 'Fechado', 'Ativo'];
    const store = readStore();
    const index = store.advertisers.findIndex((a) => a.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Anunciante não encontrado.' });
      return;
    }

    const existing = store.advertisers[index];
    const nextStage = (
      typeof req.body?.stage === 'string' && validStages.includes(req.body.stage)
        ? req.body.stage
        : existing.stage
    ) as CrmStage;

    store.advertisers[index] = {
      ...existing,
      companyName:
        typeof req.body?.companyName === 'string' && req.body.companyName.trim()
          ? req.body.companyName.trim()
          : existing.companyName,
      segment:
        typeof req.body?.segment === 'string' && req.body.segment.trim()
          ? req.body.segment.trim()
          : existing.segment,
      contactName:
        typeof req.body?.contactName === 'string' && req.body.contactName.trim()
          ? req.body.contactName.trim()
          : existing.contactName,
      whatsapp:
        typeof req.body?.whatsapp === 'string' && req.body.whatsapp.trim()
          ? req.body.whatsapp.trim()
          : existing.whatsapp,
      monthlyValue:
        typeof req.body?.monthlyValue === 'number' && Number.isFinite(req.body.monthlyValue)
          ? req.body.monthlyValue
          : existing.monthlyValue,
      notes:
        typeof req.body?.notes === 'string' ? req.body.notes.trim() : existing.notes,
      stage: nextStage,
    };

    writeStore(store);
    res.json(store.advertisers[index]);
  });

  app.delete('/api/advertisers/:id', requireAuth, (req: Request, res: Response) => {
    const id = String(req.params.id);
    const store = readStore();
    store.advertisers = store.advertisers.filter((a) => a.id !== id);
    writeStore(store);
    res.json({ ok: true });
  });

  // -------- BIBLIOTECA ('midias' bucket) --------
  app.get('/api/midias', requireAuth, (_req: Request, res: Response) => {
    const store = readStore();
    res.json(store.midias);
  });

  app.patch('/api/midias/:id', requireAuth, (req: Request, res: Response) => {
    const id = String(req.params.id);
    const store = readStore();
    const index = store.midias.findIndex((m) => m.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Mídia não encontrada.' });
      return;
    }

    const current = store.midias[index];
    const nextFitMode: MediaFitMode =
      req.body?.fitMode === 'NATIVE_NO_UPSCALE'
        ? 'NATIVE_NO_UPSCALE'
        : req.body?.fitMode === 'FIT_NO_CROP'
        ? 'FIT_NO_CROP'
        : current.fitMode || 'FIT_NO_CROP';

    const nextDuration =
      typeof req.body?.durationSeconds === 'number' && Number.isFinite(req.body.durationSeconds)
        ? Math.max(2, Math.min(300, Math.round(req.body.durationSeconds)))
        : current.durationSeconds;

    const nextQrCode =
      req.body && 'qrCode' in req.body
        ? req.body.qrCode === null
          ? null
          : sanitizeMediaQrCode(req.body.qrCode)
        : current.qrCode ?? null;

    store.midias[index] = {
      ...current,
      fitMode: nextFitMode,
      durationSeconds: nextDuration,
      qrCode: nextQrCode,
    };
    writeStore(store);

    for (const dev of store.devices) {
      notifyDevice(dev.deviceId, 'sync-now', {
        reason: 'media_updated',
        mediaId: id,
        fitMode: nextFitMode,
        qrCodeUpdated: Boolean(req.body && 'qrCode' in req.body),
        timestamp: new Date().toISOString(),
      });
    }

    res.json(store.midias[index]);
  });

  app.delete('/api/midias/:id', requireAuth, async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const store = readStore();
    const target = store.midias.find((m) => m.id === id);
    if (!target) {
      res.status(404).json({ error: 'Mídia não encontrada.' });
      return;
    }

    if (target.url.startsWith('/midias/')) {
      const fileName = path.basename(target.url);
      const resolved = path.resolve(MIDIAS_DIR, fileName);
      if (resolved.startsWith(MIDIAS_DIR + path.sep) && fs.existsSync(resolved)) {
        fs.unlinkSync(resolved);
      }
    }

    store.midias = store.midias.filter((m) => m.id !== id);
    writeStore(store);
    res.json({ ok: true });
  });

  // -------- CONTEÚDOS DINÂMICOS --------
  app.get('/api/dynamic-contents', requireAuth, (_req: Request, res: Response) => {
    const store = readStore();
    res.json(store.dynamicContents);
  });

  app.post('/api/dynamic-contents', requireAuth, (req: Request, res: Response) => {
    const validCategories = ['curiosidades', 'dicas', 'receitas', 'horoscopo', 'quiz'];
    const category = String(req.body?.category || 'curiosidades');
    const title = String(req.body?.title || '').trim();
    const subtitle = String(req.body?.subtitle || '').trim();
    const body = String(req.body?.body || '').trim();
    const imageUrl = sanitizeHttpUrl(
      String(req.body?.imageUrl || ''),
      '/src/assets/images/tv_curiosity_nature_1795621651990.jpg'
    );

    if (!validCategories.includes(category) || !title || !body) {
      res.status(400).json({ error: 'Categoria, título e descrição são obrigatórios.' });
      return;
    }

    const item: DynamicContentItem = {
      id: `dyn-${crypto.randomUUID().slice(0, 8)}`,
      category: category as DynamicCategory,
      title,
      subtitle: subtitle || 'Conteúdo Editorial',
      body,
      imageUrl: String(req.body?.imageUrl || '').startsWith('/src/')
        ? String(req.body.imageUrl)
        : imageUrl,
      meta: req.body?.meta && typeof req.body.meta === 'object' ? req.body.meta : {},
    };

    const store = readStore();
    store.dynamicContents = [item, ...store.dynamicContents];
    writeStore(store);
    res.status(201).json(item);
  });

  // -------- CONFIGURAÇÕES DE APIS EXTERNAS (SUPABASE + FALLBACK LOCAL) --------
  app.get('/api/external-apis', requireAuth, async (_req: Request, res: Response) => {
    const store = readStore();
    const supaSettings = await readExternalApiSettingsFromSupabase();
    if (supaSettings) {
      store.externalApiSettings = supaSettings;
      writeStore(store);
    }
    res.json({
      settings: store.externalApiSettings,
      storageTarget: HAS_SUPABASE ? 'supabase' : 'local',
    });
  });

  app.put('/api/external-apis', requireAuth, async (req: Request, res: Response) => {
    const store = readStore();
    const body = req.body || {};

    if (
      typeof body.customJsonApiUrl === 'string' &&
      body.customJsonApiUrl.trim().length > 0 &&
      !validatePublicExternalUrl(body.customJsonApiUrl)
    ) {
      res.status(400).json({
        error: 'URL da API JSON personalizada deve usar HTTP/HTTPS público válido.',
      });
      return;
    }

    const nextSettings = normalizeExternalApiSettings({
      ...store.externalApiSettings,
      ...body,
      updatedAt: new Date().toISOString(),
    });

    for (const feed of nextSettings.rssFeeds) {
      if (!validatePublicExternalUrl(feed.url)) {
        res.status(400).json({
          error: `URL de feed RSS inválida ou não pública: ${feed.label || feed.url}`,
        });
        return;
      }
    }

    store.externalApiSettings = nextSettings;
    writeStore(store);
    const savedToSupabase = await saveExternalApiSettingsToSupabase(nextSettings);

    for (const dev of store.devices) {
      notifyDevice(dev.deviceId, 'sync-now', {
        reason: 'external_apis_updated',
        defaultWeatherCity: nextSettings.defaultWeatherCity,
        timestamp: nextSettings.updatedAt,
      });
    }

    res.json({
      settings: nextSettings,
      savedToSupabase,
      storageTarget: HAS_SUPABASE ? 'supabase' : 'local',
    });
  });

  app.post('/api/external-apis/test', requireAuth, async (req: Request, res: Response) => {
    const target = String(req.body?.target || '').trim();
    const value = String(req.body?.value || '').trim();
    const provider = String(req.body?.provider || '').trim();

    if (target === 'rss') {
      const safeUrl = validatePublicExternalUrl(value);
      if (!safeUrl) {
        res.status(400).json({ ok: false, message: 'Informe uma URL HTTP/HTTPS pública válida.' });
        return;
      }
      const result = await fetchRssFeedByUrl(safeUrl.toString(), 'Teste');
      if (!result.live) {
        res.json({
          ok: false,
          message: `Falha ao ler RSS (${result.error || 'sem itens válidos'}).`,
        });
        return;
      }
      res.json({
        ok: true,
        message: `Feed conectado! ${result.articles.length} notícias encontradas (ex: "${result.articles[0]?.title.slice(0, 55)}...").`,
      });
      return;
    }

    if (target === 'sports') {
      if (!value) {
        res.json({
          ok: true,
          mode: 'fallback',
          message: 'Campo vazio: o sistema usará automaticamente a tabela de exemplo do Brasileirão.',
        });
        return;
      }
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        const testUrl =
          provider === 'football-data'
            ? 'https://api.football-data.org/v4/competitions/BSA'
            : 'https://v3.football.api-sports.io/status';
        const headers: Record<string, string> =
          provider === 'football-data'
            ? { 'X-Auth-Token': value }
            : { 'x-apisports-key': value };
        const response = await fetch(testUrl, { signal: controller.signal, headers });
        clearTimeout(timer);
        if (!response.ok) {
          res.json({
            ok: false,
            message: `Chave rejeitada pelo provedor (HTTP ${response.status}).`,
          });
          return;
        }
        res.json({
          ok: true,
          message: `Conexão autenticada com sucesso em ${
            provider === 'football-data' ? 'Football-Data.org' : 'API-Football'
          }!`,
        });
      } catch {
        res.json({ ok: false, message: 'Tempo esgotado ou erro de rede ao consultar API esportiva.' });
      }
      return;
    }

    if (target === 'images') {
      if (!value) {
        res.json({
          ok: false,
          message: 'Informe a chave da API do Pexels ou Unsplash para testar.',
        });
        return;
      }
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        const isUnsplash = provider === 'unsplash';
        const url = isUnsplash
          ? 'https://api.unsplash.com/search/photos?query=nature&orientation=landscape&per_page=1'
          : 'https://api.pexels.com/v1/search?query=nature&orientation=landscape&per_page=1';
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            Authorization: isUnsplash ? `Client-ID ${value}` : value,
          },
        });
        clearTimeout(timer);
        if (!response.ok) {
          res.json({
            ok: false,
            message: `Chave inválida ou sem permissão (HTTP ${response.status}).`,
          });
          return;
        }
        const json = (await response.json()) as {
          photos?: Array<{ src?: { medium?: string } }>;
          results?: Array<{ urls?: { small?: string } }>;
        };
        const sampleUrl = isUnsplash
          ? json.results?.[0]?.urls?.small
          : json.photos?.[0]?.src?.medium;
        res.json({
          ok: true,
          sampleUrl,
          message: `Banco de imagens ${
            isUnsplash ? 'Unsplash' : 'Pexels'
          } conectado com sucesso!`,
        });
      } catch {
        res.json({ ok: false, message: 'Erro de rede ao conectar no banco de imagens.' });
      }
      return;
    }

    if (target === 'weather') {
      const city = value || 'São Paulo';
      const result = await fetchOpenMeteoServerWeather(city);
      res.json({
        ok: result.ok,
        message: result.ok
          ? `Open-Meteo conectado: ${result.weather.city} com ${result.weather.temperature}°C agora.`
          : `Não foi possível consultar ao vivo; fallback ativo para ${result.weather.city}.`,
      });
      return;
    }

    if (target === 'custom_json') {
      const safeUrl = validatePublicExternalUrl(value);
      if (!safeUrl) {
        res.status(400).json({
          ok: false,
          message: 'Informe uma URL HTTP/HTTPS pública válida para testar.',
        });
        return;
      }
      try {
        const started = Date.now();
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(safeUrl.toString(), {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        clearTimeout(timer);
        const latency = Date.now() - started;
        if (!response.ok) {
          res.json({
            ok: false,
            message: `Endpoint respondeu HTTP ${response.status} em ${latency}ms.`,
          });
          return;
        }
        const json = await response.json();
        const summary = Array.isArray(json)
          ? `Array com ${json.length} itens`
          : json && typeof json === 'object'
          ? `Objeto JSON (${Object.keys(json as Record<string, unknown>).slice(0, 5).join(', ')})`
          : typeof json;
        res.json({
          ok: true,
          message: `JSON válido recebido em ${latency}ms · ${summary}.`,
        });
      } catch {
        res.json({
          ok: false,
          message: 'O endpoint não retornou um JSON válido ou excedeu o tempo limite.',
        });
      }
      return;
    }

    res.status(400).json({ ok: false, message: 'Alvo de teste inválido.' });
  });

  // -------- RSS PROXY (LÊ FEEDS CONFIGURADOS NO BANCO) --------
  app.get('/api/rss', async (req: Request, res: Response) => {
    const store = readStore();
    const feeds = store.externalApiSettings.rssFeeds.filter((f) => f.enabled);
    const feedId = req.query.feedId ? String(req.query.feedId) : '';
    const sourceParam = String(req.query.source || '').toLowerCase();

    if (feedId) {
      const targetFeed = feeds.find((f) => f.id === feedId);
      if (targetFeed) {
        const result = await fetchRssFeedByUrl(targetFeed.url, targetFeed.label);
        res.json(result.articles);
        return;
      }
    }

    if (sourceParam === 'cnn' || sourceParam === 'g1') {
      const matching = feeds.find((f) =>
        sourceParam === 'cnn'
          ? f.url.toLowerCase().includes('cnn')
          : f.url.toLowerCase().includes('g1')
      );
      if (matching) {
        const result = await fetchRssFeedByUrl(
          matching.url,
          matching.label,
          sourceParam === 'cnn' ? FALLBACK_NEWS_CNN : FALLBACK_NEWS_G1
        );
        res.json(result.articles);
        return;
      }
      const items = await fetchRssSource(sourceParam);
      res.json(items);
      return;
    }

    if (feeds.length > 0) {
      const result = await fetchRssFeedByUrl(feeds[0].url, feeds[0].label);
      res.json(result.articles);
      return;
    }

    const items = await fetchRssSource('g1');
    res.json(items);
  });

  // -------- ESPORTES AO VIVO (USA CHAVE DO BANCO COM FALLBACK) --------
  app.get('/api/sports', requireAuth, async (_req: Request, res: Response) => {
    const store = readStore();
    const { sportsApiKey, sportsApiProvider } = store.externalApiSettings;
    if (!sportsApiKey.trim()) {
      res.json({ source: 'fallback', matches: null, standings: null });
      return;
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      if (sportsApiProvider === 'football-data') {
        const [standRes, matchRes] = await Promise.all([
          fetch('https://api.football-data.org/v4/competitions/BSA/standings', {
            signal: controller.signal,
            headers: { 'X-Auth-Token': sportsApiKey.trim() },
          }),
          fetch('https://api.football-data.org/v4/competitions/BSA/matches?status=SCHEDULED,FINISHED&limit=15', {
            signal: controller.signal,
            headers: { 'X-Auth-Token': sportsApiKey.trim() },
          }),
        ]);
        clearTimeout(timer);
        if (standRes.ok && matchRes.ok) {
          const standJson = (await standRes.json()) as {
            standings?: Array<{
              table?: Array<{
                position: number;
                team: { shortName?: string; name: string };
                points: number;
                playedGames: number;
                won: number;
                goalDifference: number;
              }>;
            }>;
          };
          const matchJson = (await matchRes.json()) as {
            matches?: Array<{
              id: number;
              matchday?: number;
              utcDate: string;
              status: string;
              homeTeam: { shortName?: string; name: string };
              awayTeam: { shortName?: string; name: string };
              score?: { fullTime?: { home: number | null; away: number | null } };
            }>;
          };
          const table = standJson.standings?.[0]?.table || [];
          const standings: StandingRow[] = table.slice(0, 8).map((row, idx) => ({
            pos: row.position || idx + 1,
            team: row.team.shortName || row.team.name,
            points: row.points,
            played: row.playedGames,
            wins: row.won,
            gd: row.goalDifference,
            zone: idx < 4 ? 'libertadores' : idx < 6 ? 'pre' : 'sulamericana',
          }));
          const matches: SportsMatch[] = (matchJson.matches || []).slice(-8).map((m) => ({
            id: `fd-${m.id}`,
            round: `Rodada ${m.matchday || 36}`,
            roundNumber: m.matchday || 36,
            dateLabel: new Date(m.utcDate).toLocaleDateString('pt-BR', {
              weekday: 'short',
              day: '2-digit',
              month: '2-digit',
            }),
            homeTeam: m.homeTeam.shortName || m.homeTeam.name,
            awayTeam: m.awayTeam.shortName || m.awayTeam.name,
            homeScore: m.score?.fullTime?.home ?? 0,
            awayScore: m.score?.fullTime?.away ?? 0,
            status: m.status === 'FINISHED' ? 'Encerrado' : 'Ao vivo',
            kickoff: new Date(m.utcDate).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            stadium: 'Brasileirão Série A',
          }));
          if (standings.length > 0 && matches.length > 0) {
            res.json({ source: 'football-data', matches, standings });
            return;
          }
        }
      } else {
        const standRes = await fetch(
          'https://v3.football.api-sports.io/standings?league=71&season=2025',
          {
            signal: controller.signal,
            headers: { 'x-apisports-key': sportsApiKey.trim() },
          }
        );
        clearTimeout(timer);
        if (standRes.ok) {
          const standJson = (await standRes.json()) as {
            response?: Array<{
              league?: {
                standings?: Array<
                  Array<{
                    rank: number;
                    team: { name: string };
                    points: number;
                    goalsDiff: number;
                    all: { played: number; win: number };
                  }>
                >;
              };
            }>;
          };
          const table = standJson.response?.[0]?.league?.standings?.[0] || [];
          const standings: StandingRow[] = table.slice(0, 8).map((r, idx) => ({
            pos: r.rank || idx + 1,
            team: r.team.name,
            points: r.points,
            played: r.all.played,
            wins: r.all.win,
            gd: r.goalsDiff,
            zone: idx < 4 ? 'libertadores' : idx < 6 ? 'pre' : 'sulamericana',
          }));
          if (standings.length > 0) {
            res.json({ source: 'api-football', matches: null, standings });
            return;
          }
        }
      }
    } catch {
      // Fall back gracefully
    }

    res.json({ source: 'fallback', matches: null, standings: null });
  });

  // -------- IMAGENS EXTERNAS (PEXELS / UNSPLASH VIA BANCO) --------
  app.get('/api/external-images', requireAuth, async (req: Request, res: Response) => {
    const category = String(req.query.category || 'curiosidades');
    const store = readStore();
    const result = await fetchExternalImagesByCategory(
      store.externalApiSettings,
      category
    );
    res.json(result);
  });

  // -------- PREVISÃO DO TEMPO (CIDADE PADRÃO DO BANCO + GEOCODING) --------
  app.get('/api/weather', requireAuth, async (req: Request, res: Response) => {
    const store = readStore();
    const city =
      typeof req.query.city === 'string' && req.query.city.trim()
        ? req.query.city.trim()
        : store.externalApiSettings.defaultWeatherCity || 'São Paulo';
    const result = await fetchOpenMeteoServerWeather(city);
    res.json(result.weather);
  });

  // -------- PLAYLISTS (DRAFT/PUBLISHED, VERSIONING & MODES) --------
  app.get('/api/playlists', requireAuth, (_req: Request, res: Response) => {
    const store = readStore();
    res.json(store.playlists);
  });

  app.post('/api/playlists', requireAuth, (req: Request, res: Response) => {
    const name = String(req.body?.name || '').trim();
    const description = String(req.body?.description || '').trim();
    const rawItems = Array.isArray(req.body?.items) ? (req.body.items as PlaylistItem[]) : [];
    const playbackMode: PlaybackMode =
      req.body?.playbackMode === 'RANDOM' ? 'RANDOM' : 'SEQUENTIAL';

    if (!name) {
      res.status(400).json({ error: 'Informe o nome da playlist.' });
      return;
    }

    const items: PlaylistItem[] = rawItems.map((it, idx) => ({
      ...it,
      position: idx,
      enabled: it.enabled !== false,
      durationSeconds: Math.max(2, Math.min(300, Number(it.durationSeconds) || 10)),
      qrCode: it.qrCode ? sanitizeMediaQrCode(it.qrCode) : null,
    }));

    const created: Playlist = {
      id: `pl-${crypto.randomUUID().slice(0, 8)}`,
      name,
      description,
      status: 'DRAFT',
      playbackMode,
      version: 1,
      publishedAt: null,
      items,
      updatedAt: new Date().toISOString(),
    };

    const store = readStore();
    store.playlists = [created, ...store.playlists];
    writeStore(store);
    res.status(201).json(created);
  });

  app.put('/api/playlists/:id', requireAuth, (req: Request, res: Response) => {
    const id = String(req.params.id);
    const store = readStore();
    const index = store.playlists.findIndex((p) => p.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Playlist não encontrada.' });
      return;
    }

    const current = store.playlists[index];
    const nextItems = Array.isArray(req.body?.items)
      ? (req.body.items as PlaylistItem[]).map((it, idx) => ({
          ...it,
          position: idx,
          enabled: it.enabled !== false,
          durationSeconds: Math.max(2, Math.min(300, Number(it.durationSeconds) || 10)),
          qrCode: it.qrCode ? sanitizeMediaQrCode(it.qrCode) : null,
        }))
      : current.items;

    const nextMode: PlaybackMode =
      req.body?.playbackMode === 'RANDOM'
        ? 'RANDOM'
        : req.body?.playbackMode === 'SEQUENTIAL'
        ? 'SEQUENTIAL'
        : current.playbackMode;

    // Per Degree Midia spec (6.3): editing replaces items, increments version, resets to DRAFT & clears publishedAt
    store.playlists[index] = {
      ...current,
      name:
        typeof req.body?.name === 'string' && req.body.name.trim()
          ? req.body.name.trim()
          : current.name,
      description:
        typeof req.body?.description === 'string'
          ? req.body.description.trim()
          : current.description,
      playbackMode: nextMode,
      items: nextItems,
      status: 'DRAFT',
      version: current.version + 1,
      publishedAt: null,
      updatedAt: new Date().toISOString(),
    };

    writeStore(store);
    res.json(store.playlists[index]);
  });

  app.post('/api/playlists/:id/publish', requireAuth, (req: Request, res: Response) => {
    const id = String(req.params.id);
    const store = readStore();
    const index = store.playlists.findIndex((p) => p.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Playlist não encontrada.' });
      return;
    }
    const current = store.playlists[index];
    const now = new Date().toISOString();
    store.playlists[index] = {
      ...current,
      status: 'PUBLISHED',
      version: current.version + 1,
      publishedAt: now,
      updatedAt: now,
    };
    writeStore(store);
    notifyDevicesByPlaylistId(store, id, store.playlists[index].version);
    res.json(store.playlists[index]);
  });

  app.delete('/api/playlists/:id', requireAuth, (req: Request, res: Response) => {
    const id = String(req.params.id);
    const store = readStore();
    store.playlists = store.playlists.filter((p) => p.id !== id);
    writeStore(store);
    res.json({ ok: true });
  });

  // -------- TELAS (SCREENS, ORIENTATION & SCHEDULES) --------
  app.get('/api/screens', requireAuth, (_req: Request, res: Response) => {
    const store = readStore();
    res.json(store.screens);
  });

  app.post('/api/screens', requireAuth, (req: Request, res: Response) => {
    const name = String(req.body?.name || '').trim();
    const location = String(req.body?.location || '').trim();
    const city = String(req.body?.city || '').trim();
    const state = String(req.body?.state || 'SP').trim().toUpperCase().slice(0, 2);
    const uniqueCode = String(req.body?.uniqueCode || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, '');
    const playlistId = req.body?.playlistId ? String(req.body.playlistId) : null;
    const orientation: ScreenOrientation =
      req.body?.orientation === 'PORTRAIT' || req.body?.orientation === 'AUTO'
        ? req.body.orientation
        : 'LANDSCAPE';

    if (!name || !location || !city || !uniqueCode) {
      res.status(400).json({ error: 'Nome, local, cidade e código único são obrigatórios.' });
      return;
    }

    const store = readStore();
    if (store.screens.some((s) => s.uniqueCode === uniqueCode)) {
      res.status(409).json({ error: 'Já existe uma tela com este código único.' });
      return;
    }

    const created: ScreenDevice = {
      id: `scr-${crypto.randomUUID().slice(0, 8)}`,
      name,
      location,
      city,
      state: state || 'SP',
      uniqueCode,
      playlistId,
      orientation,
      status: 'ACTIVE',
      deviceId: null,
      schedules: [],
      resolution: orientation === 'PORTRAIT' ? '1080x1920' : '1920x1080',
      lastSeenAt: null,
      lat: -23.5505,
      lng: -46.6333,
    };

    store.screens = [created, ...store.screens];
    writeStore(store);
    res.status(201).json(created);
  });

  function updateScreenHandler(req: Request, res: Response) {
    const id = String(req.params.id);
    const store = readStore();
    const index = store.screens.findIndex((s) => s.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Tela não encontrada.' });
      return;
    }

    const current = store.screens[index];
    const nextOrientation: ScreenOrientation =
      req.body?.orientation === 'LANDSCAPE' ||
      req.body?.orientation === 'PORTRAIT' ||
      req.body?.orientation === 'AUTO'
        ? req.body.orientation
        : current.orientation;

    const nextStatus: ScreenStatus =
      req.body?.status === 'ACTIVE' ||
      req.body?.status === 'INACTIVE' ||
      req.body?.status === 'MAINTENANCE'
        ? req.body.status
        : current.status;

    store.screens[index] = {
      ...current,
      playlistId:
        req.body?.playlistId === null
          ? null
          : typeof req.body?.playlistId === 'string'
          ? req.body.playlistId
          : current.playlistId,
      name:
        typeof req.body?.name === 'string' && req.body.name.trim()
          ? req.body.name.trim()
          : current.name,
      location:
        typeof req.body?.location === 'string' && req.body.location.trim()
          ? req.body.location.trim()
          : current.location,
      orientation: nextOrientation,
      status: nextStatus,
      resolution: nextOrientation === 'PORTRAIT' ? '1080x1920' : '1920x1080',
    };

    // Sync DeviceSettings.screenOrientation when a Device is linked (spec 3.4)
    if (current.deviceId) {
      const devIdx = store.devices.findIndex((d) => d.deviceId === current.deviceId);
      if (devIdx !== -1 && req.body?.orientation) {
        store.devices[devIdx].settings = {
          ...store.devices[devIdx].settings,
          screenOrientation: nextOrientation,
        };
      }
      notifyDevice(current.deviceId, 'sync-now', {
        reason: 'screen_updated',
        orientation: nextOrientation,
        playlistId: store.screens[index].playlistId,
        timestamp: new Date().toISOString(),
      });
    }

    writeStore(store);
    res.json(store.screens[index]);
  }

  app.patch('/api/screens/:id', requireAuth, updateScreenHandler);
  app.put('/api/screens/:id', requireAuth, updateScreenHandler);

  app.post('/api/screens/:id/device', requireAuth, (req: Request, res: Response) => {
    const screenId = String(req.params.id);
    const requestedDeviceId = req.body?.deviceId
      ? String(req.body.deviceId).trim().toUpperCase()
      : null;

    const store = readStore();
    const screenIdx = store.screens.findIndex((s) => s.id === screenId);
    if (screenIdx === -1) {
      res.status(404).json({ error: 'Tela não encontrada.' });
      return;
    }

    // Clear previous device linked to this screen
    for (const dev of store.devices) {
      if (dev.screenId === screenId) {
        dev.screenId = null;
      }
    }

    if (requestedDeviceId) {
      const devIdx = store.devices.findIndex((d) => d.deviceId === requestedDeviceId);
      if (devIdx === -1) {
        res.status(404).json({ error: 'Dispositivo Android não encontrado.' });
        return;
      }
      // Enforce 1 Device = max 1 Screen (spec 6.2)
      for (const scr of store.screens) {
        if (scr.deviceId === requestedDeviceId) {
          scr.deviceId = null;
        }
      }
      store.devices[devIdx].screenId = screenId;
      store.devices[devIdx].settings.screenOrientation = store.screens[screenIdx].orientation;
      store.screens[screenIdx].deviceId = requestedDeviceId;
    } else {
      store.screens[screenIdx].deviceId = null;
    }

    writeStore(store);
    res.json({
      screen: store.screens[screenIdx],
      devices: store.devices.map((d) => toPublicDevice(d, store.deviceCommands)),
    });
  });

  app.post('/api/screens/:id/schedules', requireAuth, (req: Request, res: Response) => {
    const screenId = String(req.params.id);
    const playlistId = String(req.body?.playlistId || '').trim();
    const startsAt = String(req.body?.startsAt || '08:00').trim();
    const endsAt = String(req.body?.endsAt || '18:00').trim();
    const priority = Number(req.body?.priority ?? 10);

    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!playlistId || !timeRegex.test(startsAt) || !timeRegex.test(endsAt)) {
      res.status(400).json({ error: 'Informe playlist e horários válidos (HH:MM).' });
      return;
    }

    const store = readStore();
    const screenIdx = store.screens.findIndex((s) => s.id === screenId);
    if (screenIdx === -1) {
      res.status(404).json({ error: 'Tela não encontrada.' });
      return;
    }

    const schedule: ScreenPlaylistSchedule = {
      id: `sch-${crypto.randomUUID().slice(0, 8)}`,
      playlistId,
      startsAt,
      endsAt,
      priority: Number.isFinite(priority) ? Math.max(1, Math.min(100, Math.round(priority))) : 10,
      isActive: true,
    };

    store.screens[screenIdx].schedules = [
      schedule,
      ...(store.screens[screenIdx].schedules || []),
    ];
    writeStore(store);
    res.status(201).json(store.screens[screenIdx]);
  });

  app.delete('/api/screens/:id/schedules/:scheduleId', requireAuth, (req: Request, res: Response) => {
    const screenId = String(req.params.id);
    const scheduleId = String(req.params.scheduleId);
    const store = readStore();
    const screenIdx = store.screens.findIndex((s) => s.id === screenId);
    if (screenIdx === -1) {
      res.status(404).json({ error: 'Tela não encontrada.' });
      return;
    }
    store.screens[screenIdx].schedules = (store.screens[screenIdx].schedules || []).filter(
      (sch) => sch.id !== scheduleId
    );
    writeStore(store);
    res.json(store.screens[screenIdx]);
  });

  app.delete('/api/screens/:id', requireAuth, (req: Request, res: Response) => {
    const id = String(req.params.id);
    const store = readStore();
    for (const dev of store.devices) {
      if (dev.screenId === id) dev.screenId = null;
    }
    store.screens = store.screens.filter((s) => s.id !== id);
    writeStore(store);
    res.json({ ok: true });
  });

  // -------- DISPOSITIVOS ANDROID / TV BOX & PAREAMENTO SEGURO --------
  app.get('/api/devices', requireAuth, (_req: Request, res: Response) => {
    const store = readStore();
    res.json(store.devices.map((d) => toPublicDevice(d, store.deviceCommands)));
  });

  app.post('/api/devices', requireAuth, (req: Request, res: Response) => {
    const deviceId = String(req.body?.deviceId || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9-_]/g, '');
    const name = String(req.body?.name || '').trim();
    const screenId = req.body?.screenId ? String(req.body.screenId) : null;

    if (!deviceId || !name) {
      res.status(400).json({ error: 'Informe Device ID e nome do equipamento.' });
      return;
    }

    const store = readStore();
    if (store.devices.some((d) => d.deviceId === deviceId)) {
      res.status(409).json({ error: 'Já existe um dispositivo com este Device ID.' });
      return;
    }

    let orientation: ScreenOrientation = 'LANDSCAPE';
    if (screenId) {
      const scrIdx = store.screens.findIndex((s) => s.id === screenId);
      if (scrIdx !== -1) {
        orientation = store.screens[scrIdx].orientation;
        for (const other of store.devices) {
          if (other.screenId === screenId) other.screenId = null;
        }
        store.screens[scrIdx].deviceId = deviceId;
      }
    }

    const created: StoredAndroidDevice = {
      id: `dev-${crypto.randomUUID().slice(0, 8)}`,
      deviceId,
      name,
      screenId,
      pairingStatus: 'PENDING',
      pairingCodeHash: null,
      pairingCodeExpiresAt: null,
      pairingAttempts: 0,
      accessTokenHash: null,
      status: 'UNCONFIGURED',
      lastSeenAt: null,
      lastIpAddress: null,
      appVersion: null,
      osVersion: null,
      deviceModel: null,
      currentPlaylistVersion: null,
      storageFreeBytes: null,
      cacheBytes: null,
      lastCacheClearedAt: null,
      hardware: null,
      lastError: null,
      settings: defaultDeviceSettings(orientation),
      createdAt: new Date().toISOString(),
    };

    store.devices = [created, ...store.devices];
    writeStore(store);
    res.status(201).json(toPublicDevice(created, store.deviceCommands));
  });

  app.post('/api/devices/:deviceId/pairing-code', requireAuth, (req: Request, res: Response) => {
    const deviceId = String(req.params.deviceId || '').trim().toUpperCase();
    const store = readStore();
    const idx = store.devices.findIndex((d) => d.deviceId === deviceId);
    if (idx === -1) {
      res.status(404).json({ error: 'Dispositivo não encontrado.' });
      return;
    }

    // CSPRNG 6-digit pairing code stored hashed (spec Phase 5 #3 & #4)
    const pairingCode = String(crypto.randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    store.devices[idx].pairingCodeHash = hashPairingCode(deviceId, pairingCode);
    store.devices[idx].pairingCodeExpiresAt = expiresAt;
    store.devices[idx].pairingAttempts = 0;
    store.devices[idx].pairingStatus = 'PENDING';
    writeStore(store);

    res.json({
      deviceId,
      pairingCode,
      expiresAt,
    });
  });

  app.patch('/api/devices/:deviceId/settings', requireAuth, (req: Request, res: Response) => {
    const deviceId = String(req.params.deviceId || '').trim().toUpperCase();
    const store = readStore();
    const idx = store.devices.findIndex((d) => d.deviceId === deviceId);
    if (idx === -1) {
      res.status(404).json({ error: 'Dispositivo não encontrado.' });
      return;
    }

    const cur = store.devices[idx].settings;
    const body = req.body || {};
    store.devices[idx].settings = {
      ...cur,
      syncIntervalSeconds:
        typeof body.syncIntervalSeconds === 'number'
          ? Math.max(5, Math.min(86400, Math.round(body.syncIntervalSeconds)))
          : cur.syncIntervalSeconds,
      heartbeatIntervalSeconds:
        typeof body.heartbeatIntervalSeconds === 'number'
          ? Math.max(5, Math.min(3600, Math.round(body.heartbeatIntervalSeconds)))
          : cur.heartbeatIntervalSeconds,
      startOnBoot:
        typeof body.startOnBoot === 'boolean' ? body.startOnBoot : cur.startOnBoot,
      kioskMode:
        typeof body.kioskMode === 'boolean' ? body.kioskMode : cur.kioskMode,
      watchdogEnabled:
        typeof body.watchdogEnabled === 'boolean'
          ? body.watchdogEnabled
          : cur.watchdogEnabled ?? true,
      autoLaunchDelaySeconds:
        typeof body.autoLaunchDelaySeconds === 'number'
          ? Math.max(0, Math.min(60, Math.round(body.autoLaunchDelaySeconds)))
          : cur.autoLaunchDelaySeconds ?? 3,
      volume:
        typeof body.volume === 'number'
          ? Math.max(0, Math.min(100, Math.round(body.volume)))
          : cur.volume,
      muted: typeof body.muted === 'boolean' ? body.muted : cur.muted,
      offlineModeEnabled:
        typeof body.offlineModeEnabled === 'boolean'
          ? body.offlineModeEnabled
          : cur.offlineModeEnabled,
      screenOrientation:
        body.screenOrientation === 'LANDSCAPE' ||
        body.screenOrientation === 'PORTRAIT' ||
        body.screenOrientation === 'AUTO'
          ? body.screenOrientation
          : cur.screenOrientation,
      mediaFitMode:
        body.mediaFitMode === 'NATIVE_NO_UPSCALE'
          ? 'NATIVE_NO_UPSCALE'
          : body.mediaFitMode === 'FIT_NO_CROP'
          ? 'FIT_NO_CROP'
          : cur.mediaFitMode ?? 'FIT_NO_CROP',
      preventCrop:
        typeof body.preventCrop === 'boolean'
          ? body.preventCrop
          : cur.preventCrop ?? true,
      preventStretch:
        typeof body.preventStretch === 'boolean'
          ? body.preventStretch
          : cur.preventStretch ?? true,
      preventBlurBackdrop:
        typeof body.preventBlurBackdrop === 'boolean'
          ? body.preventBlurBackdrop
          : cur.preventBlurBackdrop ?? true,
      preventUpscaleBlur:
        typeof body.preventUpscaleBlur === 'boolean'
          ? body.preventUpscaleBlur
          : cur.preventUpscaleBlur ?? true,
      solidBackgroundColor:
        typeof body.solidBackgroundColor === 'string' &&
        /^#[0-9a-fA-F]{6}$/.test(body.solidBackgroundColor)
          ? body.solidBackgroundColor
          : cur.solidBackgroundColor || '#000000',
      fastSyncEnabled:
        typeof body.fastSyncEnabled === 'boolean'
          ? body.fastSyncEnabled
          : cur.fastSyncEnabled ?? true,
    };

    writeStore(store);

    const screen = store.devices[idx].screenId
      ? store.screens.find((s) => s.id === store.devices[idx].screenId) || null
      : null;
    notifyDevice(deviceId, 'config-updated', {
      display: buildApkDisplayPolicy(screen, store.devices[idx].settings),
      settings: store.devices[idx].settings,
      timestamp: new Date().toISOString(),
    });

    res.json(toPublicDevice(store.devices[idx], store.deviceCommands));
  });

  // Panel Remote Control Queue: Clear Cache, Force Boot/Kiosk, Identify Hardware, Force Sync, Restart App, Reboot Device
  app.get('/api/devices/:deviceId/commands', requireAuth, (req: Request, res: Response) => {
    const deviceId = String(req.params.deviceId || '').trim().toUpperCase();
    const store = readStore();
    const list = store.deviceCommands.filter((c) => c.deviceId === deviceId);
    res.json(list);
  });

  app.post('/api/devices/:deviceId/commands', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const deviceId = String(req.params.deviceId || '').trim().toUpperCase();
    const command = String(req.body?.command || '').trim().toUpperCase() as DeviceCommandType;
    const validCommands: DeviceCommandType[] = [
      'CLEAR_CACHE',
      'FORCE_LAUNCH_BOOT',
      'IDENTIFY_HARDWARE',
      'FORCE_SYNC',
      'RESTART_APP',
      'REBOOT_DEVICE',
    ];
    if (!validCommands.includes(command)) {
      res.status(400).json({ error: 'Comando remoto inválido.' });
      return;
    }

    const store = readStore();
    const idx = store.devices.findIndex((d) => d.deviceId === deviceId);
    if (idx === -1) {
      res.status(404).json({ error: 'Dispositivo não encontrado.' });
      return;
    }

    if (command === 'FORCE_LAUNCH_BOOT') {
      store.devices[idx].settings = {
        ...store.devices[idx].settings,
        startOnBoot: true,
        kioskMode: true,
        watchdogEnabled: true,
      };
    }

    const created: DeviceCommand = {
      id: `cmd-${crypto.randomUUID().slice(0, 8)}`,
      deviceId,
      command,
      status: 'PENDING',
      requestedBy: req.user?.name || 'Administrador',
      payload:
        req.body?.payload && typeof req.body.payload === 'object'
          ? req.body.payload
          : {},
      resultMessage: null,
      createdAt: new Date().toISOString(),
      deliveredAt: null,
      executedAt: null,
    };

    store.deviceCommands = [created, ...store.deviceCommands].slice(0, 1000);
    writeStore(store);

    notifyDevice(deviceId, 'command', {
      command: created,
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({
      command: created,
      device: toPublicDevice(store.devices[idx], store.deviceCommands),
    });
  });

  app.post('/api/devices/:deviceId/block', requireAuth, (req: Request, res: Response) => {
    const deviceId = String(req.params.deviceId || '').trim().toUpperCase();
    const blocked = Boolean(req.body?.blocked);
    const store = readStore();
    const idx = store.devices.findIndex((d) => d.deviceId === deviceId);
    if (idx === -1) {
      res.status(404).json({ error: 'Dispositivo não encontrado.' });
      return;
    }
    store.devices[idx].status = blocked ? 'BLOCKED' : 'OFFLINE';
    store.devices[idx].pairingStatus = blocked ? 'BLOCKED' : 'PAIRED';
    writeStore(store);
    res.json(toPublicDevice(store.devices[idx], store.deviceCommands));
  });

  app.delete('/api/devices/:deviceId', requireAuth, (req: Request, res: Response) => {
    const deviceId = String(req.params.deviceId || '').trim().toUpperCase();
    const store = readStore();
    for (const scr of store.screens) {
      if (scr.deviceId === deviceId) scr.deviceId = null;
    }
    store.devices = store.devices.filter((d) => d.deviceId !== deviceId);
    store.deviceCommands = store.deviceCommands.filter((c) => c.deviceId !== deviceId);
    writeStore(store);
    res.json({ ok: true });
  });

  // Public Player Pairing Endpoint (CSPRNG + hash + attempt limiting + initial hardware registration)
  app.post('/api/devices/pair', (req: Request, res: Response) => {
    const clientIp = req.ip || 'unknown';
    if (!checkIpPairingRateLimit(clientIp)) {
      res.status(429).json({ error: 'Muitas tentativas de pareamento. Aguarde alguns minutos.' });
      return;
    }

    const deviceId = String(req.body?.deviceId || '').trim().toUpperCase();
    const pairingCode = String(req.body?.pairingCode || '').trim();
    if (!deviceId || !/^\d{6}$/.test(pairingCode)) {
      res.status(400).json({ error: 'Informe Device ID e código numérico de 6 dígitos.' });
      return;
    }

    const store = readStore();
    const idx = store.devices.findIndex((d) => d.deviceId === deviceId);
    if (idx === -1) {
      res.status(404).json({ error: 'Dispositivo não encontrado.' });
      return;
    }

    const dev = store.devices[idx];
    if (dev.pairingStatus === 'BLOCKED' || dev.status === 'BLOCKED') {
      res.status(403).json({ error: 'Dispositivo bloqueado pelo administrador.' });
      return;
    }
    if (dev.pairingAttempts >= 5) {
      res.status(429).json({ error: 'Limite de tentativas excedido. Gere um novo código no painel.' });
      return;
    }
    if (
      !dev.pairingCodeHash ||
      !dev.pairingCodeExpiresAt ||
      new Date(dev.pairingCodeExpiresAt).getTime() < Date.now()
    ) {
      res.status(410).json({ error: 'Código de pareamento expirado ou inexistente.' });
      return;
    }

    const expectedHash = hashPairingCode(deviceId, pairingCode);
    if (!timingSafeEqualHex(expectedHash, dev.pairingCodeHash)) {
      dev.pairingAttempts += 1;
      writeStore(store);
      res.status(401).json({ error: 'Código de pareamento inválido.' });
      return;
    }

    const hw = sanitizeHardwarePayload(req.body?.hardware);
    if (hw) {
      dev.hardware = { ...(dev.hardware || {}), ...hw };
      if (hw.model) dev.deviceModel = hw.model;
      if (hw.androidSdk) dev.osVersion = `Android SDK ${hw.androidSdk}`;
    }
    if (typeof req.body?.appVersion === 'string') {
      dev.appVersion = req.body.appVersion.slice(0, 32);
    }

    const accessToken = crypto.randomBytes(32).toString('hex');
    dev.accessTokenHash = hashDeviceToken(accessToken);
    dev.pairingCodeHash = null;
    dev.pairingCodeExpiresAt = null;
    dev.pairingAttempts = 0;
    dev.pairingStatus = 'PAIRED';
    dev.status = 'ONLINE';
    dev.lastSeenAt = new Date().toISOString();
    dev.lastIpAddress = clientIp;
    writeStore(store);

    res.json({
      deviceId: dev.deviceId,
      accessToken,
      device: toPublicDevice(dev, store.deviceCommands),
    });
  });

  // Device Player Authenticated Endpoints (Bearer <deviceToken>)
  app.post('/api/devices/:deviceId/heartbeat', requireDeviceAuth, (req: AuthenticatedRequest, res: Response) => {
    const store = readStore();
    const dev = store.devices.find((d) => d.deviceId === req.device!.deviceId);
    if (!dev) {
      res.status(404).json({ error: 'Dispositivo não encontrado.' });
      return;
    }

    const now = new Date().toISOString();
    dev.status = 'ONLINE';
    dev.lastSeenAt = now;
    dev.lastIpAddress = String(req.body?.ipAddress || req.ip || dev.lastIpAddress || '');
    if (typeof req.body?.currentPlaylistVersion === 'number') {
      dev.currentPlaylistVersion = req.body.currentPlaylistVersion;
    }
    if (typeof req.body?.storageFreeBytes === 'number') {
      dev.storageFreeBytes = req.body.storageFreeBytes;
    }
    if (typeof req.body?.cacheBytes === 'number') {
      dev.cacheBytes = Math.max(0, Math.round(req.body.cacheBytes));
    }
    if (typeof req.body?.appVersion === 'string') {
      dev.appVersion = req.body.appVersion.slice(0, 32);
    }
    if (typeof req.body?.osVersion === 'string') {
      dev.osVersion = req.body.osVersion.slice(0, 48);
    }
    if (typeof req.body?.deviceModel === 'string') {
      dev.deviceModel = req.body.deviceModel.slice(0, 64);
    }
    const hw = sanitizeHardwarePayload(req.body?.hardware);
    if (hw) {
      dev.hardware = { ...(dev.hardware || {}), ...hw };
      if (!dev.deviceModel && hw.model) dev.deviceModel = hw.model;
    }

    if (dev.screenId) {
      const scrIdx = store.screens.findIndex((s) => s.id === dev.screenId);
      if (scrIdx !== -1) {
        store.screens[scrIdx].lastSeenAt = now;
      }
    }

    // Deliver pending remote commands to the APK immediately on heartbeat
    const pendingCommands = store.deviceCommands.filter(
      (c) => c.deviceId === dev.deviceId && c.status === 'PENDING'
    );
    for (const cmd of pendingCommands) {
      cmd.status = 'DELIVERED';
      cmd.deliveredAt = now;
    }

    evaluateScreenHealthAndSyncAlerts(store);
    writeStore(store);
    res.json({
      ok: true,
      lastSeenAt: now,
      status: dev.status,
      settings: dev.settings,
      pendingCommands,
    });
  });

  app.get('/api/devices/:deviceId/commands/pending', requireDeviceAuth, (req: AuthenticatedRequest, res: Response) => {
    const store = readStore();
    const deviceId = req.device!.deviceId;
    const now = new Date().toISOString();
    const active = store.deviceCommands.filter(
      (c) =>
        c.deviceId === deviceId &&
        (c.status === 'PENDING' || c.status === 'DELIVERED')
    );
    for (const cmd of active) {
      if (cmd.status === 'PENDING') {
        cmd.status = 'DELIVERED';
        cmd.deliveredAt = now;
      }
    }
    writeStore(store);
    res.json(active);
  });

  app.post('/api/devices/:deviceId/commands/:commandId/ack', requireDeviceAuth, (req: AuthenticatedRequest, res: Response) => {
    const store = readStore();
    const deviceId = req.device!.deviceId;
    const commandId = String(req.params.commandId);
    const cmd = store.deviceCommands.find(
      (c) => c.id === commandId && c.deviceId === deviceId
    );
    if (!cmd) {
      res.status(404).json({ error: 'Comando não encontrado.' });
      return;
    }

    const now = new Date().toISOString();
    const failed = req.body?.status === 'FAILED';
    cmd.status = failed ? 'FAILED' : 'EXECUTED';
    cmd.executedAt = now;
    cmd.resultMessage =
      typeof req.body?.resultMessage === 'string'
        ? req.body.resultMessage.slice(0, 240)
        : failed
        ? 'Falha na execução no dispositivo.'
        : 'Executado com sucesso no APK.';

    const dev = store.devices.find((d) => d.deviceId === deviceId);
    if (dev && !failed) {
      if (cmd.command === 'CLEAR_CACHE') {
        dev.cacheBytes = 0;
        dev.lastCacheClearedAt = now;
      }
      const hw = sanitizeHardwarePayload(req.body?.hardware);
      if (hw) {
        dev.hardware = { ...(dev.hardware || {}), ...hw };
        if (hw.model) dev.deviceModel = hw.model;
      }
      if (typeof req.body?.storageFreeBytes === 'number') {
        dev.storageFreeBytes = req.body.storageFreeBytes;
      }
    }

    writeStore(store);
    res.json({ ok: true, command: cmd });
  });

  app.get('/api/devices/:deviceId/config', requireDeviceAuth, (req: AuthenticatedRequest, res: Response) => {
    const store = readStore();
    const dev = store.devices.find((d) => d.deviceId === req.device!.deviceId);
    if (!dev) {
      res.status(404).json({ error: 'Dispositivo não encontrado.' });
      return;
    }

    const screen = dev.screenId
      ? store.screens.find((s) => s.id === dev.screenId) || null
      : null;

    const display = buildApkDisplayPolicy(screen, dev.settings);

    res.json({
      deviceId: dev.deviceId,
      orientation: display.orientation,
      display,
      settings: dev.settings,
      screen: screen
        ? {
            id: screen.id,
            name: screen.name,
            orientation: screen.orientation,
            status: screen.status,
          }
        : null,
    });
  });

  // Fast, Clear & Objective Sync Endpoint (1 call: delta check + display policy + commands + playlist)
  app.get('/api/devices/:deviceId/sync', requireDeviceAuth, (req: AuthenticatedRequest, res: Response) => {
    const store = readStore();
    const dev = store.devices.find((d) => d.deviceId === req.device!.deviceId);
    if (!dev) {
      res.status(404).json({ error: 'Dispositivo não encontrado.' });
      return;
    }

    const now = new Date().toISOString();
    const screen = dev.screenId
      ? store.screens.find((s) => s.id === dev.screenId) || null
      : null;
    const display = buildApkDisplayPolicy(screen, dev.settings);
    const playlist = screen ? resolveScreenPlaylist(screen, store.playlists) : null;
    const enabledItems = playlist
      ? playlist.items.filter((it) => it.enabled !== false)
      : [];

    const knownVersion = Number(req.query.v ?? req.query.knownVersion ?? -1);
    const currentVersion = playlist ? playlist.version : 0;
    const changed = !playlist || knownVersion !== currentVersion;

    // Deliver pending commands immediately on sync
    const pendingCommands = store.deviceCommands.filter(
      (c) => c.deviceId === dev.deviceId && c.status === 'PENDING'
    );
    for (const cmd of pendingCommands) {
      cmd.status = 'DELIVERED';
      cmd.deliveredAt = now;
    }
    dev.lastSeenAt = now;
    dev.status = 'ONLINE';
    if (screen) screen.lastSeenAt = now;
    evaluateScreenHealthAndSyncAlerts(store);
    writeStore(store);

    const mediaMap = new Map(
      store.midias
        .filter((m) => m.status !== 'ARCHIVED')
        .map((m) => [m.id, m])
    );

    res.json({
      ok: true,
      protocol: 'ta-on-midia-v2',
      serverTime: now,
      deviceId: dev.deviceId,
      playlistVersion: currentVersion,
      changed,
      display,
      settings: {
        syncIntervalSeconds: dev.settings.syncIntervalSeconds,
        heartbeatIntervalSeconds: dev.settings.heartbeatIntervalSeconds,
        startOnBoot: dev.settings.startOnBoot,
        kioskMode: dev.settings.kioskMode,
        watchdogEnabled: dev.settings.watchdogEnabled !== false,
        autoLaunchDelaySeconds: dev.settings.autoLaunchDelaySeconds ?? 3,
        volume: dev.settings.volume,
        muted: dev.settings.muted,
        fastSyncEnabled: dev.settings.fastSyncEnabled !== false,
      },
      commands: pendingCommands,
      playlist:
        changed && playlist && enabledItems.length > 0
          ? {
              id: playlist.id,
              name: playlist.name,
              version: playlist.version,
              playbackMode: playlist.playbackMode,
              items: enabledItems.map((it) => {
                const asset = it.itemType === 'media' ? mediaMap.get(it.refId) : undefined;
                const itemFit: MediaFitMode =
                  asset?.fitMode || display.fitMode || 'FIT_NO_CROP';
                const resolvedQr = it.qrCode ?? asset?.qrCode ?? null;
                return {
                  id: it.id,
                  type: it.itemType,
                  refId: it.refId,
                  label: it.label,
                  durationSec: it.durationSeconds,
                  templateKey: it.templateKey || null,
                  qrCode:
                    resolvedQr && resolvedQr.enabled && resolvedQr.url
                      ? resolvedQr
                      : null,
                  media: asset
                    ? {
                        url: asset.url,
                        mediaType: asset.mediaType,
                        mimeType: asset.mimeType,
                        checksum: asset.checksum || null,
                        widthPx: asset.widthPx || 1920,
                        heightPx: asset.heightPx || 1080,
                        aspectRatio: asset.aspectRatio || '16:9',
                        fitMode: itemFit,
                        exoResizeMode: 'RESIZE_MODE_FIT',
                        imageScaleType:
                          itemFit === 'NATIVE_NO_UPSCALE'
                            ? 'CENTER_INSIDE'
                            : 'FIT_CENTER',
                        allowUpscale: !display.preventUpscaleBlur,
                        preventCrop: display.preventCrop,
                        preventStretch: display.preventStretch,
                        preventBlurBackdrop: display.preventBlurBackdrop,
                        backgroundColor: display.backgroundColor,
                        qrCode:
                          resolvedQr && resolvedQr.enabled && resolvedQr.url
                            ? resolvedQr
                            : null,
                      }
                    : null,
                };
              }),
            }
          : null,
    });
  });

  // Real-time SSE Push Stream (<100ms notification to APK on publish/settings/command)
  app.get('/api/devices/:deviceId/stream', requireDeviceAuth, (req: AuthenticatedRequest, res: Response) => {
    const deviceId = req.device!.deviceId;
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    let set = deviceStreams.get(deviceId);
    if (!set) {
      set = new Set<Response>();
      deviceStreams.set(deviceId, set);
    }
    set.add(res);

    res.write(
      `event: connected\ndata: ${JSON.stringify({
        deviceId,
        protocol: 'ta-on-midia-v2',
        timestamp: new Date().toISOString(),
      })}\n\n`
    );

    const keepAlive = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        clearInterval(keepAlive);
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(keepAlive);
      const currentSet = deviceStreams.get(deviceId);
      if (currentSet) {
        currentSet.delete(res);
        if (currentSet.size === 0) deviceStreams.delete(deviceId);
      }
    });
  });

  app.get('/api/devices/:deviceId/playlist', requireDeviceAuth, (req: AuthenticatedRequest, res: Response) => {
    const store = readStore();
    const dev = store.devices.find((d) => d.deviceId === req.device!.deviceId);
    if (!dev) {
      res.status(404).json({ error: 'Dispositivo não encontrado.' });
      return;
    }

    const screen = dev.screenId
      ? store.screens.find((s) => s.id === dev.screenId) || null
      : null;
    if (!screen) {
      res.status(204).end();
      return;
    }

    const playlist = resolveScreenPlaylist(screen, store.playlists);
    if (!playlist) {
      res.status(204).end();
      return;
    }

    const enabledItems = playlist.items.filter((it) => it.enabled !== false);
    if (enabledItems.length === 0) {
      res.status(204).end();
      return;
    }

    const display = buildApkDisplayPolicy(screen, dev.settings);

    const mediaMap = new Map(store.midias.map((m) => [m.id, m]));
    res.json({
      screen,
      display,
      playlist: {
        ...playlist,
        items: enabledItems.map((it) => {
          const asset = it.itemType === 'media' ? mediaMap.get(it.refId) : undefined;
          const resolvedQr = it.qrCode ?? asset?.qrCode ?? null;
          return {
            ...it,
            qrCode:
              resolvedQr && resolvedQr.enabled && resolvedQr.url
                ? resolvedQr
                : null,
          };
        }),
      },
      mediaAssets: store.midias
        .filter((m) => m.status !== 'ARCHIVED')
        .map((m) => ({
          ...m,
          fitMode: m.fitMode || display.fitMode,
          exoResizeMode: display.exoResizeMode,
          imageScaleType: display.imageScaleType,
          allowUpscale: !display.preventUpscaleBlur,
        })),
      dynamicContents: store.dynamicContents,
    });
  });

  app.post('/api/devices/:deviceId/playback-events', requireDeviceAuth, (req: AuthenticatedRequest, res: Response) => {
    const store = readStore();
    const dev = store.devices.find((d) => d.deviceId === req.device!.deviceId);
    if (!dev) {
      res.status(404).json({ error: 'Dispositivo não encontrado.' });
      return;
    }

    const rawEvents = Array.isArray(req.body?.events) ? req.body.events : [req.body];
    const now = new Date().toISOString();
    const accepted: PlaybackEventRecord[] = [];

    for (const ev of rawEvents) {
      if (!ev || !ev.mediaId) continue;
      const mediaId = String(ev.mediaId);
      const playlistId = ev.playlistId ? String(ev.playlistId) : null;
      const media = store.midias.find((m) => m.id === mediaId);
      const playlist = playlistId ? store.playlists.find((p) => p.id === playlistId) : null;

      const record: PlaybackEventRecord = {
        id: `ev-${crypto.randomUUID().slice(0, 8)}`,
        deviceId: dev.deviceId,
        mediaId,
        mediaName: String(ev.mediaName || media?.name || mediaId),
        playlistId,
        playlistName: playlist?.name || null,
        playedSeconds: Math.max(0, Math.round(Number(ev.playedSeconds) || 0)),
        completed: ev.completed !== false,
        startedAt: typeof ev.startedAt === 'string' ? ev.startedAt : now,
        endedAt: typeof ev.endedAt === 'string' ? ev.endedAt : now,
        createdAt: now,
      };
      accepted.push(record);
    }

    store.playbackEvents = [...accepted, ...store.playbackEvents].slice(0, 2000);
    writeStore(store);
    res.status(201).json({ accepted: accepted.length });
  });

  // -------- PLAYBACK SUMMARY REPORT (spec 3.8) --------
  app.get('/api/reports/playback-summary', requireAuth, (req: Request, res: Response) => {
    const filterDeviceId = req.query.deviceId ? String(req.query.deviceId).trim().toUpperCase() : '';
    const fromDate = req.query.from ? new Date(String(req.query.from)) : null;
    const toDate = req.query.to ? new Date(String(req.query.to)) : null;
    const rawLimit = Number(req.query.limit || 50);
    const limit = Math.max(1, Math.min(200, Number.isFinite(rawLimit) ? rawLimit : 50));

    const store = readStore();
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;

    const targetDevices = store.devices.filter(
      (d) => !filterDeviceId || d.deviceId === filterDeviceId
    );

    const summaries: DevicePlaybackSummary[] = targetDevices.slice(0, limit).map((dev) => {
      const screen = dev.screenId
        ? store.screens.find((s) => s.id === dev.screenId) || null
        : null;
      const events = store.playbackEvents.filter((ev) => {
        if (ev.deviceId !== dev.deviceId) return false;
        const ts = new Date(ev.endedAt).getTime();
        if (fromDate && !Number.isNaN(fromDate.getTime()) && ts < fromDate.getTime()) return false;
        if (toDate && !Number.isNaN(toDate.getTime()) && ts > toDate.getTime() + 86400000) return false;
        return true;
      });

      const totalPlayedSeconds = events.reduce((s, e) => s + e.playedSeconds, 0);
      const activePlayedSeconds = events
        .filter((e) => e.completed)
        .reduce((s, e) => s + e.playedSeconds, 0);
      const completedEvents = events.filter((e) => e.completed).length;
      const lastPlaybackAt = events.length > 0 ? events[0].endedAt : null;
      const isActiveRecently = Boolean(
        dev.lastSeenAt && new Date(dev.lastSeenAt).getTime() >= tenMinutesAgo
      );

      return {
        deviceId: dev.deviceId,
        deviceName: dev.name,
        screenName: screen ? screen.name : null,
        status: dev.status,
        isActiveRecently,
        totalPlayedSeconds,
        activePlayedSeconds,
        totalEvents: events.length,
        completedEvents,
        lastPlaybackAt,
        lastSeenAt: dev.lastSeenAt,
      };
    });

    res.json(summaries);
  });

  // -------- CAMPANHAS & ACESSOS --------
  app.get('/api/campaigns', requireAuth, (_req: Request, res: Response) => {
    const store = readStore();
    res.json(store.campaigns);
  });

  app.post('/api/campaigns', requireAuth, (req: Request, res: Response) => {
    const name = String(req.body?.name || '').trim();
    const advertiserName = String(req.body?.advertiserName || '').trim();
    if (!name || !advertiserName) {
      res.status(400).json({ error: 'Informe nome da campanha e anunciante.' });
      return;
    }
    const created = {
      id: `cmp-${crypto.randomUUID().slice(0, 8)}`,
      name,
      advertiserId: String(req.body?.advertiserId || 'adv-1'),
      advertiserName,
      startDate: String(req.body?.startDate || '25/11/2026'),
      endDate: String(req.body?.endDate || '25/12/2026'),
      screenCount: Number(req.body?.screenCount || 4),
      impressions: 0,
      status: 'No Ar' as const,
    };
    const store = readStore();
    store.campaigns = [created, ...store.campaigns];
    writeStore(store);
    res.status(201).json(created);
  });

  app.get('/api/client-accesses', requireAuth, (_req: Request, res: Response) => {
    const store = readStore();
    res.json(store.clientAccesses);
  });

  app.post('/api/client-accesses', requireAuth, (req: Request, res: Response) => {
    const company = String(req.body?.company || '').trim();
    const contactName = String(req.body?.contactName || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!company || !contactName || !email) {
      res.status(400).json({ error: 'Preencha empresa, responsável e e-mail.' });
      return;
    }
    const created = {
      id: `acc-${crypto.randomUUID().slice(0, 8)}`,
      company,
      contactName,
      email,
      screensCount: Number(req.body?.screensCount || 2),
      permission: (req.body?.permission || 'Visualização') as 'Visualização' | 'Gestor de Mídia' | 'Administrador',
      status: 'Ativo' as const,
      lastLogin: 'Convite enviado',
    };
    const store = readStore();
    store.clientAccesses = [created, ...store.clientAccesses];
    writeStore(store);
    res.status(201).json(created);
  });

  app.patch('/api/client-accesses/:id', requireAuth, (req: Request, res: Response) => {
    const id = String(req.params.id);
    const store = readStore();
    const index = store.clientAccesses.findIndex((c) => c.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Acesso não encontrado.' });
      return;
    }
    const current = store.clientAccesses[index];
    store.clientAccesses[index] = {
      ...current,
      status: current.status === 'Ativo' ? 'Suspenso' : 'Ativo',
    };
    writeStore(store);
    res.json(store.clientAccesses[index]);
  });

  // -------- PUBLIC PLAYER ROUTES (/player/:codigo) --------
  app.get('/api/player/:codigo', (req: Request, res: Response) => {
    const codigo = String(req.params.codigo || '').trim().toUpperCase();
    const store = readStore();
    const screenIndex = store.screens.findIndex((s) => s.uniqueCode === codigo);
    if (screenIndex === -1) {
      res.status(404).json({ error: 'Tela não encontrada para este código.' });
      return;
    }

    store.screens[screenIndex].lastSeenAt = new Date().toISOString();
    writeStore(store);

    const screen = store.screens[screenIndex];
    const resolved =
      resolveScreenPlaylist(screen, store.playlists) ||
      store.playlists.find((p) => p.id === screen.playlistId) ||
      store.playlists[0] ||
      null;
    const playlist = resolved
      ? { ...resolved, items: resolved.items.filter((it) => it.enabled !== false) }
      : null;

    res.json({
      screen,
      playlist,
      mediaAssets: store.midias.filter((m) => m.status !== 'ARCHIVED'),
      dynamicContents: store.dynamicContents,
    });
  });

  app.post('/api/player/:codigo/heartbeat', (req: Request, res: Response) => {
    const codigo = String(req.params.codigo || '').trim().toUpperCase();
    const store = readStore();
    const screenIndex = store.screens.findIndex((s) => s.uniqueCode === codigo);
    if (screenIndex === -1) {
      res.status(404).json({ error: 'Tela não encontrada.' });
      return;
    }
    store.screens[screenIndex].lastSeenAt = new Date().toISOString();
    writeStore(store);
    res.json({ ok: true, lastSeenAt: store.screens[screenIndex].lastSeenAt });
  });

  // -------- PACOTE ZIP ANDROID CAPACITOR (APENAS AMBIENTE DEV/PREVIEW) --------
  if (process.env.NODE_ENV !== 'production') {
    app.get('/api/system/android-zip', requireAuth, (_req: Request, res: Response) => {
      const zipPath = path.resolve(process.cwd(), 'ta-on-midia-android-capacitor.zip');
      if (!fs.existsSync(zipPath)) {
        res.status(404).json({
          error: 'Arquivo ZIP Android ainda não foi gerado no servidor.',
        });
        return;
      }
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="ta-on-midia-android-capacitor.zip"'
      );
      res.sendFile(zipPath);
    });
  }

  // -------- ALERTAS PREVENTIVOS & PUSH DE TELAS OFFLINE --------
  app.get('/api/alerts', requireAuth, (_req: Request, res: Response) => {
    const store = readStore();
    const result = evaluateScreenHealthAndSyncAlerts(store);
    if (result.changed) {
      writeStore(store);
    }
    const activeOfflineCount = store.networkAlerts.filter(
      (a) => a.type === 'SCREEN_OFFLINE' && !a.resolvedAt
    ).length;
    const unreadCount = store.networkAlerts.filter((a) => !a.read).length;
    res.json({
      alerts: store.networkAlerts,
      activeOfflineCount,
      unreadCount,
    });
  });

  app.get('/api/alerts/stream', requireAuth, (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    adminAlertStreams.add(res);
    const store = readStore();
    const evalResult = evaluateScreenHealthAndSyncAlerts(store);
    if (evalResult.changed) writeStore(store);

    res.write(
      `event: connected\ndata: ${JSON.stringify({
        alerts: store.networkAlerts,
        timestamp: new Date().toISOString(),
      })}\n\n`
    );

    const keepAlive = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        clearInterval(keepAlive);
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(keepAlive);
      adminAlertStreams.delete(res);
    });
  });

  app.post('/api/alerts/check', requireAuth, (_req: Request, res: Response) => {
    const store = readStore();
    const result = evaluateScreenHealthAndSyncAlerts(store);
    if (result.changed) {
      writeStore(store);
    }
    const activeOfflineCount = store.networkAlerts.filter(
      (a) => a.type === 'SCREEN_OFFLINE' && !a.resolvedAt
    ).length;
    const unreadCount = store.networkAlerts.filter((a) => !a.read).length;
    res.json({
      alerts: store.networkAlerts,
      newlyCreated: result.newlyCreated,
      resolvedAlerts: result.resolvedAlerts,
      activeOfflineCount,
      unreadCount,
    });
  });

  app.post('/api/alerts/read-all', requireAuth, (_req: Request, res: Response) => {
    const store = readStore();
    for (const alert of store.networkAlerts) {
      alert.read = true;
    }
    writeStore(store);
    res.json({ ok: true, alerts: store.networkAlerts });
  });

  app.patch('/api/alerts/:id/read', requireAuth, (req: Request, res: Response) => {
    const id = String(req.params.id);
    const store = readStore();
    const alert = store.networkAlerts.find((a) => a.id === id);
    if (!alert) {
      res.status(404).json({ error: 'Alerta não encontrado.' });
      return;
    }
    alert.read = true;
    if (req.body?.acknowledged) {
      alert.acknowledged = true;
    }
    writeStore(store);
    res.json(alert);
  });

  app.delete('/api/alerts/:id', requireAuth, (req: Request, res: Response) => {
    const id = String(req.params.id);
    const store = readStore();
    store.networkAlerts = store.networkAlerts.filter((a) => a.id !== id);
    writeStore(store);
    res.json({ ok: true });
  });

  // Evaluate screen health immediately at boot & every 30s for proactive SSE push
  const bootStore = readStore();
  if (evaluateScreenHealthAndSyncAlerts(bootStore).changed) {
    writeStore(bootStore);
  }
  setInterval(() => {
    try {
      const s = readStore();
      const resEval = evaluateScreenHealthAndSyncAlerts(s);
      if (resEval.changed) {
        writeStore(s);
      }
    } catch {
      // Non-fatal monitor tick
    }
  }, 30000);

  // -------- VITE MIDDLEWARE / STATIC DIST --------
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Tá On Mídia server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
