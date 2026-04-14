import { useState, useEffect, useCallback } from 'react';

interface UseCrudListOptions<T> {
  /** Async function that fetches the list. Must return T[] (unwrap pagination before passing). */
  loader: () => Promise<T[]>;
  /** Don't auto-load on mount (e.g. load depends on a filter that isn't ready yet) */
  skipInitialLoad?: boolean;
}

interface UseCrudListReturn<T> {
  data: T[];
  loading: boolean;
  modalOpen: boolean;
  editing: T | null;
  confirmId: string | null;
  load: () => Promise<void>;
  openCreate: () => void;
  openEdit: (item: T) => void;
  closeModal: () => void;
  handleDelete: (id: string) => void;
  /** Call with the delete service function. Clears confirmId and reloads. */
  doDelete: (deleteFn: (id: string) => Promise<void>) => Promise<void>;
  setConfirmId: React.Dispatch<React.SetStateAction<string | null>>;
}

/**
 * Generic hook that manages the repetitive state pattern found in every CRUD list page:
 * data, loading, modalOpen, editing, confirmId.
 *
 * The page is still responsible for:
 *  - form state (react-hook-form)
 *  - calling openCreate/openEdit BEFORE calling reset() on the form
 */
export function useCrudList<T>({
  loader,
  skipInitialLoad = false,
}: UseCrudListOptions<T>): UseCrudListReturn<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(!skipInitialLoad);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await loader();
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [loader]);

  useEffect(() => {
    if (!skipInitialLoad) load();
  }, [load, skipInitialLoad]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (item: T) => {
    setEditing(item);
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const handleDelete = (id: string) => setConfirmId(id);

  const doDelete = async (deleteFn: (id: string) => Promise<void>) => {
    if (!confirmId) return;
    await deleteFn(confirmId);
    setConfirmId(null);
    await load();
  };

  return {
    data,
    loading,
    modalOpen,
    editing,
    confirmId,
    load,
    openCreate,
    openEdit,
    closeModal,
    handleDelete,
    doDelete,
    setConfirmId,
  };
}
