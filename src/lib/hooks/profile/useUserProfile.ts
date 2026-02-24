import { useMutation, useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/queryKeys';
import { queryClient } from '@/lib/query/queryClient';
import {
  getAvatarSignedUrl,
  updateMyProfile,
  uploadAvatarFromUri,
  upgradeAnonymousUser,
  type UpdateUserProfileInput,
  type UpgradeAnonymousUserInput,
} from '@/lib/api/services/profile';
import { useAuth } from '@/lib/hooks/auth/useAuth';
import { profileRepo } from '@/lib/database/sqlite/profile/repository';

export function useUserProfile() {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  return useQuery({
    queryKey: [...queryKeys.user.profile(), userId ?? ''],
    queryFn: () => profileRepo.getLocalProfile(userId!),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Geçerli storage path mi? file:// ve http(s) URL'leri kabul etmiyoruz; sadece bucket path (örn. userId/avatar.jpg).
 */
function isStoragePath(path: string | null | undefined): path is string {
  if (!path || typeof path !== 'string') return false;
  const t = path.trim();
  if (t === '') return false;
  if (t.startsWith('file://')) return false;
  if (t.startsWith('http://') || t.startsWith('https://')) return false;
  return true;
}

/**
 * Profil fotoğrafı için gösterilebilir URL (signed).
 * Path önce users_profile.image'dan, yoksa auth user_metadata.image'dan alınır (Supabase'de "users" tablosunda gördüğünüz).
 */
export function useAvatarUrl() {
  const { data: profile } = useUserProfile();
  const { user } = useAuth();
  const pathFromProfile = profile?.image ?? null;
  const pathFromAuth = (user?.user_metadata?.image as string) ?? null;
  const path = pathFromProfile ?? pathFromAuth;

  const storagePath = isStoragePath(path) ? path : null;
  const { data: signedUrl } = useQuery({
    queryKey: [...queryKeys.user.profile(), 'avatarUrl', storagePath] as const,
    queryFn: () => getAvatarSignedUrl(storagePath as string),
    enabled: !!storagePath,
    staleTime: 50 * 60 * 1000, // 50 dk (signed URL 1 saat geçerli)
  });

  return storagePath ? signedUrl ?? null : null;
}

export function useUpdateUserProfile() {
  return useMutation({
    mutationFn: (input: UpdateUserProfileInput) => updateMyProfile(input),
    onSuccess: async (data) => {
      if (data?.id) {
        await profileRepo.upsertLocalProfile(data.id, data);
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.user.profile() });
    },
  });
}

export function useUploadAvatar() {
  return useMutation({
    mutationFn: (uri: string) => uploadAvatarFromUri(uri),
  });
}

export function useUpgradeAnonymousUser() {
  return useMutation({
    mutationFn: (input: UpgradeAnonymousUserInput) => upgradeAnonymousUser(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.profile() });
    },
  });
}

