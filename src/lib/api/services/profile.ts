import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';
// Expo SDK 54: legacy functions throw unless imported from /legacy
import * as FileSystem from 'expo-file-system/legacy';

type UsersProfileRow = Database['public']['Tables']['users_profile']['Row'];

export type UserProfile = Pick<
  UsersProfileRow,
  'id' | 'name' | 'surname' | 'image' | 'is_anonymous' | 'created_at' | 'updated_at'
>;

export type UpdateUserProfileInput = {
  name?: string | null;
  surname?: string | null;
  image?: string | null;
  is_anonymous?: boolean;
};

async function getRequiredAuthUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
  }
  return data.user.id;
}

export async function getMyProfile(): Promise<UserProfile> {
  const userId = await getRequiredAuthUserId();

  // NOTE: We cast to `any` to avoid type inference issues in some TS setups.
  const { data, error } = await (supabase as any)
    .from('users_profile')
    .select('id,name,surname,image,is_anonymous,created_at,updated_at')
    .eq('id', userId)
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Profil alınamadı.');
  }

  return data;
}

export async function updateMyProfile(
  input: UpdateUserProfileInput
): Promise<UserProfile> {
  const userId = await getRequiredAuthUserId();

  // NOTE: We cast to `any` to avoid type inference issues in some TS setups.
  const { data, error } = await (supabase as any)
    .from('users_profile')
    .update(input)
    .eq('id', userId)
    .select('id,name,surname,image,is_anonymous,created_at,updated_at')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Profil güncellenemedi.');
  }

  return data;
}

export type UploadAvatarResult = {
  path: string;
};

function guessFileExtension(uri: string): string {
  const regex = /\.([a-zA-Z0-9]+)$/;
  const result = regex.exec(uri.split('?')[0]);
  const ext = result?.[1]?.toLowerCase();
  if (!ext) return 'jpg';
  if (ext === 'jpeg') return 'jpg';
  return ext;
}

async function uriToBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error('Avatar okunamadı.');
  }
  return await response.blob();
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

async function uriToBytes(uri: string): Promise<{ bytes: Uint8Array; size: number | null }> {
  // Prefer FileSystem for local URIs (Expo Go / Android content:// / iOS file://).
  const info = await (FileSystem.getInfoAsync as any)(uri).catch(() => null);
  const size = (info as any)?.size ?? null;
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: 'base64' as any,
  });
  const bytes = base64ToUint8Array(base64);
  return { bytes, size };
}

export async function uploadAvatarFromUri(uri: string): Promise<UploadAvatarResult> {
  const userId = await getRequiredAuthUserId();
  const ext = guessFileExtension(uri);

  // Use a stable name to overwrite previous avatar
  const path = `${userId}/avatar.${ext}`;

  // Read local file bytes. fetch(file://).blob() can be unreliable across platforms (0-byte blobs).
  let bytes: Uint8Array;
  let size: number | null;
  try {
    const res = await uriToBytes(uri);
    bytes = res.bytes;
    size = res.size;
  } catch (e) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'avatar-run1',hypothesisId:'U0',location:'src/lib/api/services/profile.ts:uploadAvatarFromUri',message:'uriToBytes failed',data:{uriScheme:uri.split(':')[0],errorMessage:e instanceof Error ? e.message : 'unknown'},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    throw e instanceof Error ? e : new Error('Avatar okunamadı.');
  }

  if (!bytes || bytes.byteLength === 0) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'avatar-run1',hypothesisId:'U1',location:'src/lib/api/services/profile.ts:uploadAvatarFromUri',message:'empty bytes',data:{uriScheme:uri.split(':')[0],ext,reportedSize:size},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    throw new Error('Seçilen görsel okunamadı (0 byte).');
  }

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'avatar-run1',hypothesisId:'U1',location:'src/lib/api/services/profile.ts:uploadAvatarFromUri',message:'prepared bytes',data:{uriScheme:uri.split(':')[0],ext,reportedSize:size,byteLength:bytes.byteLength},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, bytes, {
      upsert: true,
      contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
      cacheControl: '3600',
    });

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'avatar-run1',hypothesisId:'U2',location:'src/lib/api/services/profile.ts:uploadAvatarFromUri',message:'upload result',data:{hasError:!!error,errorMessage:error?.message ?? null},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  if (error) {
    throw new Error(error.message || 'Avatar yüklenemedi.');
  }

  return { path };
}

export async function getAvatarSignedUrl(path: string, expiresInSeconds = 60 * 60) {
  const { data, error } = await supabase.storage
    .from('avatars')
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || 'Avatar URL oluşturulamadı.');
  }

  return data.signedUrl;
}

export type UpgradeAnonymousUserInput = {
  email: string;
  password: string;
  name?: string | null;
  surname?: string | null;
  image?: string | null;
};

export async function upgradeAnonymousUser(input: UpgradeAnonymousUserInput) {
  // This is expected to be called by an authenticated (anonymous) session.
  const { data, error } = await supabase.auth.updateUser({
    email: input.email,
    password: input.password,
    data: {
      name: input.name ?? null,
      surname: input.surname ?? null,
      image: input.image ?? null,
    },
  });

  if (error || !data.user) {
    throw new Error(error?.message || 'Hesap yükseltilemedi.');
  }

  // Keep users_profile in sync, and mark as non-anonymous
  await updateMyProfile({
    name: input.name ?? null,
    surname: input.surname ?? null,
    image: input.image ?? null,
    is_anonymous: false,
  });

  return data.user;
}

