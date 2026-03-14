'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { apiPost } from '@/services/api-client';
import AppLayout from '@/layouts/AppLayout';

interface CreateResponse {
  id: string;
  title: string | null;
  status: string;
  createdAt: string;
}

export default function NewConversationPage() {
  const router = useRouter();
  const create = useMutation({
    mutationFn: () => apiPost<CreateResponse>('/api/conversations', {}),
    onSuccess: (data) => router.replace(`/conversations/${data.id}`),
  });

  useEffect(() => {
    if (!create.isPending && !create.isSuccess && !create.isError) {
      create.mutate();
    }
  }, []);

  if (create.isPending) {
    return (
      <AppLayout>
        <p>Creating conversation…</p>
      </AppLayout>
    );
  }
  if (create.isError) {
    return (
      <AppLayout>
        <p style={{ color: 'crimson' }}>Failed to create. Try again.</p>
        <button type="button" onClick={() => create.mutate()}>
          Retry
        </button>
      </AppLayout>
    );
  }
  return (
    <AppLayout>
      <p>Redirecting…</p>
    </AppLayout>
  );
}
