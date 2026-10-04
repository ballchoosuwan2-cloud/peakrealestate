/**
 * Utility functions to convert numbers into Thai Baht and English words
 */

const THAI_DIGITS = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
const THAI_POSITIONS = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

export function numberToThaiBaht(num: number | string): string {
  const n = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : num;
  if (isNaN(n) || n === 0) return 'ศูนย์บาทถ้วน';

  const isNegative = n < 0;
  const absNum = Math.abs(n);
  const [bahtStr, satangStr] = absNum.toFixed(2).split('.');

  function convertGroup(digits: string): string {
    let result = '';
    const len = digits.length;
    for (let i = 0; i < len; i++) {
      const digit = parseInt(digits[i], 10);
      const pos = len - i - 1;
      if (digit !== 0) {
        if (pos === 1 && digit === 1) {
          result += 'สิบ';
        } else if (pos === 1 && digit === 2) {
          result += 'ยี่สิบ';
        } else if (pos === 0 && digit === 1 && len > 1 && digits[len - 2] !== '0') {
          result += 'เอ็ด';
        } else {
          result += THAI_DIGITS[digit] + THAI_POSITIONS[pos];
        }
      }
    }
    return result;
  }

  let text = '';
  if (bahtStr.length > 6) {
    const millionPart = bahtStr.slice(0, bahtStr.length - 6);
    const restPart = bahtStr.slice(bahtStr.length - 6);
    text = convertGroup(millionPart) + 'ล้าน' + convertGroup(restPart);
  } else {
    text = convertGroup(bahtStr);
  }

  text = text ? text + 'บาท' : '';

  const satang = parseInt(satangStr, 10);
  if (satang === 0) {
    text += 'ถ้วน';
  } else {
    text += convertGroup(satangStr) + 'สตางค์';
  }

  return (isNegative ? 'ลบ' : '') + text;
}

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

export function numberToEnglishWords(num: number | string): string {
  const n = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : num;
  if (isNaN(n) || n === 0) return 'Zero baht';

  const isNegative = n < 0;
  const absNum = Math.abs(n);
  const [wholeStr, fracStr] = absNum.toFixed(2).split('.');

  function convertChunk(n: number): string {
    let s = '';
    if (n >= 100) {
      s += ONES[Math.floor(n / 100)] + ' hundred ';
      n %= 100;
    }
    if (n >= 20) {
      s += TENS[Math.floor(n / 10)] + (n % 10 !== 0 ? '-' + ONES[n % 10] : '') + ' ';
    } else if (n > 0) {
      s += ONES[n] + ' ';
    }
    return s.trim();
  }

  let whole = parseInt(wholeStr, 10);
  if (whole === 0) {
    return 'Zero baht';
  }

  const chunks: { value: number; label: string }[] = [];
  const scales = ['', 'thousand', 'million', 'billion'];
  let scaleIdx = 0;

  while (whole > 0 && scaleIdx < scales.length) {
    const rem = whole % 1000;
    if (rem > 0) {
      chunks.unshift({ value: rem, label: scales[scaleIdx] });
    }
    whole = Math.floor(whole / 1000);
    scaleIdx++;
  }

  let result = chunks
    .map((c) => {
      const words = convertChunk(c.value);
      return c.label ? `${words} ${c.label}` : words;
    })
    .join(' ');

  const frac = parseInt(fracStr, 10);
  if (frac > 0) {
    result += ` and ${frac}/100`;
  }
  result = result.trim() + ' baht';

  return (isNegative ? 'Negative ' : '') + result.charAt(0).toUpperCase() + result.slice(1);
}
