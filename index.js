import { NodeClient, credentials } from "@apibara/protocol";
import { Block } from "@apibara/starknet";

// TODO: transform it to a list of addresses
const CONTRACT_WATCH_LIST =
  "06ac597f8116f886fa1c97a23fa4e08299975ecaf6b598873ca6792b9bbfb678";

async function main() {
  // create client connected to the StarkNet Goerli stream the server uses ssl
  const node = new NodeClient(
    "mainnet.starknet.stream.apibara.com:443",
    credentials.createSsl()
  );

  // check server status
  const status = await node.status();
  console.log("status", status);

  // stream all messages from the server
  // returns a promise resolved when it finishes
  // streaming from the server
  // { startingSequence: 100 }
  const messages = node.streamMessages(
    { startingSequence: 17100 },
    { reconnect: true }
  );

  // convert the watch list to a buffer
  // TODO: transform it to a list of buffers
  const watchListBuffered = Buffer.from(CONTRACT_WATCH_LIST, "hex");

  return new Promise((resolve, reject) => {
    messages.on("end", resolve);
    messages.on("error", reject);
    messages.on("data", (message) => {
      // decode raw bytes in `Data` messages.
      if (message.data?.data?.value) {
        const block = Block.decode(message.data.data.value);
        const events = block.transactionReceipts.map((tx) => tx.events);

        // loop over all the events in the block and log the ones that are from the watch list
        events.forEach((eventBundle) =>
          eventBundle.forEach((event) => {
            if (Buffer.compare(watchListBuffered, event.fromAddress) === 0)
              console.log(`caught: ${event.fromAddress.toString("hex")}`);
          })
        );

        // log the block
        const date = new Date(block.timestamp);
        const now = date.toLocaleTimeString();
        console.log("\n ------------------ \n");
        console.log(
          `[${now}] blockNumber: ${block.blockNumber}, numberTxs: ${block.transactions.length}`
        );
        console.log("\n ------------------ \n");
      }
    });
  });
}

main();
