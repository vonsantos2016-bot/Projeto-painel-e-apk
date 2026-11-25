-- Schema SQL para Supabase (TV Indoor, CRM Comercial & Ecossistema Android APK)
-- Execute este script no SQL Editor do seu projeto Supabase.

create extension if not exists "pgcrypto";

-- 1. Tabela de Anunciantes (CRM Kanban)
create table if not exists public.advertisers (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  segment text not null,
  contact_name text not null,
  whatsapp text not null,
  monthly_value numeric(12,2) not null default 0,
  stage text not null check (stage in ('Novo Contato', 'Negociação', 'Proposta Enviada', 'Fechado', 'Ativo')),
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Tabela de Mídias (referenciando o bucket público 'midias' + integridade SHA-256)
create table if not exists public.midias (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  file_path text not null,
  public_url text not null,
  media_type text not null check (media_type in ('image', 'video')),
  mime_type text not null,
  size_bytes bigint not null default 0,
  width_px int,
  height_px int,
  aspect_ratio text default '16:9',
  fit_mode text not null default 'FIT_NO_CROP' check (fit_mode in ('FIT_NO_CROP', 'NATIVE_NO_UPSCALE')),
  duration_seconds int default 10,
  checksum text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'ARCHIVED', 'DELETED')),
  qr_code jsonb not null default '{"enabled":false,"url":"","ctaText":"Aponte a câmera","position":"bottom-right","sizePercent":15}'::jsonb,
  created_at timestamptz not null default now()
);

-- 3. Tabela de Conteúdos Dinâmicos (Curiosidades, Dicas, Receitas, Horóscopo, Quiz)
create table if not exists public.dynamic_contents (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('curiosidades', 'dicas', 'receitas', 'horoscopo', 'quiz')),
  title text not null,
  subtitle text default '',
  body text not null,
  image_url text not null,
  extra_json jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 4. Playlists (Versionamento, Status DRAFT/PUBLISHED e Modo SEQUENTIAL/RANDOM)
create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  status text not null default 'DRAFT' check (status in ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  playback_mode text not null default 'SEQUENTIAL' check (playback_mode in ('SEQUENTIAL', 'RANDOM')),
  version int not null default 1,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.playlist_items (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  item_type text not null check (item_type in ('media', 'dynamic')),
  ref_id text not null,
  label text not null,
  duration_seconds int not null default 12,
  position int not null default 0,
  enabled boolean not null default true,
  qr_code jsonb
);

-- 5. Telas Lógicas (Screens)
create table if not exists public.screens (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text not null,
  city text not null,
  state text not null default 'SP',
  unique_code text not null unique,
  orientation text not null default 'LANDSCAPE' check (orientation in ('LANDSCAPE', 'PORTRAIT', 'AUTO')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE', 'MAINTENANCE')),
  playlist_id uuid references public.playlists(id) on delete set null,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

-- 6. Agendamento de Playlists por Janela de Horário & Prioridade (ScreenPlaylist)
create table if not exists public.screen_playlists (
  id uuid primary key default gen_random_uuid(),
  screen_id uuid not null references public.screens(id) on delete cascade,
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  starts_at text not null default '00:00',
  ends_at text not null default '23:59',
  priority int not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 7. Dispositivos Físicos Android / TV Box (Pareamento Seguro & Token Hash)
create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  device_id text not null unique,
  name text not null,
  screen_id uuid unique references public.screens(id) on delete set null,
  pairing_code_hash text,
  pairing_code_expires_at timestamptz,
  pairing_attempts int not null default 0,
  pairing_status text not null default 'PENDING' check (pairing_status in ('PENDING', 'PAIRED', 'UNPAIRED', 'BLOCKED')),
  access_token_hash text,
  status text not null default 'UNCONFIGURED' check (status in ('ONLINE', 'OFFLINE', 'BLOCKED', 'UNCONFIGURED')),
  last_seen_at timestamptz,
  last_ip_address text,
  app_version text,
  os_version text,
  device_model text,
  current_playlist_version int,
  storage_free_bytes bigint,
  cache_bytes bigint,
  last_cache_cleared_at timestamptz,
  hardware_json jsonb not null default '{}'::jsonb,
  last_error text,
  created_at timestamptz not null default now()
);

create table if not exists public.device_settings (
  device_id uuid primary key references public.devices(id) on delete cascade,
  sync_interval_seconds int not null default 30,
  heartbeat_interval_seconds int not null default 30,
  start_on_boot boolean not null default true,
  kiosk_mode boolean not null default true,
  watchdog_enabled boolean not null default true,
  auto_launch_delay_seconds int not null default 3,
  volume int not null default 80,
  muted boolean not null default false,
  screen_orientation text not null default 'LANDSCAPE' check (screen_orientation in ('LANDSCAPE', 'PORTRAIT', 'AUTO')),
  offline_mode_enabled boolean not null default true,
  timezone text not null default 'America/Sao_Paulo',
  media_fit_mode text not null default 'FIT_NO_CROP' check (media_fit_mode in ('FIT_NO_CROP', 'NATIVE_NO_UPSCALE')),
  prevent_crop boolean not null default true,
  prevent_stretch boolean not null default true,
  prevent_blur_backdrop boolean not null default true,
  prevent_upscale_blur boolean not null default true,
  solid_background_color text not null default '#000000',
  fast_sync_enabled boolean not null default true
);

-- 7b. Fila de Comandos Remotos para o APK (Limpar Cache, Boot/Kiosk, Hardware, Reiniciar)
create table if not exists public.device_commands (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  command text not null check (command in ('CLEAR_CACHE', 'FORCE_LAUNCH_BOOT', 'IDENTIFY_HARDWARE', 'FORCE_SYNC', 'RESTART_APP', 'REBOOT_DEVICE')),
  status text not null default 'PENDING' check (status in ('PENDING', 'DELIVERED', 'EXECUTED', 'FAILED')),
  requested_by text not null default 'Painel',
  payload jsonb not null default '{}'::jsonb,
  result_message text,
  created_at timestamptz not null default now(),
  delivered_at timestamptz,
  executed_at timestamptz
);

-- 8. Telemetria de Exibição (PlaybackEvents)
create table if not exists public.playback_events (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  media_id text not null,
  media_name text not null,
  playlist_id text,
  playlist_name text,
  played_seconds int not null default 0,
  completed boolean not null default true,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- 9. Bucket Público 'midias' no Supabase Storage
insert into storage.buckets (id, name, public)
values ('midias', 'midias', true)
on conflict (id) do update set public = true;

-- Políticas de acesso público de leitura e upload autenticado no bucket 'midias'
drop policy if exists "Leitura pública de mídias" on storage.objects;
create policy "Leitura pública de mídias"
  on storage.objects for select
  using (bucket_id = 'midias');

drop policy if exists "Upload autenticado de mídias" on storage.objects;
create policy "Upload autenticado de mídias"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'midias');

drop policy if exists "Exclusão autenticada de mídias" on storage.objects;
create policy "Exclusão autenticada de mídias"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'midias');

-- 10. Configurações de APIs Externas para Conteúdos Dinâmicos (RSS, Futebol, Imagens, Clima, JSON)
create table if not exists public.external_api_settings (
  id text primary key default 'default',
  rss_feeds jsonb not null default '[]'::jsonb,
  sports_api_key text not null default '',
  sports_api_provider text not null default 'api-football' check (sports_api_provider in ('api-football', 'football-data')),
  images_api_key text not null default '',
  images_api_provider text not null default 'pexels' check (images_api_provider in ('pexels', 'unsplash')),
  default_weather_city text not null default 'São Paulo',
  custom_json_api_url text not null default '',
  updated_at timestamptz not null default now()
);

-- 11. Alertas de Rede e Manutenção Preventiva (Telas Offline / Recuperadas)
create table if not exists public.network_alerts (
  id uuid primary key default gen_random_uuid(),
  screen_id text not null,
  screen_name text not null,
  screen_code text not null,
  location text not null default '',
  city text not null default '',
  device_id text,
  type text not null check (type in ('SCREEN_OFFLINE', 'SCREEN_RECOVERED')),
  severity text not null default 'warning' check (severity in ('critical', 'warning', 'resolved')),
  message text not null,
  offline_minutes int not null default 0,
  last_seen_at timestamptz,
  read boolean not null default false,
  acknowledged boolean not null default false,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);


