import React, { useState } from 'react';
import { useHotel } from '../context/HotelContext';
import { useApi, useMutation } from '../hooks/useApi';
import { api } from '../services/api';
import type { CalendarEvent, EventSpace, EventType } from '../types/hotel';
import { eventSchedule, mediaSrc, WEEKDAYS } from '../lib/format';
import { ImageField } from '../components/ImageField';
import { buttonClass, Card, Empty, ErrorNote, Field, Icon, inputClass, Loading, Modal, PageHeader, Tabs } from '../components/ui';

type Tab = 'calendar' | 'types' | 'spaces';

const EVENT_TYPE_ICONS: Array<{ key: string; label: string; symbol: string }> = [
  { key: 'heart', label: 'Heart (weddings)', symbol: 'favorite' },
  { key: 'cake', label: 'Cake (celebrations)', symbol: 'cake' },
  { key: 'building', label: 'Building (corporate)', symbol: 'apartment' },
  { key: 'music', label: 'Music', symbol: 'music_note' },
  { key: 'glass', label: 'Glass (drinks)', symbol: 'wine_bar' },
  { key: 'briefcase', label: 'Briefcase (meetings)', symbol: 'work' },
  { key: 'sparkles', label: 'Sparkles', symbol: 'auto_awesome' },
];
const typeSymbol = (icon: string | null) => EVENT_TYPE_ICONS.find((item) => item.key === icon)?.symbol ?? 'auto_awesome';

const textareaClass = 'w-full p-2.5 rounded-lg border border-[#cfc4b4]/60 text-xs focus:border-[#d99d26] focus:outline-none';

const Thumb: React.FC<{ url: string | null }> = ({ url }) => (
  <div className="relative w-28 aspect-[4/3] rounded-lg overflow-hidden bg-[#e7ddd0] shrink-0">
    {url ? (
      <img src={mediaSrc(url)} alt="" className="absolute inset-0 w-full h-full object-cover" />
    ) : (
      <div className="absolute inset-0 flex items-center justify-center text-[#786f62]">
        <Icon name="image" className="text-2xl" />
      </div>
    )}
  </div>
);

const Visibility: React.FC<{ shown: boolean; extra?: React.ReactNode }> = ({ shown, extra }) => (
  <span className="flex items-center gap-1.5">
    {shown ? (
      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">On website</span>
    ) : (
      <span className="px-2 py-0.5 rounded-full bg-[#e7ddd0] text-[#786f62] text-[10px] font-bold">Hidden</span>
    )}
    {extra}
  </span>
);

/** Delete button that asks first and shows the API's reason when it refuses. */
const DeleteButton: React.FC<{ label: string; onDelete: () => Promise<unknown> }> = ({ label, onDelete }) => {
  const remove = useMutation(onDelete);
  return (
    <span className="flex flex-col items-end gap-1">
      <button
        disabled={remove.pending}
        onClick={() => window.confirm(`Delete ${label}? This can't be undone.`) && void remove.run()}
        className="text-[#ba1a1a] font-semibold hover:underline disabled:opacity-50"
      >
        Delete
      </button>
      {remove.error ? <span className="text-[11px] text-[#ba1a1a] max-w-xs text-right">{remove.error}</span> : null}
    </span>
  );
};

// ------------------------------------------------------------------ calendar

const EventEditor: React.FC<{ event: CalendarEvent | null; types: EventType[]; onClose: () => void }> = ({
  event,
  types,
  onClose,
}) => {
  const [form, setForm] = useState({
    title: event?.title ?? '',
    description: event?.description ?? '',
    eventType: event?.eventType ?? types[0]?.title ?? '',
    location: event?.location ?? '',
    imageUrl: event?.imageUrl ?? null,
    isPublic: event?.isPublic ?? true,
    mode: event?.recurrenceDays.length ? ('weekly' as const) : ('once' as const),
    startsAt: event?.startsAt ?? '',
    recurrenceDays: event?.recurrenceDays ?? [],
    recurrenceTime: event?.recurrenceTime ?? '',
  });
  const save = useMutation(async () => {
    const body = {
      title: form.title.trim(),
      description: form.description,
      eventType: form.eventType.trim(),
      location: form.location,
      imageUrl: form.imageUrl,
      isPublic: form.isPublic,
      startsAt: form.mode === 'once' ? form.startsAt : null,
      recurrenceDays: form.mode === 'weekly' ? form.recurrenceDays : [],
      recurrenceTime: form.mode === 'weekly' ? form.recurrenceTime : null,
    };
    return event ? api.updateEvent(event.id, body) : api.createEvent(body);
  });

  const toggleDay = (day: number) =>
    setForm((current) => ({
      ...current,
      recurrenceDays: current.recurrenceDays.includes(day)
        ? current.recurrenceDays.filter((item) => item !== day)
        : [...current.recurrenceDays, day].sort(),
    }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await save.run()) onClose();
  };

  return (
    <Modal
      title={event ? `Edit ${event.title}` : 'New event'}
      subtitle="Listed in the public calendar on /events"
      icon="event"
      onClose={onClose}
      width="max-w-2xl"
      footer={
        <>
          <button type="button" onClick={onClose} className={buttonClass.secondary}>
            Cancel
          </button>
          <button type="submit" form="event-form" disabled={save.pending} className={buttonClass.primary}>
            {save.pending ? 'Saving…' : event ? 'Save changes' : 'Create event'}
          </button>
        </>
      }
    >
      <form id="event-form" onSubmit={submit} className="space-y-4">
        <ErrorNote message={save.error} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Title *">
            <input required minLength={2} maxLength={120} className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Friday Night Live" />
          </Field>
          <Field label="Kind of event">
            <input
              list="event-kinds"
              maxLength={60}
              className={inputClass}
              value={form.eventType}
              onChange={(e) => setForm({ ...form, eventType: e.target.value })}
              placeholder="e.g. Live music"
            />
            <datalist id="event-kinds">
              {types.map((type) => (
                <option key={type.id} value={type.title} />
              ))}
            </datalist>
          </Field>
        </div>
        <Field label="Description">
          <textarea rows={3} maxLength={4000} className={textareaClass} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>

        <div className="space-y-2 p-3.5 rounded-xl bg-[#e7ddd0] border border-[#cfc4b4]/30">
          <Tabs
            value={form.mode}
            onChange={(mode) => setForm({ ...form, mode })}
            options={[
              { value: 'once', label: 'One date' },
              { value: 'weekly', label: 'Repeats weekly' },
            ]}
          />
          {form.mode === 'once' ? (
            <Field label="Starts (villa time) *">
              <input type="datetime-local" required className={`${inputClass} w-60`} value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
            </Field>
          ) : (
            <div className="space-y-2">
              <span className="font-semibold text-[#161410] block">Every</span>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map((label, day) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-3 py-1.5 rounded-lg font-semibold border ${
                      form.recurrenceDays.includes(day) ? 'bg-[#d99d26] text-white border-[#d99d26]' : 'bg-white border-[#cfc4b4]/60 text-[#3c3832]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <Field label="Starts at (villa time) *">
                <input type="time" required className={`${inputClass} w-32`} value={form.recurrenceTime} onChange={(e) => setForm({ ...form, recurrenceTime: e.target.value })} />
              </Field>
              {form.recurrenceDays.length === 0 ? <p className="text-amber-800">Pick at least one day.</p> : null}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
          <Field label="Where at the villa">
            <input maxLength={120} className={inputClass} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Poolside terrace" />
          </Field>
          <label className="flex items-center gap-2 h-9 mt-5 font-semibold text-[#161410] cursor-pointer">
            <input type="checkbox" checked={form.isPublic} onChange={(e) => setForm({ ...form, isPublic: e.target.checked })} />
            Show on the website
          </label>
        </div>
        <ImageField value={form.imageUrl} onChange={(imageUrl) => setForm({ ...form, imageUrl })} />
      </form>
    </Modal>
  );
};

const CalendarTab: React.FC<{ canEdit: boolean }> = ({ canEdit }) => {
  const events = useApi(() => api.events());
  const types = useApi(() => api.eventTypes());
  const [editing, setEditing] = useState<CalendarEvent | null | undefined>(undefined);
  const [showPast, setShowPast] = useState(false);
  const list = (events.data ?? []).filter((event) => showPast || !event.isPast);
  const pastCount = (events.data ?? []).filter((event) => event.isPast).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-[#786f62]">
          Hosted events guests can attend — live music, brunches, party nights. Past one-off events leave the website automatically.
        </p>
        {canEdit ? (
          <button onClick={() => setEditing(null)} className={buttonClass.primary}>
            <Icon name="add" />
            New event
          </button>
        ) : null}
      </div>
      <ErrorNote message={events.error} onRetry={events.reload} />
      {events.loading && !events.data ? (
        <Loading />
      ) : !list.length ? (
        <Card>
          <Empty icon="event" title="No events on the calendar" detail="The website shows a “request venue hire” message until you add one." />
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((event) => (
            <Card key={event.id} className={`p-4 flex gap-4 items-start ${event.isPast ? 'opacity-60' : ''}`}>
              <Thumb url={event.imageUrl} />
              <div className="flex-1 min-w-0 text-xs space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-[#161410]">{event.title}</span>
                  <Visibility shown={event.isPublic && !event.isPast} extra={event.isPast ? <span className="text-[10px] font-bold text-[#786f62]">Past</span> : null} />
                </div>
                <div className="text-[#d99d26] font-semibold">{eventSchedule(event)}</div>
                <div className="text-[#786f62]">
                  {event.eventType}
                  {event.location ? ` · ${event.location}` : ''}
                  {event.reservations ? ` · ${event.reservations} reservation(s)` : ''}
                </div>
                {event.description ? <p className="text-[#3c3832] line-clamp-2">{event.description}</p> : null}
              </div>
              {canEdit ? (
                <div className="flex flex-col items-end gap-2 text-xs">
                  <button onClick={() => setEditing(event)} className={buttonClass.secondary}>
                    <Icon name="edit" className="text-[16px]" />
                    Edit
                  </button>
                  <DeleteButton label={event.title} onDelete={() => api.deleteEvent(event.id)} />
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}
      {pastCount ? (
        <button onClick={() => setShowPast(!showPast)} className="text-xs text-[#d99d26] font-semibold">
          {showPast ? 'Hide past events' : `Show ${pastCount} past event(s)`}
        </button>
      ) : null}
      {editing !== undefined ? <EventEditor event={editing} types={types.data ?? []} onClose={() => setEditing(undefined)} /> : null}
    </div>
  );
};

// ------------------------------------------------------------- event types

const EventTypeEditor: React.FC<{ type: EventType | null; onClose: () => void }> = ({ type, onClose }) => {
  const [form, setForm] = useState({
    title: type?.title ?? '',
    tagline: type?.tagline ?? '',
    description: type?.description ?? '',
    highlights: type?.highlights.length ? type.highlights : [''],
    icon: type?.icon ?? 'sparkles',
    imageUrl: type?.imageUrl ?? null,
    sortOrder: type ? String(type.sortOrder) : '',
    isPublished: type?.isPublished ?? true,
  });
  const save = useMutation(async () => {
    const body = {
      title: form.title.trim(),
      tagline: form.tagline,
      description: form.description,
      highlights: form.highlights.map((item) => item.trim()).filter(Boolean),
      icon: form.icon,
      imageUrl: form.imageUrl,
      isPublished: form.isPublished,
      ...(form.sortOrder ? { sortOrder: Number(form.sortOrder) } : {}),
    };
    return type ? api.updateEventType(type.id, body) : api.createEventType(body);
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await save.run()) onClose();
  };

  return (
    <Modal
      title={type ? `Edit ${type.title}` : 'New event type'}
      subtitle="Shown on /events, the home page and as an option in the venue enquiry form"
      icon="celebration"
      onClose={onClose}
      width="max-w-2xl"
      footer={
        <>
          <button type="button" onClick={onClose} className={buttonClass.secondary}>
            Cancel
          </button>
          <button type="submit" form="event-type-form" disabled={save.pending} className={buttonClass.primary}>
            {save.pending ? 'Saving…' : type ? 'Save changes' : 'Create event type'}
          </button>
        </>
      }
    >
      <form id="event-type-form" onSubmit={submit} className="space-y-4">
        <ErrorNote message={save.error} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Name *">
            <input required minLength={2} maxLength={60} className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Birthdays" />
          </Field>
          <Field label="Tagline">
            <input maxLength={80} className={inputClass} value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} placeholder="e.g. Ceremony to last dance" />
          </Field>
        </div>
        <Field label="Description">
          <textarea rows={3} maxLength={2000} className={textareaClass} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <div className="space-y-2">
          <span className="font-semibold text-[#161410] block">Highlights (up to 6)</span>
          {form.highlights.map((item, index) => (
            <div key={index} className="flex gap-2">
              <input
                maxLength={80}
                className={inputClass}
                value={item}
                placeholder="e.g. Outdoor & indoor spaces"
                onChange={(e) => setForm({ ...form, highlights: form.highlights.map((h, i) => (i === index ? e.target.value : h)) })}
              />
              <button type="button" onClick={() => setForm({ ...form, highlights: form.highlights.filter((_, i) => i !== index) })} className="text-[#ba1a1a] p-1">
                <Icon name="close" className="text-[18px]" />
              </button>
            </div>
          ))}
          {form.highlights.length < 6 ? (
            <button type="button" onClick={() => setForm({ ...form, highlights: [...form.highlights, ''] })} className={buttonClass.secondary}>
              <Icon name="add" className="text-[16px]" />
              Add highlight
            </button>
          ) : null}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <Field label="Icon">
            <select className={inputClass} value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}>
              {EVENT_TYPE_ICONS.map((icon) => (
                <option key={icon.key} value={icon.key}>
                  {icon.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Position">
            <input type="number" min={0} max={1000} className={inputClass} value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} placeholder="Last" />
          </Field>
          <label className="flex items-center gap-2 h-9 font-semibold text-[#161410] cursor-pointer">
            <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} />
            Show on the website
          </label>
        </div>
        <ImageField value={form.imageUrl} onChange={(imageUrl) => setForm({ ...form, imageUrl })} />
      </form>
    </Modal>
  );
};

const EventTypesTab: React.FC<{ canEdit: boolean }> = ({ canEdit }) => {
  const types = useApi(() => api.eventTypes());
  const [editing, setEditing] = useState<EventType | null | undefined>(undefined);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-[#786f62]">The kinds of private events the villa hosts. Each one is also an option in the venue enquiry form.</p>
        {canEdit ? (
          <button onClick={() => setEditing(null)} className={buttonClass.primary}>
            <Icon name="add" />
            New event type
          </button>
        ) : null}
      </div>
      <ErrorNote message={types.error} onRetry={types.reload} />
      {types.loading && !types.data ? (
        <Loading />
      ) : !types.data?.length ? (
        <Card>
          <Empty icon="celebration" title="No event types yet" />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {types.data.map((type) => (
            <Card key={type.id} className="p-4 flex gap-4 items-start">
              <Thumb url={type.imageUrl} />
              <div className="flex-1 min-w-0 text-xs space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Icon name={typeSymbol(type.icon)} className="text-[16px] text-[#d99d26]" />
                  <span className="text-sm font-bold text-[#161410]">{type.title}</span>
                  <Visibility shown={type.isPublished} />
                </div>
                {type.tagline ? <div className="text-[#8d4b00] font-semibold">{type.tagline}</div> : null}
                {type.highlights.length ? <div className="text-[#786f62]">{type.highlights.join(' · ')}</div> : null}
                {canEdit ? (
                  <div className="flex items-start justify-between pt-2">
                    <button onClick={() => setEditing(type)} className={buttonClass.small}>
                      Edit
                    </button>
                    <DeleteButton label={type.title} onDelete={() => api.deleteEventType(type.id)} />
                  </div>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}
      {editing !== undefined ? <EventTypeEditor type={editing} onClose={() => setEditing(undefined)} /> : null}
    </div>
  );
};

// ------------------------------------------------------------------ spaces

const SpaceEditor: React.FC<{ space: EventSpace | null; onClose: () => void }> = ({ space, onClose }) => {
  const [form, setForm] = useState({
    title: space?.title ?? '',
    detail: space?.detail ?? '',
    tag: space?.tag ?? '',
    imageUrl: space?.imageUrl ?? null,
    href: space?.href ?? '',
    sortOrder: space ? String(space.sortOrder) : '',
    isPublished: space?.isPublished ?? true,
  });
  const save = useMutation(async () => {
    const body = {
      title: form.title.trim(),
      detail: form.detail,
      tag: form.tag,
      imageUrl: form.imageUrl,
      href: form.href.trim() || null,
      isPublished: form.isPublished,
      ...(form.sortOrder ? { sortOrder: Number(form.sortOrder) } : {}),
    };
    return space ? api.updateEventSpace(space.id, body) : api.createEventSpace(body);
  });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await save.run()) onClose();
  };
  return (
    <Modal
      title={space ? `Edit ${space.title}` : 'New space'}
      subtitle="A card in the “Spaces” section of /events"
      icon="deck"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={buttonClass.secondary}>
            Cancel
          </button>
          <button type="submit" form="space-form" disabled={save.pending} className={buttonClass.primary}>
            {save.pending ? 'Saving…' : space ? 'Save changes' : 'Create space'}
          </button>
        </>
      }
    >
      <form id="space-form" onSubmit={submit} className="space-y-4">
        <ErrorNote message={save.error} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Name *">
            <input required minLength={2} maxLength={80} className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Poolside terrace" />
          </Field>
          <Field label="Label">
            <input maxLength={30} className={inputClass} value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} placeholder="e.g. Outdoor" />
          </Field>
        </div>
        <Field label="Short description">
          <textarea rows={2} maxLength={400} className={textareaClass} value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <Field label="Links to">
            <input maxLength={120} className={inputClass} value={form.href} onChange={(e) => setForm({ ...form, href: e.target.value })} placeholder="/venue (default)" />
          </Field>
          <Field label="Position">
            <input type="number" min={0} max={1000} className={inputClass} value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} placeholder="Last" />
          </Field>
          <label className="flex items-center gap-2 h-9 font-semibold text-[#161410] cursor-pointer">
            <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} />
            Show on the website
          </label>
        </div>
        <ImageField value={form.imageUrl} onChange={(imageUrl) => setForm({ ...form, imageUrl })} />
      </form>
    </Modal>
  );
};

const SpacesTab: React.FC<{ canEdit: boolean }> = ({ canEdit }) => {
  const spaces = useApi(() => api.eventSpaces());
  const [editing, setEditing] = useState<EventSpace | null | undefined>(undefined);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-[#786f62]">The areas of the villa available for events — lawn, reception room, guest rooms.</p>
        {canEdit ? (
          <button onClick={() => setEditing(null)} className={buttonClass.primary}>
            <Icon name="add" />
            New space
          </button>
        ) : null}
      </div>
      <ErrorNote message={spaces.error} onRetry={spaces.reload} />
      {spaces.loading && !spaces.data ? (
        <Loading />
      ) : !spaces.data?.length ? (
        <Card>
          <Empty icon="deck" title="No spaces yet" />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {spaces.data.map((space) => (
            <Card key={space.id} className="overflow-hidden text-xs">
              <div className="relative aspect-[16/10] bg-[#e7ddd0]">
                {space.imageUrl ? <img src={mediaSrc(space.imageUrl)} alt="" className="absolute inset-0 w-full h-full object-cover" /> : null}
                {space.tag ? (
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 text-white text-[10px] font-bold uppercase">{space.tag}</span>
                ) : null}
              </div>
              <div className="p-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-[#161410]">{space.title}</span>
                  <Visibility shown={space.isPublished} />
                </div>
                {space.detail ? <p className="text-[#3c3832] line-clamp-2">{space.detail}</p> : null}
                <div className="text-[#786f62]">Links to {space.href || '/venue'}</div>
                {canEdit ? (
                  <div className="flex items-start justify-between pt-2">
                    <button onClick={() => setEditing(space)} className={buttonClass.small}>
                      Edit
                    </button>
                    <DeleteButton label={space.title} onDelete={() => api.deleteEventSpace(space.id)} />
                  </div>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}
      {editing !== undefined ? <SpaceEditor space={editing} onClose={() => setEditing(undefined)} /> : null}
    </div>
  );
};

// -------------------------------------------------------------------- view

export const EventsContentView: React.FC = () => {
  const { hasPermission } = useHotel();
  const canEdit = hasPermission('canManageContent');
  const [tab, setTab] = useState<Tab>('calendar');
  const site = ((import.meta.env.VITE_SITE_URL as string | undefined) ?? 'http://localhost:3000').replace(/\/$/, '');

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto pb-16">
      <PageHeader
        title="Events page"
        subtitle="Everything on the website's /events page — the calendar, event types and venue spaces"
        actions={
          <>
            <Tabs
              value={tab}
              onChange={setTab}
              options={[
                { value: 'calendar', label: 'Calendar' },
                { value: 'types', label: 'Event types' },
                { value: 'spaces', label: 'Spaces' },
              ]}
            />
            <a href={`${site}/events`} target="_blank" rel="noreferrer" className={buttonClass.secondary}>
              <Icon name="open_in_new" className="text-[16px]" />
              View page
            </a>
          </>
        }
      />
      {tab === 'calendar' && <CalendarTab canEdit={canEdit} />}
      {tab === 'types' && <EventTypesTab canEdit={canEdit} />}
      {tab === 'spaces' && <SpacesTab canEdit={canEdit} />}
    </div>
  );
};
