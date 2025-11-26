import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import type { Tag, CreateTagDto, UpdateTagDto } from '../../../types/tag';

export const tagKeys = { all: ['tags'] as const };

export const useTags = () => {
  return useQuery({
    queryKey: tagKeys.all,
    queryFn: async (): Promise<Tag[]> => {
      const response = await api.get('/tags');
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};

export const useCreateTag = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateTagDto) => {
      const res = await api.post('/tags', data);
      return res.data as Tag;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tagKeys.all });
    },
  });
};

export const useUpdateTag = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTagDto }) => {
      const res = await api.patch(`/tags/${id}`, data);
      return res.data as Tag;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tagKeys.all });
    },
  });
};

export const useDeleteTag = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/tags/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tagKeys.all });
    },
  });
};
