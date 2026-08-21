export const KBO_TEAMS = [
  '두산 베어스',
  'LG 트윈스',
  '키움 히어로즈',
  'KT 위즈',
  'SSG 랜더스',
  'NC 다이노스',
  '롯데 자이언츠',
  '삼성 라이온즈',
  'KIA 타이거즈',
  '한화 이글스',
] as const;

export const KBO_BALLPARKS = [
  '잠실야구장',
  '고척스카이돔',
  '수원 KT위즈파크',
  '인천 SSG랜더스필드',
  '창원 NC파크',
  '사직야구장',
  '대구삼성라이온즈파크',
  '광주-기아 챔피언스필드',
  '대전 한화생명 이글스파크',
] as const;

export const TEAM_COLORS: Record<string, { light: string; dark: string }> = {
  '두산 베어스':    { light: '#1A2E7A', dark: '#6878C8' },
  'LG 트윈스':     { light: '#B00020', dark: '#E83050' },
  '키움 히어로즈': { light: '#7A0020', dark: '#C04060' },
  'KT 위즈':       { light: '#C00000', dark: '#FF4040' },
  'SSG 랜더스':    { light: '#A8001A', dark: '#E04060' },
  'NC 다이노스':   { light: '#00246E', dark: '#4A7ABE' },
  '롯데 자이언츠': { light: '#C00010', dark: '#E83030' },
  '삼성 라이온즈': { light: '#0050A0', dark: '#4090D0' },
  'KIA 타이거즈':  { light: '#C00020', dark: '#E84060' },
  '한화 이글스':   { light: '#C04000', dark: '#FF7020' },
};

export const TEAM_HOME_BALLPARK: Record<string, string> = {
  '두산 베어스': '잠실야구장',
  'LG 트윈스': '잠실야구장',
  '키움 히어로즈': '고척스카이돔',
  'KT 위즈': '수원 KT위즈파크',
  'SSG 랜더스': '인천 SSG랜더스필드',
  'NC 다이노스': '창원 NC파크',
  '롯데 자이언츠': '사직야구장',
  '삼성 라이온즈': '대구삼성라이온즈파크',
  'KIA 타이거즈': '광주-기아 챔피언스필드',
  '한화 이글스': '대전 한화생명 이글스파크',
};
