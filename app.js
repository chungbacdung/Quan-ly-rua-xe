const STORAGE_KEY="quanLyRuaXeOrders";
const MAX_HISTORY_DAYS=60;
const EMPLOYEE_WASH_START_CAR=9;
const EMPLOYEE_WASH_PAYMENT=10000;
const EMPLOYEE_OIL_PAYMENT=10000;

let orders=[];
let selectedServices=[];
let currentPayment="cash";
let currentReportPeriod="today";

const $=id=>document.getElementById(id);

function loadOrders(){
  try{
    const s=localStorage.getItem(STORAGE_KEY);
    orders=s?JSON.parse(s):[];
    if(!Array.isArray(orders)) orders=[];
    migrateVehicleNumbers();
  }catch(e){console.error(e);orders=[]}
}
function saveOrders(){
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(orders));return true}
  catch(e){alert("Không thể lưu dữ liệu trên máy.");return false}
}
function migrateVehicleNumbers(){
  const groups={}; orders.forEach(o=>(groups[o.date]??=[]).push(o));
  let changed=false;
  Object.values(groups).forEach(list=>{
    list.sort((a,b)=>new Date(a.createdAt||`${a.date}T00:00:00`)-new Date(b.createdAt||`${b.date}T00:00:00`));
    let n=1;
    list.forEach(o=>{
      if(!Number.isInteger(Number(o.vehicleNumber))){o.vehicleNumber=n;changed=true}
      n=Math.max(n,Number(o.vehicleNumber)+1);
    });
  });
  if(changed) saveOrders();
}
function getDateKey(d=new Date()){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function formatDate(k){
  const p=(k||"").split("-");
  return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:k||"";
}
function formatMoney(v){return Number(v||0).toLocaleString("vi-VN")+"₫"}
function escapeHTML(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}
function showCurrentDate(){
  $("currentDate").textContent=new Date().toLocaleDateString("vi-VN",{weekday:"long",day:"2-digit",month:"2-digit",year:"numeric"});
}
function selectService(btn){
  const name=btn?.dataset.name,price=Number(btn?.dataset.price);
  if(!name||!price)return;
  const i=selectedServices.findIndex(s=>s.name===name);
  if(i<0){selectedServices.push({name,price});btn.classList.add("selected")}
  else{selectedServices.splice(i,1);btn.classList.remove("selected")}
  renderSelectedServices();
}
function renderSelectedServices(){
  const box=$("selectedServices"),totalBox=$("orderTotal");
  if(!selectedServices.length){box.textContent="Chưa chọn dịch vụ";totalBox.textContent="0₫";return}
  let total=0;
  box.innerHTML=selectedServices.map((s,i)=>{
    total+=Number(s.price);
    return `<div class="selected-service"><span>${escapeHTML(s.name)} <b>${formatMoney(s.price)}</b></span><button type="button" class="remove-service" data-index="${i}">×</button></div>`
  }).join("");
  totalBox.textContent=formatMoney(total);
  box.querySelectorAll(".remove-service").forEach(b=>b.onclick=e=>{e.stopPropagation();removeSelectedService(Number(b.dataset.index))});
}
function removeSelectedService(i){
  if(i<0||i>=selectedServices.length)return;
  const r=selectedServices[i];selectedServices.splice(i,1);
  document.querySelectorAll(".service-button").forEach(b=>{if(b.dataset.name===r.name)b.classList.remove("selected")});
  renderSelectedServices();
}
function setPayment(type){
  if(!["cash","transfer"].includes(type))return;
  currentPayment=type;
  $("cashButton")?.classList.toggle("active",type==="cash");
  $("transferButton")?.classList.toggle("active",type==="transfer");
}
function createOrderId(){return Date.now().toString()+Math.random().toString(36).slice(2,8)}
function getNextVehicleNumber(date){
  const nums=orders.filter(o=>o.date===date).map(o=>Number(o.vehicleNumber||0)).filter(n=>Number.isFinite(n)&&n>0);
  return nums.length?Math.max(...nums)+1:1;
}
function hasWashService(o){return Array.isArray(o.services)&&o.services.some(s=>s.name==="Rửa xe máy"||s.name==="Rửa xe máy điện")}
function hasOilService(o){return Array.isArray(o.services)&&o.services.some(s=>s.name.startsWith("Thay nhớt")||s.name==="Nhớt xe số vàng 1L")}
function getEmployeePayment(o){
  let p=0,n=Number(o.vehicleNumber||0);
  if(hasWashService(o)&&n>=EMPLOYEE_WASH_START_CAR)p+=EMPLOYEE_WASH_PAYMENT;
  if(hasOilService(o))p+=EMPLOYEE_OIL_PAYMENT;
  return p;
}
function getGross(o){return Number(o.total||o.price||0)}
function getNetRevenue(o){return Math.max(0,getGross(o)-getEmployeePayment(o))}
function getTodayOrders(){return orders.filter(o=>o.date===getDateKey())}
function getRecentOrders(){
  const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-(MAX_HISTORY_DAYS-1));
  return orders.filter(o=>o.date>=getDateKey(d));
}
function addOrder(){
  const input=$("plate");
  const plate=input.value.trim().toUpperCase();
  if(!plate)return alert("Vui lòng nhập biển số xe.");
  if(!selectedServices.length)return alert("Vui lòng chọn ít nhất một dịch vụ.");
  const now=new Date(),date=getDateKey(now);
  const services=selectedServices.map(s=>({name:s.name,price:Number(s.price)}));
  const total=services.reduce((a,s)=>a+s.price,0);
  orders.push({
    id:createOrderId(),
    vehicleNumber:getNextVehicleNumber(date),
    plate,services,total,payment:currentPayment,date,
    time:now.toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit"}),
    createdAt:now.toISOString()
  });
  if(!saveOrders())return;
  input.value="";selectedServices=[];
  document.querySelectorAll(".service-button").forEach(b=>b.classList.remove("selected"));
  setPayment("cash");renderSelectedServices();showOrders();showHistory();renderReport();
  updateNextVehicleNumber();
}
function changePayment(id){
  const o=orders.find(x=>String(x.id)===String(id));if(!o)return;
  o.payment=o.payment==="cash"?"transfer":"cash";
  saveOrders();showOrders();showHistory();renderReport();
}
function deleteOrder(id){
  const i=orders.findIndex(x=>String(x.id)===String(id));if(i<0)return;
  const o=orders[i];
  if(!confirm(`Xóa đơn xe #${o.vehicleNumber} - ${o.plate} - ${formatMoney(o.total)}?`))return;
  orders.splice(i,1);saveOrders();showOrders();showHistory();renderReport();updateNextVehicleNumber();
}
function updateSummary(){
  const today=getTodayOrders();let revenue=0,cash=0,transfer=0,employee=0;
  today.forEach(o=>{
    const e=getEmployeePayment(o),net=getNetRevenue(o);
    employee+=e;revenue+=net;
    if(o.payment==="cash")cash+=net;else if(o.payment==="transfer")transfer+=net;
  });
  $("totalCars").textContent=today.length;
  $("totalRevenue").textContent=formatMoney(revenue);
  $("totalCash").textContent=formatMoney(cash);
  $("totalTransfer").textContent=formatMoney(transfer);
  $("totalEmployeePayment").textContent=formatMoney(employee);
}
function updateNextVehicleNumber(){
  $("nextVehicleNumber").textContent=getNextVehicleNumber(getDateKey());
}
function servicesHTML(o){
  return Array.isArray(o.services)?o.services.map(s=>`<div>• ${escapeHTML(s.name)} <span>${formatMoney(s.price)}</span></div>`).join(""):"";
}
function orderHTML(o,history=false){
  const total=getGross(o),emp=getEmployeePayment(o),net=getNetRevenue(o);
  const pay=o.payment==="cash"?"💵 Tiền mặt":"🏦 Chuyển khoản";
  const change=o.payment==="cash"?"🔄 Đổi sang CK":"🔄 Đổi sang tiền mặt";
  return `<article class="${history?"history-order":"order"}">
    <div class="${history?"history-order-top":"order-top"}">
      <div><strong>Xe #${Number(o.vehicleNumber||0)}</strong><span class="plate">${escapeHTML(o.plate)}</span></div>
      <b>${formatMoney(total)}</b>
    </div>
    <div class="order-service">${servicesHTML(o)}</div>
    <div class="order-meta"><span>${pay}</span><span>🕐 ${escapeHTML(o.time)}</span></div>
    <div class="order-finance"><span>NV <b>${formatMoney(emp)}</b></span><span>Thực nhận <b>${formatMoney(net)}</b></span></div>
    <div class="order-buttons">
      <button type="button" class="change-payment" data-id="${o.id}">${history?"🔄 Đổi thanh toán":change}</button>
      <button type="button" class="delete-order" data-id="${o.id}">🗑 Xóa</button>
    </div>
  </article>`;
}
function bindOrderButtons(root){
  document.querySelectorAll(`${root} .change-payment`).forEach(b=>b.onclick=()=>changePayment(b.dataset.id));
  document.querySelectorAll(`${root} .delete-order`).forEach(b=>b.onclick=()=>deleteOrder(b.dataset.id));
}
function showOrders(){
  updateSummary();updateNextVehicleNumber();
  const list=getTodayOrders().sort((a,b)=>String(b.id).localeCompare(String(a.id)));
  $("orders").innerHTML=list.length?list.map(o=>orderHTML(o)).join(""):`<div class="empty">Chưa có đơn hôm nay</div>`;
  bindOrderButtons("#orders");
}
function getHistoryFiltered(){
  const q=($("historySearch")?.value||"").trim().toUpperCase();
  return getRecentOrders().filter(o=>!q||String(o.plate||"").toUpperCase().includes(q));
}
function showHistory(){
  const list=getHistoryFiltered();
  let gross=0,employee=0,net=0;
  list.forEach(o=>{gross+=getGross(o);employee+=getEmployeePayment(o);net+=getNetRevenue(o)});
  $("historyCars").textContent=list.length;
  $("historyGross").textContent=formatMoney(gross);
  $("historyEmployee").textContent=formatMoney(employee);
  $("historyNet").textContent=formatMoney(net);
  if(!list.length){$("history").innerHTML=`<div class="empty">Không tìm thấy dữ liệu phù hợp</div>`;return}
  const groups={};
  list.sort((a,b)=>b.date.localeCompare(a.date)||String(b.id).localeCompare(String(a.id))).forEach(o=>(groups[o.date]??=[]).push(o));
  $("history").innerHTML=Object.keys(groups).sort().reverse().map(date=>{
    const ds=groups[date],g=ds.reduce((a,o)=>a+getGross(o),0),e=ds.reduce((a,o)=>a+getEmployeePayment(o),0);
    return `<div class="history-day">
      <button class="history-day-header" type="button">
        <div><strong>📅 ${formatDate(date)}</strong><span>${ds.length} xe</span><small>Thực nhận: ${formatMoney(Math.max(0,g-e))} • NV: ${formatMoney(e)}</small></div>
        <span class="history-arrow">⌄</span>
      </button>
      <div class="history-day-content">${ds.map(o=>orderHTML(o,true)).join("")}</div>
    </div>`;
  }).join("");
  document.querySelectorAll(".history-day-header").forEach(h=>h.onclick=()=>h.parentElement.classList.toggle("open"));
  bindOrderButtons("#history");
}
function switchTab(id){
  document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active",t.dataset.tab===id));
  document.querySelectorAll(".tab-panel").forEach(p=>p.classList.toggle("active",p.id===id));
  if(id==="historyTab")showHistory();
  if(id==="reportTab")renderReport();
  window.scrollTo({top:0,behavior:"smooth"});
}
function getReportOrders(period){
  const today=new Date();today.setHours(0,0,0,0);
  let start=new Date(today);
  if(period==="7")start.setDate(start.getDate()-6);
  else if(period==="30")start.setDate(start.getDate()-29);
  else if(period==="month")start=new Date(today.getFullYear(),today.getMonth(),1);
  const sk=getDateKey(start),ek=getDateKey(today);
  return orders.filter(o=>o.date>=sk&&o.date<=ek);
}
function reportPeriodLabel(period){
  const t=new Date();
  if(period==="today")return `Hôm nay • ${formatDate(getDateKey(t))}`;
  if(period==="7")return "7 ngày gần nhất";
  if(period==="30")return "30 ngày gần nhất";
  return `Tháng ${t.getMonth()+1}/${t.getFullYear()}`;
}
function renderReport(){
  document.querySelectorAll(".report-preset").forEach(b=>b.classList.toggle("active",b.dataset.period===currentReportPeriod));
  $("reportPeriodText").textContent=reportPeriodLabel(currentReportPeriod);
  const list=getReportOrders(currentReportPeriod);
  let gross=0,emp=0,net=0,cash=0,transfer=0;
  list.forEach(o=>{const g=getGross(o),e=getEmployeePayment(o),n=getNetRevenue(o);gross+=g;emp+=e;net+=n;if(o.payment==="cash")cash+=n;else transfer+=n});
  $("reportGross").textContent=formatMoney(gross);
  $("reportEmployee").textContent=formatMoney(emp);
  $("reportNet").textContent=formatMoney(net);
  $("reportCars").textContent=list.length;
  $("reportCash").textContent=formatMoney(cash);
  $("reportTransfer").textContent=formatMoney(transfer);
  renderDailyReport(list);
  renderServiceReport(list);
}
function renderDailyReport(list){
  const groups={};
  list.forEach(o=>(groups[o.date]??=[]).push(o));
  const rows=Object.keys(groups).sort().reverse();
  if(!rows.length){$("dailyReport").innerHTML=`<div class="empty">Chưa có dữ liệu</div>`;return}
  const max=Math.max(1,...rows.map(d=>groups[d].reduce((a,o)=>a+getNetRevenue(o),0)));
  $("dailyReport").innerHTML=rows.map(d=>{
    const ds=groups[d],n=ds.reduce((a,o)=>a+getNetRevenue(o),0),g=ds.reduce((a,o)=>a+getGross(o),0),e=ds.reduce((a,o)=>a+getEmployeePayment(o),0);
    return `<div class="daily-row"><div class="daily-label"><b>${formatDate(d)}</b><span>${ds.length} xe</span></div><div class="bar-track"><div class="bar" style="width:${Math.max(4,(n/max)*100)}%"></div></div><div class="daily-value"><b>${formatMoney(n)}</b><small>Gộp ${formatMoney(g)} • NV ${formatMoney(e)}</small></div></div>`;
  }).join("");
}
function renderServiceReport(list){
  const map={};
  list.forEach(o=>o.services?.forEach(s=>{
    if(!map[s.name])map[s.name]={count:0,revenue:0};
    map[s.name].count++;map[s.name].revenue+=Number(s.price||0);
  }));
  const rows=Object.entries(map).sort((a,b)=>b[1].revenue-a[1].revenue);
  if(!rows.length){$("serviceReport").innerHTML=`<div class="empty">Chưa có dữ liệu</div>`;return}
  const max=Math.max(1,...rows.map(x=>x[1].revenue));
  $("serviceReport").innerHTML=rows.map(([name,v])=>`<div class="service-row"><div class="service-row-top"><b>${escapeHTML(name)}</b><span>${v.count} lượt</span></div><div class="service-progress"><i style="width:${Math.max(5,v.revenue/max*100)}%"></i></div><strong>${formatMoney(v.revenue)}</strong></div>`).join("");
}
function setupEvents(){
  document.querySelectorAll(".service-button").forEach(b=>b.onclick=e=>{e.preventDefault();selectService(b)});
  $("cashButton").onclick=()=>setPayment("cash");
  $("transferButton").onclick=()=>setPayment("transfer");
  $("addOrderButton").onclick=addOrder;
  $("plate").addEventListener("keydown",e=>{if(e.key==="Enter")addOrder()});
  document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));
  $("historySearch").addEventListener("input",showHistory);
  $("historyClear").onclick=()=>{$("historySearch").value="";showHistory()};
  document.querySelectorAll(".report-preset").forEach(b=>b.onclick=()=>{currentReportPeriod=b.dataset.period;renderReport()});
}
function initApp(){
  loadOrders();showCurrentDate();setupEvents();setPayment("cash");renderSelectedServices();showOrders();showHistory();renderReport();
}
document.readyState==="loading"?document.addEventListener("DOMContentLoaded",initApp):initApp();