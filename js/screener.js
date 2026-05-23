
function filterTable(){
 let v=document.getElementById('search').value.toLowerCase();
 document.querySelectorAll('#screenTable tbody tr').forEach(r=>{
   r.style.display=r.innerText.toLowerCase().includes(v)?'':'none';
 });
}
