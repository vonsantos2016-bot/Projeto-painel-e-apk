export type NavSection =
  | 'dashboard'
  | 'acessos'
  | 'crm'
  | 'biblioteca'
  | 'conteudos'
  | 'playlists'
  | 'campanhas'
  | 'telas'
  | 'mapa'
  | 'relatorios';

export type CrmStage =
  | 'Novo Contato'
  | 'Negociação'
  | 'Proposta Enviada'
  | 'Fechado'
  | 'Ativo';

export const CRM_STAGES: CrmStage[] = [
  'Novo Contato',
  'Negociação',
  'Proposta Enviada',
  'Fechado',
  'Ativo',
];

export type ScreenOrientation = 'LANDSCAPE' | 'PORTRAIT' | 'AUTO';
export type ScreenStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'BLOCKED' | 'UNCONFIGURED';
export type PairingStatus = 'PENDING' | 'PAIRED' | 'UNPAIRED' | 'BLOCKED';
export type PlaylistStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type PlaybackMode = 'SEQUENTIAL' | 'RANDOM';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface Advertiser {
  id: string;
  companyName: string;
  segment: string;
  contactName: string;
  whatsapp: string;
  monthlyValue: number;
  stage: CrmStage;
  notes?: string;
  createdAt: string;
}

export type MediaFitMode = 'FIT_NO_CROP' | 'NATIVE_NO_UPSCALE';

export type QrCodePosition =
  | 'bottom-right'
  | 'bottom-left'
  | 'top-right'
  | 'top-left';

export type QrCodeSizePercent = 12 | 15 | 18;

export interface MediaQrCodeConfig {
  enabled: boolean;
  url: string;
  ctaText: string;
  position: QrCodePosition;
  sizePercent: QrCodeSizePercent;
}

export interface MediaAsset {
  id: string;
  name: string;
  url: string;
  mediaType: 'image' | 'video';
  mimeType: string;
  sizeBytes: number;
  resolution: string;
  widthPx?: number;
  heightPx?: number;
  aspectRatio?: string;
  fitMode?: MediaFitMode;
  durationSeconds: number;
  checksum?: string;
  status?: 'ACTIVE' | 'ARCHIVED';
  qrCode?: MediaQrCodeConfig | null;
  createdAt: string;
}

export type DynamicCategory =
  | 'curiosidades'
  | 'dicas'
  | 'receitas'
  | 'horoscopo'
  | 'quiz';

export type DynamicTemplateKey =
  | 'noticias'
  | 'esportes'
  | 'clima'
  | 'curiosidades'
  | 'dicas'
  | 'receitas'
  | 'horoscopo'
  | 'quiz';

export interface QuizOption {
  label: string;
  text: string;
}

export interface DynamicContentItem {
  id: string;
  category: DynamicCategory;
  title: string;
  subtitle: string;
  body: string;
  imageUrl: string;
  meta: {
    badge?: string;
    sign?: string;
    element?: string;
    luckyNumber?: string;
    prepTime?: string;
    servings?: string;
    ingredients?: string[];
    options?: QuizOption[];
    correctIndex?: number;
  };
}

export interface PlaylistItem {
  id: string;
  itemType: 'media' | 'dynamic';
  refId: string;
  label: string;
  durationSeconds: number;
  position?: number;
  enabled?: boolean;
  templateKey?: DynamicTemplateKey;
  qrCode?: MediaQrCodeConfig | null;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  status: PlaylistStatus;
  playbackMode: PlaybackMode;
  version: number;
  publishedAt: string | null;
  items: PlaylistItem[];
  updatedAt: string;
}

export interface ScreenPlaylistSchedule {
  id: string;
  playlistId: string;
  startsAt: string;
  endsAt: string;
  priority: number;
  isActive: boolean;
}

export interface ScreenDevice {
  id: string;
  name: string;
  location: string;
  city: string;
  state: string;
  uniqueCode: string;
  playlistId: string | null;
  orientation: ScreenOrientation;
  status: ScreenStatus;
  deviceId: string | null;
  schedules: ScreenPlaylistSchedule[];
  resolution: string;
  lastSeenAt: string | null;
  lat: number;
  lng: number;
}

export type DeviceCommandType =
  | 'CLEAR_CACHE'
  | 'FORCE_LAUNCH_BOOT'
  | 'IDENTIFY_HARDWARE'
  | 'FORCE_SYNC'
  | 'RESTART_APP'
  | 'REBOOT_DEVICE';

export type DeviceCommandStatus =
  | 'PENDING'
  | 'DELIVERED'
  | 'EXECUTED'
  | 'FAILED';

export interface DeviceCommand {
  id: string;
  deviceId: string;
  command: DeviceCommandType;
  status: DeviceCommandStatus;
  requestedBy: string;
  payload?: Record<string, unknown>;
  resultMessage?: string | null;
  createdAt: string;
  deliveredAt?: string | null;
  executedAt?: string | null;
}

export interface DeviceHardwareInfo {
  manufacturer?: string;
  brand?: string;
  model?: string;
  board?: string;
  cpuAbi?: string;
  cpuCores?: number;
  ramTotalMb?: number;
  storageTotalBytes?: number;
  screenWidthPx?: number;
  screenHeightPx?: number;
  androidSdk?: number;
  macAddress?: string;
  serialFingerprint?: string;
  isDeviceOwner?: boolean;
}

export interface ApkDisplayPolicy {
  orientation: ScreenOrientation;
  targetResolution: string;
  fitMode: MediaFitMode;
  exoResizeMode: 'RESIZE_MODE_FIT';
  imageScaleType: 'FIT_CENTER' | 'CENTER_INSIDE';
  preventCrop: boolean;
  preventStretch: boolean;
  preventBlurBackdrop: boolean;
  preventUpscaleBlur: boolean;
  backgroundColor: string;
}

export interface DeviceSettings {
  syncIntervalSeconds: number;
  heartbeatIntervalSeconds: number;
  startOnBoot: boolean;
  kioskMode: boolean;
  watchdogEnabled?: boolean;
  autoLaunchDelaySeconds?: number;
  volume: number;
  muted: boolean;
  screenOrientation: ScreenOrientation;
  offlineModeEnabled: boolean;
  timezone: string;
  mediaFitMode?: MediaFitMode;
  preventCrop?: boolean;
  preventStretch?: boolean;
  preventBlurBackdrop?: boolean;
  preventUpscaleBlur?: boolean;
  solidBackgroundColor?: string;
  fastSyncEnabled?: boolean;
}

export interface AndroidDevice {
  id: string;
  deviceId: string;
  name: string;
  screenId: string | null;
  pairingStatus: PairingStatus;
  pairingCodeExpiresAt: string | null;
  hasActivePairingCode: boolean;
  status: DeviceStatus;
  lastSeenAt: string | null;
  lastIpAddress: string | null;
  appVersion: string | null;
  osVersion: string | null;
  deviceModel: string | null;
  currentPlaylistVersion: number | null;
  storageFreeBytes: number | null;
  cacheBytes?: number | null;
  lastCacheClearedAt?: string | null;
  hardware?: DeviceHardwareInfo | null;
  recentCommands?: DeviceCommand[];
  lastError: string | null;
  settings: DeviceSettings;
  createdAt: string;
}

export interface PlaybackEventRecord {
  id: string;
  deviceId: string;
  mediaId: string;
  mediaName: string;
  playlistId: string | null;
  playlistName: string | null;
  playedSeconds: number;
  completed: boolean;
  startedAt: string;
  endedAt: string;
  createdAt: string;
}

export interface DevicePlaybackSummary {
  deviceId: string;
  deviceName: string;
  screenName: string | null;
  status: DeviceStatus;
  isActiveRecently: boolean;
  totalPlayedSeconds: number;
  activePlayedSeconds: number;
  totalEvents: number;
  completedEvents: number;
  lastPlaybackAt: string | null;
  lastSeenAt: string | null;
}

export interface CampaignItem {
  id: string;
  name: string;
  advertiserId: string;
  advertiserName: string;
  startDate: string;
  endDate: string;
  screenCount: number;
  impressions: number;
  status: 'No Ar' | 'Agendada' | 'Encerrada';
}

export interface ClientAccess {
  id: string;
  company: string;
  contactName: string;
  email: string;
  screensCount: number;
  permission: 'Visualização' | 'Gestor de Mídia' | 'Administrador';
  status: 'Ativo' | 'Suspenso';
  lastLogin: string;
}

export interface NewsArticle {
  id: string;
  source: string;
  title: string;
  summary: string;
  link: string;
  imageUrl: string;
  publishedAt: string;
}

export interface WeatherForecast {
  city: string;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  minTemp: number;
  maxTemp: number;
  daily: Array<{
    date: string;
    min: number;
    max: number;
    code: number;
  }>;
  updatedAt: string;
}

export interface SportsMatch {
  id: string;
  round: string;
  roundNumber?: number;
  dateLabel?: string;
  homeTeam: string;
  homeShort?: string;
  homeColor?: string;
  awayTeam: string;
  awayShort?: string;
  awayColor?: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  kickoff: string;
  stadium: string;
}

export interface StandingRow {
  pos: number;
  team: string;
  shortName?: string;
  color?: string;
  points: number;
  played: number;
  wins: number;
  draws?: number;
  losses?: number;
  gd: number;
  zone?: 'libertadores' | 'pre' | 'sulamericana' | 'z4';
}

export interface PlayerPayload {
  screen: ScreenDevice;
  playlist: Playlist | null;
  mediaAssets: MediaAsset[];
  dynamicContents: DynamicContentItem[];
}

export interface ExternalRssFeed {
  id: string;
  label: string;
  url: string;
  category: 'noticias' | 'esportes';
  enabled: boolean;
}

export interface ExternalApiSettings {
  rssFeeds: ExternalRssFeed[];
  sportsApiKey: string;
  sportsApiProvider: 'api-football' | 'football-data';
  imagesApiKey: string;
  imagesApiProvider: 'pexels' | 'unsplash';
  defaultWeatherCity: string;
  customJsonApiUrl: string;
  updatedAt: string;
}

export type NetworkAlertType = 'SCREEN_OFFLINE' | 'SCREEN_RECOVERED';
export type NetworkAlertSeverity = 'critical' | 'warning' | 'resolved';

export interface NetworkAlert {
  id: string;
  screenId: string;
  screenName: string;
  screenCode: string;
  location: string;
  city: string;
  deviceId: string | null;
  type: NetworkAlertType;
  severity: NetworkAlertSeverity;
  message: string;
  offlineMinutes: number;
  lastSeenAt: string | null;
  read: boolean;
  acknowledged: boolean;
  createdAt: string;
  resolvedAt: string | null;
}


