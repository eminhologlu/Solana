const fs = require('fs');
const web3 = require("@solana/web3.js");

let connection = new web3.Connection(web3.clusterApiUrl("devnet"), "confirmed");
const WALLET_FILE_PATH = 'wallet.json';
const LAMPORTS_PER_SOL = 1000000000;

//cüzdan oluşturma
async function createWallet() {
    const keypair = web3.Keypair.generate();
    const publicKey = keypair.publicKey.toString();
    const privateKey = keypair.secretKey.toString();
    const walletInfo = {
        publicKey,
        privateKey,
        balance: 0
    };
    fs.writeFileSync(WALLET_FILE_PATH, JSON.stringify(walletInfo));
    console.log('Yeni cüzdan oluşturuldu ve bilgileri wallet.json dosyasına kaydedildi.');
}

//json bakiye güncelleme
async function updateBalance() {
    const walletInfo = JSON.parse(fs.readFileSync(WALLET_FILE_PATH, 'utf-8'));
    const publicKey = new web3.PublicKey(walletInfo.publicKey);
    const balance = await connection.getBalance(publicKey);
    walletInfo.balance = balance/LAMPORTS_PER_SOL;
    fs.writeFileSync(WALLET_FILE_PATH, JSON.stringify(walletInfo, null, 2));
}

//airdrop
async function airdrop(amount){
    const walletInfo = JSON.parse(fs.readFileSync(WALLET_FILE_PATH, 'utf-8'));
    const publicKey = new web3.PublicKey(walletInfo.publicKey);
    let txhash = await connection.requestAirdrop(publicKey, amount * LAMPORTS_PER_SOL);
    console.log('airdrop gerçekleşti. txhash: '+txhash);
    updateBalance();
}

//bakiye kontrol
async function balance(){
    const walletInfo = JSON.parse(fs.readFileSync(WALLET_FILE_PATH, 'utf-8'));
    const publicKey = new web3.PublicKey(walletInfo.publicKey);
    const balance = await connection.getBalance(publicKey);
    console.log('Cüzdan bakiyesi: ' + balance/LAMPORTS_PER_SOL + ' SOL');
}

//transfer
async function transfer(toPubkey,amount){
    const walletInfo = JSON.parse(fs.readFileSync(WALLET_FILE_PATH, 'utf-8'));
    const arr = walletInfo.privateKey.split(',');
    const keypair = web3.Keypair.fromSecretKey(
        Uint8Array.from(arr)
      );
    let transaction = new web3.Transaction();
    transaction.add(
        web3.SystemProgram.transfer({
          fromPubkey: keypair.publicKey,
          toPubkey: toPubkey,
          lamports: amount*LAMPORTS_PER_SOL,
        }),
      );
    let txhash = await web3.sendAndConfirmTransaction(connection, transaction, [keypair]);
    console.log('Transfer gerçekleşti: '+txhash);
    updateBalance();
}

//solana istatistikler
async function getNetworkStats() {
    const epochInfo = await connection.getEpochInfo();
    const currentSlot = epochInfo.absoluteSlot;

    const blockTime = await connection.getBlockTime(currentSlot);
    const transactionCount = epochInfo.transactionCount;

    return {
        currentSlot,
        blockTime,
        transactionCount
    };
}

//komutlar
const command = process.argv.slice(2);
if (command[0] === 'new') {
    createWallet();
} 
else if (command[0] === 'airdrop') {
    const amount = parseInt(command[1]) || 1; //x kadar veya 1 adet
    airdrop(amount);
}
else if(command[0] === 'balance'){
    balance();
}
else if(command[0] === 'transfer'){
    transfer(command[1],command[2]);
}
else if(command[0] === 'status'){
    getNetworkStats()
    .then(stats => {
        console.log('Anlık blok yüksekliği:', stats.currentSlot);
        console.log('Anlık işlem sayısı:', stats.transactionCount);
        console.log('Son blok zamanı:', new Date(stats.blockTime * 1000));
    })
    .catch(error => {
        console.error('Hata:', error);
    });
}
else {
    console.log('Geçersiz komut!');
}
