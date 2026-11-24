import { continueRender, delayRender, staticFile } from 'remotion';

let loaded = false;

export const loadFonts = () => {
  if (loaded || typeof document === 'undefined') return;
  loaded = true;
  const handle = delayRender('Loading Montserrat');
  const font = new FontFace('Montserrat', `url(${staticFile('fonts/Montserrat-Variable.ttf')}) format('truetype')`, {
    weight: '100 900',
  });
  const serif = new FontFace('Cormorant Garamond', `url(${staticFile('fonts/CormorantGaramond-Variable.ttf')}) format('truetype')`, { weight: '300 700' });
  const h2 = delayRender('Loading Cormorant');
  serif.load().then((f) => { (document.fonts as unknown as { add: (f: FontFace) => void }).add(f); continueRender(h2); }).catch(() => continueRender(h2));
  font
    .load()
    .then((f) => {
      (document.fonts as unknown as { add: (f: FontFace) => void }).add(f);
      continueRender(handle);
    })
    .catch((e) => {
      console.error('font load failed', e);
      continueRender(handle);
    });
};
