/* Animiertes Segelschiff als Hintergrund des oberen Deck-Bereichs */
(function initAnimatedShipHeader(){
  const board=document.querySelector('.ship-board');
  if(!board)return;

  const oldDecor=board.querySelectorAll('.sea-wave,.mast,.sail');
  oldDecor.forEach(element=>element.remove());

  const frame=document.createElement('iframe');
  frame.className='ship-scene-frame';
  frame.src='./segelschiff-header.html';
  frame.title='Animiertes Segelschiff auf dem Meer';
  frame.loading='eager';
  frame.tabIndex=-1;
  frame.setAttribute('aria-hidden','true');
  board.prepend(frame);

  const style=document.createElement('style');
  style.textContent=`
    .ship-board{
      background:#76b8df;
      isolation:isolate;
    }
    .ship-board::before{
      display:none!important;
    }
    .ship-scene-frame{
      position:absolute;
      inset:0;
      z-index:0;
      width:100%;
      height:100%;
      border:0;
      display:block;
      pointer-events:none;
      background:transparent;
    }
    .ship-board .hotspot{
      z-index:3;
    }
    .ship-board::after{
      content:"";
      position:absolute;
      inset:0;
      z-index:1;
      pointer-events:none;
      background:linear-gradient(180deg,rgba(11,47,75,.04),rgba(11,47,75,0) 52%,rgba(28,43,48,.13));
    }
    @media(max-width:560px){
      .ship-scene-frame{transform:scale(1.12);transform-origin:center 46%;}
    }
  `;
  document.head.appendChild(style);
})();
