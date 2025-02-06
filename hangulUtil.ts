/**
 * [(초성 번호) * 588 + (중성 번호) * 28 + (종성 번호)] + 44032('가')
 * 588 = 28 * 21
 */

const __init__: string[] = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ','ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']; // 19개
const __medial__: string[] = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ','ㅣ']; // 21개
const __final__: string[] = ['','ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']; // 28개

interface HangulType {
  isHangul: boolean,
  initial?: string,
  medial?: string,
  final?: string,
  char: string;
}

const FIRST_HANGUL = '가'.charCodeAt(0);
const LAST_HANGUL = '힣'.charCodeAt(0);

const _isHangul = (charCode: number) => charCode >= FIRST_HANGUL && charCode <= LAST_HANGUL

const _getHangulComponent = (charCode: number) => {
  const _offset = charCode - FIRST_HANGUL;
  const fin_code = _offset % 28;
  const medi_code = ((_offset - fin_code) / 28 ) % 21;
  const init_code = (((_offset - fin_code) / 28 ) - medi_code ) / 21;

  const [initial, medial, final] = [__init__[init_code], __medial__[medi_code], __final__[fin_code]];
  return { initial, medial, final };
}

export const separate = (str: string) => {
  const result: string[] = [];

  for(let i = 0; i < str.length; i++) {
    const _char = str.charAt(i);
    const _charCode = _char.charCodeAt(0);

    if(!_isHangul(_charCode)) {
      result.push(_char);
      continue;
    }

    const { initial, medial, final } = _getHangulComponent(_charCode);
    if(initial) result.push(initial);
    if(medial) result.push(medial);
    if(final) result.push(final);
  }
  return result;
};

/** 한글 초성 중성 종성 분리 후 CHAR 별로 객체화 */
export const separateToObject = (str: string): HangulType[] => {
  let result: HangulType[] = [];

  for(let i = 0; i < str.length; i++) {
    const char = str.charAt(i);
    const _charCode = char.charCodeAt(0);

    if(!_isHangul(_charCode)) {
      result.push({ isHangul :false, char });
      continue;
    }

    const { initial, medial, final } = _getHangulComponent(_charCode);
    result.push({ isHangul:true, initial, medial, final, char });
  }
  return result;
};

/** 한글 초성, 중성, 종성 합치기. */
interface CombineRule {
  check: (cuurent: string, last: string) => boolean;
  combine: (current: string, last: string) => string | null;
}

const _createCombineRule = (
  checker: (current: string, last: string) => boolean,
  combiner: (current: string, last: string) => string | null
): CombineRule => ({
  check: checker,
  combine: combiner
});

const hangulCombineRules: CombineRule[] = [
  // 종성 우선
  _createCombineRule(
    (current, last) => __final__.includes(current) && _isHangul(last.charCodeAt(0)),
    (current, last) => {
      const lastCharObj = separateToObject(last)[0];
      return lastCharObj && lastCharObj.final === ''
        ? String.fromCharCode(last.charCodeAt(0) + __final__.indexOf(current))
        : null;
    }
  ),

  // 초성 + 중성
  _createCombineRule(
    (current, last) => __medial__.includes(current) && __init__.includes(last),
    (current, last) =>
        String.fromCharCode(FIRST_HANGUL + __init__.indexOf(last) * 588 + __medial__.indexOf(current) * 28)
  ),
  // 최종 조합
  _createCombineRule(
    (current, last) => __medial__.includes(current) && _isHangul(last.charCodeAt(0)),
    (current, last) => {
      const lastCharObj = separateToObject(last)[0];
      const fin = lastCharObj?.final ?? '';
      return __init__.includes(fin)
        ? String.fromCharCode(last.charCodeAt(0) - __final__.indexOf(fin)) +
          String.fromCharCode(FIRST_HANGUL + __init__.indexOf(fin) * 588 + __medial__.indexOf(current) * 28)
        : null;
    }
  )
];

const _applyRule = (current: string, last: string): string | null => {
  for (const rule of hangulCombineRules) {
    if (!rule.check(current, last)) continue;

    const combined = rule.combine(current, last);
    if (combined === null) continue;

    return combined;
  }
  return null;
};

const _combineChars = (result: string, current: string): string => {
  if (!current) return result;

  const last = result.at(-1) ?? '';
  const combined = _applyRule(current, last);

  return combined
    ? result.slice(0, -1) + combined
    : result + current;
};

export const combine = (str: string): string => str.split('').reduce(_combineChars, '');



/**
 * 텍스트(text)를 PatternItem 배열로 변환한 후, 슬라이딩 윈도우 방식으로
 * 검색어(search)가 연속 매칭되는지 검사한다.
*/
type PatternItem = { full: string; initial: string | undefined };
export const searchByPattern = (text: string, search: string): boolean => {
  const textArray: PatternItem[] = _convertToSearchPatternArray(text);
  const searchChars = search.split('');
  const limit = textArray.length - searchChars.length;

  for (let i = 0; i <= limit; i++) {
    if (_matchesAtIndex(textArray, i, searchChars))
      return true;
  }
  return false;
};

const _convertToSearchPatternArray = (text: string) => {
  return separateToObject(text).map(({isHangul, char, initial}) => {
    return isHangul? { full: char, initial: initial } : { full: char, initial: char };
  });
};

const _matchesAtIndex = (
  textArray: PatternItem[],
  index: number,
  searchChars: string[]
): boolean => {
  for (let j = 0; j < searchChars.length; j++) {
    const item = textArray[index + j];
    if (!item || (searchChars[j] !== item.full && searchChars[j] !== item.initial))
      return false;
  }
  return true;
};
