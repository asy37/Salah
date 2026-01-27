import { useMutation, useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/queryKeys';
import { queryClient } from '@/lib/query/queryClient';
import {
  getMyProfile,
  updateMyProfile,
  uploadAvatarFromUri,
  upgradeAnonymousUser,
  type UpdateUserProfileInput,
  type UpgradeAnonymousUserInput,
} from '@/lib/api/services/profile';

export function useUserProfile() {
  return useQuery({
    queryKey: queryKeys.user.profile(),
    queryFn: getMyProfile,
  });
}

export function useUpdateUserProfile() {
  return useMutation({
    mutationFn: (input: UpdateUserProfileInput) => updateMyProfile(input),
    onSuccess: () => {
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

