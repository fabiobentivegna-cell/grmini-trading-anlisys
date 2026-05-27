const socket = new WebSocket('wss://api.hyperliquid.exchange/v1/stream');
socket.onopen = () => {
  // iscrizioni
  socket.send(JSON.stringify({type: 'subscribe', pair: 'BTC-USD'}));
};
socket.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  // aggiornare i pannelli crypto corrispondenti
  // esempio: se(msg.symbol==='BTC-USD'){ updateChart(msg.data); }
};
