require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { JsonRpcProvider, Contract, ZeroAddress, id, Interface } = require('ethers');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const provider = new JsonRpcProvider(process.env.RPC_URL);
const contractAddress = process.env.CONTRACT_ADDRESS;
const channelId = process.env.DISCORD_CHANNEL_ID;
const mintPrice = 0.0069;

const abi = [
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
];
const iface = new Interface(abi);
const contract = new Contract(contractAddress, abi, provider);

let lastBlockChecked = 0;

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  lastBlockChecked = await provider.getBlockNumber();
  const channel = await client.channels.fetch(channelId);

  provider.on('block', async (blockNumber) => {
    const logs = await provider.getLogs({
      fromBlock: lastBlockChecked + 1,
      toBlock: blockNumber,
      address: contractAddress,
      topics: [id("Transfer(address,address,uint256)")]
    });

    const mints = {};

    for (const log of logs) {
      const parsed = iface.parseLog(log);
      const to = parsed.args.to;
      const from = parsed.args.from;

      if (from !== ZeroAddress) continue;

      if (!mints[to]) mints[to] = 0;
      mints[to]++;
    }

    for (const wallet in mints) {
      const qty = mints[wallet];
      const ethSpent = (qty * mintPrice).toFixed(4);
      const msg = `🧯 **New CryptoPimp Mint on Base!**\n👛 Wallet: \`${wallet}\`\n🪙 Quantity: **${qty}**\n💸 ETH Spent: **${ethSpent} ETH**`;
      await channel.send(msg);
    }

    lastBlockChecked = blockNumber;
  });
});

client.on('messageCreate', async message => {
  if (message.content === '!testmint') {
    const fakeWallet = '0xDEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEF';
    const fakeQty = Math.floor(Math.random() * 5) + 1;
    const fakeEth = (fakeQty * mintPrice).toFixed(4);
    const testMsg = `🧪 **Test Mint Triggered (Base Sim)**\n👛 Wallet: \`${fakeWallet}\`\n🪙 Quantity: **${fakeQty}**\n💸 ETH Spent: **${fakeEth} ETH**`;

    const channel = await client.channels.fetch(channelId);
    await channel.send(testMsg);
    await message.reply('✅ Test mint sent!');
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
