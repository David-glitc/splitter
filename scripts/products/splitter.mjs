import {parseEther} from 'viem';
export default {
 slug:'splitter',vercel:'splitterbot',assets:['BOT','USDT'],name:'Splitter',repo:'splitter',contract:'Splitter',color:'#2DD4BF',eyebrow:'REVENUE SPLITS',symbol:'⅓',
 line:'Get paid once. Split it right.',
 app:{title:'Split ledger',line:'Set the shares once; every payment in BOT or USDT divides itself.',layout:'sheet'},
 description:'Fixed revenue splits for up to ten wallets. Payments in BOT or USDT divide by percentage automatically.',
 abis:['Splitter'],
 contracts:['src/Splitter.sol'],tests:['test/Splitter.t.sol'],
 landing:{
  steps:[['Set the shares','Add two to ten wallets and their percentages. They must total 100%.'],['Share the split','Clients, fans or apps pay the split in BOT or USDT.'],['Everyone withdraws','Each wallet withdraws its share whenever it likes. Nobody can redirect it.']],
  features:[['Fixed forever','Shares cannot be edited after creation, so every member can trust the split.'],['BOT and USDT','Native BOT and USDT on BOT Chain both split automatically.'],['Pull payments','Shares wait in the contract until each member withdraws.'],['No fee','Splitter keeps nothing. Rounding dust goes to the last recipient.']],
  faq:[['Can I change a split?','No. Create a new split if the team changes. Funds already paid stay with their recipients.'],['Who can pay a split?','Anyone. Share its number or link.'],['How is rounding handled?','Each share rounds down; the remainder of a payment goes to the last wallet listed.'],['What does it cost?','Only BOT Chain gas. Splitter takes no fee.']],
 },
 async deploy({deploy}){await deploy('Splitter');},
 async fork({write,read,owner,tx,abi,i,contract,fundUSDT,parseEther:pe=parseEther}){
  const other='0x000000000000000000000000000000000000dEaD';
  await write('Splitter','create',['Fork split',[owner.address,other],[6000,4000]]);const id=await read('Splitter','splitCount')-1n;
  await write('Splitter','pay',[id],pe('0.001'));await write('Splitter','withdraw',['0x0000000000000000000000000000000000000000']);
  await fundUSDT(1_000000n);await tx(abi,i.USDT,'approve',[contract.Splitter,1_000000n]);
  await write('Splitter','payToken',[id,i.USDT,1_000000n]);
  return {flow:'create → pay BOT → withdraw → pay USDT',usdtOwed:String(await read('Splitter','owed',[owner.address,i.USDT]))};
 },
};
