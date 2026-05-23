
function loadChart(){
 const symbol=document.getElementById('symbolInput').value || 'NASDAQ:AAPL';
 document.getElementById('tvchart').innerHTML='';
 new TradingView.widget({
   autosize:true,
   symbol:symbol,
   interval:'D',
   timezone:'Europe/Rome',
   theme:'light',
   style:'1',
   locale:'it',
   container_id:'tvchart',
   studies:['RSI@tv-basicstudies','MACD@tv-basicstudies','MASimple@tv-basicstudies']
 });
}
window.onload=loadChart;
