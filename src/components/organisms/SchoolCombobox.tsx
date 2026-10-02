import { useEffect, useState } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { toast } from 'react-toastify';
import { schoolService } from '../../services/schoolService';
import type { School, SchoolRef } from '../../types';
import { cn } from '@/lib/utils';
import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Spinner,
} from '@/components/ui';

const ALL = '__all__';
const CREATE = '__create__';

/**
 * Same key as the backend `toSchoolSearchKey` (accent-insensitive) — used to hide "Tạo trường"
 * when a school with the same folded name already exists ("Dong Do" vs "Đông Đô").
 */
const searchKey = (s: string) =>
  s
    .normalize('NFC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');

/**
 * Searchable school picker backed by `GET /schools?search=` (debounced). Optionally offers
 * "Tạo trường “…”" (POST /schools) and an "all schools" entry that maps to `null`.
 */
const SchoolCombobox = ({
  value,
  onChange,
  allowCreate = false,
  allLabel,
  placeholder = 'Chọn trường…',
  id,
  className,
  invalid,
}: {
  value: SchoolRef | null;
  onChange: (school: SchoolRef | null) => void;
  allowCreate?: boolean;
  /** When set, shows a first option with this label that clears the selection. */
  allLabel?: string;
  placeholder?: string;
  id?: string;
  className?: string;
  invalid?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  // Results tagged with the (trimmed) query they were fetched for
  const [fetched, setFetched] = useState<{ query: string; list: School[] }>({
    query: '',
    list: [],
  });
  const results = fetched.list;
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const search = query.trim();
    const timer = setTimeout(() => {
      setLoading(true);
      schoolService
        .getAll({ search: search || undefined, limit: 50 }, controller.signal)
        .then((list) => {
          if (!controller.signal.aborted) setFetched({ query: search, list });
        })
        .catch(() => {
          if (!controller.signal.aborted) setFetched({ query: search, list: [] });
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, query]);

  const select = (school: SchoolRef | null) => {
    onChange(school ? { _id: school._id, name: school.name, address: school.address } : null);
    setOpen(false);
  };

  const typed = query.trim();
  // Only decide from results of the CURRENT query (not stale ones still on screen)
  const canCreate =
    allowCreate &&
    !!typed &&
    !loading &&
    fetched.query === typed &&
    !results.some((s) => searchKey(s.name) === searchKey(typed));

  const create = async () => {
    setCreating(true);
    try {
      select(await schoolService.create({ name: typed }));
    } catch {
      toast.error('Không tạo được trường, vui lòng thử lại.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setQuery('');
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid || undefined}
          className={cn(
            'w-full justify-between font-normal',
            invalid && 'border-destructive',
            className,
          )}
        >
          <span className={cn('truncate', !value && 'text-muted-foreground')}>
            {value?.name ?? allLabel ?? placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0"
        align="start"
        style={{ width: 'max(var(--radix-popover-trigger-width), 240px)' }}
      >
        <Command shouldFilter={false}>
          <CommandInput placeholder="Tìm trường…" value={query} onValueChange={setQuery} />
          <CommandList>
            {!loading && !canCreate && <CommandEmpty>Không có trường phù hợp.</CommandEmpty>}
            {loading && results.length === 0 && (
              <div className="flex justify-center py-4">
                <Spinner size="sm" />
              </div>
            )}
            <CommandGroup>
              {allLabel && !typed && (
                <CommandItem value={ALL} onSelect={() => select(null)}>
                  <Check className={cn('mr-2 h-4 w-4', value ? 'opacity-0' : 'opacity-100')} />
                  {allLabel}
                </CommandItem>
              )}
              {results.map((s) => (
                <CommandItem key={s._id} value={s._id} onSelect={() => select(s)}>
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value?._id === s._id ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <span className="truncate">{s.name}</span>
                </CommandItem>
              ))}
              {canCreate && (
                <CommandItem value={CREATE} disabled={creating} onSelect={create}>
                  {creating ? (
                    <Spinner size="sm" className="mr-2" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  <span className="truncate">Tạo trường “{typed}”</span>
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default SchoolCombobox;
