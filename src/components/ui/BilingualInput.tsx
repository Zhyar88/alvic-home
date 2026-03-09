import React from 'react';
import { Input, Textarea } from './Input';

interface BilingualInputProps {
  labelEn: string;
  labelKu: string;
  valueEn: string;
  valueKu: string;
  onChangeEn: (value: string) => void;
  onChangeKu: (value: string) => void;
  required?: boolean;
  type?: 'text' | 'textarea';
  rows?: number;
  errorEn?: string;
  errorKu?: string;
  placeholderEn?: string;
  placeholderKu?: string;
}

export function BilingualInput({
  labelEn,
  labelKu,
  valueEn,
  valueKu,
  onChangeEn,
  onChangeKu,
  required,
  type = 'text',
  rows = 2,
  errorEn,
  errorKu,
  placeholderEn,
  placeholderKu,
}: BilingualInputProps) {
  if (type === 'textarea') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Textarea
          label={labelEn}
          value={valueEn}
          onChange={e => onChangeEn(e.target.value)}
          required={required}
          rows={rows}
          error={errorEn}
          placeholder={placeholderEn}
        />
        <div dir="rtl">
          <Textarea
            label={labelKu}
            value={valueKu}
            onChange={e => onChangeKu(e.target.value)}
            required={required}
            rows={rows}
            error={errorKu}
            placeholder={placeholderKu}
            className="text-right font-['Noto+Sans+Arabic',_system-ui]"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Input
        label={labelEn}
        value={valueEn}
        onChange={e => onChangeEn(e.target.value)}
        required={required}
        error={errorEn}
        placeholder={placeholderEn}
      />
      <div dir="rtl">
        <Input
          label={labelKu}
          value={valueKu}
          onChange={e => onChangeKu(e.target.value)}
          required={required}
          error={errorKu}
          placeholder={placeholderKu}
          className="text-right"
        />
      </div>
    </div>
  );
}
