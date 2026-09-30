import React, { useMemo, useState } from 'react';
import { useHotel } from '../context/HotelContext';
import { useApi, useMutation } from '../hooks/useApi';
import { api } from '../services/api';
import type { NewsletterSubscriber } from '../types/hotel';
import { formatDateTime } from '../lib/format';
import { Card, Empty, ErrorNote, Icon, inputClass, Loading, PageHeader } from '../components/ui';

export const NewsletterSubscribersView: React.FC = () => {
  const { hasPermission, property } = useHotel();
  const canManage = hasPermission('canManagePromotions');
  const [q, setQ] = useState('');
  const [draftQ, setDraftQ] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const listKey = useMemo(() => ({ q }), [q]);
  const list = useApi(() => api.newsletterSubscribers({ q: q || undefined, limit: 200 }), [listKey], true);
  const remove = useMutation(api.deleteNewsletterSubscriber);

  const onDelete = async (row: NewsletterSubscriber) => {
    if (!window.confirm(`Remove ${row.email} from the newsletter list?`)) return;
    await remove.run(row.id);
    setNotice(`Removed ${row.email}`);
    await list.reload();
  };

  const tz = property?.timezone;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 pb-16 sm:p-8">
      <PageHeader
        title="Newsletter subscribers"
        subtitle="Emails collected from the website footer — export-ready list for campaigns"
      />

      {notice ? (
        <div className="rounded-lg border border-[#006194]/20 bg-[#e8f4fc] px-4 py-2.5 text-xs font-medium text-[#006194]">
          {notice}
        </div>
      ) : null}
      {list.error ? <ErrorNote message={list.error} onRetry={() => list.reload()} /> : null}

      <Card className="p-4">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            setQ(draftQ.trim());
          }}
        >
          <label className="text-xs font-semibold text-[#786f62]">
            Search email
            <input
              value={draftQ}
              onChange={(e) => setDraftQ(e.target.value)}
              placeholder="Filter by email"
              className={`${inputClass} mt-1 w-64 max-w-full`}
            />
          </label>
          <button type="submit" className="rounded-lg bg-[#161410] px-3.5 py-2 text-xs font-bold text-[#f4efe6]">
            Apply
          </button>
        </form>
      </Card>

      {list.loading && !list.data ? (
        <Loading />
      ) : !list.data?.items.length ? (
        <Card>
          <Empty
            icon="mail"
            title="No subscribers yet"
            detail="When guests subscribe on the website footer, their emails appear here."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f4efe6] text-[10px] uppercase tracking-[0.14em] text-[#786f62]">
                <tr>
                  <th className="px-4 py-3 font-bold">Email</th>
                  <th className="px-4 py-3 font-bold">Source</th>
                  <th className="px-4 py-3 font-bold">Subscribed</th>
                  {canManage ? <th className="px-4 py-3 text-right font-bold">Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {list.data.items.map((row) => (
                  <tr key={row.id} className="border-t border-[#e7ddd0]">
                    <td className="px-4 py-3">
                      <a href={`mailto:${row.email}`} className="font-semibold text-[#006194] hover:underline">
                        {row.email}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-[#786f62]">{formatSource(row.source)}</td>
                    <td className="px-4 py-3 text-[11px] text-[#786f62]">{formatDateTime(row.createdAt, tz)}</td>
                    {canManage ? (
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <button
                          type="button"
                          className="text-[11px] font-bold text-[#ba1a1a]"
                          onClick={() => void onDelete(row)}
                          disabled={remove.pending}
                        >
                          Remove
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-[#e7ddd0] px-4 py-2 text-[11px] text-[#786f62]">
            <span>
              {list.data.items.length} of {list.data.total} subscriber{list.data.total === 1 ? '' : 's'}
            </span>
            <span className="flex items-center gap-1 text-[#786f62]/80">
              <Icon name="sync" className="text-[16px]" />
              Updates when guests subscribe on the site
            </span>
          </div>
        </Card>
      )}
    </div>
  );
};

function formatSource(source: string) {
  if (source === 'website_footer') return 'Website footer';
  return source.replace(/_/g, ' ');
}
