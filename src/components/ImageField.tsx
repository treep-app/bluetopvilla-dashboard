import React, { useRef, useState } from 'react';
import { api } from '../services/api';
import { mediaSrc } from '../lib/format';
import { buttonClass, ErrorNote, Icon } from './ui';

/** Single photo picker: uploads to the backend and hands back the URL to save. */
export const ImageField: React.FC<{ value: string | null; onChange: (url: string | null) => void; label?: string }> = ({
  value,
  onChange,
  label = 'Photo',
}) => {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      onChange((await api.uploadImage(file)).url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <span className="font-semibold text-[#161410] block">{label}</span>
      <div className="flex items-center gap-3">
        <div className="relative w-36 aspect-[4/3] rounded-lg overflow-hidden bg-[#e7ddd0] border border-[#cfc4b4]/40 shrink-0">
          {value ? (
            <img src={mediaSrc(value)} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-[#786f62]">
              <Icon name="image" className="text-2xl" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <button type="button" disabled={uploading} onClick={() => input.current?.click()} className={buttonClass.secondary}>
            <Icon name="upload" className="text-[16px]" />
            {uploading ? 'Uploading…' : value ? 'Replace' : 'Upload'}
          </button>
          {value ? (
            <button type="button" onClick={() => onChange(null)} className="text-[#ba1a1a] text-[11px] font-semibold text-left">
              Remove photo
            </button>
          ) : null}
        </div>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={(event) => void upload(event.target.files?.[0])}
        />
      </div>
      <ErrorNote message={error} />
    </div>
  );
};
