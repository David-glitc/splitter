import {$,config,state,esc,fmt,link,button,field,area,form,details,amount,read,tx,approve,mine,asset,start,address} from '../core.js';
const trim=v=>{const [a,b='']=v.split('.');return b?`${a}.${b.slice(0,4).replace(/0+$/,'')||'0'}`.replace(/\.0$/,''):a;};
const USDT=config.infrastructure.USDT,ZERO='0x0000000000000000000000000000000000000000';
const tally={splits:0,bot:0n,usdt:0n};
// "0xabc… 50" per line → recipients and basis points (two decimal places of a percent).
function parseShares(text){
 const rows=text.split('\n').map(l=>l.trim()).filter(Boolean);if(rows.length<2||rows.length>10)throw Error('List 2 to 10 wallets, one per line.');
 const recipients=[],shares=[];for(const r of rows){const [a,p]=r.split(/[\s,]+/);if(!/^\d+(\.\d{1,2})?$/.test(p||''))throw Error(`Add a percentage after ${a}, for example 25 or 33.33.`);recipients.push(address(a));shares.push(Math.round(Number(p)*100));}
 const total=shares.reduce((a,b)=>a+b,0);if(total!==10000)throw Error(`Shares add up to ${total/100}%; they must total 100%.`);return [recipients,shares];
}
function controls(){
 $('list-title').textContent='Splits';
 $('controls').innerHTML='<h2>New split</h2><p>Shares are fixed once created. Every payment divides by these percentages.</p>'
  +form('new-split',field('name','Split name','','text','maxlength="80" placeholder="Gig night, 26 Oct"')+'<label for="shares">Wallets and percentages, one per line</label><textarea id="shares" name="shares" required placeholder="0x1234… 50&#10;0xabcd… 30&#10;0x9876… 20"></textarea>',
   'Create split',async f=>{const [r,s]=parseShares(f.shares);await tx('Splitter','create',[f.name,r,s]);});
 $('rules').innerHTML='<ul><li>2 to 10 wallets. Percentages must total 100% and cannot be changed later.</li><li>Anyone can pay a split in BOT or USDT.</li><li>Each wallet withdraws its own share. Rounding dust goes to the last wallet listed.</li><li>No fee.</li></ul>';
}
async function sheet(id){
 const s=await read('Splitter','getSplit',[BigInt(id)]);const [bot,usd]=await Promise.all([read('Splitter','received',[BigInt(id),ZERO]),read('Splitter','received',[BigInt(id),USDT])]);
 tally.bot+=bot;tally.usdt+=usd;
 const rows=s.recipients.map((r,k)=>`<tr><td>${link(r)}${mine(r)?' <span class="badge live">You</span>':''}</td><td class="num">${(Number(s.shares[k])/100).toFixed(2).replace(/\.00$/,'')}%</td></tr>`).join('');
 return `<article class="sheet"><div class="sheet-head"><div><h3>${esc(s.name)}</h3><span class="tiny">Split #${id} · by ${link(s.creator)} · ${s.payments} payment${s.payments===1n?'':'s'}</span></div></div>`
  +`<dl class="figs"><div><dt>BOT received</dt><dd>${trim(fmt(bot))}</dd></div><div><dt>USDT received</dt><dd>${trim(fmt(usd,6))}</dd></div><div><dt>Wallets</dt><dd>${s.recipients.length}</dd></div></dl>`
  +`<div class="table-wrap"><table class="board"><thead><tr><th scope="col">Wallet</th><th scope="col" class="num">Share</th></tr></thead><tbody>${rows}</tbody></table></div>`
  +details('Pay in BOT',form(`pay-${id}`,field(`bot-${id}`,'Amount (BOT)','0.01','text','inputmode="decimal"'),'Pay split',f=>tx('Splitter','pay',[BigInt(id)],amount(f[`bot-${id}`]))))
  +details('Pay in USDT',form(`payu-${id}`,field(`usd-${id}`,'Amount (USDT)','1','text','inputmode="decimal"'),'Approve & pay',async f=>{const n=amount(f[`usd-${id}`],6);await approve(USDT,config.contracts.Splitter,n);await tx('Splitter','payToken',[BigInt(id),USDT,n]);}))
  +'</article>';
}
async function render(){
 const count=Number(await read('Splitter','splitCount'));Object.assign(tally,{splits:count,bot:0n,usdt:0n});let top='';
 if(state.account){const [b,u]=await Promise.all([read('Splitter','owed',[state.account,ZERO]),read('Splitter','owed',[state.account,USDT])]);
  if(b>0n||u>0n)top=`<p class="you">Your share: ${b>0n?`${trim(fmt(b))} BOT ${button('Withdraw BOT',()=>tx('Splitter','withdraw',[ZERO]),true)}`:''} ${u>0n?`${trim(fmt(u,6))} USDT ${button('Withdraw USDT',()=>tx('Splitter','withdraw',[USDT]),true)}`:''}</p>`;}
 const ids=[];for(let id=count-1;id>=Math.max(0,count-20);id--)ids.push(id);
 const sheets=await Promise.all(ids.map(sheet));
 return top+(sheets.length?`<div class="sheets">${sheets.join('')}</div>`:'<p class="empty">No splits yet. Create the first one.</p>');
}
function stats(empty){return [['Splits',empty?'—':String(tally.splits)],['BOT split',empty?'—':trim(fmt(tally.bot))],['USDT split',empty?'—':trim(fmt(tally.usdt,6))]];}
start({controls,render,stats});
