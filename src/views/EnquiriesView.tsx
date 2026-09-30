import React, { useState } from 'react';
import { useHotel } from '../context/HotelContext';
import { useApi, useMutation } from '../hooks/useApi';
import { api } from '../services/api';
import type { EnquiryStatus } from '../types/hotel';
import { formatDateTime, formatDay } from '../lib/format';
import { Card, Empty, ErrorNote, inputClass, Loading, PageHeader, Tabs } from '../components/ui';

const STATUSES: EnquiryStatus[] = ['PENDING', 'CONTACTED', 'CONFIRMED', 'DECLINED', 'CANCELLED'];
const STATUS_BADGE: Record<EnquiryStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-900',
  CONTACTED: 'bg-[#e7ddd0] text-[#1b2c38]',
  CONFIRMED: 'bg-emerald-100 text-emerald-800',
  DECLINED: 'bg-[#e7ddd0] text-[#786f62]',
  CANCELLED: 'bg-[#ffdad6] text-[#93000a]',
};

const StatusSelect: React.FC<{ value: EnquiryStatus; onChange: (status: EnquiryStatus) => void; disabled?: boolean }> = ({
  value,
  onChange,
  disabled,
}) => (
  <select
    value={value}
    disabled={disabled}
    onChange={(event) => onChange(event.target.value as EnquiryStatus)}
    className={`${inputClass} w-36 font-semibold ${STATUS_BADGE[value]}`}
  >
    {STATUSES.map((status) => (
      <option key={status} value={status}>
        {status.charAt(0) + status.slice(1).toLowerCase()}
      </option>
    ))}
  </select>
);

const Contact: React.FC<{ email: string | null; phone: string | null }> = ({ email, phone }) => (
  <div className="text-[11px] text-[#786f62] space-x-2">
    {phone ? <a href={`tel:${phone}`} className="text-[#d99d26] font-semibold">{phone}</a> : null}
    {email ? <a href={`mailto:${email}`} className="text-[#d99d26] font-semibold">{email}</a> : null}
  </div>
);

export const EnquiriesView: React.FC = () => {
  const { property } = useHotel();
  const [tab, setTab] = useState<'venue' | 'events' | 'contact'>('venue');
  const enquiries = useApi(() => api.enquiries());
  const updateVenue = useMutation(api.updateVenueEnquiry);
  const updateEvent = useMutation(api.updateEventReservation);
  const markRead = useMutation(api.markMessageRead);
  const data = enquiries.data;
  const tz = property?.timezone;

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto pb-16">
      <PageHeader
        title="Enquiries & messages"
        subtitle="Submitted through the website's venue, events and contact forms"
        actions={
          <Tabs
            value={tab}
            onChange={setTab}
            options={[
              { value: 'venue', label: `Venue hire (${data?.venue.filter((item) => item.status === 'PENDING').length ?? 0})` },
              { value: 'events', label: `Event reservations (${data?.events.filter((item) => item.status === 'PENDING').length ?? 0})` },
              { value: 'contact', label: `Messages (${data?.contact.filter((item) => !item.isRead).length ?? 0})` },
            ]}
          />
        }
      />

      <ErrorNote message={enquiries.error || updateVenue.error || updateEvent.error || markRead.error} onRetry={enquiries.reload} />

      {enquiries.loading && !data ? (
        <Loading />
      ) : !data ? null : tab === 'venue' ? (
        data.venue.length === 0 ? (
          <Card><Empty icon="celebration" title="No venue enquiries yet" /></Card>
        ) : (
          <div className="space-y-3">
            {data.venue.map((item) => (
              <Card key={item.id} className="p-4 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-bold text-sm text-[#161410]">
                      {item.customerName} · {item.eventType}
                    </div>
                    <div className="text-[11px] text-[#786f62]">
                      {item.reference} · received {formatDateTime(item.createdAt, tz)}
                    </div>
                    <Contact email={item.customerEmail} phone={item.customerPhone} />
                  </div>
                  <StatusSelect value={item.status} disabled={updateVenue.pending} onChange={(status) => void updateVenue.run(item.id, status)} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs bg-[#e7ddd0] rounded-lg p-3">
                  <div><span className="text-[#786f62]">Date</span><div className="font-semibold">{formatDay(item.eventDate)}{item.startTime ? ` · ${item.startTime}–${item.endTime ?? ''}` : ''}</div></div>
                  <div><span className="text-[#786f62]">Guests</span><div className="font-semibold">{item.guestCount}</div></div>
                  <div><span className="text-[#786f62]">Space</span><div className="font-semibold">{item.preferredVenue ?? '—'}</div></div>
                  <div><span className="text-[#786f62]">Budget</span><div className="font-semibold">{item.budgetRange ?? '—'}</div></div>
                </div>
                <div className="text-[11px] text-[#3c3832]">
                  Add-ons:{' '}
                  {[item.decoration && 'decoration', item.catering && 'catering', item.soundSystem && 'sound system', item.photography && 'photography']
                    .filter(Boolean)
                    .join(', ') || 'none'}
                </div>
                {item.notes ? <p className="text-xs text-[#3c3832] bg-white border border-[#e7ddd0] rounded-lg p-2">“{item.notes}”</p> : null}
              </Card>
            ))}
          </div>
        )
      ) : tab === 'events' ? (
        data.events.length === 0 ? (
          <Card><Empty icon="confirmation_number" title="No event reservations yet" /></Card>
        ) : (
          <div className="space-y-3">
            {data.events.map((item) => (
              <Card key={item.id} className="p-4 flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-bold text-sm text-[#161410]">
                    {item.attendeeName} · party of {item.partySize}
                    {item.visitDate ? ` · ${formatDay(item.visitDate)}` : ''}
                  </div>
                  <div className="text-[11px] text-[#786f62]">
                    {item.reference} · {item.eventTitle ?? 'General'} · received {formatDateTime(item.createdAt, tz)}
                  </div>
                  <Contact email={item.attendeeEmail} phone={item.attendeePhone} />
                  <div className="text-[11px] text-[#3c3832]">
                    {[item.arrivalTime && `arriving ${item.arrivalTime}`, item.celebrationType, item.vipTable && 'VIP table', item.bottleReservation && 'bottle reservation']
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                  {item.notes ? <p className="text-xs text-[#3c3832]">“{item.notes}”</p> : null}
                </div>
                <StatusSelect value={item.status} disabled={updateEvent.pending} onChange={(status) => void updateEvent.run(item.id, status)} />
              </Card>
            ))}
          </div>
        )
      ) : data.contact.length === 0 ? (
        <Card><Empty icon="mail" title="No messages yet" /></Card>
      ) : (
        <div className="space-y-3">
          {data.contact.map((item) => (
            <Card key={item.id} className={`p-4 space-y-1 ${item.isRead ? '' : 'border-[#d99d26]/50'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-bold text-sm text-[#161410] flex items-center gap-2">
                    {item.name}
                    {!item.isRead ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#d99d26] text-white">New</span> : null}
                  </div>
                  <div className="text-[11px] text-[#786f62]">{formatDateTime(item.createdAt, tz)}</div>
                  <Contact email={item.email} phone={item.phone} />
                </div>
                {!item.isRead ? (
                  <button
                    disabled={markRead.pending}
                    onClick={() => void markRead.run(item.id)}
                    className="px-2.5 py-1 rounded bg-[#e7ddd0] hover:bg-[#e7ddd0] text-[#d99d26] font-semibold text-[11px]"
                  >
                    Mark as read
                  </button>
                ) : null}
              </div>
              <p className="text-xs text-[#3c3832] whitespace-pre-line">{item.message}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
