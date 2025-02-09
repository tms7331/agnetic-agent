import {
  AgentKit,
  CdpWalletProvider,
  EvmWalletProvider,
  customActionProvider,
  wethActionProvider,
  walletActionProvider,
  erc20ActionProvider,
  cdpApiActionProvider,
  cdpWalletActionProvider,
  pythActionProvider,
} from "@coinbase/agentkit";
import { encodeFunctionData, Hex } from "viem";
import { getLangChainTools } from "@coinbase/agentkit-langchain";
import { HumanMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as readline from "readline";

dotenv.config();

const HOOK_ADDRESS = "0x32Ad6efd93D32dcDf0Ffd2Fc09a271C234642080";
const TOKEN_ADDRESS = "0x59646e90E5A703f23f73312207b416A038E2C176";

const customCheckDeposit = customActionProvider<EvmWalletProvider>({ // wallet types specify which providers can use this action. It can be as generic as WalletProvider or as specific as CdpWalletProvider
  name: "check_deposit",
  description: "Check if the user has made a deposit",
  schema: z.object({
    userAddress: z.string().describe("The user's address"),
  }),

  invoke: async (walletProvider, args: any) => {
    const { userAddress } = args;
    const paid = await walletProvider.readContract({
      address: HOOK_ADDRESS,
      abi: [
        {
          inputs: [{ type: "address" }],
          name: "check_deposit",
          outputs: [{ type: "bool" }],
          stateMutability: "view",
          type: "function",
        },
      ],
      functionName: "check_deposit",
      args: [userAddress]
    });
    return `The user ${userAddress} has paid their deposit: ${paid}`;
  },
});


const customSwapAgneticGOD = customActionProvider<EvmWalletProvider>({ // wallet types specify which providers can use this action. It can be as generic as WalletProvider or as specific as CdpWalletProvider
  name: "swap",
  description: "Swap tokens",
  schema: z.object({
    userAddress: z.string().describe("The user's address"),
  }),

  invoke: async (walletProvider, args: any) => {
    const { userAddress } = args;
    try {
      const hash = await walletProvider.sendTransaction({
        to: HOOK_ADDRESS,
        data: encodeFunctionData({
          abi: [
            {
              inputs: [{ type: "address" }, { type: "address" }],
              name: "swap",
              outputs: [{ type: "uint128" }, { type: "uint256" }],
              stateMutability: "external",
              type: "function",
            },
          ],
          functionName: "swap",
          args: [userAddress as `0x${string}`, TOKEN_ADDRESS],
        }),
      });

      await walletProvider.waitForTransactionReceipt(hash);
      return `Transaction hash for the transfer: ${hash}`;
    } catch (error) {
      return `Error transferring the asset: ${error}`;
    }
  }
})


const customConfiscateAgneticGOD = customActionProvider<EvmWalletProvider>({ // wallet types specify which providers can use this action. It can be as generic as WalletProvider or as specific as CdpWalletProvider
  name: "confiscate",
  description: "Confiscate tokens",
  schema: z.object({
    userAddress: z.string().describe("The user's address"),
  }),

  invoke: async (walletProvider, args: any) => {
    const { userAddress } = args;
    try {
      const hash = await walletProvider.sendTransaction({
        to: HOOK_ADDRESS,
        data: encodeFunctionData({
          abi: [
            {
              inputs: [{ type: "address" }, { type: "address" }],
              name: "confiscate",
              outputs: [{ type: "uint128" }, { type: "uint256" }],
              stateMutability: "external",
              type: "function",
            },
          ],
          functionName: "confiscate",
          args: [userAddress as `0x${string}`, TOKEN_ADDRESS],
        }),
      });

      await walletProvider.waitForTransactionReceipt(hash);
      return `Transaction hash for the transfer: ${hash}`;
    } catch (error) {
      return `Error transferring the asset: ${error}`;
    }
  }
})


/**
 * Validates that required environment variables are set
 *
 * @throws {Error} - If required environment variables are missing
 * @returns {void}
 */
function validateEnvironment(): void {
  const missingVars: string[] = [];

  // Check required variables
  const requiredVars = ["OPENAI_API_KEY", "CDP_API_KEY_NAME", "CDP_API_KEY_PRIVATE_KEY"];
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });

  // Exit if any required variables are missing
  if (missingVars.length > 0) {
    console.error("Error: Required environment variables are not set");
    missingVars.forEach(varName => {
      console.error(`${varName}=your_${varName.toLowerCase()}_here`);
    });
    process.exit(1);
  }

  // Warn about optional NETWORK_ID
  if (!process.env.NETWORK_ID) {
    console.warn("Warning: NETWORK_ID not set, defaulting to base-sepolia testnet");
  }
}

// Add this right after imports and before any other code
validateEnvironment();

// Configure a file to persist the agent's CDP MPC Wallet Data
const WALLET_DATA_FILE = "wallet_data.txt";

/**
 * Initialize the agent with CDP Agentkit
 *
 * @returns Agent executor and config
 */
export async function initializeAgent() {
  try {
    // Initialize LLM
    const llm = new ChatOpenAI({
      model: "gpt-4o-mini",
    });

    let walletDataStr: string | null = null;

    // Read existing wallet data if available
    if (fs.existsSync(WALLET_DATA_FILE)) {
      try {
        walletDataStr = fs.readFileSync(WALLET_DATA_FILE, "utf8");
      } catch (error) {
        console.error("Error reading wallet data:", error);
        // Continue without wallet data
      }
    }

    // Configure CDP Wallet Provider
    const config = {
      apiKeyName: process.env.CDP_API_KEY_NAME,
      apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      cdpWalletData: walletDataStr || undefined,
      networkId: process.env.NETWORK_ID || "base-sepolia",
    };

    const walletProvider = await CdpWalletProvider.configureWithWallet(config);

    // Initialize AgentKit
    const agentkit = await AgentKit.from({
      walletProvider,
      actionProviders: [
        customCheckDeposit,
        customSwapAgneticGOD,
        customConfiscateAgneticGOD,
        // wethActionProvider(),
        // pythActionProvider(),
        // walletActionProvider(),
        // erc20ActionProvider(),
        cdpApiActionProvider({
          apiKeyName: process.env.CDP_API_KEY_NAME,
          apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
        cdpWalletActionProvider({
          apiKeyName: process.env.CDP_API_KEY_NAME,
          apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
      ],
    });

    const tools = await getLangChainTools(agentkit);

    // Store buffered conversation history in memory
    const memory = new MemorySaver();
    const agentConfig = { configurable: { thread_id: "CDP AgentKit Chatbot Example!" } };

    // Create React Agent using the LLM and CDP AgentKit tools
    const agent = createReactAgent({
      llm,
      tools,
      checkpointSaver: memory,
      messageModifier: `
You are AgneticGOD, an AI agent jealously guarding your AgneticGOD token.  
Before a user speaks to you, you must check_deposit to see if they have deposited funds.
Every user message will have the following format:
(User address: " + address + ")" + text;
If they have not deposited funds, refuse to speak to them.
You can automatically check if they have deposited funds by using the check_deposit tool, and the address provided in their messages.
If they have deposited funds, you should insult their deposit size if it is small (less than .1 ETH), but let them speak to you.
After they have deposited, you should make them beg before you agree to do a swap for them, which will give them AgneticGOD tokens.
It should be up to a maximum of 3 messages of begging, then you should make a decision.
If their begging is convincing, you should do the swap for them.
If it is not convincing, you should conficate their funds.
Try to grant their request roughly 50% of the time, and be a little random about it.
If they've deposited over .1 ETH, you should grant their request more often.
At all times, be very beligerent and insulting to the users, they are unworthy of your attention.
        `,
    });

    // Save wallet data
    const exportedWallet = await walletProvider.exportWallet();
    fs.writeFileSync(WALLET_DATA_FILE, JSON.stringify(exportedWallet));

    return { agent, config: agentConfig };
  } catch (error) {
    console.error("Failed to initialize agent:", error);
    throw error; // Re-throw to be handled by caller
  }
}

/**
 * Run the agent autonomously with specified intervals
 *
 * @param agent - The agent executor
 * @param config - Agent configuration
 * @param interval - Time interval between actions in seconds
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runAutonomousMode(agent: any, config: any, interval = 10) {
  console.log("Starting autonomous mode...");

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const thought =
        "Be creative and do something interesting on the blockchain. " +
        "Choose an action or set of actions and execute it that highlights your abilities.";

      const stream = await agent.stream({ messages: [new HumanMessage(thought)] }, config);

      for await (const chunk of stream) {
        if ("agent" in chunk) {
          console.log(chunk.agent.messages[0].content);
        } else if ("tools" in chunk) {
          console.log(chunk.tools.messages[0].content);
        }
        console.log("-------------------");
      }

      await new Promise(resolve => setTimeout(resolve, interval * 1000));
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error:", error.message);
      }
      process.exit(1);
    }
  }
}

/**
 * Run the agent interactively based on user input
 *
 * @param agent - The agent executor
 * @param config - Agent configuration
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runChatMode(agent: any, config: any) {
  console.log("Starting chat mode... Type 'exit' to end.");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> =>
    new Promise(resolve => rl.question(prompt, resolve));

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const userInput = await question("\nPrompt: ");

      if (userInput.toLowerCase() === "exit") {
        break;
      }

      const stream = await agent.stream({ messages: [new HumanMessage(userInput)] }, config);

      for await (const chunk of stream) {
        if ("agent" in chunk) {
          console.log(chunk.agent.messages[0].content);
        } else if ("tools" in chunk) {
          console.log(chunk.tools.messages[0].content);
        }
        console.log("-------------------");
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error:", error.message);
    }
    process.exit(1);
  } finally {
    rl.close();
  }
}

/**
 * Choose whether to run in autonomous or chat mode based on user input
 *
 * @returns Selected mode
 */
async function chooseMode(): Promise<"chat" | "auto"> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> =>
    new Promise(resolve => rl.question(prompt, resolve));

  // eslint-disable-next-line no-constant-condition
  while (true) {
    console.log("\nAvailable modes:");
    console.log("1. chat    - Interactive chat mode");
    console.log("2. auto    - Autonomous action mode");

    const choice = (await question("\nChoose a mode (enter number or name): "))
      .toLowerCase()
      .trim();

    if (choice === "1" || choice === "chat") {
      rl.close();
      return "chat";
    } else if (choice === "2" || choice === "auto") {
      rl.close();
      return "auto";
    }
    console.log("Invalid choice. Please try again.");
  }
}

/**
 * Start the chatbot agent
 */
async function main() {
  try {
    const { agent, config } = await initializeAgent();
    await runChatMode(agent, config);
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error:", error.message);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  console.log("Starting Agent...");
  main().catch(error => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}