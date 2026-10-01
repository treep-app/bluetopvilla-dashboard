import React, { useState } from 'react';
import { Icon } from './ui';

function buildUrls(site: string, slug: string, title: string, schedule?: string) {
  const base = site.replace(/\/$/, '');
  const url = `${base}/whats-on/${slug}`;
  const previewImage = `${url}/opengraph-image`;
  const message = [title, 'at Blue Top Villa, Kasoa', schedule].filter(Boolean).join(' · ');
  const wa = `https://wa.me/?text=${encodeURIComponent(`${message}\n\n${url}`)}`;
  const fb = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  const x = `https://twitter.com/intent/tweet?${new URLSearchParams({ url, text: message }).toString()}`;
  return { url, previewImage, message, wa, fb, x };
}

type Props = {
  site: string;
  slug: string;
  title: string;
  schedule?: string;
  compact?: boolean;
};

export const EventShareTools: React.FC<Props> = ({ site, slug, title, schedule, compact }) => {
  const [copied, setCopied] = useState(false);
  const { url, previewImage, wa, fb, x } = buildUrls(site, slug, title, schedule);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt('Copy this link for social media:', url);
    }
  };

  const btn =
    'inline-flex items-center justify-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide transition';

  if (compact) {
    return (
      <div className="space-y-2 pt-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={() => void copy()} className={`${btn} border border-[#cfc4b4] bg-white text-[#161410] hover:bg-[#f4efe6]`}>
            <Icon name={copied ? 'check' : 'link'} className="text-[14px]" />
            {copied ? 'Copied' : 'Copy link'}
          </button>
          <a href={wa} target="_blank" rel="noreferrer" className={`${btn} bg-[#25D366] text-white`}>WhatsApp</a>
          <a href={fb} target="_blank" rel="noreferrer" className={`${btn} bg-[#1877F2] text-white`}>Facebook</a>
        </div>
        <p className="text-[10px] text-[#786f62]">Link opens the event page · preview shows event banner image</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#d99d26]/35 bg-[#fff8eb] p-4 space-y-3">
      <div className="flex items-start gap-2">
        <Icon name="share" className="text-[20px] text-[#d99d26] shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-[#161410]">Share on social media</p>
          <p className="text-[11px] text-[#786f62] mt-0.5">
            Share the link below — WhatsApp, Facebook, and Instagram show a branded event banner with photo, title, and
            price. Tapping opens your live event page.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#cfc4b4]/50 bg-[#161410]">
        <img src={previewImage} alt="" className="w-full aspect-[1200/630] object-cover" />
        <p className="px-2 py-1.5 text-[10px] text-[#cfc4b4] text-center">Social preview banner (1200×630)</p>
      </div>

      <div className="flex gap-2">
        <input
          readOnly
          value={url}
          className="flex-1 min-w-0 rounded-lg border border-[#cfc4b4]/60 bg-white px-2.5 py-2 text-[11px] text-[#3c3832] font-mono"
          onFocus={(e) => e.target.select()}
        />
        <button type="button" onClick={() => void copy()} className="shrink-0 rounded-lg bg-[#161410] px-3 py-2 text-[10px] font-bold text-white hover:bg-[#3c3832]">
          {copied ? 'Copied!' : 'Copy link'}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <a href={wa} target="_blank" rel="noreferrer" className={`${btn} bg-[#25D366] text-white`}>
          Share on WhatsApp
        </a>
        <a href={fb} target="_blank" rel="noreferrer" className={`${btn} bg-[#1877F2] text-white`}>
          Share on Facebook
        </a>
        <a href={x} target="_blank" rel="noreferrer" className={`${btn} border border-[#161410] text-[#161410] bg-white`}>
          Post on X
        </a>
        <a href={url} target="_blank" rel="noreferrer" className={`${btn} border border-[#cfc4b4] text-[#006194] bg-white`}>
          <Icon name="open_in_new" className="text-[14px]" />
          Open event page
        </a>
      </div>
    </div>
  );
};
