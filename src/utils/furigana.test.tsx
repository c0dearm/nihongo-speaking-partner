import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { renderFurigana } from './furigana';

describe('renderFurigana', () => {
  it('returns clean text when furiganaEnabled is false', () => {
    const { container } = render(<div>{renderFurigana('漢字(かんじ)を読む(よむ)', false)}</div>);
    expect(container.textContent).toBe('漢字を読む');
  });

  it('renders ruby tags when furiganaEnabled is true for bracket notation', () => {
    const { container } = render(<div>{renderFurigana('漢字(かんじ)を読む(よむ)', true)}</div>);
    const rubies = container.querySelectorAll('ruby');
    expect(rubies).toHaveLength(2);
    expect(rubies[0].textContent).toContain('漢字');
    expect(rubies[0].querySelector('rt')?.textContent).toBe('かんじ');
    expect(rubies[1].querySelector('rt')?.textContent).toBe('よむ');
  });

  it('renders ruby tags when furiganaEnabled is true for square brackets notation', () => {
    const { container } = render(<div>{renderFurigana('電車[でんしゃ]が止[と]まった', true)}</div>);
    const rubies = container.querySelectorAll('ruby');
    expect(rubies).toHaveLength(2);
    expect(rubies[0].textContent).toContain('電車');
    expect(rubies[0].querySelector('rt')?.textContent).toBe('でんしゃ');
    expect(rubies[1].querySelector('rt')?.textContent).toBe('と');
  });

  it('renders existing ruby HTML strings when furiganaEnabled is true', () => {
    const { container } = render(
      <div>{renderFurigana('<ruby>電車<rt>でんしゃ</rt></ruby>が来た', true)}</div>
    );
    const ruby = container.querySelector('ruby');
    expect(ruby).not.toBeNull();
    expect(ruby?.querySelector('rt')?.textContent).toBe('でんしゃ');
  });

  it('strips bracketed furigana even when there is optional whitespace between kanji and brackets', () => {
    const result = renderFurigana('私は漢字 [かんじ] を勉強 (べんきょう) しています', false);
    expect(result).toBe('私は漢字 を勉強 しています');
  });

  it('renders ruby annotations even when there is optional whitespace between kanji and brackets', () => {
    const { container } = render(<div>{renderFurigana('漢字 [かんじ]', true)}</div>);
    const ruby = container.querySelector('ruby');
    expect(ruby).not.toBeNull();
    expect(ruby?.textContent).toContain('漢字');
    expect(ruby?.querySelector('rt')?.textContent).toBe('かんじ');
  });

  it('does not wrap English parenthetical expressions in ruby tags when furigana is enabled', () => {
    const { container } = render(<div>{renderFurigana('Model A (v2)', true)}</div>);
    const rubies = container.querySelectorAll('ruby');
    expect(rubies).toHaveLength(0);
    expect(container.textContent).toBe('Model A (v2)');
  });
});

